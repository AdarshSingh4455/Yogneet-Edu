import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { AdminRoute, PermissionRoute, StudentModuleRoute } from '../permissions/guards';

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
import { MicroLessonsPage } from '../pages/student/MicroLessonsPage';
import { AssessmentPage } from '../pages/student/AssessmentPage';
import { AssessmentResultPage } from '../pages/student/AssessmentResultPage';
import { CodingArenaPage } from '../pages/student/CodingArenaPage';
import { CodingProblemPage } from '../pages/student/CodingProblemPage';
import { CommunityForumPage } from '../pages/student/CommunityForumPage';
import { CommunityThreadPage } from '../pages/student/CommunityThreadPage';
import { MyProgressPage } from '../pages/student/MyProgressPage';
import { StudentProfilePage } from '../pages/student/StudentProfilePage';
import { LeaderboardPage } from '../pages/student/LeaderboardPage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { SubAdminManagementPage } from '../pages/admin/SubAdminManagementPage';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';
import { AnalyticsPage } from '../pages/admin/AnalyticsPage';
import { StudentManagementPage } from '../pages/admin/StudentManagementPage';
import { TestCatalogManagerPage } from '../pages/admin/TestCatalogManagerPage';
import { SubjectManagementPage } from '../pages/admin/SubjectManagementPage';
import { MicroLessonsManagementPage } from '../pages/admin/MicroLessonsManagementPage';
import { PremiumStudentManagementPage } from '../pages/admin/PremiumStudentManagementPage';
import { StudentAccessManagementPage } from '../pages/admin/StudentAccessManagementPage';
import { FeedbackManagementPage } from '../pages/admin/FeedbackManagementPage';
import { IconLibraryManagementPage } from '../pages/admin/IconLibraryManagementPage';
import { LeaderboardManagementPage } from '../pages/admin/LeaderboardManagementPage';
import { AdvertisementManagementPage } from '../pages/admin/AdvertisementManagementPage';
import { CodingManagementPage } from '../pages/admin/CodingManagementPage';
import { CommunityModerationPage } from '../pages/admin/CommunityModerationPage';

// Shared Pages
import { FeedbackPage } from '../pages/shared/FeedbackPage';

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

        {/* Student Experience: 4 Core Learning Stages + Micro Lessons Shorts */}
        <Route path="/dashboard" element={<StudentModuleRoute moduleKey="dashboard"><StudentDashboard /></StudentModuleRoute>} />
        <Route path="/videos" element={<StudentModuleRoute moduleKey="videos"><VideoPlayerPage /></StudentModuleRoute>} />
        <Route path="/notes" element={<StudentModuleRoute moduleKey="notes"><NotesDirectoryPage /></StudentModuleRoute>} />
        <Route path="/practical" element={<StudentModuleRoute moduleKey="practical"><PracticalAssignmentsPage /></StudentModuleRoute>} />
        <Route path="/assignments" element={<Navigate to="/practical" replace />} />
        <Route path="/tests" element={<StudentModuleRoute moduleKey="tests"><TestSeriesPage /></StudentModuleRoute>} />
        <Route path="/micro-lessons" element={<StudentModuleRoute moduleKey="micro_lessons"><MicroLessonsPage /></StudentModuleRoute>} />
        <Route path="/shorts" element={<Navigate to="/micro-lessons" replace />} />
        <Route path="/assessment/:testId/result" element={<AssessmentResultPage />} />
        <Route path="/leaderboard" element={<StudentModuleRoute moduleKey="tests"><LeaderboardPage /></StudentModuleRoute>} />
        <Route path="/coding" element={<StudentModuleRoute moduleKey="coding"><CodingArenaPage /></StudentModuleRoute>} />
        <Route path="/coding/:slug" element={<StudentModuleRoute moduleKey="coding"><CodingProblemPage /></StudentModuleRoute>} />
        <Route path="/community" element={<StudentModuleRoute moduleKey="community"><CommunityForumPage /></StudentModuleRoute>} />
        <Route path="/community/:threadId" element={<StudentModuleRoute moduleKey="community"><CommunityThreadPage /></StudentModuleRoute>} />
        <Route path="/progress" element={<StudentModuleRoute moduleKey="progress"><MyProgressPage /></StudentModuleRoute>} />
        <Route path="/profile" element={<StudentProfilePage />} />
        <Route path="/feedback" element={<FeedbackPage />} />

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
          path="/admin/leaderboard"
          element={
            <PermissionRoute permissions={['leaderboard.view', 'leaderboard.manage']}>
              <LeaderboardManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/advertisements"
          element={
            <PermissionRoute permissions={['advertisements.view', 'advertisements.manage']}>
              <AdvertisementManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/coding"
          element={
            <PermissionRoute permissions={['coding.view', 'coding.manage']}>
              <CodingManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/community-moderation"
          element={
            <PermissionRoute permission="community.moderate">
              <CommunityModerationPage />
            </PermissionRoute>
          }
        />
        <Route path="/subadmin/leaderboard" element={<Navigate to="/admin/leaderboard" replace />} />
        <Route path="/subadmin/advertisements" element={<Navigate to="/admin/advertisements" replace />} />
        <Route path="/subadmin/coding" element={<Navigate to="/admin/coding" replace />} />
        <Route path="/subadmin/community-moderation" element={<Navigate to="/admin/community-moderation" replace />} />
        <Route
          path="/admin/students"
          element={
            <PermissionRoute permission="students.view">
              <StudentManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <PermissionRoute permissions={['subjects.view', 'subjects.create', 'subjects.edit']}>
              <SubjectManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/micro-lessons"
          element={
            <PermissionRoute permissions={['microlessons.view', 'microlessons.create', 'microlessons.edit']}>
              <MicroLessonsManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/premium-students"
          element={
            <PermissionRoute permissions={['premium_students.view', 'premium_students.manage', 'students.view']}>
              <PremiumStudentManagementPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/student-access"
          element={
            <AdminRoute>
              <StudentAccessManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/feedback"
          element={
            <AdminRoute>
              <FeedbackManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/icons"
          element={
            <AdminRoute>
              <IconLibraryManagementPage />
            </AdminRoute>
          }
        />
        <Route path="/subadmin/subjects" element={<Navigate to="/admin/subjects" replace />} />
        <Route path="/subadmin/micro-lessons" element={<Navigate to="/admin/micro-lessons" replace />} />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
