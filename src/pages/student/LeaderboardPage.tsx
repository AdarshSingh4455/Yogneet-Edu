import React, { useState, useEffect, useMemo } from 'react';
import { LeaderboardService } from '../../services/leaderboardService';
import { LeaderboardEntry, StudentLeaderboardStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Trophy,
  Medal,
  Flame,
  Search,
  RefreshCw,
  CheckCircle2,
  Crown,
  HelpCircle,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [personalStatus, setPersonalStatus] = useState<StudentLeaderboardStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [list, status] = await Promise.all([
        LeaderboardService.getTop200Leaderboard(),
        isAuthenticated ? LeaderboardService.getStudentStatus(currentUser.id) : null,
      ]);
      setLeaderboard(list);
      setPersonalStatus(status);
    } catch {
      // keep defaults
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id, isAuthenticated]);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const q = searchQuery.toLowerCase();
    return leaderboard.filter(
      e =>
        e.studentName.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q))
    );
  }, [leaderboard, searchQuery]);

  const top3 = leaderboard.slice(0, 3);
  const rest = filteredLeaderboard.filter(e => e.rank > 3);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0C1E47] via-[#102454] to-[#0A1329] p-6 sm:p-8 text-white border border-amber-500/25 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 backdrop-blur-sm">
                <Trophy className="w-3.5 h-3.5 fill-amber-400" /> Top 200 Merit Hall of Fame
              </span>
              <span className="text-xs text-slate-400">Strict Top 200 Quota</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Competitive Student <span className="text-amber-400">Leaderboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Real-time rankings calculated from completed assessments, difficulty multipliers, and accuracy. Only the top 200 learners earn an authoritative platform rank.
            </p>
          </div>

          <div className="flex items-center justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="border-slate-700 bg-white/10 hover:bg-white/20 text-white"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh Rankings
            </Button>
          </div>
        </div>
      </div>

      {/* Current User Status Banner */}
      {isAuthenticated && personalStatus && (
        <Card className={`border ${personalStatus.inTop200 ? 'border-amber-500/30 bg-amber-500/5' : 'border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card/60'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 ${personalStatus.inTop200 ? 'bg-amber-500 text-yogneet-navy shadow-md shadow-amber-500/25' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                {personalStatus.inTop200 ? `#${personalStatus.rank}` : '—'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {currentUser.name}
                  </h3>
                  {personalStatus.inTop200 ? (
                    <Badge variant="brand" size="sm">
                      Ranked in Top 200
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Outside Top 200
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {personalStatus.inTop200
                    ? `You are currently holding rank #${personalStatus.rank} with a composite score of ${personalStatus.compositeScore}.`
                    : 'Only students inside the Top 200 receive a displayed rank. Complete more verified tests and maintain high accuracy to claim your rank!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Composite Score</span>
                <span className="text-sm font-extrabold text-amber-500">{personalStatus.compositeScore}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Completed Tests</span>
                <span className="text-sm font-extrabold">{personalStatus.testsCompleted}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Accuracy</span>
                <span className="text-sm font-extrabold text-emerald-500">{personalStatus.accuracyPercentage}%</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Top 3 Podium (Shown when not filtering search) */}
      {!searchQuery && top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 - Silver */}
          {top3[1] && (
            <Card className="order-2 md:order-1 border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-100/50 to-white dark:from-slate-800/40 dark:to-dark-card flex flex-col items-center text-center p-6 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full border-4 border-slate-300 dark:border-slate-600 p-0.5 mb-3 shadow-md relative">
                <img
                  src={top3[1].avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                  alt={top3[1].studentName}
                  className="w-full h-full rounded-full object-cover"
                />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-800 text-xs font-black flex items-center justify-center shadow">
                  2
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate max-w-full">
                {top3[1].studentName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{top3[1].department || 'Student'}</p>
              <div className="mt-3 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {top3[1].compositeScore} pts
              </div>
              <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                <span>{top3[1].testsCompleted} tests</span>
                <span>•</span>
                <span className="text-emerald-500 font-semibold">{top3[1].accuracyPercentage}% acc</span>
              </div>
            </Card>
          )}

          {/* Rank 1 - Gold (Center, Elevated) */}
          {top3[0] && (
            <Card className="order-1 md:order-2 border-amber-400/50 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white dark:to-dark-card flex flex-col items-center text-center p-6 relative overflow-hidden md:-translate-y-2 shadow-lg shadow-amber-500/10">
              <div className="absolute top-2 right-2">
                <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
              <div className="w-20 h-20 rounded-full border-4 border-amber-400 p-0.5 mb-3 shadow-lg shadow-amber-500/30 relative">
                <img
                  src={top3[0].avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'}
                  alt={top3[0].studentName}
                  className="w-full h-full rounded-full object-cover"
                />
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-yogneet-navy text-sm font-black flex items-center justify-center shadow-lg">
                  1
                </span>
              </div>
              <Badge variant="brand" size="sm" className="mb-1 bg-amber-500 text-yogneet-navy border-none font-bold">
                Platform Leader
              </Badge>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg truncate max-w-full">
                {top3[0].studentName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{top3[0].department || 'Student'}</p>
              <div className="mt-3 px-4 py-1.5 rounded-full bg-amber-500/20 text-sm font-mono font-extrabold text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {top3[0].compositeScore} pts
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                <span>{top3[0].testsCompleted} tests</span>
                <span>•</span>
                <span className="text-emerald-500 font-bold">{top3[0].accuracyPercentage}% acc</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-orange-500 font-bold">
                  <Flame className="w-3.5 h-3.5 fill-orange-500" /> {top3[0].streakDays}d
                </span>
              </div>
            </Card>
          )}

          {/* Rank 3 - Bronze */}
          {top3[2] && (
            <Card className="order-3 border-amber-700/30 bg-gradient-to-b from-amber-900/10 to-white dark:from-amber-950/20 dark:to-dark-card flex flex-col items-center text-center p-6 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full border-4 border-amber-700/60 p-0.5 mb-3 shadow-md relative">
                <img
                  src={top3[2].avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'}
                  alt={top3[2].studentName}
                  className="w-full h-full rounded-full object-cover"
                />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center shadow">
                  3
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate max-w-full">
                {top3[2].studentName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{top3[2].department || 'Student'}</p>
              <div className="mt-3 px-3 py-1 rounded-full bg-amber-900/20 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 border border-amber-900/30">
                {top3[2].compositeScore} pts
              </div>
              <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                <span>{top3[2].testsCompleted} tests</span>
                <span>•</span>
                <span className="text-emerald-500 font-semibold">{top3[2].accuracyPercentage}% acc</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Ranks 4 to 200 List */}
      <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border shadow-sm">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Authoritative Rankings (4 – 200)
            </h2>
            <Badge variant="default" size="sm">
              {filteredLeaderboard.length} of 200
            </Badge>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ranked student..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4 text-center">Tests Taken</th>
                <th className="py-3 px-4 text-center">Accuracy</th>
                <th className="py-3 px-4 text-center">Streak</th>
                <th className="py-3 px-4 text-right">Composite Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading verified Top 200 rankings...</span>
                  </td>
                </tr>
              ) : rest.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold">No ranked learners match your search.</p>
                  </td>
                </tr>
              ) : (
                rest.map(entry => {
                  const isCurrent = currentUser && currentUser.id === entry.studentId;
                  return (
                    <tr
                      key={entry.studentId}
                      className={`hover:bg-slate-50 dark:hover:bg-dark-cardHover/50 transition-colors ${isCurrent ? 'bg-amber-500/10 font-semibold' : ''}`}
                    >
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        #{entry.rank}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={entry.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {entry.studentName}
                              </span>
                              {entry.isPremium && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              {isCurrent && (
                                <Badge variant="brand" size="sm">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {entry.department}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs">
                        {entry.testsCompleted}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {entry.accuracyPercentage}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500">
                          <Flame className="w-3.5 h-3.5 fill-orange-500" />
                          {entry.streakDays}d
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                        {entry.compositeScore}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
