import * as SQLite from 'expo-sqlite';

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
      CREATE TABLE IF NOT EXISTS cards ( id TEXT PRIMARY KEY NOT NULL, title TEXT, body TEXT, topic TEXT, subject TEXT, author_id TEXT, timestamp INTEGER, hops INTEGER, genesis TEXT, history TEXT, forkedFrom TEXT );
      CREATE TABLE IF NOT EXISTS transfers ( id INTEGER PRIMARY KEY NOT NULL, cardId TEXT NOT NULL, recipientHandle TEXT NOT NULL, timestamp TEXT NOT NULL );
      CREATE TABLE IF NOT EXISTS local_blocklist (public_key TEXT PRIMARY KEY NOT NULL, blocked_at TEXT NOT NULL, reason TEXT);
      CREATE TABLE IF NOT EXISTS quarantined_hashes (hash TEXT PRIMARY KEY NOT NULL, quarantined_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_cards_author_timestamp ON cards(author_id, timestamp);
    `);

    // 3. Add 'subject' column, ignoring errors if it exists
    try {
      await db.execAsync("ALTER TABLE cards ADD COLUMN subject TEXT;");
      console.log(">> DB: 'subject' column added to cards table.");
    } catch (e) {
      console.log(">> DB: 'subject' column likely already exists, skipping.");
    }

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
  const { uid, handle, publicKey, timestamp } = source;
  try {
    const result = await db.runAsync(
      `INSERT OR REPLACE INTO trusted_sources (uid, handle, publicKey, timestamp) VALUES (?, ?, ?, ?);`,
      [uid, handle, publicKey, timestamp]
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

// --- New Card Functions ---

// 3. Pagination over FetchAll
export const fetchCards = async (limit = 15, offset = 0, filters = {}) => {
    try {
        // --- 1. PRECISION SEARCH (Wheel Filter Active) ---
        // If a specific topic filter is applied from the wheel, use the efficient SQL query.
        if (typeof filters.activeTopicFilter !== 'undefined' && filters.activeTopicFilter !== null) {
            let baseQuery = `
                SELECT c.*, CASE WHEN ts.publicKey IS NOT NULL THEN 1 ELSE 0 END AS is_trusted
                FROM cards c
                LEFT JOIN trusted_sources ts ON c.author_id = ts.publicKey
            `;
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

            baseQuery += ` ORDER BY is_trusted DESC, c.hops DESC, c.timestamp DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            const results = await db.getAllAsync(baseQuery, params);
            return results.map(card => ({
                ...card,
                genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
                history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
            }));
        }

        // --- 2. SMART SORT (Default Dashboard View) ---
        const shouldShuffle = offset === 0;
        const categoryRank = ['food', 'fitness', 'professional', 'education', 'fun'];

        if (filters.activeTab === 'created') {
            const userCards = await db.getAllAsync(
                `SELECT * FROM cards WHERE author_id = ?`,
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
            if(grouped.other) {
                masterList.push(...(grouped.other.sort((a,b) => b.timestamp - a.timestamp)));
            }

            return masterList.slice(offset, offset + limit).map(card => ({
                ...card,
                genesis: typeof card.genesis === 'string' ? JSON.parse(card.genesis || '{}') : (card.genesis || {}),
                history: typeof card.history === 'string' ? JSON.parse(card.history || '[]') : (card.history || [])
            }));

        } else { // This handles the 'Learned' tab
            const learnedCardsRaw = await db.getAllAsync(
                `SELECT * FROM cards WHERE author_id != ? OR author_id IS NULL`,
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
            if(groupedSystem.other) {
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
            ORDER BY is_trusted DESC, c.hops DESC, c.timestamp DESC
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
        const terms = query.trim().split(/\s+/);
        const ftsQuery = terms.map(term => {
            const upperTerm = term.toUpperCase();
            if (upperTerm === 'OR' || upperTerm === 'AND' || upperTerm === 'NOT') return upperTerm;
            const sanitizedTerm = term.replace(/'/g, "''");
            return `${sanitizedTerm}*`;
        }).join(' ');

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
            ORDER BY is_trusted DESC, f.rank, c.hops DESC
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
            `SELECT * FROM cards WHERE topic LIKE ? ORDER BY hops DESC, timestamp DESC`,
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
        // --- Defensive Casting ---
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
            card.forkedFrom ? String(card.forkedFrom) : null
        ];

        await db.runAsync(
            `INSERT OR REPLACE INTO cards (id, title, body, topic, subject, author_id, timestamp, hops, genesis, history, forkedFrom)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            p
        );
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
                        `INSERT INTO cards (id, title, body, topic, subject, author_id, timestamp, hops, genesis, history, forkedFrom)
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
export const insertTransferRecord = async ({ cardId, recipientHandle, timestamp }) => {
  try {
    await db.runAsync(
      `INSERT INTO transfers (cardId, recipientHandle, timestamp) VALUES (?, ?, ?);`,
      [cardId, recipientHandle, timestamp]
    );
    console.log(`>> DB: Logged transfer of card ${cardId} to ${recipientHandle}`);
  } catch (error) {
    console.error(">> DB Error inserting transfer record:", error);
  }
};

// --- CORRECTED FUNCTION FOR EXPO-SQLITE ---
export const getCardById = async (id) => {
  try {
    // We use LIKE here just in case the ID in the QR code has 
    // extra handle metadata (e.g. "Will-123" vs "123")
    const results = await db.getAllAsync(
      `SELECT * FROM cards WHERE id = ? OR id LIKE ? LIMIT 1`,
      [id, `%${id}%`]
    );
    
    if (results.length > 0) {
      let item = results[0];
      // Clean parsing logic
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
    } catch(e) { 
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

export default db;
