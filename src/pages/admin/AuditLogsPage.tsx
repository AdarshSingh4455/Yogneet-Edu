import React, { useState } from 'react';
import { ApiService } from '../../services/api';
import { AuditService } from '../../services/api';
import { AuditLogEntry, AuditOutcome } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Info,
  Calendar,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

export const AuditLogsPage: React.FC = () => {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => ApiService.getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesOutcome = outcomeFilter === 'all' || log.outcome === outcomeFilter;

    return matchesSearch && matchesOutcome;
  });

  const handleExportCSV = () => {
    const csvContent = AuditService.exportCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `yogneet_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit Log Exported', 'Downloaded CSV file with compliance audit trail.');
  };

  const getOutcomeBadge = (outcome: AuditOutcome) => {
    switch (outcome) {
      case 'SUCCESS':
        return (
          <Badge variant="success" size="sm" dot>
            SUCCESS
          </Badge>
        );
      case 'DENIED':
        return (
          <Badge variant="warning" size="sm" dot>
            DENIED
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="danger" size="sm" dot>
            FAILED
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Compliance & Security
            </Badge>
            <span className="text-xs text-slate-400">Append-Only Audit Journal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            Platform Security & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Append-only record of administrative actions, permission assignments, content publications, and authentication events.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCSV}
          leftIcon={<Download className="w-4 h-4" />}
          className="self-start sm:self-auto"
        >
          Export CSV Log
        </Button>
      </div>

      {/* Production Notice Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
        <Info className="w-4 h-4 text-brand-500 shrink-0" />
        <span>
          <strong>Prototype Session Notice:</strong> Records shown here are persisted locally during development. In production, tamper-proof audit trails are signed and recorded by our trusted server-side logging pipeline.
        </span>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by actor, action, resource, or details..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 dark:focus:bg-dark-selected/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Outcome:</span>
          {['all', 'SUCCESS', 'DENIED', 'FAILED'].map(outcome => (
            <button
              key={outcome}
              onClick={() => setOutcomeFilter(outcome)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                outcomeFilter === outcome
                  ? 'bg-slate-800 text-white dark:bg-dark-selected dark:text-blue-300 dark:border dark:border-blue-500 font-semibold shadow-sm'
                  : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-hover dark:hover:text-blue-200 dark:hover:border-blue-800/40'
              }`}
            >
              {outcome === 'all' ? 'All Outcomes' : outcome}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={<FileSpreadsheet className="w-8 h-8 text-slate-400" />}
          title="No Audit Records Matched"
          description="We couldn't find any audit logs matching your current filters."
          actionLabel="Clear Filter"
          onAction={() => {
            setSearchQuery('');
            setOutcomeFilter('all');
          }}
        />
      ) : (
        <Card padding="none" className="overflow-hidden border border-light-border dark:border-dark-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-40">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors cursor-pointer"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <img
                              src={log.actor.avatar}
                              alt={log.actor.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[140px]">
                                {log.actor.name}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase">
                                {log.actor.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Action Key */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                            {log.action}
                          </span>
                        </td>

                        {/* Target Resource */}
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              {log.resourceType}
                            </span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs block">
                              {log.resourceId}
                            </span>
                          </div>
                        </td>

                        {/* Outcome Badge */}
                        <td className="py-3 px-4">
                          {getOutcomeBadge(log.outcome)}
                        </td>

                        {/* Expand Button */}
                        <td className="py-3 px-4 text-right">
                          <button
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-card transition-colors text-slate-400"
                            aria-label="Expand audit details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded View Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-dark-selected/40 border-l-2 border-l-brand-500 dark:border-l-blue-500">
                          <td colSpan={6} className="p-4 sm:p-5 border-t border-light-border dark:border-dark-border">
                            <div className="space-y-3 max-w-3xl">
                              <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Action Narrative
                                </span>
                                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                  {log.details}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                                <span>Event ID: {log.id}</span>
                                {log.ipAddress && <span>Origin IP: {log.ipAddress}</span>}
                              </div>

                              {/* Before / After State Changes JSON diff if available */}
                              {log.changes && (
                                <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto space-y-2">
                                  <div className="text-slate-400 uppercase text-[10px] font-bold">
                                    State Mutation Delta:
                                  </div>
                                  {log.changes.before && (
                                    <div>
                                      <span className="text-rose-400 font-bold">- Before: </span>
                                      <span>{JSON.stringify(log.changes.before, null, 2)}</span>
                                    </div>
                                  )}
                                  {log.changes.after && (
                                    <div>
                                      <span className="text-emerald-400 font-bold">+ After: </span>
                                      <span>{JSON.stringify(log.changes.after, null, 2)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
