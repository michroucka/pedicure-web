import { NextResponse } from "next/server";
import { getBookingGroupByToken } from "@/lib/get-booking-group-by-token";
import { generateBookingIcs } from "@/lib/generate-booking-ics";

// "Přidat do kalendáře" on the manage page - same magic-link token, so
// only someone who can see the booking can download it.
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const bookings = await getBookingGroupByToken(token);
    if (!bookings || bookings[0].status !== "CONFIRMED") {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return new NextResponse(generateBookingIcs(bookings), {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="pedikura.ics"',
            "Cache-Control": "private, no-store",
        },
    });
}
