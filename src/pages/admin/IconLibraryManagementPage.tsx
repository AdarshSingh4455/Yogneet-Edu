import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Grid,
  List as ListIcon,
  Trash2,
  Edit2,
  Eye,
  Upload,
  Link as LinkIcon,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Phase1NoticeBadge } from '../../components/common/Phase1NoticeBadge';
import {
  IconLibraryService,
  IconItem,
  IconCategory,
  IconSourceType,
  LUCIDE_ICON_MAP,
  renderIconPreview,
} from '../../services/iconLibraryService';
import { SubjectService } from '../../services/subjectService';
import { MicroLessonsService } from '../../services/microLessonsService';

const CATEGORIES: ('All' | IconCategory)[] = ['All', 'Subjects', 'Micro Subjects', 'Technology', 'General'];
const SOURCE_TYPES: { label: string; value: 'All' | IconSourceType }[] = [
  { label: 'All Sources', value: 'All' },
  { label: 'Lucide Icons', value: 'lucide' },
  { label: 'Image URL', value: 'url' },
  { label: 'Uploaded Image', value: 'upload' },
];

export const IconLibraryManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [icons, setIcons] = useState<IconItem[]>(() => IconLibraryService.getAllIcons());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | IconCategory>('All');
  const [selectedSource, setSelectedSource] = useState<'All' | IconSourceType>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<IconItem | null>(null);
  const [previewIcon, setPreviewIcon] = useState<IconItem | null>(null);
  const [iconToDelete, setIconToDelete] = useState<IconItem | null>(null);

  // Add Form State
  const [sourceType, setSourceType] = useState<IconSourceType>('lucide');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<IconCategory>('Subjects');
  const [formIconKey, setFormIconKey] = useState('Code');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [uploadedDataUrl, setUploadedDataUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [lucideSearch, setLucideSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<IconCategory>('Subjects');

  // Load live icons on mount
  React.useEffect(() => {
    setIsLoading(true);
    IconLibraryService.fetchIcons()
      .then(items => setIcons(items))
      .catch(err => console.warn('[IconLibraryManagementPage] Error fetching icons:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Refresh icon list
  const refreshIcons = () => {
    IconLibraryService.fetchIcons().then(items => setIcons(items));
  };

  // Usage detection across Subjects & Micro Subjects
  const usageStats = useMemo(() => {
    const subjects = SubjectService.getSubjectsSync();
    const microSubjects = MicroLessonsService.getMicroSubjectsSync();

    const usedKeys = new Set<string>();
    subjects.forEach(s => {
      if (s.icon) usedKeys.add(s.icon.toLowerCase());
    });
    microSubjects.forEach(m => {
      if (m.name) usedKeys.add(m.name.toLowerCase());
    });

    return {
      subjectsCount: subjects.length,
      microSubjectsCount: microSubjects.length,
      usedKeys,
    };
  }, [icons]);

  const isIconInUse = (icon: IconItem): boolean => {
    const key = (icon.iconKey || icon.name).toLowerCase();
    return usageStats.usedKeys.has(key);
  };

  // Filtered Icons
  const filteredIcons = useMemo(() => {
    return icons.filter(icon => {
      const matchesSearch =
        icon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (icon.iconKey && icon.iconKey.toLowerCase().includes(searchQuery.toLowerCase())) ||
        icon.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || icon.category === selectedCategory;
      const matchesSource = selectedSource === 'All' || icon.sourceType === selectedSource;

      return matchesSearch && matchesCategory && matchesSource;
    });
  }, [icons, searchQuery, selectedCategory, selectedSource]);

  // Catalog of available Lucide icons for picker
  const availableLucideKeys = useMemo(() => {
    const keys = Object.keys(LUCIDE_ICON_MAP);
    if (!lucideSearch.trim()) return keys;
    return keys.filter(k => k.toLowerCase().includes(lucideSearch.toLowerCase()));
  }, [lucideSearch]);

  // Handle Add Icon
  const handleOpenAdd = () => {
    setSourceType('lucide');
    setFormName('');
    setFormCategory('Subjects');
    setFormIconKey('Code');
    setFormImageUrl('');
    setUploadedDataUrl('');
    setUploadError('');
    setLucideSearch('');
    setIsAddOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files (PNG, JPG, SVG, WebP) are supported.');
      return;
    }

    if (file.size > 500 * 1024) {
      setUploadError('File size exceeds the 500 KB limit. Please choose a smaller icon or SVG.');
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedDataUrl(reader.result);
        if (!formName) {
          const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          setFormName(defaultName);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Validation Error', 'Icon name is required.');
      return;
    }

    if (sourceType === 'lucide' && !formIconKey) {
      toast.error('Validation Error', 'Please select a Lucide icon.');
      return;
    }

    if (sourceType === 'url') {
      if (!formImageUrl.trim() || (!formImageUrl.startsWith('https://') && !formImageUrl.startsWith('http://'))) {
        toast.error('Validation Error', 'Please provide a valid image URL (HTTPS recommended).');
        return;
      }
    }

    if (sourceType === 'upload' && !uploadedDataUrl) {
      toast.error('Validation Error', 'Please upload an image file.');
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = sourceType === 'url' ? formImageUrl.trim() : uploadedDataUrl;
      let storagePath: string | undefined = undefined;

      if (sourceType === 'upload' && uploadedFile) {
        try {
          const uploaded = await IconLibraryService.uploadIconAsset(uploadedFile);
          finalImageUrl = uploaded.publicUrl;
          storagePath = uploaded.storagePath;
        } catch (uploadErr: any) {
          console.warn('[IconLibraryManagementPage] Storage upload fallback:', uploadErr);
        }
      }

      const created = await IconLibraryService.addCustomIconAsync({
        name: formName.trim(),
        category: formCategory,
        sourceType,
        iconKey: sourceType === 'lucide' ? formIconKey : undefined,
        imageUrl: (sourceType === 'url' || sourceType === 'upload') ? finalImageUrl : undefined,
        storagePath,
      });

      toast.success('Icon Registered', `"${created.name}" saved to the Icon Library.`);
      setIsAddOpen(false);
      setUploadedFile(null);
      refreshIcons();
    } catch (err: any) {
      toast.error('Creation Failed', err.message || 'Unable to register icon.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Edit
  const handleOpenEdit = (icon: IconItem) => {
    setEditingIcon(icon);
    setEditName(icon.name);
    setEditCategory(icon.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIcon) return;
    if (!editName.trim()) {
      toast.error('Validation Error', 'Icon name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await IconLibraryService.updateCustomIconAsync(editingIcon.id, {
        name: editName.trim(),
        category: editCategory,
      });

      if (updated) {
        toast.success('Icon Updated', `"${updated.name}" updated successfully.`);
        setEditingIcon(null);
        refreshIcons();
      }
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Icon could not be updated.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!iconToDelete) return;

    if (iconToDelete.isSystem) {
      toast.error('Cannot Delete', 'Built-in system icons cannot be deleted.');
      setIconToDelete(null);
      return;
    }

    try {
      const result = await IconLibraryService.deleteCustomIconAsync(iconToDelete.id);
      if (result.success) {
        toast.success('Icon Deleted', `"${iconToDelete.name}" was removed.`);
        refreshIcons();
      } else {
        toast.warning('Cannot Delete Active Icon', result.message);
      }
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Unable to delete icon.');
    } finally {
      setIconToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Boxes className="w-7 h-7 text-brand-500" />
              <span>Icon Library Management</span>
            </h1>
            <Badge variant="brand" size="sm">Phase 4A</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Curate, preview, and organize reusable platform iconography for curriculum subjects, micro topics, and learning modules.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm shadow-brand-500/20"
          >
            Add New Icon
          </Button>
        )}
      </div>

      <Phase1NoticeBadge
        variant="banner"
        label="Icon Library Management UI. Icons configured here immediately appear in Subject & Micro Subject IconSelectors across all authoring tools."
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Icons
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                {icons.length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-500 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
            {icons.filter(i => i.isSystem).length} system · {icons.filter(i => !i.isSystem).length} custom
          </span>
        </Card>

        <Card className="p-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Categories
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">
                {CATEGORIES.length - 1}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
            Subjects, Tech & General
          </span>
        </Card>

        <Card className="p-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                In Active Use
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {icons.filter(i => isIconInUse(i)).length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
            Assigned to subjects/topics
          </span>
        </Card>

        <Card className="p-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Source Breakdown
              </span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                {icons.filter(i => i.sourceType === 'lucide').length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
            Lucide vector glyphs
          </span>
        </Card>
      </div>

      {/* Search, Filter & View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-dark-card p-3 rounded-2xl border border-light-border dark:border-dark-border">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search icons by name, key, or category..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Source Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2 justify-between md:justify-end">
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value as any)}
            className="rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-xs px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SOURCE_TYPES.map(st => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          <div className="flex items-center border border-light-border dark:border-dark-border rounded-xl p-0.5 bg-slate-50 dark:bg-dark-bg">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-dark-card text-brand-600 dark:text-brand-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredIcons.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-dark-border">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-dark-hover text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            No matching icons found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Try adjusting your search query, selecting another category, or register a new icon in the library.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedSource('All');
            }}
          >
            Reset Filters
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {filteredIcons.map(icon => {
            const inUse = isIconInUse(icon);
            return (
              <Card
                key={icon.id}
                className="p-3.5 flex flex-col justify-between hover:border-brand-500/50 hover:shadow-md transition-all group border border-light-border dark:border-dark-border"
              >
                {/* Top Badge & Source */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {icon.category}
                  </span>
                  {inUse ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="In Active Use" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" title="Unassigned" />
                  )}
                </div>

                {/* Icon Preview Area */}
                <button
                  type="button"
                  onClick={() => setPreviewIcon(icon)}
                  className="my-2 py-4 px-2 rounded-xl bg-slate-50 dark:bg-dark-bg/60 border border-light-border dark:border-dark-border flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform"
                  title="Click to preview sizes"
                >
                  {renderIconPreview(icon, 'w-8 h-8')}
                </button>

                {/* Info & Metadata */}
                <div className="text-center mt-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={icon.name}>
                    {icon.name}
                  </h4>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Badge
                      variant={icon.sourceType === 'lucide' ? 'brand' : icon.sourceType === 'upload' ? 'purple' : 'default'}
                      size="sm"
                    >
                      {icon.sourceType}
                    </Badge>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 mt-2 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPreviewIcon(icon)}
                    className="p-1 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-dark-hover"
                    title="Preview Sizes"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {!icon.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(icon)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-hover"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!icon.isSystem && (
                      <button
                        type="button"
                        onClick={() => setIconToDelete(icon)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Icon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {icon.isSystem && (
                      <span className="text-[10px] text-slate-400 italic">System</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <Card className="overflow-hidden border border-light-border dark:border-dark-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-dark-bg/80 border-b border-light-border dark:border-dark-border uppercase text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Icon</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Usage Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {filteredIcons.map(icon => {
                  const inUse = isIconInUse(icon);
                  return (
                    <tr key={icon.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-hover/40 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-bg text-brand-600 dark:text-brand-400 flex items-center justify-center">
                          {renderIconPreview(icon, 'w-4 h-4')}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {icon.name}
                        {icon.iconKey && (
                          <span className="block text-[10px] font-mono text-slate-400">
                            key: {icon.iconKey}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                        {icon.category}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={icon.sourceType === 'lucide' ? 'brand' : icon.sourceType === 'upload' ? 'purple' : 'default'}
                          size="sm"
                        >
                          {icon.sourceType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        {inUse ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active in curriculum
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewIcon(icon)}
                            className="p-1 rounded-lg text-slate-400 hover:text-brand-500"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!icon.isSystem && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(icon)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {!icon.isSystem && (
                            <button
                              type="button"
                              onClick={() => setIconToDelete(icon)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ADD NEW ICON MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-brand-500" />
            <span>Add Icon to Library</span>
          </div>
        }
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <Phase1NoticeBadge
            variant="banner"
            label="Phase 4A Client Preview: Registered icons persist in browser session storage and are immediately available to Subject & Micro Topic creators."
          />

          {/* Source Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Source Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSourceType('lucide')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'lucide'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'border-light-border dark:border-dark-border text-slate-600 hover:bg-slate-50 dark:hover:bg-dark-hover'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <span>Lucide Glyph</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('url')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'url'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'border-light-border dark:border-dark-border text-slate-600 hover:bg-slate-50 dark:hover:bg-dark-hover'
                }`}
              >
                <LinkIcon className="w-5 h-5" />
                <span>Custom URL</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('upload')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  sourceType === 'upload'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'border-light-border dark:border-dark-border text-slate-600 hover:bg-slate-50 dark:hover:bg-dark-hover'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Upload Asset</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Icon Name"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Next.js, Kubernetes, Machine Learning"
              required
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as IconCategory)}
                className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Subjects">Subjects</option>
                <option value="Micro Subjects">Micro Subjects</option>
                <option value="Technology">Technology</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Conditional Input based on Source */}
          {sourceType === 'lucide' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Choose Lucide Glyph
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lucideSearch}
                  onChange={e => setLucideSearch(e.target.value)}
                  placeholder="Filter available icons..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-light-border dark:border-dark-border rounded-xl bg-slate-50/50 dark:bg-dark-bg/50">
                {availableLucideKeys.map(key => {
                  const LucideComp = LUCIDE_ICON_MAP[key];
                  const isSelected = formIconKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setFormIconKey(key);
                        if (!formName) setFormName(key);
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-cyan-400 font-bold shadow-xs'
                          : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-dark-card'
                      }`}
                      title={key}
                    >
                      <LucideComp className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sourceType === 'url' && (
            <div className="space-y-2">
              <Input
                label="Image / SVG URL (HTTPS)"
                value={formImageUrl}
                onChange={e => setFormImageUrl(e.target.value)}
                placeholder="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/..."
                helperText="Must be a publicly accessible direct image link (SVG, PNG, or WebP)."
                required
              />
              {formImageUrl && (
                <div className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white dark:bg-dark-card p-1 border flex items-center justify-center overflow-hidden">
                    <img
                      src={formImageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={e => {
                        (e.target as any).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><text y="16" font-size="12">⚠️</text></svg>';
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Live URL Preview
                  </span>
                </div>
              )}
            </div>
          )}

          {sourceType === 'upload' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Upload Icon / SVG Asset
              </label>
              <div className="border-2 border-dashed border-light-border dark:border-dark-border rounded-xl p-5 text-center bg-slate-50/50 dark:bg-dark-bg/50 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="icon-file-input"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="icon-file-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      Click to choose file
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      PNG, SVG, JPG, WebP up to 500 KB
                    </span>
                  </div>
                </label>
              </div>

              {uploadError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadedDataUrl && (
                <div className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-bg flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white dark:bg-dark-card p-1 border flex items-center justify-center overflow-hidden">
                    <img src={uploadedDataUrl} alt="Uploaded Preview" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">Uploaded Successfully</span>
                    <span className="text-slate-400 text-[11px]">Ready for preview and assignment</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Plus className="w-4 h-4" />}>
              Save to Library
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT ICON METADATA MODAL */}
      <Modal
        isOpen={editingIcon !== null}
        onClose={() => setEditingIcon(null)}
        maxWidth="md"
        title="Edit Icon Metadata"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Icon Name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={editCategory}
              onChange={e => setEditCategory(e.target.value as IconCategory)}
              className="w-full rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Subjects">Subjects</option>
              <option value="Micro Subjects">Micro Subjects</option>
              <option value="Technology">Technology</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="ghost" onClick={() => setEditingIcon(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Icon
            </Button>
          </div>
        </form>
      </Modal>

      {/* PREVIEW SIZES MODAL */}
      <Modal
        isOpen={previewIcon !== null}
        onClose={() => setPreviewIcon(null)}
        maxWidth="sm"
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-500" />
            <span>Icon Size Preview</span>
          </div>
        }
      >
        {previewIcon && (
          <div className="space-y-4 py-2">
            <div className="text-center pb-2 border-b border-light-border dark:border-dark-border">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {previewIcon.name}
              </h3>
              <span className="text-[11px] text-slate-400 capitalize">
                Category: {previewIcon.category} · Source: {previewIcon.sourceType}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {/* 16px Small */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center text-brand-600 dark:text-cyan-400">
                  {renderIconPreview(previewIcon, 'w-4 h-4')}
                </div>
                <span className="text-[10px] font-mono text-slate-400">16px (Small)</span>
              </div>

              {/* 24px Medium */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 flex items-center justify-center text-brand-600 dark:text-cyan-400">
                  {renderIconPreview(previewIcon, 'w-6 h-6')}
                </div>
                <span className="text-[10px] font-mono text-slate-400">24px (Medium)</span>
              </div>

              {/* 48px Large */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 flex items-center justify-center text-brand-600 dark:text-cyan-400">
                  {renderIconPreview(previewIcon, 'w-12 h-12')}
                </div>
                <span className="text-[10px] font-mono text-slate-400">48px (Large)</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewIcon(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={iconToDelete !== null}
        onClose={() => setIconToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Icon Confirmation"
        message={
          iconToDelete && isIconInUse(iconToDelete)
            ? `WARNING: The icon "${iconToDelete?.name}" appears to be in use by one or more active curriculum subjects or micro topics. Deleting it may cause those subjects to revert to the default BookOpen icon. Are you sure?`
            : `Are you sure you want to delete the icon "${iconToDelete?.name}" from the library?`
        }
        confirmText="Delete Icon"
        variant="danger"
      />
    </div>
  );
};
