// En händelse ur blockkedjans auditlogg. Innehåller bara metadata, aldrig journaltext.
const ACTION_LABEL = {
  READ_JOURNAL: "Läste journalen",
  CREATE_JOURNAL_ENTRY: "Skrev en anteckning",
  ACCESS_DENIED: "Nekad åtkomst",
};

const ROLE_LABEL = {
  DOCTOR: "Läkare",
  NURSE: "Sjuksköterska",
  CARE_CENTER: "Vårdcentral",
  PATIENT: "Patient",
  UNAUTHORIZED: "Obehörig",
};

export default function AuditEvent({ event, blockIndex, showPatient = false }) {
  const denied = event.action === "ACCESS_DENIED";
  return (
    <li className={denied ? "audit audit-denied" : "audit"}>
      <div className="audit-head">
        <strong>{ACTION_LABEL[event.action] || event.action}</strong>
        {blockIndex !== undefined && <span className="tag">Block #{blockIndex}</span>}
        <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString("sv-SE")}</time>
      </div>
      <span className="muted audit-meta">
        <span>{ROLE_LABEL[event.role] || event.role}</span> · <span>användar-ID {event.userId}</span>
        {showPatient && <> · <span>patient-ID {event.patientId}</span></>}
      </span>
    </li>
  );
}
