import { AuditLogEntry, AuditOutcome, UserProfile } from '../types';
import { INITIAL_AUDIT_LOGS } from './mockData';

const STORAGE_KEY = 'yogneet_audit_logs';

function loadAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse audit logs from storage', e);
  }
  return INITIAL_AUDIT_LOGS;
}

function saveAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save audit logs to storage', e);
  }
}

let memoryLogs: AuditLogEntry[] = loadAuditLogs();

export const AuditService = {
  getAll(): AuditLogEntry[] {
    return [...memoryLogs];
  },

  log(
    actor: UserProfile,
    action: string,
    resourceType: string,
    resourceId: string,
    details: string,
    outcome: AuditOutcome = 'SUCCESS',
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
  ): AuditLogEntry {
    const now = new Date();
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

    const newEntry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: formattedDate,
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        avatar: actor.avatar,
        role: actor.role,
      },
      action,
      resourceType,
      resourceId,
      details,
      outcome,
      ipAddress: '192.168.1.' + Math.floor(100 + Math.random() * 50),
      changes,
    };

    memoryLogs = [newEntry, ...memoryLogs];
    saveAuditLogs(memoryLogs);
    return newEntry;
  },

  exportCSV(): string {
    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Role', 'Action', 'Resource Type', 'Resource ID', 'Details', 'Outcome'];
    const rows = memoryLogs.map(log => [
      `"${log.timestamp}"`,
      `"${log.actor.name}"`,
      `"${log.actor.email}"`,
      `"${log.actor.role}"`,
      `"${log.action}"`,
      `"${log.resourceType}"`,
      `"${log.resourceId.replace(/"/g, '""')}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.outcome}"`,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  reset(): void {
    memoryLogs = [...INITIAL_AUDIT_LOGS];
    saveAuditLogs(memoryLogs);
  },
};
