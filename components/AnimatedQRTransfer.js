import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Buffer } from 'buffer';

const CHUNK_SIZE = 150; // Conservative chunk size for optimal camera reliability
const FPS = 10; // Frames per second (100ms interval)

export default function AnimatedQRTransfer({ payload, onClose }) {
    const [currentFrame, setCurrentFrame] = useState(0);

    // 1. CHUNK THE PAYLOAD ON MOUNT
    const frames = useMemo(() => {
        if (!payload) return [];
        
        try {
            // Convert the entire card object into a deep Base64 string to avoid escape character issues
            const jsonString = JSON.stringify(payload);
            const base64String = Buffer.from(jsonString, 'utf8').toString('base64');
            
            const numChunks = Math.ceil(base64String.length / CHUNK_SIZE);
            const chunks = [];
            
            for (let i = 0; i < numChunks; i++) {
                const chunkData = base64String.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                // Schema: JAWW-AIRGAP:index:total:data
                chunks.push(`JAWW-AIRGAP:${i}:${numChunks}:${chunkData}`);
            }
            return chunks;
        } catch (e) {
            console.error("Frame generation failed", e);
            return [];
        }
    }, [payload]);

    // 2. THE ANIMATION LOOP
    useEffect(() => {
        if (frames.length === 0) return;

        const interval = setInterval(() => {
            setCurrentFrame(prev => (prev + 1) % frames.length);
        }, 1000 / FPS);

        return () => clearInterval(interval);
    }, [frames]);

    if (!payload || frames.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.warningTitle}>EMCON PROTOCOL ACTIVE</Text>
            <Text style={styles.instructionText}>
                Zero-Emission Air-Gap Transfer. Keep the scanner locked on this feed until transfer completes.
            </Text>

            <View style={styles.qrWrapper}>
                <QRCode
                    value={frames[currentFrame]}
                    size={280}
                    color="#F8FAFC"
                    backgroundColor="#000000"
                    ecl="L" // Low error correction to maximize data density
                />
            </View>

            <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                    FRAME {currentFrame + 1} / {frames.length}
                </Text>
                <Text style={styles.speedText}>({FPS} FPS)</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>ABORT TRANSFER</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    warningTitle: {
        color: '#ff0000',
        fontFamily: 'Courier',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 2,
    },
    instructionText: {
        color: '#94A3B8',
        fontFamily: 'Courier',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 18,
    },
    qrWrapper: {
        padding: 20,
        backgroundColor: '#000',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ff0000',
        marginBottom: 30,
    },
    progressRow: {
        flexDirection: 'row',
        gap: 15,
        alignItems: 'center',
        marginBottom: 40,
    },
    progressText: {
        color: '#F8FAFC',
        fontFamily: 'Courier',
        fontSize: 16,
        fontWeight: 'bold',
    },
    speedText: {
        color: '#64748B',
        fontFamily: 'Courier',
        fontSize: 12,
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#64748B',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    cancelText: {
        color: '#94A3B8',
        fontFamily: 'Courier',
        fontWeight: 'bold',
    }
});
