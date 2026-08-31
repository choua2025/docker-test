/**
 * A colour and a glyph for every subject.
 *
 * Subjects are created by admins, so the palette cannot be hard-coded per row.
 * Known Lao subject names get a hand-picked hue that matches what the subject
 * feels like; anything else falls back to a stable hash, so a newly added
 * subject still gets its own colour and keeps it forever.
 *
 * Each entry is a full set: the tile tint, the ink used on it, and the solid
 * colour for the badge. Keeping them together stops light-on-light accidents.
 */

const PALETTE = [
  { name: "pine",     tint: "#e4f0ec", ink: "#12554d", solid: "#1a6a5f", wash: "#0e433d" },
  { name: "indigo",   tint: "#e5e9f5", ink: "#2c3d73", solid: "#3b4f8f", wash: "#233156" },
  { name: "saffron",  tint: "#f9ecd8", ink: "#8a4d10", solid: "#c2701a", wash: "#6d3d0d" },
  { name: "plum",     tint: "#f1e5ef", ink: "#6a2f60", solid: "#8a3f7d", wash: "#4d2246" },
  { name: "clay",     tint: "#f6e5e1", ink: "#8a3a29", solid: "#b04c36", wash: "#6b2c1f" },
  { name: "moss",     tint: "#e9f0dd", ink: "#455c22", solid: "#5c782d", wash: "#33441a" },
  { name: "teal",     tint: "#dff0f2", ink: "#155a63", solid: "#1d7580", wash: "#0f4149" },
  { name: "mulberry", tint: "#f3e6ea", ink: "#7a2f45", solid: "#9d3c58", wash: "#571f30" },
];

/** The subjects seeded by `npm run seed`, each given a deliberate colour. */
const BY_NAME = {
  ຄະນິດສາດ: 1,   // maths - indigo, the "hard science" colour here
  ຟີຊິກສາດ: 6,   // physics - teal
  ເຄມີສາດ: 3,    // chemistry - plum
  ຊີວະສາດ: 5,    // biology - moss
  ພາສາລາວ: 2,    // Lao language - saffron
  ພາສາອັງກິດ: 0, // English - pine
  ປະຫວັດສາດ: 4,  // history - clay
  ພູມສາດ: 7,     // geography - mulberry
};

/** Small stable hash, so an unknown subject keeps the same colour every visit. */
function hash(text) {
  let value = 0;
  for (let i = 0; i < text.length; i++) {
    value = (value * 31 + text.codePointAt(i)) >>> 0;
  }
  return value;
}

export function subjectTheme(name = "") {
  const index = BY_NAME[name.trim()] ?? hash(name) % PALETTE.length;
  return PALETTE[index];
}

/**
 * The glyph shown on a subject tile.
 *
 * Lao is written without spaces, so "first letter of each word" does not work.
 * The first character alone is the honest choice - and because Lao letters are
 * distinctive, one character is enough to tell subjects apart at a glance.
 */
export function subjectGlyph(name = "") {
  return [...name.trim()][0] ?? "?";
}
