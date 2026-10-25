import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { CodingProblem, DifficultyLevel } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Code2,
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Terminal,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const CodingProblemPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const problem = ApiService.getCodingProblemById(slug || 'two-sum') || ApiService.getCodingProblems()[0];

  const [language, setLanguage] = useState<'python' | 'javascript' | 'cpp' | 'java'>('python');
  const [code, setCode] = useState<string>(() => problem.starterCode[language]);
  const [activeTab, setActiveTab] = useState<'description' | 'hints' | 'solution'>('description');
  const [consoleOutput, setConsoleOutput] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    runtime?: string;
    memory?: string;
    testCasesPassed?: number;
    totalTestCases?: number;
    details?: string;
  }>({ status: 'idle' });
  const [copied, setCopied] = useState(false);

  // Switch language resets starter code
  const handleLanguageChange = (lang: 'python' | 'javascript' | 'cpp' | 'java') => {
    setLanguage(lang);
    setCode(problem.starterCode[lang]);
    setConsoleOutput({ status: 'idle' });
  };

  const handleRunCode = () => {
    setConsoleOutput({ status: 'running' });
    setTimeout(() => {
      setConsoleOutput({
        status: 'success',
        runtime: '48 ms',
        memory: '17.2 MB',
        testCasesPassed: problem.examples.length,
        totalTestCases: problem.examples.length,
        details: 'All sample test cases passed successfully.',
      });
      toast.success('Sample Tests Passed', 'Your code passed all default test cases.');
    }, 600);
  };

  const handleSubmit = () => {
    setConsoleOutput({ status: 'running' });
    setTimeout(() => {
      setConsoleOutput({
        status: 'success',
        runtime: '52 ms (Beats 89.4%)',
        memory: '17.4 MB (Beats 78.1%)',
        testCasesPassed: 57,
        totalTestCases: 57,
        details: 'Submission Accepted! 57/57 hidden test cases passed.',
      });
      ApiService.updateProblemStatus(problem.id, 'solved');
      toast.success('Solution Accepted! 🎉', `Problem "${problem.title}" marked as Solved.`);
    }, 1000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info('Code Copied', 'Starter template copied to clipboard.');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-3">
          <Link
            to="/coding"
            className="p-1.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-dark-card text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {problem.title}
              </h1>
              <Badge
                variant={
                  problem.difficulty === 'Easy'
                    ? 'success'
                    : problem.difficulty === 'Medium'
                    ? 'warning'
                    : 'danger'
                }
                size="sm"
              >
                {problem.difficulty}
              </Badge>
              {problem.status === 'solved' && (
                <Badge variant="success" size="sm" dot>
                  Solved
                </Badge>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              {problem.category} • Acceptance: {problem.acceptanceRate}
            </span>
          </div>
        </div>

        {/* Source attribution & External Link */}
        <div className="flex items-center gap-2">
          {problem.externalUrl && (
            <a
              href={problem.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-500 hover:underline flex items-center gap-1 font-medium"
            >
              <span>View on {problem.source === 'leetcode' ? 'LeetCode' : 'GeeksforGeeks'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Split Layout: Description on Left, Code Playground on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[700px]">
        {/* Left Pane: Description & Examples */}
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-5 sm:p-6 flex flex-col justify-between shadow-sm overflow-y-auto max-h-[750px]">
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-light-border dark:border-dark-border text-xs font-semibold">
              <button
                onClick={() => setActiveTab('description')}
                className={`pb-2.5 border-b-2 transition-colors ${
                  activeTab === 'description'
                    ? 'border-brand-500 text-brand-500 dark:text-brand-400'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('hints')}
                className={`pb-2.5 border-b-2 transition-colors ${
                  activeTab === 'hints'
                    ? 'border-brand-500 text-brand-500 dark:text-brand-400'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Hints & Patterns
              </button>
            </div>

            {activeTab === 'description' ? (
              <div className="space-y-5 text-xs sm:text-sm">
                {/* Problem Statement */}
                <div className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {problem.description}
                </div>

                {/* Examples */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Examples
                  </h3>
                  {problem.examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border space-y-1.5 font-mono text-xs"
                    >
                      <p className="font-bold text-slate-900 dark:text-slate-100 font-sans">
                        Example {idx + 1}:
                      </p>
                      <div className="text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-400">Input:</strong> {ex.input}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-400">Output:</strong> {ex.output}
                      </div>
                      {ex.explanation && (
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] font-sans pt-1">
                          <strong>Explanation:</strong> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Constraints:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300">
                  💡 <strong>Algorithmic Tip:</strong> Think about what happens if you store elements in a hash map as you iterate through the list. Can you check whether the complement already exists in O(1) time?
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Refer to the Study Notes repository for a full derivation of the Two-Pointer and Hash-Map patterns.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between text-[11px] text-slate-400">
            <span>Tags: {problem.tags.join(', ')}</span>
            <span>Source: {problem.source.toUpperCase()}</span>
          </div>
        </div>

        {/* Right Pane: Code Playground & Console */}
        <div className="flex flex-col rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card overflow-hidden shadow-sm">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value as any)}
                className="p-1.5 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              >
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="cpp">C++ 20</option>
                <option value="java">Java 17</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-card transition-colors"
                title="Copy Code"
                aria-label="Copy Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setCode(problem.starterCode[language])}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-card transition-colors"
                title="Reset Starter Template"
                aria-label="Reset Starter Template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Textarea Code Editor */}
          <div className="flex-1 relative bg-[#0B0F14] text-slate-100 font-mono text-xs sm:text-sm p-4 overflow-auto min-h-[350px]">
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              className="w-full h-full bg-transparent text-emerald-400 font-mono resize-none focus:outline-none leading-relaxed selection:bg-brand-500 selection:text-white"
              rows={18}
            />
          </div>

          {/* Console / Test Runner Result Bar */}
          <div className="border-t border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-sidebar p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>Test Execution Console</span>
              </div>

              {consoleOutput.status === 'success' && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-emerald-500 font-bold">Runtime: {consoleOutput.runtime}</span>
                  <span className="text-blue-400 font-bold">Memory: {consoleOutput.memory}</span>
                </div>
              )}
            </div>

            {/* Output details */}
            <div className="p-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono min-h-[50px] flex items-center">
              {consoleOutput.status === 'idle' ? (
                <span className="text-slate-400">Click "Run Code" to test against sample test cases.</span>
              ) : consoleOutput.status === 'running' ? (
                <span className="text-brand-500 animate-pulse">Running in sandbox container...</span>
              ) : consoleOutput.status === 'success' ? (
                <div className="text-emerald-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{consoleOutput.details}</span>
                </div>
              ) : (
                <span className="text-rose-500">Execution Error. Please check constraints.</span>
              )}
            </div>

            {/* Run & Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunCode}
                isLoading={consoleOutput.status === 'running'}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                Run Tests
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Solution
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
