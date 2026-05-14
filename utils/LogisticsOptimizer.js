import { NutritionalMatrix } from './NutritionalMatrix';
import { getMarketPrices, getInventoryItems } from '../model/database';

/**
 * Logistics Optimizer
 * Automatically calculates nutritional deficits based on the user's weekly goals and current fridge inventory,
 * then queries the decentralized Mesh economy to generate the cheapest possible grocery list to survive the week.
 */

// A simple mock of weekly targets (this would normally come from BiologyEngine based on age/weight)
const WEEKLY_TARGETS = {
    protein: 1000, // g
    carbs: 1500,   // g
    fats: 500      // g
};

export const generateSupplyRequest = async () => {
    try {
        console.log(">> LOGISTICS: Generating supply request...");
        
        // 1. Calculate biological deficit
        const inventory = await getInventoryItems();
        let currentProtein = 0;
        let currentCarbs = 0;
        let currentFats = 0;

        inventory.forEach(item => {
            if (item.macros) {
                try {
                    const macros = JSON.parse(item.macros);
                    // Assume quantity is roughly number of servings for simple math
                    const qty = item.quantity || 1;
                    currentProtein += (macros.protein || 0) * qty;
                    currentCarbs += (macros.carbs || 0) * qty;
                    currentFats += (macros.fat || 0) * qty;
                } catch(e) {}
            }
        });

        const deficit = {
            protein: Math.max(0, WEEKLY_TARGETS.protein - currentProtein),
            carbs: Math.max(0, WEEKLY_TARGETS.carbs - currentCarbs),
            fats: Math.max(0, WEEKLY_TARGETS.fats - currentFats),
        };

        console.log(">> LOGISTICS: Calculated Weekly Deficit:", deficit);

        if (deficit.protein === 0 && deficit.carbs === 0 && deficit.fats === 0) {
            return {
                status: 'COMPLETE',
                list: ['Fridge is fully stocked. No supplies needed.'],
                estimatedCost: 0
            };
        }

        // 2. Scan the Mesh Economy (The 5000 secret items)
        const meshPrices = await getMarketPrices();
        
        // 3. Find cheapest macros
        // For simplicity, we find the cheapest item that provides > 15g protein, cheapest for carbs, etc.
        let cheapestProtein = null;
        let cheapestCarb = null;
        let cheapestFat = null;

        // Hydrate mesh prices with NutritionalMatrix data
        const hydratedMesh = meshPrices.map(priceData => {
            const matrixData = NutritionalMatrix.find(m => m.id === priceData.item_id);
            return {
                ...priceData,
                macros: matrixData ? matrixData.macros : { protein: 0, carbs: 0, fat: 0 },
                name: matrixData ? matrixData.name : priceData.item_id
            };
        });

        hydratedMesh.forEach(item => {
            if (item.macros.protein > 15) {
                if (!cheapestProtein || item.price < cheapestProtein.price) cheapestProtein = item;
            }
            if (item.macros.carbs > 20) {
                if (!cheapestCarb || item.price < cheapestCarb.price) cheapestCarb = item;
            }
            if (item.macros.fat > 15) {
                if (!cheapestFat || item.price < cheapestFat.price) cheapestFat = item;
            }
        });

        // 4. Generate the Shopping List
        const shoppingList = [];
        let totalCost = 0;

        if (deficit.protein > 0 && cheapestProtein) {
            // How many servings to buy?
            const servingsNeeded = Math.ceil(deficit.protein / cheapestProtein.macros.protein);
            shoppingList.push(`${servingsNeeded}x ${cheapestProtein.name} (Cheapest Protein)`);
            totalCost += (servingsNeeded * cheapestProtein.price);
        } else if (deficit.protein > 0) {
            shoppingList.push(`Chicken Breast (Mesh data unavailable)`);
        }

        if (deficit.carbs > 0 && cheapestCarb) {
            const servingsNeeded = Math.ceil(deficit.carbs / cheapestCarb.macros.carbs);
            shoppingList.push(`${servingsNeeded}x ${cheapestCarb.name} (Cheapest Carbs)`);
            totalCost += (servingsNeeded * cheapestCarb.price);
        } else if (deficit.carbs > 0) {
            shoppingList.push(`Rice (Mesh data unavailable)`);
        }

        if (deficit.fats > 0 && cheapestFat) {
            const servingsNeeded = Math.ceil(deficit.fats / cheapestFat.macros.fat);
            shoppingList.push(`${servingsNeeded}x ${cheapestFat.name} (Cheapest Fats)`);
            totalCost += (servingsNeeded * cheapestFat.price);
        }

        return {
            status: 'OPTIMIZED',
            list: shoppingList,
            estimatedCost: totalCost.toFixed(2)
        };

    } catch (error) {
        console.error(">> LOGISTICS ERROR:", error);
        return {
            status: 'ERROR',
            list: ['Failed to query Mesh Economy.'],
            estimatedCost: 0
        };
    }
};
