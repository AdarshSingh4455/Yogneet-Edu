import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { CodingProblem, DifficultyLevel, CodingProblemStatus } from '../../types';
import {
  Code2,
  Search,
  ExternalLink,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

export const CodingArenaPage: React.FC = () => {
  const [problems] = useState<CodingProblem[]>(() => ApiService.getCodingProblems());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const categories = ['All', 'Arrays & Hashing', 'Stack', 'Sliding Window', 'Dynamic Programming', 'Two Pointers'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];
  const statuses = ['All', 'Solved', 'Attempted', 'Not Started'];

  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;

      let matchesStat = true;
      if (selectedStatus === 'Solved') matchesStat = p.status === 'solved';
      else if (selectedStatus === 'Attempted') matchesStat = p.status === 'attempted';
      else if (selectedStatus === 'Not Started') matchesStat = p.status === 'not_started';

      return matchesSearch && matchesDiff && matchesCat && matchesStat;
    });
  }, [problems, searchQuery, selectedDifficulty, selectedCategory, selectedStatus]);

  const solvedCount = problems.filter(p => p.status === 'solved').length;
  const attemptedCount = problems.filter(p => p.status === 'attempted').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            Coding Arena
          </Badge>
          <span className="text-xs text-slate-400">LeetCode & GFG Style Directory</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-yogneet-orange/25 flex items-center justify-center p-1 shrink-0">
            <img src="/brand/features/feature-coding.png" alt="Coding Practice" className="w-full h-full object-contain" />
          </div>
          DSA &amp; Coding Practice Arena
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Solve curated algorithmic challenges hand-picked by <strong>Tech Geek Adarsh</strong>. Practice directly in our native code playground or access external LeetCode and GeeksforGeeks problems.
        </p>
      </div>

      {/* Solved Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Solved Problems</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {solvedCount} / {problems.length}
            </span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">In Progress</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {attemptedCount} Problems
            </span>
          </div>
        </Card>

        <Card padding="sm" className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Overall Target</span>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              150 Core Patterns
            </span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search problem title or tags..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/30 transition-all"
            />
          </div>

          {/* Difficulty and Status toggles */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="p-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/40 dark:hover:border-blue-700/60 cursor-pointer transition-all"
            >
              {difficulties.map(d => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Difficulties' : d}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="p-2 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/40 dark:hover:border-blue-700/60 cursor-pointer transition-all"
            >
              {statuses.map(s => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-500 dark:bg-blue-600 text-white shadow-sm dark:shadow-blue-glow dark:border dark:border-blue-400/50'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-900/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      {filteredProblems.length === 0 ? (
        <EmptyState
          icon={<Code2 className="w-8 h-8 text-slate-400" />}
          title="No Problems Found"
          description="We couldn't find any coding problems matching your current filter criteria."
          actionLabel="Reset Search"
          onAction={() => {
            setSearchQuery('');
            setSelectedDifficulty('All');
            setSelectedCategory('All');
            setSelectedStatus('All');
          }}
        />
      ) : (
        <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th className="py-3 px-4">Problem Title & Topics</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4 hidden md:table-cell">Acceptance</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {filteredProblems.map(p => {
                  const isSolved = p.status === 'solved';
                  const isAttempted = p.status === 'attempted';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors"
                    >
                      {/* Status Icon */}
                      <td className="py-3.5 px-4 text-center">
                        {isSolved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : isAttempted ? (
                          <Circle className="w-4 h-4 text-amber-500 fill-amber-500/20 mx-auto" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                        )}
                      </td>

                      {/* Title & Tags */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/coding/${p.slug}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-500 transition-colors block"
                        >
                          {p.title}
                        </Link>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {p.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-cardHover text-slate-500 dark:text-slate-400 font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Difficulty Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            p.difficulty === 'Easy'
                              ? 'success'
                              : p.difficulty === 'Medium'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {p.difficulty}
                        </Badge>
                      </td>

                      {/* Acceptance */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-xs font-semibold text-slate-500">
                        {p.acceptanceRate}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        {p.source === 'native' ? (
                          <Badge variant="brand" size="sm">
                            Yogneet Native
                          </Badge>
                        ) : p.source === 'leetcode' ? (
                          <Badge variant="outline" size="sm" className="font-mono">
                            LeetCode
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm" className="font-mono">
                            GeeksforGeeks
                          </Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {p.source === 'native' ? (
                          <Link to={`/coding/${p.slug}`}>
                            <Button size="sm">
                              {isSolved ? 'Review' : 'Solve'}
                            </Button>
                          </Link>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/coding/${p.slug}`}>
                              <Button size="sm" variant="outline">
                                Playground
                              </Button>
                            </Link>
                            {p.externalUrl && (
                              <a
                                href={p.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-light-border dark:border-dark-border text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-cardHover transition-colors"
                                title="Open official problem page"
                                aria-label="Open official problem page"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
