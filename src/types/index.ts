// ==========================================
// User & Auth Types
// ==========================================
export type UserRole = 'admin' | 'subadmin' | 'student';

export type UserStatus = 'active' | 'suspended';

export type StudentAccessCategory = 'standard' | 'pro' | 'managed' | 'scholarship';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: UserStatus;
  permissions: PermissionKey[];
  department?: string;
  bio?: string;
  enrolledCourses?: string[];
  solvedProblemsCount?: number;
  testsCompletedCount?: number;
  accessCategory?: StudentAccessCategory;
  institution?: string;
  program?: string;
  createdAt: string;
  lastActive: string;
  mustChangePassword?: boolean;
}

// ==========================================
// Fine-Grained Permissions Model
// ==========================================
export type PermissionKey =
  | 'videos.view'
  | 'videos.create'
  | 'videos.edit'
  | 'videos.delete'
  | 'videos.publish'
  | 'notes.view'
  | 'notes.create'
  | 'notes.edit'
  | 'notes.delete'
  | 'notes.publish'
  | 'tests.view'
  | 'tests.create'
  | 'tests.edit'
  | 'tests.publish'
  | 'tests.schedule'
  | 'tests.view_results'
  | 'subjects.view'
  | 'subjects.create'
  | 'subjects.edit'
  | 'subjects.delete'
  | 'microlessons.view'
  | 'microlessons.create'
  | 'microlessons.edit'
  | 'microlessons.delete'
  | 'premium_students.view'
  | 'premium_students.manage'
  | 'students.view'
  | 'students.suspend'
  | 'community.view'
  | 'community.moderate'
  | 'subadmins.manage'
  | 'permissions.assign'
  | 'audit_logs.view'
  | 'analytics.view'
  | 'advertisements.view'
  | 'advertisements.manage'
  | 'leaderboard.view'
  | 'leaderboard.manage'
  | 'coding.view'
  | 'coding.manage'
  | 'notifications.view'
  | 'notifications.manage'
  | 'content.export';

export type PermissionModule =
  | 'videos'
  | 'notes'
  | 'tests'
  | 'subjects'
  | 'microlessons'
  | 'premium_students'
  | 'students'
  | 'community'
  | 'subadmins'
  | 'audit_logs'
  | 'analytics'
  | 'advertisements'
  | 'leaderboard'
  | 'coding'
  | 'notifications'
  | 'general';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  module: PermissionModule;
  isDangerous?: boolean;
}

// ==========================================
// Video & Course Types
// ==========================================
export interface VideoResource {
  id: string;
  title: string;
  type: 'pdf' | 'code' | 'link' | 'slides';
  size?: string;
  url?: string;
  hasDownload: boolean;
}

export type ContentStatus = 'draft' | 'in_review' | 'published' | 'archived';

export interface VideoLesson {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  youtubeId: string;
  duration: string;
  durationSeconds: number;
  order: number;
  moduleName: string;
  description: string;
  overview: string[];
  publishedAt: string;
  views: number;
  completed: boolean;
  resources: VideoResource[];
  status?: ContentStatus;
}

// ==========================================
// Study Notes Types
// ==========================================

export interface StudyNote {
  id: string;
  title: string;
  subject: string;
  category: string;
  tags: string[];
  author: string;
  authorRole: string;
  authorAvatar: string;
  lastUpdated: string;
  readTime: string;
  pages: number;
  excerpt: string;
  fullMarkdown: string;
  fileUrl?: string;
  fileSize?: string;
  downloadAvailable: boolean;
  views: number;
  downloads: number;
  status: ContentStatus;
  isRestricted?: boolean;
  requiredTier?: StudentAccessCategory;
}

// ==========================================
// Test Series & Assessment Engine
// ==========================================
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type TestType = 'Practice Quiz' | 'Mock Exam' | 'Module Test';
export type QuestionStatus = 'unanswered' | 'answered' | 'marked' | 'marked_answered';

export interface QuestionOption {
  id: string;
  text: string;
  codeSnippet?: string;
}

export interface AssessmentQuestion {
  id: string;
  testId: string;
  questionNumber: number;
  text: string;
  codeSnippet?: string;
  codeLanguage?: string;
  options: QuestionOption[];
  correctAnswerId: string;
  explanation: string;
  marks: number;
  negativeMarks: number;
}

export interface TestSeriesItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  module: string;
  questionCount: number;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  type: TestType;
  status: 'available' | 'upcoming' | 'completed';
  passPercentage: number;
  attemptCount: number;
  lastScore?: number;
  bestScore?: number;
  lastAttemptDate?: string;
  tags: string[];
  isRestricted?: boolean;
  requiredTier?: StudentAccessCategory;
}

export interface TestAttemptResult {
  attemptId: string;
  testId: string;
  testTitle: string;
  subject: string;
  submittedAt: string;
  timeSpentSeconds: number;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  markedCount: number;
  correctCount: number;
  incorrectCount: number;
  scoreObtained: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  userAnswers: Record<string, string>; // questionId -> selectedOptionId
  questionStatuses: Record<string, QuestionStatus>;
}

// ==========================================
// Coding Practice Arena
// ==========================================
export type CodingProblemStatus = 'not_started' | 'attempted' | 'solved';

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: DifficultyLevel;
  category: string;
  tags: string[];
  acceptanceRate: string;
  source: 'native' | 'leetcode' | 'gfg';
  externalUrl?: string;
  status: CodingProblemStatus;
  description: string;
  examples: ProblemExample[];
  constraints: string[];
  starterCode: {
    python: string;
    javascript: string;
    cpp: string;
    java: string;
  };
  sampleSolution?: string;
  hints?: string[];
  solutionExplanation?: string;
  publicationStatus?: 'draft' | 'published' | 'archived';
  submissionsCount?: number;
}

// ==========================================
// Community Forum
// ==========================================
export interface DiscussionReply {
  id: string;
  threadId: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    badge?: string;
  };
  content: string;
  createdAt: string;
  upvotes: number;
  userUpvoted: boolean;
  isAcceptedSolution?: boolean;
  isSoftDeleted?: boolean;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    badge?: string;
  };
  category: string;
  tags: string[];
  createdAt: string;
  upvotes: number;
  userUpvoted: boolean;
  repliesCount: number;
  isSolved: boolean;
  views: number;
  replies: DiscussionReply[];
  isPinned?: boolean;
  isLocked?: boolean;
  isHidden?: boolean;
  isSoftDeleted?: boolean;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

// ==========================================
// Upcoming Events & Hackathons
// ==========================================
export interface UpcomingEvent {
  id: string;
  title: string;
  category: 'Hackathon' | 'Coding Contest' | 'Masterclass' | 'Webinar';
  date: string;
  time: string;
  duration: string;
  prizes: string;
  participantsCount: number;
  registered: boolean;
  description: string;
  tags: string[];
}

// ==========================================
// Audit Logs
// ==========================================
export type AuditOutcome = 'SUCCESS' | 'DENIED' | 'FAILED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: UserRole;
  };
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  outcome: AuditOutcome;
  ipAddress?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
}

// ==========================================
// Phase 3C: Practical / Text-based Assignments
// ==========================================
export interface AssignmentRubricItem {
  id?: string;
  criteria: string;
  marks: number;
  description?: string;
}

export interface PracticalAssignment {
  id: string;
  title: string;
  subject: string;
  module: string;
  problemStatement: string;
  instructions: string;
  topics: string[];
  deliverables: string[];
  submissionRequirements?: string;
  deadline?: string;
  totalMarks: number;
  rubric: AssignmentRubricItem[];
  status: ContentStatus;
  authorId?: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isRestricted?: boolean;
  requiredTier?: StudentAccessCategory;
}

// ==========================================
// Phase 3C: Student Directory Pre-Provisioning
// ==========================================

export interface StudentDirectoryEntry {
  id: string;
  email: string;
  name: string;
  department: string;
  institution?: string;
  program?: string;
  status: UserStatus;
  accessCategory: StudentAccessCategory;
  createdAt: string;
  updatedAt: string;
}

export interface StudentImportRow {
  name: string;
  email: string;
  department?: string;
  institution?: string;
  program?: string;
  accessCategory?: StudentAccessCategory;
}

// ==========================================
// Phase 3C: Assessment Import Contract
// ==========================================
export interface AssessmentImportQuestion {
  question_text?: string;
  text?: string;
  code_snippet?: string;
  code_language?: string;
  options: Array<{ id: string; text: string }>;
  correct_answer_id: string;
  explanation?: string;
  marks?: number;
  negative_marks?: number;
}

export interface AssessmentImportPayload {
  schemaVersion: number;
  assessment: {
    id?: string;
    title: string;
    description?: string;
    subject: string;
    module?: string;
    duration_minutes?: number;
    difficulty: DifficultyLevel;
    type: TestType;
    status?: 'available' | 'upcoming' | 'completed';
    pass_percentage?: number;
    tags?: string[];
  };
  questions: AssessmentImportQuestion[];
}

// ==========================================
// Phase 1: Subject Management
// ==========================================
export interface SubjectContentCounts {
  videos: number;
  notes: number;
  assignments: number;
  assessments: number;
  testSeries: number;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // Lucide icon identifier e.g. Code, Database, Globe, Cpu, Terminal, Layers, Brain
  displayOrder: number;
  isActive: boolean;
  colorScheme?: string;
  contentCounts: SubjectContentCounts;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectInput {
  name: string;
  description: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  colorScheme?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
  colorScheme?: string;
}

// ==========================================
// Phase 1: Micro Lessons (Shorts)
// ==========================================
export interface MicroSubject {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  displayOrder: number;
  isActive: boolean;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMicroSubjectInput {
  name: string;
  description: string;
  coverImage: string;
  displayOrder: number;
  isActive: boolean;
}

export interface UpdateMicroSubjectInput {
  name?: string;
  description?: string;
  coverImage?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface MicroLesson {
  id: string;
  microSubjectId: string;
  microSubjectName: string;
  title: string;
  description: string;
  youtubeShortsUrl: string;
  youtubeId: string;
  displayOrder: number;
  status: 'published' | 'draft' | 'archived';
  thumbnailUrl?: string;
  authorName: string;
  duration?: string;
  likesCount?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMicroLessonInput {
  microSubjectId: string;
  title: string;
  description: string;
  youtubeShortsUrl: string;
  displayOrder: number;
  status: 'published' | 'draft' | 'archived';
  authorName?: string;
  thumbnailUrl?: string;
}

export interface UpdateMicroLessonInput {
  microSubjectId?: string;
  title?: string;
  description?: string;
  youtubeShortsUrl?: string;
  displayOrder?: number;
  status?: 'published' | 'draft' | 'archived';
  authorName?: string;
  thumbnailUrl?: string;
}

// ==========================================
// Phase 1: Premium Student & Staff Management
// ==========================================
export interface PremiumStudent {
  id: string;
  userId: string;
  name: string;
  email: string;
  yogneetEmail?: string; // Proposed convention: username@yogneet.edu
  enrollmentNumber: string; // Format: YEAR + SEQUENTIAL e.g. 2026001, 20261000
  admissionYear: number;
  sequentialNumber: number;
  phone?: string;
  department: string;
  institution?: string;
  program?: string;
  isPremiumActive: boolean;
  status: UserStatus;
  origin: 'google_converted' | 'direct_provisioned';
  convertedAt?: string;
  lastActive?: string;
  createdAt: string;
}

export interface UpgradeStudentInput {
  userId: string;
  admissionYear: number;
  phone?: string;
  department?: string;
  program?: string;
  institution?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  yogneetEmail?: string;
  role: 'admin' | 'subadmin';
  status: UserStatus;
  phone?: string;
  department?: string;
  bio?: string;
  permissions: PermissionKey[];
  mustChangePassword?: boolean;
  createdAt: string;
  lastActive: string;
}

// ==========================================
// Phase 1: Account Inspection (Admin UI)
// ==========================================
export interface AccountInspection {
  student: UserProfile | PremiumStudent;
  enrollmentNumber?: string;
  role: UserRole;
  accessCategory: StudentAccessCategory;
  learningProgress: {
    videosWatched: number;
    totalVideos: number;
    watchHours: number;
    completionPercentage: number;
  };
  enrolledSubjects: Array<{
    id: string;
    name: string;
    progress: number;
    lastAccessed: string;
  }>;
  assessmentHistory: Array<{
    id: string;
    title: string;
    score: number;
    maxScore: number;
    percentage: number;
    percentile: number;
    passed: boolean;
    submittedAt: string;
  }>;
  notesSummary: {
    notesViewed: number;
    pdfsDownloaded: number;
    lastReadNote?: string;
  };
  activityTimeline: Array<{
    action: string;
    timestamp: string;
    details: string;
  }>;
}

// ==========================================
// Phase 1: Password Lifecycle State
// ==========================================
export interface PasswordLifecycleState {
  userId: string;
  userName: string;
  userEmail: string;
  accountType: 'staff' | 'premium_student';
  phone?: string;
  enrollmentNumber?: string;
  temporaryCredentialGenerated: boolean;
  temporaryCredentialHint?: string; // Policy preview e.g. "Last 4 phone + Last 4 enrollment"
  mustChangeAtFirstLogin: boolean;
  lastPasswordResetAt?: string;
}

// ==========================================
// Feature 1: Student Module Access Management
// ==========================================
export interface StudentModuleAccess {
  moduleKey: string;
  moduleName: string;
  moduleRoute: string;
  description: string;
  normalEnabled: boolean;
  premiumEnabled: boolean;
  displayOrder: number;
  updatedAt: string;
  updatedBy?: string | null;
}

// ==========================================
// Feature 2: Private Feedback Management
// ==========================================
export type FeedbackCategory = 'Bug' | 'UI Issue' | 'Content Issue' | 'Account Issue' | 'Other';
export type FeedbackStatus = 'New' | 'In Progress' | 'Resolved';

export interface FeedbackSubmission {
  id: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  userEmail: string;
  accessCategory: 'standard' | 'pro';
  title: string;
  description: string;
  category: FeedbackCategory;
  attachmentUrl?: string | null;
  status: FeedbackStatus;
  adminReply?: string | null;
  adminRepliedBy?: string | null;
  repliedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}



// ==========================================
// Feature 1: Active Learners Counter
// ==========================================
export interface ActiveLearnersMetrics {
  actualActiveLearners: number;
  configuredBaseCounter: number;
  displayedActiveLearners: number;
  lastUpdated?: string;
}

// ==========================================
// Feature 2: Top 200 Student Leaderboard
// ==========================================
export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  avatarUrl: string;
  compositeScore: number;
  testsCompleted: number;
  accuracyPercentage: number;
  streakDays: number;
  department?: string;
  isPremium?: boolean;
  isCurrentUser?: boolean;
}

export interface LeaderboardConfig {
  isEnabled: boolean;
  eligibleCategories: string[];
  minAssessmentsRequired: number;
  updatedAt?: string;
}

export interface StudentLeaderboardStatus {
  inTop200: boolean;
  rank: number | null;
  compositeScore: number;
  testsCompleted: number;
  accuracyPercentage: number;
}

// ==========================================
// Feature 3: Advertisements & Monetization
// ==========================================
export type AdPlacement = 'dashboard' | 'banner' | 'popup_post_login' | 'sidebar_sponsored';
export type AdStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  destinationUrl: string;
  placement: AdPlacement;
  targetPages: string[];
  startDate: string;
  endDate?: string;
  displayDurationSeconds: number;
  status: AdStatus;
  maxImpressionsPerUserPerDay: number;
  minSecondsBetweenDisplays: number;
  priority: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface AdAnalyticsSummary {
  totalImpressions: number;
  uniqueViewers: number;
  totalClicks: number;
  ctr: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  expiredCampaigns: number;
  campaigns: Array<{
    id: string;
    title: string;
    placement: string;
    status: string;
    startDate: string;
    endDate?: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  pageWise: Array<{
    page: string;
    impressions: number;
    clicks: number;
  }>;
}

// ==========================================
// Feature 5: Coding Practice Test Cases & Submissions
// ==========================================
export interface CodingTestCase {
  id?: string;
  problemId?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight?: number;
  orderIndex?: number;
  explanation?: string;
}

export interface CodingSubmissionResult {
  submissionId: string;
  status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'runtime_error' | 'compile_error';
  testCasesPassed: number;
  totalTestCases: number;
  runtimeMs: number;
  memoryMb: number;
  isFirstSolve?: boolean;
  errorMessage?: string;
}

// ==========================================
// Feature 6: Community Moderation
// ==========================================
export interface ModerationLogEntry {
  id: string;
  moderatorId: string;
  moderatorName?: string;
  action: string;
  targetType: 'thread' | 'reply' | 'user';
  targetId: string;
  reason: string;
  details?: any;
  createdAt: string;
}
