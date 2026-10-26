import {
  UserProfile,
  VideoLesson,
  StudyNote,
  TestSeriesItem,
  AssessmentQuestion,
  TestAttemptResult,
  CodingProblem,
  DiscussionThread,
  UpcomingEvent,
  PermissionKey,
  ContentStatus,
  CodingProblemStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_VIDEOS,
  INITIAL_NOTES,
  INITIAL_TESTS,
  MOCK_QUESTIONS_MAP,
  INITIAL_CODING_PROBLEMS,
  INITIAL_COMMUNITY_THREADS,
  INITIAL_UPCOMING_EVENTS,
} from './mockData';
import { AuditService } from './auditService';
export { AuditService } from './auditService';

// Storage helper with fallback
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`yogneet_${key}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${key} from storage`, e);
  }
  return fallback;
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`yogneet_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to store ${key}`, e);
  }
}

// In-memory state synchronized with localStorage
let usersState: UserProfile[] = getStored('users', INITIAL_USERS);
let videosState: VideoLesson[] = getStored('videos', INITIAL_VIDEOS);
let notesState: StudyNote[] = getStored('notes', INITIAL_NOTES);
let testsState: TestSeriesItem[] = getStored('tests', INITIAL_TESTS);
let codingProblemsState: CodingProblem[] = getStored('coding_problems', INITIAL_CODING_PROBLEMS);
let communityThreadsState: DiscussionThread[] = getStored('community_threads', INITIAL_COMMUNITY_THREADS);
let eventsState: UpcomingEvent[] = getStored('events', INITIAL_UPCOMING_EVENTS);
let testAttemptsState: TestAttemptResult[] = getStored('test_attempts', []);

export const ApiService = {
  // ==========================================
  // Users & Sub-Admin Operations
  // ==========================================
  getUsers(): UserProfile[] {
    return [...usersState];
  },

  getSubAdmins(): UserProfile[] {
    return usersState.filter(u => u.role === 'subadmin');
  },

  getUserById(id: string): UserProfile | undefined {
    return usersState.find(u => u.id === id);
  },

  updateUserProfile(updatedUser: UserProfile): UserProfile {
    const index = usersState.findIndex(u => u.id === updatedUser.id);
    if (index === -1) throw new Error('User not found');
    usersState[index] = { ...updatedUser };
    usersState = [...usersState];
    setStored('users', usersState);
    return usersState[index];
  },

  updateUserPermissions(
    actor: UserProfile,
    targetUserId: string,
    newPermissions: PermissionKey[]
  ): UserProfile {
    const targetUser = usersState.find(u => u.id === targetUserId);
    if (!targetUser) throw new Error('User not found');

    const previousPermissions = [...targetUser.permissions];
    targetUser.permissions = newPermissions;
    usersState = [...usersState];
    setStored('users', usersState);

    AuditService.log(
      actor,
      'permissions.assign',
      'SubAdmin',
      `${targetUser.name} (${targetUser.id})`,
      `Updated permissions for ${targetUser.name}. Total: ${newPermissions.length} permissions assigned.`,
      'SUCCESS',
      {
        before: { permissions: previousPermissions },
        after: { permissions: newPermissions },
      }
    );

    return targetUser;
  },

  toggleSubAdminStatus(actor: UserProfile, targetUserId: string): UserProfile {
    const targetUser = usersState.find(u => u.id === targetUserId);
    if (!targetUser) throw new Error('User not found');
    if (targetUser.role === 'admin') throw new Error('Cannot change status of Super Admin');

    const prevStatus = targetUser.status;
    targetUser.status = prevStatus === 'active' ? 'suspended' : 'active';
    usersState = [...usersState];
    setStored('users', usersState);

    AuditService.log(
      actor,
      targetUser.status === 'suspended' ? 'subadmins.suspend' : 'subadmins.activate',
      'SubAdmin',
      `${targetUser.name} (${targetUser.id})`,
      `Changed account status from ${prevStatus} to ${targetUser.status}.`,
      'SUCCESS'
    );

    return targetUser;
  },

  addSubAdmin(
    actor: UserProfile,
    data: { name: string; email: string; department: string; bio: string; permissions: PermissionKey[] }
  ): UserProfile {
    const newSubAdmin: UserProfile = {
      id: `usr_sub_${Date.now()}`,
      name: data.name,
      email: data.email,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999999)}?w=150&auto=format&fit=crop&q=80`,
      role: 'subadmin',
      status: 'active',
      permissions: data.permissions,
      department: data.department,
      bio: data.bio,
      createdAt: new Date().toISOString(),
      lastActive: 'Just now',
    };

    usersState = [...usersState, newSubAdmin];
    setStored('users', usersState);

    AuditService.log(
      actor,
      'subadmins.create',
      'SubAdmin',
      `${newSubAdmin.name} (${newSubAdmin.id})`,
      `Created new sub-admin with ${data.permissions.length} initial permissions.`,
      'SUCCESS'
    );

    return newSubAdmin;
  },

  deleteSubAdmin(actor: UserProfile, targetUserId: string): void {
    const targetUser = usersState.find(u => u.id === targetUserId);
    if (!targetUser) throw new Error('User not found');
    if (targetUser.role === 'admin') throw new Error('Cannot delete Super Admin account');

    usersState = usersState.filter(u => u.id !== targetUserId);
    setStored('users', usersState);

    AuditService.log(
      actor,
      'subadmins.delete',
      'SubAdmin',
      `${targetUser.name} (${targetUser.id})`,
      `Permanently removed sub-admin account.`,
      'SUCCESS'
    );
  },

  // ==========================================
  // Video Lessons
  // ==========================================
  getVideos(): VideoLesson[] {
    return [...videosState];
  },

  getVideoById(id: string): VideoLesson | undefined {
    return videosState.find(v => v.id === id);
  },

  toggleLessonCompletion(lessonId: string): boolean {
    const lesson = videosState.find(v => v.id === lessonId);
    if (!lesson) return false;
    lesson.completed = !lesson.completed;
    videosState = [...videosState];
    setStored('videos', videosState);
    return lesson.completed;
  },

  addVideoLesson(actor: UserProfile, lessonData: Omit<VideoLesson, 'id' | 'views' | 'completed' | 'publishedAt'>): VideoLesson {
    const newLesson: VideoLesson = {
      ...lessonData,
      id: `vid_${Date.now()}`,
      views: 0,
      completed: false,
      publishedAt: new Date().toISOString().substring(0, 10),
    };
    videosState = [newLesson, ...videosState];
    setStored('videos', videosState);

    AuditService.log(
      actor,
      'videos.create',
      'VideoLesson',
      newLesson.title,
      `Added new video lesson: "${newLesson.title}" to ${newLesson.courseTitle}`,
      'SUCCESS'
    );
    return newLesson;
  },

  // ==========================================
  // Study Notes
  // ==========================================
  getNotes(): StudyNote[] {
    return [...notesState];
  },

  getNoteById(id: string): StudyNote | undefined {
    return notesState.find(n => n.id === id);
  },

  addNote(
    actor: UserProfile,
    data: {
      title: string;
      subject: string;
      category: string;
      tags: string[];
      excerpt: string;
      fullMarkdown: string;
      fileSize?: string;
      status: ContentStatus;
    }
  ): StudyNote {
    const newNote: StudyNote = {
      id: `note_${Date.now()}`,
      title: data.title,
      subject: data.subject,
      category: data.category,
      tags: data.tags,
      author: actor.name,
      authorRole: actor.role === 'admin' ? 'Super Admin' : 'Content Author',
      authorAvatar: actor.avatar,
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      readTime: `${Math.max(5, Math.ceil(data.fullMarkdown.length / 400))} min read`,
      pages: Math.max(1, Math.ceil(data.fullMarkdown.length / 1200)),
      excerpt: data.excerpt,
      fullMarkdown: data.fullMarkdown,
      fileUrl: `/mock-assets/${data.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`,
      fileSize: data.fileSize || '3.2 MB',
      downloadAvailable: true,
      views: 1,
      downloads: 0,
      status: data.status,
    };

    notesState = [newNote, ...notesState];
    setStored('notes', notesState);

    AuditService.log(
      actor,
      'notes.create',
      'StudyNote',
      newNote.title,
      `Created note: "${newNote.title}" with status "${newNote.status}".`,
      'SUCCESS'
    );
    return newNote;
  },

  updateNoteStatus(actor: UserProfile, noteId: string, status: ContentStatus): StudyNote {
    const note = notesState.find(n => n.id === noteId);
    if (!note) throw new Error('Note not found');

    const prevStatus = note.status;
    note.status = status;
    notesState = [...notesState];
    setStored('notes', notesState);

    AuditService.log(
      actor,
      status === 'published' ? 'notes.publish' : 'notes.edit',
      'StudyNote',
      note.title,
      `Changed note status from ${prevStatus} to ${status}.`,
      'SUCCESS'
    );
    return note;
  },

  deleteNote(actor: UserProfile, noteId: string): void {
    const note = notesState.find(n => n.id === noteId);
    if (!note) throw new Error('Note not found');

    notesState = notesState.filter(n => n.id !== noteId);
    setStored('notes', notesState);

    AuditService.log(
      actor,
      'notes.delete',
      'StudyNote',
      note.title,
      `Deleted study note "${note.title}".`,
      'SUCCESS'
    );
  },

  incrementNoteDownloads(noteId: string): void {
    const note = notesState.find(n => n.id === noteId);
    if (note) {
      note.downloads += 1;
      setStored('notes', notesState);
    }
  },

  // ==========================================
  // Test Series & Assessment Engine
  // ==========================================
  getTests(): TestSeriesItem[] {
    return [...testsState];
  },

  getTestById(id: string): TestSeriesItem | undefined {
    return testsState.find(t => t.id === id);
  },

  getTestQuestions(testId: string): AssessmentQuestion[] {
    return MOCK_QUESTIONS_MAP[testId] || MOCK_QUESTIONS_MAP['test_py_201'];
  },

  submitTestAttempt(attempt: TestAttemptResult): void {
    testAttemptsState = [attempt, ...testAttemptsState];
    setStored('test_attempts', testAttemptsState);

    // Update test item lastScore and attemptCount
    const test = testsState.find(t => t.id === attempt.testId);
    if (test) {
      test.attemptCount += 1;
      test.lastScore = attempt.percentage;
      test.bestScore = Math.max(test.bestScore || 0, attempt.percentage);
      test.lastAttemptDate = 'Just now';
      testsState = [...testsState];
      setStored('tests', testsState);
    }
  },

  getTestAttempts(): TestAttemptResult[] {
    return [...testAttemptsState];
  },

  getLatestAttempt(testId: string): TestAttemptResult | undefined {
    return testAttemptsState.find(a => a.testId === testId);
  },

  // ==========================================
  // Coding Practice Arena
  // ==========================================
  getCodingProblems(): CodingProblem[] {
    return [...codingProblemsState];
  },

  getCodingProblemById(idOrSlug: string): CodingProblem | undefined {
    return codingProblemsState.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  },

  updateProblemStatus(problemId: string, status: CodingProblemStatus): void {
    const problem = codingProblemsState.find(p => p.id === problemId);
    if (problem) {
      problem.status = status;
      codingProblemsState = [...codingProblemsState];
      setStored('coding_problems', codingProblemsState);
    }
  },

  // ==========================================
  // Community Forum
  // ==========================================
  getCommunityThreads(): DiscussionThread[] {
    return [...communityThreadsState];
  },

  getThreadById(id: string): DiscussionThread | undefined {
    return communityThreadsState.find(t => t.id === id);
  },

  addThread(actor: UserProfile, data: { title: string; content: string; category: string; tags: string[] }): DiscussionThread {
    const newThread: DiscussionThread = {
      id: `th_${Date.now()}`,
      title: data.title,
      content: data.content,
      author: {
        id: actor.id,
        name: actor.name,
        avatar: actor.avatar,
        role: actor.role === 'admin' ? 'Admin' : actor.role === 'subadmin' ? 'Educator' : 'Student',
        badge: actor.role === 'admin' ? 'Founder' : 'Contributor',
      },
      category: data.category,
      tags: data.tags,
      createdAt: 'Just now',
      upvotes: 1,
      userUpvoted: true,
      repliesCount: 0,
      isSolved: false,
      views: 1,
      replies: [],
    };

    communityThreadsState = [newThread, ...communityThreadsState];
    setStored('community_threads', communityThreadsState);
    return newThread;
  },

  toggleThreadUpvote(threadId: string): { upvotes: number; userUpvoted: boolean } {
    const thread = communityThreadsState.find(t => t.id === threadId);
    if (!thread) return { upvotes: 0, userUpvoted: false };

    if (thread.userUpvoted) {
      thread.upvotes = Math.max(0, thread.upvotes - 1);
      thread.userUpvoted = false;
    } else {
      thread.upvotes += 1;
      thread.userUpvoted = true;
    }
    setStored('community_threads', communityThreadsState);
    return { upvotes: thread.upvotes, userUpvoted: thread.userUpvoted };
  },

  addReply(actor: UserProfile, threadId: string, content: string): DiscussionThread {
    const thread = communityThreadsState.find(t => t.id === threadId);
    if (!thread) throw new Error('Thread not found');

    const newReply = {
      id: `rep_${Date.now()}`,
      threadId,
      author: {
        id: actor.id,
        name: actor.name,
        avatar: actor.avatar,
        role: actor.role === 'admin' ? 'Admin' : actor.role === 'subadmin' ? 'Staff' : 'Student',
        badge: actor.role === 'admin' ? 'Founder' : undefined,
      },
      content,
      createdAt: 'Just now',
      upvotes: 0,
      userUpvoted: false,
    };

    thread.replies.push(newReply);
    thread.repliesCount = thread.replies.length;
    communityThreadsState = [...communityThreadsState];
    setStored('community_threads', communityThreadsState);
    return thread;
  },

  // ==========================================
  // Upcoming Events & Hackathons
  // ==========================================
  getEvents(): UpcomingEvent[] {
    return [...eventsState];
  },

  getAuditLogs() {
    return AuditService.getAll();
  },

  toggleEventRegistration(eventId: string): boolean {
    const event = eventsState.find(e => e.id === eventId);
    if (!event) return false;
    event.registered = !event.registered;
    event.participantsCount += event.registered ? 1 : -1;
    eventsState = [...eventsState];
    setStored('events', eventsState);
    return event.registered;
  },

  // Reset all to defaults
  resetAllData(): void {
    localStorage.clear();
    usersState = [...INITIAL_USERS];
    videosState = [...INITIAL_VIDEOS];
    notesState = [...INITIAL_NOTES];
    testsState = [...INITIAL_TESTS];
    codingProblemsState = [...INITIAL_CODING_PROBLEMS];
    communityThreadsState = [...INITIAL_COMMUNITY_THREADS];
    eventsState = [...INITIAL_UPCOMING_EVENTS];
    testAttemptsState = [];
    AuditService.reset();
  },
};
