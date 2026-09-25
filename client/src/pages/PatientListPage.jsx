import { useEffect, useState } from "react";
import { getPatients } from "../services/api";

// Patientlista för vårdpersonal. Backend ger bara listan till DOCTOR/NURSE/CARE_CENTER.
export default function PatientListPage({ onSelect }) {
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch((err) => setError(err.status === 403 ? "Du har inte behörighet att se patientlistan." : "Kunde inte hämta patienter."))
      .finally(() => setLoading(false));
  }, []);

  const visible = patients.filter((p) =>
    p.name.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <section>
      <h2>Patienter</h2>
      <label>
        Sök patient
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Namn"
        />
      </label>
      {loading && <p className="status">Hämtar patienter...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && visible.length === 0 && <p className="status">Inga patienter matchar.</p>}
      <ul className="patient-list">
        {visible.map((p) => (
          <li key={p.id}>
            <button type="button" className="patient" onClick={() => onSelect(p)}>
              <span>{p.name}</span>
              <span className="muted">ID {p.id}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
