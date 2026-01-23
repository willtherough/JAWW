import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native'; // Added Vibration
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker'; 
import RNQRGenerator from 'rn-qr-generator';      
// import { verifySignature } from '../model/Security'; // Optional if you want deep verification here

export default function ScannerModal({ visible, onClose, onScanSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      if (!permission) requestPermission();
    }
  }, [visible]);

  // --- GALLERY HANDLER (UNCHANGED) ---
  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      
      RNQRGenerator.detect({ uri: imageUri })
      .then(response => {
        const { values } = response;
        if (values && values.length > 0) {
          handleBarCodeScanned({ data: values[0] });
        } else {
          Alert.alert("Scan Failed", "No QR code found in this image.");
        }
      })
      .catch(error => {
        console.log('QR Detection Error', error);
        Alert.alert("Error", "Could not read image.");
      });
    }
  };

  if (!permission?.granted) return null;

  // --- THE AUDIT LOGIC (UPDATED WITH LOOP FIX) ---
  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const cardData = typeof data === 'string' ? JSON.parse(data) : data;
      console.log("Auditing Card:", cardData.title);

      // 1. CHECK HISTORY (THE BOUNCER)
      if (!cardData.history || cardData.history.length === 0) {
        Vibration.vibrate(); 
        Alert.alert(
            "Security Alert", 
            "This card has no Chain of Custody. Cannot verify.",
            // FIX: Close modal on OK to prevent infinite loop
            [{ text: "OK", onPress: () => onClose() }] 
        );
        return;
      }

      // 2. CHECK SIGNATURE
      const genesisEntry = cardData.history[0];
      const genesisSignature = genesisEntry.signature;
      
      if (!genesisSignature || genesisSignature.length < 10) {
         Vibration.vibrate();
         Alert.alert(
             "Forgery Detected", 
             "Digital Signature is missing or corrupt.",
             [{ text: "OK", onPress: () => onClose() }]
         );
         return;
      }

      // 3. SUCCESS
      onScanSuccess(cardData);
      // Optional: Close automatically, or let App.js handle it
      // onClose(); 

    } catch (error) {
      console.log("Parse Error:", error);
      Vibration.vibrate();
      Alert.alert(
          "Read Error", 
          "Not a valid Source Card.",
          [{ text: "OK", onPress: () => onClose() }]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{ barCodeTypes: ["qr"] }}
        />
        
        {/* HUD Overlay */}
        <View style={styles.overlay}>
          <View style={styles.reticle} />
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
                {scanned ? "ANALYZING..." : "SEARCHING FOR CRYPTO-SIGNATURE"}
            </Text>
          </View>
        </View>

        {/* --- CONTROLS AREA --- */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
            <Text style={styles.galleryText}>📂 UPLOAD IMAGE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>ABORT SCAN</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reticle: { width: 250, height: 250, borderWidth: 2, borderColor: '#00ff00', backgroundColor: 'transparent' },
  statusBadge: { marginTop: 20, backgroundColor:'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5 },
  statusText: { color: '#00ff00', fontFamily: 'Courier', fontWeight: 'bold' },
  
  controlsContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', gap: 15 },
  galleryBtn: { backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', width: 250, alignItems: 'center' },
  galleryText: { color: 'black', fontWeight: 'bold', fontFamily: 'Courier' },
  closeBtn: { backgroundColor: '#330000', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 5, borderWidth: 1, borderColor: 'red', width: 250, alignItems: 'center' },
  closeText: { color: 'red', fontWeight: 'bold', fontFamily: 'Courier' }
});