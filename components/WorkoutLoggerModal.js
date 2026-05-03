import React, { useState, useMemo } from 'react';
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

export default function WorkoutLoggerModal({ visible, onClose, localLibrary = [], onSaveWorkoutLog, onCreateNewWorkout }) {
    const [searchQuery, setSearchQuery] = useState('');

    const workoutCards = useMemo(() => {
        const safeQuery = searchQuery.trim().toLowerCase();
        return localLibrary.filter(c => {
            const subj = (c.subject || '').toLowerCase();
            const isWorkoutCard = subj === 'workout' || subj === 'workouts';
            if (!isWorkoutCard) return false;
            
            if (!safeQuery) return true;
            return (c.title && c.title.toLowerCase().includes(safeQuery)) || 
                   (c.body && c.body.toLowerCase().includes(safeQuery));
        });
    }, [localLibrary, searchQuery]);

    const handleSelectWorkout = (item) => {
        Alert.alert(
            "Log Workout",
            `Do you want to log "${item.title}" for today?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Log Today", 
                    onPress: () => {
                        onSaveWorkoutLog(item);
                        onClose();
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>// DAILY WORKOUT LOGGER</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Feather name="x" size={24} color="#F59E0B" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 20 }}>
                    <Text style={styles.instruction}>Select a workout card you have authored to log it for today's active burn tracking.</Text>
                    
                    <View style={[styles.searchContainer, { borderBottomWidth: 0, paddingHorizontal: 0, paddingVertical: 10 }]}>
                        <SearchBar 
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onClear={() => setSearchQuery('')}
                            placeholder="Search your workouts..."
                        />
                    </View>

                    <FlatList
                        data={workoutCards}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={[styles.resultItem, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                                <View style={styles.resultHeader}>
                                    <Text style={styles.resultTitle}>{item.title}</Text>
                                    <Text style={[styles.resultCategory, { color: '#F59E0B' }]}>
                                        {item.subject?.toUpperCase() || 'WORKOUT'}
                                    </Text>
                                </View>
                                <TouchableOpacity 
                                    style={{ backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginLeft: 10 }}
                                    onPress={() => handleSelectWorkout(item)}
                                >
                                    <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 12, fontFamily: 'Courier New' }}>LOG TODAY</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={{ marginTop: 40, alignItems: 'center' }}>
                                <Feather name="activity" size={48} color="#334155" style={{ marginBottom: 15 }} />
                                <Text style={styles.emptyText}>No workout cards found.</Text>
                                <Text style={[styles.emptyText, { fontSize: 12, color: '#64748B', marginTop: 10, marginBottom: 20 }]}>
                                    Create a card with the subject "Workouts" to see it here.
                                </Text>
                                <TouchableOpacity 
                                    style={{ backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                    onPress={() => {
                                        onClose();
                                        if (onCreateNewWorkout) onCreateNewWorkout();
                                    }}
                                >
                                    <Feather name="plus-circle" size={18} color="#0F172A" />
                                    <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 14, fontFamily: 'Courier New' }}>CREATE WORKOUT CARD</Text>
                                </TouchableOpacity>
                            </View>
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
    instruction: {
        color: '#888',
        fontSize: 14,
        fontFamily: 'Courier New',
        marginBottom: 15
    },
    searchContainer: {
        marginBottom: 10
    },
    resultItem: {
        padding: 15,
        backgroundColor: '#0a0a0a',
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
        marginBottom: 10,
        borderRadius: 4
    },
    resultHeader: {
        flex: 1,
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
        color: '#94A3B8',
        fontSize: 14,
        fontFamily: 'Courier New',
        textAlign: 'center'
    }
});
