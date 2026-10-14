import { restorePersistedData } from "./persistence";
export const MAX_BACKUP_BYTES = 10_000_000;
export function parseBackup(raw: string) {
  if (raw.length > MAX_BACKUP_BYTES)
    throw Error("Backup must be smaller than 10 MB.");
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error("Choose a valid Oche JSON backup.");
  }
  if (!value || typeof value !== "object" || value.version !== 1)
    throw Error("This backup version is not supported.");
  try {
    return restorePersistedData(value);
  } catch {
    throw Error(
      "The backup contains invalid match or player data. Nothing was changed.",
    );
  }
}
