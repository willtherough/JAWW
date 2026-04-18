import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Buffer } from 'buffer';

export default function AirGapScanner({ visible, onClose, onTransferComplete }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [chunksReceived, setChunksReceived] = useState(0);
    const [totalChunks, setTotalChunks] = useState(null);
    const [hasError, setHasError] = useState(false);
    
    // Use a ref to hold the accumulating buffer to avoid React re-render closure staleness
    const bufferRef = useRef({});
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible, permission]);

    // Resets state when modal is opened/closed
    useEffect(() => {
        if (visible) {
            bufferRef.current = {};
            setChunksReceived(0);
            setTotalChunks(null);
            setHasError(false);
            isProcessingRef.current = false;
        }
    }, [visible]);

    const handleFrameScanned = ({ data }) => {
        if (isProcessingRef.current) return;
        
        // Ensure it's our tactical format
        if (!data || !data.startsWith('JAWW-AIRGAP:')) return;

        try {
            const parts = data.split(':');
            if (parts.length < 4) return;

            const index = parseInt(parts[1], 10);
            const total = parseInt(parts[2], 10);
            const payloadChunk = parts.slice(3).join(':'); // Re-join in case base64 contained colons

            if (totalChunks === null) {
                setTotalChunks(total);
            }

            // Only add if we don't have this exact frame yet
            if (!bufferRef.current[index]) {
                bufferRef.current[index] = payloadChunk;
                const currentCount = Object.keys(bufferRef.current).length;
                setChunksReceived(currentCount);

                // Have we collected the entire Exodia payload?
                if (currentCount === total) {
                    isProcessingRef.current = true;
                    Vibration.vibrate([0, 100, 50, 100]); // Success pattern
                    
                    // Reassemble strings sequentially
                    let fullBase64 = '';
                    for (let i = 0; i < total; i++) {
                        fullBase64 += bufferRef.current[i];
                    }

                    // Decode
                    const jsonString = Buffer.from(fullBase64, 'base64').toString('utf8');
                    const parsedCard = JSON.parse(jsonString);

                    // Push the fully reconstructed object back to App.js
                    onTransferComplete(parsedCard);
                    onClose();
                }
            }
        } catch (e) {
            console.error("Frame parsing failed. Bad frame dropped.", e);
        }
    };

    if (!permission) return <View />;
    
    if (!permission.granted) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <Text style={{color: '#ff0000'}}>Camera access required for Tactical Intel.</Text>
                </View>
            </Modal>
        );
    }

    const progressPercent = totalChunks ? (chunksReceived / totalChunks) * 100 : 0;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Text style={styles.headerTitle}>ACQUIRING AIR-GAP SIGNAL</Text>
                
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        onBarcodeScanned={isProcessingRef.current ? undefined : handleFrameScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />
                    
                    {/* The Tactical Target Overlay */}
                    <View style={styles.targetOverlay}>
                        <View style={styles.crosshair} />
                    </View>
                </View>

                {totalChunks ? (
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>
                            SPOOLED {chunksReceived} OF {totalChunks} PACKETS
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                        {progressPercent === 100 && (
                            <Text style={styles.successText}>DECRYPTING LOADOUT...</Text>
                        )}
                    </View>
                ) : (
                    <Text style={styles.awaitingText}>AWAITING INITIAL FRAME...</Text>
                )}

                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>ABORT</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#ff0000', fontFamily: 'Courier', fontSize: 18, fontWeight: 'bold', marginBottom: 30, letterSpacing: 2 },
    cameraContainer: {
        width: '85%', aspectRatio: 1, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#ff0000',
    },
    targetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    crosshair: { width: 100, height: 100, borderWidth: 1, borderColor: 'rgba(255,0,0,0.4)', borderRadius: 50 },
    progressContainer: { width: '85%', marginTop: 30, alignItems: 'center' },
    progressText: { color: '#F8FAFC', fontFamily: 'Courier', fontSize: 12, marginBottom: 10 },
    progressBarBg: { width: '100%', height: 10, backgroundColor: '#1E293B', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#ff0000' },
    successText: { color: '#10B981', fontFamily: 'Courier', fontSize: 14, fontWeight: 'bold', marginTop: 15 },
    awaitingText: { color: '#64748B', fontFamily: 'Courier', fontSize: 12, marginTop: 30 },
    closeButton: { marginTop: 40, paddingHorizontal: 30, paddingVertical: 12, borderWidth: 1, borderColor: '#64748B', borderRadius: 8 },
    closeButtonText: { color: '#94A3B8', fontFamily: 'Courier', fontWeight: 'bold' }
});
