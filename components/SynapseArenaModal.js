import React, { useState, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Animated, PanResponder, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function SynapseArenaModal({ visible, onClose, profile, localLibrary = [] }) {
    const [championCard, setChampionCard] = useState(null);
    const [phase, setPhase] = useState('HUNTING'); // HUNTING, LOCKED, FIRING, RESOLVED
    const [logText, setLogText] = useState("SWIPE TO SWEEP THE HORIZON...");

    // === PHASE 1: PERISCOPE PANNING (Since Gyroscope is offline) ===
    const panX = useRef(new Animated.Value(0)).current;
    const panY = useRef(new Animated.Value(0)).current;
    // We create a mock "target" somewhere on the virtual grid
    const targetX = useRef((Math.random() - 0.5) * 800).current;
    const targetY = useRef((Math.random() - 0.5) * 800).current;

    const [distanceToTarget, setDistanceToTarget] = useState(999);

    const periscopeResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => phase === 'HUNTING',
            onMoveShouldSetPanResponder: () => phase === 'HUNTING',
            onPanResponderMove: Animated.event(
                [null, { dx: panX, dy: panY }],
                { 
                    useNativeDriver: false,
                    listener: (evt, gestureState) => {
                        // Calculate Pythagorean distance to the mock target
                        const dist = Math.sqrt(
                            Math.pow(gestureState.dx + targetX, 2) + 
                            Math.pow(gestureState.dy + targetY, 2)
                        );
                        setDistanceToTarget(Math.floor(dist));
                    }
                }
            ),
            onPanResponderRelease: () => {
                // Keep the offset so it doesn't snap back
                panX.extractOffset();
                panY.extractOffset();
            }
        })
    ).current;

    // === PHASE 2: ARTILLERY SLIDERS ===
    const elevationAnim = useRef(new Animated.Value(45)).current;
    const velocityAnim = useRef(new Animated.Value(50)).current;
    const [elevationDisp, setElevationDisp] = useState(45);
    const [velocityDisp, setVelocityDisp] = useState(50);

    const elevResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => phase === 'LOCKED',
            onMoveShouldSetPanResponder: () => phase === 'LOCKED',
            onPanResponderMove: (evt, gestureState) => {
                // Map dy to an angle between 0 and 90
                let newAngle = 45 - (gestureState.dy / 3);
                newAngle = Math.max(0, Math.min(90, newAngle));
                elevationAnim.setValue(newAngle);
                setElevationDisp(Math.floor(newAngle));
            }
        })
    ).current;

    const velResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => phase === 'LOCKED',
            onMoveShouldSetPanResponder: () => phase === 'LOCKED',
            onPanResponderMove: (evt, gestureState) => {
                // Map dy to velocity between 0 and 100
                let newVel = 50 + (gestureState.dy / 3);
                newVel = Math.max(0, Math.min(100, newVel));
                velocityAnim.setValue(newVel);
                setVelocityDisp(Math.floor(newVel));
            }
        })
    ).current;

    // === PHASE 3: MISSILE ANIMATION ===
    const missileScale = useRef(new Animated.Value(1)).current;
    const missileY = useRef(new Animated.Value(0)).current;
    const blastScale = useRef(new Animated.Value(0)).current;
    const blastOpacity = useRef(new Animated.Value(0)).current;

    const fireMissile = () => {
        setPhase('FIRING');
        setLogText("MISSILE AWAY! BRACE FOR IMPACT...");
        
        Animated.parallel([
            Animated.timing(missileY, {
                toValue: -height * 0.7, // Fly up the screen
                duration: 2000,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true
            }),
            Animated.timing(missileScale, {
                toValue: 0.05, // Shrink into the distance (Z-axis)
                duration: 2000,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true
            })
        ]).start(() => {
            resolveCombat();
        });
    };

    const resolveCombat = () => {
        // Did they hit the target?
        // Let's pretend the target distance required a specific formula.
        // For the sake of the mock, if velocity > 40 and elevation > 40, it's a hit!
        const isHit = Math.random() > 0.5; // Random chance for the MVP mock

        if (isHit) {
            setLogText("DIRECT HIT! ENEMY DESTROYED!");
            // Explosion animation
            Animated.parallel([
                Animated.timing(blastScale, { toValue: 5, duration: 500, useNativeDriver: true }),
                Animated.timing(blastOpacity, { toValue: 1, duration: 100, useNativeDriver: true })
            ]).start(() => {
                Animated.timing(blastOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }).start(() => {
                    setPhase('RESOLVED');
                });
            });
        } else {
            setLogText("SPLASH... WE CAME UP SHORT!");
            setPhase('RESOLVED');
        }
    };

    const resetArena = () => {
        missileY.setValue(0);
        missileScale.setValue(1);
        blastScale.setValue(0);
        blastOpacity.setValue(0);
        setLogText("SWIPE TO SWEEP THE HORIZON...");
        setPhase('HUNTING');
    };

    // If no champion is selected, we show the armory screen
    if (!championCard) {
        return (
            <Modal visible={visible} animationType="fade" transparent={false}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>// SYNAPSE ARENA</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={24} color="#F59E0B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.armoryContent}>
                        <Feather name="shield" size={64} color="#334155" style={{ marginBottom: 20 }} />
                        <Text style={styles.armoryTitle}>NO CHAMPION SELECTED</Text>
                        <Text style={styles.armorySub}>You must select a verified knowledge card from your Vault to act as your flagship in the arena.</Text>
                        
                        <TouchableOpacity 
                            style={styles.selectBtn}
                            onPress={() => {
                                if (localLibrary.length > 0) {
                                    setChampionCard(localLibrary[0]);
                                } else {
                                    alert("Your vault is empty! You need at least one card to enter the arena.");
                                }
                            }}
                        >
                            <Text style={styles.selectBtnText}>DEPLOY CHAMPION</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.arenaContainer}>
                
                {/* 
                    THE PERISCOPE GRID
                    We apply the PanResponder translation here to move the "world" around the user 
                */}
                <Animated.View 
                    style={[
                        styles.gridOverlay, 
                        { transform: [{ translateX: panX }, { translateY: panY }] }
                    ]}
                    {...periscopeResponder.panHandlers}
                >
                    {/* The Hidden Target Blip */}
                    <View style={[styles.targetBlip, { transform: [{ translateX: -targetX }, { translateY: -targetY }] }]}>
                        <View style={styles.blipCore} />
                    </View>
                </Animated.View>
                
                {/* HUD Overlay */}
                <SafeAreaView style={styles.hudContainer} pointerEvents="box-none">
                    <View style={styles.hudTop}>
                        <View>
                            <Text style={styles.hudText}>OPR: {profile?.handle || 'UNKNOWN'}</Text>
                            <Text style={styles.hudText}>HP: {championCard.hops * 10 || 10}</Text>
                            <Text style={[styles.hudText, { marginTop: 10, color: '#F59E0B' }]}>
                                DIST TO TARGET: {distanceToTarget}m
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.abortBtn}>
                            <Text style={styles.abortText}>ABORT</Text>
                        </TouchableOpacity>
                    </View>

                    {/* The Live Telemetry Log */}
                    <View style={styles.telemetryBox}>
                        <Text style={styles.telemetryText}>{logText}</Text>
                    </View>

                    {/* The Periscope Crosshair */}
                    <View style={styles.crosshairContainer} pointerEvents="none">
                        <View style={styles.crosshairV} />
                        <View style={styles.crosshairH} />
                        <View style={styles.crosshairCenter} />
                        
                        {/* The Firing Missile */}
                        {phase === 'FIRING' && (
                            <Animated.View style={[
                                styles.missile, 
                                { transform: [{ translateY: missileY }, { scale: missileScale }] }
                            ]} />
                        )}

                        {/* The Explosion */}
                        <Animated.View style={[
                            styles.explosion,
                            { opacity: blastOpacity, transform: [{ scale: blastScale }] }
                        ]} />
                    </View>

                    {/* The Bottom Controls */}
                    <View style={styles.hudBottom} pointerEvents="box-none">
                        
                        {phase === 'HUNTING' && (
                            <View style={{ width: '100%', alignItems: 'center' }}>
                                <TouchableOpacity 
                                    style={styles.lockBtn}
                                    onPress={() => {
                                        if (distanceToTarget < 150) {
                                            setPhase('LOCKED');
                                            setLogText("TARGET LOCKED! SET FIRING SOLUTION...");
                                        } else {
                                            setLogText("TARGET TOO FAR TO LOCK!");
                                        }
                                    }}
                                >
                                    <Text style={styles.lockText}>LOCK TARGET</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {(phase === 'LOCKED' || phase === 'FIRING') && (
                            <>
                                {/* Left Thumb: Elevation */}
                                <View style={styles.sliderContainer} {...elevResponder.panHandlers}>
                                    <Text style={styles.sliderText}>ELEVATION</Text>
                                    <Text style={styles.sliderValue}>{elevationDisp}°</Text>
                                    <View style={styles.track}>
                                        <Animated.View style={[styles.fill, { height: `${(elevationDisp / 90) * 100}%` }]} />
                                    </View>
                                </View>
                                
                                <TouchableOpacity 
                                    style={[styles.fireBtn, phase === 'FIRING' && { opacity: 0.5 }]}
                                    onPress={fireMissile}
                                    disabled={phase === 'FIRING'}
                                >
                                    <Text style={styles.fireText}>FIRE</Text>
                                </TouchableOpacity>

                                {/* Right Thumb: Velocity */}
                                <View style={styles.sliderContainer} {...velResponder.panHandlers}>
                                    <Text style={styles.sliderText}>VELOCITY</Text>
                                    <Text style={styles.sliderValue}>{velocityDisp}</Text>
                                    <View style={styles.track}>
                                        <Animated.View style={[styles.fill, { height: `${velocityDisp}%` }]} />
                                    </View>
                                </View>
                            </>
                        )}

                        {phase === 'RESOLVED' && (
                            <View style={{ width: '100%', alignItems: 'center' }}>
                                <TouchableOpacity style={styles.lockBtn} onPress={resetArena}>
                                    <Text style={styles.lockText}>RESET ARENA</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#334155' },
    title: { color: '#F59E0B', fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 18, letterSpacing: 2 },
    armoryContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    armoryTitle: { color: '#F8FAFC', fontFamily: 'Courier New', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    armorySub: { color: '#64748B', fontFamily: 'Courier New', textAlign: 'center', marginBottom: 40, lineHeight: 20 },
    selectBtn: { backgroundColor: '#F59E0B', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 4 },
    selectBtnText: { color: '#0F172A', fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 16 },
    
    arenaContainer: { flex: 1, backgroundColor: '#001a1a', overflow: 'hidden' },
    
    // The massive grid that gets dragged around
    gridOverlay: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        borderWidth: 2,
        borderColor: '#00ffcc',
        opacity: 0.1,
        // Mocking a grid background with a solid color for now
        backgroundColor: '#001111' 
    },
    targetBlip: {
        position: 'absolute',
        top: '50%', left: '50%',
        width: 60, height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blipCore: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444'
    },

    hudContainer: { flex: 1, justifyContent: 'space-between' },
    hudTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
    hudText: { color: '#00ffcc', fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 14, textShadowColor: '#00ffcc', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
    abortBtn: { borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    abortText: { color: '#EF4444', fontFamily: 'Courier New', fontWeight: 'bold' },
    
    telemetryBox: {
        position: 'absolute',
        top: 100,
        left: 20,
        backgroundColor: 'rgba(0, 26, 26, 0.8)',
        padding: 10,
        borderLeftWidth: 2,
        borderColor: '#00ffcc'
    },
    telemetryText: { color: '#00ffcc', fontFamily: 'Courier New', fontSize: 12 },

    crosshairContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    crosshairV: { width: 2, height: 300, backgroundColor: 'rgba(0, 255, 204, 0.4)', position: 'absolute' },
    crosshairH: { width: 300, height: 2, backgroundColor: 'rgba(0, 255, 204, 0.4)', position: 'absolute' },
    crosshairCenter: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#00ffcc', position: 'absolute' },
    
    missile: {
        position: 'absolute',
        width: 10,
        height: 30,
        backgroundColor: '#F59E0B',
        borderRadius: 5,
        bottom: '30%',
    },
    explosion: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EF4444',
        opacity: 0,
    },

    hudBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingBottom: 40 },
    
    lockBtn: {
        backgroundColor: 'rgba(0, 255, 204, 0.2)',
        borderWidth: 2,
        borderColor: '#00ffcc',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 4,
        marginBottom: 20,
    },
    lockText: { color: '#00ffcc', fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },

    sliderContainer: {
        width: 60,
        height: 200,
        borderWidth: 1,
        borderColor: '#00ffcc',
        backgroundColor: 'rgba(0, 255, 204, 0.1)',
        borderRadius: 4,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingVertical: 10,
    },
    sliderText: { color: '#00ffcc', fontFamily: 'Courier New', fontSize: 9, fontWeight: 'bold', marginBottom: 5 },
    sliderValue: { color: '#00ffcc', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' },
    track: {
        width: 10,
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        marginTop: 10,
        borderRadius: 5,
        justifyContent: 'flex-end'
    },
    fill: {
        width: '100%',
        backgroundColor: '#00ffcc',
        borderRadius: 5,
    },

    fireBtn: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF4444',
        justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#7F1D1D',
        elevation: 10, shadowColor: '#EF4444', shadowRadius: 15, shadowOpacity: 0.8,
        marginBottom: 20,
    },
    fireText: { color: '#FFF', fontFamily: 'Courier New', fontWeight: 'bold', fontSize: 18 }
});
