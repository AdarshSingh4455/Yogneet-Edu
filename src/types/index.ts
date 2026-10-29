// ==========================================
// User & Auth Types
// ==========================================
export type UserRole = 'admin' | 'subadmin' | 'student';

export type UserStatus = 'active' | 'suspended';

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
  createdAt: string;
  lastActive: string;
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
  | 'students.view'
  | 'students.suspend'
  | 'community.moderate'
  | 'subadmins.manage'
  | 'permissions.assign'
  | 'audit_logs.view'
  | 'analytics.view'
  | 'content.export';

export type PermissionModule =
  | 'videos'
  | 'notes'
  | 'tests'
  | 'students'
  | 'community'
  | 'subadmins'
  | 'audit_logs'
  | 'analytics'
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
}

// ==========================================
// Study Notes Types
// ==========================================
export type ContentStatus = 'draft' | 'in_review' | 'published' | 'archived';

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
}

// ==========================================
// Phase 3C: Student Directory Pre-Provisioning
// ==========================================
export type StudentAccessCategory = 'standard' | 'managed' | 'scholarship';

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
