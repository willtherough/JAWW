import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';

export default function LogicModal({ visible, onClose, card, onAddContext }) {
  if (!visible || !card) return null;

  const [mode, setMode] = useState('verify'); // 'verify' or 'add_note'
  const [noteText, setNoteText] = useState('');

  // 1. "IGNORE" ACTION (Keep Yellow)
  const handleIgnore = () => {
    onClose();
  };

  // 2. "VERIFY" ACTION (Turn Green - No Note needed)
  // This implies the user looked at it and said "This is fine."
  // For now, we handle this by adding a "System Note" or just handling it in App state.
  // But based on your prompt, let's focus on "Context" as the path to Green.
  
  // 3. "ADD CONTEXT" ACTION (Turn Green + Note)
  const handleSaveContext = () => {
    if (noteText.trim().length > 0) {
      onAddContext(card.id, noteText);
      setNoteText('');
      setMode('verify');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          <Text style={styles.header}>CONTEXT CHECK</Text>

          {/* THE EVIDENCE */}
          <View style={styles.evidenceBox}>
            <Text style={styles.label}>CLAIM (TITLE):</Text>
            <Text style={styles.value}>{card.title}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.label}>EVIDENCE (CONTENT):</Text>
            <ScrollView style={{ maxHeight: 150 }}>
              <Text style={styles.body}>{card.body_json}</Text>
            </ScrollView>
          </View>

          {/* THE JUDGMENT */}
          {mode === 'verify' ? (
            <View>
              <Text style={styles.prompt}>
                Does the content match the expectation set by the title?
              </Text>

              <View style={styles.buttonStack}>
                {/* OPTION A: IGNORE */}
                <TouchableOpacity onPress={handleIgnore} style={styles.ignoreBtn}>
                  <Text style={styles.ignoreText}>IGNORE (REMAIN UNVERIFIED)</Text>
                  <Text style={styles.subText}>Adds no credibility. Keeps warning.</Text>
                </TouchableOpacity>

                {/* OPTION B: PROVIDE CONTEXT */}
                <TouchableOpacity onPress={() => setMode('add_note')} style={styles.contextBtn}>
                  <Text style={styles.contextText}>PROVIDE CONTEXT</Text>
                  <Text style={styles.subText}>Explain the discrepancy. Marks as VALID.</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.prompt}>Add Context / Note:</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: 'This title is metaphorical. The list refers to supplies needed for the revolution.'"
                placeholderTextColor="#666"
                multiline
                value={noteText}
                onChangeText={setNoteText}
              />
              <View style={styles.row}>
                <TouchableOpacity onPress={() => setMode('verify')} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveContext} style={styles.saveBtn}>
                  <Text style={styles.saveText}>SAVE CONTEXT & VERIFY</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  container: { backgroundColor: '#1e1e1e', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
  header: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', letterSpacing: 1 },
  evidenceBox: { backgroundColor: '#111', padding: 15, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  label: { color: '#666', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  value: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  body: { color: '#ccc', fontSize: 14, fontFamily: 'Courier' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  prompt: { color: '#f59e0b', fontSize: 14, marginBottom: 15, textAlign: 'center', fontWeight: 'bold' },
  buttonStack: { gap: 10 },
  ignoreBtn: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
  ignoreText: { color: '#fff', fontWeight: 'bold' },
  contextBtn: { backgroundColor: '#00ff00', padding: 15, borderRadius: 8, alignItems: 'center' },
  contextText: { color: '#000', fontWeight: 'bold' },
  subText: { color: '#888', fontSize: 10, marginTop: 4 },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 8, height: 100, textAlignVertical: 'top', marginBottom: 15, fontFamily: 'Courier' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#333', borderRadius: 8 },
  cancelText: { color: '#fff' },
  saveBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#00ff00', borderRadius: 8 },
  saveText: { color: '#000', fontWeight: 'bold' }
});