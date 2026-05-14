import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { getInventoryItems } from '../model/database';

export default function RosettaVerificationModal({ visible, receipt, onClose, onVerifyComplete }) {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const analyzeArbitrage = async () => {
            if (visible && receipt && receipt.items) {
                setIsLoading(true);
                const inventory = await getInventoryItems();
                
                // Map the raw items to arbitrage-aware items
                const analyzedItems = receipt.items.map(item => {
                    const cleanId = item.rawText.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const existingItem = inventory.find(inv => inv.id === cleanId);
                    
                    let delta = 0;
                    let previousPrice = null;

                    if (existingItem) {
                        previousPrice = existingItem.current_price;
                        delta = item.price - previousPrice;
                    }

                    return {
                        ...item,
                        id: cleanId,
                        delta,
                        previousPrice,
                        selected: true // Default to logging all items
                    };
                });
                
                setItems(analyzedItems);
                setIsLoading(false);
            }
        };

        analyzeArbitrage();
    }, [visible, receipt]);

    const toggleItem = (index) => {
        const newItems = [...items];
        newItems[index].selected = !newItems[index].selected;
        setItems(newItems);
    };

    const handleComplete = () => {
        // Filter out unselected items
        const verifiedItems = items.filter(item => item.selected);
        onVerifyComplete(verifiedItems, receipt.store);
    };

    const totalDelta = items.reduce((acc, item) => {
        if (item.selected && item.previousPrice !== null) {
            return acc + item.delta;
        }
        return acc;
    }, 0);

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>// ARBITRAGE VERIFICATION</Text>
                    <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>ABORT</Text></TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#F59E0B" size="large" />
                        <Text style={styles.loadingText}>Cross-Referencing Inventory Ledgers...</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.scrollView}>
                        <Text style={styles.instructions}>
                            OCR Engine extracted {items.length} items from {receipt?.store || "LOCAL VENDOR"}.
                            Review pricing deltas before securing to local inventory.
                        </Text>

                        {items.map((item, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={[styles.itemCard, !item.selected && styles.itemCardDisabled]}
                                onPress={() => toggleItem(index)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.rowTop}>
                                    <View style={[styles.checkbox, item.selected && styles.checkboxActive]}>
                                        {item.selected && <View style={styles.checkboxInner} />}
                                    </View>
                                    <Text style={[styles.rawText, !item.selected && styles.textDisabled]}>{item.rawText}</Text>
                                    <Text style={[styles.priceText, !item.selected && styles.textDisabled]}>${item.price.toFixed(2)}</Text>
                                </View>

                                {item.previousPrice !== null && item.selected && (
                                    <View style={styles.arbitrageRow}>
                                        {item.delta > 0 ? (
                                            <Text style={styles.deltaRed}>[ +${item.delta.toFixed(2)} INFLATION DETECTED ]</Text>
                                        ) : item.delta < 0 ? (
                                            <Text style={styles.deltaGreen}>[ -${Math.abs(item.delta).toFixed(2)} DEFLATION DETECTED ]</Text>
                                        ) : (
                                            <Text style={styles.deltaNeutral}>[ PRICE STABLE ]</Text>
                                        )}
                                        <Text style={styles.prevPriceText}>(Prev: ${item.previousPrice.toFixed(2)})</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {!isLoading && items.length > 0 && (
                    <View style={styles.summaryContainer}>
                        <Text style={styles.summaryTitle}>RECEIPT INFLATION DELTA:</Text>
                        {totalDelta > 0 ? (
                            <Text style={[styles.summaryDelta, { color: '#EF4444' }]}>+${totalDelta.toFixed(2)} (INFLATION)</Text>
                        ) : totalDelta < 0 ? (
                            <Text style={[styles.summaryDelta, { color: '#10B981' }]}>-${Math.abs(totalDelta).toFixed(2)} (DEFLATION)</Text>
                        ) : (
                            <Text style={[styles.summaryDelta, { color: '#64748B' }]}>$0.00 (STABLE)</Text>
                        )}
                    </View>
                )}

                <TouchableOpacity style={styles.completeButton} onPress={handleComplete} disabled={isLoading}>
                    <Text style={styles.completeButtonText}>[ LOG TO FRIDGE ]</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050814' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', backgroundColor: '#0B1120' },
    title: { color: '#F59E0B', fontFamily: 'Courier', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
    closeText: { color: '#64748B', fontFamily: 'Courier', fontSize: 14, fontWeight: 'bold' },
    scrollView: { flex: 1, padding: 15 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#64748B', fontFamily: 'Courier', marginTop: 20 },
    instructions: { color: '#94A3B8', fontFamily: 'Courier', fontSize: 13, marginBottom: 20, lineHeight: 20 },
    itemCard: { backgroundColor: '#0B1120', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
    itemCardDisabled: { opacity: 0.5, borderColor: '#050814' },
    rowTop: { flexDirection: 'row', alignItems: 'center' },
    checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#64748B', borderRadius: 4, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { borderColor: '#F59E0B' },
    checkboxInner: { width: 12, height: 12, backgroundColor: '#F59E0B', borderRadius: 2 },
    rawText: { flex: 1, color: '#E2E8F0', fontFamily: 'Courier', fontSize: 15, fontWeight: 'bold' },
    priceText: { color: '#F8FAFC', fontFamily: 'Courier', fontSize: 16, fontWeight: 'bold' },
    textDisabled: { color: '#64748B' },
    arbitrageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginLeft: 35 },
    deltaRed: { color: '#EF4444', fontFamily: 'Courier', fontSize: 11, fontWeight: 'bold' },
    deltaGreen: { color: '#10B981', fontFamily: 'Courier', fontSize: 11, fontWeight: 'bold' },
    deltaNeutral: { color: '#64748B', fontFamily: 'Courier', fontSize: 11 },
    prevPriceText: { color: '#64748B', fontFamily: 'Courier', fontSize: 11 },
    summaryContainer: { padding: 20, backgroundColor: '#0B1120', borderTopWidth: 1, borderTopColor: '#1E293B', alignItems: 'center' },
    summaryTitle: { color: '#94A3B8', fontFamily: 'Courier', fontSize: 12, marginBottom: 5 },
    summaryDelta: { fontFamily: 'Courier', fontSize: 18, fontWeight: 'bold' },
    completeButton: { backgroundColor: '#F59E0B', margin: 20, padding: 18, borderRadius: 5, alignItems: 'center' },
    completeButtonText: { color: '#000', fontFamily: 'Courier', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});

