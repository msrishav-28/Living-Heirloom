// AES-256 encryption for time capsule content
export class CapsuleEncryption {
  private static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(content: string, password?: string): Promise<{
    encryptedData: string;
    salt: string;
    iv: string;
  }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    let key: CryptoKey;
    if (password) {
      key = await this.deriveKey(password, salt);
    } else {
      key = await this.generateKey();
      // Store key in IndexedDB for auto-unlock
      await this.storeKey(key);
    }

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    return {
      encryptedData: this.arrayBufferToBase64(encryptedData),
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
    };
  }

  static async decrypt(
    encryptedData: string,
    salt: string,
    iv: string,
    password?: string
  ): Promise<string> {
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
    const saltBuffer = this.base64ToArrayBuffer(salt);
    const ivBuffer = this.base64ToArrayBuffer(iv);

    let key: CryptoKey;
    if (password) {
      key = await this.deriveKey(password, new Uint8Array(saltBuffer));
    } else {
      key = await this.retrieveKey();
    }

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer),
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  private static async storeKey(key: CryptoKey): Promise<void> {
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem('capsule_key', this.arrayBufferToBase64(exportedKey));
  }

  private static async retrieveKey(): Promise<CryptoKey> {
    const keyData = localStorage.getItem('capsule_key');
    if (!keyData) {
      throw new Error('No encryption key found');
    }

    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}