import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardLayout } from "./features/dashboard/DashboardLayout";
import { CallbackPage } from "./pages/CallbackPage";
import { DevPage } from "./pages/DevPage";
import { LaunchPage } from "./pages/LaunchPage";
import { PatientLaunchPage } from "./pages/PatientLaunchPage";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* SMART on FHIR launch flows */}
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/patient" element={<PatientLaunchPage />} />
          <Route path="/callback" element={<CallbackPage />} />

          {/* Main dashboard — tab-based, driven by ?tab= search param */}
          <Route path="/app" element={<DashboardLayout />} />

          {/* Developer / demo page — standalone testing without an EHR */}
          <Route path="/dev" element={<DevPage />} />

          {/* Default: redirect to dev page in standalone, app page after SMART launch */}
          <Route path="/" element={<Navigate to="/dev" replace />} />
          <Route path="*" element={<Navigate to="/dev" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
