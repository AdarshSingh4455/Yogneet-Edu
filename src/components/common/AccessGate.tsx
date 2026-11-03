import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { StudentAccessCategory } from '../../types';
import { ShieldAlert, Sparkles, Lock, ArrowUpRight, GraduationCap } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

export interface AccessGateProps {
  requiredTier?: StudentAccessCategory;
  isRestricted?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
  showCard?: boolean;
}

/**
 * Checks whether a student's access category satisfies the required tier.
 */
export function checkStudentEntitlement(
  userTier: StudentAccessCategory | undefined,
  requiredTier: StudentAccessCategory = 'standard',
  userRole?: string
): boolean {
  // Staff and Admins always have unrestricted platform access
  if (userRole === 'admin' || userRole === 'subadmin') {
    return true;
  }

  // Standard resources are available to all students
  if (!requiredTier || requiredTier === 'standard') {
    return true;
  }

  const effectiveTier = userTier || 'standard';

  // Pro tier users have access to Pro and Standard content
  if (effectiveTier === 'pro' && ((requiredTier as string) === 'pro' || (requiredTier as string) === 'standard')) {
    return true;
  }

  // Institutional Managed or Scholarship cohorts receive full entitlement
  if (effectiveTier === 'managed' || effectiveTier === 'scholarship') {
    return true;
  }

  // Exact tier match
  return (effectiveTier as string) === (requiredTier as string);
}

export const AccessGate: React.FC<AccessGateProps> = ({
  requiredTier = 'standard',
  isRestricted = false,
  children,
  fallback,
  title,
  description,
  showCard = true,
}) => {
  const { currentUser } = useAuth();

  // If not restricted or standard tier, allow immediately
  if (!isRestricted && requiredTier === 'standard') {
    return <>{children}</>;
  }

  const hasAccess = checkStudentEntitlement(
    currentUser.accessCategory,
    requiredTier,
    currentUser.role
  );

  if (hasAccess) {
    return <>{children}</>;
  }

  // If custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default Branded Entitlement Card
  const tierLabels: Record<StudentAccessCategory, string> = {
    standard: 'Free / Standard',
    pro: 'Pro Curriculum Tier',
    managed: 'Institutional Managed',
    scholarship: 'Scholarship Cohort',
  };

  const displayTitle = title || `${tierLabels[requiredTier]} Required`;
  const displayDesc =
    description ||
    `This premium technical resource requires ${tierLabels[requiredTier]} entitlement. Standard accounts can preview catalog metadata, but full downloads and evaluations are reserved for entitled cohorts.`;

  if (!showCard) {
    return null;
  }

  return (
    <Card className="p-6 border-dashed border-2 border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 dark:from-purple-950/20 dark:via-dark-card dark:to-indigo-950/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {displayTitle}
              </h3>
              <Badge variant="purple" size="sm">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  {requiredTier.toUpperCase()}
                </span>
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              {displayDesc}
            </p>
            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Your current tier: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{currentUser.accessCategory || 'standard'}</strong></span>
              <span>•</span>
              <span>Institutional access: Contact campus coordinator</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => window.location.href = 'mailto:support@yogneet.edu?subject=Entitlement Upgrade Request'}
          >
            Request Access
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
