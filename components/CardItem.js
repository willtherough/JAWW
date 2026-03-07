import React, { useRef, useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated, View } from 'react-native';

const CardItem = ({ item, onPress, onLongPress, onTrustNode }) => {
    const hopCount = item.hops || 0;
    const prevHopCountRef = useRef(hopCount);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (prevHopCountRef.current < hopCount) {
            scaleAnim.setValue(1);
            glowAnim.setValue(0);
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.5, duration: 200, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true })
                ]),
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
                    Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: false })
                ])
            ]).start();
        }
        prevHopCountRef.current = hopCount;
    }, [hopCount]);

    const animatedGlow = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#00ff00', '#00ffff']
    });

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.forkedFrom && <Text style={{color:'#f59e0b', fontSize:14, fontWeight:'bold'}}>⑂</Text>}
            </View>
            <View style={styles.metaContainer}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Animated.Text style={{ color: animatedGlow, fontSize: 10, shadowColor: animatedGlow, shadowRadius: 10, fontWeight: 'bold' }}>
                        HOPS: {hopCount}
                    </Animated.Text>
                </Animated.View>

                {item.is_trusted === 1 ? (
                    <Text style={styles.verifiedBadge}>[ VERIFIED ]</Text>
                ) : (
                    <View style={styles.unverifiedContainer}>
                        <Text style={styles.unverifiedBadge}>[ UNVERIFIED ]</Text>
                        {item.author_id && (
                            <TouchableOpacity onPress={() => onTrustNode(item.author_id)}>
                                <Text style={styles.trustButton}>[ TRUST OP ]</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#111', margin: 10, padding: 15, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#00ff00' },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    verifiedBadge: {
        color: '#00ff00',
        fontFamily: 'Courier',
        fontWeight: 'bold',
        fontSize: 10,
    },
    unverifiedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unverifiedBadge: {
        color: '#666',
        fontFamily: 'Courier',
        fontWeight: 'bold',
        fontSize: 10,
    },
    trustButton: {
        color: '#00aaff',
        fontFamily: 'Courier',
        fontWeight: 'bold',
        fontSize: 10,
        marginLeft: 8,
    },
});

export default CardItem;
