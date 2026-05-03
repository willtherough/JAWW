import React, { useState, useMemo } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, StatusBar, FlatList
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { extractIngredientsFromRecipes } from '../utils/BiologyEngine';

export default function GroceryListModal({ visible, onClose, localLibrary = [] }) {
    
    // 1. Find all active NUTRITION_LOG cards (the 7-day schedule)
    const activeRecipes = useMemo(() => {
        const logs = localLibrary.filter(c => c.subject === 'NUTRITION_LOG');
        let recipesToCook = [];
        
        logs.forEach(log => {
            try {
                const parsed = JSON.parse(log.body);
                if (parsed.plan) {
                    if (parsed.plan.breakfast) recipesToCook = [...recipesToCook, ...parsed.plan.breakfast];
                    if (parsed.plan.lunch) recipesToCook = [...recipesToCook, ...parsed.plan.lunch];
                    if (parsed.plan.dinner) recipesToCook = [...recipesToCook, ...parsed.plan.dinner];
                }
            } catch(e) {}
        });
        return recipesToCook;
    }, [localLibrary, visible]);

    // 2. Extract Ingredients
    const aggregatedIngredients = useMemo(() => {
        return extractIngredientsFromRecipes(activeRecipes);
    }, [activeRecipes]);

    // 3. Local state for checkmarks
    const [checkedItems, setCheckedItems] = useState({});

    const toggleCheck = (index) => {
        setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>// GROCERY ASSEMBLY</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Feather name="x" size={24} color="#10B981" />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionHeader}>
                    <Text style={styles.statText}>Extracting from {activeRecipes.length} scheduled meals</Text>
                </View>

                {aggregatedIngredients.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="shopping-cart" size={48} color="#333" />
                        <Text style={styles.emptyPrompt}>No ingredients found. Generate a Weekly Plan first, or ensure your RECIPE cards have an "Ingredients:" section.</Text>
                    </View>
                ) : (
                    <FlatList 
                        data={aggregatedIngredients}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity 
                                style={[styles.itemRow, checkedItems[index] && styles.itemRowChecked]}
                                onPress={() => toggleCheck(index)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, checkedItems[index] && styles.checkboxChecked]}>
                                    {checkedItems[index] && <Feather name="check" size={14} color="#050505" />}
                                </View>
                                <Text style={[styles.itemText, checkedItems[index] && styles.itemTextChecked]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                )}

            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111', backgroundColor: '#0a0a0a' },
    headerTitle: { color: '#10B981', fontSize: 18, fontWeight: 'bold', fontFamily: 'Courier', letterSpacing: 1 },
    actionHeader: { padding: 15, backgroundColor: '#111', borderBottomWidth: 1, borderColor: '#222' },
    statText: { color: '#888', fontFamily: 'Courier', fontSize: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyPrompt: { color: '#666', fontFamily: 'Courier', textAlign: 'center', marginTop: 20, lineHeight: 22 },
    itemRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#111', 
        padding: 16, 
        borderRadius: 8, 
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#222'
    },
    itemRowChecked: {
        backgroundColor: '#050505',
        borderColor: '#111',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15
    },
    checkboxChecked: {
        backgroundColor: '#10B981'
    },
    itemText: {
        color: '#E2E8F0',
        fontFamily: 'Courier',
        fontSize: 14,
        flex: 1
    },
    itemTextChecked: {
        color: '#555',
        textDecorationLine: 'line-through'
    }
});
