// services/library/Vol21_Nutrition_Nutrients.js
export const NUTRIENT_CARDS = [
  // MACRONUTRIENTS
  {
    id: 'nutrient-protein', topic: 'nutrient', subject: 'NUTRIENT:PROTEIN', title: 'Protein', tags: ['NUTRIENTS', 'MACROS'],
    body: JSON.stringify({
      content: "A macronutrient built from amino acids, essential for the structure, function, and regulation of the body's tissues and organs.",
      recommended_daily_value: "50g (minimum, scales with lean mass and activity level)",
      common_sources: ["Chicken", "Beef", "Fish", "Eggs", "Lentils", "Whey"],
      deficiency_symptoms: ["Muscle wasting", "Fatigue", "Weak immune system", "Edema"]
    })
  },
  {
    id: 'nutrient-carbs', topic: 'nutrient', subject: 'NUTRIENT:CARBOHYDRATES', title: 'Carbohydrates', tags: ['NUTRIENTS', 'MACROS'],
    body: JSON.stringify({
      content: "A macronutrient consisting of carbon, hydrogen, and oxygen atoms. It is the body's primary and preferred source of energy.",
      recommended_daily_value: "275g (varies significantly by activity level)",
      common_sources: ["Oats", "Rice", "Potatoes", "Fruits", "Quinoa"],
      deficiency_symptoms: ["Lethargy", "Brain fog", "Hypoglycemia", "Muscle cramps"]
    })
  },
  {
    id: 'nutrient-fats', topic: 'nutrient', subject: 'NUTRIENT:FATS', title: 'Dietary Fats', tags: ['NUTRIENTS', 'MACROS'],
    body: JSON.stringify({
      content: "A macronutrient essential for long-term energy storage, hormone production, and the absorption of fat-soluble vitamins (A, D, E, K).",
      recommended_daily_value: "78g",
      common_sources: ["Avocados", "Nuts", "Olive Oil", "Fatty Fish", "Butter"],
      deficiency_symptoms: ["Hormonal imbalance", "Dry skin", "Poor cognitive function", "Vitamin deficiency"]
    })
  },
  {
    id: 'nutrient-fiber', topic: 'nutrient', subject: 'NUTRIENT:FIBER', title: 'Dietary Fiber', tags: ['NUTRIENTS', 'MACROS'],
    body: JSON.stringify({
      content: "A type of carbohydrate that the body can't digest. It helps regulate the body's use of sugars, helping to keep hunger and blood sugar in check.",
      recommended_daily_value: "28g",
      common_sources: ["Beans", "Whole Grains", "Apples", "Berries", "Broccoli"],
      deficiency_symptoms: ["Constipation", "Blood sugar spikes", "Increased hunger", "Poor gut health"]
    })
  },

  // VITAMINS
  {
    id: 'nutrient-vita', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_A', title: 'Vitamin A (Retinol)', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "A fat-soluble vitamin crucial for maintaining vision, promoting growth and development, and protecting cellular health.",
      recommended_daily_value: "900 mcg",
      common_sources: ["Liver", "Sweet Potatoes", "Carrots", "Spinach"],
      deficiency_symptoms: ["Night blindness", "Dry skin", "Increased susceptibility to infections"]
    })
  },
  {
    id: 'nutrient-vitc', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_C', title: 'Vitamin C', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "A water-soluble vitamin that acts as an antioxidant, helping to protect cells from the damage caused by free radicals. Essential for collagen production.",
      recommended_daily_value: "90 mg",
      common_sources: ["Citrus Fruits", "Bell Peppers", "Strawberries", "Broccoli"],
      deficiency_symptoms: ["Scurvy", "Bleeding gums", "Slow wound healing", "Dry skin"]
    })
  },
  {
    id: 'nutrient-vitd', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_D', title: 'Vitamin D', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "A fat-soluble vitamin essential for calcium absorption, bone health, and regulating inflammation.",
      recommended_daily_value: "20 mcg (800 IU)",
      common_sources: ["Sunlight", "Salmon", "Egg Yolks", "Fortified Milk"],
      deficiency_symptoms: ["Bone pain", "Muscle weakness", "Fatigue", "Depression"]
    })
  },
  {
    id: 'nutrient-vite', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_E', title: 'Vitamin E', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "A fat-soluble antioxidant that protects cellular membranes from oxidative damage and supports immune function.",
      recommended_daily_value: "15 mg",
      common_sources: ["Sunflower Seeds", "Almonds", "Spinach", "Avocados"],
      deficiency_symptoms: ["Muscle weakness", "Vision problems", "Immune system decline", "Nerve damage"]
    })
  },
  {
    id: 'nutrient-vitk', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_K', title: 'Vitamin K', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "A fat-soluble vitamin necessary for blood clotting and regulating bone metabolism.",
      recommended_daily_value: "120 mcg",
      common_sources: ["Kale", "Spinach", "Broccoli", "Brussels Sprouts"],
      deficiency_symptoms: ["Excessive bleeding", "Easy bruising", "Weak bones"]
    })
  },
  {
    id: 'nutrient-b1', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_B1', title: 'Vitamin B1 (Thiamine)', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "A water-soluble vitamin involved in energy metabolism and nerve function.",
      recommended_daily_value: "1.2 mg",
      common_sources: ["Pork", "Whole Grains", "Legumes", "Nuts"],
      deficiency_symptoms: ["Beriberi", "Fatigue", "Muscle weakness", "Nerve damage"]
    })
  },
  {
    id: 'nutrient-b9', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_B9', title: 'Vitamin B9 (Folate)', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "Crucial for proper brain function and plays an important role in mental and emotional health. Essential for DNA synthesis.",
      recommended_daily_value: "400 mcg",
      common_sources: ["Spinach", "Lentils", "Asparagus", "Avocado"],
      deficiency_symptoms: ["Megaloblastic anemia", "Fatigue", "Irritability", "Birth defects (in pregnancy)"]
    })
  },
  {
    id: 'nutrient-b12', topic: 'nutrient', subject: 'NUTRIENT:VITAMIN_B12', title: 'Vitamin B12', tags: ['NUTRIENTS', 'VITAMINS'],
    body: JSON.stringify({
      content: "A water-soluble vitamin required for red blood cell formation, neurological function, and DNA synthesis.",
      recommended_daily_value: "2.4 mcg",
      common_sources: ["Beef", "Liver", "Fish", "Dairy", "Fortified Cereals"],
      deficiency_symptoms: ["Megaloblastic anemia", "Fatigue", "Neurological changes", "Numbness in limbs"]
    })
  },

  // MINERALS
  {
    id: 'nutrient-calcium', topic: 'nutrient', subject: 'NUTRIENT:CALCIUM', title: 'Calcium (Ca)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "The most abundant mineral in the body, vital for bone and tooth formation, muscle contraction, and nerve signaling.",
      recommended_daily_value: "1000 mg",
      common_sources: ["Dairy Products", "Leafy Greens", "Tofu", "Sardines"],
      deficiency_symptoms: ["Osteoporosis", "Muscle spasms", "Numbness", "Brittle nails"]
    })
  },
  {
    id: 'nutrient-iron', topic: 'nutrient', subject: 'NUTRIENT:IRON', title: 'Iron (Fe)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "A major component of hemoglobin, a type of protein in red blood cells that carries oxygen from your lungs to all parts of the body.",
      recommended_daily_value: "8 mg (men), 18 mg (women)",
      common_sources: ["Red Meat", "Spinach", "Lentils", "Tofu"],
      deficiency_symptoms: ["Anemia", "Fatigue", "Shortness of breath", "Pale skin"]
    })
  },
  {
    id: 'nutrient-magnesium', topic: 'nutrient', subject: 'NUTRIENT:MAGNESIUM', title: 'Magnesium (Mg)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "A mineral that acts as a cofactor in over 300 enzyme systems regulating protein synthesis, muscle/nerve function, and blood pressure.",
      recommended_daily_value: "400 mg",
      common_sources: ["Spinach", "Almonds", "Black Beans", "Avocado"],
      deficiency_symptoms: ["Muscle cramps", "Mental disorders", "Osteoporosis", "Fatigue"]
    })
  },
  {
    id: 'nutrient-zinc', topic: 'nutrient', subject: 'NUTRIENT:ZINC', title: 'Zinc (Zn)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "A crucial trace mineral involved in protein synthesis, immune function, and DNA creation.",
      recommended_daily_value: "11 mg",
      common_sources: ["Oysters", "Beef", "Pumpkin Seeds", "Lentils"],
      deficiency_symptoms: ["Hair loss", "Compromised immune function", "Delayed wound healing", "Loss of appetite"]
    })
  },
  {
    id: 'nutrient-potassium', topic: 'nutrient', subject: 'NUTRIENT:POTASSIUM', title: 'Potassium (K)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "An essential mineral and electrolyte that helps maintain normal fluid levels, blood pressure, and nerve signal transmission.",
      recommended_daily_value: "4700 mg",
      common_sources: ["Bananas", "Sweet Potatoes", "Spinach", "Avocados"],
      deficiency_symptoms: ["Muscle weakness", "Spasms", "Palpitations", "Fatigue"]
    })
  },
  {
    id: 'nutrient-sodium', topic: 'nutrient', subject: 'NUTRIENT:SODIUM', title: 'Sodium (Na)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "An essential electrolyte that controls blood volume and pressure, and is needed for nerve and muscle function.",
      recommended_daily_value: "1500 mg (minimum) - 2300 mg",
      common_sources: ["Table Salt", "Broth", "Celery", "Beets"],
      deficiency_symptoms: ["Hyponatremia", "Headache", "Confusion", "Muscle weakness"]
    })
  },
  {
    id: 'nutrient-selenium', topic: 'nutrient', subject: 'NUTRIENT:SELENIUM', title: 'Selenium (Se)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "A trace mineral important for reproduction, thyroid gland function, DNA production, and protecting the body from infection.",
      recommended_daily_value: "55 mcg",
      common_sources: ["Brazil Nuts", "Tuna", "Sardines", "Eggs"],
      deficiency_symptoms: ["Muscle weakness", "Fatigue", "Mental fog", "Hair loss"]
    })
  },
  {
    id: 'nutrient-iodine', topic: 'nutrient', subject: 'NUTRIENT:IODINE', title: 'Iodine (I)', tags: ['NUTRIENTS', 'MINERALS'],
    body: JSON.stringify({
      content: "A trace mineral needed by the body to make thyroid hormones, which control the body's metabolism and many other important functions.",
      recommended_daily_value: "150 mcg",
      common_sources: ["Seaweed", "Cod", "Dairy", "Iodized Salt"],
      deficiency_symptoms: ["Goiter", "Weight gain", "Fatigue", "Feeling cold"]
    })
  },
  
  // ESSENTIAL FATTY ACIDS
  {
    id: 'nutrient-omega3', topic: 'nutrient', subject: 'NUTRIENT:OMEGA_3', title: 'Omega-3 Fatty Acids', tags: ['NUTRIENTS', 'MACROS'],
    body: JSON.stringify({
      content: "Polyunsaturated fats crucial for brain health, reducing inflammation, and lowering the risk of heart disease.",
      recommended_daily_value: "1.6g",
      common_sources: ["Salmon", "Chia Seeds", "Walnuts", "Flaxseeds"],
      deficiency_symptoms: ["Dry skin", "Depression", "Dry eyes", "Joint pain"]
    })
  }
];
