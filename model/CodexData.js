export const CODEX = [
  // --- SECTION 1: FORMAL LOGIC ---
  {
    id: 'logic_deductive',
    category: 'FORMAL LOGIC',
    title: 'Deductive Reasoning',
    body: 'Top-down logic. A conclusion is based on concordance of multiple premises. If the premises are true, the conclusion MUST be true.\n\nStructure: All A are B. X is A. Therefore X is B.',
    tags: ['logic', 'reasoning', 'socrates', 'mortal', 'premise', 'conclusion', 'valid', 'top-down']
  },
  {
    id: 'logic_inductive',
    category: 'FORMAL LOGIC',
    title: 'Inductive Reasoning',
    body: 'Bottom-up logic. Premises supply evidence for the truth of the conclusion. The conclusion is probable, not certain.\n\nStructure: Every swan I have seen is white; therefore, all swans are likely white.',
    tags: ['logic', 'reasoning', 'swan', 'evidence', 'probability', 'generalization', 'bottom-up']
  },
  {
    id: 'logic_abductive',
    category: 'FORMAL LOGIC',
    title: 'Abductive Reasoning',
    body: 'Inference to the best explanation. Starting with an observation and seeking the simplest and most likely explanation.\n\nExample: The grass is wet. It likely rained.',
    tags: ['logic', 'reasoning', 'explanation', 'inference', 'observation', 'best-guess']
  },

  // --- SECTION 2: LOGICAL FALLACIES ---
  {
    id: 'fallacy_strawman',
    category: 'LOGICAL FALLACIES',
    title: 'Straw Man Fallacy',
    body: 'Attacking a distorted or exaggerated version of the opponent\'s position rather than their actual argument. Creating a "straw man" that is easier to knock down.',
    tags: ['logic', 'fallacy', 'fake', 'distort', 'attack', 'argument', 'misrepresentation']
  },
  {
    id: 'fallacy_adhominem',
    category: 'LOGICAL FALLACIES',
    title: 'Ad Hominem',
    body: 'Attacking the character or motive of the person instead of addressing their argument. "You are wrong because you are ugly/stupid/bad."',
    tags: ['logic', 'fallacy', 'personal', 'attack', 'insult', 'character', 'motive']
  },
  {
    id: 'fallacy_dichotomy',
    category: 'LOGICAL FALLACIES',
    title: 'False Dichotomy',
    body: 'Presenting two options as the only possibilities, when in fact more possibilities exist. Also known as the "Black-and-White Fallacy".',
    tags: ['logic', 'fallacy', 'binary', 'choice', 'options', 'limited', 'either-or']
  },
  {
    id: 'fallacy_circular',
    category: 'LOGICAL FALLACIES',
    title: 'Circular Reasoning',
    body: 'A logical fallacy in which the reasoner begins with what they are trying to end with. The components of a circular argument are often logically valid because if the premises are true, the conclusion must be true.',
    tags: ['logic', 'fallacy', 'circle', 'loop', 'tautology', 'repetition']
  },

  // --- SECTION 3: MATHEMATICAL AXIOMS ---
  {
    id: 'math_identity',
    category: 'MATHEMATICS',
    title: 'Law of Identity',
    body: 'A thing is what it is. A = A. In logic and math, an entity without a definite nature is inconceivable.',
    tags: ['math', 'logic', 'identity', 'equality', 'axiom', 'existence']
  },
  {
    id: 'math_transitive',
    category: 'MATHEMATICS',
    title: 'Transitive Property',
    body: 'If A = B and B = C, then A = C. This allows us to chain logic together to form proofs.',
    tags: ['math', 'logic', 'chain', 'proof', 'equality', 'link']
  },
  {
    id: 'math_contradiction',
    category: 'MATHEMATICS',
    title: 'Law of Non-Contradiction',
    body: 'Contradictory propositions cannot both be true in the same sense at the same time. A cannot be both B and not-B.',
    tags: ['math', 'logic', 'contradiction', 'truth', 'falsehood', 'impossible']
  },

  // --- SECTION 4: MENTAL MODELS ---
  {
    id: 'model_first_principles',
    category: 'MENTAL MODELS',
    title: 'First Principles',
    body: 'Breaking a problem down into its fundamental truths (axioms) and building up from there, rather than reasoning by analogy ("doing what everyone else does").',
    tags: ['mental_model', 'science', 'physics', 'truth', 'foundation', 'axiom']
  },
  {
    id: 'model_occam',
    category: 'MENTAL MODELS',
    title: 'Occam\'s Razor',
    body: 'The problem-solving principle that "entities should not be multiplied without necessity." The simplest explanation is usually the correct one.',
    tags: ['mental_model', 'simplicity', 'explanation', 'razor', 'complexity']
  }
];