import { useState } from "react";
import { createJournalEntry } from "../services/api";

// Formulär för ny journalanteckning. Visas bara för vårdpersonal, men backend
// avgör ändå behörigheten (PATIENT får 403).
export default function NewEntryForm({ patientId, onCreated }) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("STAFF");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!content.trim()) {
      setError("Skriv något i anteckningen först.");
      return;
    }
    setSaving(true);
    try {
      await createJournalEntry(patientId, content.trim(), visibility);
      setContent("");
      onCreated();
    } catch (err) {
      if (err.status === 403) setError("Du har inte behörighet att skapa anteckningar.");
      else if (err.status === 400) setError("Anteckningen kunde inte sparas: kontrollera texten och synligheten.");
      else setError("Kunde inte spara anteckningen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="new-entry" onSubmit={handleSubmit}>
      <h3>Ny anteckning</h3>
      <label>
        Text
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
        />
      </label>
      <label>
        Synlighet
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="PRIVATE">Privat – bara jag</option>
          <option value="STAFF">Vårdpersonal</option>
          <option value="ALL">Alla – även patienten</option>
        </select>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? "Sparar..." : "Spara anteckning"}</button>
    </form>
  );
}
