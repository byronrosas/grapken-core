import { Routes, Route } from "react-router-dom";
import GameDesignTool from "./app/page";
import LandingPage from "./app/landing/page";
import TermsPage from "./app/terms/page";
import PrivacyPage from "./app/privacy/page";
import DeleteAccountPage from "./app/delete-account/page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GameDesignTool />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      {/* Página exigida por Google Play para eliminar la cuenta sin la app. */}
      <Route path="/delete-account" element={<DeleteAccountPage />} />
    </Routes>
  );
}
