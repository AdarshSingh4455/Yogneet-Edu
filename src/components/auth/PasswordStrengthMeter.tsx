import React from 'react';
import { Check, X, Shield, ShieldCheck, AlertCircle } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export interface PasswordAnalysis {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function analyzePassword(password: string): PasswordAnalysis {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const count = Object.values(requirements).filter(Boolean).length;

  let score = 0;
  let label: PasswordAnalysis['label'] = 'Very Weak';
  let color = 'bg-rose-500';

  if (count <= 1) {
    score = 0;
    label = 'Very Weak';
    color = 'bg-rose-500';
  } else if (count === 2) {
    score = 1;
    label = 'Weak';
    color = 'bg-amber-500';
  } else if (count === 3) {
    score = 2;
    label = 'Medium';
    color = 'bg-yellow-500';
  } else if (count === 4) {
    score = 3;
    label = 'Strong';
    color = 'bg-blue-500';
  } else {
    score = 4;
    label = 'Very Strong';
    color = 'bg-emerald-500';
  }

  return { score, label, color, requirements };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const analysis = analyzePassword(password);

  return (
    <div className="space-y-2 mt-2">
      {/* Strength indicator bar */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Password Strength:</span>
        <span className={`font-bold ${
          analysis.score <= 1 ? 'text-rose-500' : analysis.score === 2 ? 'text-amber-500' : analysis.score === 3 ? 'text-blue-500' : 'text-emerald-500'
        }`}>
          {analysis.label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[0, 1, 2, 3].map(step => (
          <div
            key={step}
            className={`rounded-full transition-colors duration-200 ${
              step <= analysis.score ? analysis.color : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Rules checklist */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
        <div className={`flex items-center gap-1.5 ${analysis.requirements.minLength ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {analysis.requirements.minLength ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-40" />}
          <span>Min 8 characters</span>
        </div>
        <div className={`flex items-center gap-1.5 ${analysis.requirements.hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {analysis.requirements.hasUppercase ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-40" />}
          <span>Uppercase letter</span>
        </div>
        <div className={`flex items-center gap-1.5 ${analysis.requirements.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {analysis.requirements.hasNumber ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-40" />}
          <span>At least 1 number</span>
        </div>
        <div className={`flex items-center gap-1.5 ${analysis.requirements.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {analysis.requirements.hasSpecial ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-40" />}
          <span>Special character</span>
        </div>
      </div>
    </div>
  );
};
