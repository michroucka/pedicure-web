import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CzechText } from "./czech-text";

const NBSP = " ";

describe("CzechText", () => {
    it("binds one-letter words in nested elements and keeps their props", () => {
        const html = renderToStaticMarkup(
            <CzechText>
                <section className="intro">
                    <h2>Péče o nohy</h2>
                    <p>
                        Nejen jak vypadají, ale i o tom, <b>jak se v nich</b>{" "}
                        cítíte.
                    </p>
                </section>
            </CzechText>
        );

        expect(html).toBe(
            `<section class="intro"><h2>Péče o${NBSP}nohy</h2>` +
                `<p>Nejen jak vypadají, ale i${NBSP}o${NBSP}tom, <b>jak se v${NBSP}nich</b> cítíte.</p></section>`
        );
    });

    it("passes elements without children and other values through", () => {
        const html = renderToStaticMarkup(
            <CzechText>
                <hr className="divider" />
                {null}
                {42}
            </CzechText>
        );

        expect(html).toBe('<hr class="divider"/>42');
    });
});
