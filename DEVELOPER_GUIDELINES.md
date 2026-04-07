# JAWW Developer Guidelines: Preserving the IRONCLAD Protocol

## 1. Introduction

The JAWW mesh network is built on the IRONCLAD protocol, a delicate system designed to maintain zero-trust data integrity across a decentralized environment. This document provides strict rules for developers. Adhering to these guidelines is not optional; deviations risk data corruption, synchronization failures, and critical security vulnerabilities that can affect the entire mesh.

## 2. The Three Golden Rules

### Rule 1: The UI State Is a Potential Liar
Never trust the React component state (e.g., `profile`, `cards`) for cryptographic or ledger-writing operations inside asynchronous callbacks or event listeners. Stale closures are a constant and immediate threat. A function can easily execute with an outdated copy of the state from when it was created.

*   **DON'T:**
    ```javascript
    // Inside an event listener
    const entry = { from: profile.handle, fromKey: profile.publicKey }; // Stale!
    ```
*   **DO:** Fetch cryptographic and identity truth directly from the source *at the moment of execution*.
    ```javascript
    // Inside an event listener
    const currentProfile = await loadProfile();
    const { publicKey } = await getOrGenerateKeys();
    const entry = { from: currentProfile.handle, fromKey: publicKey }; // Correct!
    ```

### Rule 2: All State Updates Must Be Atomic
When updating core state like a user's profile, the flow must be atomic and sequential to prevent race conditions. Do not perform multiple, competing `setProfile()` calls.

*   **CORRECT SEQUENCE:**
    1.  **Fetch all data first** (e.g., `loadProfile()`, `getOrGenerateKeys()`).
    2.  **Combine** the data into a single, definitive object.
    3.  **Save** that object to the persistent database (`saveProfile()`).
    4.  **Update** the React state with that same object (`setProfile()`).
    5.  **Inject** necessary data into other services (`BluetoothService.setHandle()`).

### Rule 3: The Database Is the Single Source of Truth
The UI is a *reflection* of the database, not the other way around. Do not update the UI state and the database in parallel. Always write to the database first, then re-read the data from the database to refresh the UI.

*   **DON'T:**
    ```javascript
    const newCards = [...cards, newCard];
    setCards(newCards); // UI is now out of sync with DB
    await insertOrReplaceCard(newCard);
    ```
*   **DO:**
    ```javascript
    await insertOrReplaceCard(newCard);
    const freshCards = await getAllCards(); // Re-read from the source of truth
    setCards(freshCards); // UI now correctly reflects the DB state
    ```

## 3. Technical Directives

### 3.1. The `hops` vs. `hop_count` Anomaly
A known architectural debt exists in the `cards` table, which contains both a `hops` and a `hop_count` column.

*   **MANDATORY RULE:** Until the schema is unified, any function that writes to the database via `insertOrReplaceCard` **MUST** provide the same calculated value to *both* the `hops` and `hop_count` properties of the card object.
*   **CORRECT IMPLEMENTATION:**
    ```javascript
    const calculatedHops = calculateTrueHops(newHistory);
    const updatedCard = {
        ...card,
        history: newHistory,
        hops: calculatedHops,
        hop_count: calculatedHops // MUST be duplicated
    };
    await insertOrReplaceCard(updatedCard);
    ```
    Failure to adhere to this will result in an inconsistent state and difficult-to-trace UI bugs.

### 3.2. Card `history` Is an Immutable Ledger
The `history` array on a Card object is a chain of custody and must be treated as immutable.

*   **NEVER** delete or alter existing entries in a history array.
*   When adding an entry (e.g., a `SHARED` action), you **MUST** ensure the `fromKey` (sender) and `userKey` (recipient) properties are present and contain valid public keys. Do not fall back to `"Unknown"` or `null`.
*   After appending to the history, **ALWAYS** recalculate the hop count using the `calculateTrueHops()` utility.

### 3.3. Testing and Verification
When testing features related to card transfers:

1.  **Verify on Both Devices:** A successful transfer must be verified on the Sender's device *and* the Receiver's device.
2.  **Watch the Console:** Use the `>> DEBUG:` traces in the console to get a live view of the hop calculation math.
3.  **Inspect the Database:** Use a SQLite browser to directly inspect the `cards` table and confirm that both the `hops` and `hop_count` columns contain the correct, matching integer value after a transfer.

> **The Golden Rule:** If you are unsure, ask. It is better to clarify the protocol than to introduce a subtle bug that corrupts the decentralized state of the entire mesh.
