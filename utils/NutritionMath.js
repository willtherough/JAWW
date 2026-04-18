/**
 * NutritionMath.js
 * Core biological algorithm for the JAWW Arbitrage Engine.
 * Calculates precise Daily Targets (TDEE) using Mifflin-St Jeor equation.
 */

// Activity Multipliers
export const ACTIVITY_LEVELS = {
    SEDENTARY: 1.2,
    LIGHT: 1.375,
    MODERATE: 1.55,
    ACTIVE: 1.725,
    VERY_ACTIVE: 1.9
};

/**
 * Calculates the user's Bio-Profile baselines.
 * 
 * @param {number} weight_kg - User's weight in kilograms
 * @param {number} height_cm - User's height in centimeters
 * @param {number} age_years - User's age
 * @param {string} gender - 'M' or 'F'
 * @param {number} activityMultiplier - Use ACTIVITY_LEVELS
 * @returns {Object} Target floors and ceilings for the Biological Radar
 */
export function calculateBioBaseline(weight_kg, height_cm, age_years, gender = 'M', activityMultiplier = ACTIVITY_LEVELS.ACTIVE) {
    // 1. Calculate Basal Metabolic Rate (BMR) - Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'M') {
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) + 5;
    } else {
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age_years) - 161;
    }

    // 2. Calculate Total Daily Energy Expenditure (TDEE)
    const tdee = bmr * activityMultiplier;

    // 3. Set Strict Macro Floors & Ceilings for High-Performance Training
    // Target: 2.0g of Protein per kg of body weight (floor)
    const proteinTarget_g = weight_kg * 2.0;

    // Standard FDA Sodium Ceiling is 2300mg
    const sodiumCeiling_mg = 2300;

    // Fat: 1g per kg body weight
    const fatTarget_g = weight_kg * 1.0;

    // Carbs: Fill the remaining calories
    // 1g Protein = 4 kcal | 1g Fat = 9 kcal | 1g Carb = 4 kcal
    const remainingKcal = tdee - ((proteinTarget_g * 4) + (fatTarget_g * 9));
    const carbsTarget_g = Math.max(0, remainingKcal / 4);

    return {
        tdee_kcal: Math.round(tdee),
        protein_g: Math.round(proteinTarget_g),
        fat_g: Math.round(fatTarget_g),
        carbs_g: Math.round(carbsTarget_g),
        sodium_mg: Math.round(sodiumCeiling_mg)
    };
}

/**
 * Aggregates all items in the Grocery List into a single nutritional payload.
 * 
 * @param {Array} groceryListItems - Array of Master Card JSON objects
 * @returns {Object} Total macros accumulated in the list
 */
export function aggregateListMacros(groceryListItems) {
    const totals = {
        calories: 0,
        protein_g: 0,
        fat_g: 0,
        carbs_g: 0,
        sodium_mg: 0
    };

    groceryListItems.forEach(card => {
        try {
            // Assume card.body contains the JSON object for Master Cards
            const data = JSON.parse(card.body);
            if (data.macros) {
                totals.calories += (data.macros.calories || 0);
                totals.protein_g += (data.macros.protein_g || 0);
                totals.fat_g += (data.macros.fat_g || 0);
                totals.carbs_g += (data.macros.carbs_g || 0);
                totals.sodium_mg += (data.macros.sodium_mg || 0);
            }
        } catch (e) {
            // Not a structured nutritional card, ignore
        }
    });

    return totals;
}
