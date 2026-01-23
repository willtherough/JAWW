import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { TOPICS } from '../model/Definitions';
// Add 'getOrGenerateKeys' to the import
import { signData, getOrGenerateKeys } from '../model/Security';

export default function CreateCardModal({ visible, onClose, onSave, initialData }) {
  // STATE
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState('other');
  const [isSigning, setIsSigning] = useState(false); // <--- New State for loading

  // POPULATE DATA ON OPEN (For Editing)
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTitle(initialData.title || '');
        try {
            const parsed = typeof initialData.body_json === 'string' ? JSON.parse(initialData.body_json) : initialData.body_json;
            setBody(parsed.content || initialData.body_json);
        } catch (e) {
            setBody(initialData.body_json || '');
        }
        setTopic(initialData.topic || 'other'); 

      } else {
        setTitle('');
        setBody('');
        setTopic('other');
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!title || !body) return;
    
    setIsSigning(true);

    // 1. Get Identity (The Fix)
    const keys = await getOrGenerateKeys();
    if (!keys) {
      Alert.alert("Error", "Could not retrieve Identity Keys.");
      setIsSigning(false);
      return;
    }

    const rawData = {
      title,
      topic,
      body_json: JSON.stringify({ content: body }), 
      type: 'narrative_markdown',
      timestamp: new Date().toISOString()
    };

    // 2. Sign
    const signature = await signData(rawData);

    // 3. Package
    const finalCard = {
      ...rawData,
      history: [{ 
        timestamp: new Date().toISOString(),
        signature: signature,
        signer: keys.publicKey // <--- NOW IT IS REAL
      }]
    };

    await onSave(finalCard);
    setIsSigning(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/* FIX: Set behavior to 'padding' for iOS only. Android handles this natively. */}
<KeyboardAvoidingView 
  behavior={Platform.OS === "ios" ? "padding" : undefined} 
  style={styles.overlay}
>
        <View style={styles.container}>
          
          <Text style={styles.header}>{initialData ? 'EDIT RECORD' : 'NEW DATA ENTRY'}</Text>
          
          {/* TITLE INPUT */}
          <Text style={styles.label}>TITLE / HEADLINE</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Smoked Brisket Technique" 
            placeholderTextColor="#555"
            value={title}
            onChangeText={setTitle}
            editable={!isSigning}
          />

          {/* TOPIC SELECTOR */}
          <Text style={styles.label}>CLASSIFICATION SECTOR</Text>
          <View style={styles.topicRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TOPICS.map((t) => (
                <TouchableOpacity 
                  key={t.id} 
                  onPress={() => setTopic(t.id)}
                  style={[styles.topicChip, topic === t.id && styles.topicChipActive]}
                  disabled={isSigning}
                >
                  <Text style={{fontSize: 16, marginRight: 5}}>{t.icon}</Text>
                  <Text style={[styles.topicText, topic === t.id && {color: '#000'}]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* BODY INPUT */}
          <Text style={styles.label}>DATA PAYLOAD</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Enter knowledge content..." 
            placeholderTextColor="#555"
            multiline
            textAlignVertical="top"
            value={body}
            onChangeText={setBody}
            editable={!isSigning}
          />

          {/* ACTION BUTTONS */}
          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onClose} style={styles.btnCancel} disabled={isSigning}>
              <Text style={styles.btnTextGray}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} style={styles.btnSave} disabled={isSigning}>
               {isSigning ? (
                  <ActivityIndicator color="#000" />
               ) : (
                  <Text style={styles.btnTextBlack}>{initialData ? 'SIGN & UPDATE' : 'ENCRYPT & SAVE'}</Text>
               )}
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  container: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#333' },
  header: { color: '#00ff00', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', letterSpacing: 1 },
  
  label: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 5, fontFamily: 'Courier', borderWidth: 1, borderColor: '#333' },
  textArea: { height: 120 },

  topicRow: { flexDirection: 'row', marginBottom: 10, height: 40 },
  topicChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#444' },
  topicChipActive: { backgroundColor: '#00ff00', borderColor: '#00ff00' },
  topicText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },

  btnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btnCancel: { padding: 15 },
  btnSave: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, flex: 1, alignItems: 'center', marginLeft: 10 },
  
  btnTextGray: { color: '#888', fontWeight: 'bold' },
  btnTextBlack: { color: '#000', fontWeight: 'bold' }
});