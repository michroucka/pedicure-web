import { describe, expect, it } from "vitest";
import { bindSingleLetterWords } from "./czech-typography";

const NBSP = " ";

describe("bindSingleLetterWords", () => {
    it("binds a one-letter preposition or conjunction to the next word", () => {
        expect(bindSingleLetterWords("ale i o tom")).toBe(
            `ale i${NBSP}o${NBSP}tom`
        );
        expect(bindSingleLetterWords("péče v salonu")).toBe(
            `péče v${NBSP}salonu`
        );
    });

    it("handles every Czech one-letter word, upper and lower case", () => {
        for (const letter of ["a", "i", "k", "o", "s", "u", "v", "z"]) {
            expect(bindSingleLetterWords(`x ${letter} y`)).toBe(
                `x ${letter}${NBSP}y`
            );
            const upper = letter.toUpperCase();
            expect(bindSingleLetterWords(`${upper} y`)).toBe(
                `${upper}${NBSP}y`
            );
        }
    });

    it("binds after an opening quote or parenthesis", () => {
        expect(bindSingleLetterWords("„v klidu“ (s úsměvem)")).toBe(
            `„v${NBSP}klidu“ (s${NBSP}úsměvem)`
        );
    });

    it("binds a trailing one-letter word to whatever follows the string", () => {
        expect(bindSingleLetterWords("objednat se k ")).toBe(
            `objednat se k${NBSP}`
        );
    });

    it("leaves longer words and letters inside words alone", () => {
        expect(bindSingleLetterWords("na paty, kde má kůže")).toBe(
            "na paty, kde má kůže"
        );
        expect(bindSingleLetterWords("Kateřina")).toBe("Kateřina");
    });

    it("ignores letters that aren't Czech one-letter words", () => {
        expect(bindSingleLetterWords("bod b je")).toBe("bod b je");
    });
});
