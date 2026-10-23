"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { BUSINESS_INFO } from "@/lib/business-info.ts";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = {
    render: (
        container: HTMLElement,
        options: Record<string, unknown>
    ) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

// Cloudflare Turnstile for the booking forms. "interaction-only" keeps it
// invisible unless Cloudflare actually wants the visitor to click. A token
// is single-use, so the form calls reset() after every submit attempt.
// Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it renders nothing and never
// blocks the form (the server skips the check too, see lib/turnstile.ts).
//
// Submitting without a token would only bounce off the server, so a widget
// that can't load (content blocker, network) or errors keeps the form
// disabled – but says why instead of leaving a dead button. Turnstile
// retries on its own, so a later success clears the error again.
export function useTurnstile() {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [scriptReady, setScriptReady] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const turnstile = window.turnstile;
        if (!SITE_KEY || !scriptReady || !turnstile || !containerRef.current)
            return;

        const widgetId = turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            language: "cs",
            appearance: "interaction-only",
            callback: (newToken: string) => {
                setToken(newToken);
                setFailed(false);
            },
            "expired-callback": () => setToken(null),
            "error-callback": () => {
                setToken(null);
                setFailed(true);
            },
            "unsupported-callback": () => setFailed(true),
        });
        widgetIdRef.current = widgetId;

        return () => {
            turnstile.remove(widgetId);
            widgetIdRef.current = null;
        };
    }, [scriptReady]);

    const reset = useCallback(() => {
        setToken(null);
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
    }, []);

    const widget = SITE_KEY ? (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                onReady={() => setScriptReady(true)}
                onError={() => setFailed(true)}
            />
            <div
                ref={containerRef}
                className="mt-4"
            />
            {failed && (
                <Alert
                    variant="warning"
                    className="mt-4"
                >
                    <AlertCircle />
                    <AlertTitle>Ověření se nepodařilo načíst</AlertTitle>
                    <AlertDescription>
                        Zkuste prosím obnovit stránku, případně vypnout
                        blokování reklam. Rezervovat se můžete i telefonicky na{" "}
                        {BUSINESS_INFO.phoneDisplay}.
                    </AlertDescription>
                </Alert>
            )}
        </>
    ) : null;

    return { widget, token, reset, ready: !SITE_KEY || token !== null };
}
