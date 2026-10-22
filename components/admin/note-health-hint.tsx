// Health data is a special category (Art. 9 GDPR) and would need the client's
// explicit consent, so the free-text client note must not hold it. The privacy
// policy states that no health data is kept.
export function NoteHealthHint() {
    return (
        <p className="text-xs text-pretty text-muted-foreground">
            Nezapisujte zdravotní údaje.
        </p>
    );
}
