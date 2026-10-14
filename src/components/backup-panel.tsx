"use client";
import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { parseBackup, MAX_BACKUP_BYTES } from "@/lib/backup";
import { useGameStore } from "@/lib/store";
import { Button } from "./ui/button";
export function BackupPanel() {
  const store = useGameStore();
  const [preview, setPreview] = useState<ReturnType<typeof parseBackup> | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const selection = useRef(0);
  function exportData() {
    store.recordBackup();
    const state = useGameStore.getState();
    const data = JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        current: state.current,
        history: state.history,
        profiles: state.profiles,
        settings: state.settings,
        lastBackupAt: state.lastBackupAt,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `oche-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function choose(file?: File) {
    const current = ++selection.current;
    setPreview(null);
    setMessage("");
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES)
        throw Error("Backup must be smaller than 10 MB.");
      const parsed = parseBackup(await file.text());
      if (current === selection.current) setPreview(parsed);
    } catch (error) {
      if (current === selection.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not read this backup.",
        );
    }
  }
  return (
    <div className="backup-panel">
      <Button variant="outline" onClick={exportData}>
        <Download size={17} /> Export data as JSON
      </Button>
      <p className="small muted">
        Last export requested:{" "}
        {store.lastBackupAt
          ? new Date(store.lastBackupAt).toLocaleString()
          : "Never"}
        . Keep the downloaded file somewhere safe.
      </p>
      <label className="field-label">
        Restore a backup
        <input
          type="file"
          accept=".json,application/json"
          disabled={store.readOnly || !!store.storageError}
          aria-label="Import Oche backup"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </label>
      {preview && (
        <section className="backup-preview" aria-label="Backup preview">
          <h3>Review this backup</h3>
          <p>
            {preview.profiles.length} players, {preview.history.length}{" "}
            completed matches,{" "}
            {preview.current?.game.status === "playing"
              ? "1 active match"
              : "no active match"}
            .
          </p>
          <p>
            This replaces all players, matches and preferences in this browser,
            including any unfinished match. Export your current data first.
          </p>
          <div className="action-row">
            <Button
              disabled={store.readOnly}
              onClick={() => {
                try {
                  store.restoreBackup(preview);
                  setPreview(null);
                  setMessage("Backup restored. Your scorebook is ready.");
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Backup could not be restored.",
                  );
                }
              }}
            >
              Replace local data with this backup
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                ++selection.current;
                setPreview(null);
              }}
            >
              Cancel import
            </Button>
          </div>
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
