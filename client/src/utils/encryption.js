import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

/**
 * Generates a Public/Private key pair for End-to-End Encryption.
 * Stores the Private Key safely in the browser.
 * Returns the Public Key to be sent to the server.
 */
export const generateAndStoreKeyPair = () => {
    // 1. Generate the raw cryptographic keys
    const keyPair = nacl.box.keyPair();

    // 2. Convert the raw bytes into readable Base64 strings
    const publicKeyBase64 = util.encodeBase64(keyPair.publicKey);
    const privateKeyBase64 = util.encodeBase64(keyPair.secretKey);

    // 3. LOCK THE PRIVATE KEY IN THE BROWSER (Never send this anywhere!)
    localStorage.setItem('chatflow_private_key', privateKeyBase64);

    // 4. Return the Public Key so the React app can send it to PostgreSQL
    return publicKeyBase64;
};

/**
 * Retrieves the user's Public Key from Local Storage.
 * Useful for checking if keys have already been generated.
 */
export const getLocalPrivateKey = () => {
    return localStorage.getItem('chatflow_private_key');
};

// --- NEW E2EE FUNCTIONS ---

export const encryptMessage = (text, receiverPublicKeyBase64) => {
    const senderPrivateKeyBase64 = getLocalPrivateKey();
    if (!senderPrivateKeyBase64) throw new Error("Private key missing");

    // 1. Generate a single-use random lock (Nonce)
    const nonce = nacl.randomBytes(24);
    
    // 2. Convert everything into raw byte streams
    const messageUint8 = util.decodeUTF8(text);
    const receiverPubKeyUint8 = util.decodeBase64(receiverPublicKeyBase64);
    const senderPrivKeyUint8 = util.decodeBase64(senderPrivateKeyBase64);

    // 3. Lock the box! (Encrypt)
    const encryptedBox = nacl.box(messageUint8, nonce, receiverPubKeyUint8, senderPrivKeyUint8);

    // 4. Bundle the Nonce and the Box together so the receiver can open it
    const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
    fullMessage.set(nonce);
    fullMessage.set(encryptedBox, nonce.length);

    // 5. Convert back to a string so it can travel over the Socket
    return util.encodeBase64(fullMessage);
};

export const decryptMessage = (encryptedBase64, senderPublicKeyBase64) => {
    const receiverPrivateKeyBase64 = getLocalPrivateKey();
    if (!receiverPrivateKeyBase64) return "[Decryption Failed: No Private Key]";

    try {
        // 1. Unpack the byte stream
        const messageWithNonceAsUint8Array = util.decodeBase64(encryptedBase64);
        
        // 2. Separate the Nonce from the actual message
        const nonce = messageWithNonceAsUint8Array.slice(0, 24);
        const message = messageWithNonceAsUint8Array.slice(24);

        const senderPubKeyUint8 = util.decodeBase64(senderPublicKeyBase64);
        const receiverPrivKeyUint8 = util.decodeBase64(receiverPrivateKeyBase64);

        // 3. Unlock the box! (Decrypt)
        const decryptedPayload = nacl.box.open(message, nonce, senderPubKeyUint8, receiverPrivKeyUint8);

        if (!decryptedPayload) return "[Decryption Failed: Invalid Key]";

        return util.encodeUTF8(decryptedPayload);
    } catch (e) {
        return "[Encrypted Message]";
    }
};