import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

export default function RosettaVerificationModal({ visible, receipt, onClose, onVerifyComplete }) {
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (visible && receipt && receipt.items) {
            // Initialize the items state with empty mapping fields
            const initialItems = receipt.items.map(item => ({
                rawText: item.rawText,
                price: item.price,
                trueIngredient: '',
                weight: '',
                unit: 'lbs'
            }));
            setItems(initialItems);
        }
    }, [visible, receipt]);

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleComplete = () => {
        // Filter out items that weren't mapped
        const verifiedItems = items.filter(item => item.trueIngredient && item.weight);
        onVerifyComplete(verifiedItems);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>ROSETTA RECEIPT VERIFICATION</Text>
                    <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>ABORT</Text></TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView}>
                    <Text style={styles.instructions}>
                        The OCR engine extracted the following raw items from: {receipt?.store || "UNKNOWN STORE"}.
                        Map the raw text to a True Ingredient and provide the total weight to compile your Fridge Ledger.
                    </Text>

                    {items.map((item, index) => (
                        <View key={index} style={styles.itemCard}>
                            <View style={styles.rawRow}>
                                <Text style={styles.rawTextLabel}>Raw OCR:</Text>
                                <Text style={styles.rawText}>"{item.rawText}"</Text>
                                <Text style={styles.priceText}>${item.price}</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>True Ingredient Name:</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Beef Brisket"
                                    placeholderTextColor="#555"
                                    value={item.trueIngredient}
                                    onChangeText={(val) => updateItem(index, 'trueIngredient', val)}
                                />
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Weight / Volume:</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 11"
                                        placeholderTextColor="#555"
                                        keyboardType="numeric"
                                        value={item.weight}
                                        onChangeText={(val) => updateItem(index, 'weight', val)}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { width: 80, marginLeft: 10 }]}>
                                    <Text style={styles.label}>Unit:</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={item.unit}
                                        onChangeText={(val) => updateItem(index, 'unit', val)}
                                    />
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                    <Text style={styles.completeButtonText}>SECURE INVENTORY AND BROADCAST</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#222', alignItems: 'center' },
    title: { color: '#00FF00', fontWeight: 'bold', fontSize: 16, fontFamily: 'Courier New' },
    closeText: { color: '#888', fontWeight: 'bold' },
    scrollView: { padding: 20 },
    instructions: { color: '#888', fontSize: 14, marginBottom: 20, lineHeight: 20 },
    itemCard: { backgroundColor: '#111', padding: 15, borderRadius: 8, marginBottom: 15, borderLeftWidth: 3, borderColor: '#38bdf8' },
    rawRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderColor: '#333' },
    rawTextLabel: { color: '#888', marginRight: 10, fontSize: 12 },
    rawText: { color: '#FFF', flex: 1, fontWeight: 'bold', fontFamily: 'Courier New' },
    priceText: { color: '#10b981', fontWeight: 'bold' },
    inputGroup: { marginBottom: 15 },
    inputRow: { flexDirection: 'row' },
    label: { color: '#888', fontSize: 10, marginBottom: 5, textTransform: 'uppercase' },
    input: { backgroundColor: '#1E293B', color: '#FFF', padding: 12, borderRadius: 6, fontSize: 16 },
    completeButton: { backgroundColor: '#10b981', padding: 20, alignItems: 'center', justifyContent: 'center' },
    completeButtonText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 }
});
