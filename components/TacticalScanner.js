import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing, TouchableOpacity } from 'react-native';

export default function TacticalScanner({ devices, onNodeTap, isScanning }) {
    const [radarHeight, setRadarHeight] = useState(0);
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isScanning && radarHeight > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, {
                        toValue: radarHeight,
                        duration: 2000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanLineAnim, {
                        toValue: 0,
                        duration: 0, // Instantly snap back to top
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            scanLineAnim.stopAnimation();
            scanLineAnim.setValue(0);
        }
    }, [isScanning, radarHeight]);

    // Map RSSI (Signal Strength) to an X/Y coordinate on the grid
    const getCoordinates = (rssi, id) => {
        // Clamp RSSI between -30 (close) and -100 (far)
        const safeRssi = Math.max(-100, Math.min(-30, rssi));
        
        // Convert to a percentage of distance (0 = far, 1 = close)
        const distancePercent = (safeRssi + 100) / 70; 

        // Generate a stable X position from the device's unique ID
        let hash = 0;
        for (let i = 0; i < (id?.length || 0); i++) {
            hash = (hash << 5) - hash + id.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        const pseudoRandomX = (Math.abs(hash) % 80) + 10; // Gives a % between 10 and 90

        return {
            bottom: `${distancePercent * 100}%`, // Stronger signal = closer to bottom (user)
            left: `${pseudoRandomX}%`
        };
    };

    return (
        <View style={styles.scannerContainer}>
            {/* The Background Grid */}
            <View style={styles.gridOverlay} />
            
            <View style={styles.headerRow}>
                <Text style={styles.titleText}>Content Offered Around Me</Text>
                <View style={styles.statusBadge}>
                    <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.statusText}>{isScanning ? 'SCANNING' : 'Radar Active'}</Text>
                </View>
            </View>

            <View 
                style={styles.radarBox}
                onLayout={(event) => setRadarHeight(event.nativeEvent.layout.height)}
            >
                {/* The Scanning Laser Line */}
                {isScanning && (
                    <Animated.View 
                        style={[
                            styles.scanLine, 
                            { transform: [{ translateY: scanLineAnim }] }
                        ]} 
                    />
                )}

                {/* Plotting the Nodes */}
                {devices.map((device) => {
                    const position = getCoordinates(device.rssi, device.id);
                    
                    // Determine Blip Type
                    const isAnswer = device.subject && device.subject.startsWith('RE:');
                    const isQuestion = device.isQuestion || (device.subject && device.subject.startsWith('QUESTION:'));

                    // Default Tactical Green
                    let blipColor = '#10B981'; 
                    let blipSize = 14;
                    let blipText = '';

                    if (isQuestion) {
                        blipColor = '#F59E0B'; // Amber for Questions
                        blipSize = 22;
                        blipText = 'Q';
                    } else if (isAnswer) {
                        blipColor = '#38BDF8'; // Blue for Answers
                        blipSize = 22;
                        blipText = 'A';
                    }

                    return (
                        <TouchableOpacity
                            key={device.id}
                            style={[styles.nodeWrapper, { bottom: position.bottom, left: position.left }]}
                            onPress={() => onNodeTap(device)}
                        >
                            <View style={[
                                styles.nodeBlip, 
                                { 
                                    backgroundColor: blipColor, 
                                    width: blipSize, 
                                    height: blipSize, 
                                    borderRadius: blipSize / 2,
                                    shadowColor: blipColor,
                                    justifyContent: 'center', 
                                    alignItems: 'center' 
                                }
                            ]}>
                                {blipText !== '' && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{blipText}</Text>}
                            </View>
                            <Text style={styles.nodeLabel} numberOfLines={1}>
                                {device.subject || device.name || 'UNKNOWN'}
                            </Text>
                            <Text style={styles.nodeRssi}>{device.rssi}dBm</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    scannerContainer: {
        backgroundColor: '#0F172A',
        overflow: 'hidden',
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    titleText: {
        color: '#F8FAFC',
        fontFamily: 'Courier',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        color: '#94A3B8',
        fontFamily: 'Courier',
        fontSize: 10,
        fontWeight: 'bold',
    },
    radarBox: {
        flex: 1,
        backgroundColor: '#000000',
        position: 'relative',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.1,
        // If you want actual grid lines, you can use a repeating background image 
        // or draw multiple borders here. For now, a solid dark box with a border looks tactical.
    },
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#10B981', // Matrix Green
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        position: 'absolute',
        top: 0,
        zIndex: 10,
    },
    nodeWrapper: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateX: -30 }, { translateY: 15 }], // Center the touch target over the point
        width: 60,
        height: 40,
        zIndex: 5,
    },
    nodeBlip: {
        width: 6,
        height: 6,
        backgroundColor: '#10B981',
        borderRadius: 3,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },
    nodeLabel: {
        color: '#F8FAFC',
        fontFamily: 'Courier',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    nodeRssi: {
        color: '#64748B',
        fontFamily: 'Courier',
        fontSize: 8,
    }
});