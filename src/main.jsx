import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import BerryApp from "./App.jsx";

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "220573682162-4ca29hiupstkhjgl3f0eka6c4m9hvvml.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BerryApp />
    </GoogleOAuthProvider>
  </StrictMode>
);
