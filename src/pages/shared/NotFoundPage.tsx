import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 sm:p-12 animate-in fade-in duration-200">
      <div className="w-20 h-20 rounded-3xl bg-yogneet-navy border border-yogneet-cyan/30 flex items-center justify-center mb-6 shadow-xl p-2.5">
        <img
          src="/brand/yogneet-logo.png"
          alt="Yogneet Edu"
          className="w-full h-full object-contain"
        />
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
          <Button size="sm" className="bg-yogneet-cyan hover:bg-yogneet-cyanHover text-yogneet-navy font-bold border-none">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
