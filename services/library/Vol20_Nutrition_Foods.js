// services/library/Vol20_Nutrition_Foods.js
export const FOOD_CARDS = [
  // PROTEINS
  {
    id: 'food-beef-brisket', topic: 'nutrition', subject: 'FOOD:BEEF_BRISKET', title: 'Beef Brisket', tags: ['FOOD', 'MACROS', 'MEAT'],
    body: JSON.stringify({
      description: "A cut of meat from the breast or lower chest of beef or veal.",
      where_found: "Procured from cattle worldwide.",
      benefits: "Highly bioavailable protein source, rich in essential minerals and saturated fats for hormone production.",
      associated_nutrients: ["Protein", "Iron", "Zinc", "Vitamin B12"],
      baseline_unit: "100g",
      macros: { protein_g: 21, fat_g: 7, carbs_g: 0, sodium_mg: 60, calories: 155 }
    })
  },
  {
    id: 'food-chicken', topic: 'nutrition', subject: 'FOOD:CHICKEN', title: 'Chicken Breast', tags: ['FOOD', 'MACROS', 'MEAT'],
    body: JSON.stringify({
      description: "A very lean cut of meat from the pectoral muscle of the chicken.",
      where_found: "Produced globally by poultry farms.",
      benefits: "Excellent source of lean protein for muscle building and repair, while keeping calorie intake low.",
      associated_nutrients: ["Protein", "Vitamin B6", "Niacin", "Phosphorus"],
      baseline_unit: "100g",
      macros: { protein_g: 31, fat_g: 3.6, carbs_g: 0, sodium_mg: 74, calories: 165 }
    })
  },
  {
    id: 'food-salmon', topic: 'nutrition', subject: 'FOOD:SALMON', title: 'Wild Caught Salmon', tags: ['FOOD', 'MACROS', 'SEAFOOD'],
    body: JSON.stringify({
      description: "An anadromous fish known for its pink flesh and high omega-3 fatty acid content.",
      where_found: "Native to tributaries of the North Atlantic and Pacific Ocean.",
      benefits: "Reduces inflammation, supports brain health, and lowers risk of cardiovascular disease.",
      associated_nutrients: ["Omega-3", "Vitamin B12", "Selenium", "Protein"],
      baseline_unit: "100g",
      macros: { protein_g: 20, fat_g: 13, carbs_g: 0, sodium_mg: 59, calories: 208 }
    })
  },
  {
    id: 'food-eggs', topic: 'nutrition', subject: 'FOOD:EGGS', title: 'Whole Eggs', tags: ['FOOD', 'MACROS', 'ANIMAL_PRODUCT'],
    body: JSON.stringify({
      description: "An organic vessel containing the zygote in which an animal embryo develops, widely consumed as a highly nutritious food.",
      where_found: "Produced globally by poultry farms.",
      benefits: "Raises HDL 'good' cholesterol, contains choline for brain health, and promotes muscle repair.",
      associated_nutrients: ["Protein", "Choline", "Vitamin D", "Lutein"],
      baseline_unit: "100g",
      macros: { protein_g: 13, fat_g: 11, carbs_g: 1.1, sodium_mg: 142, calories: 143 }
    })
  },
  {
    id: 'food-tofu', topic: 'nutrition', subject: 'FOOD:TOFU', title: 'Firm Tofu', tags: ['FOOD', 'MACROS', 'PLANT_PROTEIN'],
    body: JSON.stringify({
      description: "A food prepared by coagulating soy milk and then pressing the resulting curds into solid white blocks of varying softness.",
      where_found: "Originated in China, now consumed globally as a staple plant-based protein.",
      benefits: "Provides all nine essential amino acids, supports bone health, and may lower heart disease risk.",
      associated_nutrients: ["Protein", "Calcium", "Iron", "Manganese"],
      baseline_unit: "100g",
      macros: { protein_g: 17, fat_g: 9, carbs_g: 3, sodium_mg: 14, calories: 144 }
    })
  },
  {
    id: 'food-shrimp', topic: 'nutrition', subject: 'FOOD:SHRIMP', title: 'Shrimp', tags: ['FOOD', 'MACROS', 'SEAFOOD'],
    body: JSON.stringify({
      description: "Swimming decapod crustaceans with elongated bodies and primarily a swimming mode of locomotion.",
      where_found: "Found in both marine and freshwater environments worldwide.",
      benefits: "Extremely low calorie and fat, high in iodine for thyroid function, and contains the antioxidant astaxanthin.",
      associated_nutrients: ["Protein", "Iodine", "Selenium", "Vitamin B12"],
      baseline_unit: "100g",
      macros: { protein_g: 24, fat_g: 0.3, carbs_g: 0.2, sodium_mg: 111, calories: 99 }
    })
  },
  {
    id: 'food-tuna', topic: 'nutrition', subject: 'FOOD:TUNA', title: 'Yellowfin Tuna', tags: ['FOOD', 'MACROS', 'SEAFOOD'],
    body: JSON.stringify({
      description: "A species of tuna found in pelagic waters of tropical and subtropical oceans worldwide.",
      where_found: "Tropical and subtropical oceans.",
      benefits: "High protein, very lean, supports cardiovascular health and boosts immune function.",
      associated_nutrients: ["Protein", "Vitamin D", "Selenium", "Omega-3"],
      baseline_unit: "100g",
      macros: { protein_g: 24, fat_g: 0.5, carbs_g: 0, sodium_mg: 37, calories: 109 }
    })
  },
  {
    id: 'food-greek-yogurt', topic: 'nutrition', subject: 'FOOD:GREEK_YOGURT', title: 'Greek Yogurt (Plain, 0%)', tags: ['FOOD', 'MACROS', 'DAIRY'],
    body: JSON.stringify({
      description: "Yogurt that has been strained to remove most of its whey, resulting in a thicker consistency.",
      where_found: "Produced globally from fermented milk.",
      benefits: "Provides a massive protein hit, supports gut microbiome with probiotics, and strengthens bones.",
      associated_nutrients: ["Protein", "Calcium", "Probiotics", "Vitamin B12"],
      baseline_unit: "100g",
      macros: { protein_g: 10, fat_g: 0.4, carbs_g: 3.6, sodium_mg: 36, calories: 59 }
    })
  },

  // CARBOHYDRATES
  {
    id: 'food-oats', topic: 'nutrition', subject: 'FOOD:OATS', title: 'Rolled Oats', tags: ['FOOD', 'MACROS', 'GRAINS'],
    body: JSON.stringify({
      description: "A species of cereal grain known for its seed, which is consumed as oatmeal and rolled oats.",
      where_found: "Grown in temperate regions worldwide.",
      benefits: "Lowers blood sugar and cholesterol levels, promotes healthy gut bacteria, and increases feeling of fullness.",
      associated_nutrients: ["Fiber (Beta-Glucan)", "Manganese", "Phosphorus", "Iron"],
      baseline_unit: "100g",
      macros: { protein_g: 16.9, fat_g: 6.9, carbs_g: 66.3, sodium_mg: 2, calories: 389 }
    })
  },
  {
    id: 'food-rice-white', topic: 'nutrition', subject: 'FOOD:WHITE_RICE', title: 'White Rice (Cooked)', tags: ['FOOD', 'MACROS', 'GRAINS'],
    body: JSON.stringify({
      description: "Milled rice that has had its husk, bran, and germ removed. This alters the flavor, texture and appearance and helps prevent spoilage.",
      where_found: "Cultivated primarily in Asia and parts of the Americas.",
      benefits: "Provides rapid, easily digestible energy with very low digestive distress for most people.",
      associated_nutrients: ["Carbohydrates", "Folate (if fortified)", "Manganese"],
      baseline_unit: "100g",
      macros: { protein_g: 2.7, fat_g: 0.3, carbs_g: 28, sodium_mg: 1, calories: 130 }
    })
  },
  {
    id: 'food-sweet-potato', topic: 'nutrition', subject: 'FOOD:SWEET_POTATO', title: 'Sweet Potato', tags: ['FOOD', 'MACROS', 'ROOT_VEGETABLE'],
    body: JSON.stringify({
      description: "A dicotyledonous plant that belongs to the bindweed or morning glory family, producing large, starchy, sweet-tasting tuberous roots.",
      where_found: "Tropical regions of the Americas.",
      benefits: "Supports healthy vision, enhances brain function, and promotes a healthy immune system.",
      associated_nutrients: ["Vitamin A", "Vitamin C", "Manganese", "Potassium"],
      baseline_unit: "100g",
      macros: { protein_g: 1.6, fat_g: 0.1, carbs_g: 20, sodium_mg: 55, calories: 86 }
    })
  },
  {
    id: 'food-quinoa', topic: 'nutrition', subject: 'FOOD:QUINOA', title: 'Quinoa (Cooked)', tags: ['FOOD', 'MACROS', 'GRAINS'],
    body: JSON.stringify({
      description: "A flowering plant in the amaranth family. It is a herbaceous annual plant grown as a crop primarily for its edible seeds.",
      where_found: "Native to the Andean region of South America.",
      benefits: "Contains all nine essential amino acids (rare for a plant), high in fiber, and naturally gluten-free.",
      associated_nutrients: ["Protein", "Fiber", "Magnesium", "Folate"],
      baseline_unit: "100g",
      macros: { protein_g: 4.4, fat_g: 1.9, carbs_g: 21.3, sodium_mg: 7, calories: 120 }
    })
  },
  {
    id: 'food-black-beans', topic: 'nutrition', subject: 'FOOD:BLACK_BEANS', title: 'Black Beans (Cooked)', tags: ['FOOD', 'MACROS', 'LEGUMES'],
    body: JSON.stringify({
      description: "A small, shiny black bean classified as a legume, widely used in Latin American cuisine.",
      where_found: "Native to the Americas.",
      benefits: "Maintains healthy bones, lowers blood pressure, and helps manage diabetes through blood sugar regulation.",
      associated_nutrients: ["Fiber", "Protein", "Folate", "Iron"],
      baseline_unit: "100g",
      macros: { protein_g: 8.9, fat_g: 0.5, carbs_g: 23.7, sodium_mg: 1, calories: 132 }
    })
  },
  {
    id: 'food-lentils', topic: 'nutrition', subject: 'FOOD:LENTILS', title: 'Lentils (Cooked)', tags: ['FOOD', 'MACROS', 'LEGUMES'],
    body: JSON.stringify({
      description: "An edible legume. It is an annual plant known for its lens-shaped seeds.",
      where_found: "Cultivated globally, predominantly in Canada and India.",
      benefits: "Excellent source of B vitamins, iron, magnesium, potassium, and zinc. High protein for plant-based diets.",
      associated_nutrients: ["Folate", "Iron", "Protein", "Fiber"],
      baseline_unit: "100g",
      macros: { protein_g: 9, fat_g: 0.4, carbs_g: 20, sodium_mg: 2, calories: 116 }
    })
  },

  // FATS
  {
    id: 'food-avocado', topic: 'nutrition', subject: 'FOOD:AVOCADO', title: 'Avocado', tags: ['FOOD', 'MACROS', 'FRUIT'],
    body: JSON.stringify({
      description: "A large berry containing a single large seed, characterized by its creamy, nutrient-dense flesh.",
      where_found: "Native to South Central Mexico, cultivated in tropical and Mediterranean climates.",
      benefits: "Excellent for heart health, improves digestion, and aids in the absorption of fat-soluble vitamins.",
      associated_nutrients: ["Monounsaturated Fats", "Potassium", "Folate", "Vitamin K"],
      baseline_unit: "100g",
      macros: { protein_g: 2, fat_g: 15, carbs_g: 9, sodium_mg: 7, calories: 160 }
    })
  },
  {
    id: 'food-walnuts', topic: 'nutrition', subject: 'FOOD:WALNUTS', title: 'Walnuts', tags: ['FOOD', 'MACROS', 'NUTS'],
    body: JSON.stringify({
      description: "The edible seed of any tree of the genus Juglans.",
      where_found: "Native to eastern North America, Europe, and Asia.",
      benefits: "Improves brain function, supports male reproductive health, and decreases inflammation.",
      associated_nutrients: ["Omega-3 ALA", "Copper", "Manganese", "Vitamin E"],
      baseline_unit: "100g",
      macros: { protein_g: 15, fat_g: 65, carbs_g: 14, sodium_mg: 2, calories: 654 }
    })
  },
  {
    id: 'food-almonds', topic: 'nutrition', subject: 'FOOD:ALMONDS', title: 'Almonds', tags: ['FOOD', 'MACROS', 'NUTS'],
    body: JSON.stringify({
      description: "The edible and widely cultivated seed of the almond tree.",
      where_found: "Native to the Middle East, now heavily cultivated in California.",
      benefits: "Massive source of antioxidants, assists with blood sugar control, and reduces hunger promoting weight loss.",
      associated_nutrients: ["Vitamin E", "Magnesium", "Fiber", "Protein"],
      baseline_unit: "100g",
      macros: { protein_g: 21.1, fat_g: 49.9, carbs_g: 21.6, sodium_mg: 1, calories: 579 }
    })
  },
  {
    id: 'food-olive-oil', topic: 'nutrition', subject: 'FOOD:OLIVE_OIL', title: 'Extra Virgin Olive Oil', tags: ['FOOD', 'MACROS', 'OILS'],
    body: JSON.stringify({
      description: "A liquid fat obtained from olives, a traditional tree crop of the Mediterranean Basin.",
      where_found: "Mediterranean regions, California.",
      benefits: "Rich in healthy monounsaturated fats, contains large amounts of antioxidants, and has strong anti-inflammatory properties.",
      associated_nutrients: ["Oleic Acid", "Vitamin E", "Vitamin K", "Antioxidants"],
      baseline_unit: "1tbsp (15ml)",
      macros: { protein_g: 0, fat_g: 14, carbs_g: 0, sodium_mg: 0, calories: 119 }
    })
  },
  {
    id: 'food-chia-seeds', topic: 'nutrition', subject: 'FOOD:CHIA_SEEDS', title: 'Chia Seeds', tags: ['FOOD', 'MACROS', 'SEEDS'],
    body: JSON.stringify({
      description: "The edible seeds of Salvia hispanica, a flowering plant in the mint family.",
      where_found: "Native to central and southern Mexico and Guatemala.",
      benefits: "Massive fiber content for digestion, high quality protein, and abundant in bone nutrients.",
      associated_nutrients: ["Fiber", "Omega-3", "Calcium", "Phosphorus"],
      baseline_unit: "100g",
      macros: { protein_g: 16.5, fat_g: 30.7, carbs_g: 42.1, sodium_mg: 16, calories: 486 }
    })
  },

  // VEGETABLES
  {
    id: 'food-spinach', topic: 'nutrition', subject: 'FOOD:SPINACH', title: 'Spinach', tags: ['FOOD', 'MACROS', 'VEGETABLE'],
    body: JSON.stringify({
      description: "A leafy green flowering plant native to central and western Asia.",
      where_found: "Cultivated globally; thrives in cooler climates and temperate soils.",
      benefits: "Supports eye health, reduces oxidative stress, and aids in blood pressure regulation.",
      associated_nutrients: ["Iron", "Vitamin C", "Vitamin K", "Calcium", "Folate"],
      baseline_unit: "100g",
      macros: { protein_g: 2.9, fat_g: 0.4, carbs_g: 3.6, sodium_mg: 79, calories: 23 }
    })
  },
  {
    id: 'food-broccoli', topic: 'nutrition', subject: 'FOOD:BROCCOLI', title: 'Broccoli', tags: ['FOOD', 'MACROS', 'VEGETABLE'],
    body: JSON.stringify({
      description: "An edible green plant in the cabbage family whose large flowering head, stalk and small associated leaves are eaten as a vegetable.",
      where_found: "Cultivated globally.",
      benefits: "Contains potent antioxidants that offer health-protective effects, reduces inflammation, and promotes digestion.",
      associated_nutrients: ["Vitamin C", "Vitamin K", "Fiber", "Folate"],
      baseline_unit: "100g",
      macros: { protein_g: 2.8, fat_g: 0.4, carbs_g: 6.6, sodium_mg: 33, calories: 34 }
    })
  },
  {
    id: 'food-mushrooms', topic: 'nutrition', subject: 'FOOD:MUSHROOMS', title: 'Mushrooms', tags: ['FOOD', 'MACROS', 'FUNGI'],
    body: JSON.stringify({
      description: "Mushrooms are the fleshy, spore-bearing fruiting bodies of a fungus.",
      where_found: "Grows in dark, damp environments such as forest floors, decaying logs, or cultivated farms.",
      benefits: "Boosts the immune system, provides powerful antioxidants (like ergothioneine), and supports gut health.",
      associated_nutrients: ["Vitamin D", "Selenium", "Potassium", "B Vitamins"],
      baseline_unit: "100g",
      macros: { protein_g: 3.1, fat_g: 0.3, carbs_g: 3.3, sodium_mg: 5, calories: 22 }
    })
  },
  {
    id: 'food-asparagus', topic: 'nutrition', subject: 'FOOD:ASPARAGUS', title: 'Asparagus', tags: ['FOOD', 'MACROS', 'VEGETABLE'],
    body: JSON.stringify({
      description: "A perennial flowering plant species whose young shoots are used as a spring vegetable.",
      where_found: "Native to most of Europe, northern Africa and western Asia.",
      benefits: "Acts as a natural diuretic, good for gut health due to inulin, and high in antioxidants.",
      associated_nutrients: ["Vitamin K", "Folate", "Vitamin C", "Vitamin A"],
      baseline_unit: "100g",
      macros: { protein_g: 2.2, fat_g: 0.1, carbs_g: 3.9, sodium_mg: 2, calories: 20 }
    })
  },
  {
    id: 'food-bell-peppers', topic: 'nutrition', subject: 'FOOD:BELL_PEPPERS', title: 'Red Bell Peppers', tags: ['FOOD', 'MACROS', 'VEGETABLE'],
    body: JSON.stringify({
      description: "The fruit of plants in the Grossum cultivar group of the species Capsicum annuum.",
      where_found: "Native to Mexico, Central America, and northern South America.",
      benefits: "Extremely high in Vitamin C, supports eye health, and helps prevent anemia.",
      associated_nutrients: ["Vitamin C", "Vitamin A", "Potassium", "Folate"],
      baseline_unit: "100g",
      macros: { protein_g: 1, fat_g: 0.3, carbs_g: 6, sodium_mg: 4, calories: 31 }
    })
  },
  {
    id: 'food-garlic', topic: 'nutrition', subject: 'FOOD:GARLIC', title: 'Garlic', tags: ['FOOD', 'MACROS', 'VEGETABLE'],
    body: JSON.stringify({
      description: "A species in the onion genus, Allium. Its close relatives include the onion, shallot, leek, and chive.",
      where_found: "Native to Central Asia and northeastern Iran.",
      benefits: "Contains Allicin which has potent medicinal properties. Combats sickness, reduces blood pressure.",
      associated_nutrients: ["Manganese", "Vitamin B6", "Vitamin C", "Selenium"],
      baseline_unit: "10g (approx 3 cloves)",
      macros: { protein_g: 0.6, fat_g: 0, carbs_g: 3.3, sodium_mg: 2, calories: 15 }
    })
  },

  // FRUITS
  {
    id: 'food-blueberries', topic: 'nutrition', subject: 'FOOD:BLUEBERRIES', title: 'Blueberries', tags: ['FOOD', 'MACROS', 'FRUIT'],
    body: JSON.stringify({
      description: "Perennial flowering plants with blue or purple berries.",
      where_found: "Native to North America.",
      benefits: "Known as the king of antioxidant foods, reduces DNA damage, protects against aging and cancer.",
      associated_nutrients: ["Vitamin C", "Vitamin K", "Manganese", "Antioxidants"],
      baseline_unit: "100g",
      macros: { protein_g: 0.7, fat_g: 0.3, carbs_g: 14.5, sodium_mg: 1, calories: 57 }
    })
  },
  {
    id: 'food-bananas', topic: 'nutrition', subject: 'FOOD:BANANAS', title: 'Bananas', tags: ['FOOD', 'MACROS', 'FRUIT'],
    body: JSON.stringify({
      description: "An elongated, edible fruit produced by several kinds of large herbaceous flowering plants.",
      where_found: "Grown in tropical regions globally.",
      benefits: "Excellent for heart health due to potassium, aids in digestion, and provides a quick energy source.",
      associated_nutrients: ["Potassium", "Vitamin B6", "Vitamin C", "Magnesium"],
      baseline_unit: "1 Medium (118g)",
      macros: { protein_g: 1.3, fat_g: 0.4, carbs_g: 27, sodium_mg: 1, calories: 105 }
    })
  },
  {
    id: 'food-apples', topic: 'nutrition', subject: 'FOOD:APPLES', title: 'Apples (with skin)', tags: ['FOOD', 'MACROS', 'FRUIT'],
    body: JSON.stringify({
      description: "An edible fruit produced by an apple tree.",
      where_found: "Originated in Central Asia, now grown worldwide.",
      benefits: "Good for weight loss, good for your heart, and linked to a lower risk of diabetes.",
      associated_nutrients: ["Fiber", "Vitamin C", "Potassium", "Antioxidants"],
      baseline_unit: "1 Medium (182g)",
      macros: { protein_g: 0.5, fat_g: 0.3, carbs_g: 25, sodium_mg: 2, calories: 95 }
    })
  },
  {
    id: 'food-lemons', topic: 'nutrition', subject: 'FOOD:LEMONS', title: 'Lemons', tags: ['FOOD', 'MACROS', 'FRUIT'],
    body: JSON.stringify({
      description: "A species of small evergreen trees in the flowering plant family Rutaceae.",
      where_found: "Native to Asia, primarily Northeast India, Northern Myanmar, or China.",
      benefits: "Supports heart health, helps control weight, prevents kidney stones, and improves digestion.",
      associated_nutrients: ["Vitamin C", "Fiber", "Citric Acid"],
      baseline_unit: "100g",
      macros: { protein_g: 1.1, fat_g: 0.3, carbs_g: 9.3, sodium_mg: 2, calories: 29 }
    })
  }
];
