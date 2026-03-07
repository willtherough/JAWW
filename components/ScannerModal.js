import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Vibration, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerModal({ visible, onClose, onScanSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
    // When the modal becomes visible, make sure scanning is active
    if (visible) {
      setIsScanning(true);
    }
  }, [visible, permission]);

  const handleBarCodeScanned = ({ type, data }) => {
    if (isScanning) {
      setIsScanning(false); // Pause scanning
      Vibration.vibrate(100);
      onScanSuccess(data);
      // Automatically close the modal and reset after a short delay
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  if (!permission) {
    return <View />; // Or a loading indicator
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <Text style={styles.warningText}>Camera permission is required to use the scanner.</Text>
            <TouchableOpacity onPress={requestPermission} style={styles.btnApprove}>
              <Text style={styles.btnTextBlack}>GRANT PERMISSION</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.btnDeny}>
              <Text style={styles.btnTextRed}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Text style={styles.headerTitle}>SCAN TARGET</Text>
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          {/* Green Corners Overlay */}
          <View style={styles.cornersOverlay}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#00ff00',
    fontFamily: 'Courier',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  cameraContainer: {
    width: '80%',
    aspectRatio: 1,
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00ff00',
    position: 'relative',
  },
  cornersOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00ff00',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 5,
    borderLeftWidth: 5,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 5,
    borderRightWidth: 5,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 5,
    borderRightWidth: 5,
  },
  closeButton: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
  alertBox: {
    width: '85%',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  warningText: {
    color: '#f59e0b',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  btnApprove: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f59e0b',
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDeny: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ff0000',
    borderRadius: 5,
    alignItems: 'center',
  },
  btnTextBlack: {
    color: '#000',
    fontWeight: 'bold',
  },
  btnTextRed: {
    color: '#ff0000',
    fontWeight: 'bold',
  },
});