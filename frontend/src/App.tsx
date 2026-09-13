import { Navigate, Route, Routes } from "react-router-dom";

import { DataVersionProvider } from "@/contexts/DataVersionContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AppLayout } from "@/layouts/AppLayout";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { InsightsPage } from "@/pages/InsightsPage";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RetentionPage } from "@/pages/RetentionPage";
import { SegmentsPage } from "@/pages/SegmentsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UploadPage } from "@/pages/UploadPage";

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <DataVersionProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/segments" element={<SegmentsPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/retention" element={<RetentionPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/overview" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </DataVersionProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
