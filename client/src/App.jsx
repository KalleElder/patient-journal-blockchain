import { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import { getToken, getStoredUser, me, clearSession } from "./services/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  // Vid refresh: finns en sparad token kollar vi med backend att den fortfarande gäller.
  useEffect(() => {
    if (!getToken()) return;
    me()
      .then(() => setUser(getStoredUser()))
      .catch(() => clearSession())
      .finally(() => setChecking(false));
  }, []);

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  if (checking) return <p className="status">Kontrollerar inloggning...</p>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return <HomePage user={user} onLogout={handleLogout} />;
}
