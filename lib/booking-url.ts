// "?services=1,1,3" as the booking wizard writes it - one id per person, so
// duplicates are meaningful. Shape only; callers that act on it validate
// with serviceIdsSchema.
export function parseServiceIdsParam(value: string | null | undefined): number[] {
    return value?.split(",").filter(Boolean).map(Number) ?? [];
}
