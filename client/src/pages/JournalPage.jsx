import { useEffect, useState } from "react";
import { getJournal } from "../services/api";
import { isStaff } from "../roles";
import JournalEntry from "../components/JournalEntry";
import NewEntryForm from "../components/NewEntryForm";

// Journalvyn för en patient. Backend filtrerar redan på behörighet och
// synlighet (PRIVATE/STAFF/ALL), så listan visas som den kommer.
export default function JournalPage({ user, patient, onBack }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Räknas upp när en ny anteckning sparats, så att journalen hämtas om.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getJournal(patient.id)
      .then((data) => {
        if (!active) return;
        setEntries(data);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 403) setError("Du har inte behörighet att läsa den här journalen.");
        else if (err.status === 404) setError("Patienten hittades inte.");
        else setError("Kunde inte hämta journalen.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patient.id, version]);

  function reload() {
    setLoading(true);
    setVersion((v) => v + 1);
  }

  return (
    <section>
      {onBack && (
        <button type="button" className="link" onClick={onBack}>
          ← Alla patienter
        </button>
      )}
      <h2>{isStaff(user) ? `Journal: ${patient.name}` : "Min journal"}</h2>
      <p className="muted">Patient-ID: {patient.id}</p>

      {isStaff(user) && <NewEntryForm patientId={patient.id} onCreated={reload} />}

      {loading && <p className="status">Hämtar journal...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p className="status">Inga journalanteckningar att visa.</p>
      )}
      <ul className="journal">
        {entries.map((entry) => (
          <JournalEntry key={entry.id} entry={entry} />
        ))}
      </ul>
    </section>
  );
}
