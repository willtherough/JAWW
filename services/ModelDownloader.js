import * as FileSystem from 'expo-file-system';

const PHI3_URL = 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf';
export const MODEL_PATH = FileSystem.documentDirectory + 'Phi-3-mini-4k-instruct-q4.gguf';

let downloadResumable = null;

export const downloadModel = async (onProgress) => {
    // Check if it already exists
    const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
    if (fileInfo.exists) {
        console.log("Phi-3 model already exists on device.");
        if (onProgress) onProgress(100);
        return true;
    }

    console.log("Starting secure resumable download for Phi-3 (2.3GB)...");

    const callback = downloadProgress => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(Math.floor(progress * 100));
    };

    downloadResumable = FileSystem.createDownloadResumable(
        PHI3_URL,
        MODEL_PATH,
        {},
        callback
    );

    try {
        const { uri } = await downloadResumable.downloadAsync();
        console.log('Finished downloading to ', uri);
        return true;
    } catch (e) {
        console.error("Download failed or interrupted:", e);
        throw e;
    }
};

export const pauseDownload = async () => {
    if (downloadResumable) {
        await downloadResumable.pauseAsync();
        console.log('Download paused.');
    }
};

export const resumeDownload = async () => {
    if (downloadResumable) {
        await downloadResumable.resumeAsync();
        console.log('Download resumed.');
    }
};

export const checkModelExistsAndVerify = async () => {
    const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
    return fileInfo.exists && fileInfo.size > 1000000000; // Must be over 1GB
};

export const deleteModel = async () => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(MODEL_PATH);
            console.log("Phi-3 Model deleted safely.");
        }
    } catch (e) {
        console.error("Failed to delete model:", e);
    }
};
