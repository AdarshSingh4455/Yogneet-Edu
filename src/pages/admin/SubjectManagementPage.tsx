import React, { useState, useEffect, useMemo } from 'react';
import { SubjectService } from '../../services/subjectService';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  Layers,
  Code,
  Database,
  Globe,
  Brain,
  Cpu,
  Server,
  Terminal,
  ArrowUpDown,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { getSubjectIcon } from '../../components/subjects/SubjectSelectionView';
import { IconSelector } from '../../components/common/IconSelector';
import { renderIconPreview } from '../../services/iconLibraryService';

const AVAILABLE_ICONS = [
  { name: 'Code', icon: Code, label: 'Code' },
  { name: 'Database', icon: Database, label: 'Database' },
  { name: 'Globe', icon: Globe, label: 'Web' },
  { name: 'Brain', icon: Brain, label: 'AI/ML' },
  { name: 'Cpu', icon: Cpu, label: 'DSA/Hardware' },
  { name: 'Server', icon: Server, label: 'DevOps/Cloud' },
  { name: 'Terminal', icon: Terminal, label: 'CLI/System' },
  { name: 'Layers', icon: Layers, label: 'Architecture' },
  { name: 'BookOpen', icon: BookOpen, label: 'General' },
];

export const SubjectManagementPage: React.FC = () => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const [subjects, setSubjects] = useState<Subject[]>(() => SubjectService.getSubjectsSync());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Create/Edit Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('Code');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = isAdmin || hasPermission('subjects.create');
  const canEdit = isAdmin || hasPermission('subjects.edit');
  const canDelete = isAdmin || hasPermission('subjects.delete');

  const reloadSubjects = async () => {
    setIsLoading(true);
    try {
      const data = await SubjectService.getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadSubjects();
  }, []);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      const matchesSearch =
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && subject.isActive) ||
        (statusFilter === 'inactive' && !subject.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [subjects, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormIcon('Code');
    setFormDisplayOrder(subjects.length + 1);
    setFormIsActive(true);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormName(subject.name);
    setFormDescription(subject.description);
    setFormIcon(subject.icon || 'BookOpen');
    setFormDisplayOrder(subject.displayOrder);
    setFormIsActive(subject.isActive);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Validation Error', 'Subject name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await SubjectService.createSubject({
        name: formName,
        description: formDescription,
        icon: formIcon,
        displayOrder: formDisplayOrder,
        isActive: formIsActive,
      });
      toast.success('Subject Created (Preview)', `"${formName}" was created successfully.`);
      setIsCreateOpen(false);
      await reloadSubjects();
    } catch (err: any) {
      toast.error('Failed to create subject', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    setIsSubmitting(true);
    try {
      await SubjectService.updateSubject(editingSubject.id, {
        name: formName,
        description: formDescription,
        icon: formIcon,
        displayOrder: formDisplayOrder,
        isActive: formIsActive,
      });
      toast.success('Subject Updated (Preview)', `"${formName}" updated successfully.`);
      setEditingSubject(null);
      await reloadSubjects();
    } catch (err: any) {
      toast.error('Failed to update subject', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (subject: Subject) => {
    try {
      const updated = await SubjectService.toggleSubjectStatus(subject.id);
      toast.success(
        'Status Changed (Preview)',
        `Subject "${subject.name}" is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}.`
      );
      await reloadSubjects();
    } catch (err: any) {
      toast.error('Failed to update status', err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!subjectToDelete) return;
    try {
      await SubjectService.deleteSubject(subjectToDelete.id);
      toast.success('Subject Removed (Preview)', `Subject "${subjectToDelete.name}" deleted.`);
      setSubjectToDelete(null);
      await reloadSubjects();
    } catch (err: any) {
      toast.error('Deletion failed', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Academic Architecture
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-brand-500" />
            Curriculum Subject Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Configure foundational academic subjects across video lessons, study notes, practical assignments, and mock test catalogs.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shrink-0"
          >
            Create Subject
          </Button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Subjects
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{subjects.length}</p>
        </Card>
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Curricula
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {subjects.filter(s => s.isActive).length}
          </p>
        </Card>
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Inactive / Draft
          </span>
          <p className="text-2xl font-black text-slate-400">
            {subjects.filter(s => !s.isActive).length}
          </p>
        </Card>
        <Card padding="sm" className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Video Lessons
          </span>
          <p className="text-2xl font-black text-brand-600 dark:text-cyan-400">
            {subjects.reduce((sum, s) => sum + (s.contentCounts?.videos || 0), 0)}
          </p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search subjects by name or details..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubjects.map(subject => {
          const Icon = getSubjectIcon(subject.icon);

          return (
            <Card
              key={subject.id}
              className={`flex flex-col justify-between transition-all duration-200 border-2 ${
                subject.isActive
                  ? 'border-light-border dark:border-dark-border'
                  : 'border-slate-200 dark:border-dark-border/50 opacity-75'
              }`}
            >
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-500/20 text-brand-600 dark:text-cyan-300 flex items-center justify-center shrink-0">
                      {renderIconPreview(subject.icon, 'w-5 h-5')}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {subject.name}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        Display Order: #{subject.displayOrder}
                      </span>
                    </div>
                  </div>

                  <Badge variant={subject.isActive ? 'success' : 'default'} size="sm">
                    {subject.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {subject.description || 'No description provided.'}
                </p>

                {/* Content Counts Breakdown */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-bg/60 border border-light-border dark:border-dark-border grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Videos</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {subject.contentCounts?.videos || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Notes</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {subject.contentCounts?.notes || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">Projects</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {subject.contentCounts?.assignments || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(subject)}
                  leftIcon={
                    subject.isActive ? (
                      <ToggleRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                    )
                  }
                >
                  {subject.isActive ? 'Deactivate' : 'Activate'}
                </Button>

                <div className="flex items-center gap-1.5">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(subject)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSubjectToDelete(subject)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE & EDIT SUBJECT MODAL */}
      <Modal
        isOpen={isCreateOpen || editingSubject !== null}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingSubject(null);
        }}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-500" />
            <span>{editingSubject ? 'Edit Curriculum Subject' : 'Create New Subject'}</span>
          </div>
        }
      >
        <form onSubmit={editingSubject ? handleSaveEdit : handleSaveCreate} className="space-y-4">
          <Input
            label="Subject Name"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="e.g. Artificial Intelligence & Machine Learning"
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Subject Description
            </label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Outline the core syllabus, prerequisites, and learning objectives..."
              rows={3}
              className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card/90 text-sm p-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Icon Selector using IconLibrary */}
          <IconSelector
            label="Subject Icon"
            value={formIcon}
            onChange={setFormIcon}
            categoryFilter="Subjects"
            placeholder="Select an icon from the library..."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={formDisplayOrder}
              onChange={e => setFormDisplayOrder(Number(e.target.value))}
              helperText="Defines sorting in navigation"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Visibility Status
              </label>
              <select
                value={formIsActive ? 'active' : 'inactive'}
                onChange={e => setFormIsActive(e.target.value === 'active')}
                className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="active">Active (Visible to Students)</option>
                <option value="inactive">Inactive (Draft / Hidden)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingSubject(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      {subjectToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setSubjectToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Subject Confirmation"
          message={`Are you sure you want to delete "${subjectToDelete.name}"? This will remove the subject from the active curriculum.`}
          confirmText="Yes, Delete Subject"
          variant="danger"
        />
      )}
    </div>
  );
};
