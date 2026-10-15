"use client";
import { useEffect, useReducer, useState } from "react";
import { sheetLog } from "@/lib/sheet-log";
import { useGameStore } from "@/lib/store";
import { Button } from "./ui/button";

export function SheetLogPanel() {
  const readOnly = useGameStore((s) => s.readOnly);
  const history = useGameStore((s) => s.history);
  const [config, setConfig] = useState(() => sheetLog.getConfig());
  const [message, setMessage] = useState("");
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = window.setInterval(refresh, 2000);
    return () => window.clearInterval(id);
  }, []);
  const status = sheetLog.status();
  const configured = config.url !== "";

  async function sendNow() {
    setMessage("Sending...");
    await sheetLog.flush();
    refresh();
    setMessage("");
  }

  async function sendAll() {
    const added = history.filter((m) => sheetLog.enqueue(m)).length;
    setMessage(added ? `Queued ${added} finished matches.` : "Every finished match is already queued or sent.");
    await sheetLog.flush();
    refresh();
  }

  return (
    <div className="backup-panel">
      <h3>Google Sheet log</h3>
      <p className="small muted">
        Each finished match is added as one row. Paste the web app URL and token from your
        sheet&apos;s Apps Script. Matches are kept on this device either way.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sheetLog.setConfig(config);
          setMessage("Saved.");
          refresh();
        }}
      >
        <label className="field-label">
          Web app URL
          <input
            type="url"
            value={config.url}
            placeholder="https://script.google.com/macros/s/…/exec"
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            disabled={readOnly}
          />
        </label>
        <label className="field-label">
          Token
          <input
            type="password"
            value={config.token}
            autoComplete="off"
            onChange={(e) => setConfig({ ...config, token: e.target.value })}
            disabled={readOnly}
          />
        </label>
        <div className="action-row">
          <Button type="submit" variant="outline" disabled={readOnly}>
            Save sheet settings
          </Button>
          <Button type="button" variant="outline" disabled={!configured || status.pending === 0} onClick={() => void sendNow()}>
            Send queued matches
          </Button>
          <Button type="button" variant="ghost" disabled={!configured || readOnly} onClick={() => void sendAll()}>
            Send all finished matches
          </Button>
        </div>
      </form>
      <p className="small muted" role="status">
        Waiting to send: {status.pending}. Last sent:{" "}
        {status.lastSentAt ? new Date(status.lastSentAt).toLocaleString("en-GB") : "never"}.
        {status.lastError ? ` Last error: ${status.lastError}` : ""}
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
