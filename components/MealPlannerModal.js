import React, { useState, useMemo, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Platform,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import SearchBar from './SearchBar';
import { aggregateListMacros } from '../utils/NutritionMath';

export default function MealPlannerModal({ visible, onClose, fridgeItems = [], masterLibrary = [], localLibrary = [], onSavePlan, initialPlanJson = null }) {
    const [activeSlot, setActiveSlot] = useState(null); // 'Breakfast', 'Lunch', 'Dinner', 'Additional'
    const [searchQuery, setSearchQuery] = useState('');
    const [plan, setPlan] = useState({
        breakfast: [],
        lunch: [],
        dinner: [],
        additional: []
    });

    useEffect(() => {
        if (visible) {
            if (initialPlanJson) {
                try {
                    const parsed = JSON.parse(initialPlanJson);
                    if (parsed.plan) {
                        setPlan(parsed.plan);
                    } else {
                        setPlan({ breakfast: [], lunch: [], dinner: [], additional: [] });
                    }
                } catch(e) {
                    setPlan({ breakfast: [], lunch: [], dinner: [], additional: [] });
                }
            } else {
                setPlan({ breakfast: [], lunch: [], dinner: [], additional: [] });
            }
            setActiveSlot(null);
            setSearchQuery('');
        }
    }, [visible, initialPlanJson]);

    const combinedLibrary = useMemo(() => {
        // Merge Fridge, Nutrition Master Library, and user's Local Library (custom recipes)
        const nutritionCards = masterLibrary.filter(c => c.topic === 'nutrition');
        const customRecipes = localLibrary.filter(c => c.topic === 'nutrition' || c.subject === 'RECIPE');
        const fridgeCards = fridgeItems;
        
        // Remove duplicates by ID just in case
        const seen = new Set();
        const merged = [...fridgeCards, ...nutritionCards, ...customRecipes].filter(c => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
        });

        if (searchQuery.trim() === '') return merged;
        
        const term = searchQuery.toLowerCase();
        return merged.filter(c => 
            (c.title && c.title.toLowerCase().includes(term)) || 
            (c.body && c.body.toLowerCase().includes(term))
        );
    }, [fridgeItems, masterLibrary, localLibrary, searchQuery]);

    const handleAddItem = (item) => {
        if (!activeSlot) return;
        setPlan(prev => ({
            ...prev,
            [activeSlot.toLowerCase()]: [...prev[activeSlot.toLowerCase()], item]
        }));
        Alert.alert("Added", `${item.title} added to ${activeSlot}`);
    };

    const handleRemoveItem = (slot, index) => {
        setPlan(prev => {
            const updatedSlot = [...prev[slot.toLowerCase()]];
            updatedSlot.splice(index, 1);
            return {
                ...prev,
                [slot.toLowerCase()]: updatedSlot
            };
        });
    };

    const handleSave = () => {
        // Build flat list for total macro aggregation
        const flatList = [...plan.breakfast, ...plan.lunch, ...plan.dinner, ...plan.additional];
        const totals = aggregateListMacros(flatList);
        
        onSavePlan(plan, totals);
        onClose();
    };

    const renderSlotItem = (item, index, slotName) => (
        <View style={styles.planItem} key={`${item.id}-${index}`}>
            <Text style={styles.planItemText}>{item.title}</Text>
            <TouchableOpacity onPress={() => handleRemoveItem(slotName, index)}>
                <Feather name="x-circle" size={16} color="#EF4444" />
            </TouchableOpacity>
        </View>
    );

    const renderSlotCard = (slotName, items) => {
        const isSelected = activeSlot === slotName;
        return (
            <TouchableOpacity 
                style={[styles.slotCard, isSelected && styles.slotCardActive]}
                onPress={() => setActiveSlot(isSelected ? null : slotName)}
            >
                <View style={styles.slotHeader}>
                    <Text style={[styles.slotTitle, isSelected && { color: '#000' }]}>{slotName.toUpperCase()}</Text>
                    <Text style={[styles.slotCount, isSelected && { color: '#000' }]}>{items.length} ITEMS</Text>
                </View>
                {items.length > 0 && (
                    <View style={styles.slotItemList}>
                        {items.map((item, idx) => renderSlotItem(item, idx, slotName))}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>// DAILY MEAL PLANNER</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Feather name="x" size={24} color="#00ffff" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 20 }}>
                    {!activeSlot ? (
                        <>
                            <Text style={styles.instruction}>Select a meal slot to add items from your fridge or recipe library.</Text>
                            <View style={{ flex: 1, marginTop: 10 }}>
                                {renderSlotCard('Breakfast', plan.breakfast)}
                                {renderSlotCard('Lunch', plan.lunch)}
                                {renderSlotCard('Dinner', plan.dinner)}
                                {renderSlotCard('Additional', plan.additional)}
                            </View>
                        </>
                    ) : (
                        <View style={{ flex: 1 }}>
                            <TouchableOpacity style={styles.backButton} onPress={() => setActiveSlot(null)}>
                                <Feather name="arrow-left" size={16} color="#38BDF8" />
                                <Text style={styles.backButtonText}>BACK TO PLANNER</Text>
                            </TouchableOpacity>

                            <Text style={styles.sectionTitle}>// ADD TO {activeSlot.toUpperCase()}</Text>
                            
                            <View style={[styles.searchContainer, { borderBottomWidth: 0, paddingHorizontal: 0, paddingVertical: 10 }]}>
                                <SearchBar 
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    onClear={() => setSearchQuery('')}
                                    placeholder="Search Fridge & Recipes..."
                                />
                            </View>

                            <FlatList
                                data={combinedLibrary}
                                keyExtractor={(item, idx) => item.id + idx}
                                renderItem={({ item }) => (
                                    <View style={[styles.resultItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                                        <View style={styles.resultHeader}>
                                            <Text style={styles.resultTitle}>{item.title}</Text>
                                            <Text style={[styles.resultCategory, { color: item.subject?.startsWith('PURCHASE:') ? '#10B981' : '#F59E0B' }]}>
                                                {item.subject?.startsWith('PURCHASE:') ? 'FRIDGE ITEM' : 'RECIPE'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity 
                                            style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginLeft: 10 }}
                                            onPress={() => handleAddItem(item)}
                                        >
                                            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12, fontFamily: 'Courier New' }}>+ ADD</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>No items found.</Text>
                                }
                            />
                        </View>
                    )}
                </View>

                {!activeSlot && (
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handleSave} style={styles.footBtnMain}>
                            <Text style={styles.footTextMain}>SAVE MEAL PLAN</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
        color: '#00ffff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
        letterSpacing: 1
    },
    instruction: {
        color: '#888',
        fontSize: 14,
        fontFamily: 'Courier New',
        marginBottom: 15
    },
    slotCard: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15
    },
    slotCardActive: {
        backgroundColor: '#00ffff',
        borderColor: '#00ffff'
    },
    slotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    slotTitle: {
        color: '#00ffff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Courier New'
    },
    slotCount: {
        color: '#888',
        fontSize: 12,
        fontFamily: 'Courier New'
    },
    slotItemList: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#222',
        paddingTop: 10
    },
    planItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    planItemText: {
        color: '#aaa',
        fontSize: 14,
        fontFamily: 'Courier New',
        flex: 1
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 5
    },
    backButtonText: {
        color: '#38BDF8',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Courier New'
    },
    sectionTitle: {
        color: '#38BDF8',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
        marginBottom: 10,
        letterSpacing: 1
    },
    resultItem: {
        padding: 15,
        backgroundColor: '#0a0a0a',
        borderLeftWidth: 3,
        borderLeftColor: '#38BDF8',
        marginBottom: 10,
        borderRadius: 4
    },
    resultTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Courier New'
    },
    resultCategory: {
        color: '#888',
        fontSize: 12,
        fontFamily: 'Courier New',
        marginTop: 4
    },
    emptyText: {
        color: '#555',
        fontSize: 14,
        fontFamily: 'Courier New',
        textAlign: 'center',
        marginTop: 20
    },
    footer: {
        padding: 20,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#111'
    },
    footBtnMain: {
        backgroundColor: '#00ffff',
        padding: 15,
        alignItems: 'center',
        borderRadius: 8
    },
    footTextMain: {
        color: '#000',
        fontWeight: 'bold',
        fontFamily: 'Courier New',
        fontSize: 16
    }
});
