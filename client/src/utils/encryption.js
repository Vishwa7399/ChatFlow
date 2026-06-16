import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import CryptoJS from 'crypto-js';

// --- NEW: Generate keys but DO NOT store them yet ---
export const generateKeyPair = () => {
    const keyPair = nacl.box.keyPair();
    return {
        publicKey: util.encodeBase64(keyPair.publicKey),
        privateKey: util.encodeBase64(keyPair.secretKey)
    };
};

// --- NEW: The AES Password Vault ---
export const lockPrivateKey = (privateKeyBase64, password) => {
    // Encrypts the private key using the user's plaintext password
    return CryptoJS.AES.encrypt(privateKeyBase64, password).toString();
};

export const unlockPrivateKey = (encryptedPrivateKey, password) => {
    try {
        // Decrypts the vault using the entered password
        const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, password);
        const originalPrivateKey = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!originalPrivateKey) throw new Error("Wrong password or corrupted key");
        return originalPrivateKey;
    } catch (error) {
        console.error("🚨 CRITICAL: Failed to unlock the Private Key Vault!");
        return null;
    }
};

// --- EXISTING HELPER ---
export const getLocalPrivateKey = () => {
    return localStorage.getItem('chatflow_private_key');
};

// ... keep encryptMessage and decryptMessage exactly as they are below this line!

export const encryptMessage = (text, receiverPublicKeyBase64) => {
    const senderPrivateKeyBase64 = getLocalPrivateKey();
    
    if (!senderPrivateKeyBase64) {
        console.error("🚨 ENCRYPTION BLOCKED: Sender has no Private Key in this browser's memory!");
        return text; // Fallback to plaintext so the app doesn't crash
    }

    try {
        const nonce = nacl.randomBytes(24);
        const messageUint8 = util.decodeUTF8(text);
        const receiverPubKeyUint8 = util.decodeBase64(receiverPublicKeyBase64);
        const senderPrivKeyUint8 = util.decodeBase64(senderPrivateKeyBase64);

        const encryptedBox = nacl.box(messageUint8, nonce, receiverPubKeyUint8, senderPrivKeyUint8);

        const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
        fullMessage.set(nonce);
        fullMessage.set(encryptedBox, nonce.length);

        return util.encodeBase64(fullMessage);
    } catch (error) {
        console.error("🚨 ENCRYPTION CRASHED:", error);
        return text;
    }
};

export const decryptMessage = (encryptedBase64, senderPublicKeyBase64) => {
    const receiverPrivateKeyBase64 = getLocalPrivateKey();
    
    if (!receiverPrivateKeyBase64) {
        console.error("🚨 DECRYPTION BLOCKED: Receiver is missing their Private Key in LocalStorage!");
        return "🔒 [Encrypted: Private Key Missing on this Device]";
    }

    try {
        const messageWithNonceAsUint8Array = util.decodeBase64(encryptedBase64);
        
        // Safety Check: If it's too short, it's likely an old legacy plaintext message
        if (messageWithNonceAsUint8Array.length < 24) return encryptedBase64; 

        const nonce = messageWithNonceAsUint8Array.slice(0, 24);
        const message = messageWithNonceAsUint8Array.slice(24);

        const senderPubKeyUint8 = util.decodeBase64(senderPublicKeyBase64);
        const receiverPrivKeyUint8 = util.decodeBase64(receiverPrivateKeyBase64);

        const decryptedPayload = nacl.box.open(message, nonce, senderPubKeyUint8, receiverPrivKeyUint8);

        if (!decryptedPayload) {
            console.error("🚨 DECRYPTION FAILED: Mathematical Mismatch (Keys do not align)!");
            return "🔒 [Encrypted: Invalid Key]";
        }

        return util.encodeUTF8(decryptedPayload);
    } catch (e) {
        // If decoding crashes, it means the message was just legacy plain text!
        return encryptedBase64; 
    }
};