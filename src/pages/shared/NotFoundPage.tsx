import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 sm:p-12 animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center text-slate-400 mb-4 shadow-sm">
        <HelpCircle className="w-8 h-8" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
        404 — Page Not Found
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
        The educational page or resource you requested does not exist or may have been relocated.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <Button variant="outline" size="sm" onClick={() => window.history.back()} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Go Back
        </Button>
        <Link to="/dashboard">
          <Button size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
