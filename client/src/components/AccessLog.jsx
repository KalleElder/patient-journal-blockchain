import { useEffect, useState } from "react";
import { getAccessLogs } from "../services/api";
import AuditEvent from "./AuditEvent";

// Åtkomstloggen för en patient. Den kommer från blockkedjan via
// GET /api/patients/:id/access-logs, och backend avgör vem som får se den.
export default function AccessLog({ patientId }) {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAccessLogs(patientId)
      .then((data) => {
        // Backend skickar äldst först, nyast överst är lättare att läsa.
        if (active) setLogs([...data.logs].reverse());
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
