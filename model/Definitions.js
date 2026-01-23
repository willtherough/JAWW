// model/Definitions.js

// 1. TOPICS (Expanded Taxonomy)
export const TOPICS = [
  { id: 'history', label: 'History', icon: '🏛️' },
  { id: 'math', label: 'Mathematics', icon: '📐' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'health', label: 'Health & Fitness', icon: '💪' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'art', label: 'Arts & Culture', icon: '🎨' },
  { id: 'politics', label: 'Politics', icon: '⚖️' },
  { id: 'business', label: 'Business / Econ', icon: '💰' },
  { id: 'outdoors', label: 'Outdoors / Survival', icon: '🌲' },
  { id: 'cooking', label: 'Culinary', icon: '🍳' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'diy', label: 'Home / DIY', icon: '🔨' },
  { id: 'other', label: 'General / Other', icon: '📦' },
];

// 2. CREDENTIAL TIERS (New - For "Good Will Hunting" Inference)
export const CREDENTIALS = {
  expert: ['phd', 'doctorate', 'm.d.', 'founder', 'chief', 'olympian', 'professional', 'professor'],
  advanced: ['masters', 'ma', 'ms', 'mba', 'varsity', 'captain', 'senior', 'lead', 'graduate'],
  competent: ['bachelors', 'ba', 'bs', 'associate', 'intern', 'junior', 'student']
};

// 3. LOGIC LIBRARY (Full Version - Do Not Delete)
// "Score" determines if it boosts (positive) or hurts (negative) the ranking.
export const LOGIC_TYPES = {
  // --- GREEN FLAGS (Sound Logic) ---
  first_principles: { 
    id: 'first_principles', 
    label: 'First Principles', 
    description: 'Deconstructs a problem to core truths and builds up.', 
    score: 10,
    type: 'valid' 
  },
  empirical_evidence: { 
    id: 'empirical_evidence', 
    label: 'Empirical Evidence', 
    description: 'Based on observed and measured phenomena.', 
    score: 10,
    type: 'valid' 
  },
  deductive_reasoning: { 
    id: 'deductive_reasoning', 
    label: 'Deductive Reasoning', 
    description: 'Top-down logic. If premises are true, conclusion must be true.', 
    score: 8,
    type: 'valid' 
  },
  inductive_reasoning: { 
    id: 'inductive_reasoning', 
    label: 'Inductive Reasoning', 
    description: 'Bottom-up logic. Generalizing from specific observations.', 
    score: 6,
    type: 'valid' 
  },
  falsifiability: { 
    id: 'falsifiability', 
    label: 'Falsifiability', 
    description: 'The claim can be disproven by evidence (it is not a belief).', 
    score: 9,
    type: 'valid' 
  },

  // --- RED FLAGS (Fallacies) ---
  ad_hominem: { 
    id: 'ad_hominem', 
    label: 'Ad Hominem', 
    description: 'Attacking the person instead of the argument.', 
    score: -10,
    type: 'fallacy' 
  },
  strawman: { 
    id: 'strawman', 
    label: 'Strawman', 
    description: 'Misrepresenting an argument to make it easier to attack.', 
    score: -10,
    type: 'fallacy' 
  },
  circular_reasoning: { 
    id: 'circular_reasoning', 
    label: 'Circular Reasoning', 
    description: 'The conclusion is included in the premise.', 
    score: -10,
    type: 'fallacy' 
  },
  appeal_to_authority: { 
    id: 'appeal_to_authority', 
    label: 'Appeal to Authority', 
    description: 'Claiming something is true just because an "expert" said so.', 
    score: -5,
    type: 'fallacy' 
  },
  false_dichotomy: { 
    id: 'false_dichotomy', 
    label: 'False Dichotomy', 
    description: 'Presenting only two options when more exist.', 
    score: -5,
    type: 'fallacy' 
  },
  slippery_slope: { 
    id: 'slippery_slope', 
    label: 'Slippery Slope', 
    description: 'Asserting a small step leads to a chain reaction of bad events.', 
    score: -5,
    type: 'fallacy' 
  }
};