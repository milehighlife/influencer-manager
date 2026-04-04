import { lazy, Suspense } from "react";
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
import { AppShell } from "./components/AppShell";
import { LoadingPage } from "./components/LoadingPage";
import { NotAuthorizedPage } from "./pages/NotAuthorizedPage";

const CampaignListPage = lazy(() => import("./pages/CampaignListPage").then((m) => ({ default: m.CampaignListPage })));
const ActionDetailPage = lazy(() => import("./pages/ActionDetailPage").then((m) => ({ default: m.ActionDetailPage })));
const CampaignAssignPage = lazy(() => import("./pages/CampaignAssignPage").then((m) => ({ default: m.CampaignAssignPage })));
const CampaignDetailPage = lazy(() => import("./pages/CampaignDetailPage").then((m) => ({ default: m.CampaignDetailPage })));
const CampaignMetricsEditPage = lazy(() => import("./pages/CampaignMetricsEditPage").then((m) => ({ default: m.CampaignMetricsEditPage })));
const ClientListPage = lazy(() => import("./pages/ClientListPage").then((m) => ({ default: m.ClientListPage })));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage").then((m) => ({ default: m.ClientDetailPage })));
const CompanyDetailPage = lazy(() => import("./pages/CompanyDetailPage").then((m) => ({ default: m.CompanyDetailPage })));
const CompanyListPage = lazy(() => import("./pages/CompanyListPage").then((m) => ({ default: m.CompanyListPage })));
const ActionsListPage = lazy(() => import("./pages/ActionsListPage").then((m) => ({ default: m.ActionsListPage })));
const InfluencerListPage = lazy(() => import("./pages/InfluencerListPage").then((m) => ({ default: m.InfluencerListPage })));
const InfluencerDetailPage = lazy(() => import("./pages/InfluencerDetailPage").then((m) => ({ default: m.InfluencerDetailPage })));
const InfluencerCampaignDetailPage = lazy(() => import("./pages/InfluencerCampaignDetailPage").then((m) => ({ default: m.InfluencerCampaignDetailPage })));
const InfluencerActionDetailPage = lazy(() => import("./pages/InfluencerActionDetailPage").then((m) => ({ default: m.InfluencerActionDetailPage })));

function PageFallback() {
  return <p className="muted" style={{ padding: 32 }}>Loading...</p>;
}

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
      <Suspense fallback={<PageFallback />}>
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
            path="/campaigns/:campaignId/assign"
            element={<CampaignAssignPage />}
          />
          <Route
            path="/campaigns/:campaignId/actions/:actionId"
            element={<ActionDetailPage />}
          />
          <Route
            path="/campaigns/:campaignId/metrics"
            element={<CampaignMetricsEditPage />}
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
            path="/companies/:companyId"
            element={<CompanyDetailPage />}
          />
          <Route
            path="/companies"
            element={<CompanyListPage canPlan={canPlan} />}
          />
          <Route
            path="/actions"
            element={<ActionsListPage />}
          />
          <Route
            path="/influencers"
            element={<InfluencerListPage canPlan={canPlan} />}
          />
          <Route
            path="/influencers/:influencerId"
            element={<InfluencerDetailPage canPlan={canPlan} />}
          />
          <Route
            path="/influencers/:influencerId/campaigns/:campaignId"
            element={<InfluencerCampaignDetailPage canPlan={canPlan} />}
          />
          <Route
            path="/influencers/:influencerId/campaigns/:campaignId/actions/:actionId"
            element={<InfluencerActionDetailPage canPlan={canPlan} />}
          />
          <Route path="*" element={<Navigate to="/campaigns" replace />} />
        </Routes>
      </Suspense>
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
