export function getBookingPersonName(booking: {
    client: { name: string };
    guestName: string | null;
}) {
    return booking.guestName ?? booking.client.name;
}
