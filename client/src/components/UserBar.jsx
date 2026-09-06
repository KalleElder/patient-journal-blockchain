export default function UserBar({ user, onLogout }) {
  return (
    <header className="userbar">
      <span>
        Inloggad som: <strong>{user.name}</strong> · Roll: <strong>{user.role}</strong>
      </span>
      <button type="button" onClick={onLogout}>Logga ut</button>
    </header>
  );
}
