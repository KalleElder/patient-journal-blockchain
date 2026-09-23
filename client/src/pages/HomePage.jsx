import { useState } from "react";
import UserBar from "../components/UserBar";
import PatientListPage from "./PatientListPage";
import JournalPage from "./JournalPage";
import { ROLES, isStaff } from "../roles";

// Startsidan efter login. Vad som visas beror på rollen från backend.
// Vårdpersonal väljer patient i listan, en patient landar direkt i sin egen journal.
export default function HomePage({ user, onLogout }) {
  const [patient, setPatient] = useState(null);

  return (
    <>
      <UserBar user={user} onLogout={onLogout} />
      <main>
        {isStaff(user) && !patient && <PatientListPage onSelect={setPatient} />}
        {isStaff(user) && patient && (
          <JournalPage user={user} patient={patient} onBack={() => setPatient(null)} />
        )}
        {user.role === ROLES.PATIENT && (
          <JournalPage user={user} patient={{ id: user.patientId, name: user.name }} />
        )}
        {!isStaff(user) && user.role !== ROLES.PATIENT && (
          <section>
            <h2>Åtkomst nekad</h2>
            <p>Din roll har inte tillgång till journalsystemet.</p>
          </section>
        )}
      </main>
    </>
  );
}
