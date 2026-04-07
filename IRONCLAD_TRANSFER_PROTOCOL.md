# The IRONCLAD Protocol: A Zero-Trust Framework for Decentralized Information Exchange

## 1. Introduction

The JAWW mesh network operates on a principle of Zero-Trust, assuming no central authority and requiring cryptographic verification for all interactions. The IRONCLAD Protocol is the set of rules and cryptographic procedures that govern the exchange of information ("Cards") between nodes ("Operators"). Its purpose is to ensure the authenticity, integrity, and efficient, non-redundant synchronization of data across the entire decentralized mesh.

The protocol is built on three pillars: **Cryptographic Identity**, an **Immutable Ledger**, and an **Intelligent Synchronization Handshake**.

## 2. Core Concepts

### 2.1. Cryptographic Identity

Every Operator in the mesh is identified by a unique public/private key pair. The public key serves as the Operator's unforgeable identity (`author_id`, `userKey`, `fromKey`), forming the root of trust for all actions they perform. All significant actions, such as creating a Card or acknowledging a transfer, are cryptographically signed.

### 2.2. The "Card" Data Structure

A Card is not just a piece of data; it is a self-contained, verifiable artifact with three key integrity components:

*   **Genesis Block (`genesis`):** An unchangeable block created by the original author. It contains the author's public key (`author_id`), a timestamp, and a cryptographic signature of this data. This signature proves original authorship and ensures the card's origin can always be verified.
*   **Content Hash (`hash`):** A cryptographic hash of the card's core content (e.g., title, body). This allows any Operator to quickly verify that the content has not been altered.
*   **Immutable Ledger (`history`):** An append-only array of every action performed on the card (`CREATED`, `SHARED`, `FORKED`). Each entry is timestamped and contains the cryptographic identities (public keys) of the parties involved. This provides a complete, verifiable chain of custody from the moment of creation.

### 2.3. Hop Count: Measuring Influence

The `hops` property represents a card's "reach" or "influence" within the mesh. It is not a simple counter. The value is derived directly from the `history` ledger by calculating the number of unique, verifiable transfers between distinct Operators. This provides a robust metric of how far a piece of information has traveled.

## 3. The IRONCLAD Transfer Protocol

To prevent the wasteful transfer of redundant information and guarantee data integrity, Operators perform an intelligent "Handshake" before committing to a full data exchange.

1.  **Pre-Flight Check:** Before sending the full, multi-kilobyte Card, the Sender transmits a lightweight (~100 byte) **Header**. This header contains the Card's unique ID, its content hash, and a hash of its entire `history` ledger.

2.  **Receiver Validation:** The Receiver compares the incoming Header against its local database.
    *   **PERFECT MATCH:** If the Receiver already has a Card with the same ID, content hash, and history hash, the data is a **perfect duplicate**.
    *   **CONFLICT / DIVERGENCE:** If the hashes differ, the Receiver knows it has a different version of the Card and that synchronization is required.

3.  **Acknowledgement (`ACK` / `NACK`):**
    *   If the data is a perfect duplicate, the Receiver sends back a **Negative-Acknowledgement (`NACK`)**. The transfer is immediately and safely aborted, saving time and bandwidth for both parties.
    *   If the data is new or different, the Receiver sends back a positive **Acknowledgement (`ACK`)**, signaling it is ready for the full payload.

4.  **Heavy Payload Transfer:** Only after receiving a positive `ACK` does the Sender transmit the full Card data.

5.  **Final Confirmation & Ledger Update:** Upon successfully receiving the full Card, the Receiver performs two final actions:
    *   It adds a `SHARED` entry to the Card's `history`, documenting that it has taken possession from the Sender.
    *   It sends a final, **cryptographically signed `ACK`** back to the Sender. This `ACK` acts as a verifiable receipt of the transfer.

6.  **Sender's Ledger Update:** The Sender, upon receiving the signed `ACK`, verifies the signature. Only then does it update its own ledger for the Card, adding a corresponding `SHARED` entry. This final step ensures that hop counts only increment after a transfer has been cryptographically proven to be complete.

## 4. Integrity Guarantees

The IRONCLAD protocol provides the following guarantees:

*   **Authenticity:** The `genesis` signature ensures the origin of every Card is verifiable.
*   **Data Integrity:** Content hashes prevent tampering, and the Pre-Flight check ensures ledger consistency.
*   **Efficiency:** The `NACK` mechanism prevents the transfer of redundant data, keeping the mesh fast and responsive.
*   **Non-Repudiation:** The final signed `ACK` provides cryptographic proof that a transfer between two specific Operators occurred at a specific time.
*   **Eventual Consistency:** In the rare case of a ledger divergence, the protocol's history-merging logic ensures that the network will eventually converge on a consistent and complete chain of custody.
