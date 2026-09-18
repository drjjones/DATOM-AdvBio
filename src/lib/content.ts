import toc from '../../content/toc.json';

export interface Reading { sections: string; printedPages: string; pdfPages: string; chapter: number | null; sectionTitle: string | null }
export interface Standard {
  code: string; title: string; titleAsPrinted: string; central: boolean; description: string;
  iCan: string[]; history: string[]; exam: { examItems: string; points: number } | null; reading: Reading[];
}
export interface BlueprintRow { part: string; points: string; tests: string }
export interface Unit {
  number: number; nn: string; slug: string; title: string; titleAsPrinted: string; folder: string;
  accent: string; accentName: string; centralIdea: string; readingMapDerived: boolean;
  examBlueprint: BlueprintRow[]; source: { student: string; teacher: string }; standards: Standard[];
}

const files = import.meta.glob('../../content/standards/unit*.json', { eager: true, import: 'default' }) as Record<string, Unit>;

export const units: Unit[] = Object.values(files).sort((a, b) => a.number - b.number);
export const course = toc.course;
export const book = toc.book;
export const chapters = toc.chapters;

export const sectionId = (code: string) => code.toLowerCase().replace('.', '-');

export function chaptersFor(unit: Unit) {
  const nums = new Set(unit.standards.flatMap((s) => s.reading.map((r) => r.chapter)));
  return chapters.filter((c) => nums.has(c.number));
}

export function readingLabel(s: Standard) {
  return s.reading.map((r) => `Mader ${r.sections}, pp. ${r.printedPages}`).join('; ');
}

/** What the student-facing exam blueprint says about one standard. */
export function examSummary(unit: Unit, s: Standard): string[] {
  const out: string[] = [];
  for (const row of unit.examBlueprint) {
    const part = row.part.toLowerCase();
    if (part.startsWith('multiple choice') && /two items each/.test(row.tests)) out.push('two multiple choice items');
    else if (part.startsWith('short answer')) {
      const m = new RegExp(`${s.code.replace('.', '\\.')} \\((\\d)\\)`).exec(row.tests);
      if (m) out.push(`${m[1] === '1' ? 'one' : m[1] === '2' ? 'two' : m[1] === '3' ? 'three' : m[1]} short answer item${m[1] === '1' ? '' : 's'}`);
    } else if (row.tests.startsWith(s.code)) out.push(`the ${part} part`);
  }
  return out;
}

export interface Cfu { prompt: string; predict?: boolean; options: string[]; answer: number; right: string; wrong: string }
export interface StandardContent { model: string; hook: string; explain: string[]; cfu: Cfu[] }
export interface UnitContent { unit: string; standards: Record<string, StandardContent> }
const unitContentFiles = import.meta.glob('../../content/units/unit*.json', { eager: true, import: 'default' }) as Record<string, UnitContent>;
/** Teaching content (hook, explanation, questions, model id) for a unit, if it has been built. */
export function unitContent(nn: string): UnitContent | null {
  return Object.values(unitContentFiles).find((u) => u.unit === nn) ?? null;
}
