import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const SettingsModal = ({ visible, onClose, onSyncMesh, onSyncGrocery, onSyncNews }) => {
  const [deviceAlias, setDeviceAlias] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('@device_alias').then(alias => {
        if (alias) setDeviceAlias(alias);
      });
    }
  }, [visible]);

  const saveAlias = async () => {
    try {
      await AsyncStorage.setItem('@device_alias', deviceAlias.trim());
      Alert.alert("Alias Saved", "Your device alias has been updated. This will be broadcasted on the radar. Please restart JAWW to apply changes to the radio.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Feather name="settings" size={20} color="#00ff00" />
            <Text style={styles.headerText}>SYSTEM SETTINGS</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MANUAL MESH SYNC</Text>
            
            <TouchableOpacity style={styles.actionBtn} onPress={() => { onSyncMesh(); onClose(); }}>
              <Feather name="refresh-cw" size={16} color="#0EA5E9" />
              <Text style={styles.actionBtnText}>SYNC WITH MESH (ALL)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={() => { onSyncGrocery(); onClose(); }}>
              <Feather name="shopping-cart" size={16} color="#F59E0B" />
              <Text style={styles.actionBtnText}>SYNC GROCERY LISTS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => { onSyncNews(); onClose(); }}>
              <Feather name="globe" size={16} color="#10B981" />
              <Text style={styles.actionBtnText}>SYNC NEWS INTELLIGENCE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HARDWARE CONFIGURATION</Text>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: '#00FF00', fontSize: 10, fontFamily: 'Courier', marginBottom: 5 }}>DEVICE ALIAS (OPTIONAL)</Text>
              <TextInput 
                style={styles.input}
                value={deviceAlias}
                onChangeText={setDeviceAlias}
                placeholder="e.g. Mobile, Tablet, Home"
                placeholderTextColor="#005500"
              />
              <Text style={{ color: '#666', fontSize: 10, fontFamily: 'Courier', marginTop: 5 }}>
                Appended to your Handle on the Radar to prevent device collisions (e.g. William_Tablet). Does not affect cryptography.
              </Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveAlias}>
              <Text style={styles.saveText}>SAVE ALIAS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 300, borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 15 },
  headerText: { color: '#00ff00', fontSize: 18, fontWeight: 'bold', marginLeft: 10, flex: 1, fontFamily: 'Courier' },
  closeBtn: { padding: 5 },
  section: { marginBottom: 25 },
  sectionTitle: { color: '#666', fontSize: 12, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 10, fontFamily: 'Courier' },
  input: { backgroundColor: '#000', color: '#00FF00', padding: 12, borderRadius: 5, borderWidth: 1, borderColor: '#003300', fontWeight: 'bold', fontFamily: 'Courier' },
  saveBtn: { backgroundColor: '#003300', padding: 15, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: '#00FF00' },
  saveText: { color: '#00FF00', fontWeight: 'bold', fontFamily: 'Courier', letterSpacing: 1 }
});

export default SettingsModal;
