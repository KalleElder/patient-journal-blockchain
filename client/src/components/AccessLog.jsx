import { useEffect, useState } from "react";
import { getAccessLogs } from "../services/api";
import AuditEvent from "./AuditEvent";

// Åtkomstloggen för en patient. Den kommer från blockkedjan via
// GET /api/patients/:id/access-logs, och backend avgör vem som får se den.
// verified kommer från backend och gäller hela kedjan. Saknas fältet visas ingen badge.
export default function AccessLog({ patientId }) {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    let active = true;
    getAccessLogs(patientId)
      .then((data) => {
        // Backend skickar äldst först, nyast överst är lättare att läsa.
        if (!active) return;
        setLogs([...data.logs].reverse());
        setVerified(typeof data.verified === "boolean" ? data.verified : null);
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 403) setError("Du har inte behörighet att se åtkomstloggen.");
        else if (err.status === 404) setError("Patienten hittades inte.");
        else setError("Kunde inte hämta åtkomstloggen.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  return (
    <div className="access-log">
      {verified === true && (
        <div className="verify verify-ok" role="status">
          <strong><span aria-hidden="true">✓</span> Kedjan verifierad</strong>
          <span>Backend har kontrollerat hela blockkedjan, inte bara den här patientens poster.</span>
        </div>
      )}
      {verified === false && (
        <div className="verify verify-fail" role="alert">
          <strong><span aria-hidden="true">✗</span> Verifiering misslyckades</strong>
          <span>Blockkedjan stämmer inte. Någon post i den delade kedjan kan ha ändrats, så loggen går inte att lita på.</span>
        </div>
      )}
      <p className="muted">Varje gång journalen läses eller ändras sparas det i blockkedjan.</p>
      {loading && <p className="status">Hämtar åtkomstlogg...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && logs.length === 0 && <p className="status">Inga loggade åtkomster ännu.</p>}
      <ul className="audit-list">
        {logs.map((event, index) => (
          <AuditEvent key={index} event={event} />
        ))}
      </ul>
    </div>
  );
}
