import React, { useState, useMemo } from 'react';
import { ApiService } from '../../services/api';
import { StudyNote } from '../../types';
import { useToast } from '../../context/ToastContext';
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
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';

export const NotesDirectoryPage: React.FC = () => {
  const toast = useToast();
  const [notes, setNotes] = useState<StudyNote[]>(() => ApiService.getNotes());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'downloads' | 'title'>('recent');
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);

  const subjects = ['All', 'Python', 'Data Structures', 'SQL', 'Algorithms', 'Cloud Computing'];

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        // Only published notes visible to students
        if (note.status !== 'published') return false;

        const matchesSubject = selectedSubject === 'All' || note.subject === selectedSubject;
        const matchesQuery =
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

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

  const handleDownload = (note: StudyNote) => {
    if (!note.downloadAvailable || !note.fileUrl) {
      toast.warning('Download Unavailable', `The PDF file for "${note.title}" is currently being processed by the curriculum team.`);
      return;
    }

    ApiService.incrementNoteDownloads(note.id);
    setNotes(ApiService.getNotes());
    toast.success('Download Initiated', `Downloading ${note.title} (${note.fileSize})...`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-brand-500" />
            Study Notes & Reference PDFs
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
                    Read
                  </Button>

                  <Button
                    size="sm"
                    variant={note.downloadAvailable ? 'primary' : 'secondary'}
                    className="flex-1"
                    disabled={!note.downloadAvailable}
                    onClick={() => handleDownload(note)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    title={note.downloadAvailable ? `Download ${note.fileSize}` : 'PDF download unavailable for this document'}
                  >
                    {note.downloadAvailable ? 'PDF' : 'Draft'}
                  </Button>
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
                  Read
                </Button>
                <Button
                  size="sm"
                  variant={note.downloadAvailable ? 'primary' : 'secondary'}
                  disabled={!note.downloadAvailable}
                  onClick={() => handleDownload(note)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  title={note.downloadAvailable ? `Download ${note.fileSize}` : 'File unavailable'}
                >
                  {note.downloadAvailable ? `PDF (${note.fileSize})` : 'Processing'}
                </Button>
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
