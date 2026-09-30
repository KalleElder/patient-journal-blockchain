import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AuditEvent from "./AuditEvent";

// Liveaktivitet för vårdpersonal. När noden skapar ett audit-block skickar den
// NEW_BLOCK till alla anslutna över Socket.io (server/src/p2p/p2pServer.js).
// Frontend lyssnar bara och skickar aldrig något tillbaka. Blocken innehåller
// bara metadata, aldrig journaltext.
const MAX_EVENTS = 8;

export default function LiveActivity() {
  const [blocks, setBlocks] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Samma adress som sidan, Vite skickar /socket.io vidare till backend.
    const socket = io();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("NEW_BLOCK", (block) => {
      setBlocks((prev) => [block, ...prev].slice(0, MAX_EVENTS));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <aside className="live" aria-live="polite">
      <div className="live-head">
        <h3>Live</h3>
        <span className={connected ? "live-status on" : "live-status"}>
          {connected ? "Ansluten" : "Inte ansluten"}
        </span>
      </div>
      <p className="muted">Nya händelser i blockkedjan på den här noden.</p>
      {blocks.length === 0 && <p className="muted">Väntar på aktivitet...</p>}
      <ul className="audit-list">
        {blocks.map((block) => (
          <AuditEvent key={block.hash} event={block.data} blockIndex={block.index} showPatient />
        ))}
      </ul>
    </aside>
  );
}
