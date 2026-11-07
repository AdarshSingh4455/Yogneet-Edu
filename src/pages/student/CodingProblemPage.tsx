import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { CodingService } from '../../services/codingService';
import {
  CodeExecutionService,
  SupportedLanguage,
  SampleTestCaseResult,
} from '../../services/codeExecutionService';
import { CodingProblem, DifficultyLevel } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Code2,
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Terminal,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CodeEditor } from '../../components/coding/CodeEditor';

export const CodingProblemPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();

  const initialProblem = ApiService.getCodingProblemById(slug || 'two-sum') || ApiService.getCodingProblems()[0];
  const [problem, setProblem] = useState<CodingProblem>(initialProblem);

  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(() => initialProblem.starterCode[language] || '# Write code\n');

  useEffect(() => {
    if (slug) {
      CodingService.getProblemBySlug(slug).then((p) => {
        if (p) {
          setProblem(p);
          if (p.starterCode && p.starterCode[language]) {
            setCode(p.starterCode[language]);
          }
        }
      });
    }
  }, [slug]);

  const [activeTab, setActiveTab] = useState<'description' | 'hints' | 'solution'>('description');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'test_results' | 'custom_input'>('test_results');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0);
  const [customInputText, setCustomInputText] = useState<string>('');
  const [isConsoleExpanded, setIsConsoleExpanded] = useState<boolean>(true);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState<boolean>(false);
  const [showEnvInfo, setShowEnvInfo] = useState<boolean>(false);

  const [consoleOutput, setConsoleOutput] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    runtime?: string;
    memory?: string;
    testCasesPassed?: number;
    totalTestCases?: number;
    details?: string;
    sampleResults?: SampleTestCaseResult[];
    customResult?: {
      stdout?: string;
      stderr?: string;
      compileOutput?: string;
      status: string;
      runtimeMs: number;
      memoryMb: number;
      errorMessage?: string;
    };
  }>({ status: 'idle' });

  const [copied, setCopied] = useState(false);

  // Switch language resets starter code
  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setCode(problem.starterCode[lang] || '');
    setConsoleOutput({ status: 'idle' });
  };

  const handleRunCode = async () => {
    setConsoleOutput((prev) => ({ ...prev, status: 'running' }));
    setActiveConsoleTab('test_results');
    try {
      const summary = await CodeExecutionService.runSampleTestCases(
        code,
        language,
        problem.examples
      );

      if (summary.status === 'success') {
        setConsoleOutput({
          status: 'success',
          runtime: `${summary.totalRuntimeMs} ms`,
          memory: `${summary.maxMemoryMb} MB`,
          testCasesPassed: summary.casesPassed,
          totalTestCases: summary.totalCases,
          details: summary.details,
          sampleResults: summary.results,
        });
        toast.success('Sample Tests Passed', `Passed all ${summary.totalCases} sample test cases.`);
      } else {
        const firstFailed = summary.results.find((r) => !r.passed);
        setConsoleOutput({
          status: 'error',
          runtime: `${summary.totalRuntimeMs} ms`,
          memory: `${summary.maxMemoryMb} MB`,
          testCasesPassed: summary.casesPassed,
          totalTestCases: summary.totalCases,
          details: firstFailed?.errorMessage || summary.details,
          sampleResults: summary.results,
        });
        toast.warning('Sample Tests Failed', `Passed ${summary.casesPassed}/${summary.totalCases} sample test cases.`);
      }
    } catch (err: any) {
      setConsoleOutput({
        status: 'error',
        details: err.message || 'Execution error during sample test evaluation.',
      });
      toast.error('Execution Error', err.message);
    }
  };

  const handleRunCustomInput = async () => {
    if (!customInputText.trim()) {
      toast.warning('Custom Input Empty', 'Please provide custom input before running.');
      return;
    }

    setConsoleOutput((prev) => ({ ...prev, status: 'running' }));
    setActiveConsoleTab('custom_input');

    try {
      const exec = await CodeExecutionService.executeCustomInput(code, language, customInputText);
      setConsoleOutput({
        status: exec.status === 'accepted' ? 'success' : 'error',
        runtime: `${exec.runtimeMs} ms`,
        memory: `${exec.memoryMb} MB`,
        details: exec.status === 'accepted' ? 'Custom input executed successfully.' : (exec.errorMessage || 'Execution encountered an error.'),
        customResult: {
          stdout: exec.stdout,
          stderr: exec.stderr,
          compileOutput: exec.compileOutput,
          status: exec.status,
          runtimeMs: exec.runtimeMs,
          memoryMb: exec.memoryMb,
          errorMessage: exec.errorMessage,
        },
      });
      if (exec.status === 'accepted') {
        toast.success('Custom Input Executed', `Completed in ${exec.runtimeMs} ms.`);
      } else {
        toast.warning('Execution Alert', exec.errorMessage || 'Check input constraints or error output.');
      }
    } catch (err: any) {
      setConsoleOutput({
        status: 'error',
        details: err.message || 'Execution error during custom input evaluation.',
      });
      toast.error('Execution Error', err.message);
    }
  };

  const handleSubmit = async () => {
    setConsoleOutput((prev) => ({ ...prev, status: 'running' }));
    try {
      const res = await CodingService.submitSolution(problem.id, language, code);
      if (res.status === 'accepted') {
        setConsoleOutput({
          status: 'success',
          runtime: `${res.runtimeMs || 45} ms`,
          memory: `${res.memoryMb || 16.5} MB`,
          testCasesPassed: res.testCasesPassed,
          totalTestCases: res.totalTestCases,
          details: `Submission Accepted! ${res.testCasesPassed}/${res.totalTestCases} test cases passed.`,
        });
        ApiService.updateProblemStatus(problem.id, 'solved');
        toast.success('Solution Accepted! 🎉', `Problem "${problem.title}" marked as Solved.`);
      } else {
        setConsoleOutput({
          status: 'error',
          runtime: `${res.runtimeMs || 0} ms`,
          testCasesPassed: res.testCasesPassed,
          totalTestCases: res.totalTestCases,
          details: res.errorMessage || 'Solution failed hidden test case validation.',
        });
        toast.warning('Test Cases Failed', `Passed ${res.testCasesPassed}/${res.totalTestCases} test cases.`);
      }
    } catch (err: any) {
      setConsoleOutput({
        status: 'error',
        details: err.message || 'Execution error during test case evaluation.',
      });
      toast.error('Evaluation Error', err.message);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info('Code Copied', 'Template copied to clipboard.');
  };

  const sampleResults = consoleOutput.sampleResults || [];
  const currentCaseResult = sampleResults[selectedCaseIdx];
  const currentExample = problem.examples[selectedCaseIdx] || problem.examples[0];

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

      {/* Main Split Layout: Description on Left, Monaco Editor & Console on Right */}
      <div className={`grid ${isEditorFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6 min-h-[700px]`}>
        {/* Left Pane: Description & Examples */}
        {!isEditorFullscreen && (
          <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card p-5 sm:p-6 flex flex-col justify-between shadow-sm overflow-y-auto max-h-[820px]">
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-light-border dark:border-dark-border text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    activeTab === 'description'
                      ? 'border-brand-500 text-brand-500 dark:border-blue-500 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-blue-200'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('hints')}
                  className={`pb-2.5 border-b-2 transition-colors ${
                    activeTab === 'hints'
                      ? 'border-brand-500 text-brand-500 dark:border-blue-500 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-blue-200'
                  }`}
                >
                  Hints & Patterns
                </button>
              </div>

              {activeTab === 'description' ? (
                <div className="space-y-5 text-xs sm:text-sm">
                  {/* Problem Statement */}
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-sans">
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
                    💡 <strong>Algorithmic Tip:</strong> Think about optimal time and space complexity. For array problems, can a hash map or two-pointer approach reduce an O(N²) search to O(N)?
                  </div>
                  {problem.hints && problem.hints.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 text-xs">
                      {problem.hints.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Refer to your course DSA notes for detailed pattern derivations.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between text-[11px] text-slate-400">
              <span>Tags: {problem.tags.join(', ')}</span>
              <span>Source: {problem.source.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Right Pane: Professional Code Editor & Console Drawer */}
        <div className="flex flex-col rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card overflow-hidden shadow-sm">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-dark-sidebar border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                className="p-1.5 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer transition-all"
              >
                <option value="python">Python 3 (3.10+)</option>
                <option value="javascript">JavaScript (Node 18+)</option>
                <option value="cpp">C++ 20 (GCC 9+)</option>
                <option value="java">Java 17 (OpenJDK)</option>
              </select>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEnvInfo(!showEnvInfo)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-blue-200 hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
                  title="Compiler Environment Info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                {showEnvInfo && (
                  <div className="absolute left-0 mt-2 z-30 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-300 shadow-2xl space-y-1 font-mono">
                    <p className="font-bold text-white font-sans text-xs mb-1">Execution Sandbox</p>
                    <p>• Isolated Judge0 CE Container</p>
                    <p>• Wall Time Limit: 2.0s</p>
                    <p>• Memory Limit: 256MB</p>
                    <p>• Auto-Harness: LeetCode class Solution</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-blue-200 hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
                title="Copy Code"
                aria-label="Copy Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Reset Code button styled prominently matching HackerRank / user screenshot */}
              <button
                onClick={() => {
                  setCode(problem.starterCode[language] || '');
                  toast.info('Code Reset', 'Starter template restored.');
                }}
                className="p-1.5 rounded-lg border border-emerald-500/40 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all"
                title="Reset Starter Template"
                aria-label="Reset Starter Template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsEditorFullscreen(!isEditorFullscreen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-blue-200 hover:bg-slate-200 dark:hover:bg-dark-hover transition-colors"
                title={isEditorFullscreen ? 'Exit Fullscreen' : 'Maximize Editor'}
                aria-label={isEditorFullscreen ? 'Exit Fullscreen' : 'Maximize Editor'}
              >
                {isEditorFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[380px] bg-[#0B0F14]">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height={isEditorFullscreen ? '540px' : (isConsoleExpanded ? '380px' : '520px')}
            />
          </div>

          {/* Console / Test Runner Result Drawer */}
          <div className="border-t border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-sidebar p-3 sm:p-4 space-y-3 transition-all">
            {/* Drawer Header Toggle Bar */}
            <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border pb-2">
              <div className="flex items-center gap-3 text-xs font-bold">
                <button
                  onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
                  className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-brand-500 dark:hover:text-blue-400 transition-colors"
                >
                  {isConsoleExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  <span>Test Results</span>
                </button>

                {isConsoleExpanded && (
                  <>
                    <button
                      onClick={() => setActiveConsoleTab('test_results')}
                      className={`flex items-center gap-1.5 pb-0.5 border-b-2 transition-colors ${
                        activeConsoleTab === 'test_results'
                          ? 'border-brand-500 text-brand-500 dark:text-blue-400 font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Cases</span>
                    </button>
                    <button
                      onClick={() => setActiveConsoleTab('custom_input')}
                      className={`flex items-center gap-1.5 pb-0.5 border-b-2 transition-colors ${
                        activeConsoleTab === 'custom_input'
                          ? 'border-brand-500 text-brand-500 dark:text-blue-400 font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Custom Input</span>
                    </button>
                  </>
                )}
              </div>

              {consoleOutput.runtime && (
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {consoleOutput.runtime}
                  </span>
                  <span className="text-blue-400 font-bold flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {consoleOutput.memory}
                  </span>
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isConsoleExpanded && (
              <>
                {/* TAB 1: Test Results with Per-Case Navigation */}
            {activeConsoleTab === 'test_results' && (
              <div className="space-y-3">
                {/* Test Case Selection Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {problem.examples.map((_, idx) => {
                    const result = sampleResults[idx];
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedCaseIdx(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                          selectedCaseIdx === idx
                            ? 'bg-slate-900 text-white dark:bg-slate-700'
                            : 'bg-slate-200 text-slate-600 dark:bg-dark-card dark:text-slate-400 hover:bg-slate-300'
                        }`}
                      >
                        {result ? (
                          result.passed ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-400" />
                          )
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                        )}
                        <span>Case {idx + 1}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Test Case Card */}
                <div className="p-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono space-y-2">
                  {consoleOutput.status === 'running' ? (
                    <div className="flex items-center gap-2 text-brand-500 animate-pulse py-2">
                      <span className="w-2 h-2 rounded-full bg-brand-500" />
                      <span>Executing in isolated Judge0 CE container...</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-400 font-sans block text-[11px] font-semibold">Input:</span>
                        <div className="p-2 rounded bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-slate-700 dark:text-slate-200 mt-0.5">
                          {currentExample?.input || 'No input defined'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 font-sans block text-[11px] font-semibold">Expected Output:</span>
                          <div className="p-2 rounded bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {currentExample?.output || 'No expected output'}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 font-sans block text-[11px] font-semibold">Your Output:</span>
                          <div
                            className={`p-2 rounded bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border mt-0.5 ${
                              currentCaseResult
                                ? currentCaseResult.passed
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {currentCaseResult
                              ? currentCaseResult.actualOutput
                              : 'Click "Run Tests" to execute'}
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic details / Error report */}
                      {consoleOutput.status === 'error' && (
                        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Execution Diagnostic</span>
                          </div>
                          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                            {consoleOutput.details}
                          </pre>
                        </div>
                      )}

                      {consoleOutput.status === 'success' && (
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{consoleOutput.details}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Custom Input Playground */}
            {activeConsoleTab === 'custom_input' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Custom Standard Input (stdin):
                  </label>
                  <textarea
                    rows={3}
                    value={customInputText}
                    onChange={(e) => setCustomInputText(e.target.value)}
                    placeholder={'e.g. nums = [3, 2, 4], target = 6'}
                    className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                </div>

                {consoleOutput.customResult && (
                  <div className="p-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-xs font-mono space-y-2">
                    <span className="text-slate-400 font-sans block text-[11px] font-semibold">Custom Output:</span>
                    <pre className="p-2 rounded bg-slate-50 dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {consoleOutput.customResult.stdout || consoleOutput.customResult.errorMessage || '(no stdout produced)'}
                    </pre>

                    {consoleOutput.customResult.stderr && (
                      <div>
                        <span className="text-rose-400 font-sans block text-[11px] font-semibold">Standard Error:</span>
                        <pre className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-[11px] whitespace-pre-wrap">
                          {consoleOutput.customResult.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </>
          )}

          {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Judge0 CE • 2.0s CPU • 256MB RAM
              </span>

              <div className="flex items-center gap-3">
                {activeConsoleTab === 'custom_input' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunCustomInput}
                    isLoading={consoleOutput.status === 'running'}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Run Custom Input
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunCode}
                    isLoading={consoleOutput.status === 'running'}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Run Tests
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  isLoading={consoleOutput.status === 'running'}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Submit Solution
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
