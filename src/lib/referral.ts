const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short, unmistakable referral code — excludes easily-confused characters
 * (0/O, 1/I) since travellers will type or read these aloud. */
export function generateReferralCode(length = 7) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
