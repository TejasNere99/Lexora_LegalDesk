import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Providers } from './providers';
import { useAuth } from '../features/auth/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { LoadingSkeleton } from '../components/ui';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const AcceptInvitePage = lazy(() => import('../pages/AcceptInvitePage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ClientsPage = lazy(() => import('../pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('../pages/ClientDetailPage'));
const CasesPage = lazy(() => import('../pages/CasesPage'));
const CaseFormPage = lazy(() => import('../pages/CaseFormPage'));
const CaseDetailPage = lazy(() => import('../pages/CaseDetailPage'));
const HearingsPage = lazy(() => import('../pages/HearingsPage'));
const TasksPage = lazy(() => import('../pages/TasksPage'));
const TeamPage = lazy(() => import('../pages/TeamPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const MorePage = lazy(() => import('../pages/MorePage'));

function Gate({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboardingComplete && window.location.pathname !== '/onboarding') {
    const skipped = localStorage.getItem('lexora-onboarding') === 'done';
    if (!skipped) return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function PublicOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingSkeleton />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function Screen({ children }) {
  return <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: (
      <Providers>
        <Outlet />
      </Providers>
    ),
    children: [
      { path: '/', element: <Navigate to="/app" replace /> },
      {
        path: '/login',
        element: (
          <PublicOnly>
            <Screen>
              <LoginPage />
            </Screen>
          </PublicOnly>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <Screen>
            <ForgotPasswordPage />
          </Screen>
        ),
      },
      {
        path: '/reset-password',
        element: (
          <Screen>
            <ResetPasswordPage />
          </Screen>
        ),
      },
      {
        path: '/accept-invite',
        element: (
          <Screen>
            <AcceptInvitePage />
          </Screen>
        ),
      },
      {
        path: '/onboarding',
        element: (
          <Gate>
            <Screen>
              <OnboardingPage />
            </Screen>
          </Gate>
        ),
      },
      {
        path: '/app',
        element: (
          <Gate>
            <AppShell />
          </Gate>
        ),
        children: [
          { index: true, element: <Screen><DashboardPage /></Screen> },
          { path: 'clients', element: <Screen><ClientsPage /></Screen> },
          { path: 'clients/:id', element: <Screen><ClientDetailPage /></Screen> },
          { path: 'cases', element: <Screen><CasesPage /></Screen> },
          { path: 'cases/new', element: <Screen><CaseFormPage /></Screen> },
          { path: 'cases/:id/edit', element: <Screen><CaseFormPage /></Screen> },
          { path: 'cases/:id', element: <Screen><CaseDetailPage /></Screen> },
          { path: 'hearings', element: <Screen><HearingsPage /></Screen> },
          { path: 'tasks', element: <Screen><TasksPage /></Screen> },
          { path: 'team', element: <Screen><TeamPage /></Screen> },
          { path: 'reports', element: <Screen><ReportsPage /></Screen> },
          { path: 'settings', element: <Screen><SettingsPage /></Screen> },
          { path: 'more', element: <Screen><MorePage /></Screen> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
