// How long client records are kept after their last visit. Matches the
// general 3-year limitation period (§ 629 OZ), so a claim can still be backed
// by the booking history. Stated in the privacy policy — change both together
// (and mind the Czech plural there: 2–4 "roky", 5+ "let").
export const CLIENT_RETENTION_YEARS = 3;

// Nightly encrypted DB backups (pedicure-db-backup repo) keep artifacts this
// long, so deleted data disappears from backups within this window too.
export const BACKUP_RETENTION_DAYS = 30;
