import { PermissionDefinition, PermissionKey, PermissionModule, UserProfile } from '../types';

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Videos
  {
    key: 'videos.view',
    label: 'View Videos',
    description: 'Access and view all educational videos, course outlines, and draft lessons.',
    module: 'videos',
  },
  {
    key: 'videos.create',
    label: 'Create Video Lessons',
    description: 'Add new video lessons, upload assets, and create modules.',
    module: 'videos',
  },
  {
    key: 'videos.edit',
    label: 'Edit Video Lessons',
    description: 'Modify video metadata, descriptions, order, and linked resources.',
    module: 'videos',
  },
  {
    key: 'videos.delete',
    label: 'Delete Video Lessons',
    description: 'Permanently remove video lessons from the platform.',
    module: 'videos',
    isDangerous: true,
  },
  {
    key: 'videos.publish',
    label: 'Publish Videos',
    description: 'Promote draft or reviewed videos to public visibility for students.',
    module: 'videos',
  },

  // Notes
  {
    key: 'notes.view',
    label: 'View Study Notes',
    description: 'Access all study notes, draft articles, and uploaded PDF documents.',
    module: 'notes',
  },
  {
    key: 'notes.create',
    label: 'Create Notes',
    description: 'Author new study notes, cheat-sheets, and upload PDF notes.',
    module: 'notes',
  },
  {
    key: 'notes.edit',
    label: 'Edit Notes',
    description: 'Update content, tags, subjects, and attached PDF files.',
    module: 'notes',
  },
  {
    key: 'notes.delete',
    label: 'Delete Notes',
    description: 'Delete notes and related attachments from the repository.',
    module: 'notes',
    isDangerous: true,
  },
  {
    key: 'notes.publish',
    label: 'Publish Notes',
    description: 'Make study notes immediately downloadable and readable by students.',
    module: 'notes',
  },

  // Tests
  {
    key: 'tests.view',
    label: 'View Test Series',
    description: 'Inspect tests, question pools, and configuration metrics.',
    module: 'tests',
  },
  {
    key: 'tests.create',
    label: 'Create Tests & Questions',
    description: 'Build new mock exams, practice quizzes, and question items.',
    module: 'tests',
  },
  {
    key: 'tests.edit',
    label: 'Edit Tests',
    description: 'Modify time limits, pass percentages, marking schemes, and questions.',
    module: 'tests',
  },
  {
    key: 'tests.publish',
    label: 'Publish Tests',
    description: 'Release scheduled tests to student test catalogs.',
    module: 'tests',
  },
  {
    key: 'tests.schedule',
    label: 'Schedule Tests',
    description: 'Configure start/end availability windows and timed releases.',
    module: 'tests',
  },
  {
    key: 'tests.view_results',
    label: 'View Detailed Results',
    description: 'Access student answer sheets, percentile analytics, and score exports.',
    module: 'tests',
  },

  // Students
  {
    key: 'students.view',
    label: 'View Students',
    description: 'Browse enrolled student profiles, learning milestones, and statistics.',
    module: 'students',
  },
  {
    key: 'students.suspend',
    label: 'Suspend / Ban Students',
    description: 'Temporarily or permanently disable access for violating guidelines.',
    module: 'students',
    isDangerous: true,
  },

  // Community
  {
    key: 'community.moderate',
    label: 'Moderate Community',
    description: 'Pin, edit, lock, delete forum threads, and moderate replies.',
    module: 'community',
  },

  // Subadmins & Permissions
  {
    key: 'subadmins.manage',
    label: 'Manage Sub-Admins',
    description: 'Invite new sub-admins, alter statuses, or terminate accounts.',
    module: 'subadmins',
    isDangerous: true,
  },
  {
    key: 'permissions.assign',
    label: 'Assign Permissions',
    description: 'Granularly assign or revoke module-level action permissions.',
    module: 'subadmins',
    isDangerous: true,
  },

  // System & Logs
  {
    key: 'audit_logs.view',
    label: 'View Audit Logs',
    description: 'Inspect timestamped records of security and operational actions.',
    module: 'audit_logs',
  },
  {
    key: 'analytics.view',
    label: 'View Platform Analytics',
    description: 'Review student engagement trends, completion rates, and platform metrics.',
    module: 'analytics',
  },
  {
    key: 'content.export',
    label: 'Export Content & Data',
    description: 'Download CSV reports, test summaries, and platform content backups.',
    module: 'general',
  },
];

export const MODULE_METADATA: Record<PermissionModule, { label: string; description: string; icon: string }> = {
  videos: {
    label: 'Video Lessons & Courses',
    description: 'Permissions governing video content, lectures, and YouTube integration.',
    icon: 'Video',
  },
  notes: {
    label: 'Study Notes & PDFs',
    description: 'Permissions for authoring, editing, and publishing revision material.',
    icon: 'FileText',
  },
  tests: {
    label: 'Assessment & Test Series',
    description: 'Permissions for test authoring, question banks, and score evaluations.',
    icon: 'CheckSquare',
  },
  students: {
    label: 'Student Directory',
    description: 'Permissions to view learner data, milestones, and manage enrollment status.',
    icon: 'Users',
  },
  community: {
    label: 'Community Moderation',
    description: 'Permissions to moderate discussion threads, replies, and community safety.',
    icon: 'MessageSquare',
  },
  subadmins: {
    label: 'Sub-Admin & RBAC Access',
    description: 'Administrative permissions to govern platform staff and access privileges.',
    icon: 'Shield',
  },
  audit_logs: {
    label: 'Audit Trail & Compliance',
    description: 'Access to tamper-evident audit records and system operation events.',
    icon: 'FileSpreadsheet',
  },
  analytics: {
    label: 'Platform Analytics',
    description: 'Access to aggregated platform performance and learner metrics.',
    icon: 'BarChart3',
  },
  general: {
    label: 'General System Operations',
    description: 'Broad platform-wide actions such as bulk exports and notifications.',
    icon: 'Settings',
  },
};

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_DEFINITIONS.map(p => p.key);

// Standard role preset templates
export const ROLE_PRESETS: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  content_creator: {
    name: 'Content Creator',
    description: 'Can author and edit videos and study notes, but cannot publish directly without review.',
    permissions: ['videos.view', 'videos.create', 'videos.edit', 'notes.view', 'notes.create', 'notes.edit'],
  },
  content_manager: {
    name: 'Senior Content Lead',
    description: 'Full video and notes lifecycle control, including publishing and deletion.',
    permissions: [
      'videos.view', 'videos.create', 'videos.edit', 'videos.publish', 'videos.delete',
      'notes.view', 'notes.create', 'notes.edit', 'notes.publish', 'notes.delete',
      'content.export',
    ],
  },
  test_evaluator: {
    name: 'Assessment Coordinator',
    description: 'Manages questions, test catalogs, scheduling, and grading evaluations.',
    permissions: [
      'tests.view', 'tests.create', 'tests.edit', 'tests.publish', 'tests.schedule', 'tests.view_results',
      'students.view', 'content.export',
    ],
  },
  community_moderator: {
    name: 'Community Moderator',
    description: 'Maintains community discussions and monitors student activity.',
    permissions: ['community.moderate', 'students.view'],
  },
  auditor: {
    name: 'Compliance Auditor',
    description: 'Read-only access across learning materials, analytics, and audit logs.',
    permissions: ['videos.view', 'notes.view', 'tests.view', 'students.view', 'audit_logs.view', 'analytics.view'],
  },
};

/**
 * Check if a user has a specific permission.
 * - Admin has ALL permissions automatically.
 * - Suspended users have NO permissions.
 * - Sub-admins must have the specific permission key in their permissions list.
 */
export function hasPermission(user: UserProfile | null | undefined, permission: PermissionKey): boolean {
  if (!user) return false;
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has ANY of the specified permissions.
 */
export function hasAnyPermission(user: UserProfile | null | undefined, permissions: PermissionKey[]): boolean {
  if (!user) return false;
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  return permissions.some(perm => user.permissions.includes(perm));
}

/**
 * Check if a user has ALL of the specified permissions.
 */
export function hasAllPermissions(user: UserProfile | null | undefined, permissions: PermissionKey[]): boolean {
  if (!user) return false;
  if (user.status === 'suspended') return false;
  if (user.role === 'admin') return true;
  return permissions.every(perm => user.permissions.includes(perm));
}
