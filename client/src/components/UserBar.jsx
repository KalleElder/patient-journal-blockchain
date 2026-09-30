import { ROLE_LABEL } from "../roles";

export default function UserBar({ user, onLogout }) {
  return (
    <header className="userbar">
      <span className="brand">Patient Journal</span>
      <span className="who">
        Inloggad som <strong>{user.name}</strong> · {ROLE_LABEL[user.role] || user.role}
      </span>
      <button type="button" onClick={onLogout}>Logga ut</button>
    </header>
  );
}
