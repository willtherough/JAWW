// BiologyEngine.js
// Calculates dynamic Total Daily Energy Expenditure (TDEE) and macronutrient requirements.

export function calculateWorkoutBurn(card, weightLbs) {
    if (!card) return 0;
    const bodyText = (card.body || "").toLowerCase();
    const titleText = (card.title || "").toLowerCase();
    
    // 1. Look for explicit calories (e.g. Calories: 500 or Burn: 500)
    const calMatch = bodyText.match(/(?:calories|burn):\s*(\d+)/i);
    if (calMatch && calMatch[1]) {
        return parseInt(calMatch[1], 10);
    }
    
    // 2. Keyword fallback (dynamically finding duration, defaulting to 45)
    // Formula: MET * 3.5 * weightKg / 200 * duration_min
    const weightKg = weightLbs * 0.453592;
    let duration = 45; // default 45 min

    // Look for explicit duration like "12:35" or "45 min" in title or body
    const combinedText = titleText + " " + bodyText;
    const timeMatch = combinedText.match(/(\d+):(\d{2})/);
    if (timeMatch) {
        // e.g., 12:35 -> 12 + 35/60 minutes
        duration = parseInt(timeMatch[1], 10) + (parseInt(timeMatch[2], 10) / 60);
    } else {
        const minMatch = combinedText.match(/(\d+)\s*(?:min|minute)s?/);
        if (minMatch) {
            duration = parseInt(minMatch[1], 10);
        }
    }
    let met = 5; // generic moderate workout (e.g. general strength training)

    if (titleText.includes("hiit") || bodyText.includes("hiit")) met = 8;
    else if (titleText.includes("run") || bodyText.includes("run")) met = 9.8;
    else if (titleText.includes("yoga") || bodyText.includes("yoga")) met = 3;
    else if (titleText.includes("walk") || bodyText.includes("walk")) met = 3.5;
    else if (titleText.includes("bike") || titleText.includes("cycle")) met = 7;
    
    const burn = (met * 3.5 * weightKg / 200) * duration;
    return Math.round(burn);
}

export function calculateDailyRequirements(profile, activeWorkoutCard = null) {
    const p = profile || {};
    const age = parseInt(p.age || '30', 10);
    const weightLbs = parseFloat(p.weight || '180');
    const heightInches = parseFloat(p.height || '70');

    if (isNaN(age) || isNaN(weightLbs) || isNaN(heightInches)) return null;

    // Convert to Metric for Mifflin-St Jeor Equation
    const weightKg = weightLbs * 0.453592;
    const heightCm = heightInches * 2.54;

    // Base BMR Calculation (Mifflin-St Jeor)
    const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age);

    // Apply Gender Coefficients
    const bmrMale = baseBMR + 5;
    const bmrFemale = baseBMR - 161;

    // Determine Activity Level based on 7-Day Schedule
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); // e.g., 'mon', 'tue'
    const scheduledWorkout = p.schedule ? p.schedule[today] : null;
    
    // If a workout is scheduled and it's not "REST" or empty, apply active multiplier.
    const isWorkoutDay = scheduledWorkout && scheduledWorkout.trim() !== '' && scheduledWorkout.trim().toUpperCase() !== 'REST';
    
    const workoutBurn = isWorkoutDay ? calculateWorkoutBurn(activeWorkoutCard, weightLbs) : 0;

    // We use the true Sedentary multiplier (1.2) as the baseline for the day, then add the explicit workout burn.
    const tdeeMale = (bmrMale * 1.2) + workoutBurn;
    const tdeeFemale = (bmrFemale * 1.2) + workoutBurn;

    // Macro Breakdown (Standard 30% Protein, 35% Carbs, 35% Fats)
    // Protein: 4 calories per gram
    // Carbs: 4 calories per gram
    // Fats: 9 calories per gram
    const getMacros = (tdee) => ({
        calories: Math.round(tdee),
        protein_g: Math.round((tdee * 0.30) / 4),
        carbs_g: Math.round((tdee * 0.35) / 4),
        fat_g: Math.round((tdee * 0.35) / 9)
    });

    const getTargetProfiles = (baseTdee) => ({
        maintain: getMacros(baseTdee),
        lose_2lbs: getMacros(baseTdee - 1000), // 1000 kcal deficit = ~2 lbs week
        gain_1lb: getMacros(baseTdee + 500)    // 500 kcal surplus = ~1 lb week
    });

    return {
        isWorkoutDay,
        workoutName: isWorkoutDay ? scheduledWorkout : "Rest Day",
        workoutBurn,
        male: getTargetProfiles(tdeeMale),
        female: getTargetProfiles(tdeeFemale)
    };
}

export function estimateRecipeTimes(bodyText) {
    if (!bodyText) return { prepTime: 15, cookTime: 20 };
    const lowerBody = bodyText.toLowerCase();

    let prepTime = 15;
    let cookTime = 20;

    // Look for explicit prep/cook definitions
    const prepMatch = lowerBody.match(/prep(?:aration)?\s*(?:time)?\s*:\s*(\d+)\s*(?:min|m)/i);
    if (prepMatch) prepTime = parseInt(prepMatch[1], 10);

    const cookMatch = lowerBody.match(/cook(?:ing)?\s*(?:time)?\s*:\s*(\d+)\s*(?:min|m|hr|h|hour)/i);
    if (cookMatch) {
        let rawVal = parseInt(cookMatch[1], 10);
        if (cookMatch[0].includes('hr') || cookMatch[0].includes('hour')) rawVal *= 60;
        cookTime = rawVal;
    }

    // Heuristics based on cooking verbs if explicit times aren't found
    if (!cookMatch) {
        if (lowerBody.includes('smoke') || lowerBody.includes('slow cooker') || lowerBody.includes('crock pot')) cookTime = 240; // 4 hours
        else if (lowerBody.includes('roast') || lowerBody.includes('bake')) cookTime = 45;
        else if (lowerBody.includes('simmer')) cookTime = 30;
        else if (lowerBody.includes('fry') || lowerBody.includes('saute')) cookTime = 15;
        else if (lowerBody.includes('microwave') || lowerBody.includes('blend')) cookTime = 5;
    }

    return { prepTime, cookTime };
}
