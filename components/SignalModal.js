import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerModal({ visible, onClose, onScanSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.text}>Camera permission needed.</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.btnText}>GRANT PERMISSION</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[styles.button, {marginTop: 20, borderColor: 'red'}]}>
            <Text style={[styles.btnText, {color: 'red'}]}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return; 
    setScanned(true);   

    try {
      const parsedData = JSON.parse(data);
      
      // CASE 1: IT IS A BEACON SIGNAL (New Logic)
      if (parsedData.type === 'BEACON_SIGNAL') {
        const contactCard = {
          id: `contact-${parsedData.handle}-${Date.now()}`,
          title: `CONTACT: ${parsedData.handle}`,
          domain: 'HUMAN',
          body_json: JSON.stringify({
            type: 'structured_list',
            items: [
              { label: 'HANDLE', value: parsedData.handle },
              { label: 'INTERESTS', value: parsedData.interests.join(', ') },
              { label: 'OFFERS', value: parsedData.offers.map(o => o.title).join(', ') }
            ]
          }),
          author: parsedData.handle,
          is_verified: true
        };
        onScanSuccess(contactCard);
        onClose();
        return;
      }

      // CASE 2: IT IS A REGULAR CARD (Existing Logic)
      if (parsedData.title && parsedData.domain) {
        onScanSuccess(parsedData);
        onClose();
      } else {
        throw new Error("Missing fields");
      }

    } catch (e) {
      Alert.alert(
        "Invalid Code",
        "This is not a Source Card or Beacon.",
        [
          { 
            text: "OK", 
            onPress: () => setTimeout(() => setScanned(false), 2000) 
          }
        ]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView 
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={styles.overlay}>
          <View style={[styles.scanFrame, { borderColor: scanned ? 'red' : '#00ff00' }]} />
          <Text style={styles.instruction}>
            {scanned ? "PROCESSING..." : "ALIGN QR CODE"}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>CANCEL SCAN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white', marginBottom: 20 },
  button: { padding: 15, borderWidth: 1, borderColor: '#00ff00', borderRadius: 5 },
  btnText: { color: '#00ff00', fontFamily: 'Courier', fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, backgroundColor: 'transparent' },
  instruction: { color: '#fff', marginTop: 20, fontFamily: 'Courier', backgroundColor: 'rgba(0,0,0,0.7)', padding: 5 },
  closeBtn: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
  closeText: { color: 'white', fontWeight: 'bold' }
});