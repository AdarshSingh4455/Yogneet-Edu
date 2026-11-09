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

  // Subjects
  {
    key: 'subjects.view',
    label: 'View Subjects',
    description: 'Browse curriculum subjects, course outlines, and display orders.',
    module: 'subjects',
  },
  {
    key: 'subjects.create',
    label: 'Create Subjects',
    description: 'Add new foundational academic subjects to the curriculum.',
    module: 'subjects',
  },
  {
    key: 'subjects.edit',
    label: 'Edit Subjects',
    description: 'Modify subject names, descriptions, icons, and display ordering.',
    module: 'subjects',
  },
  {
    key: 'subjects.delete',
    label: 'Delete Subjects',
    description: 'Permanently remove subjects and associated curriculum structures.',
    module: 'subjects',
    isDangerous: true,
  },

  // Micro Lessons
  {
    key: 'microlessons.view',
    label: 'View Micro Lessons',
    description: 'Inspect short-form vertical lessons and micro topics.',
    module: 'microlessons',
  },
  {
    key: 'microlessons.create',
    label: 'Create Micro Lessons',
    description: 'Author micro subjects and link YouTube Shorts videos.',
    module: 'microlessons',
  },
  {
    key: 'microlessons.edit',
    label: 'Edit Micro Lessons',
    description: 'Update shorts links, descriptions, and sequence order.',
    module: 'microlessons',
  },
  {
    key: 'microlessons.delete',
    label: 'Delete Micro Lessons',
    description: 'Remove shorts and micro learning modules.',
    module: 'microlessons',
    isDangerous: true,
  },

  // Premium Students
  {
    key: 'premium_students.view',
    label: 'View Premium Students',
    description: 'Access directory of premium students and enrollment numbers.',
    module: 'premium_students',
  },
  {
    key: 'premium_students.manage',
    label: 'Manage Premium Entitlements',
    description: 'Upgrade accounts, toggle access, and inspect student records.',
    module: 'premium_students',
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
  // Community View
  {
    key: 'community.view',
    label: 'View Community Threads',
    description: 'Read and browse public forum threads, replies, and discussion topics.',
    module: 'community',
  },

  // Advertisements
  {
    key: 'advertisements.view',
    label: 'View Advertisements & Analytics',
    description: 'Inspect active campaigns, banner placements, impressions, and click metrics.',
    module: 'advertisements',
  },
  {
    key: 'advertisements.manage',
    label: 'Manage Campaigns & Ads',
    description: 'Create, schedule, pause, and edit advertisement campaigns and creatives.',
    module: 'advertisements',
    isDangerous: true,
  },

  // Leaderboard
  {
    key: 'leaderboard.view',
    label: 'View Leaderboard Analytics',
    description: 'Inspect top 200 student rankings, score distributions, and calculation criteria.',
    module: 'leaderboard',
  },
  {
    key: 'leaderboard.manage',
    label: 'Manage Leaderboard & Exclusions',
    description: 'Enable/disable leaderboard, configure categories, and exclude fraudulent attempts.',
    module: 'leaderboard',
    isDangerous: true,
  },

  // Coding
  {
    key: 'coding.view',
    label: 'View Coding Practice Arena',
    description: 'Inspect algorithmic questions, submissions, and acceptance rates.',
    module: 'coding',
  },
  {
    key: 'coding.manage',
    label: 'Manage Coding Questions & Tests',
    description: 'Create questions, manage hidden test cases, and execute bulk JSON imports.',
    module: 'coding',
  },

  // Notifications
  {
    key: 'notifications.view',
    label: 'View System Notifications',
    description: 'Browse sent student notices, broadcast alerts, and delivery receipts.',
    module: 'notifications',
  },
  {
    key: 'notifications.manage',
    label: 'Dispatch Broadcast Notifications',
    description: 'Compose and dispatch platform-wide announcements and warning notices.',
    module: 'notifications',
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
  subjects: {
    label: 'Curriculum & Subjects',
    description: 'Permissions governing subjects, syllabus hierarchy, and ordering.',
    icon: 'BookOpen',
  },
  microlessons: {
    label: 'Micro Lessons & Shorts',
    description: 'Permissions governing vertical micro lessons and quick tips.',
    icon: 'Film',
  },
  premium_students: {
    label: 'Premium Students & Entitlements',
    description: 'Permissions governing premium student conversions and enrollment records.',
    icon: 'Crown',
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
  advertisements: {
    label: 'Advertisements & Monetization',
    description: 'Campaign scheduling, placements, frequency capping, and click analytics.',
    icon: 'Megaphone',
  },
  leaderboard: {
    label: 'Top 200 Leaderboard',
    description: 'Competitive student ranking, scoring criteria, and fraud exclusions.',
    icon: 'Trophy',
  },
  coding: {
    label: 'Coding Arena & Questions',
    description: 'Algorithmic problem management, hidden test cases, and JSON imports.',
    icon: 'Code2',
  },
  notifications: {
    label: 'Notification Dispatcher',
    description: 'Platform announcements, alerts, and student warning delivery.',
    icon: 'Bell',
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
    permissions: ['community.view', 'community.moderate', 'students.view'],
  },
  ads_manager: {
    name: 'Ads & Monetization Lead',
    description: 'Manages marketing campaigns, banner creatives, and frequency capping analytics.',
    permissions: ['advertisements.view', 'advertisements.manage', 'analytics.view'],
  },
  coding_lead: {
    name: 'Coding Arena Instructor',
    description: 'Authors algorithmic challenges, sets hidden test cases, and audits submissions.',
    permissions: ['coding.view', 'coding.manage', 'students.view'],
  },
  leaderboard_manager: {
    name: 'Tournament & Leaderboard Lead',
    description: 'Monitors student rankings, audits suspicious score spikes, and enforces exclusions.',
    permissions: ['leaderboard.view', 'leaderboard.manage', 'tests.view_results'],
  },
  auditor: {
    name: 'Compliance Auditor',
    description: 'Read-only access across learning materials, analytics, and audit logs.',
    permissions: ['videos.view', 'notes.view', 'tests.view', 'students.view', 'audit_logs.view', 'analytics.view', 'advertisements.view', 'leaderboard.view', 'coding.view'],
  },
};

/**
 * Authoritative Department to Initial Role mapping.
 * Each department strictly governs which role presets can be provisioned.
 */
export interface DepartmentConfig {
  id: string;
  name: string;
  description: string;
  allowedRoleKeys: string[];
}

export const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  'Curriculum & Video Authoring': {
    id: 'curriculum',
    name: 'Curriculum & Video Authoring',
    description: 'Creation and lifecycle management of video lectures, study notes, and syllabus structures.',
    allowedRoleKeys: ['content_creator', 'content_manager'],
  },
  'Assessment & Test Series': {
    id: 'assessment',
    name: 'Assessment & Test Series',
    description: 'Mock tests, practice series, question authoring, scheduling, and student evaluations.',
    allowedRoleKeys: ['test_evaluator'],
  },
  'Community Moderation': {
    id: 'community',
    name: 'Community Moderation',
    description: 'Discussion forums, student threads, answer verification, and safety moderation.',
    allowedRoleKeys: ['community_moderator'],
  },
  'Platform Compliance & Audit': {
    id: 'compliance',
    name: 'Platform Compliance & Audit',
    description: 'Read-only operational oversight, compliance inspection, and security audit logs.',
    allowedRoleKeys: ['auditor'],
  },
  'Advertisements & Monetization': {
    id: 'advertisements',
    name: 'Advertisements & Monetization',
    description: 'Sponsor campaigns, banner placements, impression limits, and CTR analytics.',
    allowedRoleKeys: ['ads_manager'],
  },
  'Coding Arena & Practice': {
    id: 'coding',
    name: 'Coding Arena & Practice',
    description: 'Algorithmic problem authoring, test case suites, and code execution evaluation.',
    allowedRoleKeys: ['coding_lead'],
  },
  'Tournaments & Leaderboard': {
    id: 'leaderboard',
    name: 'Tournaments & Leaderboard',
    description: 'Competitive rankings, scoring governance, and leaderboard fraud exclusions.',
    allowedRoleKeys: ['leaderboard_manager'],
  },
};

export const VALID_DEPARTMENTS: string[] = Object.keys(DEPARTMENT_CONFIGS);

/**
 * Returns all valid departments supported by the platform.
 */
export function getDepartments(): string[] {
  return VALID_DEPARTMENTS;
}

/**
 * Returns all valid role presets for a specific department.
 */
export function getRolesForDepartment(department: string): Array<{ key: string; name: string; description: string; permissions: PermissionKey[] }> {
  const dept = DEPARTMENT_CONFIGS[department];
  if (!dept) return [];
  return dept.allowedRoleKeys
    .map(key => ({
      key,
      ...ROLE_PRESETS[key],
    }))
    .filter(role => !!role.name);
}

/**
 * Validates whether a department and role preset combination is permitted under the RBAC policy.
 */
export function isValidDepartmentRole(department: string, roleKey: string): boolean {
  const dept = DEPARTMENT_CONFIGS[department];
  if (!dept) return false;
  return dept.allowedRoleKeys.includes(roleKey);
}

/**
 * Generates a cryptographically strong temporary password.
 * Satisfies all complexity rules:
 * - Minimum 16 characters (well over the 12-character requirement)
 * - Contains uppercase letters, lowercase letters, numbers, and special symbols
 * - Generated using cryptographically secure pseudorandom number generators (Web Crypto API)
 * - Rejection sampling is employed for all random selections to completely eliminate modulo bias
 * - NEVER derived from phone numbers, email addresses, names, or predictable sequences
 * - Throws a controlled Error if cryptographically secure randomness is unavailable (zero non-crypto fallback)
 */
export function generateSecureTemporaryPassword(length: number = 16): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Cryptographically secure pseudorandom number generator (crypto.getRandomValues) is required but unavailable in this environment.');
  }

  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;

  /**
   * Unbiased random integer selection in range [0, maxExclusive - 1] via rejection sampling.
   * Discards samples >= limit where limit is the largest multiple of maxExclusive <= 256.
   */
  const getUnbiasedRandomInt = (maxExclusive: number): number => {
    if (maxExclusive <= 0 || maxExclusive > 256) {
      throw new Error(`Invalid range for byte rejection sampling: ${maxExclusive}`);
    }
    const limit = 256 - (256 % maxExclusive);
    const buffer = new Uint8Array(1);
    while (true) {
      cryptoObj.getRandomValues(buffer);
      const byte = buffer[0];
      if (byte < limit) {
        return byte % maxExclusive;
      }
    }
  };

  // Enforce minimum 16 characters complexity
  const targetLength = Math.max(16, length);

  // Ensure at least one from each character class
  const u = upper[getUnbiasedRandomInt(upper.length)];
  const l = lower[getUnbiasedRandomInt(lower.length)];
  const d = digits[getUnbiasedRandomInt(digits.length)];
  const s = symbols[getUnbiasedRandomInt(symbols.length)];

  // Fill remaining characters from entire pool using rejection sampling
  const restLength = targetLength - 4;
  let rest = '';
  for (let i = 0; i < restLength; i++) {
    rest += all[getUnbiasedRandomInt(all.length)];
  }

  // Shuffle characters using Fisher-Yates with unbiased rejection sampling
  const chars = (u + l + d + s + rest).split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getUnbiasedRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

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
