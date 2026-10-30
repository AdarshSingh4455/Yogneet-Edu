/**
 * Student Directory & Administration Service for Yogneet Edu.
 * Handles student listing, individual student provisioning,
 * batch JSON import with duplicate email prevention, and account status toggles.
 */

import { UserProfile, StudentDirectoryEntry, StudentImportRow, StudentAccessCategory } from '../types';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabaseClient';
import { ApiService, AuditService } from './api';
import { Database } from '../types/database.types';

type DirectoryRow = Database['public']['Tables']['student_directory']['Row'];
type DirectoryInsert = Database['public']['Tables']['student_directory']['Insert'];

export interface StudentValidationResult {
  isValid: boolean;
  errors: string[];
  validRows: StudentImportRow[];
  duplicateCount: number;
}

const LOCAL_DIRECTORY_KEY = 'yogneet_student_directory';

function getStoredDirectory(): StudentDirectoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_DIRECTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local student directory', e);
  }
  return [];
}

function setStoredDirectory(items: StudentDirectoryEntry[]): void {
  try {
    localStorage.setItem(LOCAL_DIRECTORY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to store local student directory', e);
  }
}

export const StudentDirectoryService = {
  /**
   * Retrieves all students: merges active profiles with pre-provisioned directory students.
   */
  async getStudents(): Promise<UserProfile[]> {
    const baseMockStudents = ApiService.getUsers().filter(u => u.role === 'student');

    if (!isSupabaseConfigured() || !supabase) {
      const stored = getStoredDirectory();
      const mappedStored: UserProfile[] = stored.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        role: 'student',
        status: s.status,
        permissions: [],
        department: s.department || s.institution || 'Enrolled Student',
        createdAt: s.createdAt,
        lastActive: 'Pre-provisioned',
        solvedProblemsCount: 0,
        testsCompletedCount: 0,
      }));

      // Merge and deduplicate by email
      const emailMap = new Map<string, UserProfile>();
      baseMockStudents.forEach(s => emailMap.set(s.email.toLowerCase(), s));
      mappedStored.forEach(s => {
        if (!emailMap.has(s.email.toLowerCase())) {
          emailMap.set(s.email.toLowerCase(), s);
        }
      });
      return Array.from(emailMap.values());
    }

    try {
      // 1. Fetch live student profiles
      const { data: profileRows, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (profErr) throw new Error(formatSupabaseError(profErr));

      // 2. Fetch pre-provisioned directory rows
      const { data: dirRows, error: dirErr } = await supabase
        .from('student_directory')
        .select('*')
        .order('created_at', { ascending: false });

      if (dirErr) throw new Error(formatSupabaseError(dirErr));

      const emailMap = new Map<string, UserProfile>();

      ((profileRows as any) || []).forEach((p: any) => {
        emailMap.set(p.email.toLowerCase(), {
          id: p.id,
          name: p.name,
          email: p.email,
          avatar: p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
          role: 'student',
          status: p.status as 'active' | 'suspended',
          permissions: [],
          department: p.department || 'Enrolled Student',
          solvedProblemsCount: p.solved_problems_count,
          testsCompletedCount: p.tests_completed_count,
          createdAt: p.created_at,
          lastActive: p.last_active,
        });
      });

      ((dirRows as any) || []).forEach((d: any) => {
        if (!emailMap.has(d.email.toLowerCase())) {
          emailMap.set(d.email.toLowerCase(), {
            id: d.id,
            name: d.name,
            email: d.email,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
            role: 'student',
            status: d.status as 'active' | 'suspended',
            permissions: [],
            department: d.department || d.institution || 'Pre-enrolled Student',
            solvedProblemsCount: 0,
            testsCompletedCount: 0,
            createdAt: d.created_at,
            lastActive: 'Invited / Pending Auth',
          });
        }
      });

      return Array.from(emailMap.values());
    } catch (err) {
      console.error('[StudentDirectoryService.getStudents] Error, falling back to local:', err);
      return baseMockStudents;
    }
  },

  /**
   * Adds a single student to the pre-provisioned directory.
   */
  async addStudent(
    actor: UserProfile,
    data: {
      name: string;
      email: string;
      department?: string;
      institution?: string;
      program?: string;
      accessCategory?: StudentAccessCategory;
    }
  ): Promise<StudentDirectoryEntry> {
    const trimmedName = data.name.trim();
    const trimmedEmail = data.email.trim().toLowerCase();

    if (!trimmedName) throw new Error('Student name is required.');
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error('A valid email address is required.');
    }

    const now = new Date().toISOString();
    const entry: StudentDirectoryEntry = {
      id: `usr_dir_${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      department: data.department?.trim() || 'Computer Science',
      institution: data.institution?.trim() || 'Engineering Institute',
      program: data.program?.trim() || 'B.Tech CS',
      status: 'active',
      accessCategory: data.accessCategory || 'standard',
      createdAt: now,
      updatedAt: now,
    };

    if (!isSupabaseConfigured() || !supabase) {
      const stored = getStoredDirectory();
      if (stored.some(s => s.email.toLowerCase() === trimmedEmail)) {
        throw new Error(`Student with email "${trimmedEmail}" already exists.`);
      }
      setStoredDirectory([entry, ...stored]);

      AuditService.log(
        actor,
        'students.view' as any,
        'StudentProfile',
        entry.email,
        `Pre-provisioned student "${entry.name}" (${entry.email}) in local directory.`,
        'SUCCESS'
      );
      return entry;
    }

    try {
      const row: DirectoryInsert = {
        name: entry.name,
        email: entry.email,
        department: entry.department,
        institution: entry.institution,
        program: entry.program,
        status: 'active',
        access_category: entry.accessCategory,
      };

      const { data: inserted, error } = await (supabase as any)
        .from('student_directory')
        .insert(row)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Student with email "${entry.email}" already exists in the directory.`);
        }
        throw new Error(formatSupabaseError(error));
      }

      AuditService.log(
        actor,
        'students.view' as any,
        'StudentProfile',
        entry.email,
        `Pre-provisioned student "${entry.name}" (${entry.email}) in Supabase student_directory.`,
        'SUCCESS'
      );

      const d = inserted as DirectoryRow;
      return {
        id: d.id,
        name: d.name,
        email: d.email,
        department: d.department || '',
        institution: d.institution || '',
        program: d.program || '',
        status: d.status as 'active' | 'suspended',
        accessCategory: d.access_category as StudentAccessCategory,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      };
    } catch (err) {
      console.error('[StudentDirectoryService.addStudent] Error:', err);
      throw err;
    }
  },

  /**
   * Validates a JSON student import payload.
   */
  validateStudentJsonImport(input: string | unknown, existingStudents: UserProfile[] = []): StudentValidationResult {
    const errors: string[] = [];
    let parsed: any;

    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch (e) {
        return { isValid: false, errors: ['JSON Syntax Error: File is not valid JSON.'], validRows: [], duplicateCount: 0 };
      }
    } else {
      parsed = input;
    }

    const rows: any[] = Array.isArray(parsed) ? parsed : parsed?.students;

    if (!Array.isArray(rows) || rows.length === 0) {
      return { isValid: false, errors: ['Input must contain an array of student objects (e.g. [ { name, email, ... } ]).'], validRows: [], duplicateCount: 0 };
    }

    const existingEmails = new Set(existingStudents.map(s => s.email.toLowerCase()));
    const batchEmails = new Set<string>();
    const validRows: StudentImportRow[] = [];
    let duplicateCount = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      if (!row || typeof row !== 'object') {
        errors.push(`Row ${rowNum}: Must be an object.`);
        return;
      }

      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';

      if (!name) {
        errors.push(`Row ${rowNum}: "name" is required.`);
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Row ${rowNum}: A valid "email" address is required.`);
      } else {
        if (batchEmails.has(email)) {
          errors.push(`Row ${rowNum}: Duplicate email "${email}" found within this import batch.`);
          duplicateCount++;
        } else if (existingEmails.has(email)) {
          errors.push(`Row ${rowNum}: Student with email "${email}" already exists on the platform.`);
          duplicateCount++;
        } else {
          batchEmails.add(email);
        }
      }

      if (name && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validRows.push({
          name,
          email,
          department: typeof row.department === 'string' ? row.department.trim() : undefined,
          institution: typeof row.institution === 'string' ? row.institution.trim() : undefined,
          program: typeof row.program === 'string' ? row.program.trim() : undefined,
          accessCategory: ['standard', 'pro', 'managed', 'scholarship'].includes(row.accessCategory) ? row.accessCategory : 'standard',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      validRows,
      duplicateCount,
    };
  },

  /**
   * Imports a validated batch of students.
   */
  async importStudents(actor: UserProfile, rows: StudentImportRow[]): Promise<{ importedCount: number }> {
    if (!rows || rows.length === 0) throw new Error('No valid student rows to import.');

    if (!isSupabaseConfigured() || !supabase) {
      const stored = getStoredDirectory();
      const newEntries: StudentDirectoryEntry[] = rows.map((r, i) => ({
        id: `usr_dir_${Date.now()}_${i}`,
        name: r.name,
        email: r.email,
        department: r.department || 'Computer Science',
        institution: r.institution || 'Engineering Institute',
        program: r.program || 'B.Tech',
        status: 'active',
        accessCategory: r.accessCategory || 'standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setStoredDirectory([...newEntries, ...stored]);

      AuditService.log(
        actor,
        'students.view' as any,
        'StudentDirectory',
        `${rows.length} students`,
        `Batch imported ${rows.length} students (Demo Mode).`,
        'SUCCESS'
      );
      return { importedCount: rows.length };
    }

    try {
      const insertRows: DirectoryInsert[] = rows.map(r => ({
        name: r.name,
        email: r.email,
        department: r.department || 'Computer Science',
        institution: r.institution || 'Engineering Institute',
        program: r.program || 'B.Tech',
        status: 'active',
        access_category: r.accessCategory || 'standard',
      }));

      const { error } = await (supabase as any).from('student_directory').insert(insertRows);
      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'students.view' as any,
        'StudentDirectory',
        `${rows.length} students`,
        `Batch imported ${rows.length} pre-provisioned students into Supabase student_directory.`,
        'SUCCESS'
      );

      return { importedCount: rows.length };
    } catch (err) {
      console.error('[StudentDirectoryService.importStudents] Error:', err);
      throw err;
    }
  },

  /**
   * Generates a sample JSON template for student batch import.
   */
  generateStudentJsonTemplate(): string {
    const template = {
      schemaVersion: 1,
      students: [
        {
          name: 'Aarav Sharma',
          email: 'aarav.sharma@campus.edu',
          department: 'Computer Science & Engineering',
          institution: 'National Institute of Technology',
          program: 'B.Tech CSE',
          accessCategory: 'managed',
        },
        {
          name: 'Diya Patel',
          email: 'diya.patel@tech.edu',
          department: 'Information Technology',
          institution: 'Indian Institute of Information Technology',
          program: 'B.Tech IT',
          accessCategory: 'standard',
        },
        {
          name: 'Rohan Verma',
          email: 'rohan.verma@univ.edu',
          department: 'Electrical & Computer Engineering',
          institution: 'Delhi Technological University',
          program: 'B.Tech ECE',
          accessCategory: 'scholarship',
        },
      ],
    };
    return JSON.stringify(template, null, 2);
  },

  /**
   * Updates a student's access category / entitlement tier.
   * Only administrators can grant or revoke tiers.
   */
  async updateStudentEntitlement(
    actor: UserProfile,
    studentId: string,
    accessCategory: StudentAccessCategory
  ): Promise<void> {
    if (actor.role !== 'admin') {
      throw new Error('Access Denied: Only platform administrators can change access tiers.');
    }

    if (!isSupabaseConfigured() || !supabase) {
      const student = ApiService.getUserById(studentId);
      if (student) {
        student.accessCategory = accessCategory;
      }
      return;
    }

    try {
      const { error } = await (supabase as any).rpc('admin_update_student_entitlement', {
        p_student_id: studentId,
        p_access_category: accessCategory,
      });

      if (error) throw new Error(formatSupabaseError(error));

      AuditService.log(
        actor,
        'students.view' as any,
        'StudentEntitlement',
        studentId,
        `Updated student ${studentId} access category to ${accessCategory}.`,
        'SUCCESS'
      );
    } catch (err) {
      console.error('[StudentDirectoryService.updateStudentEntitlement] Error:', err);
      throw err;
    }
  },
};
