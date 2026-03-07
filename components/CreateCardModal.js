import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { TOPICS } from '../model/Definitions';
// Add 'getOrGenerateKeys' to the import
import { signData, getOrGenerateKeys } from '../model/Security';

export default function CreateCardModal({ visible, onClose, onSave, initialData }) {
  // STATE
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState('general');
  const [subject, setSubject] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // POPULATE DATA ON OPEN (For Editing)
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTitle(initialData.title || '');
        setBody(initialData.body || '');
        setTopic(initialData.topic ? initialData.topic.replace('human/','') : 'general');
        setSubject(initialData.subject || '');
      } else {
        setTitle('');
        setBody('');
        setTopic('general');
        setSubject('');
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!title || !body) return;
    
    setIsSigning(true);

    const keys = await getOrGenerateKeys();
    if (!keys) {
      Alert.alert("Error", "Could not retrieve Identity Keys.");
      setIsSigning(false);
      return;
    }

    const rawData = {
      title,
      topic,
      subject,
      body_json: JSON.stringify({ content: body }), 
      type: 'narrative_markdown',
      timestamp: new Date().toISOString()
    };

    const signature = await signData(rawData);

    const finalCard = {
      ...rawData,
      history: [{ 
        timestamp: new Date().toISOString(),
        signature: signature,
        signer: keys.publicKey
      }],
      body: body,
    };

    await onSave(finalCard);
    setIsSigning(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.overlay}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.header}>{initialData ? 'EDIT RECORD' : 'NEW DATA ENTRY'}</Text>
          
          <Text style={styles.label}>TITLE / HEADLINE</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Smoked Brisket Technique" 
            placeholderTextColor="#555"
            value={title}
            onChangeText={setTitle}
            editable={!isSigning}
          />

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
                  <Text style={[styles.topicText, topic === t.id && {color: '#000'}]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.label}>SUBJECT</Text>
          <TextInput
            style={styles.input}
            placeholder="Specific Subject (e.g., History, Recipes, Networking)"
            placeholderTextColor="#555"
            value={subject}
            onChangeText={setSubject}
            editable={!isSigning}
          />

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

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={onClose} style={styles.btnCancel} disabled={isSigning}>
              <Text style={styles.btnTextGray}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.btnSave} disabled={isSigning}>
               {isSigning ? <ActivityIndicator color="#000" /> : <Text style={styles.btnTextBlack}>{initialData ? 'SIGN & UPDATE' : 'ENCRYPT & SAVE'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
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