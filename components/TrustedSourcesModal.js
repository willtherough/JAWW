import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, ScrollView, Platform, StatusBar, SafeAreaView } from 'react-native';

export default function TrustedSourcesModal({ visible, onClose, sources, onAddSource }) {
  const [selectedSource, setSelectedSource] = useState(null); // The Drill-Down State

  // --- RENDER: THE LIST ROW (Summary) ---
  const renderSourceItem = ({ item }) => {
    const handle = item.handle || item.payload?.handle || 'Unknown Operator';
    const role = item.role || item.bio?.role || 'Observer';
    const hasClaims = (item.role || item.bio?.role);

    return (
      <TouchableOpacity onPress={() => setSelectedSource(item)} activeOpacity={0.7}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.handleText}>{handle.toUpperCase()}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>TRUSTED</Text>
            </View>
          </View>
          
          {hasClaims ? (
            <Text style={styles.roleText}>KNOWN FOR: {role.toUpperCase()}</Text>
          ) : (
            <Text style={styles.disclaimerText}>"This person hasn't claimed to be a source for anything."</Text>
          )}
          
          <Text style={styles.tapHint}>TAP TO VIEW HISTORY >></Text>
        </View>
      </TouchableOpacity>
    );
  };

  // --- RENDER: THE DETAIL VIEW (Dossier + History) ---
  const renderDetailView = () => {
    const s = selectedSource;
    if (!s) return null;

    const handle = s.handle || s.payload?.handle || 'Unknown';
    const role = s.role || s.bio?.role || 'None';
    const history = s.history || [];

    return (
      <View style={{flex: 1}}>
        {/* DETAIL HEADER */}
        <View style={styles.detailHeader}>
           <TouchableOpacity onPress={() => setSelectedSource(null)}>
             <Text style={styles.backLink}>{"<< BACK TO LIST"}</Text>
           </TouchableOpacity>
           <Text style={styles.detailTitle}>OPERATOR FILE</Text>
        </View>

        <ScrollView contentContainerStyle={{padding: 20}}>
          {/* 1. CURRENT BIO */}
          <View style={styles.bioCard}>
             <Text style={styles.bioHandle}>{handle.toUpperCase()}</Text>
             <Text style={styles.bioRole}>{role.toUpperCase()}</Text>
             <View style={styles.statRow}>
               <Text style={styles.stat}>AGE: {s.bio?.age || '--'}</Text>
               <Text style={styles.stat}>HGT: {s.bio?.height || '--'}</Text>
               <Text style={styles.stat}>EXP: {s.bio?.expertise || 'None Listed'}</Text>
             </View>
             <Text style={styles.keyText}>ID: {s.uid ? s.uid.substring(0, 15) : '???'}...</Text>
          </View>

          {/* 2. THE CHAIN OF CUSTODY (History) */}
          <Text style={styles.sectionTitle}>// CHAIN OF CUSTODY</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>No recorded history.</Text>
          ) : (
            history.map((entry, index) => (
              <View key={index} style={styles.historyRow}>
                <View style={styles.timelineLine} />
                <View style={styles.historyDot} />
                <View style={{flex: 1}}>
                  <Text style={styles.historyAction}>{entry.action}</Text>
                  <Text style={styles.historyTime}>{new Date(entry.timestamp).toLocaleString()}</Text>
                  {entry.changes && (
                    <Text style={styles.historyNote}>
                      Changed role from "{entry.changes.prev_role || 'None'}"
                    </Text>
                  )}
                  {entry.note && <Text style={styles.historyNote}>{entry.note}</Text>}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
          
          {selectedSource ? (
            renderDetailView()
          ) : (
            <>
              {/* MAIN LIST HEADER */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>TRUSTED SOURCES</Text>
                <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
                  <Text style={styles.closeLink}>CLOSE</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={sources}
                keyExtractor={item => item.uid}
                renderItem={renderSourceItem}
                contentContainerStyle={{ padding: 20 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No trusted sources in ledger.</Text>
                }
              />
            </>
          )}

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
    paddingTop: 60, // KEEPS YOUR NOTCH FIX
  },
  
  // HEADER STYLES
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Courier', fontWeight: 'bold' },
  closeLink: { color: '#f59e0b', fontSize: 14, fontFamily: 'Courier', padding: 10 },

  // LIST ITEM STYLES
  card: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  handleText: { color: '#fff', fontWeight: 'bold', fontSize: 16, fontFamily: 'Courier' },
  badge: { backgroundColor: '#064e3b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#34d399', fontSize: 10, fontWeight: 'bold' },
  roleText: { color: '#f59e0b', fontSize: 14, fontFamily: 'Courier', marginBottom: 5 },
  disclaimerText: { color: '#666', fontSize: 12, fontFamily: 'Courier', fontStyle: 'italic', marginBottom: 5 },
  tapHint: { color: '#444', fontSize: 10, fontWeight: 'bold', textAlign: 'right', marginTop: 5 },
  emptyText: { color: '#666', fontFamily: 'Courier', textAlign: 'center', marginTop: 50 },

  // DETAIL VIEW STYLES
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  backLink: { color: '#f59e0b', fontWeight: 'bold', marginRight: 20 },
  detailTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  
  bioCard: { backgroundColor: '#111', padding: 20, borderRadius: 10, marginBottom: 30, borderLeftWidth: 4, borderColor: '#f59e0b' },
  bioHandle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  bioRole: { color: '#f59e0b', fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  statRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  stat: { color: '#ccc', fontSize: 12, fontFamily: 'Courier' },
  keyText: { color: '#444', fontSize: 10, fontFamily: 'Courier' },

  sectionTitle: { color: '#00ff00', fontSize: 12, fontWeight: 'bold', marginBottom: 15 },
  historyRow: { flexDirection: 'row', marginBottom: 20, paddingLeft: 10 },
  timelineLine: { position: 'absolute', left: 13, top: 0, bottom: -20, width: 1, backgroundColor: '#333' },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00ff00', marginTop: 5, marginRight: 15 },
  historyAction: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  historyTime: { color: '#666', fontSize: 10, marginBottom: 2 },
  historyNote: { color: '#aaa', fontSize: 12, fontStyle: 'italic' },
  emptyHistory: { color: '#444', fontStyle: 'italic' }
});