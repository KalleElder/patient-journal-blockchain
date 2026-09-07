// Audit-formatet är gemensamt för backend och blockchain, se docs/api-contract.md.
// Endast dessa fält får läggas i ett block.
const ALLOWED_FIELDS = ['userId', 'patientId', 'role', 'action', 'timestamp'];

const KNOWN_ROLES = ['DOCTOR', 'NURSE', 'CARE_CENTER', 'PATIENT', 'UNAUTHORIZED'];

// Blockkedjan får aldrig innehålla medicinsk journaltext. I stället för att
// lita på att varje anropande route kommer ihåg det avvisas allt som inte är
// ett av de tillåtna metadatafälten. Skickar någon med content, diagnos eller
// annan fritext går det inte att lägga in i kedjan.
function buildAuditData(event) {
  if (event === null || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('Audit-event måste vara ett objekt');
  }

  const forbidden = Object.keys(event).filter((field) => !ALLOWED_FIELDS.includes(field));
  if (forbidden.length > 0) {
    throw new Error(
      `Audit-data får endast innehålla ${ALLOWED_FIELDS.join(', ')}. `
      + `Otillåtna fält: ${forbidden.join(', ')}. `
      + 'Medicinsk journaltext lagras i SQL, aldrig i blockkedjan.',
    );
  }

  const missing = ALLOWED_FIELDS.filter((field) => event[field] === undefined);
  if (missing.length > 0) {
    throw new Error(`Audit-data saknar fält: ${missing.join(', ')}`);
  }

  if (!KNOWN_ROLES.includes(event.role)) {
    throw new Error(`Okänd roll: ${event.role}. Tillåtna roller: ${KNOWN_ROLES.join(', ')}`);
  }

  if (typeof event.action !== 'string' || event.action.trim() === '') {
    throw new Error('Audit-data måste ha en action, exempelvis READ_JOURNAL');
  }

  return {
    userId: event.userId,
    patientId: event.patientId,
    role: event.role,
    action: event.action,
    timestamp: event.timestamp,
  };
}

module.exports = { buildAuditData, ALLOWED_FIELDS, KNOWN_ROLES };
