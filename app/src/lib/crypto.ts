import crypto from 'crypto';

// Lê a chave de criptografia das variáveis de ambiente
const encryptionKey = process.env.ENCRYPTION_KEY;
const algorithm = 'aes-256-cbc'; // Algoritmo AES de 256 bits em modo CBC
const ivLength = 16; // O Vetor de Inicialização (IV) para AES é sempre 16 bytes

// Valida se a chave foi carregada e tem o tamanho correto (32 bytes para aes-256)
if (!encryptionKey || Buffer.from(encryptionKey, 'utf-8').length !== 32) {
  // Nota: A chave gerada anteriormente tem mais de 32 bytes, mas Buffer.from pegará os primeiros 32.
  // Idealmente, a chave deve ter exatamente 32 bytes.
  // Considerar usar uma função de derivação de chave (KDF) se a chave original não tiver 32 bytes.
  // Por simplicidade, vamos truncar/usar os primeiros 32 bytes se for maior.
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is missing in environment variables.');
  }
  console.warn(
    'Warning: ENCRYPTION_KEY should ideally be 32 bytes long for aes-256-cbc. Using the first 32 bytes if longer, or padding if shorter (less secure).'
  );
  // Ajusta a chave para 32 bytes (não ideal para chaves curtas)
  // encryptionKey = Buffer.alloc(32, encryptionKey, 'utf-8').toString('utf-8');
}

// Garante que a chave tenha 32 bytes para o algoritmo
const keyBuffer = Buffer.alloc(32);
keyBuffer.write(encryptionKey, 'utf-8');


/**
 * Criptografa um texto usando AES-256-CBC.
 * @param text O texto a ser criptografado.
 * @returns String no formato "iv:encryptedData" (hexadecimal).
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(ivLength); // Gera um IV aleatório
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Concatena IV e dados criptografados
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data.');
  }
}

/**
 * Descriptografa um texto previamente criptografado com a função encrypt.
 * @param text O texto criptografado no formato "iv:encryptedData" (hexadecimal).
 * @returns O texto original descriptografado.
 */
export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted text format. Expected "iv:encryptedData".');
    }
    const iv = Buffer.from(textParts[0], 'hex'); // Extrai o IV
    const encryptedText = textParts[1];
    
    // Verifica se o IV tem o tamanho correto
     if (iv.length !== ivLength) {
        throw new Error(`Invalid IV length. Expected ${ivLength} bytes, got ${iv.length}.`);
    }

    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // Evita vazar detalhes do erro, mas loga no servidor
    if (error instanceof Error && error.message.includes('Invalid IV length')) {
         throw new Error('Decryption failed due to invalid data format (IV length).');
    } else if (error instanceof Error && (error as any).code === 'ERR_OSSL_BAD_DECRYPT') {
         // Ocorre com chave errada ou dados corrompidos
         throw new Error('Decryption failed. Invalid key or corrupted data.');
    }
    throw new Error('Failed to decrypt data.');
  }
}
