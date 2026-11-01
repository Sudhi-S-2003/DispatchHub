import * as crypto from 'crypto';

export interface DkimKeyPair {
  publicKey: string;
  privateKey: string;
  dnsTxtRecord: string;
}

export function generateDkimKeyPair(selector: string = 'postal'): DkimKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Strip PEM headers and newlines to get the pure base64 public key for DNS TXT
  const cleanPublicKey = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\r?\n|\r/g, '')
    .trim();

  const dnsTxtRecord = `v=DKIM1; k=rsa; p=${cleanPublicKey}`;

  return {
    publicKey: cleanPublicKey,
    privateKey,
    dnsTxtRecord,
  };
}
