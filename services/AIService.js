import { initLlama } from 'llama.rn';
import { MODEL_PATH } from './ModelDownloader';

let context = null;

export const loadModel = async (modelPath) => {
    if (context) {
        console.log("Phi-3 already loaded into RAM.");
        return context;
    }
    
    console.log("Booting Microsoft Phi-3 Mini Engine...");
    
    try {
        // Initialize llama.rn Context
        context = await initLlama({
            model: modelPath,
            use_mlock: true, // Lock into RAM
            n_ctx: 4096,     // Phi-3 Mini supports 4K context window natively
            n_gpu_layers: 20 // Offload some layers to GPU if possible, but keep it low for stability
        });
        
        console.log("Phi-3 successfully loaded into Memory.");
        return context;
    } catch (e) {
        console.error("Failed to boot Phi-3 engine:", e);
        throw e;
    }
};

export const generateResponse = async (systemPrompt, userQuery, onToken) => {
    if (!context) {
        throw new Error("Engine not loaded.");
    }

    // Phi-3 Strict Formatting Template
    const phi3Prompt = `<|system|>\n${systemPrompt}<|end|>\n<|user|>\n${userQuery}<|end|>\n<|assistant|>\n`;

    try {
        await context.completion({
            prompt: phi3Prompt,
            n_predict: 500,
            temperature: 0.3,
            stop: ["<|end|>", "<|user|>"],
        }, (data) => {
            if (data.token) {
                if (onToken) onToken(data.token);
            }
        });
    } catch (e) {
        console.error("Inference Error:", e);
        throw e;
    }
};

export const releaseModel = async () => {
    if (context) {
        await context.release();
        context = null;
        console.log("Phi-3 safely purged from RAM.");
    }
};
