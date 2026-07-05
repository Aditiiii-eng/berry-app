import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import BerryApp from "./App.jsx";

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "870550542981-jktckvbt4afqmjqt3ff888i39db11f9f.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BerryApp />
    </GoogleOAuthProvider>
  </StrictMode>
);
