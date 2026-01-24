import { CameraView, useCameraPermissions } from 'expo-camera';
import { Vibration } from 'react-native'; 
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, FlatList, StatusBar, Modal, Alert, Platform, StyleSheet, Dimensions, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import QRCode from 'react-native-qrcode-svg'; 
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg'; 

// --- NEW IMPORT ---
import BluetoothService from './services/BluetoothService';
import { grabCardFromDevice } from './services/Receiver';

// --- IMPORTS ---
import CreateCardModal from './components/CreateCardModal'; 
import ScannerModal from './components/ScannerModal'; 
import OracleModal from './components/OracleModal'; 
import IdentityModal from './components/IdentityModal'; 
import Onboarding from './components/Onboarding';
import { createCard } from './model/Schema';

// MODEL
import { loadLibrary, saveLibrary, loadProfile, saveProfile } from './model/Storage';
import { getOrGenerateKeys, signData, verifySignature } from './model/Security';

// --- SEED DATA ---
const DEFAULT_LIBRARY = [
  { 
      id: 'fit-001', title: 'The "Murph"', topic: 'fitness', hops: 55, author: 'COMMAND', 
      body: '1 Mile Run, 100 Pulls, 200 Push, 300 Squat, 1 Mile.',
      history: []
  }
];

// --- MOCK DATA ---
const MOCK_NEARBY_SIGNALS = [
    { 
      id: 'u1', handle: 'DAN_THE_MAN', rank: 45, dist: '2m',
      offer: { 
          id: 'ext-101', title: 'China Relations 72-Present', topic: 'education', 
          body: 'Nixon visit marked the shift.', author: 'DAN_THE_MAN', hops: 210, downloads: 2100,
          original_body: 'Nixon visit marked the shift.', 
          is_fork: true,
          history: []
      }
    }
];

const CATEGORY_MAP = {
  fitness: ['fitness', 'health', 'home_diy'], food: ['food', 'culinary', 'nutrition'], education: ['education', 'history', 'economics'],
  fun: ['fun', 'technology', 'survival'], professional: ['professional', 'military', 'leadership']
};
const getMajorCategory = (sub) => {
    const s = (sub||'').toLowerCase();
    if (CATEGORY_MAP.fitness.includes(s)) return 'fitness';
    if (CATEGORY_MAP.food.includes(s)) return 'food';
    if (CATEGORY_MAP.education.includes(s)) return 'education';
    if (CATEGORY_MAP.fun.includes(s)) return 'fun';
    return 'professional';
};

// --- MODALS ---
const ChainModal = ({ visible, card, onClose }) => {
    if (!visible || !card) return null;
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.modalTitle}>CHAIN OF CUSTODY</Text>
                    <Text style={{color:'#666', textAlign:'center', marginBottom:15, fontSize:10}}>CRYPTOGRAPHIC LEDGER (Ed25519)</Text>
                    <ScrollView style={{maxHeight: 300}}>
                        {(card.history || []).map((node, i) => (
                            <View key={i} style={{flexDirection:'row', marginBottom: 20}}>
                                <View style={{width: 30, alignItems:'center'}}>
                                    <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: i===0?'#f59e0b':'#00ff00', borderWidth:1, borderColor:'#fff'}} />
                                    {i < (card.history || []).length-1 && <View style={{width: 2, height: 40, backgroundColor: '#333', marginTop: 5}} />}
                                </View>
                                <View style={{marginLeft: 10, flex: 1}}>
                                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                        <Text style={{color:'#fff', fontWeight:'bold'}}>{node.user}</Text>
                                        <Text style={{color:'#00ff00', fontFamily:'Courier', fontSize:8, width: 80}} numberOfLines={1}>{node.signature}</Text>
                                    </View>
                                    <Text style={{color:'#666', fontSize:10}}>{node.date} • {node.action}</Text>
                                    {node.note && (
                                        <View style={{backgroundColor:'#1a1a1a', padding:8, marginTop:5, borderRadius:5, borderLeftWidth:2, borderColor:'#f59e0b'}}>
                                            <Text style={{color:'#ccc', fontSize:12, fontStyle:'italic'}}>"{node.note}"</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    <TouchableOpacity onPress={onClose} style={styles.btnOutline}>
                        <Text style={styles.btnTextGray}>CLOSE LEDGER</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const ContextModal = ({ visible, card, onClose, onSave }) => {
    const [note, setNote] = useState('');
    if (!visible) return null;
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.modalTitle}>ADD CONTEXT (FORK)</Text>
                    <TextInput 
                        style={styles.contextInput} 
                        multiline 
                        placeholder="What are you adding?"
                        placeholderTextColor="#444"
                        value={note}
                        onChangeText={setNote}
                    />
                    <TouchableOpacity onPress={() => onSave(note)} style={styles.btnPrimary}>
                        <Text style={styles.btnTextBlack}>SIGN & FORK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                        <Text style={styles.btnTextGray}>CANCEL</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const HandshakeModal = ({ visible, peer, onClose, onGrab, onVerify }) => {
    if (!visible || !peer) return null;
    const hasData = peer.offer && peer.offer.title;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.modalTitle}>INCOMING SIGNAL</Text>
                    <Text style={{color:'#00ff00', fontSize:16, textAlign:'center', marginBottom:15, fontFamily: 'Courier'}}>
                        SOURCE: {peer.handle || "UNKNOWN_DEVICE"}
                    </Text>

                    {hasData ? (
                        <>
                            <Text style={styles.hsCardTitle}>{peer.offer.title}</Text>
                            <View style={{flexDirection:'row', justifyContent:'center', marginBottom:10}}>
                                <Text style={{color:'#666', fontSize:10}}>
                                    HOPS: {peer.offer.hops || 0} • AUTH: {peer.offer.author || 'ANON'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => onGrab(peer.offer, 'fork')} style={styles.btnPrimary}>
                                <Text style={styles.btnTextBlack}>GRAB INTEL</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={{padding: 15, backgroundColor: '#1a0000', borderRadius: 8, marginBottom: 15, borderWidth:1, borderColor:'#330000'}}>
                            <Text style={{color: '#ff4444', textAlign: 'center', fontWeight:'bold'}}>
                                🚫 NO DATA PAYLOAD
                            </Text>
                            <Text style={{color: '#666', textAlign: 'center', fontSize: 10, marginTop: 5}}>
                                (Civilian Device / Passive Signal)
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                        <Text style={styles.textGray}>IGNORE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [profile, setProfile] = useState({ handle: null, publicKey: null });
  const [activeTab, setActiveTab] = useState('created'); 
  const [activeTopicFilter, setActiveTopicFilter] = useState(null); 
  const [viewMode, setViewMode] = useState('wheel'); 
  const [detectedUsers, setDetectedUsers] = useState([]);
  const [activePeer, setActivePeer] = useState(null); 
  const [selectedCard, setSelectedCard] = useState(null); 
  const [cardToFork, setCardToFork] = useState(null); 
  const [chainCard, setChainCard] = useState(null); 

  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false); 
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isOracleVisible, setIsOracleVisible] = useState(false);

  useEffect(() => {
    const boot = async () => {
      // --- 1. IDENTITY ---
      const keys = await getOrGenerateKeys();
      if (keys) {
         console.log("🆔 PUBLIC KEY:", keys.publicKey);
         setProfile(prev => ({ ...prev, publicKey: keys.publicKey }));
      }

      // --- 2. LOAD DATA ---
      const savedProfile = await loadProfile();
      let savedCards = await loadLibrary(); 
      if (!savedCards || savedCards.length === 0) { 
          savedCards = DEFAULT_LIBRARY; 
          await saveLibrary(savedCards); 
      }
      if (savedProfile && savedProfile.handle) {
          setProfile(prev => ({ ...prev, ...savedProfile }));
      }
      setCards(savedCards); 
      setIsLoading(false);
      
      // DELETED: BluetoothService.startScanning(...) 
      // The radar is now silent by default.
    };

    boot();

    // CLEANUP: Stop everything when app closes
    return () => {
        BluetoothService.stopScanning();
        BluetoothService.stopBroadcasting();
    };
  }, []);

  const updateLibrary = (newCards) => { setCards(newCards); saveLibrary(newCards); };
  
  // --- BROADCAST TOGGLE ---
  const toggleBroadcast = async () => {
      if (viewMode === 'broadcast') {
          // Turning OFF
          await BluetoothService.stopBroadcasting();
          setViewMode('wheel');
      } else {
          // Turning ON
          // TEST: We grab the first card from your "Knowledge" list
          const cardToSend = cards.find(c => c.genesis && c.genesis.author_id === profile.handle);
          
          if (cardToSend) {
            console.log(">> UI: Broadcasting Card:", cardToSend.title);
            await BluetoothService.startBroadcasting(profile.handle, cardToSend);
          } else {
            console.log(">> UI: No cards to send. Broadcasting Identity.");
            await BluetoothService.startBroadcasting(profile.handle);
          }
          
          setViewMode('broadcast');
      }
  };

  // THE NEW "PING" HANDLER
  const handleActivateRadar = () => {
      console.log(">> UI: Radar Activated by User");
      
      // Start the Service (Real or Sim)
      BluetoothService.startScanning((device) => {
          setDetectedUsers(prev => {
              const exists = prev.find(u => u.id === device.id);
              if (exists) {
                  // Update distance/RSSI
                  return prev.map(u => u.id === device.id ? { ...u, dist: device.rssi, _rawDevice: device } : u);
              } else {
                  // Add new blip
                  return [...prev, {
                      id: device.id,
                      handle: (device.name || "UNKNOWN_SIG").substring(0, 12),
                      rank: Math.floor(Math.random() * 50), 
                      dist: device.rssi, 
                      offer: { title: "Signal Detected...", author: "..." }, 
                      _rawDevice: device 
                  }];
              }
          });
      });
  };

  const handleCreateCard = async (c) => {
    try {
      // 1. MAP LEGACY TOPIC TO NEW TAXONOMY
      // If user typed "football", we turn it into "human/sports/football"
      // If no topic, we default to "human/general"
      const cleanTopic = c.topic ? c.topic.toLowerCase().replace(/\s+/g, '_') : 'general';
      const taxonomyPath = `human/${cleanTopic}`;

      // 2. CREATE THE V2 SMART CARD
      // This runs the "PhotoDNA" hash check automatically.
      const newCard = await createCard(profile.handle, c.title, c.body, taxonomyPath);

      // 3. SIGN THE GENESIS BLOCK (Proof of Authorship)
      // We sign the 'genesis' object so we can prove who started this chain.
      const signature = await signData(JSON.stringify(newCard.genesis));
      newCard.genesis.signature = signature;

      // 4. SAVE & UPDATE UI
      const updatedCards = [newCard, ...cards];
      setCards(updatedCards);       // Update Screen
      await saveLibrary(updatedCards); // Save to V2 Storage
      
      setIsCreateVisible(false); // Close Modal

    } catch (error) {
      // This catches the "Safety Protocol" errors (Banned Content)
      alert(`Security Alert: ${error.message}`);
    }
  };

  const handleGrabCard = async (offer, version) => {
      // 1. GET THE RAW DEVICE
      // We stored this in activePeer._rawDevice in the step above
      const targetDevice = activePeer?._rawDevice;

      if (!targetDevice) {
          Alert.alert("Error", "Signal lost. Cannot connect.");
          return;
      }

      console.log(">> STARTING DOWNLOAD FROM:", targetDevice.id);
      setIsLoading(true); // Show spinner/loading state

      // 2. TRIGGER THE RECEIVER (The Mitt)
      grabCardFromDevice(
          targetDevice,
          (percent) => console.log(`>> DOWNLOADING: ${percent}%`), // Optional: Add a UI progress bar later
          async (card, error) => {
              setIsLoading(false);
              
              if (error) {
                  Alert.alert("Transfer Failed", "Could not complete the handshake.");
                  console.error(error);
                  return;
              }

              if (card) {
                  // 3. SUCCESS - WE HAVE THE INTEL
                  // Now we verify and save it using your Phase 4 Schema
                  
                  // A. Add "Received" Metadata
                  const newCard = { 
                      ...card, 
                      received_at: new Date().toISOString(), 
                      hops: (card.hops || 0) + 1,
                      // We track that we downloaded this
                      history: [
                          ...(card.history || []), 
                          { date: new Date().toISOString().split('T')[0], user: profile.handle, action: 'DOWNLOADED' }
                      ]
                  };

                  // B. Save to Library
                  updateLibrary([newCard, ...cards]);
                  
                  // C. Close UI
                  setActivePeer(null);
                  Alert.alert("SECURE TRANSFER COMPLETE", `Acquired: ${newCard.title}`);
              }
          }
      );
  };

  const handleForkCard = async (originalCard, contextNote) => {
      const payload = { action: 'FORK', parent_id: originalCard.id, note: contextNote };
      const signature = await signData(payload);

      const newHistory = [ ...(originalCard.history || []), { date: new Date().toISOString().split('T')[0], user: profile.handle, action: 'FORKED', note: contextNote, signature: signature }];
      const newCard = { ...originalCard, id: Date.now().toString(), author: profile.handle, created_at: new Date().toISOString(), history: newHistory };
      updateLibrary([newCard, ...cards]);
      setCardToFork(null); setSelectedCard(null); 
      Alert.alert("Fork Complete", "New crypto-signature generated.");
  };

  const handleRealScan = async (scannedData) => {
      const genesisEntry = scannedData.history && scannedData.history[0];
      if (!genesisEntry || !genesisEntry.signature) {
          Alert.alert("Security Alert", "This card lacks a valid digital signature. Discarding.");
          setIsScannerVisible(false);
          return;
      }
      const alreadyExists = cards.find(c => c.id === scannedData.id);
      if (alreadyExists) {
          Alert.alert("Duplicate Intel", `You already have "${scannedData.title}" in your library.`);
          setIsScannerVisible(false);
          return;
      }
      const newCard = { ...scannedData, received_at: new Date().toISOString(), hops: (scannedData.hops || 0) + 1, read: false };
      updateLibrary([newCard, ...cards]);
      setIsScannerVisible(false);
      setTimeout(() => { Alert.alert("Verified Intel", `Successfully decrypted & verified:\n${newCard.title}`); }, 500);
  };

  const expertise = React.useMemo(() => {
    const s = {};
    cards.forEach(c => { const m = getMajorCategory(c.topic); s[m] = (s[m]||0) + 5 + ((c.hops||1)-1)*2; });
    return s;
  }, [cards]);
  const SECTIONS = [ {id:'food',label:'FOOD',angle:0}, {id:'education',label:'EDU',angle:72}, {id:'fitness',label:'FIT',angle:144}, {id:'professional',label:'PRO',angle:216}, {id:'fun',label:'FUN',angle:288} ];
  const WHEEL_SIZE = 380; const CENTER = WHEEL_SIZE/2; const RADIUS = (WHEEL_SIZE/2)-10;

  const handleWheelTap = (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const dx = locationX - CENTER, dy = locationY - CENTER;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 55) { setIsProfileVisible(true); return; }
      if (dist > RADIUS) { setActiveTopicFilter(null); return; }
      let angle = Math.atan2(dy, dx) * (180/Math.PI) + 90; 
      if (angle < 0) angle += 360;
      const idx = Math.floor(angle/72);
      const target = SECTIONS[idx>=5?0:idx].id;
      setActiveTopicFilter(activeTopicFilter === target ? null : target);
  };
  
  const polarToCartesian = (cx, cy, r, ang) => { const a = (ang-90)*Math.PI/180; return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}; }
  const describeArc = (x, y, r, start, end) => {
      const s = polarToCartesian(x,y,r,end); const e = polarToCartesian(x,y,r,start); const f = end-start<=180?"0":"1";
      return ["M",s.x,s.y,"A",r,r,0,f,0,e.x,e.y,"L",x,y,"L",s.x,s.y].join(" ");
  }

  const filteredCards = React.useMemo(() => {
    let l = cards;

    // HELPER: Get the author ID regardless of V1 or V2 format
    const getAuthor = (c) => c.author || (c.genesis && c.genesis.author_id);

    if (activeTab === 'created') {
        // Show cards where I AM the author
        l = l.filter(c => getAuthor(c) === profile.handle);
    } else {
        // Show cards where I am NOT the author
        l = l.filter(c => getAuthor(c) !== profile.handle);
    }

    if (activeTopicFilter) {
        l = l.filter(c => getMajorCategory(c.topic || (c.path ? c.path.split('/')[1] : 'general')) === activeTopicFilter);
    }

    return l.sort((a,b) => (b.hops||1) - (a.hops||1));
  }, [cards, activeTopicFilter, activeTab, profile]);

  if (isLoading) return <View style={styles.center}><Text style={styles.textGreen}>Loading...</Text></View>;
  if (!profile.handle) return <Onboarding visible={true} onComplete={async (p) => { 
      const keys = await getOrGenerateKeys(); 
      await saveProfile({...p, ...keys}); 
      setProfile({...p, ...keys}); 
  }} />;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER - Updated to use toggleBroadcast */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={toggleBroadcast} 
            style={[styles.broadcastBtnCompact, viewMode === 'broadcast' && {borderColor:'#00ff00', backgroundColor:'#003300'}]}>
            <Text style={[styles.broadcastText, viewMode === 'broadcast' && {color:'#00ff00'}]}>
                {viewMode === 'broadcast' ? '(( ON AIR ))' : '📡 BROADCAST'}
            </Text>
        </TouchableOpacity>
        <Text style={styles.headerRank}>OP: {profile.handle.substring(0,8).toUpperCase()}</Text>
      </View>

      {/* VIEW SWITCHER - Stop Broadcasting when closing view */}
      {viewMode === 'broadcast' && (
          <View style={{flex: 1, padding: 20, alignItems:'center', justifyContent:'center'}}>
              <Text style={{color:'#00ff00', fontSize: 24, fontWeight:'bold', marginBottom:10}}>BROADCASTING</Text>
              <Text style={{color:'#666', marginBottom: 40}}>Beacon Active. Offering {cards.length} cards.</Text>
              <View style={styles.radarScreen}>
                  <View style={[styles.radarCircle, {width: 100, height: 100, borderRadius: 50, borderColor:'#00ff00', borderWidth:2}]} />
                  <View style={{position:'absolute'}}><Text style={{fontSize:40}}>📡</Text></View>
              </View>
              <TouchableOpacity onPress={toggleBroadcast} style={styles.btnOutline}><Text style={styles.textGray}>STOP BROADCAST</Text></TouchableOpacity>
          </View>
      )}

      {viewMode === 'radar' && (
          <View style={{flex: 1, padding: 20}}>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 20}}>
                  <Text style={styles.titleText}>LOCAL SIGNALS</Text>
                  <TouchableOpacity onPress={() => setViewMode('wheel')}><Text style={styles.textGray}>CLOSE</Text></TouchableOpacity>
              </View>
              <View style={styles.radarScreen}>
                  {detectedUsers.map((u, i) => (
                      <TouchableOpacity key={u.id} style={[styles.radarDot, { top: 80 + (i*50), left: 60 + (i*60) }]} onPress={() => setActivePeer(u)}>
                          <View style={styles.radarBlip}><Text>👤</Text></View>
                          <Text style={styles.blipText}>{u.handle}</Text>
                      </TouchableOpacity>
                  ))}
              </View>
              
              {/* FIXED: Removed the stray comment that was here */}
              <TouchableOpacity onPress={handleActivateRadar} style={styles.btnPrimary}>
                  <Text style={styles.btnTextBlack}>PING SURROUNDINGS</Text>
              </TouchableOpacity>          
          </View>
      )}

      {viewMode === 'wheel' && (
          <>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
                <Pressable onPress={handleWheelTap} style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
                    <View pointerEvents="none">
                        <Svg height={WHEEL_SIZE} width={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
                            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#333" strokeWidth="1" />
                            {SECTIONS.map((section) => {
                                const score = expertise[section.id] || 0;
                                const isSelected = activeTopicFilter === section.id;
                                const path = describeArc(CENTER, CENTER, RADIUS - 5, section.angle + 2, section.angle + 70); 
                                const labelPos = polarToCartesian(CENTER, CENTER, RADIUS - 40, section.angle + 36);
                                return (
                                    <G key={section.id}>
                                        <Path d={path} fill="none" stroke={isSelected?'#fff':'none'} strokeWidth="2" opacity={1} />
                                        <Path d={path} fill={score?'#336633':'#1a1a1a'} stroke="none" opacity={isSelected?0:0.6} /> 
                                        <SvgText x={labelPos.x} y={labelPos.y} fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{section.label}</SvgText>
                                        <SvgText x={labelPos.x} y={labelPos.y + 14} fill="#ccc" fontSize="9" textAnchor="middle" alignmentBaseline="middle">Lvl {Math.floor(score/5)}</SvgText>
                                    </G>
                                );
                            })}
                            <Circle cx={CENTER} cy={CENTER} r={55} fill="#000" stroke="#333" strokeWidth="2" />
                            <SvgText x={CENTER} y={CENTER - 5} fill="#fff" fontSize={18} fontWeight="900" textAnchor="middle" alignmentBaseline="middle">{profile.handle.substring(0,8).toUpperCase()}</SvgText>
                        </Svg>
                    </View>
                </Pressable>
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => setActiveTab('created')} style={[styles.tab, activeTab==='created' && styles.activeTab]}><Text style={[styles.tabText, activeTab==='created' && {color:'#fff'}]}>MY KNOWLEDGE</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('learned')} style={[styles.tab, activeTab==='learned' && styles.activeTab]}><Text style={[styles.tabText, activeTab==='learned' && {color:'#fff'}]}>LEARNED</Text></TouchableOpacity>
            </View>
            {activeTopicFilter && <View style={styles.filterBar}><Text style={{color:'#00ff00', fontWeight:'bold'}}>SECTOR: {activeTopicFilter.toUpperCase()}</Text><TouchableOpacity onPress={()=>setActiveTopicFilter(null)}><Text style={{color:'#f00'}}>X</Text></TouchableOpacity></View>}
            <FlatList data={filteredCards} keyExtractor={i=>i.id} contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 100}} renderItem={({item}) => (
                <TouchableOpacity onPress={()=>setSelectedCard(item)} style={styles.card}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
<View style={{flexDirection:'row', justifyContent:'space-between'}}>
  <Text style={{color:'#666', fontSize:10}}>
{/* Checks if path exists AND has a slash before splitting */}
{(item.path && item.path.includes('/') ? item.path.split('/')[1] : (item.topic || 'GENERAL')).toUpperCase()}
</Text>
  <Text style={{color:'#00ff00', fontSize:10}}>HOPS: {item.hops || 0}</Text>
</View>
                </TouchableOpacity>
            )} />
          </>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => setIsOracleVisible(true)} style={styles.footBtn}><Text style={styles.footText}>ORACLE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsScannerVisible(true)} style={styles.footBtn}><Text style={styles.footText}>SCAN QR</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setIsCreateVisible(true)} style={styles.footBtnMain}><Text style={styles.footTextMain}>+ CREATE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode(viewMode==='radar'?'wheel':'radar')} style={styles.footBtn}><Text style={[styles.footText, viewMode==='radar'&&{color:'#00ff00'}]}>RADAR</Text></TouchableOpacity>
      </View>

      {/* MODALS */}
      <ContextModal visible={!!cardToFork} card={cardToFork} onClose={() => setCardToFork(null)} onSave={(note) => handleForkCard(cardToFork, note)} />
      <ChainModal visible={!!chainCard} card={chainCard} onClose={() => setChainCard(null)} />
      
      <HandshakeModal visible={!!activePeer} peer={activePeer} onClose={() => setActivePeer(null)} 
        onGrab={handleGrabCard} 
        onVerify={(offer) => setChainCard(offer)} 
      />
      
      <CreateCardModal visible={isCreateVisible} onClose={()=>setIsCreateVisible(false)} onSave={handleCreateCard} />
      
      <Modal visible={!!selectedCard} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>{selectedCard?.title}</Text>
                  <Text style={styles.cardBody}>{selectedCard?.body}</Text>
                  <View style={{ alignItems: 'center', marginVertical: 20 }}>
                      {selectedCard?.id ? (
                          <QRCode 
                              value={JSON.stringify(selectedCard)} 
                              size={150}
                              color="black"
                              backgroundColor="white"
                          />
                      ) : null}
                  </View>
                  <View style={{flexDirection:'row', marginTop: 20, justifyContent:'space-between'}}>
                      <TouchableOpacity onPress={() => { setChainCard(selectedCard); setSelectedCard(null); }} style={styles.btnSmallOutline}>
                          <Text style={styles.btnTextGray}>⛓ CHAIN OF CUSTODY</Text>
                      </TouchableOpacity>
                      
                      {selectedCard?.author !== profile.handle && (
                         <TouchableOpacity onPress={() => { setCardToFork(selectedCard); setSelectedCard(null); }} style={styles.btnSmallGreen}>
                             <Text style={styles.btnTextBlack}>+ ADD CONTEXT</Text>
                         </TouchableOpacity>
                      )}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedCard(null)} style={[styles.btnCancel, {marginTop:20}]}><Text style={styles.btnTextGray}>CLOSE</Text></TouchableOpacity>
              </View>
          </View>
      </Modal>

      <ScannerModal 
        visible={isScannerVisible} 
        onClose={()=>setIsScannerVisible(false)} 
        onScanSuccess={handleRealScan} 
      />

      <OracleModal visible={isOracleVisible} onClose={()=>setIsOracleVisible(false)} library={cards} />
      <IdentityModal visible={isProfileVisible} onClose={()=>setIsProfileVisible(false)} profile={profile} library={cards} onReset={async()=>{await AsyncStorage.clear();}} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  textGreen: { color: '#00ff00' },
  textGray: { color: '#666' },
  textGreenBold: { color: '#00ff00', fontWeight: 'bold' },
  titleText: { color: '#fff', fontSize: 20, fontWeight:'bold' },
  
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderColor: '#222' },
  broadcastBtnCompact: { backgroundColor: '#222', padding: 8, borderRadius: 5, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#333' },
  broadcastText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  headerRank: { color: '#666', fontWeight: 'bold', fontFamily: 'Courier' },
  
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#222', marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#00ff00' },
  tabText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, marginHorizontal: 20, backgroundColor: '#111', borderRadius: 5, marginBottom: 10, borderWidth: 1, borderColor: '#00ff00' },
  
  card: { backgroundColor: '#111', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 3, borderColor: '#333' },
  cardTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  cardBody: { color: '#ccc', lineHeight: 20 },
  hsCardTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  
  footer: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', padding: 15, justifyContent: 'space-between', backgroundColor: '#000', borderTopWidth: 1, borderColor: '#222' },
  footBtn: { padding: 5, flex: 1, alignItems: 'center', justifyContent: 'center' },
  footBtnMain: { padding: 10, flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#003300', borderRadius: 5, marginHorizontal: 5, borderWidth: 1, borderColor: '#00ff00' },
  footText: { color: '#666', fontWeight: 'bold', fontSize: 10 },
  footTextMain: { color: '#00ff00', fontWeight: 'bold', fontSize: 10 },
  
  radarScreen: { height: 350, backgroundColor: '#001100', borderRadius: 150, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#003300', marginVertical: 20 },
  radarCircle: { position: 'absolute', borderWidth: 1 },
  radarDot: { position: 'absolute', alignItems: 'center' },
  radarBlip: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#005500', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#fff' },
  blipText: { color:'#00ff00', fontSize: 10, position:'absolute', top: 45, width: 120, fontWeight:'bold' },
  
  btnPrimary: { backgroundColor: '#00ff00', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnOutline: { borderWidth: 1, borderColor: '#666', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnSmallGreen: { backgroundColor: '#005500', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#00ff00' },
  btnSmallOutline: { borderWidth: 1, borderColor: '#666', padding: 10, borderRadius: 5 },
  btnCancel: { alignItems: 'center', padding: 10 },
  btnTextBlack: { color: '#000', fontWeight: 'bold' },
  btnTextGray: { color: '#666', fontWeight: 'bold' },
  
  // HANDSHAKE
  hsBtnSmall: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  dlOption: { padding: 15, borderWidth: 1, borderColor: '#00ff00', borderRadius: 10, marginBottom: 15, backgroundColor:'#002200' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#222', padding: 30, borderRadius: 12, width: '90%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  contextInput: { backgroundColor: '#333', color: '#fff', padding: 10, height: 100, textAlignVertical: 'top', borderRadius: 5, marginBottom: 20, fontFamily: 'Courier' }
});