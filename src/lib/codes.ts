// Short, unmistakable codes for manual entry — excludes easily-confused
// characters (0/O, 1/I) since staff or travellers may type or read these
// aloud. Same alphabet as referral codes (src/lib/referral.ts).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShortCode(length = 8) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
