/**
 * Database schema type definitions for Supabase client.
 * Generated and validated to match migrations:
 * - 20261026000001_initial_schema.sql
 * - 20261026000002_rls_policies.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string;
          role: 'student' | 'subadmin' | 'admin';
          status: 'active' | 'suspended';
          department: string | null;
          bio: string | null;
          enrolled_courses: string[];
          solved_problems_count: number;
          tests_completed_count: number;
          created_at: string;
          last_active: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string;
          role?: 'student' | 'subadmin' | 'admin';
          status?: 'active' | 'suspended';
          department?: string | null;
          bio?: string | null;
          enrolled_courses?: string[];
          solved_problems_count?: number;
          tests_completed_count?: number;
          created_at?: string;
          last_active?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string;
          role?: 'student' | 'subadmin' | 'admin';
          status?: 'active' | 'suspended';
          department?: string | null;
          bio?: string | null;
          enrolled_courses?: string[];
          solved_problems_count?: number;
          tests_completed_count?: number;
          created_at?: string;
          last_active?: string;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string;
          permission_key: string;
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          permission_key: string;
          granted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          permission_key?: string;
          granted_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          thumbnail_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
        };
      };
      video_lessons: {
        Row: {
          id: string;
          course_id: string | null;
          course_title: string;
          title: string;
          youtube_id: string;
          duration: string;
          duration_seconds: number;
          lesson_order: number;
          module_name: string;
          description: string | null;
          overview: string[];
          published_at: string;
          views: number;
          resources: Json;
        };
        Insert: {
          id: string;
          course_id?: string | null;
          course_title: string;
          title: string;
          youtube_id: string;
          duration: string;
          duration_seconds?: number;
          lesson_order?: number;
          module_name: string;
          description?: string | null;
          overview?: string[];
          published_at?: string;
          views?: number;
          resources?: Json;
        };
        Update: {
          id?: string;
          course_id?: string | null;
          course_title?: string;
          title?: string;
          youtube_id?: string;
          duration?: string;
          duration_seconds?: number;
          lesson_order?: number;
          module_name?: string;
          description?: string | null;
          overview?: string[];
          published_at?: string;
          views?: number;
          resources?: Json;
        };
      };
      study_notes: {
        Row: {
          id: string;
          title: string;
          subject: string;
          category: string;
          tags: string[];
          author_id: string | null;
          author_name: string;
          author_role: string;
          author_avatar: string;
          read_time: string;
          pages: number;
          excerpt: string;
          full_markdown: string;
          file_url: string | null;
          file_size: string | null;
          download_available: boolean;
          views: number;
          downloads: number;
          status: 'draft' | 'in_review' | 'published' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          subject: string;
          category: string;
          tags?: string[];
          author_id?: string | null;
          author_name: string;
          author_role?: string;
          author_avatar?: string;
          read_time?: string;
          pages?: number;
          excerpt: string;
          full_markdown: string;
          file_url?: string | null;
          file_size?: string | null;
          download_available?: boolean;
          views?: number;
          downloads?: number;
          status?: 'draft' | 'in_review' | 'published' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subject?: string;
          category?: string;
          tags?: string[];
          author_id?: string | null;
          author_name?: string;
          author_role?: string;
          author_avatar?: string;
          read_time?: string;
          pages?: number;
          excerpt?: string;
          full_markdown?: string;
          file_url?: string | null;
          file_size?: string | null;
          download_available?: boolean;
          views?: number;
          downloads?: number;
          status?: 'draft' | 'in_review' | 'published' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          title: string;
          description: string;
          subject: string;
          module: string;
          question_count: number;
          duration_minutes: number;
          difficulty: 'Easy' | 'Medium' | 'Hard';
          type: 'Practice Quiz' | 'Mock Exam' | 'Module Test';
          status: 'available' | 'upcoming' | 'completed';
          pass_percentage: number;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          subject: string;
          module: string;
          question_count?: number;
          duration_minutes?: number;
          difficulty: 'Easy' | 'Medium' | 'Hard';
          type: 'Practice Quiz' | 'Mock Exam' | 'Module Test';
          status?: 'available' | 'upcoming' | 'completed';
          pass_percentage?: number;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          subject?: string;
          module?: string;
          question_count?: number;
          duration_minutes?: number;
          difficulty?: 'Easy' | 'Medium' | 'Hard';
          type?: 'Practice Quiz' | 'Mock Exam' | 'Module Test';
          status?: 'available' | 'upcoming' | 'completed';
          pass_percentage?: number;
          tags?: string[];
          created_at?: string;
        };
      };
      assessment_questions: {
        Row: {
          id: string;
          test_id: string;
          question_number: number;
          text: string;
          code_snippet: string | null;
          code_language: string | null;
          options: Json;
          correct_answer_id: string;
          explanation: string;
          marks: number;
          negative_marks: number;
        };
        Insert: {
          id: string;
          test_id: string;
          question_number: number;
          text: string;
          code_snippet?: string | null;
          code_language?: string | null;
          options?: Json;
          correct_answer_id: string;
          explanation: string;
          marks?: number;
          negative_marks?: number;
        };
        Update: {
          id?: string;
          test_id?: string;
          question_number?: number;
          text?: string;
          code_snippet?: string | null;
          code_language?: string | null;
          options?: Json;
          correct_answer_id?: string;
          explanation?: string;
          marks?: number;
          negative_marks?: number;
        };
      };
      assessment_attempts: {
        Row: {
          attempt_id: string;
          test_id: string;
          user_id: string;
          submitted_at: string;
          time_spent_seconds: number;
          total_questions: number;
          answered_count: number;
          unanswered_count: number;
          marked_count: number;
          correct_count: number;
          incorrect_count: number;
          score_obtained: number;
          max_score: number;
          percentage: number;
          passed: boolean;
          user_answers: Json;
          question_statuses: Json;
          is_verified: boolean;
        };
        Insert: {
          attempt_id?: string;
          test_id: string;
          user_id: string;
          submitted_at?: string;
          time_spent_seconds?: number;
          total_questions: number;
          answered_count: number;
          unanswered_count: number;
          marked_count: number;
          correct_count: number;
          incorrect_count: number;
          score_obtained: number;
          max_score: number;
          percentage: number;
          passed: boolean;
          user_answers?: Json;
          question_statuses?: Json;
          is_verified?: boolean;
        };
        Update: {
          attempt_id?: string;
          test_id?: string;
          user_id?: string;
          submitted_at?: string;
          time_spent_seconds?: number;
          total_questions?: number;
          answered_count?: number;
          unanswered_count?: number;
          marked_count?: number;
          correct_count?: number;
          incorrect_count?: number;
          score_obtained?: number;
          max_score?: number;
          percentage?: number;
          passed?: boolean;
          user_answers?: Json;
          question_statuses?: Json;
          is_verified?: boolean;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          timestamp: string;
          actor_id: string | null;
          actor_name: string;
          actor_email: string;
          actor_role: string;
          action: string;
          resource_type: string;
          resource_id: string;
          details: string;
          outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
          ip_address: string | null;
          changes: Json | null;
        };
        Insert: {
          id?: string;
          timestamp?: string;
          actor_id?: string | null;
          actor_name: string;
          actor_email: string;
          actor_role: string;
          action: string;
          resource_type: string;
          resource_id: string;
          details: string;
          outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
          ip_address?: string | null;
          changes?: Json | null;
        };
        Update: {
          id?: string;
          timestamp?: string;
          actor_id?: string | null;
          actor_name?: string;
          actor_email?: string;
          actor_role?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          details?: string;
          outcome?: 'SUCCESS' | 'DENIED' | 'FAILED';
          ip_address?: string | null;
          changes?: Json | null;
        };
      };
    };
    Views: {
      student_assessment_questions: {
        Row: {
          id: string;
          test_id: string;
          question_number: number;
          text: string;
          code_snippet: string | null;
          code_language: string | null;
          options: Json;
          marks: number;
          negative_marks: number;
        };
      };
    };
    Functions: {
      get_assessment_questions_for_taking: {
        Args: {
          p_test_id: string;
        };
        Returns: {
          id: string;
          test_id: string;
          question_number: number;
          text: string;
          code_snippet: string | null;
          code_language: string | null;
          options: Json;
          marks: number;
          negative_marks: number;
        }[];
      };
      submit_assessment_attempt: {
        Args: {
          p_test_id: string;
          p_time_spent_seconds: number;
          p_user_answers: Json;
          p_question_statuses?: Json;
        };
        Returns: {
          attempt_id: string;
          test_id: string;
          score_obtained: number;
          max_score: number;
          percentage: number;
          passed: boolean;
          correct_count: number;
          incorrect_count: number;
          answered_count: number;
          unanswered_count: number;
        };
      };
    };
  };
}
