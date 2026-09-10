// Audit-formatet är gemensamt för backend och blockchain, se docs/api-contract.md.
// Endast dessa fält får läggas i ett block.
const ALLOWED_FIELDS = ['userId', 'patientId', 'role', 'action', 'timestamp'];

const KNOWN_ROLES = ['DOCTOR', 'NURSE', 'CARE_CENTER', 'PATIENT', 'UNAUTHORIZED'];

// Ingen av strängarna i ett audit-event är lång. Taket gör att ett fält inte
// kan användas för att bära mer text än det är tänkt för.
const MAX_TEXTLÄNGD = 64;

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

  // Det räcker inte att kontrollera fältnamnen. Utan kontroll av innehållet
  // skulle journaltext kunna smugglas in i ett tillåtet fält, exempelvis
  // userId: 'Patienten har diabetes typ 2'. Varje fält är därför låst till
  // den form det faktiskt ska ha.
  if (!Number.isInteger(event.userId) || !Number.isInteger(event.patientId)) {
    throw new Error('userId och patientId måste vara heltal');
  }

  // Actions är konstanter i versaler, exempelvis READ_JOURNAL. Formen
  // kontrolleras i stället för en fast lista, eftersom api-contract.md och
  // roles-and-permissions.md ännu listar olika actions.
  // Längden begränsas eftersom formkontrollen ensam inte hindrar att någon
  // skickar en väldigt lång sträng i versaler. En riktig action är kort.
  if (typeof event.action !== 'string'
    || event.action.length > MAX_TEXTLÄNGD
    || !/^[A-Z][A-Z_]*$/.test(event.action)) {
    throw new Error('action måste vara en konstant i versaler, exempelvis READ_JOURNAL');
  }

  if (typeof event.timestamp !== 'string'
    || event.timestamp.length > MAX_TEXTLÄNGD
    || Number.isNaN(Date.parse(event.timestamp))) {
    throw new Error('timestamp måste vara en tidsstämpel som sträng, exempelvis ISO 8601');
  }

  return {
    userId: event.userId,
    patientId: event.patientId,
    role: event.role,
    action: event.action,
    timestamp: event.timestamp,
  };
}

// Samma regler som buildAuditData, men som ja eller nej i stället för ett
// undantag. Används på block som kommit från en annan nod. Att en kedja
// hashar korrekt säger bara att ingen ändrat i den efteråt, inte att
// innehållet är sådant vi får spara.
function isAuditData(data) {
  try {
    buildAuditData(data);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  buildAuditData, isAuditData, ALLOWED_FIELDS, KNOWN_ROLES,
};
