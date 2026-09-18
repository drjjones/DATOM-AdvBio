#!/usr/bin/env python3
"""Extract the course content the site needs from the authoritative course files.

Writes:
  content/toc.json                Mader 12e chapter and section structure (from the PDF outline)
                                  plus the course map: each unit and standard with its Mader reading.
  content/standards/unitNN.json   The five content standards per unit, extracted verbatim from
                                  UNN_Standards_Student_Copy.docx and UNN_Standards_Teacher_Copy.docx.

Nothing here is derived from the textbook. The docx files are the source of truth for standards;
the crosswalk and CONTEXT.md are the source of truth for which Mader section each standard reads.
Run from site/:  python3 scripts/extract-content.py
"""
import glob, html, json, os, re, sys, zipfile
from pypdf import PdfReader

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ROOT = os.path.dirname(SITE)
BOOK = os.path.join(ROOT, 'reference', 'Mader_Windelspecht_Biology.pdf')
OFFSET = 19  # PDF page = printed page + 19 (verified in the crosswalk)

# ---------- sentence case ----------
KEEP = {'pH','ATP','DNA','RNA','CO2','C4','CAM','CER','Mendel','Mendel\'s','Mendelian','Darwin\'s','Hardy-Weinberg',
        'Calvin','Miller-Urey','Benedict\'s','Biuret','Sudan','H','C','N','O','I','Bohr','Wonder','Period','Maret','Gradescope'}
def sentence_case(s):
    words = s.split(' ')
    out = []
    for i, w in enumerate(words):
        core = w.strip('(),:;')
        if i == 0 or core in KEEP or re.match(r'^[A-Z]\d', core) or core.isupper() and len(core) > 1:
            out.append(w)
        else:
            m = re.match(r'^([^A-Za-z]*)([A-Za-z])(.*)$', w)
            out.append(m.group(1) + m.group(2).lower() + m.group(3) if m else w)
    return ' '.join(out)

# ---------- docx text ----------
def docx_lines(path):
    x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8')
    x = re.sub(r'</w:p>', '\n', x)
    x = re.sub(r'<[^>]+>', '', x)
    return [l.strip() for l in html.unescape(x).split('\n') if l.strip()]

# ---------- course map (reconciled by hand against CONTEXT.md, the crosswalk, and each unit's planning documents) ----------
# reading: list of (mader section label, printed page range). Printed pages; PDF = printed + 19.
UNITS = [
 dict(number=1, slug='water', folder='unit-01-water', title='Water and the chemistry of life', accent='#2E7BB8', accentName='water blue',
      reading={'B1.1':[('2.1 to 2.2','20 to 26')], 'B1.2':[('2.3','26 to 30')], 'B1.3':[('2.4','30 to 34')],
               'B1.4':[('3.1','36 to 39'),('18.1','318 to 323')], 'B1.5':[('3.2 to 3.5','39 to 56')]}),
 dict(number=2, slug='cells-and-membranes', folder='unit-02-cells-and-membranes', title='Cells and membranes', accent='#C48A1F', accentName='lipid gold',
      reading={'B2.1':[('4.1 to 4.8','58 to 81')], 'B2.2':[('5.1','83 to 88')], 'B2.3':[('5.2','88 to 91')],
               'B2.4':[('5.3','91 to 93')], 'B2.5':[('5.3','93 to 95')]}),
 dict(number=3, slug='energy-and-enzymes', folder='unit-03-energy-and-enzymes', title='Energy and enzymes', accent='#D2622F', accentName='ember orange',
      reading={'B3.1':[('6.1','101 to 103')], 'B3.2':[('6.2','103 to 104')], 'B3.3':[('6.2','104 to 105')],
               'B3.4':[('6.3','105 to 109')], 'B3.5':[('6.3 to 6.4','105 to 113')]}),
 dict(number=4, slug='cellular-respiration', folder='unit-04-cellular-respiration', title='Cellular respiration', accent='#C43F3B', accentName='oxygen red',
      reading={'B4.1':[('8.1','130 to 132')], 'B4.2':[('8.2','132 to 134')], 'B4.3':[('8.4','136 to 139')],
               'B4.4':[('8.4','139 to 141')], 'B4.5':[('8.3','134 to 136')]}),
 dict(number=5, slug='photosynthesis', folder='unit-05-photosynthesis', title='Photosynthesis', accent='#3F9A4B', accentName='chlorophyll green',
      reading={'B5.1':[('7.1 to 7.2','115 to 119')], 'B5.2':[('7.3','119 to 120')], 'B5.3':[('7.3','120 to 123')],
               'B5.4':[('7.4','123 to 125')], 'B5.5':[('7.5','125 to 128')]}),
 dict(number=6, slug='molecular-genetics', folder='unit-06-molecular-genetics', title='Molecular genetics', accent='#7A5FC9', accentName='nucleotide violet',
      reading={'B6.1':[('12.1','208 to 211')], 'B6.2':[('12.2','211 to 216')], 'B6.3':[('12.3 to 12.4','216 to 220')],
               'B6.4':[('12.5','220 to 227')], 'B6.5':[('13.3','238 to 243')]}),
 dict(number=7, slug='cell-division-and-genetics', folder='unit-07-cell-division-and-genetics', title='Cell division and genetics', accent='#B8478F', accentName='chromosome stain',
      note='Verified 2026-09-17 against U7_Homework_Reading_Schedule_Student.docx (2026-09-03) and U7_Session_Plans.docx (2026-09-04): 10.6 is read once before Session 4 (B7.4) and drawn on again in Session 5 (B7.5).',
      reading={'B7.1':[('9.1 to 9.4','148 to 161')], 'B7.2':[('10.1 to 10.4','167 to 176')], 'B7.3':[('11.1 to 11.2','187 to 194')],
               'B7.4':[('11.4','198 to 206'),('10.6','177 to 185')], 'B7.5':[('11.3','194 to 198'),('10.6','177 to 185')]}),
 dict(number=8, slug='evolution', folder='unit-08-evolution', title='Evolution', accent='#2E9C8F', accentName='deep-time teal',
      reading={'B8.1':[('15.1 to 15.2','262 to 270')], 'B8.2':[('15.3','270 to 278'),('16.2','286 to 290')], 'B8.3':[('16.1','280 to 286')],
               'B8.4':[('16.3','290 to 295')], 'B8.5':[('17.1 to 17.2','297 to 308')]}),
 dict(number=9, slug='ecology', folder='unit-09-ecology', title='Ecology', accent='#7C9E2D', accentName='canopy moss',
      reading={'B9.1':[('44.1 to 44.3','837 to 846')], 'B9.2':[('45.1 to 45.2','856 to 868')], 'B9.3':[('45.3','868 to 874')],
               'B9.4':[('45.3','874 to 880')], 'B9.5':[('46.1 to 46.3','882 to 904'),('47.3','911 to 916')]}),
 dict(number=10, slug='anatomy-and-physiology', folder='unit-10-anatomy-physiology', title='Anatomy and physiology', accent='#C9536F', accentName='tissue rose',
      reading={'B10.1':[('31.1 to 31.2','582 to 591'),('31.4','594 to 599')], 'B10.2':[('37.2 to 37.3','695 to 707')],
               'B10.3':[('32.3','605 to 613'),('35.1 to 35.2','660 to 669')], 'B10.4':[('34.2 to 34.3','645 to 652')], 'B10.5':[('33.3 to 33.4','625 to 640')]}),
]

# ---------- book outline ----------
def book_toc():
    r = PdfReader(BOOK)
    out = []
    def walk(items, depth=0):
        for it in items:
            if isinstance(it, list): walk(it, depth+1)
            else:
                try: pg = r.get_destination_page_number(it)+1
                except Exception: pg = None
                out.append((depth, it.title.strip(), pg))
    walk(r.outline)
    book_units, chapters = [], []
    cur_unit = None; cur_ch = None
    for depth, title, pg in out:
        m_unit = re.match(r'^Unit (\d+): (.+)$', title)
        m_ch = re.match(r'^Chapter (\d+): (.+)$', title)
        m_sec = re.match(r'^(\d+)\.(\d+) (.+)$', title)
        if m_unit:
            cur_unit = dict(number=int(m_unit.group(1)), title=m_unit.group(2), pdfPage=pg, printedPage=pg-OFFSET, chapters=[])
            book_units.append(cur_unit)
        elif m_ch:
            cur_ch = dict(number=int(m_ch.group(1)), title=m_ch.group(2), pdfPage=pg, printedPage=pg-OFFSET, sections=[])
            chapters.append(cur_ch)
            if cur_unit: cur_unit['chapters'].append(cur_ch['number'])
        elif m_sec and cur_ch and int(m_sec.group(1)) == cur_ch['number']:
            cur_ch['sections'].append(dict(number=f"{m_sec.group(1)}.{m_sec.group(2)}", title=m_sec.group(3).replace('Gas- Exchange','Gas-Exchange'),
                                           pdfPage=pg, printedPage=pg-OFFSET))
    return dict(pages=len(r.pages), chapters=chapters, bookUnits=book_units)

# ---------- standards ----------
STD_RE = re.compile(r'^(B\d+\.\d+)\s\s+(.+?)$')
HIST_RE = re.compile(r'\s*\((Merges|Unchanged|From the former|Absorbs)[^)]*\)\s*$')
def strip_history(desc):
    notes = []
    while True:
        m = HIST_RE.search(desc)
        if not m: break
        notes.insert(0, m.group(0).strip().strip('()'))
        desc = desc[:m.start()].rstrip()
    return desc, notes

def parse_student(path):
    lines = docx_lines(path)
    unit_title = lines[1].split('|')[-1].strip()
    # exam blueprint
    blueprint = []
    try:
        i = lines.index('What it tests') + 1
        while i+2 < len(lines) and re.match(r'^\d\s\s', lines[i]):
            part = re.sub(r'^\d\s+', '', lines[i]); blueprint.append(dict(part=part, points=lines[i+1], tests=lines[i+2])); i += 3
    except ValueError: pass
    # standards
    stds = []; i = 0
    while i < len(lines):
        m = STD_RE.match(lines[i])
        if m and not re.search(r'\bto\b|\(\d\)|content;', lines[i]):
            code, title = m.group(1), m.group(2)
            central = '(the unit' in title
            title = re.sub(r'\s*\(the unit.s central idea\)', '', title)
            desc, notes = strip_history(lines[i+1])
            j = i + 2; cans = []
            while j < len(lines) and not STD_RE.match(lines[j]) and not lines[j].startswith('Skill') and not lines[j].startswith('SP'):
                l = lines[j]
                if l not in ('I can...', 'I can do this', 'Not yet') and (l.startswith('I can') or l.startswith('My ')):
                    cans.append(l)
                j += 1
            stds.append(dict(code=code, title=sentence_case(title), titleAsPrinted=title, central=central,
                             description=desc, iCan=cans, history=notes))
            i = j
        else: i += 1
    return unit_title, blueprint, stds

def parse_teacher_points(path):
    """Points per standard from the 'Standard / Exam items / Points' table in the teacher copy."""
    lines = docx_lines(path); pts = {}
    try:
        i = lines.index('Exam items'); assert lines[i+1] == 'Points'; i += 2
        while i+2 < len(lines) and STD_RE.match(lines[i]):
            code = STD_RE.match(lines[i]).group(1); pts[code] = dict(examItems=lines[i+1], points=int(lines[i+2])); i += 3
    except (ValueError, AssertionError): pass
    return pts

def main():
    toc = book_toc()
    sections = {s['number']: s for ch in toc['chapters'] for s in ch['sections']}
    course_units = []
    for u in UNITS:
        base = os.path.join(ROOT, u['folder'], '01_Overview_and_Planning')
        sp = glob.glob(os.path.join(base, 'U*_Standards_Student_Copy.docx'))[0]
        tp = glob.glob(os.path.join(base, 'U*_Standards_Teacher_Copy.docx'))[0]
        unit_title_printed, blueprint, stds = parse_student(sp)
        pts = parse_teacher_points(tp)
        assert len(stds) == 5, (u['folder'], [s['code'] for s in stds])
        for s in stds:
            s['exam'] = pts.get(s['code'])
            rd = []
            for label, pages in u['reading'][s['code']]:
                first = label.split(' to ')[0]
                sec = sections.get(first)
                rd.append(dict(sections=label, printedPages=pages,
                               pdfPages=f"{int(pages.split(' to ')[0])+OFFSET} to {int(pages.split(' to ')[1])+OFFSET}",
                               chapter=sec and int(first.split('.')[0]), sectionTitle=sec and sec['title']))
            s['reading'] = rd
        unit = dict(number=u['number'], slug=u['slug'], nn=f"{u['number']:02d}", title=u['title'], titleAsPrinted=unit_title_printed,
                    folder=u['folder'], accent=u['accent'], accentName=u['accentName'],
                    centralIdea=next(s['code'] for s in stds if s['central']),
                    readingMapDerived=bool(u.get('derived')), readingMapNote=u.get('note'), examBlueprint=blueprint,
                    source=dict(student=os.path.relpath(sp, SITE), teacher=os.path.relpath(tp, SITE)),
                    standards=stds)
        with open(os.path.join(SITE, 'content', 'standards', f"unit{unit['nn']}.json"), 'w') as f:
            json.dump(unit, f, indent=2, ensure_ascii=False); f.write('\n')
        course_units.append({k: unit[k] for k in ('number','nn','slug','title','accent','accentName','centralIdea','readingMapDerived')} |
                            dict(standards=[dict(code=s['code'], title=s['title'], central=s['central'],
                                                 reading=[dict(sections=r['sections'], printedPages=r['printedPages']) for r in s['reading']]) for s in stds]))
    doc = dict(
        book=dict(title='Biology', edition='12th edition', authors=['Sylvia S. Mader','Michael Windelspecht'], publisher='McGraw-Hill', year=2016,
                  file='../reference/Mader_Windelspecht_Biology.pdf', pdfPages=toc['pages'], pdfPageOffset=OFFSET,
                  note='PDF page = printed page + 19. Structure read from the PDF bookmark outline on 2026-09-17.'),
        chapters=toc['chapters'], bookUnits=toc['bookUnits'],
        course=dict(name='Advanced Biology', school='Maret School', year='2026-27', periodMinutes=70,
                    grading='Points based since 2026-09-02: unit exams 70%, lab reports 20%, Wonder Period presentations 10%. Standards are the exam blueprint.',
                    units=course_units))
    with open(os.path.join(SITE, 'content', 'toc.json'), 'w') as f:
        json.dump(doc, f, indent=2, ensure_ascii=False); f.write('\n')
    print(f"toc.json: {len(toc['chapters'])} chapters, {sum(len(c['sections']) for c in toc['chapters'])} sections, {len(course_units)} course units")
    for u in course_units:
        print(f"  U{u['nn']} {u['title']} [{u['accentName']}] central={u['centralIdea']}" + (" (reading map derived)" if u['readingMapDerived'] else ''))
        for s in u['standards']: print(f"      {s['code']}  {s['title']}  <- Mader {'; '.join(r['sections'] for r in s['reading'])}")

if __name__ == '__main__': main()
