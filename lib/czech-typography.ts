// Czech typography doesn't allow a one-letter preposition or conjunction
// (v, k, s, z, o, u, a, i) at the end of a line – a non-breaking space
// keeps it with the next word. The lookbehind doesn't consume the space
// before the letter, so runs like "a v lese" get both bound.
const SINGLE_LETTER_WORD = /(?<=^|[\s „(])([aikosuvz])\s+(?=\S|$)/giu;

export function bindSingleLetterWords(text: string): string {
    return text.replace(SINGLE_LETTER_WORD, "$1 ");
}
