/**
 * NutritionalMatrix.js
 * An offline dictionary mapping common grocery items to standardized nutritional profiles and shelf life.
 * Used to power the Biological Supply Chain without internet connectivity.
 */

export const NUTRITIONAL_MATRIX = [
    // --- PRODUCE ---
    {
        id: 'banana',
        aliases: ['bananas', 'bnnas', 'org bananas', 'chiquita banana'],
        macros: { calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3, potassium_mg: 422, sodium_mg: 1 },
        shelf_life_days: 7,
        unit: 'each'
    },
    {
        id: 'sweet potato',
        aliases: ['sweet potatoes', 'yam', 'yams', 'org sweet potato'],
        macros: { calories: 103, protein_g: 2, carbs_g: 24, fat_g: 0.2, potassium_mg: 475, sodium_mg: 41 },
        shelf_life_days: 21,
        unit: 'each'
    },
    {
        id: 'spinach',
        aliases: ['baby spinach', 'org spinach', 'spinach leaves'],
        macros: { calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, potassium_mg: 558, sodium_mg: 79 },
        shelf_life_days: 7,
        unit: '100g'
    },
    {
        id: 'broccoli',
        aliases: ['broccoli crowns', 'org broccoli'],
        macros: { calories: 34, protein_g: 2.8, carbs_g: 6.6, fat_g: 0.4, potassium_mg: 316, sodium_mg: 33 },
        shelf_life_days: 10,
        unit: '100g'
    },

    // --- MEAT & PROTEIN ---
    {
        id: 'chicken breast',
        aliases: ['chicken breasts', 'boneless skinless chicken', 'chicken bst', 'chicken breast org'],
        macros: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, potassium_mg: 256, sodium_mg: 74 },
        shelf_life_days: 4, // Fresh in fridge
        unit: '100g'
    },
    {
        id: 'ground beef',
        aliases: ['beef ground', '80/20 ground beef', '93/7 ground beef', 'hamburger meat'],
        macros: { calories: 250, protein_g: 26, carbs_g: 0, fat_g: 17, potassium_mg: 318, sodium_mg: 72 }, // Avg 80/20
        shelf_life_days: 3,
        unit: '100g'
    },
    {
        id: 'eggs',
        aliases: ['large eggs', 'jumbo eggs', 'egg', 'dozen eggs'],
        macros: { calories: 78, protein_g: 6, carbs_g: 0.6, fat_g: 5, potassium_mg: 63, sodium_mg: 62 },
        shelf_life_days: 28,
        unit: 'each'
    },
    {
        id: 'salmon',
        aliases: ['salmon fillet', 'wild caught salmon', 'atlantic salmon'],
        macros: { calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, potassium_mg: 363, sodium_mg: 59 },
        shelf_life_days: 3,
        unit: '100g'
    },
    {
        id: 'shrimp',
        aliases: ['jumbo shrimp', 'raw shrimp', 'frozen shrimp', 'shrimp peeled'],
        macros: { calories: 99, protein_g: 24, carbs_g: 0.2, fat_g: 0.3, potassium_mg: 259, sodium_mg: 111 },
        shelf_life_days: 3,
        unit: '100g'
    },

    // --- DAIRY & ALTERNATIVES ---
    {
        id: 'whole milk',
        aliases: ['milk', 'gal milk', 'gallon milk whole'],
        macros: { calories: 149, protein_g: 8, carbs_g: 12, fat_g: 8, potassium_mg: 322, sodium_mg: 105 },
        shelf_life_days: 14,
        unit: '1 cup'
    },
    {
        id: 'greek yogurt',
        aliases: ['plain greek yogurt', 'chobani plain', 'fage yogurt'],
        macros: { calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4, potassium_mg: 141, sodium_mg: 36 },
        shelf_life_days: 21,
        unit: '100g'
    },
    {
        id: 'butter',
        aliases: ['unsalted butter', 'salted butter', 'stick butter'],
        macros: { calories: 717, protein_g: 0.9, carbs_g: 0.1, fat_g: 81, potassium_mg: 24, sodium_mg: 11 },
        shelf_life_days: 60,
        unit: '100g'
    },

    // --- CARBS & PANTRY ---
    {
        id: 'white rice',
        aliases: ['jasmine rice', 'basmati rice', 'long grain rice'],
        macros: { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, potassium_mg: 35, sodium_mg: 1 },
        shelf_life_days: 365, // Dry pantry
        unit: '100g (cooked)'
    },
    {
        id: 'oats',
        aliases: ['rolled oats', 'old fashioned oats', 'quick oats', 'oatmeal'],
        macros: { calories: 389, protein_g: 16.9, carbs_g: 66, fat_g: 6.9, potassium_mg: 429, sodium_mg: 2 },
        shelf_life_days: 365,
        unit: '100g'
    },
    {
        id: 'bread',
        aliases: ['whole wheat bread', 'white bread', 'sliced bread', 'loaf bread'],
        macros: { calories: 69, protein_g: 3.6, carbs_g: 12, fat_g: 1.1, potassium_mg: 71, sodium_mg: 136 },
        shelf_life_days: 10,
        unit: '1 slice'
    }
];

/**
 * Fuzzy matches a raw OCR string to the closest item in the Nutritional Matrix.
 * Returns the full matrix object or null if no confident match is found.
 */
export function matchToNutritionalMatrix(rawText) {
    if (!rawText) return null;
    
    const query = rawText.toLowerCase().trim();
    
    for (const item of NUTRITIONAL_MATRIX) {
        // Exact match on ID
        if (query === item.id) return item;
        
        // Exact match on Aliases
        if (item.aliases.includes(query)) return item;
        
        // Fuzzy Substring Match (e.g., "USDA Choice Ground Beef" matches "ground beef")
        for (const alias of [...item.aliases, item.id]) {
            if (query.includes(alias)) {
                return item;
            }
        }
    }
    
    return null;
}
