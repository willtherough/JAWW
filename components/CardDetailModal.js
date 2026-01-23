import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import CardRenderer from './CardRenderer';

export default function CardDetailModal({ visible, onClose, card, isAuthor, onBroadcast, onEdit, onDelete }) {
  if (!card) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>ARCHIVE RECORD</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE CONTENT */}
          <ScrollView style={styles.content}>
            {/* Renders the nice looking card */}
            <CardRenderer card={card} />
            
            <View style={styles.metaBox}>
               <Text style={styles.metaText}>ID: {card.id}</Text>
               <Text style={styles.metaText}>SIG: {card.signature ? card.signature.substring(0, 20) + '...' : 'UNSIGNED'}</Text>
               <Text style={styles.metaText}>HOPS: {card.hops || 1}</Text>
            </View>
          </ScrollView>

          {/* ACTION BAR */}
          <View style={styles.actionBar}>
            {/* 1. BROADCAST (Green Button) */}
            <TouchableOpacity onPress={() => onBroadcast(card)} style={styles.btnBroadcast}>
              <Text style={{fontSize: 20, marginRight: 5}}>📡</Text>
              <Text style={styles.btnTextBlack}>BROADCAST</Text>
            </TouchableOpacity>

            {/* 2. EDIT/DELETE (Only if you are the author) */}
            {isAuthor && (
              <View style={styles.authorActions}>
                <TouchableOpacity onPress={() => onEdit(card)} style={styles.btnEdit}>
                  <Text style={styles.btnTextWhite}>EDIT</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => onDelete(card.id)} style={styles.btnDelete}>
                  <Text style={styles.btnTextWhite}>DELETE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  container: { height: '85%', backgroundColor: '#1e1e1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor: '#333' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15 },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  closeText: { color: '#888', fontWeight: 'bold' },

  content: { flex: 1 },
  metaBox: { marginTop: 30, padding: 10, backgroundColor: '#111', borderRadius: 5 },
  metaText: { color: '#444', fontSize: 10, fontFamily: 'Courier', marginBottom: 2 },

  actionBar: { marginTop: 20, gap: 10 },
  btnBroadcast: { backgroundColor: '#00ff00', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 10 },
  authorActions: { flexDirection: 'row', gap: 10 },
  btnEdit: { flex: 1, backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#666' },
  btnDelete: { flex: 1, backgroundColor: '#330000', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ff0000' },

  btnTextBlack: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' }
});