// Summed per requested id, not per fetched service: `where: { id: { in } }`
// returns each service once, so two people with the same service would
// otherwise only count it once.
export function sumServiceDurations(
    serviceIds: number[],
    services: { id: number; durationMinutes: number }[]
): number {
    const durationById = new Map(
        services.map((s) => [s.id, s.durationMinutes])
    );
    return serviceIds.reduce((sum, id) => sum + (durationById.get(id) ?? 0), 0);
}
