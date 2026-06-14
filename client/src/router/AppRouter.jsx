import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.jsx';
import { RequireAuth } from '../components/layout/RequireAuth.jsx';
import { LoginPage }    from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { DrivePage }    from '../pages/DrivePage.jsx';
import { AdminPage }    from '../pages/AdminPage.jsx';
import {
  StarredPage, RecentPage, TrashPage, SearchPage, SharedPage
} from '../pages/SimpleListPages.jsx';
import { SharedFolderPage } from '../pages/SharedFolderPage.jsx';
import { PublicPage }    from '../pages/PublicPage.jsx';
import { SettingsPage } from '../pages/SettingsPage.jsx';
import ChatPage from '../pages/ChatPage.jsx';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — no auth required */}
        <Route path="/p/:token" element={<PublicPage />} />

        {/* Auth: Login / Register */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/drive"          element={<DrivePage />} />
            <Route path="/drive/starred"  element={<StarredPage />} />
            <Route path="/drive/shared"   element={<SharedPage />} />
            <Route path="/drive/shared-folder/:id" element={<SharedFolderPage />} />
            <Route path="/drive/recent"   element={<RecentPage />} />
            <Route path="/drive/trash"    element={<TrashPage />} />
            <Route path="/drive/search"   element={<SearchPage />} />
            <Route path="/drive/settings" element={<SettingsPage />} />
            <Route path="/chat"           element={<ChatPage />} />
          </Route>
        </Route>

        {/* Admin only */}
        <Route element={<RequireAuth adminOnly />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/drive" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
