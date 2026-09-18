/** Six steps. Each zooms to one model, states one idea, and asks one prediction question. */
export interface Step {
  id: string;
  name: string;
  sentence: string;
  question: string;
  options: Array<{ text: string; correct?: boolean }>;
  why: string;
}

export const STEPS: Step[] = [
  {
    id: 'diamond', name: 'Diamond',
    sentence: 'Every carbon in diamond bonds to four neighbors, so the whole crystal is one rigid three-dimensional network.',
    question: 'Will diamond conduct electricity?',
    options: [
      { text: 'Yes, carbon always conducts' },
      { text: 'No, every valence electron is locked in a bond', correct: true },
      { text: 'Only along one direction of the crystal' },
    ],
    why: 'Each carbon has four valence electrons and uses all four in localized bonds to its neighbors. Nothing is free to carry charge, so diamond is an insulator, even though graphite, the same element, conducts well.',
  },
  {
    id: 'graphite', name: 'Graphite',
    sentence: 'Graphite is a stack of flat sheets. Each carbon bonds to three neighbors in its sheet, and only weak forces hold the sheets together.',
    question: 'What happens when a pencil drags across paper?',
    options: [
      { text: 'Bonds inside a sheet break and re-form' },
      { text: 'Whole sheets slide off onto the paper', correct: true },
      { text: 'The paper tears and the graphite stays put' },
    ],
    why: 'The dashed lines mark the 0.335 nm gap between sheets. No covalent bond crosses it, so sheets shear away under almost no force. The gray mark is a stack of sheets left behind.',
  },
  {
    id: 'graphene', name: 'Graphene',
    sentence: 'Graphene is a single sheet of graphite, one atom thick.',
    question: 'Each carbon uses three of its four valence electrons for bonds. Where is the fourth?',
    options: [
      { text: 'Lost, so the sheet is positively charged' },
      { text: 'Shared across the whole sheet and free to move', correct: true },
      { text: 'Paired with a hydrogen at the edge' },
    ],
    why: 'The fourth electron sits in a p orbital above and below the sheet and joins a delocalized cloud that spans every ring. That cloud is why graphene and graphite conduct and diamond does not.',
  },
  {
    id: 'c60', name: 'C60 fullerene',
    sentence: 'Sixty carbons close into a ball by mixing hexagons with exactly twelve pentagons.',
    question: 'Why twelve pentagons, and not some other number?',
    options: [
      { text: 'Twelve happens to be what fits sixty atoms' },
      { text: 'Any closed cage of hexagons and pentagons needs exactly twelve pentagons', correct: true },
      { text: 'Pentagons are stronger than hexagons' },
    ],
    why: "Hexagons alone tile a flat plane. Euler's formula for a closed polyhedron forces exactly twelve pentagons to curve a hexagon net into a closed shell, whatever its size. A classic soccer ball obeys the same rule: twelve black pentagons.",
  },
  {
    id: 'nanotube', name: '(10,0) carbon nanotube',
    sentence: 'A nanotube is graphene rolled into a cylinder and joined edge to edge. This is a (10,0) zigzag tube, 0.78 nm across.',
    question: 'Flat graphene conducts like a metal. Will this rolled-up sheet?',
    options: [
      { text: 'Yes, rolling changes nothing' },
      { text: 'No, this particular roll makes it a semiconductor', correct: true },
      { text: 'It conducts around the tube but not along it' },
    ],
    why: 'Rolling forces the electron waves to fit around the circumference. A tube with indices (n, m) behaves like a metal only when n minus m is a multiple of three. Here n minus m is ten, so this tube is a semiconductor. Geometry alone decides.',
  },
  {
    id: 'amorphous', name: 'Amorphous carbon',
    sentence: 'Amorphous carbon has no repeating pattern: a tangle of three- and four-bonded atoms, colored here by bond count.',
    question: 'Which of the six materials conduct electricity?',
    options: [
      { text: 'Diamond and the nanotube' },
      { text: 'Graphite and graphene', correct: true },
      { text: 'All six, because they are all carbon' },
    ],
    why: 'Conduction needs delocalized electrons, which come from three-bonded (sp2) carbon in an extended sheet. Graphite and graphene have that. Diamond has none. The (10,0) tube is a semiconductor, and amorphous carbon sits in between, depending on how much of it is sp2.',
  },
];

export class Walkthrough {
  active = false;
  index = 0;
  private counter: HTMLElement;
  private name: HTMLElement;
  private sentence: HTMLElement;
  private question: HTMLElement;
  private options: HTMLElement;
  private feedback: HTMLElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;

  constructor(private root: HTMLElement, private hooks: { onStep: (step: Step, index: number) => void; onStop: () => void }) {
    const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    this.counter = q('[data-wt-counter]'); this.name = q('[data-wt-name]'); this.sentence = q('[data-wt-sentence]');
    this.question = q('[data-wt-question]'); this.options = q('[data-wt-options]'); this.feedback = q('[data-wt-feedback]');
    this.prevBtn = q<HTMLButtonElement>('[data-wt-prev]'); this.nextBtn = q<HTMLButtonElement>('[data-wt-next]');
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.hasAttribute('data-wt-next')) this.next();
      else if (b.hasAttribute('data-wt-prev')) this.prev();
      else if (b.hasAttribute('data-wt-exit')) this.stop();
      else if (b.dataset.option !== undefined) this.answer(Number(b.dataset.option));
    });
    root.addEventListener('present:step', (e) => { ((e as CustomEvent<number>).detail > 0 ? this.next() : this.prev()); });
  }

  start(index = 0) {
    this.active = true;
    this.root.hidden = false;
    this.go(index);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.root.hidden = true;
    if (/^#walkthrough/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    this.hooks.onStop();
  }

  next() { if (this.index < STEPS.length - 1) this.go(this.index + 1); else this.stop(); }
  prev() { if (this.index > 0) this.go(this.index - 1); }

  go(index: number) {
    this.index = Math.max(0, Math.min(STEPS.length - 1, index));
    const s = STEPS[this.index];
    this.counter.textContent = `Step ${this.index + 1} of ${STEPS.length}`;
    this.name.textContent = s.name;
    this.sentence.textContent = s.sentence;
    this.question.textContent = s.question;
    this.options.replaceChildren(...s.options.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice'; b.dataset.option = String(i);
      const idx = document.createElement('span'); idx.className = 'step-index'; idx.textContent = String.fromCharCode(65 + i); idx.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.textContent = o.text;
      b.append(idx, text);
      return b;
    }));
    this.feedback.replaceChildren();
    delete this.feedback.dataset.state;
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.textContent = this.index === STEPS.length - 1 ? 'Finish' : 'Next';
    history.replaceState(null, '', `#walkthrough-${this.index + 1}`);
    this.hooks.onStep(s, this.index);
  }

  private answer(k: number) {
    const s = STEPS[this.index];
    const buttons = Array.from(this.options.querySelectorAll<HTMLButtonElement>('button'));
    const right = !!s.options[k].correct;
    buttons.forEach((b, i) => {
      b.dataset.state = i === k ? (right ? 'correct' : 'wrong') : s.options[i].correct ? 'correct' : '';
      b.setAttribute('aria-pressed', String(i === k));
    });
    const lead = document.createElement('strong');
    lead.textContent = right ? 'Right. ' : 'Not quite. ';
    this.feedback.dataset.state = right ? 'right' : 'wrong';
    this.feedback.replaceChildren(lead, document.createTextNode(s.why));
  }
}
