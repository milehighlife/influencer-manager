import { Navigate, Route, Routes } from "react-router-dom";
import {
  INFLUENCER_ROLES,
  PLANNING_WRITE_ROLES,
  READ_ONLY_ROLES,
} from "@influencer-manager/shared/types/auth";

import { AppProviders } from "./providers/AppProviders";
import { useBootstrapAuth } from "./hooks/use-bootstrap-auth";
import { useAuthStore } from "./state/auth-store";
import { LoginPage } from "./pages/LoginPage";
import { CampaignListPage } from "./pages/CampaignListPage";
import { CampaignDetailPage } from "./pages/CampaignDetailPage";
import { ClientListPage } from "./pages/ClientListPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { CompanyListPage } from "./pages/CompanyListPage";
import { AppShell } from "./components/AppShell";
import { LoadingPage } from "./components/LoadingPage";
import { NotAuthorizedPage } from "./pages/NotAuthorizedPage";

function AppRoutes() {
  const { isBootstrapping } = useBootstrapAuth();
  const user = useAuthStore((state) => state.user);

  if (isBootstrapping) {
    return <LoadingPage label="Preparing campaign builder..." />;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (INFLUENCER_ROLES.includes(user.role as (typeof INFLUENCER_ROLES)[number])) {
    return <NotAuthorizedPage />;
  }

  const canPlan = PLANNING_WRITE_ROLES.includes(user.role as (typeof PLANNING_WRITE_ROLES)[number]);
  const isReadOnly = READ_ONLY_ROLES.includes(user.role as (typeof READ_ONLY_ROLES)[number]);

  return (
    <AppShell user={user} canPlan={canPlan} isReadOnly={isReadOnly}>
      <Routes>
        <Route path="/" element={<Navigate to="/campaigns" replace />} />
        <Route
          path="/campaigns"
          element={<CampaignListPage canPlan={canPlan} />}
        />
        <Route
          path="/campaigns/:campaignId"
          element={<CampaignDetailPage canPlan={canPlan} />}
        />
        <Route
          path="/clients"
          element={<ClientListPage canPlan={canPlan} />}
        />
        <Route
          path="/clients/:clientId"
          element={<ClientDetailPage canPlan={canPlan} />}
        />
        <Route
          path="/companies"
          element={<CompanyListPage canPlan={canPlan} />}
        />
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
