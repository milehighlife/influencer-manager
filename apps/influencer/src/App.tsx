import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useBootstrapAuth } from "./hooks/use-auth";
import { useAuthStore } from "./state/auth-store";
import { TabBar } from "./components/TabBar";

const ActionFeedPage = lazy(() => import("./pages/ActionFeedPage").then((m) => ({ default: m.ActionFeedPage })));
const ActionDetailPage = lazy(() => import("./pages/ActionDetailPage").then((m) => ({ default: m.ActionDetailPage })));
const InboxPage = lazy(() => import("./pages/InboxPage").then((m) => ({ default: m.InboxPage })));
const ChatPage = lazy(() => import("./pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online) return null;
  return <div className="offline-banner">You're offline</div>;
}

function LoadingSkeleton() {
  return (
    <div className="app-content">
      <div className="skeleton skeleton-line" style={{ width: "40%", height: 24 }} />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  );
}

export function App() {
  const { isBootstrapping } = useBootstrapAuth();
  const user = useAuthStore((s) => s.user);

  if (isBootstrapping) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <>
      <OfflineBanner />
      <div className="app-content">
        <Suspense fallback={<LoadingSkeleton />}>
          <Routes>
            <Route path="/" element={<ActionFeedPage />} />
            <Route path="/actions/:id" element={<ActionDetailPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/inbox/:id" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <TabBar />
    </>
  );
}
