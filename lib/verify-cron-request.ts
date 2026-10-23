import { NextRequest, NextResponse } from "next/server";

// Vercel Cron calls every cron route with `Authorization: Bearer $CRON_SECRET`
// (set automatically once the CRON_SECRET env var exists on the project).
// Returns the error response to send back, or null if the request may run.
export function verifyCronRequest(request: NextRequest): NextResponse | null {
    if (!process.env.CRON_SECRET) {
        console.error("CRON_SECRET env var not set");
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 }
        );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
}
