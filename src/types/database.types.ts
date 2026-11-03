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
          access_category: 'standard' | 'pro' | 'managed' | 'scholarship';
          institution: string | null;
          program: string | null;
          enrolled_courses: string[];
          solved_problems_count: number;
          tests_completed_count: number;
          enrollment_number: string | null;
          admission_year: number | null;
          sequential_number: number | null;
          is_premium: boolean;
          yogneet_email: string | null;
          must_change_password: boolean;
          phone: string | null;
          converted_at: string | null;
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
          access_category?: 'standard' | 'pro' | 'managed' | 'scholarship';
          institution?: string | null;
          program?: string | null;
          enrolled_courses?: string[];
          solved_problems_count?: number;
          tests_completed_count?: number;
          enrollment_number?: string | null;
          admission_year?: number | null;
          sequential_number?: number | null;
          is_premium?: boolean;
          yogneet_email?: string | null;
          must_change_password?: boolean;
          phone?: string | null;
          converted_at?: string | null;
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
          access_category?: 'standard' | 'pro' | 'managed' | 'scholarship';
          institution?: string | null;
          program?: string | null;
          enrolled_courses?: string[];
          solved_problems_count?: number;
          tests_completed_count?: number;
          enrollment_number?: string | null;
          admission_year?: number | null;
          sequential_number?: number | null;
          is_premium?: boolean;
          yogneet_email?: string | null;
          must_change_password?: boolean;
          phone?: string | null;
          converted_at?: string | null;
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
          subject_id: string | null;
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
          status: 'draft' | 'published' | 'archived';
        };
        Insert: {
          id: string;
          course_id?: string | null;
          course_title: string;
          subject_id?: string | null;
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
          status?: 'draft' | 'published' | 'archived';
        };
        Update: {
          id?: string;
          course_id?: string | null;
          course_title?: string;
          subject_id?: string | null;
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
          status?: 'draft' | 'published' | 'archived';
        };
      };
      study_notes: {
        Row: {
          id: string;
          title: string;
          subject: string;
          subject_id: string | null;
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
          subject_id?: string | null;
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
          subject_id?: string | null;
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
          subject_id: string | null;
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
          subject_id?: string | null;
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
          subject_id?: string | null;
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
      practical_assignments: {
        Row: {
          id: string;
          title: string;
          subject: string;
          subject_id: string | null;
          module: string;
          problem_statement: string;
          instructions: string;
          topics: string[];
          deliverables: string[];
          submission_requirements: string | null;
          deadline: string | null;
          total_marks: number;
          rubric: Json;
          status: 'draft' | 'published' | 'archived';
          author_id: string | null;
          author_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          subject: string;
          subject_id?: string | null;
          module?: string;
          problem_statement: string;
          instructions: string;
          topics?: string[];
          deliverables?: string[];
          submission_requirements?: string | null;
          deadline?: string | null;
          total_marks?: number;
          rubric?: Json;
          status?: 'draft' | 'published' | 'archived';
          author_id?: string | null;
          author_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subject?: string;
          subject_id?: string | null;
          module?: string;
          problem_statement?: string;
          instructions?: string;
          topics?: string[];
          deliverables?: string[];
          submission_requirements?: string | null;
          deadline?: string | null;
          total_marks?: number;
          rubric?: Json;
          status?: 'draft' | 'published' | 'archived';
          author_id?: string | null;
          author_name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      student_directory: {
        Row: {
          id: string;
          email: string;
          name: string;
          department: string | null;
          institution: string | null;
          program: string | null;
          status: 'active' | 'suspended';
          access_category: 'standard' | 'pro' | 'managed' | 'scholarship';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          department?: string | null;
          institution?: string | null;
          program?: string | null;
          status?: 'active' | 'suspended';
          access_category?: 'standard' | 'pro' | 'managed' | 'scholarship';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          department?: string | null;
          institution?: string | null;
          program?: string | null;
          status?: 'active' | 'suspended';
          access_category?: 'standard' | 'pro' | 'managed' | 'scholarship';
          created_at?: string;
          updated_at?: string;
        };
      };
      staff_invitations: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'subadmin' | 'admin';
          department: string;
          bio: string;
          permissions: string[];
          invited_by: string | null;
          status: 'pending' | 'accepted' | 'revoked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: 'subadmin' | 'admin';
          department?: string;
          bio?: string;
          permissions?: string[];
          invited_by?: string | null;
          status?: 'pending' | 'accepted' | 'revoked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'subadmin' | 'admin';
          department?: string;
          bio?: string;
          permissions?: string[];
          invited_by?: string | null;
          status?: 'pending' | 'accepted' | 'revoked';
          created_at?: string;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string;
          display_order: number;
          is_active: boolean;
          color_scheme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string;
          display_order?: number;
          is_active?: boolean;
          color_scheme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon?: string;
          display_order?: number;
          is_active?: boolean;
          color_scheme?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      micro_subjects: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          cover_image: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          description?: string | null;
          cover_image?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          cover_image?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      micro_lessons: {
        Row: {
          id: string;
          micro_subject_id: string;
          title: string;
          description: string | null;
          youtube_shorts_url: string;
          youtube_id: string;
          display_order: number;
          status: 'draft' | 'published' | 'archived';
          author_name: string | null;
          duration: string | null;
          thumbnail_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          micro_subject_id: string;
          title: string;
          description?: string | null;
          youtube_shorts_url: string;
          youtube_id: string;
          display_order?: number;
          status?: 'draft' | 'published' | 'archived';
          author_name?: string | null;
          duration?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          micro_subject_id?: string;
          title?: string;
          description?: string | null;
          youtube_shorts_url?: string;
          youtube_id?: string;
          display_order?: number;
          status?: 'draft' | 'published' | 'archived';
          author_name?: string | null;
          duration?: string | null;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      enrollment_sequences: {
        Row: {
          year: number;
          last_sequence: number;
          updated_at: string;
        };
        Insert: {
          year: number;
          last_sequence?: number;
          updated_at?: string;
        };
        Update: {
          year?: number;
          last_sequence?: number;
          updated_at?: string;
        };
      };
      student_module_access: {
        Row: {
          module_key: string;
          module_name: string;
          module_route: string;
          description: string | null;
          normal_enabled: boolean;
          premium_enabled: boolean;
          display_order: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          module_key: string;
          module_name: string;
          module_route: string;
          description?: string | null;
          normal_enabled?: boolean;
          premium_enabled?: boolean;
          display_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          module_key?: string;
          module_name?: string;
          module_route?: string;
          description?: string | null;
          normal_enabled?: boolean;
          premium_enabled?: boolean;
          display_order?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      feedback_submissions: {
        Row: {
          id: string;
          user_id: string;
          user_role: 'student' | 'subadmin' | 'admin';
          user_name: string;
          user_email: string;
          access_category: 'standard' | 'pro';
          title: string;
          description: string;
          category: 'Bug' | 'UI Issue' | 'Content Issue' | 'Account Issue' | 'Other';
          attachment_url: string | null;
          status: 'New' | 'In Progress' | 'Resolved';
          admin_reply: string | null;
          admin_replied_by: string | null;
          replied_at: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_role: 'student' | 'subadmin' | 'admin';
          user_name: string;
          user_email: string;
          access_category?: 'standard' | 'pro';
          title: string;
          description: string;
          category: 'Bug' | 'UI Issue' | 'Content Issue' | 'Account Issue' | 'Other';
          attachment_url?: string | null;
          status?: 'New' | 'In Progress' | 'Resolved';
          admin_reply?: string | null;
          admin_replied_by?: string | null;
          replied_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_role?: 'student' | 'subadmin' | 'admin';
          user_name?: string;
          user_email?: string;
          access_category?: 'standard' | 'pro';
          title?: string;
          description?: string;
          category?: 'Bug' | 'UI Issue' | 'Content Issue' | 'Account Issue' | 'Other';
          attachment_url?: string | null;
          status?: 'New' | 'In Progress' | 'Resolved';
          admin_reply?: string | null;
          admin_replied_by?: string | null;
          replied_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
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
      generate_next_enrollment_number: {
        Args: {
          p_year: number;
        };
        Returns: {
          enrollment_number: string;
          seq_num: number;
        }[];
      };
      upgrade_student_to_premium: {
        Args: {
          p_user_id: string;
          p_year?: number;
          p_phone?: string | null;
          p_department?: string | null;
        };
        Returns: Json;
      };
      admin_generate_temporary_credential: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      get_student_inspection_summary: {
        Args: {
          p_student_id: string;
        };
        Returns: Json;
      };
      has_permission: {
        Args: {
          p_user_id: string;
          p_permission_key: string;
        };
        Returns: boolean;
      };
      create_assessment_with_questions: {
        Args: {
          p_assessment: Json;
          p_questions: Json;
        };
        Returns: {
          success: boolean;
          test_id: string;
          title: string;
          question_count: number;
        };
      };
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
      check_student_module_access: {
        Args: {
          p_module_key: string;
          p_user_id?: string;
        };
        Returns: boolean;
      };
      admin_update_student_module_access: {
        Args: {
          p_module_key: string;
          p_normal_enabled: boolean;
          p_premium_enabled: boolean;
        };
        Returns: Database['public']['Tables']['student_module_access']['Row'];
      };
      submit_user_feedback: {
        Args: {
          p_title: string;
          p_description: string;
          p_category: string;
          p_attachment_url?: string | null;
        };
        Returns: string;
      };
      admin_update_feedback_status: {
        Args: {
          p_feedback_id: string;
          p_status: string;
          p_admin_reply?: string | null;
        };
        Returns: Json;
      };
    };
  };
}
