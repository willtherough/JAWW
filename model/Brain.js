// model/Brain.js
// THE SYMBOLIC SEMANTIC ENGINE
// This acts as a localized "WordNet" to expand queries into concepts.

const CONCEPT_GRAPH = {
  // CONFLICT & STRATEGY
  'war': ['conflict', 'battle', 'military', 'strategy', 'combat', 'tactics', 'army', 'navy', 'air force'],
  'fight': ['combat', 'melee', 'conflict', 'defense', 'attack', 'brawl'],
  'strategy': ['tactics', 'planning', 'logistics', 'maneuver', 'flank', 'intelligence'],
  
  // SCIENCE & MATH
  'math': ['mathematics', 'geometry', 'algebra', 'calculus', 'numbers', 'logic', 'proof', 'theorem'],
  'science': ['empirical', 'experiment', 'biology', 'chemistry', 'physics', 'research', 'hypothesis'],
  'health': ['fitness', 'nutrition', 'medicine', 'body', 'workout', 'diet', 'strength', 'cardio'],
  
  // HISTORY & POLITICS
  'history': ['past', 'era', 'ancient', 'modern', 'civilization', 'empire', 'revolution', 'century'],
  'politics': ['government', 'law', 'policy', 'election', 'democracy', 'republic', 'state', 'diplomacy'],
  'economy': ['money', 'business', 'market', 'trade', 'finance', 'capital', 'wealth', 'currency'],

  // HUMANITIES
  'art': ['painting', 'sculpture', 'music', 'literature', 'creative', 'design', 'culture'],
  'philosophy': ['logic', 'ethics', 'reason', 'thought', 'stoicism', 'existentialism'],
  
  // SKILLS
  'cook': ['culinary', 'food', 'recipe', 'chef', 'kitchen', 'baking', 'flavor'],
  'build': ['construction', 'diy', 'engineering', 'structure', 'repair', 'tools']
};

export const expandQuery = (userQuery) => {
  const tokens = userQuery.toLowerCase().split(' ');
  let expansion = new Set(tokens);

  // 1. EXPAND CONCEPTS
  tokens.forEach(token => {
    // Direct match expansion
    if (CONCEPT_GRAPH[token]) {
      CONCEPT_GRAPH[token].forEach(c => expansion.add(c));
    }
    
    // Reverse lookup (If I search "Battle", find "War")
    Object.keys(CONCEPT_GRAPH).forEach(key => {
      if (CONCEPT_GRAPH[key].includes(token)) {
        expansion.add(key);
      }
    });
  });

  return Array.from(expansion);
};

export const calculateRelevance = (card, expandedQuery) => {
  let score = 0;
  const content = (card.title + " " + card.body_json + " " + card.topic).toLowerCase();
  
  expandedQuery.forEach(term => {
    // Exact Match (High Value)
    if (card.title.toLowerCase().includes(term)) score += 10;
    
    // Topic Match (Medium Value)
    if (card.topic && card.topic.includes(term)) score += 5;

    // Content Match (Low Value)
    if (content.includes(term)) score += 1;
  });

  return score;
};