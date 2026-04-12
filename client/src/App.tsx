import { useEffect, type ReactElement } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useSocket } from './hooks/useSocket';
import { useUIStore } from './store/uiStore';
import { LoginPage } from './features/auth/LoginPage';
import { AccessControlPage } from './features/auth/AccessControlPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { EmployeePage } from './features/employee/EmployeePage';
import { DepartmentPage } from './features/department/DepartmentPage';
import { AttendancePage } from './features/attendance/AttendancePage';
import { LeavePage } from './features/leave/LeavePage';
import { PayrollPage } from './features/payroll/PayrollPage';
import { PerformancePage } from './features/performance/PerformancePage';
import { RecruitmentPage } from './features/recruitment/RecruitmentPage';
import { CareersPage } from './features/recruitment/CareersPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { NotificationPage } from './features/notification/NotificationPage';
import { PulsePage } from './features/pulse/PulsePage';
import { GigPage } from './features/gig/GigPage';
import { AnnouncementPage } from './features/announcement/AnnouncementPage';
import { ProjectPage } from './features/project/ProjectPage';
import { canAccessPortalSlug, getPortalConfig, getRoleHomePath, type PortalConfig } from './lib/constants';

const PageTransition = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.24 }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
};

const PortalLayout = ({ portal }: { portal: PortalConfig }) => {
  const { accessToken, user } = useAuth();
  const hydrateUI = useUIStore((state) => state.hydrate);
  useSocket();

  useEffect(() => {
    hydrateUI();
  }, [hydrateUI]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const expectedPortal = getPortalConfig(user?.role);
  if (!expectedPortal) {
    return <Navigate to="/login" replace />;
  }

  if (expectedPortal.basePath !== portal.basePath) {
    return <Navigate to={expectedPortal.basePath} replace />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar portal={portal} />
      <main className="flex-1 space-y-6 p-4 md:p-6 xl:p-8">
        <Navbar portal={portal} />
        <ErrorBoundary>
          <PageTransition />
        </ErrorBoundary>
      </main>
    </div>
  );
};

const PublicLayout = () => (
  <div className="min-h-screen px-4 py-10 md:px-8 xl:px-12">
    <ErrorBoundary>
      <PageTransition />
    </ErrorBoundary>
  </div>
);

const RoleHomeRedirect = () => {
  const { accessToken, user } = useAuth();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(user?.role)} replace />;
};

const RoleAwareFallback = () => {
  const { accessToken, user } = useAuth();
  return <Navigate to={accessToken ? getRoleHomePath(user?.role) : '/login'} replace />;
};

const GuardedPortalPage = ({ slug, element }: { slug: string; element: ReactElement }) => {
  const { user } = useAuth();

  if (!canAccessPortalSlug(user, slug)) {
    return <Navigate to={getRoleHomePath(user?.role)} replace />;
  }

  return element;
};

const portals = Object.values({
  superAdmin: getPortalConfig('superAdmin'),
  admin: getPortalConfig('admin'),
  manager: getPortalConfig('manager'),
  employee: getPortalConfig('employee'),
  recruiter: getPortalConfig('recruiter'),
}).filter((portal): portal is PortalConfig => Boolean(portal));

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/careers" element={<CareersPage />} />
      </Route>
      <Route path="/" element={<RoleHomeRedirect />} />
      {portals.map((portal) => (
        <Route key={portal.key} path={portal.basePath} element={<PortalLayout portal={portal} />}>
          <Route index element={<DashboardPage />} />
          <Route path="employees" element={<GuardedPortalPage slug="employees" element={<EmployeePage />} />} />
          <Route path="departments" element={<GuardedPortalPage slug="departments" element={<DepartmentPage />} />} />
          <Route path="attendance" element={<GuardedPortalPage slug="attendance" element={<AttendancePage />} />} />
          <Route path="leave" element={<GuardedPortalPage slug="leave" element={<LeavePage />} />} />
          <Route path="projects" element={<GuardedPortalPage slug="projects" element={<ProjectPage />} />} />
          <Route path="payroll" element={<GuardedPortalPage slug="payroll" element={<PayrollPage />} />} />
          <Route path="performance" element={<GuardedPortalPage slug="performance" element={<PerformancePage />} />} />
          <Route path="recruitment" element={<GuardedPortalPage slug="recruitment" element={<RecruitmentPage />} />} />
          <Route path="analytics" element={<GuardedPortalPage slug="analytics" element={<AnalyticsPage />} />} />
          <Route path="access" element={<GuardedPortalPage slug="access" element={<AccessControlPage />} />} />
          <Route path="notifications" element={<GuardedPortalPage slug="notifications" element={<NotificationPage />} />} />
          <Route path="pulse" element={<GuardedPortalPage slug="pulse" element={<PulsePage />} />} />
          <Route path="gigs" element={<GuardedPortalPage slug="gigs" element={<GigPage />} />} />
          <Route path="announcements" element={<GuardedPortalPage slug="announcements" element={<AnnouncementPage />} />} />
        </Route>
      ))}
      <Route path="*" element={<RoleAwareFallback />} />
    </Routes>
  );
}
