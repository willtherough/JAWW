import * as SQLite from 'expo-sqlite';
import { expandQuery } from './Brain';

/**
 * Calculates the 'Unique Downstream Reach' from a card's history array.
 * This function builds a Directed Acyclic Graph (DAG) to represent transfers
 * and performs a traversal (BFS) to count all unique nodes reachable from the author.
 * This method is robust against cycles (ping-pong attacks).
 *
 * @param {Array|string} history - The card's history, as an array or JSON string.
 * @returns {number} The total count of unique public keys reached, excluding the author.
 */
export const calculateDepthScore = (history) => {
  let historyArray = [];
  if (typeof history === 'string') {
    try {
      historyArray = JSON.parse(history);
    } catch (e) {
      console.error("Failed to parse history JSON:", e);
      return 0;
    }
  } else if (Array.isArray(history)) {
    historyArray = history;
  }

  if (!historyArray || historyArray.length === 0) {
    return 0;
  }

  const adj = new Map();
  let author = null;

  // Find author and build adjacency list
  for (const entry of historyArray) {
    if (entry.action === 'CREATED' && entry.to) {
      author = entry.to;
    } else if (entry.action === 'TRANSFER' || entry.action === 'SHARED' || entry.action === 'RECEIVED') {
      const from = entry.from;
      const to = entry.user || entry.to; // Handle different key names for recipient

      // The first sender is the author if CREATED action is missing
      if (!author && from) {
        author = from;
      }

      if (from && to) {
        if (!adj.has(from)) {
          adj.set(from, []);
        }
        adj.get(from).push(to);
      }
    }
  }

  if (!author) {
    return 0; // No author found, cannot calculate score.
  }

  const visited = new Set();
  const queue = [author];

  // BFS traversal to find all reachable nodes
  while (queue.length > 0) {
    const currentNode = queue.shift();
    if (visited.has(currentNode)) {
      continue;
    }
    visited.add(currentNode);
    const neighbors = adj.get(currentNode) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  // Return the number of unique nodes reached, excluding the author.
  return visited.has(author) ? visited.size - 1 : visited.size;
};


console.log(">> DB MODULE INITIALIZED <<");
const db = SQLite.openDatabaseSync('thesource.db');

export const initDB = async () => {
  try {
    // --- FTS RESET & SCHEMA SETUP ---
    console.log(">> DB: Initializing with FTS reset...");

    // 1. Force-drop the FTS table to start fresh
    await db.execAsync("DROP TABLE IF EXISTS fts_cards;");

    // 2. Main schema creation (tables and indexes)
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS trusted_sources ( id INTEGER PRIMARY KEY NOT NULL, uid TEXT UNIQUE NOT NULL, handle TEXT NOT NULL, publicKey TEXT NOT NULL, timestamp TEXT NOT NULL );
      CREATE TABLE IF NOT EXISTS known_peers ( public_key TEXT PRIMARY KEY NOT NULL, handle TEXT NOT NULL, last_seen INTEGER );
      CREATE TABLE IF NOT EXISTS cards ( id TEXT PRIMARY KEY NOT NULL, title TEXT, body TEXT, topic TEXT, subject TEXT, author_id TEXT, timestamp INTEGER, hops INTEGER DEFAULT 0, genesis TEXT, history TEXT, forkedFrom TEXT, depth_score INTEGER DEFAULT 0, hop_count INTEGER DEFAULT 0, network_reach INTEGER DEFAULT 1, parent_id TEXT, parent_hash TEXT, event_id TEXT );
      CREATE TABLE IF NOT EXISTS transfers ( id INTEGER PRIMARY KEY NOT NULL, cardId TEXT NOT NULL, recipientHandle TEXT NOT NULL, timestamp TEXT NOT NULL );
      CREATE TABLE IF NOT EXISTS local_blocklist (public_key TEXT PRIMARY KEY NOT NULL, blocked_at TEXT NOT NULL, reason TEXT);
      CREATE TABLE IF NOT EXISTS quarantined_hashes (hash TEXT PRIMARY KEY NOT NULL, quarantined_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_cards_author_timestamp ON cards(author_id, timestamp);
    `);

    // Create Umpire Sync Queue Table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS umpire_sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT NOT NULL,
        umpire_subject TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        timestamp INTEGER
      );
    `);

    const applyMigrations = async (db) => {
      // 1. Hop Count
      try {
        await db.execAsync(`ALTER TABLE cards ADD COLUMN hop_count INTEGER DEFAULT 0;`);
        console.log(">> MIGRATION: Added hop_count");
      } catch (e) { /* Silently ignore */ }

      // 2. Network Reach
      try {
        await db.execAsync(`ALTER TABLE cards ADD COLUMN network_reach INTEGER DEFAULT 1;`);
        console.log(">> MIGRATION: Added network_reach");
      } catch (e) { /* Silently ignore */ }

      // 3. Create the Events table (The Folders)
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY NOT NULL, 
            name TEXT NOT NULL, 
            timestamp INTEGER, 
            is_umpire INTEGER DEFAULT 0,
            my_authored_count INTEGER DEFAULT 0, 
            my_network_reach INTEGER DEFAULT 0
          );
        `);
        console.log(">> MIGRATION: Ensured events table exists");
      } catch (e) { console.error("Event table creation failed", e); }

      // 4. Add the Event ID to the Cards table (The Link)
      try {
        await db.execAsync(`ALTER TABLE cards ADD COLUMN event_id TEXT;`);
        console.log(">> MIGRATION: Added event_id to cards");
      } catch (e) { /* Silently ignore */ }

      // 5. Add is_umpire flag to Events table for existing users
      try {
        await db.execAsync(`ALTER TABLE events ADD COLUMN is_umpire INTEGER DEFAULT 0;`);
        console.log(">> MIGRATION: Added is_umpire to events table");
      } catch (e) { /* Silently ignore */ }

      // 6. Add lineage columns for variants
      try {
        await db.execAsync(`ALTER TABLE cards ADD COLUMN parent_id TEXT;`);
        console.log(">> MIGRATION: Added parent_id to cards");
      } catch (e) { /* Silently ignore */ }
      try {
        await db.execAsync(`ALTER TABLE cards ADD COLUMN parent_hash TEXT;`);
        console.log(">> MIGRATION: Added parent_hash to cards");
      } catch (e) { /* Silently ignore */ }

      // 7. Add depth_score for robust DAG-based reputation
      try {
        await db.execAsync(`ALTER TABLE cards ADD COLUMN depth_score INTEGER DEFAULT 0;`);
        console.log(">> MIGRATION: Added depth_score to cards");
      } catch (e) { /* Silently ignore */ }
    };

    // PULL THE TRIGGER HERE
    await applyMigrations(db);

    // Safe ALTER TABLE for trusted_sources
    try {
      await db.execAsync("ALTER TABLE trusted_sources ADD COLUMN profile_json TEXT;");
      console.log(">> DB: Column 'profile_json' added to trusted_sources.");
    } catch (e) {
      console.log(">> DB: Column 'profile_json' likely already exists.");
    }

    // 3. Add 'subject' column, ignoring errors if it exists
    try {
      await db.execAsync("ALTER TABLE cards ADD COLUMN subject TEXT;");
      console.log(">> DB: 'subject' column added to cards table.");
    } catch (e) {
      console.log(">> DB: 'subject' column likely already exists, skipping.");
    }

    // Add 'is_broadcast_enabled' column, ignoring errors if it exists
    try {
      await db.execAsync("ALTER TABLE cards ADD COLUMN is_broadcast_enabled INTEGER DEFAULT 0;");
      console.log(">> DB: 'is_broadcast_enabled' column added to cards table.");
    } catch (e) {
      console.log(">> DB: 'is_broadcast_enabled' column likely already exists, skipping.");
    }

    // NEW: Reconcile the queue before rebuilding FTS
    await reconcileUmpireQueue();

    // 4. Re-create FTS from a clean slate
    await db.execAsync("CREATE VIRTUAL TABLE fts_cards USING fts5(title, body, topic, subject, content='cards');");

    // Drop all possible old triggers before creating new ones
    await db.execAsync(`
        DROP TRIGGER IF EXISTS cards_after_insert;
        DROP TRIGGER IF EXISTS cards_after_delete;
        DROP TRIGGER IF EXISTS cards_after_update;
        DROP TRIGGER IF EXISTS cards_ai;
        DROP TRIGGER IF EXISTS cards_ad;
        DROP TRIGGER IF EXISTS cards_au;
    `);

    await db.execAsync(`CREATE TRIGGER cards_after_insert AFTER INSERT ON cards BEGIN INSERT INTO fts_cards(rowid, title, body, topic, subject) VALUES (new.rowid, new.title, new.body, new.topic, new.subject); END;`);
    await db.execAsync(`CREATE TRIGGER cards_after_delete AFTER DELETE ON cards BEGIN INSERT INTO fts_cards(fts_cards, rowid, title, body, topic, subject) VALUES ('delete', old.rowid, old.title, old.body, old.topic, old.subject); END;`);
    await db.execAsync(`CREATE TRIGGER cards_after_update AFTER UPDATE ON cards BEGIN INSERT INTO fts_cards(fts_cards, rowid, title, body, topic, subject) VALUES ('delete', old.rowid, old.title, old.body, old.topic, old.subject); INSERT INTO fts_cards(rowid, title, body, topic, subject) VALUES (new.rowid, new.title, new.body, new.topic, new.subject); END;`);

    // 5. Re-index and audit
    await db.execAsync("INSERT INTO fts_cards(fts_cards) VALUES('rebuild');");

    const cardsCountResult = await db.getFirstAsync('SELECT COUNT(*) as count FROM cards');
    const cardsCount = cardsCountResult ? cardsCountResult.count : 0;
    const ftsCountResult = await db.getFirstAsync('SELECT count(*) as count FROM fts_cards');
    const ftsCount = ftsCountResult ? ftsCountResult.count : 0;

    console.log(`>> DB: ${cardsCount} cards found, ${ftsCount} cards indexed.`);
    console.log(">> DB: FTS RESET SUCCESSFUL");

  } catch (error) {
    console.error(">> DB Init Failed:", error);
  }
};

// --- Trusted Sources Functions (unchanged) ---

export const insertTrustedSource = async (source) => {
  const { uid, handle, publicKey, timestamp, profile_json } = source;
  try {
    const result = await db.runAsync(
      `INSERT OR REPLACE INTO trusted_sources (uid, handle, publicKey, timestamp, profile_json) VALUES (?, ?, ?, ?, ?);`,
      [uid, handle, publicKey, timestamp, profile_json || '{}']
    );
    return result;
  } catch (error) {
    console.error(">> Insert Failed:", error);
    throw error;
  }
};

export const fetchTrustedSources = async () => {
  try {
    const allRows = await db.getAllAsync('SELECT * FROM trusted_sources');
    return allRows;
  } catch (error) {
    console.error(">> Fetch Failed:", error);
    return [];
  }
};

export const removeTrustedSource = async (publicKey) => {
  try {
    const result = await db.runAsync(
      `DELETE FROM trusted_sources WHERE publicKey = ?;`,
      [publicKey]
    );
    console.log(`>> DB: Removed trusted source ${publicKey}. Changes: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(">> Remove Failed:", error);
    throw error;
  }
};

export const isSourceTrusted = async (publicKey) => {
  try {
    const row = await db.getFirstAsync(
      'SELECT 1 FROM trusted_sources WHERE publicKey = ?',
      [publicKey]
    );
    return !!row; // Returns true if a row is found, false otherwise
  } catch (error) {
    console.error(">> isSourceTrusted check failed:", error);
    return false; // Fail safe
  }
};

// --- New Known Peers Functions --- //

export const registerPeerIdentity = async (handle, publicKey) => {
  const query = `
        INSERT OR REPLACE INTO known_peers (public_key, handle, last_seen)
        VALUES (?, ?, ?);
    `;
  return await runQuery(query, [publicKey, handle, Date.now()]);
};

export const getPeerHandle = async (publicKey) => {
  const query = `SELECT handle FROM known_peers WHERE public_key = ? LIMIT 1;`;
  const result = await runQuery(query, [publicKey]);
  return result.length > 0 ? result[0].handle : null;
};

// --- New Card Functions ---

// 3. Pagination over FetchAll
export const fetchCards = async (limit = 15, offset = 0, filters = {}) => {
  try {
    const whereClauses = [];
    const params = [];

    // A. Respect the active tab ('My Knowledge' vs 'Learned')
    if (filters.activeTab && filters.profileHandle) {
      if (filters.activeTab === 'created') {
        whereClauses.push('c.author_id = ?');
        params.push(filters.profileHandle);
      } else { // 'learned' tab
        whereClauses.push('(c.author_id != ? OR c.author_id IS NULL)');
        params.push(filters.profileHandle);
      }
    }

    // --- Phase 1: The Guardrail ---
    if (filters.enforceBroadcastRule) {
      whereClauses.push('(c.is_broadcast_enabled = 1 OR c.hops > 0)');
    }
    // -----------------------------

    // --- 1. PRECISION SEARCH (Wheel Filter Active) ---
    if (typeof filters.activeTopicFilter !== 'undefined' && filters.activeTopicFilter !== null) {
      let baseQuery = `
                SELECT c.*, CASE WHEN ts.publicKey IS NOT NULL THEN 1 ELSE 0 END AS is_trusted
                FROM cards c
                LEFT JOIN trusted_sources ts ON c.author_id = ts.publicKey
            `;

      // B. Handle the specific wheel slice or the center "general" slice
      if (filters.activeTopicFilter === 'general') {
        whereClauses.push("(c.topic IS NULL OR c.topic = 'human/general' OR c.topic = 'general')");
      } else {
        whereClauses.push('c.topic LIKE ?');
        params.push(`%${filters.activeTopicFilter}%`);
      }

      if (whereClauses.length > 0) {
        baseQuery += ' WHERE ' + whereClauses.join(' AND ');
      }

      baseQuery += ` ORDER BY is_trusted DESC, c.depth_score DESC, c.hops DESC, c.timestamp DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const results = await db.getAllAsync(baseQuery, params);
      return results.map(card => ({
        ...card,
        genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
        history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
      }));
    }

    // --- 2. SMART SORT (Default Dashboard View) ---
    // This part has complex JS-based sorting which we will bypass if a broadcast rule is enforced
    // for simplicity and performance.
    if (filters.enforceBroadcastRule) {
      let baseQuery = `
                SELECT c.*, CASE WHEN ts.publicKey IS NOT NULL THEN 1 ELSE 0 END AS is_trusted
                FROM cards c
                LEFT JOIN trusted_sources ts ON c.author_id = ts.publicKey
            `;
      if (whereClauses.length > 0) {
        baseQuery += ' WHERE ' + whereClauses.join(' AND ');
      }
      baseQuery += ` ORDER BY is_trusted DESC, c.depth_score DESC, c.hops DESC, c.timestamp DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      const results = await db.getAllAsync(baseQuery, params);
      return results.map(card => ({
        ...card,
        genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
        history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
      }));
    }


    const shouldShuffle = offset === 0;
    const categoryRank = ['food', 'fitness', 'professional', 'education', 'fun'];

    if (filters.activeTab === 'created') {
      const userCards = await db.getAllAsync(
        `SELECT * FROM cards WHERE author_id = ? ORDER BY depth_score DESC, hops DESC, timestamp DESC`,
        [filters.profileHandle]
      );

      // Group by category first (with lowercase safety net)
      const grouped = userCards.reduce((acc, card) => {
        let topicFound = false;
        const safeTopic = (card.topic || '').toLowerCase(); // Prevents strict-case bugs
        for (const cat of categoryRank) {
          if (safeTopic.includes(cat)) {
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(card);
            topicFound = true;
            break;
          }
        }
        if (!topicFound) {
          if (!acc.other) acc.other = [];
          acc.other.push(card);
        }
        return acc;
      }, {});

      // Sort within each category by timestamp, then assemble the final list
      let masterList = [];
      for (const cat of categoryRank) {
        if (grouped[cat]) {
          const sortedGroup = grouped[cat].sort((a, b) => b.timestamp - a.timestamp);
          masterList.push(...sortedGroup);
        }
      }
      if (grouped.other) {
        masterList.push(...(grouped.other.sort((a, b) => b.timestamp - a.timestamp)));
      }

      return masterList.slice(offset, offset + limit).map(card => ({
        ...card,
        genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
        history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
      }));

    } else { // This handles the 'Learned' tab
      const learnedCardsRaw = await db.getAllAsync(
        `SELECT * FROM cards WHERE (author_id != ? OR author_id IS NULL) ORDER BY depth_score DESC, hops DESC, timestamp DESC`,
        [filters.profileHandle]
      );

      // Priority 1: Human Transfers
      let humanTransfers = learnedCardsRaw.filter(c => c.author_id !== 'SYSTEM');
      if (shouldShuffle) {
        humanTransfers.sort(() => 0.5 - Math.random());
      }

      // Priority 2: JAWW Default/System cards
      const systemCards = learnedCardsRaw.filter(c => c.author_id === 'SYSTEM');
      const groupedSystem = systemCards.reduce((acc, card) => {
        let topicFound = false;
        const safeTopic = (card.topic || '').toLowerCase(); // Prevents strict-case bugs
        for (const cat of categoryRank) {
          if (safeTopic.includes(cat)) {
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(card);
            topicFound = true;
            break;
          }
        }
        if (!topicFound) {
          if (!acc.other) acc.other = [];
          acc.other.push(card);
        }
        return acc;
      }, {});

      let sortedSystemCards = [];
      for (const cat of categoryRank) {
        if (groupedSystem[cat]) {
          sortedSystemCards.push(...groupedSystem[cat]);
        }
      }
      if (groupedSystem.other) {
        sortedSystemCards.push(...groupedSystem.other);
      }

      const masterList = [...humanTransfers, ...sortedSystemCards];
      return masterList.slice(offset, offset + limit).map(card => ({
        ...card,
        genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
        history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
      }));
    }
  } catch (e) {
    console.log(">> ORACLE: Fetching cards failed", e.message);
    return [];
  }
};

export const getAllCards = async () => {
  try {
    const results = await db.getAllAsync(`
            SELECT c.*, CASE WHEN ts.publicKey IS NOT NULL THEN 1 ELSE 0 END AS is_trusted
            FROM cards c
            LEFT JOIN trusted_sources ts ON c.author_id = ts.publicKey
            ORDER BY is_trusted DESC, c.depth_score DESC, c.hops DESC, c.timestamp DESC
        `);
    return results.map(card => ({
      ...card,
      genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
      history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
    }));
  } catch (e) {
    console.error(">> Fetching all cards failed", e);
    return [];
  }
};

export const searchCards = async (query, filters = {}) => {
  try {
    if (query.startsWith('source:')) {
      const targetKey = query.substring(7);
      const whereClauses = ['c.author_id = ?'];
      const params = [targetKey];

      if (filters.activeTab && filters.profileHandle) {
        if (filters.activeTab === 'created') {
          whereClauses.push('c.author_id = ?');
          params.push(filters.profileHandle);
        } else {
          whereClauses.push('(c.author_id != ? OR c.author_id IS NULL)');
          params.push(filters.profileHandle);
        }
      }

      if (typeof filters.activeTopicFilter !== 'undefined') {
        if (filters.activeTopicFilter === null || filters.activeTopicFilter === 'general') {
          whereClauses.push("(c.topic IS NULL OR c.topic = 'human/general' OR c.topic = 'general')");
        } else {
          whereClauses.push('c.topic LIKE ?');
          params.push(`%${filters.activeTopicFilter}%`);
        }
      }

      const sql = `
                SELECT c.*, CASE WHEN ts.publicKey IS NOT NULL THEN 1 ELSE 0 END AS is_trusted
                FROM cards c 
                LEFT JOIN trusted_sources ts ON c.author_id = ts.publicKey
                WHERE ${whereClauses.join(' AND ')}
                ORDER BY c.depth_score DESC, c.hops DESC, c.timestamp DESC
            `;
      const results = await db.getAllAsync(sql, params);
      return results.map(card => ({
        ...card,
        genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
        history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
      }));
    }

    // Run query through the Semantic Engine
    const expandedTerms = expandQuery(query);

    if (!expandedTerms || expandedTerms.length === 0) return [];

    // Build a robust FTS5 'OR' string (e.g., '"cooking"* OR "culinary"* OR "recipe"*')
    const ftsQuery = expandedTerms.map(term => {
      const sanitizedTerm = term.replace(/'/g, "''");
      return `"${sanitizedTerm}"*`;
    }).join(' OR ');

    // 3. FIX THE FTS ALIAS: Use 'f MATCH' instead of 'fts_cards MATCH'
    const whereClauses = ["f MATCH ?"];
    const params = [ftsQuery];

    if (filters.activeTab && filters.profileHandle) {
      if (filters.activeTab === 'created') {
        whereClauses.push('c.author_id = ?');
        params.push(filters.profileHandle);
      } else {
        whereClauses.push('(c.author_id != ? OR c.author_id IS NULL)');
        params.push(filters.profileHandle);
      }
    }

    // --- Phase 1: The Guardrail ---
    if (filters.enforceBroadcastRule) {
      whereClauses.push('(c.is_broadcast_enabled = 1 OR c.hops > 0)');
    }
    // -----------------------------

    if (typeof filters.activeTopicFilter !== 'undefined') {
      if (filters.activeTopicFilter === null || filters.activeTopicFilter === 'general') {
        whereClauses.push("(c.topic IS NULL OR c.topic = 'human/general' OR c.topic = 'general')");
      } else {
        whereClauses.push('c.topic LIKE ?');
        params.push(`%${filters.activeTopicFilter}%`);
      }
    }

    const sql = `
            SELECT c.*, CASE WHEN ts.publicKey IS NOT NULL THEN 1 ELSE 0 END AS is_trusted
            FROM cards c 
            JOIN fts_cards f ON c.rowid = f.rowid 
            LEFT JOIN trusted_sources ts ON c.author_id = ts.publicKey
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY is_trusted DESC, f.rank, c.depth_score DESC, c.hops DESC
        `;

    const results = await db.getAllAsync(sql, params);

    return results.map(card => ({
      ...card,
      genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
      history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
    }));
  } catch (e) {
    console.log(">> ORACLE: FTS5 partial query skipped:", e.message);
    return [];
  }
}

export const getCardsByTopic = async (topicSubstring) => {
  try {
    // Uses standard SQL LIKE to safely match "fitness" inside "health & fitness"
    // Bypasses the FTS5 tokenization completely.
    const results = await db.getAllAsync(
      `SELECT * FROM cards WHERE topic LIKE ? ORDER BY depth_score DESC, hops DESC, timestamp DESC`,
      [`%${topicSubstring}%`]
    );

    return results.map(card => ({
      ...card,
      genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
      history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
    }));
  } catch (e) {
    console.error(">> Fetching by topic failed", e);
    return [];
  }
}

export const insertOrReplaceCard = async (card) => {
  try {
    // Calculate the DAG-based depth score before inserting
    const depthScore = calculateDepthScore(card.history);

    const p = [
      String(card.id || ''),
      String(card.title || ''),
      String(card.body || ''),
      String(card.topic || ''),
      card.subject ? String(card.subject) : null,
      (card.genesis && card.genesis.author_id) ? String(card.genesis.author_id) : null,
      (card.genesis && card.genesis.timestamp) ? new Date(card.genesis.timestamp).getTime() : Date.now(),
      parseInt(card.hops || 0, 10),
      card.genesis ? JSON.stringify(card.genesis) : null,
      card.history ? JSON.stringify(card.history) : '[]',
      card.forkedFrom ? String(card.forkedFrom) : null,
      depthScore, // Save the calculated depth score
      // --- NEW: Ledger Stats ---
      parseInt(card.hop_count || 0, 10),
      parseInt(card.network_reach || 1, 10),
      // --- NEW: Lineage ---
      card.parent_id ? String(card.parent_id) : null,
      card.parent_hash ? String(card.parent_hash) : null,
      card.event_id ? String(card.event_id) : null
    ];

    console.log(`>> DB: Inserting/Replacing card with ID [${card.id}], depth_score: ${depthScore}`);

    await db.runAsync(
      `INSERT OR REPLACE INTO cards 
            (id, title, body, topic, subject, author_id, timestamp, hops, genesis, history, forkedFrom, depth_score, hop_count, network_reach, parent_id, parent_hash, event_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p
    );

    const verifyRead = await db.getFirstAsync('SELECT id, depth_score FROM cards WHERE id = ?', [card.id]);
    if (verifyRead) {
      console.log(`>> DB: VERIFIED insert for ID [${card.id}], depth_score: ${verifyRead.depth_score}`);
    } else {
      console.error(`>> DB: FAILED to verify insert for ID [${card.id}]`);
    }

  } catch (e) {
    console.error(">> Inserting card failed", e);
  }
};

export const deleteCard = async (cardId) => {
  try {
    await db.runAsync(`DELETE FROM cards WHERE id = ?`, [cardId]);
  } catch (e) {
    console.error(">> Deleting card failed", e);
  }
};

// --- Phase 1: Broadcast Toggle Function ---
export const setCardBroadcast = async (cardId, isEnabled) => {
  try {
    await db.runAsync(
      `UPDATE cards SET is_broadcast_enabled = ? WHERE id = ?`,
      [isEnabled ? 1 : 0, cardId]
    );
    console.log(`>> DB: Set is_broadcast_enabled=${isEnabled} for card ${cardId}`);
  } catch (e) {
    console.error(">> DB: Updating broadcast flag failed", e);
  }
};

// 4. Safe Data Migration Script (DB part)
export const batchInsertCards = async (cards) => {
  try {
    await db.withTransactionAsync(async () => {
      for (const card of cards) {
        // Ensure genesis exists and has the required fields
        if (card.genesis && card.genesis.author_id && card.genesis.timestamp) {
          const p = [
            String(card.id || ''),
            String(card.title || ''),
            String(card.body || ''),
            String(card.topic || ''),
            card.subject ? String(card.subject) : null,
            String(card.genesis.author_id || ''),
            new Date(card.genesis.timestamp).getTime() || Date.now(),
            parseInt(card.hops || 0, 10),
            JSON.stringify(card.genesis),
            JSON.stringify(card.history || []),
            card.forkedFrom ? String(card.forkedFrom) : null
          ];
          await db.runAsync(
            `INSERT OR IGNORE INTO cards (id, title, body, topic, subject, author_id, timestamp, hops, genesis, history, forkedFrom)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            p
          );
        } else {
          console.warn(">> Skipping card with missing genesis data:", card.id);
        }
      }
    });
    console.log(">> Batch insert of cards complete.");
  } catch (e) {
    console.error(">> Batch inserting cards failed", e);
    throw e; // Re-throw to be caught by the migration script
  }
};

// --- Transfer Log Functions ---
export const calculateTrueHops = (historyArray) => {
  if (!Array.isArray(historyArray) || historyArray.length === 0) return 0;

  // With a verified chain, we just need to count the verified array length.
  return historyArray.length;
};

export const insertTransferRecord = async ({ cardId, recipientHandle, timestamp }) => {
  try {
    // ONLY insert into the raw transfers table (Telemetry).
    // Absolutely NO mutating the card's JSON history here.
    await db.runAsync(
      `INSERT INTO transfers (cardId, recipientHandle, timestamp) VALUES (?, ?, ?);`,
      [cardId, recipientHandle, timestamp]
    );
    console.log(`>> DB: Telemetry Logged -> Card ${cardId} to ${recipientHandle}`);
  } catch (error) {
    console.error(">> DB Error inserting transfer record:", error);
    throw error;
  }
};

// --- CORRECTED FUNCTION FOR EXPO-SQLITE ---
export const getCardById = async (id) => {
  try {
    const results = await db.getAllAsync(
      `SELECT * FROM cards WHERE id = ? LIMIT 1`,
      [id]
    );

    if (results.length > 0) {
      let item = results[0];
      try {
        item.genesis = typeof item.genesis === 'string' ? JSON.parse(item.genesis || '{}') : (item.genesis || {});
        item.history = typeof item.history === 'string' ? JSON.parse(item.history || '[]') : (item.history || []);
      } catch (e) {
        console.warn(`>> DB: Corrupt card data for ID ${item.id}, falling back to defaults.`);
        item.genesis = {};
        item.history = [];
      }
      return item;
    }
    console.log(`>> DB: No card found for ID [${id}]`);
    return null;
  } catch (error) {
    console.error(">> getCardById Failed:", error);
    return null;
  }
};

export const getAllTopics = async () => {
  try {
    const results = await db.getAllAsync(`SELECT DISTINCT topic FROM cards`);
    return results.map(r => r.topic);
  } catch (e) {
    console.error(">> Getting all topics failed", e);
    return [];
  }
};

export const blockOperator = async (publicKey, cardHash, reason) => {
  try {
    await db.withTransactionAsync(async () => {
      // 1. Block the operator
      await db.runAsync(
        'INSERT OR IGNORE INTO local_blocklist (public_key, blocked_at, reason) VALUES (?, ?, ?)',
        [publicKey, new Date().toISOString(), reason]
      );

      // 2. Quarantine the specific card hash
      if (cardHash) {
        await db.runAsync(
          'INSERT OR IGNORE INTO quarantined_hashes (hash, quarantined_at) VALUES (?, ?)',
          [cardHash, new Date().toISOString()]
        );
      }

      // 3. Purge all cards from this operator
      const deleteResult = await db.runAsync('DELETE FROM cards WHERE author_id = ?', [publicKey]);
      console.log(`>> DB: Blocked ${publicKey} and purged ${deleteResult.changes} cards.`);
    });
  } catch (error) {
    console.error(">> DB Error blocking operator:", error);
    throw error;
  }
};

export const quarantineCard = async (card) => {
  try {
    await db.withTransactionAsync(async () => {
      // 1. Delete from cards
      await db.runAsync('DELETE FROM cards WHERE id = ?', [card.id]);
      
      // 2. Add to quarantine
      const cardHash = card.hash || card.content_hash || card.id; 
      if (cardHash) {
        await db.runAsync(
          'INSERT OR IGNORE INTO quarantined_hashes (hash, quarantined_at) VALUES (?, ?)',
          [cardHash, new Date().toISOString()]
        );
      }
    });
    console.log(`>> DB: Quarantined corrupted card [${card.id}]`);
  } catch (error) {
    console.error(">> DB Error quarantining card:", error);
  }
};

export const isBlocked = async (publicKey, cardHash) => {
  try {
    // Check if the operator is in the blocklist
    const operatorBlocked = await db.getFirstAsync(
      'SELECT 1 FROM local_blocklist WHERE public_key = ?',
      [publicKey]
    );
    if (operatorBlocked) {
      console.log(`>> DB: Access denied for blocked operator ${publicKey}`);
      return true;
    }

    // Check if the card hash is quarantined
    if (cardHash) {
      const hashQuarantined = await db.getFirstAsync(
        'SELECT 1 FROM quarantined_hashes WHERE hash = ?',
        [cardHash]
      );
      if (hashQuarantined) {
        console.log(`>> DB: Access denied for quarantined hash ${cardHash}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(">> DB Error checking block status:", error);
    return false; // Fail safe: if the check fails, don't block
  }
};

export const getCategoryForSubject = async (subject) => {
  try {
    const card = await db.getFirstAsync(
      `SELECT topic FROM cards WHERE title LIKE ? OR body LIKE ? LIMIT 1`,
      [`%${subject}%`, `%${subject}%`]
    );
    if (card && card.topic) {
      return card.topic.split('/')[1] || card.topic;
    }
    return null;
  } catch (error) {
    console.error(">> getCategoryForSubject Failed:", error);
    return null;
  }
};


// Helper function if you need raw access elsewhere
export const runQuery = async (sql, params = []) => {
  try {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return await db.getAllAsync(sql, params);
    } else {
      return await db.runAsync(sql, params);
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}

export const getOperatorStats = async (userHandle, eventStartTime = 0) => {
  try {
    // Ensure eventStartTime is a number to properly compare with SQLite INTEGER timestamps
    const startTime = Number(eventStartTime) || 0;

    // 1. Get stats for the specific operator, scoped by time.
    // EXPERTISE SCORE = (Total known devices) * (Deepest known chain of custody)
    const userStatsResult = await db.getFirstAsync(
      `SELECT 
         COUNT(*) as authoredCount, 
         SUM(network_reach * hops) as expertiseScore 
       FROM cards 
       WHERE author_id = ? AND timestamp >= ?`,
      [userHandle, startTime]
    );

    // 2. Get the total number of cards acquired during this event
    const vaultSizeResult = await db.getFirstAsync(
      `SELECT COUNT(*) as totalVaultSize 
       FROM cards 
       WHERE timestamp >= ?`,
      [startTime]
    );

    // 3. Find the most dominant topic during this event, excluding general categories
    const dominantTopicResult = await db.getFirstAsync(
      `SELECT topic 
       FROM cards 
       WHERE topic IS NOT NULL 
       AND topic != 'human/general' 
       AND topic != 'general' 
       AND timestamp >= ? 
       GROUP BY topic 
       ORDER BY COUNT(topic) DESC 
       LIMIT 1`,
      [startTime]
    );

    // 4. Assemble the final stats object
    const stats = {
      authoredCount: userStatsResult?.authoredCount || 0,
      expertiseScore: userStatsResult?.expertiseScore || 0,
      totalVaultSize: vaultSizeResult?.totalVaultSize || 0,
      domainDominance: dominantTopicResult?.topic
        ? dominantTopicResult.topic.replace('human/', '').toUpperCase()
        : 'GENERAL',
    };

    return stats;

  } catch (error) {
    console.error(">> DB Error in getOperatorStats:", error);
    // Return a clean default object in case of failure
    return {
      authoredCount: 0,
      networkReach: 0,
      totalVaultSize: 0,
      domainDominance: 'GENERAL',
    };
  }
};

// --- EVENT FOLDER FUNCTIONS ---

// 1. Get the list of all Events (The Folders)
export const getAllEvents = async () => {
  try {
    // Pulls all event folders, sorted by most recent first
    const results = await db.getAllAsync(`SELECT * FROM events ORDER BY timestamp DESC`);
    return results;
  } catch (error) {
    console.error(">> DB Error fetching events:", error);
    return [];
  }
};

// 2. Open a Folder (Get all cards for a specific event)
export const getCardsByEvent = async (eventId) => {
  try {
    const results = await db.getAllAsync(
      `SELECT c.*, CASE WHEN ts.publicKey IS NOT NULL THEN 1 ELSE 0 END AS is_trusted
       FROM cards c
       LEFT JOIN trusted_sources ts ON c.author_id = ts.publicKey
       WHERE c.event_id = ? 
       ORDER BY c.depth_score DESC, c.hops DESC, c.timestamp DESC`,
      [eventId]
    );

    // Parse the JSON history/genesis arrays just like the main vault does
    return results.map(card => ({
      ...card,
      genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
      history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
    }));
  } catch (error) {
    console.error(`>> DB Error fetching cards for event ${eventId}:`, error);
    return [];
  }
};

export const deleteEvent = async (eventId) => {
  try {
    await db.withTransactionAsync(async () => {
      // 1. Delete the event itself
      await db.runAsync(`DELETE FROM events WHERE id = ?`, [eventId]);

      // 2. Delete all cards associated with this event
      await db.runAsync(`DELETE FROM cards WHERE event_id = ?`, [eventId]);
    });
    console.log(`>> DB: Deleted event ${eventId} and all associated cards.`);
  } catch (error) {
    console.error(`>> DB Error deleting event ${eventId}:`, error);
  }
};

// --- UMPIRE MODE QUEUE FUNCTIONS ---
export const queueCardForUmpire = async (cardId, umpireSubject) => {
  try {
    const existing = await db.getFirstAsync(
      `SELECT id FROM umpire_sync_queue WHERE card_id = ? AND umpire_subject = ? AND status = 'pending';`,
      [cardId, umpireSubject]
    );

    if (existing) {
      return 'Already queued';
    }

    return await db.runAsync(
      `INSERT INTO umpire_sync_queue (card_id, umpire_subject, timestamp) VALUES (?, ?, ?);`,
      [cardId, umpireSubject, Date.now()]
    );
  } catch (error) {
    console.error(">> DB Error queueing card for umpire:", error);
    throw error;
  }
};

export const getPendingUmpireSyncs = async (umpireSubject) => {
  try {
    const results = await db.getAllAsync(
      `SELECT card_id FROM umpire_sync_queue WHERE umpire_subject = ? AND status = 'pending';`,
      [umpireSubject]
    );
    return results.map(row => row.card_id);
  } catch (error) {
    console.error(">> DB Error getting pending umpire syncs:", error);
    throw error;
  }
};

export const markUmpireQueueAsSynced = async (cardIds) => {
  if (!cardIds || cardIds.length === 0) return;
  try {
    const placeholders = cardIds.map(() => '?').join(',');
    return await db.runAsync(
      `UPDATE umpire_sync_queue SET status = 'synced' WHERE card_id IN (${placeholders});`,
      cardIds
    );
  } catch (error) {
    console.error(">> DB Error marking umpire queue as synced:", error);
    throw error;
  }
};

export const reconcileUmpireQueue = async () => {
  try {
    console.log(">> DB: Reconciling Umpire Sync Queue...");
    const pending = await db.getAllAsync(
      `SELECT id, card_id FROM umpire_sync_queue WHERE status = 'pending'`
    );

    if (pending.length === 0) {
      console.log(">> DB: Umpire queue is clean. No action needed.");
      return;
    }

    const cardIdsToCheck = pending.map(p => p.card_id);
    const placeholders = cardIdsToCheck.map(() => '?').join(',');

    const existingCards = await db.getAllAsync(
      `SELECT id FROM cards WHERE id IN (${placeholders})`,
      cardIdsToCheck
    );
    const existingCardIds = new Set(existingCards.map(c => c.id));

    const staleQueueEntries = pending.filter(p => !existingCardIds.has(p.card_id));

    if (staleQueueEntries.length > 0) {
      const staleIdsToDelete = staleQueueEntries.map(p => p.id);
      const deletePlaceholders = staleIdsToDelete.map(() => '?').join(',');

      await db.runAsync(
        `DELETE FROM umpire_sync_queue WHERE id IN (${deletePlaceholders})`,
        staleIdsToDelete
      );
      console.log(`>> DB: Purged ${staleQueueEntries.length} stale entries from umpire queue.`);
    } else {
      console.log(">> DB: All pending umpire queue entries are valid.");
    }
  } catch (error) {
    console.error(">> DB: Failed to reconcile umpire queue:", error);
  }
};

export default db;
