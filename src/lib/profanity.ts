// A deliberately small, whole-word list — enough to catch the common
// English profanity/slurs people actually type, without so many entries
// that ordinary words start getting caught in substring matches (e.g. the
// old "ass"-inside-"assassin" trap). Word-boundary matching still isn't
// perfect (it won't catch deliberate evasions like "f u c k"), but it's a
// straightforward first line of defense with no new dependency.
const BANNED_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "asshole",
  "dumbass",
  "jackass",
  "cunt",
  "dick",
  "prick",
  "pussy",
  "cock",
  "twat",
  "wanker",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "retarded",
  "slut",
  "whore",
];

const BANNED_PATTERN = new RegExp(`\\b(${BANNED_WORDS.join("|")})\\b`, "i");

export function containsProfanity(text: string): boolean {
  return BANNED_PATTERN.test(text);
}
