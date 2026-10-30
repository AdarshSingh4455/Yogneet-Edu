import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StudyNotesService } from '../../services/studyNotesService';
import { StorageService } from '../../services/storageService';
import { ApiService } from '../../services/api';
import { StudyNote } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Grid,
  List,
  Download,
  BookOpen,
  FileText,
  Calendar,
  Clock,
  ArrowUpDown,
  AlertCircle,
  Eye,
  Tag,
  Check,
  ArrowRight,
  FileCode,
  CheckSquare,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';

export const NotesDirectoryPage: React.FC = () => {
  const toast = useToast();
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'downloads' | 'title'>('recent');
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);

  const subjects = ['All', 'Python', 'Data Structures', 'SQL', 'Algorithms', 'Cloud Computing'];

  useEffect(() => {
    let isMounted = true;
    StudyNotesService.getNotes(undefined, true)
      .then(data => {
        if (isMounted) {
          setNotes(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load notes:', err);
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        if (note.status !== 'published') return false;

        const matchesSubject = selectedSubject === 'All' || note.subject === selectedSubject;
        const matchesQuery =
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (note.tags && note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

        return matchesSubject && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        }
        if (sortBy === 'downloads') {
          return b.downloads - a.downloads;
        }
        return a.title.localeCompare(b.title);
      });
  }, [notes, searchQuery, selectedSubject, sortBy]);

  const handleDownload = async (note: StudyNote) => {
    if (!note.fileUrl) {
      toast.info('Text Note', `"${note.title}" is an in-browser Markdown note. Click "Read" to view.`);
      return;
    }

    const isProRequired = note.isRestricted || note.requiredTier === 'pro';
    const hasEntitlement = currentUser.role === 'admin' || currentUser.role === 'subadmin' ||
      currentUser.accessCategory === 'pro' || currentUser.accessCategory === 'scholarship' || currentUser.accessCategory === 'managed';

    if (isProRequired && !hasEntitlement) {
      toast.warning(
        'Pro Tier Required',
        `Offline PDF download for "${note.title}" requires Pro or Institutional access. You can read the complete note online.`
      );
      return;
    }

    try {
      let downloadUrl = '';
      if (note.id && !note.fileUrl.startsWith('blob:') && !note.fileUrl.startsWith('mock/')) {
        try {
          downloadUrl = await StorageService.getAuthorizedNoteDownloadUrl(note.id);
        } catch (authErr: any) {
          toast.warning('Entitlement Required', authErr.message || 'You do not have entitlement to download this file.');
          return;
        }
      }

      if (!downloadUrl) {
        downloadUrl = await StorageService.getDownloadUrl(note.fileUrl, isProRequired);
      }

      if (!downloadUrl) {
        toast.warning('File Unavailable', `The attachment for "${note.title}" is currently unavailable.`);
        return;
      }

      ApiService.incrementNoteDownloads(note.id);
      toast.success('Download Started', `Downloading ${note.title}...`);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.error('Download Failed', err.message || 'Could not download note.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-500 dark:text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            Study Notes &amp; Reference PDFs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Handwritten revision sheets, architectural diagrams, and algorithmic cheat-sheets by <strong>Tech Geek Adarsh</strong>.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 rounded-xl border border-light-border dark:border-dark-border bg-slate-100 dark:bg-dark-card">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-dark-selected shadow-sm text-brand-500 dark:text-blue-300 dark:border dark:border-blue-600'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-blue-200 dark:hover:bg-dark-hover'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-dark-selected shadow-sm text-brand-500 dark:text-blue-300 dark:border dark:border-blue-600'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-blue-200 dark:hover:bg-dark-hover'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-Stage Learning Path Reminder Banner */}
      <div className="p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
            Step 2: Revise
          </span>
          <p className="text-slate-700 dark:text-slate-300">
            Finished reading your notes? Apply your knowledge with hands-on practical assignments or evaluate with test series.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/practical"
            className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300 hover:underline"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-600" />
            <span>Practical Assignments</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
          <Link
            to="/tests"
            className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-cyan-400 hover:underline"
          >
            <CheckSquare className="w-3.5 h-3.5 text-brand-500" />
            <span>Test Series</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by topic, keyword, or concepts..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/30 transition-all"
          />
        </div>

        {/* Sort & Subject Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'recent' | 'downloads' | 'title')}
              className="p-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/40 dark:hover:border-blue-700/60 cursor-pointer transition-all"
            >
              <option value="recent">Recently Updated</option>
              <option value="downloads">Most Downloaded</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {subjects.map(subj => (
          <button
            key={subj}
            onClick={() => setSelectedSubject(subj)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSubject === subj
                ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm shadow-brand-500/20 dark:shadow-blue-glow dark:border dark:border-blue-400/50'
                : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-900/40'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Notes Content Display */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-slate-400" />}
          title="No Study Notes Found"
          description="We couldn't find any notes matching your search or selected filter. Try clearing the filters or searching another keyword."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedSubject('All');
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map(note => (
            <Card
              key={note.id}
              padding="md"
              className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-blue-500/40 dark:hover:shadow-[0_4px_20px_-2px_rgba(59,130,246,0.12)] transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    {note.subject}
                  </Badge>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {note.readTime}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-500 transition-colors line-clamp-2">
                  {note.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {note.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {note.tags.map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-cardHover text-slate-600 dark:text-slate-300 font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author & Actions Footer */}
              <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={note.authorAvatar}
                      alt={note.author}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      {note.author}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {note.lastUpdated}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedNote(note)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Read Online
                  </Button>

                  {note.fileUrl && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      onClick={() => handleDownload(note)}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      title={`Download ${note.fileSize || 'PDF'}`}
                    >
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <Card
              key={note.id}
              padding="sm"
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-blue-500/40 dark:hover:shadow-[0_4px_20px_-2px_rgba(59,130,246,0.12)] transition-all"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="brand" size="sm">
                    {note.subject}
                  </Badge>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {note.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {note.excerpt}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>By {note.author}</span>
                  <span>•</span>
                  <span>{note.pages} Pages</span>
                  <span>•</span>
                  <span>{note.downloads} Downloads</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedNote(note)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  Read Online
                </Button>
                {note.fileUrl && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDownload(note)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    title={`Download ${note.fileSize || 'PDF'}`}
                  >
                    PDF ({note.fileSize || 'PDF'})
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Read Note Detail Modal */}
      {selectedNote && (
        <Modal
          isOpen={!!selectedNote}
          onClose={() => setSelectedNote(null)}
          title={selectedNote.title}
          description={`By ${selectedNote.author} • Updated on ${selectedNote.lastUpdated} • ${selectedNote.pages} Pages`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Top metadata tags */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm">{selectedNote.subject}</Badge>
                <span className="text-slate-400">{selectedNote.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant={selectedNote.downloadAvailable ? 'primary' : 'secondary'}
                  disabled={!selectedNote.downloadAvailable}
                  onClick={() => handleDownload(selectedNote)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  {selectedNote.downloadAvailable ? `Download PDF (${selectedNote.fileSize})` : 'PDF Unavailable'}
                </Button>
              </div>
            </div>

            {/* Note Markdown Content Rendering */}
            <div className="text-xs sm:text-sm leading-relaxed overflow-x-hidden">
              <MarkdownRenderer content={selectedNote.fullMarkdown} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-light-border dark:border-dark-border text-xs text-slate-400">
              <span>Yogneet Edu Digital Content Repository</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedNote(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
