import React, { useMemo, useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function MealHistoryModal({ visible, onClose, localLibrary = [], bioTargets = null }) {
    const [expandedId, setExpandedId] = useState(null);

    const historyCards = useMemo(() => {
        const logs = localLibrary.filter(c => c.subject === 'NUTRITION_LOG' && c.title && c.title.startsWith('Meals Eaten'));
        
        // Sort descending by genesis timestamp so newest is first
        logs.sort((a, b) => {
            const timeA = a.genesis?.timestamp ? new Date(a.genesis.timestamp).getTime() : 0;
            const timeB = b.genesis?.timestamp ? new Date(b.genesis.timestamp).getTime() : 0;
            return timeB - timeA;
        });

        return logs.map(card => {
            let parsed = { plan: { breakfast: [], lunch: [], dinner: [], additional: [] }, totals: {} };
            try {
                parsed = JSON.parse(card.body);
            } catch(e) {}
            
            return {
                ...card,
                parsedBody: parsed
            };
        });
    }, [localLibrary]);

    const renderPlanItems = (slotName, items) => {
        if (!items || items.length === 0) return null;
        return (
            <View style={{ marginBottom: 8 }}>
                <Text style={styles.slotName}>{slotName.toUpperCase()}</Text>
                {items.map((item, idx) => (
                    <Text key={idx} style={styles.itemName}>• {item.title}</Text>
                ))}
            </View>
        );
    };

    // Calculate Recommendations based on what's missing
    const getRecommendations = (totals) => {
        if (!bioTargets || !bioTargets.maintain) return [];
        
        const reqs = bioTargets.maintain;
        const missingCalories = reqs.calories - (totals.calories || 0);
        const missingProtein = reqs.protein_g - (totals.protein_g || 0);
        
        if (missingCalories <= 0) return []; // Met all goals

        // Filter valid nutritional items from the library
        const foodItems = localLibrary.filter(c => 
            c.topic === 'nutrition' || 
            c.topic === 'food' ||
            c.subject === 'RECIPE' || 
            (c.subject && c.subject.startsWith('FOOD:')) ||
            (c.body && (c.body.toLowerCase().includes('ingredients:') || c.body.toLowerCase().includes('prep time')))
        );
        
        // Score items based on how well they fit the deficit
        const scored = foodItems.map(item => {
            let itemMacros = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
            try {
                const parsed = JSON.parse(item.body);
                if (parsed.macros) itemMacros = parsed.macros;
                else if (parsed.totals) itemMacros = parsed.totals;
            } catch(e) {}

            let score = 0;
            // Penalize if it exceeds the remaining calories by more than 25 (user requested 15-25 allowance)
            if (itemMacros.calories > missingCalories + 25) score -= 100;
            else if (itemMacros.calories > 0) score += 10; 

            // Heavily reward protein if we are deficient in protein
            if (missingProtein > 5 && itemMacros.protein_g > 5) {
                score += itemMacros.protein_g * 2; 
            }

            return { item, itemMacros, score };
        }).filter(x => x.score > 0); // Only keep items with a positive score

        // Sort by score descending and take top 5
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 5);
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>// MEAL HISTORY LOGS</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Feather name="x" size={24} color="#F59E0B" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 20 }}>
                    <FlatList
                        data={historyCards}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const isExpanded = expandedId === item.id;
                            const totals = item.parsedBody.totals || {};
                            const plan = item.parsedBody.plan || {};

                            return (
                                <TouchableOpacity 
                                    style={[styles.historyCard, isExpanded && { borderColor: '#F59E0B' }]} 
                                    onPress={() => setExpandedId(isExpanded ? null : item.id)}
                                >
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{item.title}</Text>
                                        <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#F59E0B" />
                                    </View>
                                    
                                    <View style={styles.totalsRow}>
                                        <View style={styles.totalItem}>
                                            <Text style={styles.totalLabel}>CALORIES</Text>
                                            <Text style={[styles.totalValue, { color: '#00ffff' }]}>{totals.calories || 0}</Text>
                                        </View>
                                        <View style={styles.totalItem}>
                                            <Text style={styles.totalLabel}>PROTEIN</Text>
                                            <Text style={styles.totalValue}>{totals.protein_g || 0}g</Text>
                                        </View>
                                        <View style={styles.totalItem}>
                                            <Text style={styles.totalLabel}>CARBS</Text>
                                            <Text style={styles.totalValue}>{totals.carbs_g || 0}g</Text>
                                        </View>
                                        <View style={styles.totalItem}>
                                            <Text style={styles.totalLabel}>FATS</Text>
                                            <Text style={styles.totalValue}>{totals.fat_g || 0}g</Text>
                                        </View>
                                    </View>

                                    {isExpanded && (
                                        <View style={styles.detailsContainer}>
                                            <Text style={[styles.slotName, { color: '#888', marginBottom: 10 }]}>// RECORDED ITEMS</Text>
                                            {renderPlanItems('Breakfast', plan.breakfast)}
                                            {renderPlanItems('Lunch', plan.lunch)}
                                            {renderPlanItems('Dinner', plan.dinner)}
                                            {renderPlanItems('Additional', plan.additional)}
                                            
                                            {(!plan.breakfast?.length && !plan.lunch?.length && !plan.dinner?.length && !plan.additional?.length) && (
                                                <Text style={styles.itemName}>No items recorded for this day.</Text>
                                            )}

                                            {/* ARBITRAGE ENGINE RECOMMENDATIONS - ONLY FOR TODAY */}
                                            {bioTargets && item.title === `Meals Eaten ${new Date().toLocaleDateString()}` && (
                                                <View style={styles.arbitrageContainer}>
                                                    <Text style={[styles.slotName, { color: '#10B981', marginBottom: 8 }]}>// ARBITRAGE: SUGGESTED INTAKE</Text>
                                                    
                                                    {(() => {
                                                        const reqs = bioTargets.maintain;
                                                        const missingCalories = reqs.calories - (totals.calories || 0);
                                                        const missingProtein = reqs.protein_g - (totals.protein_g || 0);

                                                        if (missingCalories <= 0) {
                                                            return <Text style={styles.itemName}>Caloric goals met. No further intake required.</Text>;
                                                        }

                                                        const recs = getRecommendations(totals);

                                                        return (
                                                            <>
                                                                <Text style={[styles.itemName, { color: '#F59E0B', marginBottom: 8 }]}>
                                                                    Deficit: {missingCalories} kcal • {missingProtein > 0 ? `${missingProtein}g Protein` : 'Protein Met'}
                                                                </Text>
                                                                
                                                                {recs.length > 0 ? recs.map((rec, idx) => (
                                                                    <View key={idx} style={styles.recItem}>
                                                                        <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Courier', flex: 1 }}>{rec.item.title}</Text>
                                                                        <Text style={{ color: '#888', fontSize: 10, fontFamily: 'Courier' }}>{rec.itemMacros.calories} kcal • {rec.itemMacros.protein_g}g P</Text>
                                                                    </View>
                                                                )) : (
                                                                    <Text style={styles.itemName}>No matching foods found in your Vault to bridge this gap.</Text>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No historical meal logs found in your local ledger.</Text>
                        }
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
        backgroundColor: '#0a0a0a'
    },
    headerTitle: {
        color: '#F59E0B',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
        letterSpacing: 1
    },
    historyCard: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    cardTitle: {
        color: '#F59E0B',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Courier New'
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        padding: 10,
        borderRadius: 4
    },
    totalItem: {
        alignItems: 'center'
    },
    totalLabel: {
        color: '#888',
        fontSize: 10,
        fontFamily: 'Courier New',
        marginBottom: 4
    },
    totalValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Courier New'
    },
    detailsContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#333'
    },
    slotName: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
        marginBottom: 4
    },
    itemName: {
        color: '#ccc',
        fontSize: 12,
        fontFamily: 'Courier',
        marginBottom: 2,
        marginLeft: 10
    },
    emptyText: {
        color: '#555',
        fontSize: 14,
        fontFamily: 'Courier',
        textAlign: 'center',
        marginTop: 20
    },
    arbitrageContainer: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#333'
    },
    recItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 8,
        borderRadius: 4,
        marginBottom: 6,
        marginLeft: 10
    }
});
