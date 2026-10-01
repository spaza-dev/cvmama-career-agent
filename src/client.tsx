import "./styles.css";
import { createRoot } from "react-dom/client";
import App from "./app";
import { AppAuthProvider } from "./auth";

const root = createRoot(document.getElementById("root")!);
root.render(
  <AppAuthProvider>
    <App />
  </AppAuthProvider>
);
