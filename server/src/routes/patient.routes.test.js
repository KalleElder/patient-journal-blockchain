const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const jwt = require('jsonwebtoken');

// Egen JWT_SECRET och en isolerad temp-databas, satta innan ../db/../app
// requiras, så att testerna aldrig rör den delade utvecklingsdatabasen.
process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = path.join(os.tmpdir(), `patient-journal-test-${process.pid}-${Date.now()}.db`);

const db = require('../db');
const app = require('../app');

const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../../database/schema.sql'), 'utf8');
db.exec(schemaSql);

// Fiktiv fixturdata: två patienter, en läkare, en sjuksköterska och en
// patientanvändare kopplad till patient 1.
db.exec(`
  INSERT INTO patients (id, name) VALUES (1, 'Testpatient A'), (2, 'Testpatient B');
  INSERT INTO users (id, username, name, password_hash, role, patient_id) VALUES
    (1, 'doc', 'Doctor One', 'x', 'DOCTOR', NULL),
    (2, 'nurse', 'Nurse Two', 'x', 'NURSE', NULL),
    (3, 'pat', 'Patient Three', 'x', 'PATIENT', 1);
`);

function token(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const doctorToken = () => token({ userId: 1, role: 'DOCTOR' });
const nurseToken = () => token({ userId: 2, role: 'NURSE' });
const patientToken = () => token({ userId: 3, role: 'PATIENT', patientId: 1 });

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => { server.listen(0, resolve); });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => { server.close(resolve); });
  db.close();
  fs.rmSync(process.env.DB_PATH, { force: true });
});

function call(urlPath, { method = 'GET', body, tok } = {}) {
  return fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('skyddade routes utan token ger 401', async () => {
  const endpoints = [
    ['GET', '/api/patients'],
    ['GET', '/api/patients/1'],
    ['GET', '/api/patients/1/journal'],
    ['POST', '/api/patients/1/journal'],
  ];

  for (const [method, url] of endpoints) {
    const res = await call(url, { method });
    assert.strictEqual(res.status, 401, `${method} ${url}`);
  }
});

test('vårdpersonal kan lista patienter', async () => {
  const res = await call('/api/patients', { tok: doctorToken() });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.some((p) => p.id === 1));
});

test('patient nekas att lista patienter', async () => {
  const res = await call('/api/patients', { tok: patientToken() });
  assert.strictEqual(res.status, 403);
});

test('vårdpersonal kan läsa en patient', async () => {
  const res = await call('/api/patients/1', { tok: doctorToken() });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.id, 1);
});

test('patient kan läsa sin egen patient', async () => {
  const res = await call('/api/patients/1', { tok: patientToken() });
  assert.strictEqual(res.status, 200);
});

test('patient får 403 om den försöker läsa annan patient via URL', async () => {
  const res = await call('/api/patients/2', { tok: patientToken() });
  assert.strictEqual(res.status, 403);
});

test('okänd patient ger 404', async () => {
  const res = await call('/api/patients/999', { tok: doctorToken() });
  assert.strictEqual(res.status, 404);
});

test('vårdpersonal kan skapa journalanteckning', async () => {
  const res = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: 'Patienten mår bättre.', visibility: 'ALL' },
  });
  assert.strictEqual(res.status, 201);

  const entry = await res.json();
  assert.strictEqual(entry.patientId, 1);
  assert.strictEqual(entry.authorId, 1);
  assert.strictEqual(entry.authorName, 'Doctor One');
  assert.strictEqual(entry.content, 'Patienten mår bättre.');
  assert.strictEqual(entry.visibility, 'ALL');
  assert.ok(entry.createdAt);
  assert.strictEqual(entry.password_hash, undefined);
  assert.strictEqual(entry.passwordHash, undefined);
});

test('patient får inte skapa journalanteckning', async () => {
  const res = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: patientToken(),
    body: { content: 'Test', visibility: 'ALL' },
  });
  assert.strictEqual(res.status, 403);
});

test('ogiltig visibility ger 400', async () => {
  const res = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: 'Test', visibility: 'HEMLIGT' },
  });
  assert.strictEqual(res.status, 400);
});

test('tom/whitespace content ger 400', async () => {
  const tom = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: '', visibility: 'ALL' },
  });
  assert.strictEqual(tom.status, 400);

  const whitespace = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: '   ', visibility: 'ALL' },
  });
  assert.strictEqual(whitespace.status, 400);
});

test('okänd patient ger 404 vid skapande av journalanteckning', async () => {
  const res = await call('/api/patients/999/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: 'Test', visibility: 'ALL' },
  });
  assert.strictEqual(res.status, 404);
});

test('PRIVATE syns bara för skaparen', async () => {
  const created = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: 'privat anteckning från doktorn', visibility: 'PRIVATE' },
  });
  assert.strictEqual(created.status, 201);

  const asDoctor = await (await call('/api/patients/1/journal', { tok: doctorToken() })).json();
  assert.ok(asDoctor.some((e) => e.content === 'privat anteckning från doktorn'));

  const asNurse = await (await call('/api/patients/1/journal', { tok: nurseToken() })).json();
  assert.ok(!asNurse.some((e) => e.content === 'privat anteckning från doktorn'));
});

test('STAFF syns för vårdpersonal men inte patient', async () => {
  const created = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: 'stab-anteckning', visibility: 'STAFF' },
  });
  assert.strictEqual(created.status, 201);

  const asNurse = await (await call('/api/patients/1/journal', { tok: nurseToken() })).json();
  assert.ok(asNurse.some((e) => e.content === 'stab-anteckning'));

  const asPatient = await (await call('/api/patients/1/journal', { tok: patientToken() })).json();
  assert.ok(!asPatient.some((e) => e.content === 'stab-anteckning'));
});

test('ALL syns för vårdpersonal och rätt patient', async () => {
  const created = await call('/api/patients/1/journal', {
    method: 'POST',
    tok: doctorToken(),
    body: { content: 'ALL-anteckning för synlighetstest', visibility: 'ALL' },
  });
  assert.strictEqual(created.status, 201);

  const asNurse = await (await call('/api/patients/1/journal', { tok: nurseToken() })).json();
  assert.ok(asNurse.some((e) => e.content === 'ALL-anteckning för synlighetstest'));

  const asPatient = await (await call('/api/patients/1/journal', { tok: patientToken() })).json();
  assert.ok(asPatient.some((e) => e.content === 'ALL-anteckning för synlighetstest'));
});
