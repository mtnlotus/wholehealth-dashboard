import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NoteListPage } from "./features/notes/NoteListPage";
import { PhpSummaryPage } from "./features/php/PhpSummaryPage";
import { SharingPage } from "./features/sharing/SharingPage";
import { CallbackPage } from "./pages/CallbackPage";
import { LaunchPage } from "./pages/LaunchPage";
import { PatientLaunchPage } from "./pages/PatientLaunchPage";
import { StandalonePage } from "./pages/StandalonePage";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/patient" element={<PatientLaunchPage />} />
          <Route path="/callback" element={<CallbackPage />} />
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
