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