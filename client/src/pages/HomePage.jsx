import UserBar from "../components/UserBar";
import { ROLES, isStaff } from "../roles";

// Startsidan efter login. Vad som visas beror på rollen från backend.
// Själva patient- och journalvyerna byggs i nästa steg.
export default function HomePage({ user, onLogout }) {
  return (
    <>
      <UserBar user={user} onLogout={onLogout} />
      <main>
        {isStaff(user) && (
          <section>
            <h2>Patientsökning</h2>
            <p>Kommer i nästa steg.</p>
          </section>
        )}
        {user.role === ROLES.PATIENT && (
          <section>
            <h2>Min journal</h2>
            <p>Patient-ID: {user.patientId}</p>
            <p>Kommer i nästa steg.</p>
          </section>
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
