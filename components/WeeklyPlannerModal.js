import React, { useState, useMemo } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, StatusBar, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createCard } from '../model/Schema';
import { loadProfile } from '../model/Storage';
import { insertOrReplaceCard, deleteCard } from '../model/database';
import { estimateRecipeTimes } from '../utils/BiologyEngine';

export default function WeeklyPlannerModal({ visible, onClose, localLibrary = [], bioTargets = null }) {
    const [schedule, setSchedule] = useState(null);
    const [expandedDay, setExpandedDay] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    // 1. Separate Inventory & Recipes
    const { fridgeItems, recipes } = useMemo(() => {
        const fridgeItems = localLibrary.filter(c => c.subject && (c.subject.startsWith('FRIDGE:') || c.subject.startsWith('FOOD:')));
        const recipes = localLibrary.filter(c => 
            c.subject === 'RECIPE' || 
            c.topic === 'food' ||
            (c.body && (c.body.toLowerCase().includes('ingredients:') || c.body.toLowerCase().includes('prep time')))
        );
        return { fridgeItems, recipes };
    }, [localLibrary]);

    // 2. Identify "Cookable" Recipes based on Inventory
    const cookableRecipes = useMemo(() => {
        // In a strict implementation, we would cross-reference recipe.ingredients with fridgeItems.
        // For the MVP, we assume basic pantry staples exist and that the user's recipes in the ledger 
        // are generally cookable if they have overlapping keywords, OR we just allow all recipes to be scheduled
        // if inventory is low so the planner doesn't fail completely.
        
        // Let's parse recipes
        const parsedRecipes = recipes.map(r => {
            const timeEstimates = estimateRecipeTimes(r.body);
            let data = { ingredients: [], instructions: [], prepTime: timeEstimates.prepTime, cookTime: timeEstimates.cookTime, macros: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } };
            try {
                const parsed = JSON.parse(r.body);
                data = { ...data, ...parsed };
                // Fallback for Brisket if user manually made it
                if (!data.macros.calories && parsed.totals) data.macros = parsed.totals;
            } catch(e) {}
            return { ...r, parsedData: data };
        });

        // If strict mode was on, we'd filter here. For now, all owned recipes are eligible.
        return parsedRecipes;
    }, [recipes, fridgeItems]);

    // 3. Autonomous Knapsack Scheduler
    const handleGenerateWeek = () => {
        if (!bioTargets || !bioTargets.maintain) {
            Alert.alert("Error", "Biological Targets missing. Please configure your Identity Dossier.");
            return;
        }

        if (cookableRecipes.length === 0) {
            Alert.alert("Insufficient Intel", "You don't have any RECIPE cards in your ledger. Add recipes before generating a plan.");
            return;
        }

        const reqs = bioTargets.maintain;
        const newSchedule = [];

        // Generate 7 days starting from Tomorrow (since today might be partially eaten)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        for (let i = 0; i < 7; i++) {
            const date = new Date(tomorrow);
            date.setDate(date.getDate() + i);
            const dateStr = date.toLocaleDateString();

            // Simple Knapsack algorithm: Find a Breakfast and Dinner that sum to the Daily Target (+/- margin)
            // Shuffle cookable recipes to get variety
            const shuffled = [...cookableRecipes].sort(() => 0.5 - Math.random());
            
            let bestBreakfast = null;
            let bestDinner = null;
            let smallestDelta = Infinity;

            for (let b = 0; b < shuffled.length; b++) {
                for (let d = 0; d < shuffled.length; d++) {
                    // Try combining two recipes (they can be the same if it's leftovers!)
                    const bMacros = shuffled[b].parsedData.macros || { calories: 0, protein_g: 0 };
                    const dMacros = shuffled[d].parsedData.macros || { calories: 0, protein_g: 0 };
                    
                    const totalCals = bMacros.calories + dMacros.calories;
                    const delta = Math.abs(reqs.calories - totalCals);

                    if (delta < smallestDelta) {
                        smallestDelta = delta;
                        bestBreakfast = shuffled[b];
                        bestDinner = shuffled[d];
                    }

                    // If we found a perfect match (within 25 cals), stop searching
                    if (delta <= 25) break;
                }
                if (smallestDelta <= 25) break;
            }

            newSchedule.push({
                id: `day-${i}`,
                date: dateStr,
                dateObj: date,
                plan: {
                    breakfast: bestBreakfast ? [bestBreakfast] : [],
                    lunch: [], // User specifically asked for Breakfast and Dinner automation
                    dinner: bestDinner ? [bestDinner] : [],
                    additional: []
                },
                totals: {
                    calories: (bestBreakfast?.parsedData.macros.calories || 0) + (bestDinner?.parsedData.macros.calories || 0),
                    protein_g: (bestBreakfast?.parsedData.macros.protein_g || 0) + (bestDinner?.parsedData.macros.protein_g || 0),
                    carbs_g: (bestBreakfast?.parsedData.macros.carbs_g || 0) + (bestDinner?.parsedData.macros.carbs_g || 0),
                    fat_g: (bestBreakfast?.parsedData.macros.fat_g || 0) + (bestDinner?.parsedData.macros.fat_g || 0)
                },
                delta: smallestDelta
            });
        }

        setSchedule(newSchedule);
    };

    // 4. Commit to Ledger
    const handleCommitToLedger = async () => {
        if (!schedule) return;
        try {
            const profile = await loadProfile();
            if (!profile || !profile.publicKey) {
                Alert.alert("Error", "Missing Identity Dossier. Cannot author ledger entries.");
                return;
            }

            // Write 7 days of NUTRITION_LOG cards
            for (const day of schedule) {
                const title = `Meals Eaten ${day.date}`;
                const body = JSON.stringify({ plan: day.plan, totals: day.totals });
                
                // Remove existing future cards for that day if they exist to prevent bloat
                const existing = localLibrary.find(c => c.title === title && c.subject === 'NUTRITION_LOG');
                if (existing && existing.id) {
                    await deleteCard(existing.id);
                }

                const card = await createCard(
                    profile.publicKey,
                    title,
                    body,
                    ['health', 'nutrition'],
                    'NUTRITION_LOG',
                    profile.handle || 'Unknown',
                    'standard'
                );
                await insertOrReplaceCard(card);
            }

            Alert.alert("Success", "7-Day Meal Plan successfully committed to the JAWW Ledger.");
            onClose();
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to commit schedule to ledger.");
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>// AUTONOMOUS SCHEDULER</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Feather name="x" size={24} color="#0EA5E9" />
                    </TouchableOpacity>
                </View>

                {selectedRecipe ? (
                    <View style={styles.recipeView}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedRecipe(null)}>
                            <Feather name="chevron-left" size={16} color="#0EA5E9" />
                            <Text style={{color: '#0EA5E9', fontWeight: 'bold', marginLeft: 6, fontFamily: 'Courier'}}>BACK TO SCHEDULE</Text>
                        </TouchableOpacity>
                        
                        <ScrollView style={{flex: 1, padding: 20}}>
                            <Text style={styles.recipeTitle}>{selectedRecipe.title}</Text>
                            
                            <View style={styles.recipeMetaRow}>
                                <View style={styles.metaBox}><Text style={styles.metaLabel}>PREP TIME</Text><Text style={styles.metaValue}>{selectedRecipe.parsedData.prepTime || 15} MIN</Text></View>
                                <View style={styles.metaBox}><Text style={styles.metaLabel}>COOK TIME</Text><Text style={styles.metaValue}>{selectedRecipe.parsedData.cookTime || 20} MIN</Text></View>
                                <View style={styles.metaBox}><Text style={styles.metaLabel}>CALORIES</Text><Text style={[styles.metaValue, {color: '#F59E0B'}]}>{selectedRecipe.parsedData.macros?.calories || 0}</Text></View>
                            </View>

                            <Text style={styles.sectionTitle}>// INGREDIENTS</Text>
                            {selectedRecipe.parsedData.ingredients?.length > 0 ? (
                                selectedRecipe.parsedData.ingredients.map((ing, i) => <Text key={i} style={styles.listItem}>• {ing}</Text>)
                            ) : <Text style={styles.emptyText}>Standard recipe format not detected. View body below.</Text>}

                            <Text style={[styles.sectionTitle, {marginTop: 20}]}>// INSTRUCTIONS</Text>
                            {selectedRecipe.parsedData.instructions?.length > 0 ? (
                                selectedRecipe.parsedData.instructions.map((inst, i) => <Text key={i} style={styles.listItem}>{i+1}. {inst}</Text>)
                            ) : <Text style={styles.bodyFallback}>{selectedRecipe.body}</Text>}
                        </ScrollView>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <View style={styles.actionHeader}>
                            <View>
                                <Text style={styles.statText}>Target: {bioTargets?.maintain?.calories || 0} kcal</Text>
                                <Text style={styles.statText}>Cookable Recipes: {cookableRecipes.length}</Text>
                            </View>
                            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateWeek}>
                                <Feather name="cpu" size={16} color="#000" style={{marginRight: 6}}/>
                                <Text style={styles.generateText}>GENERATE WEEK</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, padding: 15 }}>
                            {!schedule ? (
                                <View style={styles.emptyState}>
                                    <Feather name="calendar" size={48} color="#333" />
                                    <Text style={styles.emptyPrompt}>Tap Generate Week to allow the Arbitrage Engine to autonomously schedule your meals based on your Biological Targets.</Text>
                                </View>
                            ) : (
                                schedule.map((day, index) => {
                                    const isExpanded = expandedDay === day.id;
                                    return (
                                        <TouchableOpacity 
                                            key={day.id} 
                                            style={styles.dayCard}
                                            onPress={() => setExpandedDay(isExpanded ? null : day.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.dayHeader}>
                                                <Text style={styles.dayDate}>{new Date(day.dateObj).toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'}).toUpperCase()}</Text>
                                                <Text style={[styles.dayCals, day.delta > 100 ? {color: '#EF4444'} : {}]}>
                                                    {day.totals.calories} KCAL
                                                </Text>
                                            </View>

                                            {isExpanded && (
                                                <View style={styles.dayContent}>
                                                    <Text style={styles.slotTitle}>// BREAKFAST</Text>
                                                    {day.plan.breakfast.map((item, i) => (
                                                        <TouchableOpacity key={i} style={styles.mealPill} onPress={() => setSelectedRecipe(item)}>
                                                            <Text style={styles.mealName}>{item.title}</Text>
                                                            <Feather name="chevron-right" size={14} color="#0EA5E9" />
                                                        </TouchableOpacity>
                                                    ))}
                                                    {day.plan.breakfast.length === 0 && <Text style={styles.emptySlot}>Skipped</Text>}

                                                    <Text style={[styles.slotTitle, {marginTop: 12}]}>// DINNER</Text>
                                                    {day.plan.dinner.map((item, i) => (
                                                        <TouchableOpacity key={i} style={styles.mealPill} onPress={() => setSelectedRecipe(item)}>
                                                            <Text style={styles.mealName}>{item.title}</Text>
                                                            <Feather name="chevron-right" size={14} color="#0EA5E9" />
                                                        </TouchableOpacity>
                                                    ))}
                                                    {day.plan.dinner.length === 0 && <Text style={styles.emptySlot}>Skipped</Text>}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                            <View style={{height: 100}} />
                        </ScrollView>

                        {schedule && (
                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.commitBtn} onPress={handleCommitToLedger}>
                                    <Feather name="check-circle" size={18} color="#10B981" style={{marginRight: 8}} />
                                    <Text style={styles.commitText}>COMMIT SCHEDULE TO LEDGER</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111', backgroundColor: '#0a0a0a' },
    headerTitle: { color: '#0EA5E9', fontSize: 18, fontWeight: 'bold', fontFamily: 'Courier', letterSpacing: 1 },
    actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#111', borderBottomWidth: 1, borderColor: '#222' },
    statText: { color: '#888', fontFamily: 'Courier', fontSize: 12, marginBottom: 4 },
    generateBtn: { flexDirection: 'row', backgroundColor: '#0EA5E9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
    generateText: { color: '#000', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 14 },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyPrompt: { color: '#666', fontFamily: 'Courier', textAlign: 'center', marginTop: 20, lineHeight: 22 },
    dayCard: { backgroundColor: '#111', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    dayDate: { color: '#fff', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 14 },
    dayCals: { color: '#10B981', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 14 },
    dayContent: { padding: 16, backgroundColor: '#0a0a0a', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
    slotTitle: { color: '#888', fontSize: 12, fontFamily: 'Courier', marginBottom: 8 },
    mealPill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 12, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#334155' },
    mealName: { color: '#E2E8F0', fontFamily: 'Courier', fontSize: 14 },
    emptySlot: { color: '#555', fontFamily: 'Courier', fontSize: 12, fontStyle: 'italic', marginLeft: 10 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(5,5,5,0.95)', borderTopWidth: 1, borderColor: '#222' },
    commitBtn: { flexDirection: 'row', backgroundColor: '#064E3B', borderWidth: 1, borderColor: '#10B981', padding: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    commitText: { color: '#10B981', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 14 },
    
    // Detailed Recipe View
    recipeView: { flex: 1, backgroundColor: '#050505' },
    backBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
    recipeTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', fontFamily: 'Courier', marginBottom: 20 },
    recipeMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, backgroundColor: '#111', padding: 15, borderRadius: 8 },
    metaBox: { alignItems: 'center' },
    metaLabel: { color: '#888', fontSize: 10, fontFamily: 'Courier', marginBottom: 6 },
    metaValue: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Courier' },
    sectionTitle: { color: '#0EA5E9', fontSize: 14, fontWeight: 'bold', fontFamily: 'Courier', marginBottom: 12 },
    listItem: { color: '#E2E8F0', fontSize: 14, fontFamily: 'Courier', marginBottom: 8, lineHeight: 20 },
    emptyText: { color: '#555', fontStyle: 'italic', fontFamily: 'Courier', marginBottom: 20 },
    bodyFallback: { color: '#A3A3A3', fontFamily: 'Courier', lineHeight: 22 }
});
