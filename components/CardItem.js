import React, { useRef, useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const CardItem = ({ item, onPress, onLongPress, onTrustNode, activeUmpireEvent, manualUmpireSubmit }) => {
    if (!item) return null;

    const hopCount = parseInt(item?.hops || 0, 10);
    const prevHopCountRef = useRef(hopCount);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (prevHopCountRef.current < hopCount) {
            scaleAnim.setValue(1);
            glowAnim.setValue(0);
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true })
                ]),
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true })
                ])
            ]).start();
        }
        prevHopCountRef.current = hopCount;
    }, [hopCount]);

    // Matrix Green to bright Cyan pulse
    const animatedGlow = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#10B981', '#00ffff'] 
    });

    const isTrusted = item?.is_trusted === 1;

    return (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.8}
        >
            {/* --- HEADER: Title & Animated Hops --- */}
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item?.title || 'UNKNOWN INTEL'}</Text>
                    {item?.forkedFrom && (
                        <View style={styles.forkBadge}>
                            <Text style={styles.forkText}>⑂ FORKED</Text>
                        </View>
                    )}
                </View>

                {/* Animated Hop Pill */}
                <Animated.View style={[styles.hopPill, { transform: [{ scale: scaleAnim }], borderColor: animatedGlow }]}>
                    <Feather name="radio" size={12} color="#10B981" style={{ marginRight: 4 }} />
                    <Animated.Text style={[styles.hopText, { color: animatedGlow }]}>
                        {hopCount} HOPS
                    </Animated.Text>
                </Animated.View>
            </View>

            {/* --- BODY: Author / Origin Text --- */}
            <Text style={styles.authorText}>
                {item?.forkedFrom ? `Original Author: ${item.originalAuthor || 'Unknown'}` : `Author: ${item.author || item.genesis?.author_id || 'Unknown'}`}
            </Text>

            {/* --- NEW: EVENT INDICATOR BADGE --- */}
            {(item.event_id || (activeUmpireEvent && item.subject && item.subject === activeUmpireEvent.subject)) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 6, backgroundColor: '#0EA5E920', borderRadius: 4, alignSelf: 'flex-start' }}>
                    <Feather name="radio" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#38BDF8', fontWeight: 'bold', fontSize: 10, fontFamily: 'Courier' }}>
                        JAWW EVENT: {item.subject ? item.subject.toUpperCase() : 'INTEL'}
                    </Text>
                </View>
            )}

            {/* --- NEW: MANUAL SUBMIT OVERRIDE --- */}
            {(item.event_id === activeUmpireEvent?.id || (activeUmpireEvent && item.subject && item.subject === activeUmpireEvent.subject)) && manualUmpireSubmit && (
                <TouchableOpacity 
                    onPress={() => manualUmpireSubmit(item)}
                    style={{ marginTop: 10, backgroundColor: '#0EA5E9', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                >
                    <Feather name="upload-cloud" size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, fontFamily: 'Courier' }}>MANUAL SUBMIT</Text>
                </TouchableOpacity>
            )}

            {/* --- FOOTER: Verification & Trust --- */}
            <View style={styles.footer}>
                {isTrusted ? (
                    <View style={styles.statusBadge}>
                        <Feather name="shield" size={12} color="#10B981" />
                        <Text style={styles.verifiedText}>VERIFIED OP</Text>
                    </View>
                ) : (
                    <View style={styles.unverifiedContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: '#1E293B', borderColor: '#475569' }]}>
                            <Feather name="shield-off" size={12} color="#94A3B8" />
                            <Text style={styles.unverifiedText}>UNVERIFIED</Text>
                        </View>
                        {item?.author_id && (
                            <TouchableOpacity onPress={() => onTrustNode(item.author_id)} style={styles.trustBtn}>
                                <Feather name="star" size={12} color="#F59E0B" />
                                <Text style={styles.trustBtnText}>TRUST OP</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
        borderRadius: 6,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981', // Cryptographic Green Anchor
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        paddingRight: 10,
    },
    cardTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Courier',
        letterSpacing: 0.5,
    },
    forkBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
        marginTop: 2,
    },
    forkText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Courier',
    },
    hopPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    hopText: {
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Courier',
    },
    authorText: {
        color: '#94A3B8',
        fontSize: 12,
        fontFamily: 'Courier',
        marginBottom: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4,
    },
    verifiedText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Courier',
    },
    unverifiedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    unverifiedText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Courier',
    },
    trustBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: '#F59E0B',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4,
    },
    trustBtnText: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Courier',
    }
});

export default CardItem;
