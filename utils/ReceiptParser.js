/**
 * ReceiptParser.js
 * Parses unstructured text from ML Kit OCR into structured Purchase payloads.
 */

export function parseReceiptData(ocrResultText) {
    if (!ocrResultText) return null;

    // ML Kit usually returns a single string with newlines for different blocks/lines
    const lines = ocrResultText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length === 0) return null;

    // 1. Identify Store (Heuristic: usually the first line)
    // We filter out common top-of-receipt junk like dates or phone numbers
    let storeName = "Unknown Store";
    for (const line of lines) {
        if (!line.match(/^[0-9]/) && line.length > 3) {
            storeName = line;
            break;
        }
    }

    const items = [];
    const noiseWords = ['TAX', 'TOTAL', 'SUBTOTAL', 'CASH', 'CHANGE', 'VISA', 'MASTERCARD', 'AMEX', 'DEBIT', 'CREDIT', 'BALANCE', 'DUE'];

    // 2. Identify Line Items and Prices
    // Heuristic: Look for a price pattern ($X.XX or X.XX). The item name is usually on the same line or the line immediately before it.
    const priceRegex = /\$?\s*(\d+\.\d{2})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip noise
        if (noiseWords.some(noise => line.toUpperCase().includes(noise))) {
            continue;
        }

        const match = line.match(priceRegex);
        if (match) {
            const price = parseFloat(match[1]);
            
            // Extract the text part of the line by removing the price
            let rawText = line.replace(priceRegex, '').trim();
            
            // If the text is empty or just weird symbols, the item name was probably on the previous line
            if (rawText.length < 3 && i > 0) {
                // Check if the previous line was already claimed or is noise
                const prevLine = lines[i - 1];
                if (!prevLine.match(priceRegex) && !noiseWords.some(noise => prevLine.toUpperCase().includes(noise))) {
                    rawText = prevLine;
                }
            }

            // Clean up the text
            rawText = rawText.replace(/[^a-zA-Z0-9\s]/g, '').trim();

            if (rawText.length > 1 && price > 0) {
                items.push({
                    rawText: rawText.substring(0, 30), // Keep it reasonable
                    price: price,
                    quantity: 1 // Default quantity for OCR simplicity
                });
            }
        }
    }

    return {
        store: storeName,
        date: new Date().toISOString(),
        items: items
    };
}
