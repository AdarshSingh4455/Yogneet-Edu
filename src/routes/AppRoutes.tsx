import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { AdminRoute, PermissionRoute } from '../permissions/guards';

// Auth Pages (Phase 4A Dual-Portal Architecture)
import { PortalSelectionPage } from '../pages/auth/PortalSelectionPage';
import { StudentLoginPage } from '../pages/auth/StudentLoginPage';
import { StudentSignupPage } from '../pages/auth/StudentSignupPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { PlatformLoginPage } from '../pages/auth/PlatformLoginPage';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { VideoPlayerPage } from '../pages/student/VideoPlayerPage';
import { NotesDirectoryPage } from '../pages/student/NotesDirectoryPage';
import { PracticalAssignmentsPage } from '../pages/student/PracticalAssignmentsPage';
import { TestSeriesPage } from '../pages/student/TestSeriesPage';
import { AssessmentPage } from '../pages/student/AssessmentPage';
import { AssessmentResultPage } from '../pages/student/AssessmentResultPage';
import { CodingArenaPage } from '../pages/student/CodingArenaPage';
import { CodingProblemPage } from '../pages/student/CodingProblemPage';
import { CommunityForumPage } from '../pages/student/CommunityForumPage';
import { CommunityThreadPage } from '../pages/student/CommunityThreadPage';
import { MyProgressPage } from '../pages/student/MyProgressPage';
import { StudentProfilePage } from '../pages/student/StudentProfilePage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { SubAdminManagementPage } from '../pages/admin/SubAdminManagementPage';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';
import { AnalyticsPage } from '../pages/admin/AnalyticsPage';
import { StudentManagementPage } from '../pages/admin/StudentManagementPage';
import { TestCatalogManagerPage } from '../pages/admin/TestCatalogManagerPage';

// Sub-Admin Pages
import { SubAdminDashboard } from '../pages/subadmin/SubAdminDashboard';
import { ContentWorkspacePage } from '../pages/subadmin/ContentWorkspacePage';

// Error Page
import { NotFoundPage } from '../pages/shared/NotFoundPage';

// Root redirector based on current user role
const RootRedirector: React.FC = () => {
  const { currentUser } = useAuth();
  if (currentUser.role === 'admin') return <Navigate to="/admin" replace />;
  if (currentUser.role === 'subadmin') return <Navigate to="/subadmin" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Standalone Auth Routes (Phase 4A Dual-Portal Architecture) */}
      <Route path="/portal" element={<PortalSelectionPage />} />
      <Route path="/login" element={<StudentLoginPage />} />
      <Route path="/auth/student/login" element={<StudentLoginPage />} />
      <Route path="/signup" element={<StudentSignupPage />} />
      <Route path="/auth/student/signup" element={<StudentSignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/platform/login" element={<PlatformLoginPage />} />
      <Route path="/auth/platform/login" element={<PlatformLoginPage />} />

      {/* Distraction-Free Fullscreen Assessment Route */}
      <Route path="/assessment/:testId" element={<AssessmentPage />} />

      {/* Main Layout Routes */}
      <Route element={<AppLayout />}>
        {/* Root Redirect */}
        <Route path="/" element={<RootRedirector />} />

        {/* Student Experience: 4 Core Learning Stages */}
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/videos" element={<VideoPlayerPage />} />
        <Route path="/notes" element={<NotesDirectoryPage />} />
        <Route path="/practical" element={<PracticalAssignmentsPage />} />
        <Route path="/assignments" element={<Navigate to="/practical" replace />} />
        <Route path="/tests" element={<TestSeriesPage />} />
        <Route path="/assessment/:testId/result" element={<AssessmentResultPage />} />
        <Route path="/coding" element={<CodingArenaPage />} />
        <Route path="/coding/:slug" element={<CodingProblemPage />} />
        <Route path="/community" element={<CommunityForumPage />} />
        <Route path="/community/:threadId" element={<CommunityThreadPage />} />
        <Route path="/progress" element={<MyProgressPage />} />
        <Route path="/profile" element={<StudentProfilePage />} />

        {/* Sub-Admin Experience */}
        <Route path="/subadmin" element={<SubAdminDashboard />} />
        <Route
          path="/subadmin/content"
          element={
            <PermissionRoute permissions={['videos.view', 'videos.create', 'notes.view', 'notes.create']}>
              <ContentWorkspacePage />
            </PermissionRoute>
          }
        />
        {/* Alias for subadmin test catalog to authoritative Test Catalog Manager */}
        <Route path="/subadmin/tests" element={<Navigate to="/admin/tests" replace />} />

        {/* Admin Experience */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tests"
          element={
            <PermissionRoute permissions={['tests.view', 'tests.create', 'tests.edit', 'tests.publish']}>
              <TestCatalogManagerPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/subadmins"
          element={
            <AdminRoute>
              <SubAdminManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/permissions"
          element={
            <AdminRoute>
              <SubAdminManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <PermissionRoute permission="audit_logs.view">
              <AuditLogsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <PermissionRoute permission="analytics.view">
              <AnalyticsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <PermissionRoute permission="students.view">
              <StudentManagementPage />
            </PermissionRoute>
          }
        />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
