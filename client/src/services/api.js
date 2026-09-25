// Alla anrop mot backend går genom den här filen.
// Token sparas i localStorage i utvecklingsversionen (se client/README.md).

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.error || "Något gick fel");
    error.status = response.status;
    throw error;
  }
  return body;
}

export function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function me() {
  return request("/api/auth/me");
}

// Patienter och journal (docs/api-contract.md). Behörigheten avgörs alltid av
// backend; frontend visar bara det som backend svarar med.

export function getPatients() {
  return request("/api/patients");
}

export function getPatient(patientId) {
  return request(`/api/patients/${patientId}`);
}

export function getJournal(patientId) {
  return request(`/api/patients/${patientId}/journal`);
}

export function createJournalEntry(patientId, content, visibility) {
  return request(`/api/patients/${patientId}/journal`, {
    method: "POST",
    body: JSON.stringify({ content, visibility }),
  });
}
