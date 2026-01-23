import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert, Clipboard, TextInput } from 'react-native';

// NOTE: We rely on the parent (App.js) to handle the actual wiping via onReset
export default function IdentityModal({ visible, onClose, profile, library, onMerge, onSaveNew, onReset }) {
  const [mode, setMode] = useState('view'); // 'view', 'export', 'import'
  const [showSensitive, setShowSensitive] = useState(false);
  const [importData, setImportData] = useState('');

  // RESET STATE ON OPEN
  React.useEffect(() => {
    if (visible) {
      setMode('view');
      setShowSensitive(false);
      setImportData('');
    }
  }, [visible]);

  const copyPrivate = () => {
    if (profile.keys) {
      Clipboard.setString(profile.keys.secretKey);
      Alert.alert("Copied", "Identity Key copied to clipboard.");
    }
  };

  const copyFullBackup = () => {
    // BUNDLE EVERYTHING
    const backup = {
      profile: profile,
      library: library || [],
      timestamp: new Date().toISOString(),
      version: '1.5'
    };
    
    const json = JSON.stringify(backup);
    Clipboard.setString(json);
    Alert.alert("Archive Secured", `Full System Backup (${(json.length / 1024).toFixed(1)} KB) copied to clipboard.`);
  };

  const handleImportSubmit = () => {
    if (!importData) return;
    const success = onMerge(importData);
    if (success) {
        setImportData('');
        onClose();
    }
  };

  const handleFactoryReset = async () => {
    Alert.alert(
      "FACTORY RESET",
      "This will wipe ALL data and return you to the Welcome Screen. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "WIPE EVERYTHING", 
          style: 'destructive',
          onPress: () => {
             // CALL PARENT WIPE FUNCTION (Instant Reset)
             if (onReset) onReset(); 
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* HEADER */}
          <Text style={styles.header}>ACCOUNT MANAGEMENT</Text>

          {/* --- VIEW MODE (DEFAULT) --- */}
          {mode === 'view' && (
            <View>
              <Text style={styles.label}>OPERATOR STATUS:</Text>
              <View style={styles.statusBox}>
                <Text style={styles.value}>{profile.handle ? profile.handle.toUpperCase() : 'UNKNOWN'}</Text>
                <Text style={styles.smallCode}>{library ? library.length : 0} RECORDS SECURED</Text>
              </View>
              
              <View style={styles.menuStack}>
                
                {/* 1. EDIT IDENTITY (RESTORED) */}
                <TouchableOpacity onPress={() => { onClose(); onSaveNew(); }} style={styles.btnSecondary}>
                   <Text style={styles.btnTextWhite}>📝 EDIT BACKGROUND / DOSSIER</Text>
                </TouchableOpacity>

                {/* 2. TRANSFER / BACKUP */}
                <TouchableOpacity onPress={() => setMode('export')} style={styles.btnPrimary}>
                  <Text style={styles.btnTextBlack}>📤 EXPORT / BACKUP DATA</Text>
                </TouchableOpacity>

                {/* 3. RECEIVE / MERGE */}
                <TouchableOpacity onPress={() => setMode('import')} style={styles.btnSecondary}>
                  <Text style={styles.btnTextWhite}>📥 IMPORT / RECEIVE DATA</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* 4. FACTORY RESET */}
                <TouchableOpacity onPress={handleFactoryReset} style={styles.btnDestructive}>
                  <Text style={styles.btnTextDestructive}>☢️ FACTORY RESET (DEV)</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.btnClose}>
                  <Text style={styles.btnTextGray}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- EXPORT MODE --- */}
          {mode === 'export' && (
            <View>
              <Text style={styles.warningText}>DATA EXPORT PROTOCOL</Text>
              <Text style={styles.infoText}>Select the depth of your backup:</Text>

              {/* A. FULL BACKUP */}
              <TouchableOpacity onPress={copyFullBackup} style={styles.btnBigGreen}>
                <Text style={styles.btnTextBlack}>COPY FULL ARCHIVE</Text>
                <Text style={styles.btnSubText}>Identity + All Knowledge Cards</Text>
              </TouchableOpacity>

              {/* B. KEYS ONLY */}
              <View style={styles.keySection}>
                <Text style={styles.label}>IDENTITY ONLY (PRIVATE KEY)</Text>
                {!showSensitive ? (
                    <TouchableOpacity onPress={() => setShowSensitive(true)} style={styles.revealBtn}>
                    <Text style={styles.revealText}>REVEAL KEY</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={copyPrivate} style={styles.secretBox}>
                        <Text style={styles.secretCode}>{profile.keys?.secretKey.substring(0, 30)}...</Text>
                        <Text style={styles.copyLabel}>TAP TO COPY</Text>
                    </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity onPress={() => setMode('view')} style={styles.btnSecondary}>
                <Text style={styles.btnTextWhite}>BACK</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* --- IMPORT MODE (DEBUG VERSION) --- */}
          {mode === 'import' && (
            <View>
              <Text style={styles.warningText}>DATA INGESTION</Text>
              
              <Text style={styles.infoText}>
                Paste your backup string below.
              </Text>

              {/* FUEL GAUGE: SHOWS DATA LENGTH */}
              <Text style={{color: importData.length > 50 ? '#00ff00' : '#ff5555', fontSize: 10, marginBottom: 5, fontWeight:'bold', textAlign:'right'}}>
                 PAYLOAD SIZE: {importData.length} CHARS
              </Text>

              <TextInput 
                style={styles.pasteArea}
                placeholder="Paste JSON string here..."
                placeholderTextColor="#555"
                multiline
                value={importData}
                onChangeText={setImportData}
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
                smartQuotesType="no"
              />

              <TouchableOpacity onPress={handleImportSubmit} style={styles.btnPrimary}>
                <Text style={styles.btnTextBlack}>PROCESS DATA STREAM</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('view')} style={styles.btnSecondary}>
                <Text style={styles.btnTextWhite}>BACK</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  container: { backgroundColor: '#1e1e1e', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#333' },
  header: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', letterSpacing: 1 },
  
  statusBox: { marginBottom: 20, padding: 10, backgroundColor: '#111', borderRadius: 8, alignItems: 'center' },
  label: { color: '#666', fontSize: 10, marginBottom: 5, fontWeight: 'bold' },
  value: { color: '#00ff00', fontSize: 20, fontWeight: 'bold' },
  smallCode: { color: '#888', fontSize: 10, fontFamily: 'Courier', marginTop: 5 },
  
  menuStack: { gap: 10 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  
  infoText: { color: '#aaa', fontSize: 12, marginBottom: 15, lineHeight: 18 },
  warningText: { color: '#f59e0b', fontSize: 14, marginBottom: 15, fontWeight: 'bold', textAlign: 'center' },

  // EXPORT STYLES
  btnBigGreen: { backgroundColor: '#00ff00', padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  keySection: { backgroundColor: '#222', padding: 10, borderRadius: 8, marginBottom: 20 },
  secretBox: { backgroundColor: '#220000', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#f00', alignItems: 'center' },
  secretCode: { color: '#ff5555', fontSize: 10, fontFamily: 'Courier' },
  copyLabel: { color: '#fff', fontWeight: 'bold', fontSize: 10, marginTop: 5 },
  revealBtn: { backgroundColor: '#333', padding: 15, alignItems: 'center', borderRadius: 8 },
  revealText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 12 },

  // IMPORT STYLES
  pasteArea: { backgroundColor: '#111', color: '#fff', height: 100, borderRadius: 8, padding: 10, fontFamily: 'Courier', fontSize: 10, marginBottom: 15, borderWidth: 1, borderColor: '#333' },

  // BUTTONS
  btnPrimary: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, alignItems: 'center' },
  btnDestructive: { backgroundColor: '#330000', padding: 15, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: '#ff0000' },
  btnSecondary: { backgroundColor: '#333', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  btnClose: { padding: 15, alignItems: 'center', marginTop: 5 },

  btnTextBlack: { color: '#000', fontWeight: 'bold' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
  btnTextDestructive: { color: '#ff5555', fontWeight: 'bold' },
  btnTextGray: { color: '#888' },
  btnSubText: { color: '#004400', fontSize: 10, marginTop: 2, fontWeight: 'bold' }
});