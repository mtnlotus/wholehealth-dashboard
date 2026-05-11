import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { LaunchPage } from "./pages/LaunchPage";
import { CallbackPage } from "./pages/CallbackPage";
import { AzureCallbackPage } from "./pages/AzureCallbackPage";
import { StandalonePage } from "./pages/StandalonePage";
import { PatientLaunchPage } from "./pages/PatientLaunchPage";
import { PhpSummaryPage } from "./features/php/PhpSummaryPage";
import { NoteListPage } from "./features/notes/NoteListPage";
import { SharingPage } from "./features/sharing/SharingPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/patient" element={<PatientLaunchPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/auth/azure-callback" element={<AzureCallbackPage />} />
          <Route path="/" element={<StandalonePage />} />
          <Route path="/app">
            <Route index element={<NoteListPage />} />
            <Route path="php" element={<PhpSummaryPage />} />
            <Route path="share" element={<SharingPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
