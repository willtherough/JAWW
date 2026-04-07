
# White Paper: True Array Merge

**A Synchronization Strategy for Convergent Ledgers in Decentralized P2P Networks**

---

## 1. Abstract

In decentralized peer-to-peer (P2P) data-sharing networks, maintaining a consistent and accurate state for shared data objects is a fundamental challenge. When data objects, such as digital cards, carry their own transactional history or "ledger," the risk of "Concurrent Divergence" becomes significant. This paper introduces **True Array Merge**, a robust algorithm designed to resolve this issue. True Array Merge provides a lossless, idempotent method for synchronizing two versions of a ledger by combining them, deduplicating entries based on a unique composite key, and sorting them chronologically to produce a single, canonical source of truth. This approach ensures that no transactional data is lost during synchronization, even when multiple peers have independently appended new, unique events to their local version of the ledger.

---

## 2. Introduction

The JAWW networking protocol facilitates the exchange of data packets ("cards") in a mobile P2P mesh environment. Each card contains not only its core content but also a "Chain of Custody"—a ledger representing the history of its transfers, forks, and other significant events. This ledger is an array of immutable transaction entries, each stamped with an action, a user, and a timestamp.

The primary challenge arises when a card's history diverges. For example, a single card can be shared independently by two different users to two different recipients. When these users later sync with each other, their ledgers for that card will have the same length but contain different, yet equally valid, transaction entries. This scenario is known as **Concurrent Divergence**.

---

## 3. The Challenge: Limitations of Naive Synchronization

The previous synchronization logic relied on a simplistic and flawed assumption: that a longer history array is always the "better" or more up-to-date one. The algorithm was as follows:

1.  Compare the content `hash` of the local and incoming cards.
2.  If the hashes match, compare the `length` of their `history` arrays.
3.  If `incomingCard.history.length > localCard.history.length`, accept the incoming card.
4.  Otherwise, reject the incoming card as redundant.

This naive length-based check fails critically in cases of Concurrent Divergence.

**Example of Failure:**

1.  **Genesis:** Operator **Alpha** creates a card. `History Length: 1`.
2.  **Share 1:** Alpha shares the card with **Bravo**. Alpha's card history is now `[Genesis, Transfer_to_Bravo]`. `History Length: 2`.
3.  **Divergence:** Alpha now shares the same card with **Charlie**. At the same time, Bravo shares their copy with **Delta**.
    *   Alpha's History: `[Genesis, Transfer_to_Bravo, Transfer_to_Charlie]`. `Length: 3`.
    *   Bravo's History: `[Genesis, Transfer_to_Bravo, Transfer_to_Delta]`. `Length: 3`.
4.  **Synchronization Attempt:** Alpha and Bravo connect. Alpha attempts to send the card to Bravo.
    *   The content hashes match.
    *   Bravo's local history length (3) is not less than Alpha's incoming history length (3).
    *   The transfer is incorrectly rejected as "redundant".
    *   **Result:** Bravo never learns about the transfer to Charlie, and Alpha never learns about the transfer to Delta. **Transactional data is permanently lost from both ledgers.**

---

## 4. The Solution: True Array Merge

True Array Merge is an algorithm designed to correctly merge two divergent ledgers into a single, canonical history, preserving all unique events. It operates in five distinct stages when a `localCard` and an `incomingCard` with matching content hashes are synchronized.

#### **Stage 1: Combination**

The process begins by combining the `history` arrays from both the local and incoming cards into a single, temporary array.

`const combinedHistory = [...localCard.history, ...incomingCard.history];`

This initial array contains all events from both sources, including duplicates.

#### **Stage 2: Deduplication via Unique Key**

To eliminate duplicate entries, a `Map` is used. Each history entry is processed to generate a unique, composite key based on its immutable properties. The timestamp is crucial for ensuring the uniqueness of an event.

`const uniqueKey = `\${entry.action}-\${entry.user}-\${entry.timestamp}`;`

By iterating through the `combinedHistory` and adding each entry to the `Map` using this key, duplicates are automatically overwritten, leaving only a set of unique historical events.

#### **Stage 3: Chronological Sorting**

The deduplicated values from the `Map` are converted back into an array. This array is then sorted chronologically based on the `timestamp` of each event.

`const mergedHistory = Array.from(historyMap.values()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));`

The result is a single, ordered ledger that represents the complete and true history of the card as known by the two syncing peers.

#### **Stage 4: Idempotent Redundancy Check**

With a canonical ledger established, a truly reliable redundancy check is now possible. The length of the newly `mergedHistory` is compared against the length of the original `localCard.history`.

*   If `mergedHistory.length <= localCard.history.length`, it proves that no new, unique events were contributed by the incoming card. The transfer is correctly identified as redundant, and the process is aborted.
*   If `mergedHistory.length > localCard.history.length`, it confirms that new, unique events were successfully merged from the incoming card.

This check is idempotent and guarantees that synchronization only proceeds when new information is available.

#### **Stage 5: State Reconciliation (The Burn)**

If the redundancy check passes, the local card's state is updated and persisted:

1.  **History Update:** The `history` array of the `localCard` is replaced with the new, canonical `mergedHistory`.
2.  **Hop Recalculation:** Metadata such as the `hops` count is recalculated from the ground up based on the new ledger. A robust formula is `finalHops = mergedHistory.length - 1`, as the genesis block represents the starting point (0 hops). This prevents errors from simply incrementing a potentially incorrect previous value.
3.  **Persistence:** The updated card object is saved to the database using `insertOrReplaceCard`.

---

## 5. Benefits of True Array Merge

The implementation of True Array Merge provides significant benefits for the reliability and integrity of the P2P network:

*   **Lossless Convergence:** It prevents the loss of transactional data during synchronization, ensuring that all unique events are preserved and propagated through the network.
*   **Idempotency:** The synchronization process is safe to repeat. Syncing the same two cards multiple times will not result in data corruption or incorrect state changes.
*   **Robustness:** The system becomes resilient to complex, real-world sharing scenarios, including offline transfers and multi-branch divergence.
*   **Canonical Accuracy:** By rebuilding the ledger and recalculating metadata from the merged source of truth, the state of each card remains accurate and internally consistent.

---

## 6. Conclusion

True Array Merge is a foundational algorithm that replaces flawed, naive synchronization logic with a robust, mathematically sound approach. By treating ledgers as sets of unique events that can be combined, deduplicated, and sorted, it provides a reliable mechanism for achieving eventual consistency in a decentralized environment. This pattern is essential for any P2P system where data objects carry a self-contained, mutable history and where a central authority for state reconciliation is absent. It ensures that the shared understanding of a data object's history converges toward a complete and accurate state over time.
