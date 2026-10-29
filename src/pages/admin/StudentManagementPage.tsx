import React, { useState, useEffect } from 'react';
import { StudentDirectoryService } from '../../services/studentDirectoryService';
import { ApiService } from '../../services/api';
import { UserProfile, StudentAccessCategory, StudentImportRow } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  Lock,
  Unlock,
  GraduationCap,
  Plus,
  FileUp,
  Download,
  AlertCircle,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const StudentManagementPage: React.FC = () => {
  const { currentUser, hasPermission, isAdmin } = useAuth();
  const toast = useToast();

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToSuspend, setSelectedToSuspend] = useState<UserProfile | null>(null);

  // Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Computer Science & Engineering');
  const [newInstitution, setNewInstitution] = useState('');
  const [newProgram, setNewProgram] = useState('B.Tech');
  const [newAccessCategory, setNewAccessCategory] = useState<StudentAccessCategory>('standard');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Batch JSON Import State
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [importValidation, setImportValidation] = useState<{
    isValid: boolean;
    errors: string[];
    validRows: StudentImportRow[];
    duplicateCount: number;
  } | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  const canSuspendStudents = hasPermission('students.suspend');

  const reloadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await StudentDirectoryService.getStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadStudents();
  }, []);

  const filteredStudents = students.filter(s => {
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleToggleSuspendConfirm = () => {
    if (!selectedToSuspend) return;
    if (!canSuspendStudents) {
      toast.error('Permission Denied', 'You lack "students.suspend" authorization.');
      setSelectedToSuspend(null);
      return;
    }

    try {
      ApiService.toggleSubAdminStatus(currentUser, selectedToSuspend.id);
      toast.success(
        'Student Status Updated',
        `${selectedToSuspend.name} is now ${selectedToSuspend.status === 'active' ? 'SUSPENDED' : 'ACTIVE'}.`
      );
      setSelectedToSuspend(null);
      reloadStudents();
    } catch (err: any) {
      toast.error('Failed', err.message);
    }
  };

  // Add Single Student Handler
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Required Fields', 'Name and Email are required.');
      return;
    }

    setIsSubmittingStudent(true);
    try {
      await StudentDirectoryService.addStudent(currentUser, {
        name: newName.trim(),
        email: newEmail.trim(),
        department: newDepartment.trim(),
        institution: newInstitution.trim(),
        program: newProgram.trim(),
        accessCategory: newAccessCategory,
      });

      toast.success(
        'Student Pre-Provisioned',
        `"${newName}" (${newEmail}) has been added to the student directory.`
      );
      setIsAddStudentOpen(false);
      setNewName('');
      setNewEmail('');
      setNewInstitution('');
      await reloadStudents();
    } catch (err: any) {
      toast.error('Failed to Add Student', err.message);
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // JSON Batch Import Handlers
  const handleJsonInputChange = (text: string) => {
    setJsonText(text);
    if (!text.trim()) {
      setImportValidation(null);
      return;
    }
    const val = StudentDirectoryService.validateStudentJsonImport(text, students);
    setImportValidation(val);
  };

  const handleJsonFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      if (content) {
        handleJsonInputChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template = StudentDirectoryService.generateStudentJsonTemplate();
    const blob = new Blob([template], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yogneet-student-directory-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = async () => {
    if (!importValidation?.isValid || importValidation.validRows.length === 0) {
      toast.error('Validation Error', 'Correct all validation issues before importing.');
      return;
    }

    setIsSubmittingImport(true);
    try {
      const res = await StudentDirectoryService.importStudents(currentUser, importValidation.validRows);
      toast.success(
        'Students Imported',
        `Successfully imported ${res.importedCount} student records.`
      );
      setIsImportJsonOpen(false);
      setJsonText('');
      setImportValidation(null);
      await reloadStudents();
    } catch (err: any) {
      toast.error('Batch Import Failed', err.message);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="sm">
              Student Operations
            </Badge>
            <span className="text-xs text-slate-400">Enrolled Learners Directory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-500" />
            Enrolled Students Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Inspect learner engagement metrics, manage access privileges, pre-provision new students, and import bulk student rosters.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            size="md"
            variant="outline"
            onClick={() => {
              setJsonText('');
              setImportValidation(null);
              setIsImportJsonOpen(true);
            }}
            leftIcon={<FileUp className="w-4 h-4 text-brand-500" />}
          >
            Import JSON
          </Button>

          <Button
            size="md"
            onClick={() => setIsAddStudentOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
          >
            Add Student
          </Button>
        </div>
      </div>

      {/* Phase 4B Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Credential Provisioning Notice:</span> Pre-provisioned directory students will have automated invitation links and authentication credentials generated upon implementation of Phase 4B authentication.
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search students by name, email, or college..."
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        />
      </div>

      {/* Students List / Table */}
      {filteredStudents.length === 0 ? (
        <Card padding="lg" className="text-center py-12 border border-light-border dark:border-dark-border">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Students Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            No enrolled students match "{searchQuery}". Use the buttons above to add or import students.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Student Cards */}
          <div className="block md:hidden space-y-3">
            {filteredStudents.map(student => {
              const isSuspended = student.status === 'suspended';

              return (
                <Card
                  key={student.id}
                  padding="md"
                  className="border border-light-border dark:border-dark-border space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-light-border dark:ring-dark-border"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block truncate">
                          {student.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block break-all leading-tight mt-0.5">
                          {student.email}
                        </span>
                      </div>
                    </div>
                    <Badge variant={isSuspended ? 'danger' : 'success'} size="sm" dot className="shrink-0">
                      {student.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-light-border dark:border-dark-border">
                    <GraduationCap className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="font-medium truncate">{student.department || 'Enrolled Student'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-sidebar/60 border border-light-border dark:border-dark-border text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Solved Problems</span>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {student.solvedProblemsCount || 0} Solved
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-dark-sidebar/60 border border-light-border dark:border-dark-border text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tests Taken</span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
                        {student.testsCompletedCount || 0} Tests
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      variant={isSuspended ? 'success' : 'outline'}
                      disabled={!canSuspendStudents}
                      onClick={() => setSelectedToSuspend(student)}
                      leftIcon={isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      className="w-full justify-center"
                    >
                      {isSuspended ? 'Reactivate Student' : 'Suspend Access'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table */}
          <Card padding="none" className="hidden md:block overflow-hidden border border-light-border dark:border-dark-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 min-w-[220px]">Student Profile</th>
                    <th className="py-3 px-4 min-w-[160px]">Program / Institution</th>
                    <th className="py-3 px-4 whitespace-nowrap">Solved Problems</th>
                    <th className="py-3 px-4 whitespace-nowrap">Tests Completed</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {filteredStudents.map(student => {
                    const isSuspended = student.status === 'suspended';

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors"
                      >
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                                {student.name}
                              </span>
                              <span className="text-[11px] text-slate-400 block break-all">{student.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 min-w-[160px]">
                          {student.department || 'Enrolled Student'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {student.solvedProblemsCount || 0} Solved
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {student.testsCompletedCount || 0} Tests
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant={isSuspended ? 'danger' : 'success'} size="sm" dot>
                            {student.status.toUpperCase()}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant={isSuspended ? 'success' : 'outline'}
                            disabled={!canSuspendStudents}
                            onClick={() => setSelectedToSuspend(student)}
                            leftIcon={isSuspended ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          >
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD STUDENT */}
      {/* =================================================================== */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title="Pre-Provision New Student"
        maxWidth="md"
      >
        <form onSubmit={handleAddStudentSubmit} className="space-y-3">
          <Input
            label="Full Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Priyanshu Maurya"
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="priyanshu@campus.edu"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department / Branch"
              value={newDepartment}
              onChange={e => setNewDepartment(e.target.value)}
              placeholder="Computer Science"
            />
            <Input
              label="Program"
              value={newProgram}
              onChange={e => setNewProgram(e.target.value)}
              placeholder="B.Tech CS"
            />
          </div>

          <Input
            label="College / Institution"
            value={newInstitution}
            onChange={e => setNewInstitution(e.target.value)}
            placeholder="e.g. National Institute of Technology"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Access Category
            </label>
            <select
              value={newAccessCategory}
              onChange={e => setNewAccessCategory(e.target.value as StudentAccessCategory)}
              className="w-full text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
            >
              <option value="standard">Standard Enrolled Learner</option>
              <option value="managed">Managed Campus Cohort</option>
              <option value="scholarship">Merit Scholarship Tier</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button type="button" variant="ghost" onClick={() => setIsAddStudentOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingStudent}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              {isSubmittingStudent ? 'Pre-Provisioning...' : 'Save Student'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: BATCH JSON IMPORT */}
      {/* =================================================================== */}
      <Modal
        isOpen={isImportJsonOpen}
        onClose={() => setIsImportJsonOpen(false)}
        title="Batch Import Students via JSON"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-xs">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Student Directory Template</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Download the JSON template containing name, email, department, and institution fields.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download Template
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select JSON File or Paste Document
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleJsonFilePick}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 cursor-pointer mb-2"
            />
            <textarea
              value={jsonText}
              onChange={e => handleJsonInputChange(e.target.value)}
              placeholder='[ { "name": "Student Name", "email": "student@edu.in", ... } ]'
              rows={6}
              className="w-full text-xs font-mono rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card p-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Validation Feedback */}
          {importValidation && (
            <div className="space-y-2">
              {importValidation.isValid ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Valid roster detected. Ready to import <strong>{importValidation.validRows.length} new student records</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Validation Failed ({importValidation.errors.length} errors found)</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 max-h-32 overflow-y-auto">
                    {importValidation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="ghost" onClick={() => setIsImportJsonOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteImport}
              disabled={!importValidation?.isValid || isSubmittingImport}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              {isSubmittingImport ? 'Importing...' : 'Confirm & Batch Import'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation Dialog */}
      {selectedToSuspend && (
        <ConfirmDialog
          isOpen={!!selectedToSuspend}
          onClose={() => setSelectedToSuspend(null)}
          onConfirm={handleToggleSuspendConfirm}
          title={
            selectedToSuspend.status === 'active'
              ? `Suspend Student Access for ${selectedToSuspend.name}?`
              : `Reactivate Access for ${selectedToSuspend.name}?`
          }
          message={
            selectedToSuspend.status === 'active'
              ? 'Suspending this student will immediately revoke their access to assessment submissions and coding practice.'
              : 'Reactivating will restore the student’s normal access.'
          }
          confirmText={selectedToSuspend.status === 'active' ? 'Suspend Student' : 'Reactivate'}
          variant={selectedToSuspend.status === 'active' ? 'danger' : 'primary'}
        />
      )}
    </div>
  );
};
