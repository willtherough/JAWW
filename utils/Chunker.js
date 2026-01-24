// utils/Chunker.js
// THE MEAT GRINDER v1.0
// Slices large cards into tiny Bluetooth packets and rebuilds them.

const PACKET_LIMIT = 24; // Bytes per packet (Safe for BLE Legacy Advertising)

// --- 1. SLICE (Server Side) ---
export const chunkData = (dataString) => {
  // 1. Clean the string (remove excessive whitespace to save space)
  const cleanData = dataString.trim();
  
  // 2. Calculate chunks
  const totalLength = cleanData.length;
  // We reserve ~6 chars for header "01/10|"
  const payloadSize = PACKET_LIMIT - 6; 
  const totalChunks = Math.ceil(totalLength / payloadSize);
  
  const chunks = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * payloadSize;
    const end = start + payloadSize;
    const chunkBody = cleanData.slice(start, end);
    
    // HEADER FORMAT: "Index/Total|Body"
    // e.g. "1/5|Hello"
    const header = `${i + 1}/${totalChunks}|`;
    const packet = header + chunkBody;
    
    chunks.push(packet);
  }
  
  return chunks;
};

// --- 2. STITCH (Client Side) ---
export const reassembleData = (packets) => {
  // packets is an array of strings: ["1/3|Hell", "2/3|o Wo", "3/3|rld"]
  
  if (!packets || packets.length === 0) return null;

  // 1. Sort by Index
  // We extract the number before the slash "1" from "1/5|"
  const sorted = packets.sort((a, b) => {
    const indexA = parseInt(a.split('/')[0]);
    const indexB = parseInt(b.split('/')[0]);
    return indexA - indexB;
  });

  // 2. Validate Completeness
  const firstHeader = sorted[0].split('|')[0]; // "1/5"
  const totalNeeded = parseInt(firstHeader.split('/')[1]); // "5"
  
  // Get unique indices (in case we scanned the same packet twice)
  const uniqueIndices = new Set(sorted.map(p => p.split('/')[0]));
  
  if (uniqueIndices.size < totalNeeded) {
    // Return null if we are still missing pages
    // The UI will show "Receiving: 40%"
    return null; 
  }

  // 3. Stitch
  let fullString = "";
  sorted.forEach(p => {
    const parts = p.split('|');
    // Join everything after the pipe (in case body has pipes)
    const body = parts.slice(1).join('|'); 
    fullString += body;
  });

  return fullString;
};

// --- 3. PROGRESS CHECKER (For UI) ---
export const checkProgress = (packets) => {
  if (!packets || packets.length === 0) return 0;
  
  // Parse the total from the first packet we have
  const firstHeader = packets[0].split('|')[0]; // "1/5"
  const totalNeeded = parseInt(firstHeader.split('/')[1]);
  
  const uniqueIndices = new Set(packets.map(p => p.split('/')[0]));
  
  return (uniqueIndices.size / totalNeeded);
};