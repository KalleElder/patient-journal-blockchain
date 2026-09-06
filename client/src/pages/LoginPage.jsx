import { useState } from "react";
import { login, saveSession } from "../services/api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await login(username, password);
      saveSession(token, user);
      onLogin(user);
    } catch (err) {
      setError(err.status === 401 ? "Felaktiga inloggningsuppgifter." : "Kunde inte nå servern. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <h1>Patient Journal</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Användarnamn
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Lösenord
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Loggar in..." : "Logga in"}</button>
      </form>
    </main>
  );
}
