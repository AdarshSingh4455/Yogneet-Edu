import {
  UserProfile,
  VideoLesson,
  StudyNote,
  TestSeriesItem,
  AssessmentQuestion,
  CodingProblem,
  DiscussionThread,
  UpcomingEvent,
  AuditLogEntry,
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr_admin_1',
    name: 'Adarsh (Tech Geek Adarsh)',
    email: 'adarsh@yogneetedu.in',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    status: 'active',
    permissions: [
      'videos.view', 'videos.create', 'videos.edit', 'videos.delete', 'videos.publish',
      'notes.view', 'notes.create', 'notes.edit', 'notes.delete', 'notes.publish',
      'tests.view', 'tests.create', 'tests.edit', 'tests.publish', 'tests.schedule', 'tests.view_results',
      'students.view', 'students.suspend',
      'community.moderate',
      'subadmins.manage',
      'permissions.assign',
      'audit_logs.view',
      'analytics.view',
      'content.export',
    ],
    department: 'Platform Architecture & Founder',
    bio: 'Founder of Tech Geek Adarsh and Lead Platform Architect for Yogneet Edu.',
    createdAt: '2025-01-10T08:00:00Z',
    lastActive: 'Just now',
  },
  {
    id: 'usr_subadmin_1',
    name: 'Priyanshi Verma',
    email: 'priyanshi.v@yogneetedu.in',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'subadmin',
    status: 'active',
    permissions: [
      'videos.view', 'videos.create', 'videos.edit',
      'notes.view', 'notes.create', 'notes.edit', 'notes.publish',
      'content.export',
    ],
    department: 'Curriculum & Video Production',
    bio: 'Technical author and video educator specializing in Python and Data Science curricula.',
    createdAt: '2025-02-01T10:30:00Z',
    lastActive: '12 mins ago',
  },
  {
    id: 'usr_subadmin_2',
    name: 'Rohan Sharma',
    email: 'rohan.s@yogneetedu.in',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'subadmin',
    status: 'active',
    permissions: [
      'tests.view', 'tests.create', 'tests.edit', 'tests.publish', 'tests.schedule', 'tests.view_results',
      'students.view',
    ],
    department: 'Assessment & Test Operations',
    bio: 'Oversees question design, algorithmic test banks, and automated scoring evaluations.',
    createdAt: '2025-02-15T14:20:00Z',
    lastActive: '2 hours ago',
  },
  {
    id: 'usr_subadmin_3',
    name: 'Ananya Patel',
    email: 'ananya.p@yogneetedu.in',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    role: 'subadmin',
    status: 'active',
    permissions: [
      'community.moderate',
      'students.view',
    ],
    department: 'Student Success & Community',
    bio: 'Moderates forum discussions, guides peer review groups, and ensures community guidelines.',
    createdAt: '2025-03-01T09:15:00Z',
    lastActive: '1 day ago',
  },
  {
    id: 'usr_subadmin_4',
    name: 'Vikram Singh',
    email: 'vikram.singh@yogneetedu.in',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'subadmin',
    status: 'suspended',
    permissions: [
      'videos.view', 'notes.view', 'tests.view', 'audit_logs.view',
    ],
    department: 'Audit & Compliance',
    bio: 'Account temporarily suspended during quarterly compliance and credential rotation.',
    createdAt: '2025-01-20T11:00:00Z',
    lastActive: '14 days ago',
  },
  {
    id: 'usr_student_1',
    name: 'Alex Rivera',
    email: 'alex.rivera@student.yogneetedu.in',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    role: 'student',
    status: 'active',
    permissions: [],
    department: 'B.Tech Computer Science (3rd Year)',
    bio: 'Passionate student preparing for product company SDE internships and coding rounds.',
    enrolledCourses: ['course_py_mastery', 'course_dsa_core'],
    solvedProblemsCount: 47,
    testsCompletedCount: 6,
    createdAt: '2025-03-05T12:00:00Z',
    lastActive: 'Active now',
  },
];

export const INITIAL_VIDEOS: VideoLesson[] = [
  {
    id: 'vid_101',
    courseId: 'course_py_mastery',
    courseTitle: 'Python Mastery for High-Scale Systems',
    title: 'Python Under the Hood: Memory Management, GIL & Bytecode',
    youtubeId: 'rfscVS0vtbw', // Learn Python 4-hour master lecture
    duration: '28:45',
    durationSeconds: 1725,
    order: 1,
    moduleName: 'Module 1: Advanced Python Internals',
    description: 'Explore CPython internals, memory allocation, reference counting, cyclic garbage collection, and how the Global Interpreter Lock (GIL) operates in multi-threaded workflows.',
    overview: [
      'CPython stack-based virtual machine execution pipeline',
      'PyObject header, reference counting, and garbage collection flags',
      'The Global Interpreter Lock (GIL) and modern free-threaded Python 3.13 preview',
      'Hands-on memory profiling using the sys and tracemalloc modules',
    ],
    publishedAt: '2025-03-10',
    views: 14820,
    completed: true,
    resources: [
      {
        id: 'res_1',
        title: 'Python Memory Management Cheat Sheet',
        type: 'pdf',
        size: '2.4 MB',
        url: '/mock-assets/python-memory-cheatsheet.pdf',
        hasDownload: true,
      },
      {
        id: 'res_2',
        title: 'tracemalloc & Disassembler Python Scripts',
        type: 'code',
        size: '14 KB',
        url: '/mock-assets/memory-scripts.zip',
        hasDownload: true,
      },
      {
        id: 'res_3',
        title: 'Official CPython Internal Architecture Docs',
        type: 'link',
        url: 'https://docs.python.org/3/c-api/index.html',
        hasDownload: false,
      },
    ],
  },
  {
    id: 'vid_102',
    courseId: 'course_py_mastery',
    courseTitle: 'Python Mastery for High-Scale Systems',
    title: 'Decorators, Closures, and Metaclasses Demystified',
    youtubeId: 'FsAPt_9B7Wc',
    duration: '34:10',
    durationSeconds: 2050,
    order: 2,
    moduleName: 'Module 1: Advanced Python Internals',
    description: 'Learn how closures capture lexical scope in Python, implement parameterized and class-based decorators, and construct custom Metaclasses for API validation.',
    overview: [
      'Lexical closures and the __closure__ cell object inspection',
      'Writing robust decorators with functools.wraps preservation',
      'Class decorators vs Metaclass __new__ and __init__ lifecycle',
      'Building an automated JSON runtime type-validator',
    ],
    publishedAt: '2025-03-15',
    views: 11200,
    completed: false,
    resources: [
      {
        id: 'res_4',
        title: 'Metaclasses & Decorators Reference Guide',
        type: 'pdf',
        size: '1.8 MB',
        url: '/mock-assets/metaclasses-guide.pdf',
        hasDownload: true,
      },
    ],
  },
  {
    id: 'vid_103',
    courseId: 'course_dsa_core',
    courseTitle: 'DSA & Algorithmic Problem Solving',
    title: 'Binary Tree Traversals, Lowest Common Ancestor & Diameters',
    youtubeId: 'fAAZixBzIAI',
    duration: '42:15',
    durationSeconds: 2535,
    order: 1,
    moduleName: 'Module 3: Non-Linear Data Structures',
    description: 'Deep dive into binary tree representations, recursive vs iterative stack traversals, LCA algorithms with parent pointers and binary lifting basics.',
    overview: [
      'Depth-First Search (Preorder, Inorder, Postorder) iteration using explicit stacks',
      'Breadth-First Search (Level-order) using double-ended queues',
      'Finding the Lowest Common Ancestor in O(H) and O(log N) complexity',
      'Calculating binary tree diameter without redundant sub-tree traversals',
    ],
    publishedAt: '2025-03-18',
    views: 23400,
    completed: true,
    resources: [
      {
        id: 'res_5',
        title: 'Binary Tree Patterns & LeetCode Map',
        type: 'pdf',
        size: '3.1 MB',
        url: '/mock-assets/trees-patterns.pdf',
        hasDownload: true,
      },
    ],
  },
  {
    id: 'vid_104',
    courseId: 'course_dsa_core',
    courseTitle: 'DSA & Algorithmic Problem Solving',
    title: 'Graph Theory: Dijkstra, Bellman-Ford & Floyd-Warshall',
    youtubeId: 'EFg3u_E6eHU',
    duration: '50:30',
    durationSeconds: 3030,
    order: 2,
    moduleName: 'Module 4: Advanced Graph Algorithms',
    description: 'Master shortest path algorithms across directed and undirected graphs, handling negative weight cycles and multi-source scenarios.',
    overview: [
      'Dijkstra with Priority Queue / Min-Heap in O((V + E) log V)',
      'Bellman-Ford relaxation and detecting negative weight cycles',
      'Floyd-Warshall all-pairs shortest path in O(V^3)',
      'Tradeoffs between adjacency matrices and adjacency lists for sparse graphs',
    ],
    publishedAt: '2025-03-22',
    views: 18900,
    completed: false,
    resources: [
      {
        id: 'res_6',
        title: 'Graph Algorithms Master Summary',
        type: 'pdf',
        size: '4.2 MB',
        url: '/mock-assets/graph-algorithms.pdf',
        hasDownload: true,
      },
    ],
  },
  {
    id: 'vid_105',
    courseId: 'course_web_dev',
    courseTitle: 'Full-Stack Modern Web Engineering',
    title: 'Building High-Performance REST APIs with Node.js & TypeScript',
    youtubeId: 'Oe421EPjeBE',
    duration: '38:50',
    durationSeconds: 2330,
    order: 1,
    moduleName: 'Module 2: Server-Side Engineering',
    description: 'Architecting modular Express and Fastify microservices with clean controller-service-repository patterns, Zod validation, and structured error handling.',
    overview: [
      'Controller, Service, Repository design patterns',
      'Input validation and runtime parsing with Zod schemas',
      'Centralized asynchronous error-handling middleware',
      'Rate-limiting and JWT authentication pipelines',
    ],
    publishedAt: '2025-03-25',
    views: 9450,
    completed: false,
    resources: [
      {
        id: 'res_7',
        title: 'Backend API Architecture Blueprint',
        type: 'pdf',
        size: '2.9 MB',
        url: '/mock-assets/backend-blueprint.pdf',
        hasDownload: true,
      },
    ],
  },
];

export const INITIAL_NOTES: StudyNote[] = [
  {
    id: 'note_1',
    title: 'Complete Python 3.13 Handwritten Cheatsheet & OOPs Architecture',
    subject: 'Python',
    category: 'Programming Languages',
    tags: ['Python', 'OOPs', 'Memory Management', 'Cheatsheet'],
    author: 'Tech Geek Adarsh',
    authorRole: 'Platform Founder & Lead Instructor',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastUpdated: 'Oct 18, 2025',
    readTime: '15 min read',
    pages: 28,
    excerpt: 'Comprehensive revision guide covering core primitives, memory addressing, magic dunder methods, generator protocols, and high-performance concurrency models.',
    fullMarkdown: `# Complete Python 3.13 & OOPs Architecture Guide

By **Tech Geek Adarsh** • *Yogneet Edu Platform*

## 1. Core Data Structures & Time Complexities

Python built-in structures are highly optimized C implementations:
- **List**: Dynamic array with $O(1)$ amortized append, $O(n)$ arbitrary insert/delete.
- **Dict**: High-performance hash table with open addressing and compact memory layout. Insertion and lookup are $O(1)$ average.
- **Set**: Backed by a hashtable without value pointers. Set operations ($\cup, \cap, \setminus$) are optimized in C.

\`\`\`python
# Example: Custom Context Manager using Dunder Methods
class DatabaseConnection:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.connection = None

    def __enter__(self):
        print(f"Connecting to {self.dsn}...")
        self.connection = {"status": "connected", "dsn": self.dsn}
        return self.connection

    def __exit__(self, exc_type, exc_val, exc_tb):
        print("Closing connection...")
        self.connection = None
        if exc_type:
            print(f"Handled exception: {exc_val}")
        return True  # Suppress exception if handled
\`\`\`

## 2. Object Oriented Architecture in Python

### Four Pillars:
1. **Encapsulation**: Private name-mangling using double underscore \`__attribute\`.
2. **Inheritance**: Method Resolution Order (MRO) using the C3 Supercomputing algorithm.
3. **Polymorphism**: Duck-typing philosophy ("If it quacks like a duck...").
4. **Abstraction**: Python's \`abc\` module with \`@abstractmethod\`.

## 3. High-Performance Concurrency
- **Multi-threading**: Bound by the GIL for CPU tasks, ideal for I/O bound requests.
- **Multi-processing**: Spawns isolated CPython processes communicating via IPC pipes or shared memory.
- **Asyncio**: Single-threaded cooperative multitasking utilizing an event loop and coroutines (\`async/await\`).`,
    fileUrl: '/mock-assets/python-master-notes.pdf',
    fileSize: '4.8 MB',
    downloadAvailable: true,
    views: 4890,
    downloads: 1420,
    status: 'published',
  },
  {
    id: 'note_2',
    title: 'DSA Deep Dive: Binary Trees, BSTs & AVL Balance Rotations',
    subject: 'Data Structures',
    category: 'Computer Science Core',
    tags: ['Trees', 'Binary Search Tree', 'AVL Tree', 'Algorithms'],
    author: 'Priyanshi Verma',
    authorRole: 'Curriculum Lead',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    lastUpdated: 'Oct 20, 2025',
    readTime: '20 min read',
    pages: 36,
    excerpt: 'Detailed mathematical breakdown of height-balanced trees, AVL rotation formulas, recursive traversal invariant proofs, and Morris Inorder Traversal in O(1) space.',
    fullMarkdown: `# Binary Trees & Balanced Binary Search Trees

## Tree Invariants & Height Definitions
A binary tree node contains at most two children. The maximum number of nodes at level $L$ is $2^L$.
For a balanced binary search tree of $N$ nodes, height $H = \\lfloor \\log_2 N \\rfloor$.

\`\`\`python
# AVL Tree Balance Factor Calculation
# BalanceFactor(node) = Height(node.left) - Height(node.right)
# Invariant: BalanceFactor must remain in {-1, 0, 1}
\`\`\`

## AVL Rotations
When an insertion violates the AVL condition:
1. **Left-Left (LL) Case**: Single Right Rotation.
2. **Right-Right (RR) Case**: Single Left Rotation.
3. **Left-Right (LR) Case**: Left rotation on left child, then Right rotation on current node.
4. **Right-Left (RL) Case**: Right rotation on right child, then Left rotation on current node.

## Morris Traversal (O(1) Auxiliary Space)
Uses threaded binary tree concepts to achieve in-order traversal without recursion stacks or heap allocations.`,
    fileUrl: '/mock-assets/dsa-trees-complete.pdf',
    fileSize: '6.2 MB',
    downloadAvailable: true,
    views: 3820,
    downloads: 980,
    status: 'published',
  },
  {
    id: 'note_3',
    title: 'Mastering SQL: Indexing, B-Trees, Joins & ACID Transactions',
    subject: 'SQL',
    category: 'Databases',
    tags: ['SQL', 'PostgreSQL', 'Indexing', 'Query Optimization'],
    author: 'Tech Geek Adarsh',
    authorRole: 'Platform Founder',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastUpdated: 'Oct 12, 2025',
    readTime: '18 min read',
    pages: 24,
    excerpt: 'Understand query execution plans, clustered vs non-clustered B+ tree indexes, write-ahead logging (WAL), isolation levels, and solving $N+1$ query bottlenecks.',
    fullMarkdown: `# Advanced SQL & Database Engine Internals

## 1. Indexing Structures: Why B+ Trees?
Relational databases utilize B+ Trees instead of Binary Search Trees for disk storage because:
- **High fanout**: Minimizes disk I/O operations.
- **Leaf node links**: Sequential scanning and range queries ($BETWEEN \\dots AND$) only traverse leaf node pointers without tree backtracking.

\`\`\`sql
-- Composite Index Ordering Matters: (department_id, salary)
CREATE INDEX idx_emp_dept_salary ON employees(department_id, salary DESC);

-- This query utilizes the composite index fully:
SELECT id, name, salary 
FROM employees 
WHERE department_id = 4 
ORDER BY salary DESC 
LIMIT 10;
\`\`\`

## 2. Transaction Isolation Levels
1. **Read Uncommitted**: Susceptible to Dirty Reads.
2. **Read Committed**: Prevents Dirty Reads; susceptible to Non-Repeatable Reads.
3. **Repeatable Read**: Prevents Non-Repeatable Reads via Snapshot Isolation.
4. **Serializable**: Strict two-phase locking (2PL) or Serializable Snapshot Isolation (SSI).`,
    fileUrl: '/mock-assets/sql-architecture-guide.pdf',
    fileSize: '3.7 MB',
    downloadAvailable: true,
    views: 5210,
    downloads: 1670,
    status: 'published',
  },
  {
    id: 'note_4',
    title: 'Dynamic Programming: 50 Core Interview Patterns Explained',
    subject: 'Algorithms',
    category: 'Interview Preparation',
    tags: ['DP', 'Knapsack', 'LCS', 'Memoization'],
    author: 'Rohan Sharma',
    authorRole: 'Assessment Coordinator',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    lastUpdated: 'Oct 05, 2025',
    readTime: '25 min read',
    pages: 42,
    excerpt: 'Framework to identify optimal substructure and overlapping subproblems across 0/1 Knapsack, Unbounded Knapsack, Longest Common Subsequence, and Matrix Chain Multiplication.',
    fullMarkdown: `# The Universal 5-Step Dynamic Programming Framework

1. **State Definition**: Precisely define what $DP[i][j]$ represents.
2. **Base Cases**: Identify the boundary states that are known without calculation.
3. **Recurrence Relation**: Formulate how the current state transitions from prior subproblems.
4. **Computation Order**: Ensure dependencies are computed before evaluating dependent states.
5. **Space Optimization**: Reduce state matrices from $O(N \\times W)$ to $O(W)$ when only the previous row is needed.`,
    fileUrl: '', // Intentionally empty to test download unavailable state
    fileSize: '0 KB',
    downloadAvailable: false,
    views: 2950,
    downloads: 0,
    status: 'published',
  },
  {
    id: 'note_5',
    title: 'Cloud Infrastructure: Docker, Kubernetes & CI/CD Pipelines',
    subject: 'Cloud Computing',
    category: 'DevOps & Cloud',
    tags: ['Docker', 'Kubernetes', 'CI/CD', 'Microservices'],
    author: 'Tech Geek Adarsh',
    authorRole: 'Lead Instructor',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastUpdated: 'Oct 15, 2025',
    readTime: '22 min read',
    pages: 30,
    excerpt: 'Containerization fundamentals, multi-stage Docker builds, Kubernetes Pod/Deployment/Service architecture, ingress controllers, and automated GitHub Actions workflows.',
    fullMarkdown: `# Cloud Computing & Container Orchestration

## Multi-Stage Dockerfile Optimization
Multi-stage builds eliminate compiler and build tool bloat from production container images, reducing image sizes by up to 90%.

\`\`\`dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime Minimal Container
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
\`\`\``,
    fileUrl: '/mock-assets/cloud-k8s-guide.pdf',
    fileSize: '5.1 MB',
    downloadAvailable: true,
    views: 4100,
    downloads: 1190,
    status: 'published',
  },
];

export const INITIAL_TESTS: TestSeriesItem[] = [
  {
    id: 'test_py_201',
    title: 'Python Core & Advanced Concepts Mock Exam',
    description: 'Comprehensive 20-question timed assessment evaluating Python memory models, generator pipelines, closures, dunder protocols, and OOP abstractions.',
    subject: 'Python',
    module: 'Module 1 & 2 Comprehensive',
    questionCount: 10,
    durationMinutes: 15,
    difficulty: 'Medium',
    type: 'Mock Exam',
    status: 'available',
    passPercentage: 70,
    attemptCount: 1420,
    lastScore: 80,
    bestScore: 90,
    lastAttemptDate: 'Oct 22, 2025',
    tags: ['Python', 'OOP', 'Memory', 'Closures'],
  },
  {
    id: 'test_dsa_202',
    title: 'Data Structures: Trees, Graphs & DP Challenge',
    description: 'Rigorous algorithmic assessment focusing on time complexity proofs, graph traversals (BFS/DFS/Dijkstra), and binary search tree properties.',
    subject: 'Data Structures',
    module: 'Non-Linear Structures & Algorithms',
    questionCount: 10,
    durationMinutes: 20,
    difficulty: 'Hard',
    type: 'Mock Exam',
    status: 'available',
    passPercentage: 65,
    attemptCount: 890,
    tags: ['DSA', 'Trees', 'Graphs', 'DP'],
  },
  {
    id: 'test_sql_203',
    title: 'SQL & Relational Architecture Technical Assessment',
    description: 'Test your mastery of complex JOIN queries, subqueries, indexing tradeoffs, transaction isolations, and query optimization.',
    subject: 'SQL',
    module: 'Databases & Query Architecture',
    questionCount: 8,
    durationMinutes: 12,
    difficulty: 'Easy',
    type: 'Practice Quiz',
    status: 'available',
    passPercentage: 75,
    attemptCount: 2150,
    tags: ['SQL', 'Database', 'Joins', 'Indexes'],
  },
  {
    id: 'test_fs_204',
    title: 'Full Stack Web Architecture & React 19 Exam',
    description: 'Covers React rendering cycles, server components, REST API standards, CORS, JWT security tokens, and web performance optimization.',
    subject: 'Web Development',
    module: 'Client & Server Engineering',
    questionCount: 12,
    durationMinutes: 18,
    difficulty: 'Medium',
    type: 'Module Test',
    status: 'available',
    passPercentage: 70,
    attemptCount: 1100,
    tags: ['React', 'Web Dev', 'HTTP', 'APIs'],
  },
];

export const MOCK_QUESTIONS_MAP: Record<string, AssessmentQuestion[]> = {
  test_py_201: [
    {
      id: 'q_py_1',
      testId: 'test_py_201',
      questionNumber: 1,
      text: 'What will be the output of the following Python code snippet evaluating default parameter bindings?',
      codeSnippet: `def append_item(val, items=[]):
    items.append(val)
    return items

list1 = append_item(10)
list2 = append_item(20, [])
list3 = append_item(30)

print(list1, list2, list3)`,
      codeLanguage: 'python',
      options: [
        { id: 'opt_1', text: '[10] [20] [30]' },
        { id: 'opt_2', text: '[10, 30] [20] [10, 30]' },
        { id: 'opt_3', text: '[10] [20] [10, 30]' },
        { id: 'opt_4', text: 'TypeError: mutable default argument not permitted' },
      ],
      correctAnswerId: 'opt_2',
      explanation: 'In Python, default parameter expressions are evaluated once when the function is defined, not when called. The default list `items` persists across calls `append_item(10)` and `append_item(30)`. In contrast, `append_item(20, [])` passes an explicit fresh list.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_2',
      testId: 'test_py_201',
      questionNumber: 2,
      text: 'Which built-in module and function in CPython is responsible for inspecting the actual bytecode instructions generated by the compiler?',
      codeSnippet: `import dis

def calculate(x, y):
    return x * 2 + y

dis.dis(calculate)`,
      codeLanguage: 'python',
      options: [
        { id: 'opt_1', text: 'The inspect module with inspect.getbytecode()' },
        { id: 'opt_2', text: 'The dis module with dis.dis()' },
        { id: 'opt_3', text: 'The sys module with sys.getinstructions()' },
        { id: 'opt_4', text: 'The ctypes module with ctypes.disassemble()' },
      ],
      correctAnswerId: 'opt_2',
      explanation: 'The `dis` module in Python is the standard bytecode disassembler. `dis.dis()` parses a function, generator, or code object and prints the human-readable opcode sequence.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_3',
      testId: 'test_py_201',
      questionNumber: 3,
      text: 'What is the time complexity of checking membership `x in collection` for a standard Python set containing N elements in the average and worst cases respectively?',
      options: [
        { id: 'opt_1', text: 'Average O(1), Worst Case O(N)' },
        { id: 'opt_2', text: 'Average O(log N), Worst Case O(N)' },
        { id: 'opt_3', text: 'Average O(1), Worst Case O(1)' },
        { id: 'opt_4', text: 'Average O(N), Worst Case O(N)' },
      ],
      correctAnswerId: 'opt_1',
      explanation: 'Python sets are implemented using hash tables with open addressing. Hash lookups take O(1) on average. In the pathological worst case where all elements hash to conflicting bucket indices, it degrades to O(N).',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_4',
      testId: 'test_py_201',
      questionNumber: 4,
      text: 'Consider the following generator expression and `next()` iteration. What is printed?',
      codeSnippet: `def number_generator():
    yield 1
    yield 2
    return 3

gen = number_generator()
print(next(gen), next(gen))
try:
    next(gen)
except StopIteration as e:
    print(e.value)`,
      codeLanguage: 'python',
      options: [
        { id: 'opt_1', text: '1 2 followed by 3' },
        { id: 'opt_2', text: '1 2 followed by None' },
        { id: 'opt_3', text: '1 2 followed by StopIteration exception crash' },
        { id: 'opt_4', text: '1 2 3' },
      ],
      correctAnswerId: 'opt_1',
      explanation: 'When a Python generator executes a `return value` statement, it terminates the generator and attaches the return value to the `value` attribute of the raised `StopIteration` exception.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_5',
      testId: 'test_py_201',
      questionNumber: 5,
      text: 'What is the effect of declaring `__slots__ = (\'x\', \'y\')` in a Python class definition?',
      options: [
        { id: 'opt_1', text: 'It enforces strict type-checking at runtime for attributes x and y.' },
        { id: 'opt_2', text: 'It prevents the creation of the dynamic __dict__ per instance, drastically reducing memory footprint.' },
        { id: 'opt_3', text: 'It makes instances immutable like namedtuples.' },
        { id: 'opt_4', text: 'It automatically generates getter and setter properties for x and y.' },
      ],
      correctAnswerId: 'opt_2',
      explanation: 'By default, Python objects store their instance attributes in a dynamic dictionary `__dict__`. Defining `__slots__` tells CPython to allocate a fixed-size array of descriptor pointers instead of an entire hash table, significantly saving memory.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_6',
      testId: 'test_py_201',
      questionNumber: 6,
      text: 'In Python 3.12+, which decorator preserves the wrapped function name, docstring, and signature when constructing custom decorators?',
      codeSnippet: `from functools import wraps

def audit_log(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper`,
      codeLanguage: 'python',
      options: [
        { id: 'opt_1', text: '@functools.wraps' },
        { id: 'opt_2', text: '@functools.preserve' },
        { id: 'opt_3', text: '@typing.signature' },
        { id: 'opt_4', text: '@sys.decorator' },
      ],
      correctAnswerId: 'opt_1',
      explanation: '`@functools.wraps` is the standard library decorator that copies metadata like `__name__`, `__doc__`, and `__module__` from the decorated callable to the inner wrapper.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_7',
      testId: 'test_py_201',
      questionNumber: 7,
      text: 'Which dunder method must an object implement to be usable within the `with` context manager statement?',
      options: [
        { id: 'opt_1', text: '__start__ and __finish__' },
        { id: 'opt_2', text: '__open__ and __close__' },
        { id: 'opt_3', text: '__enter__ and __exit__' },
        { id: 'opt_4', text: '__init__ and __del__' },
      ],
      correctAnswerId: 'opt_3',
      explanation: 'The Python context management protocol requires `__enter__(self)` and `__exit__(self, exc_type, exc_val, exc_tb)`.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_8',
      testId: 'test_py_201',
      questionNumber: 8,
      text: 'What occurs when using the `is` keyword versus the `==` operator in Python?',
      codeSnippet: `a = [1, 2, 3]
b = [1, 2, 3]
c = a

print(a == b, a is b, a is c)`,
      codeLanguage: 'python',
      options: [
        { id: 'opt_1', text: 'True False True' },
        { id: 'opt_2', text: 'True True True' },
        { id: 'opt_3', text: 'False False True' },
        { id: 'opt_4', text: 'True False False' },
      ],
      correctAnswerId: 'opt_1',
      explanation: '`==` compares value equivalence (calls `__eq__`), while `is` compares memory identity (checks if `id(a) == id(b)`). Here `a` and `b` hold equivalent contents but distinct heap objects, whereas `c` references `a`.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_9',
      testId: 'test_py_201',
      questionNumber: 9,
      text: 'What algorithm does Python utilize to determine Method Resolution Order (MRO) in multi-inheritance hierarchies?',
      options: [
        { id: 'opt_1', text: 'Dijkstra shortest path algorithm' },
        { id: 'opt_2', text: 'C3 Supercomputing Linearization algorithm' },
        { id: 'opt_3', text: 'Depth-First Search with backtracking' },
        { id: 'opt_4', text: 'Breadth-First Left-to-Right scan' },
      ],
      correctAnswerId: 'opt_2',
      explanation: 'Python uses the C3 Linearization algorithm to enforce monotonicity and maintain the local precedence order defined in class declarations.',
      marks: 4,
      negativeMarks: 1,
    },
    {
      id: 'q_py_10',
      testId: 'test_py_201',
      questionNumber: 10,
      text: 'How can you safely create a deep copy of a nested dictionary or object graph in Python without referencing shared internal containers?',
      options: [
        { id: 'opt_1', text: 'dict.copy()' },
        { id: 'opt_2', text: 'copy.deepcopy()' },
        { id: 'opt_3', text: 'dict(my_dict)' },
        { id: 'opt_4', text: 'json.loads(json.dumps(obj)) only' },
      ],
      correctAnswerId: 'opt_2',
      explanation: '`copy.deepcopy(x)` recursively copies all compound objects and internal references, preventing mutable child structures from being inadvertently shared.',
      marks: 4,
      negativeMarks: 1,
    },
  ],
};

export const INITIAL_CODING_PROBLEMS: CodingProblem[] = [
  {
    id: 'prob_1',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    tags: ['Array', 'Hash Table'],
    acceptanceRate: '54.2%',
    source: 'leetcode',
    externalUrl: 'https://leetcode.com/problems/two-sum/',
    status: 'solved',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the *same* element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    starterCode: {
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Hash map to store complement and index
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      cpp: `#include <vector>
#include <unordered_map>

class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        std::unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int complement = target - nums[i];
            if (seen.find(complement) != seen.end()) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
      java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`,
    },
  },
  {
    id: 'prob_2',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'Easy',
    category: 'Stack',
    tags: ['String', 'Stack'],
    acceptanceRate: '41.8%',
    source: 'leetcode',
    externalUrl: 'https://leetcode.com/problems/valid-parentheses/',
    status: 'solved',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true',
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
      },
      {
        input: 's = "(]"',
        output: 'false',
      },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'.',
    ],
    starterCode: {
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        mapping = {')': '(', '}': '{', ']': '['}
        for char in s:
            if char in mapping:
                top = stack.pop() if stack else '#'
                if mapping[char] != top:
                    return False
            else:
                stack.append(char)
        return not stack`,
      javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}`,
      cpp: `#include <string>
#include <stack>
#include <unordered_map>

class Solution {
public:
    bool isValid(std::string s) {
        std::stack<char> st;
        std::unordered_map<char, char> map = {{')', '('}, {'}', '{'}, {']', '['}};
        for (char c : s) {
            if (map.count(c)) {
                if (st.empty() || st.top() != map[c]) return false;
                st.pop();
            } else {
                st.push(c);
            }
        }
        return st.empty();
    }
};`,
      java: `import java.util.Stack;

class Solution {
    public boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}`,
    },
  },
  {
    id: 'prob_3',
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    difficulty: 'Medium',
    category: 'Sliding Window',
    tags: ['Hash Table', 'String', 'Sliding Window'],
    acceptanceRate: '35.1%',
    source: 'native',
    status: 'attempted',
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

A **substring** is a contiguous non-empty sequence of characters within a string.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.',
      },
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
    ],
    starterCode: {
      python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        char_index = {}
        max_len = 0
        left = 0
        for right, char in enumerate(s):
            if char in char_index and char_index[char] >= left:
                left = char_index[char] + 1
            char_index[char] = right
            max_len = max(max_len, right - left + 1)
        return max_len`,
      javascript: `function lengthOfLongestSubstring(s) {
  const map = new Map();
  let maxLen = 0;
  let left = 0;
  for (let right = 0; right < s.length; right++) {
    if (map.has(s[right]) && map.get(s[right]) >= left) {
      left = map.get(s[right]) + 1;
    }
    map.set(s[right], right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}`,
      cpp: `#include <string>
#include <unordered_map>
#include <algorithm>

class Solution {
public:
    int lengthOfLongestSubstring(std::string s) {
        std::unordered_map<char, int> map;
        int maxLen = 0, left = 0;
        for (int right = 0; right < s.length(); ++right) {
            if (map.find(s[right]) != map.end() && map[s[right]] >= left) {
                left = map[s[right]] + 1;
            }
            map[s[right]] = right;
            maxLen = std::max(maxLen, right - left + 1);
        }
        return maxLen;
    }
};`,
      java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int maxLen = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (map.containsKey(c) && map.get(c) >= left) {
                left = map.get(c) + 1;
            }
            map.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }
}`,
    },
  },
  {
    id: 'prob_4',
    title: 'Coin Change Problem (Min Coins)',
    slug: 'coin-change',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    tags: ['Dynamic Programming', 'Breadth-First Search'],
    acceptanceRate: '43.9%',
    source: 'gfg',
    externalUrl: 'https://www.geeksforgeeks.org/coin-change-dp-7/',
    status: 'not_started',
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the *fewest number of coins* that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      {
        input: 'coins = [1, 2, 5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1 (3 coins)',
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1',
      },
    ],
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4',
    ],
    starterCode: {
      python: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0
        for coin in coins:
            for x in range(coin, amount + 1):
                dp[x] = min(dp[x], dp[x - coin] + 1)
        return dp[amount] if dp[amount] != float('inf') else -1`,
      javascript: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (const coin of coins) {
    for (let x = coin; x <= amount; x++) {
      dp[x] = Math.min(dp[x], dp[x - coin] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
      cpp: `#include <vector>
#include <algorithm>

class Solution {
public:
    int coinChange(std::vector<int>& coins, int amount) {
        std::vector<int> dp(amount + 1, amount + 1);
        dp[0] = 0;
        for (int coin : coins) {
            for (int x = coin; x <= amount; ++x) {
                dp[x] = std::min(dp[x], dp[x - coin] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
};`,
      java: `import java.util.Arrays;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int max = amount + 1;
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, max);
        dp[0] = 0;
        for (int coin : coins) {
            for (int x = coin; x <= amount; x++) {
                dp[x] = Math.min(dp[x], dp[x - coin] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
}`,
    },
  },
  {
    id: 'prob_5',
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'Hard',
    category: 'Two Pointers',
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    acceptanceRate: '61.4%',
    source: 'leetcode',
    externalUrl: 'https://leetcode.com/problems/trapping-rain-water/',
    status: 'not_started',
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'The above elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.',
      },
    ],
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5',
    ],
    starterCode: {
      python: `class Solution:
    def trap(self, height: list[int]) -> int:
        if not height: return 0
        left, right = 0, len(height) - 1
        left_max, right_max = height[left], height[right]
        water = 0
        while left < right:
            if left_max < right_max:
                left += 1
                left_max = max(left_max, height[left])
                water += left_max - height[left]
            else:
                right -= 1
                right_max = max(right_max, height[right])
                water += right_max - height[right]
        return water`,
      javascript: `function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = height[left], rightMax = height[right];
  let water = 0;
  while (left < right) {
    if (leftMax < rightMax) {
      left++;
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];
    } else {
      right--;
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];
    }
  }
  return water;
}`,
      cpp: `#include <vector>
#include <algorithm>

class Solution {
public:
    int trap(std::vector<int>& height) {
        int left = 0, right = height.size() - 1;
        int left_max = height[left], right_max = height[right];
        int water = 0;
        while (left < right) {
            if (left_max < right_max) {
                left++;
                left_max = std::max(left_max, height[left]);
                water += left_max - height[left];
            } else {
                right--;
                right_max = std::max(right_max, height[right]);
                water += right_max - height[right];
            }
        }
        return water;
    }
};`,
      java: `class Solution {
    public int trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = height[left], rightMax = height[right];
        int water = 0;
        while (left < right) {
            if (leftMax < rightMax) {
                left++;
                leftMax = Math.max(leftMax, height[left]);
                water += leftMax - height[left];
            } else {
                right--;
                rightMax = Math.max(rightMax, height[right]);
                water += rightMax - height[right];
            }
        }
        return water;
    }
}`,
    },
  },
];

export const INITIAL_COMMUNITY_THREADS: DiscussionThread[] = [
  {
    id: 'th_1',
    title: 'How do you intuitively identify overlapping subproblems in Dynamic Programming?',
    content: `I have been practicing on LeetCode for 3 months. While I can solve Easy two-pointer and sliding window questions comfortably, whenever I see Medium DP problems like Coin Change or Partition Equal Subset Sum, I freeze.

What mental model or drawing technique do you use during coding interviews to identify states and write down the memoization table without getting overwhelmed?`,
    author: {
      id: 'usr_student_1',
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      role: 'Student',
      badge: 'Active Learner',
    },
    category: 'DSA & Algorithms',
    tags: ['Dynamic Programming', 'Interview Prep', 'Recursion'],
    createdAt: '2 hours ago',
    upvotes: 24,
    userUpvoted: true,
    repliesCount: 3,
    isSolved: true,
    views: 340,
    replies: [
      {
        id: 'rep_1',
        threadId: 'th_1',
        author: {
          id: 'usr_admin_1',
          name: 'Tech Geek Adarsh',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'Instructor',
          badge: 'Founder',
        },
        content: `Great question Alex! Here is the 3-step rule I teach in my advanced algorithms cohort:

1. **Draw the recursion tree first**: For input n=4, draw the recursive calls. If you see \`solve(2)\` appearing on two distinct branches, you have verified overlapping subproblems.
2. **Parameters equal state dimensions**: Every parameter that changes across recursive invocations represents one dimension in your DP array or memo dictionary.
3. **Write Top-Down with @cache first**: In an interview, writing memoized DFS with Python's \`@lru_cache\` takes 5 minutes. You can convert to bottom-up tabular later if the interviewer asks for $O(1)$ space optimization.`,
        createdAt: '1 hour ago',
        upvotes: 18,
        userUpvoted: true,
        isAcceptedSolution: true,
      },
      {
        id: 'rep_2',
        threadId: 'th_1',
        author: {
          id: 'usr_subadmin_2',
          name: 'Rohan Sharma',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          role: 'Sub-Admin',
          badge: 'Test Lead',
        },
        content: `Also check out our study note "Dynamic Programming: 50 Core Patterns". The decision tree for Knapsack vs Unbounded Knapsack will click immediately once you review the diagram on page 4!`,
        createdAt: '45 mins ago',
        upvotes: 6,
        userUpvoted: false,
      },
    ],
  },
  {
    id: 'th_2',
    title: 'Why does Python list append have O(1) amortized complexity instead of worst-case O(1)?',
    content: `When a Python list grows, how does CPython allocate excess capacity? Does it double the allocated array size or use a fractional growth factor like 1.125?`,
    author: {
      id: 'usr_student_2',
      name: 'Sneha Rao',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'Student',
      badge: 'Python Enthusiast',
    },
    category: 'Python Internals',
    tags: ['Python', 'Memory', 'CPython'],
    createdAt: '5 hours ago',
    upvotes: 15,
    userUpvoted: false,
    repliesCount: 1,
    isSolved: false,
    views: 180,
    replies: [
      {
        id: 'rep_3',
        threadId: 'th_2',
        author: {
          id: 'usr_subadmin_1',
          name: 'Priyanshi Verma',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          role: 'Sub-Admin',
          badge: 'Content Author',
        },
        content: `In CPython source \`listobject.c\`, the growth formula is roughly: \`new_allocated = (newsize >> 3) + (newsize < 9 ? 3 : 6) + newsize\`. This yields an approximate growth factor of ~1.125, which strikes a balance between keeping memory fragmentation minimal and providing $O(1)$ amortized append.`,
        createdAt: '3 hours ago',
        upvotes: 9,
        userUpvoted: false,
      },
    ],
  },
];

export const INITIAL_UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: 'evt_1',
    title: 'Tech Geek Adarsh Winter CodeFest 2026',
    category: 'Coding Contest',
    date: 'Nov 15, 2026',
    time: '6:00 PM - 9:00 PM IST',
    duration: '3 Hours',
    prizes: '₹50,000 Cash Pool + Tech Goodies & Internship Referrals',
    participantsCount: 420,
    registered: true,
    description: 'Flagship bi-annual competitive programming championship featuring 6 algorithmic problems ranging from string automata to graph network flows.',
    tags: ['Competitive Programming', 'Prizes', 'Leaderboard'],
  },
  {
    id: 'evt_2',
    title: 'National Full-Stack Hackathon: AI-Augmented Web',
    category: 'Hackathon',
    date: 'Dec 05, 2026',
    time: '48 Hours Continuous',
    duration: '48 Hours',
    prizes: '₹1,50,000 Grand Prize + Cloud Credits',
    participantsCount: 680,
    registered: false,
    description: 'Build real-world production web platforms integrating modern AI APIs, vector search, and edge deployments with React and TypeScript.',
    tags: ['Hackathon', 'React', 'AI', 'Teams of 2-4'],
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud_101',
    timestamp: '2026-10-25 14:15:32',
    actor: {
      id: 'usr_admin_1',
      name: 'Adarsh (Tech Geek Adarsh)',
      email: 'adarsh@yogneetedu.in',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
    },
    action: 'permissions.assign',
    resourceType: 'SubAdmin',
    resourceId: 'usr_subadmin_1 (Priyanshi Verma)',
    details: 'Assigned permission notes.publish to sub-admin.',
    outcome: 'SUCCESS',
    ipAddress: '192.168.1.104',
    changes: {
      before: { permissions: ['videos.view', 'videos.create', 'videos.edit', 'notes.view', 'notes.create', 'notes.edit'] },
      after: { permissions: ['videos.view', 'videos.create', 'videos.edit', 'notes.view', 'notes.create', 'notes.edit', 'notes.publish'] },
    },
  },
  {
    id: 'aud_102',
    timestamp: '2026-10-25 13:40:10',
    actor: {
      id: 'usr_subadmin_1',
      name: 'Priyanshi Verma',
      email: 'priyanshi.v@yogneetedu.in',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      role: 'subadmin',
    },
    action: 'notes.publish',
    resourceType: 'StudyNote',
    resourceId: 'note_2 (DSA Trees Complete)',
    details: 'Published study note to public directory.',
    outcome: 'SUCCESS',
    ipAddress: '192.168.1.112',
  },
  {
    id: 'aud_103',
    timestamp: '2026-10-25 11:22:45',
    actor: {
      id: 'usr_admin_1',
      name: 'Adarsh (Tech Geek Adarsh)',
      email: 'adarsh@yogneetedu.in',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'admin',
    },
    action: 'subadmins.suspend',
    resourceType: 'SubAdmin',
    resourceId: 'usr_subadmin_4 (Vikram Singh)',
    details: 'Account suspended pending annual audit protocol.',
    outcome: 'SUCCESS',
    ipAddress: '192.168.1.104',
  },
  {
    id: 'aud_104',
    timestamp: '2026-10-25 10:05:19',
    actor: {
      id: 'usr_subadmin_3',
      name: 'Ananya Patel',
      email: 'ananya.p@yogneetedu.in',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      role: 'subadmin',
    },
    action: 'subadmins.manage',
    resourceType: 'SubAdmin',
    resourceId: 'usr_subadmin_2',
    details: 'Attempted to edit subadmin account without authorization.',
    outcome: 'DENIED',
    ipAddress: '192.168.1.119',
  },
  {
    id: 'aud_105',
    timestamp: '2026-10-25 09:30:00',
    actor: {
      id: 'usr_subadmin_2',
      name: 'Rohan Sharma',
      email: 'rohan.s@yogneetedu.in',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: 'subadmin',
    },
    action: 'tests.create',
    resourceType: 'TestSeriesItem',
    resourceId: 'test_py_201',
    details: 'Created Python Core & Advanced Concepts Mock Exam with 10 questions.',
    outcome: 'SUCCESS',
    ipAddress: '192.168.1.115',
  },
];
