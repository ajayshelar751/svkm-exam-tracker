export async function hashPassword(plainText) {
  if (!plainText) return "";
  try {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      const msgUint8 = new TextEncoder().encode(plainText);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return "sha256:" + hashHex;
    }
  } catch (e) {
    console.warn("crypto.subtle not available, using fallback hash", e);
  }
  // Deterministic fallback for non-HTTPS file:// testing
  let hash = 0x811c9dc5;
  for (let i = 0; i < plainText.length; i++) {
    hash ^= plainText.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return "fb:" + (hash >>> 0).toString(16);
}

export async function verifyPassword(inputPassword, storedPasswordOrHash) {
  if (!inputPassword || !storedPasswordOrHash) return false;
  if (storedPasswordOrHash === inputPassword) return true;
  const hashedInput = await hashPassword(inputPassword);
  return hashedInput === storedPasswordOrHash;
}
