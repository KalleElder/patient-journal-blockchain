import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Ingen StrictMode: i dev hämtade den journalen två gånger, så varje öppning loggades dubbelt i blockkedjan.
createRoot(document.getElementById("root")).render(<App />);
