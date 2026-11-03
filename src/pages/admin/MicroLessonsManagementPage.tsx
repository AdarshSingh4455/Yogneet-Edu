import React, { useState, useEffect, useMemo } from 'react';
import { MicroLessonsService } from '../../services/microLessonsService';
import {
  MicroSubject,
  MicroLesson,
  CreateMicroSubjectInput,
  UpdateMicroSubjectInput,
  CreateMicroLessonInput,
  UpdateMicroLessonInput,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Film,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Play,
  Video,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Phase1NoticeBadge } from '../../components/common/Phase1NoticeBadge';
import { IconSelector } from '../../components/common/IconSelector';
import { renderIconPreview } from '../../services/iconLibraryService';

export const MicroLessonsManagementPage: React.FC = () => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'subjects' | 'lessons'>('subjects');
  const [microSubjects, setMicroSubjects] = useState<MicroSubject[]>(() =>
    MicroLessonsService.getMicroSubjectsSync()
  );
  const [allLessons, setAllLessons] = useState<MicroLesson[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Micro Subject Modals
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MicroSubject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<MicroSubject | null>(null);

  // Micro Subject Form State
  const [subjName, setSubjName] = useState('');
  const [subjDesc, setSubjDesc] = useState('');
  const [subjCover, setSubjCover] = useState('');
  const [subjOrder, setSubjOrder] = useState(1);
  const [subjActive, setSubjActive] = useState(true);

  // Micro Lesson Modals
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<MicroLesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<MicroLesson | null>(null);

  // Micro Lesson Form State
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonShortsUrl, setLessonShortsUrl] = useState('');
  const [lessonSubjectId, setLessonSubjectId] = useState('');
  const [lessonOrder, setLessonOrder] = useState(1);
  const [lessonStatus, setLessonStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = isAdmin || hasPermission('microlessons.create');
  const canEdit = isAdmin || hasPermission('microlessons.edit');
  const canDelete = isAdmin || hasPermission('microlessons.delete');

  const reloadData = async () => {
    setIsLoading(true);
    try {
      const [subjects, lessons] = await Promise.all([
        MicroLessonsService.getMicroSubjects(),
        MicroLessonsService.getAllLessons(),
      ]);
      setMicroSubjects(subjects);
      setAllLessons(lessons);
      if (!lessonSubjectId && subjects.length > 0) {
        setLessonSubjectId(subjects[0].id);
      }
    } catch (err) {
      console.error('Failed to load micro lessons data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Filtered lists
  const filteredMicroSubjects = useMemo(() => {
    return microSubjects.filter(s => {
      const matchQuery =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchQuery;
    });
  }, [microSubjects, searchQuery]);

  const filteredLessons = useMemo(() => {
    return allLessons.filter(l => {
      const matchSubject =
        selectedSubjectFilter === 'all' || l.microSubjectId === selectedSubjectFilter;
      const matchQuery =
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.authorName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchQuery;
    });
  }, [allLessons, selectedSubjectFilter, searchQuery]);

  // Handlers for Micro Subject
  const handleOpenCreateSubject = () => {
    setSubjName('');
    setSubjDesc('');
    setSubjCover('https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&auto=format&fit=crop&q=80');
    setSubjOrder(microSubjects.length + 1);
    setSubjActive(true);
    setIsCreateSubjectOpen(true);
  };

  const handleOpenEditSubject = (s: MicroSubject) => {
    setEditingSubject(s);
    setSubjName(s.name);
    setSubjDesc(s.description);
    setSubjCover(s.coverImage);
    setSubjOrder(s.displayOrder);
    setSubjActive(s.isActive);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim()) {
      toast.error('Validation Error', 'Micro Subject name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await MicroLessonsService.updateMicroSubject(editingSubject.id, {
          name: subjName,
          description: subjDesc,
          coverImage: subjCover,
          displayOrder: subjOrder,
          isActive: subjActive,
        });
        toast.success('Micro Subject Updated (Preview)', `"${subjName}" updated successfully.`);
        setEditingSubject(null);
      } else {
        await MicroLessonsService.createMicroSubject({
          name: subjName,
          description: subjDesc,
          coverImage: subjCover,
          displayOrder: subjOrder,
          isActive: subjActive,
        });
        toast.success('Micro Subject Created (Preview)', `"${subjName}" created successfully.`);
        setIsCreateSubjectOpen(false);
      }
      await reloadData();
    } catch (err: any) {
      toast.error('Operation failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSubjectStatus = async (s: MicroSubject) => {
    try {
      const updated = await MicroLessonsService.toggleMicroSubjectStatus(s.id);
      toast.success(
        'Status Changed (Preview)',
        `Micro Subject "${s.name}" is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}.`
      );
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to toggle status', err.message);
    }
  };

  const handleDeleteSubjectConfirm = async () => {
    if (!subjectToDelete) return;
    try {
      await MicroLessonsService.deleteMicroSubject(subjectToDelete.id);
      toast.success('Micro Subject Deleted (Preview)', `"${subjectToDelete.name}" removed.`);
      setSubjectToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to delete', err.message);
    }
  };

  // Handlers for Micro Lesson
  const handleOpenCreateLesson = () => {
    setLessonTitle('');
    setLessonDescription('');
    setLessonShortsUrl('');
    setLessonSubjectId(microSubjects[0]?.id || '');
    setLessonOrder(allLessons.length + 1);
    setLessonStatus('published');
    setIsCreateLessonOpen(true);
  };

  const handleOpenEditLesson = (l: MicroLesson) => {
    setEditingLesson(l);
    setLessonTitle(l.title);
    setLessonDescription(l.description);
    setLessonShortsUrl(l.youtubeShortsUrl);
    setLessonSubjectId(l.microSubjectId);
    setLessonOrder(l.displayOrder);
    setLessonStatus(l.status);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      toast.error('Validation Error', 'Short title is required.');
      return;
    }
    if (!lessonShortsUrl.trim()) {
      toast.error('Validation Error', 'YouTube Shorts link is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingLesson) {
        await MicroLessonsService.updateLesson(editingLesson.id, {
          title: lessonTitle,
          description: lessonDescription,
          youtubeShortsUrl: lessonShortsUrl,
          microSubjectId: lessonSubjectId,
          displayOrder: lessonOrder,
          status: lessonStatus,
        });
        toast.success('Micro Lesson Updated (Preview)', `"${lessonTitle}" updated.`);
        setEditingLesson(null);
      } else {
        await MicroLessonsService.createLesson({
          title: lessonTitle,
          description: lessonDescription,
          youtubeShortsUrl: lessonShortsUrl,
          microSubjectId: lessonSubjectId,
          displayOrder: lessonOrder,
          status: lessonStatus,
          authorName: currentUser.name || 'Staff Instructor',
        });
        toast.success('Micro Lesson Created (Preview)', `"${lessonTitle}" published to shorts catalog.`);
        setIsCreateLessonOpen(false);
      }
      await reloadData();
    } catch (err: any) {
      toast.error('Operation failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveLessonOrder = async (lesson: MicroLesson, direction: 'up' | 'down') => {
    const subjectLessons = allLessons
      .filter(l => l.microSubjectId === lesson.microSubjectId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const index = subjectLessons.findIndex(l => l.id === lesson.id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = subjectLessons[index];
      subjectLessons[index] = subjectLessons[index - 1];
      subjectLessons[index - 1] = temp;
    } else if (direction === 'down' && index < subjectLessons.length - 1) {
      const temp = subjectLessons[index];
      subjectLessons[index] = subjectLessons[index + 1];
      subjectLessons[index + 1] = temp;
    }

    const orderedIds = subjectLessons.map(l => l.id);
    await MicroLessonsService.reorderLessons(lesson.microSubjectId, orderedIds);
    await reloadData();
    toast.success('Order Updated', 'Video sequence reordered.');
  };

  const handleDeleteLessonConfirm = async () => {
    if (!lessonToDelete) return;
    try {
      await MicroLessonsService.deleteLesson(lessonToDelete.id);
      toast.success('Short Removed (Preview)', `"${lessonToDelete.title}" deleted.`);
      setLessonToDelete(null);
      await reloadData();
    } catch (err: any) {
      toast.error('Failed to delete', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">
              Short-Form Learning
            </Badge>
            <Phase1NoticeBadge label="Frontend Preview • Independent Topics" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Film className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Micro Lessons & Shorts Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Manage independent micro topics and 9:16 vertical YouTube Shorts for high-impact, bite-sized mobile learning.
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleOpenCreateSubject}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Micro Topic
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenCreateLesson}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add YouTube Short
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 pb-1 border-b border-light-border dark:border-dark-border">
        <button
          type="button"
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'subjects'
              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Independent Micro Topics ({microSubjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'lessons'
              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Shorts Video Catalog ({allLessons.length})</span>
        </button>
      </div>

      {/* Search & Subject Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'subjects' ? 'Search micro topics...' : 'Search shorts by title...'
            }
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {activeTab === 'lessons' && (
          <div className="w-full sm:w-64">
            <select
              value={selectedSubjectFilter}
              onChange={e => setSelectedSubjectFilter(e.target.value)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Micro Topics</option>
              {microSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: MICRO SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMicroSubjects.map(subj => (
            <Card
              key={subj.id}
              className={`flex flex-col justify-between overflow-hidden border-2 transition-all ${
                subj.isActive
                  ? 'border-light-border dark:border-dark-border'
                  : 'border-slate-200 dark:border-dark-border/50 opacity-75'
              }`}
            >
              {/* Cover preview banner */}
              <div className="relative h-32 -mx-5 -mt-5 mb-4 overflow-hidden bg-slate-900 flex items-center justify-center">
                {subj.coverImage && (subj.coverImage.startsWith('http://') || subj.coverImage.startsWith('https://') || subj.coverImage.startsWith('data:image/')) ? (
                  <img
                    src={subj.coverImage}
                    alt={subj.name}
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-purple-400 gap-1.5 p-4">
                    {renderIconPreview(subj.coverImage || 'Film', 'w-10 h-10')}
                    <span className="text-[11px] font-mono text-purple-300 font-semibold">{subj.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-white">
                  <span className="text-xs font-bold uppercase tracking-wider bg-purple-900/80 px-2 py-0.5 rounded-full border border-purple-400/40">
                    Order #{subj.displayOrder}
                  </span>
                  <Badge variant={subj.isActive ? 'success' : 'default'} size="sm">
                    {subj.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {subj.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {subj.description}
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-300">
                  <Film className="w-3.5 h-3.5" />
                  <span>
                    {allLessons.filter(l => l.microSubjectId === subj.id).length} Shorts Videos
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleSubjectStatus(subj)}
                  leftIcon={
                    subj.isActive ? (
                      <ToggleRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                    )
                  }
                >
                  {subj.isActive ? 'Deactivate' : 'Activate'}
                </Button>

                <div className="flex items-center gap-1.5">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditSubject(subj)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSubjectToDelete(subj)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2"
                      title="Delete Micro Topic"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: SHORTS VIDEO CATALOG */}
      {activeTab === 'lessons' && (
        <div className="space-y-3">
          {filteredLessons.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No shorts match the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLessons.map(lesson => (
                <Card
                  key={lesson.id}
                  className="flex flex-col justify-between border border-light-border dark:border-dark-border"
                >
                  <div className="space-y-3">
                    {/* Thumbnail & 9:16 indicator */}
                    <div className="flex items-start gap-3">
                      <div className="relative w-16 h-28 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-700">
                        <img
                          src={
                            lesson.thumbnailUrl ||
                            `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`
                          }
                          alt={lesson.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-mono px-1 rounded">
                          9:16
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="purple" size="sm">
                            {lesson.microSubjectName}
                          </Badge>
                          <Badge
                            variant={lesson.status === 'published' ? 'success' : 'default'}
                            size="sm"
                          >
                            {lesson.status.toUpperCase()}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                          {lesson.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {lesson.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Order #{lesson.displayOrder}</span>
                      <a
                        href={lesson.youtubeShortsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>Shorts Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Actions & Ordering */}
                  <div className="pt-3 mt-3 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveLessonOrder(lesson, 'up')}
                        className="p-1.5 rounded-lg border border-light-border dark:border-dark-border text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveLessonOrder(lesson, 'down')}
                        className="p-1.5 rounded-lg border border-light-border dark:border-dark-border text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditLesson(lesson)}
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLessonToDelete(lesson)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE & EDIT MICRO SUBJECT MODAL */}
      <Modal
        isOpen={isCreateSubjectOpen || editingSubject !== null}
        onClose={() => {
          setIsCreateSubjectOpen(false);
          setEditingSubject(null);
        }}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <span>{editingSubject ? 'Edit Micro Topic' : 'Create Micro Learning Topic'}</span>
          </div>
        }
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <Phase1NoticeBadge
            variant="banner"
            label="Micro Subjects remain strictly independent from regular curriculum subjects and hold 9:16 vertical shorts."
          />

          <Input
            label="Micro Topic Name"
            value={subjName}
            onChange={e => setSubjName(e.target.value)}
            placeholder="e.g. Python Quick Tricks, Interview Hacks"
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={subjDesc}
              onChange={e => setSubjDesc(e.target.value)}
              placeholder="What kind of short-form tricks and lessons will be featured here?"
              rows={3}
              className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card/90 text-sm p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Micro Topic Icon / Asset Picker using IconLibrary */}
          <IconSelector
            label="Micro Topic Icon / Asset"
            value={subjCover}
            onChange={setSubjCover}
            categoryFilter="Micro Subjects"
            placeholder="Select a glyph or icon from the library..."
          />

          <Input
            label="Cover Image / Custom Asset URL"
            value={subjCover}
            onChange={e => setSubjCover(e.target.value)}
            placeholder="Selected icon key or image URL (https://...)"
            helperText="Thumbnail or icon chosen from the Icon Library for student micro topic cards"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={subjOrder}
              onChange={e => setSubjOrder(Number(e.target.value))}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={subjActive ? 'active' : 'inactive'}
                onChange={e => setSubjActive(e.target.value === 'active')}
                className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm p-2.5 text-slate-900 dark:text-slate-100"
              >
                <option value="active">Active (Visible)</option>
                <option value="inactive">Inactive (Draft)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateSubjectOpen(false);
                setEditingSubject(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingSubject ? 'Save Changes' : 'Create Topic'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE & EDIT MICRO LESSON SHORT MODAL */}
      <Modal
        isOpen={isCreateLessonOpen || editingLesson !== null}
        onClose={() => {
          setIsCreateLessonOpen(false);
          setEditingLesson(null);
        }}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-600" />
            <span>{editingLesson ? 'Edit Micro Lesson' : 'Add YouTube Shorts Lesson'}</span>
          </div>
        }
      >
        <form onSubmit={handleSaveLesson} className="space-y-4">
          <Phase1NoticeBadge
            variant="banner"
            label="Vertical 9:16 Shorts embed integration. YouTube IDs are automatically extracted from shorts or standard URLs."
          />

          <Input
            label="Video Title"
            value={lessonTitle}
            onChange={e => setLessonTitle(e.target.value)}
            placeholder="e.g. Python Walrus Operator in 40 Seconds"
            required
          />

          <Input
            label="YouTube Shorts URL"
            value={lessonShortsUrl}
            onChange={e => setLessonShortsUrl(e.target.value)}
            placeholder="https://www.youtube.com/shorts/bM7SZ5SBzyY"
            required
            helperText="Supports youtube.com/shorts/..., youtu.be/..., or standard watch URLs"
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Micro Subject
            </label>
            <select
              value={lessonSubjectId}
              onChange={e => setLessonSubjectId(e.target.value)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm p-2.5 text-slate-900 dark:text-slate-100"
              required
            >
              {microSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description & Key Takeaways
            </label>
            <textarea
              value={lessonDescription}
              onChange={e => setLessonDescription(e.target.value)}
              placeholder="Short explanation shown below the 9:16 player..."
              rows={3}
              className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card/90 text-sm p-3 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Display Order"
              type="number"
              min={1}
              value={lessonOrder}
              onChange={e => setLessonOrder(Number(e.target.value))}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Publication Status
              </label>
              <select
                value={lessonStatus}
                onChange={e => setLessonStatus(e.target.value as any)}
                className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm p-2.5 text-slate-900 dark:text-slate-100"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateLessonOpen(false);
                setEditingLesson(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingLesson ? 'Save Changes' : 'Publish Short'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOGS */}
      {subjectToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setSubjectToDelete(null)}
          onConfirm={handleDeleteSubjectConfirm}
          title="Delete Micro Topic Confirmation"
          message={`Are you sure you want to delete "${subjectToDelete.name}" and all attached micro lessons?`}
          confirmText="Yes, Delete Topic"
          variant="danger"
        />
      )}

      {lessonToDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setLessonToDelete(null)}
          onConfirm={handleDeleteLessonConfirm}
          title="Remove Short Confirmation"
          message={`Are you sure you want to remove "${lessonToDelete.title}"?`}
          confirmText="Yes, Remove"
          variant="danger"
        />
      )}
    </div>
  );
};
