import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';

export default function DiffModal({ visible, onClose, originalCard, remixCard }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          
          <View style={styles.header}>
            <Text style={styles.title}>CONTEXT COMPARISON</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.columnContainer}>
            {/* ORIGINAL COLUMN */}
            <View style={styles.column}>
              <Text style={[styles.colHeader, { color: '#888' }]}>ORIGINAL</Text>
              <Text style={styles.author}>{originalCard ? originalCard.author : "UNKNOWN"}</Text>
              <ScrollView>
                <Text style={styles.body}>
                  {originalCard ? originalCard.body_json : "Original card not found in your library."}
                </Text>
              </ScrollView>
            </View>

            {/* SEPARATOR */}
            <View style={styles.separator} />

            {/* REMIX COLUMN */}
            <View style={styles.column}>
              <Text style={[styles.colHeader, { color: '#f59e0b' }]}>REMIX</Text>
              <Text style={styles.author}>{remixCard.author}</Text>
              <ScrollView>
                 <Text style={styles.body}>{remixCard.body_json}</Text>
              </ScrollView>
            </View>
          </View>

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#333' },
  title: { color: '#fff', fontWeight: 'bold', fontFamily: 'Courier' },
  close: { color: '#f59e0b', fontWeight: 'bold' },
  columnContainer: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, padding: 10 },
  separator: { width: 1, backgroundColor: '#333' },
  colHeader: { fontSize: 10, fontWeight: 'bold', marginBottom: 5, fontFamily: 'Courier' },
  author: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  body: { color: '#ccc', fontSize: 12, fontFamily: 'Courier' }
});