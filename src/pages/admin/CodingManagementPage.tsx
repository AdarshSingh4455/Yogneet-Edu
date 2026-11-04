import React, { useState, useEffect, useCallback } from 'react';
import { CodingService, CodingProblemInput } from '../../services/codingService';
import { CodingProblem, CodingTestCase, DifficultyLevel } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Code2,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Sparkles,
  Archive,
  RefreshCw,
  HelpCircle,
  Check,
  X,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const CodingManagementPage: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();

  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);
  const [isTestCasesModalOpen, setIsTestCasesModalOpen] = useState(false);
  const [activeProblemForTests, setActiveProblemForTests] = useState<CodingProblem | null>(null);
  const [testCases, setTestCases] = useState<CodingTestCase[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkErrors, setBulkErrors] = useState<{ index: number; title: string; reason: string }[]>([]);
  const [problemToDelete, setProblemToDelete] = useState<CodingProblem | null>(null);

  // Form state for Create / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<DifficultyLevel>('Easy');
  const [formCategory, setFormCategory] = useState('Arrays & Hashing');
  const [formDescription, setFormDescription] = useState('');
  const [formConstraints, setFormConstraints] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formHints, setFormHints] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [starterPython, setStarterPython] = useState('def solution():\n    pass\n');
  const [starterJs, setStarterJs] = useState('function solution() {\n}\n');
  const [starterCpp, setStarterCpp] = useState('class Solution {\npublic:\n};\n');
  const [starterJava, setStarterJava] = useState('class Solution {\n}\n');

  // New test case state
  const [tcInput, setTcInput] = useState('');
  const [tcExpected, setTcExpected] = useState('');
  const [tcIsHidden, setTcIsHidden] = useState(false);
  const [tcExplanation, setTcExplanation] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await CodingService.getProblems(true);
      setProblems(data);
    } catch (err: any) {
      toast.error('Failed to load coding problems', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingProblem(null);
    setFormTitle('');
    setFormDifficulty('Easy');
    setFormCategory('Arrays & Hashing');
    setFormDescription('');
    setFormConstraints('1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9');
    setFormTags('Array, Hash Table');
    setFormHints('Consider using a dictionary to store previously seen values.\nCheck for target complement in one pass.');
    setFormExplanation('');
    setFormStatus('published');
    setStarterPython('def solution():\n    pass\n');
    setStarterJs('function solution() {\n}\n');
    setStarterCpp('class Solution {\npublic:\n};\n');
    setStarterJava('class Solution {\n}\n');
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (prob: CodingProblem) => {
    setEditingProblem(prob);
    setFormTitle(prob.title);
    setFormDifficulty(prob.difficulty);
    setFormCategory(prob.category);
    setFormDescription(prob.description);
    setFormConstraints((prob.constraints || []).join('\n'));
    setFormTags((prob.tags || []).join(', '));
    setFormHints((prob.hints || []).join('\n'));
    setFormExplanation(prob.solutionExplanation || '');
    setFormStatus(prob.publicationStatus || 'published');
    setStarterPython(prob.starterCode.python || '');
    setStarterJs(prob.starterCode.javascript || '');
    setStarterCpp(prob.starterCode.cpp || '');
    setStarterJava(prob.starterCode.java || '');
    setIsEditModalOpen(true);
  };

  // Save Problem
  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.warning('Incomplete Form', 'Please provide a title and problem description.');
      return;
    }

    try {
      const payload: CodingProblemInput = {
        title: formTitle.trim(),
        difficulty: formDifficulty,
        category: formCategory.trim(),
        description: formDescription.trim(),
        constraints: formConstraints.split('\n').map(s => s.trim()).filter(Boolean),
        tags: formTags.split(',').map(s => s.trim()).filter(Boolean),
        hints: formHints.split('\n').map(s => s.trim()).filter(Boolean),
        solution_explanation: formExplanation.trim() || undefined,
        status: formStatus,
        starter_code: {
          python: starterPython,
          javascript: starterJs,
          cpp: starterCpp,
          java: starterJava,
        },
      };

      if (editingProblem) {
        await CodingService.updateProblem(editingProblem.id, payload);
        toast.success('Problem Updated', `"${formTitle}" changes have been saved.`);
      } else {
        await CodingService.createProblem(payload);
        toast.success('Problem Created', `"${formTitle}" is now ready for coding practice.`);
      }
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Failed to save challenge', err.message);
    }
  };

  // Test Cases Management
  const handleOpenTestCases = async (prob: CodingProblem) => {
    setActiveProblemForTests(prob);
    setIsTestCasesModalOpen(true);
    try {
      const cases = await CodingService.getAdminTestCases(prob.id);
      setTestCases(cases);
    } catch (err: any) {
      toast.error('Failed to load test cases', err.message);
    }
  };

  const handleAddTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProblemForTests || !tcInput.trim() || !tcExpected.trim()) {
      toast.warning('Input Required', 'Please provide both test case input and expected output.');
      return;
    }

    try {
      await CodingService.saveTestCase({
        problemId: activeProblemForTests.id,
        input: tcInput.trim(),
        expectedOutput: tcExpected.trim(),
        isHidden: tcIsHidden,
        explanation: tcExplanation.trim() || undefined,
        orderIndex: testCases.length + 1,
      });

      toast.success('Test Case Added', tcIsHidden ? 'Added hidden evaluation case.' : 'Added public sample case.');
      setTcInput('');
      setTcExpected('');
      setTcExplanation('');
      setTcIsHidden(false);

      const refreshed = await CodingService.getAdminTestCases(activeProblemForTests.id);
      setTestCases(refreshed);
    } catch (err: any) {
      toast.error('Failed to add test case', err.message);
    }
  };

  const handleDeleteTestCase = async (tcId: string) => {
    try {
      await CodingService.deleteTestCase(tcId);
      toast.info('Test Case Removed');
      if (activeProblemForTests) {
        const refreshed = await CodingService.getAdminTestCases(activeProblemForTests.id);
        setTestCases(refreshed);
      }
    } catch (err: any) {
      toast.error('Deletion failed', err.message);
    }
  };

  // Delete Problem Confirm
  const handleDeleteConfirm = async () => {
    if (!problemToDelete) return;
    try {
      await CodingService.deleteProblem(problemToDelete.id);
      toast.success('Problem Deleted', `"${problemToDelete.title}" was removed.`);
      setProblemToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error('Deletion failed', err.message);
    }
  };

  // Bulk Upload
  const handleDownloadTemplate = () => {
    const template = [
      {
        title: 'Two Sum',
        slug: 'two-sum-dsa',
        difficulty: 'Easy',
        category: 'Arrays & Hashing',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9'],
        tags: ['Array', 'Hash Table'],
        hints: ['Use a hash map to look up the complement in O(1) time.'],
        solution_explanation: 'We iterate through the array and check if complement exists in the dictionary.',
        status: 'published',
        starter_code: {
          python: 'def twoSum(nums: list[int], target: int) -> list[int]:\n    # code here\n    pass\n',
          javascript: 'function twoSum(nums, target) {\n    // code here\n}\n',
          cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n    }\n};\n',
          java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n    }\n}\n',
        },
        test_cases: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            expected_output: '[0,1]',
            is_hidden: false,
            explanation: 'nums[0] + nums[1] == 9',
          },
          {
            input: 'nums = [3,2,4], target = 6',
            expected_output: '[1,2]',
            is_hidden: true,
          },
        ],
      },
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yogneet_coding_questions_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUploadSubmit = async () => {
    setBulkErrors([]);
    let parsed: any;
    try {
      parsed = JSON.parse(bulkJsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Root JSON must be an array of problem objects.');
      }
    } catch (err: any) {
      toast.error('Invalid JSON', err.message);
      return;
    }

    try {
      const res = await CodingService.bulkUploadProblems(parsed);
      if (res.errors.length > 0) {
        setBulkErrors(res.errors);
        toast.warning(
          'Partial Import Completed',
          `Imported ${res.successCount} questions. ${res.failedCount} had errors.`
        );
      } else {
        toast.success(
          'Bulk Import Successful! 🎉',
          `Successfully imported all ${res.successCount} coding problems with test cases.`
        );
        setIsBulkModalOpen(false);
        setBulkJsonText('');
      }
      loadData();
    } catch (err: any) {
      toast.error('Bulk Import Failed', err.message);
    }
  };

  const filteredProblems = problems.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
    const matchesStat = selectedStatus === 'All' || (p.publicationStatus || 'published') === selectedStatus;

    return matchesSearch && matchesDiff && matchesStat;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-light-border dark:border-dark-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              Coding Arena Management
            </Badge>
            <span className="text-xs text-slate-400">DSA &amp; Algorithmic Question Bank</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-500">
              <Code2 className="w-4 h-4" />
            </div>
            Coding Challenges &amp; Test Cases
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Author algorithmic challenges, manage public sample and hidden evaluation test cases, and bulk import question sets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Bulk JSON Upload
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Challenge
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search problems, categories, tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Problems Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-sidebar/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Problem</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submissions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {filteredProblems.map(prob => (
                <tr key={prob.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-card/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-500 cursor-pointer block" onClick={() => handleOpenEdit(prob)}>
                        {prob.title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">/{prob.slug}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        prob.difficulty === 'Easy'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : prob.difficulty === 'Medium'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {prob.difficulty}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                    {prob.category}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                        prob.publicationStatus === 'published'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                          : prob.publicationStatus === 'draft'
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}
                    >
                      {prob.publicationStatus || 'published'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{prob.submissionsCount || 0}</span>
                    <span className="text-slate-400 text-xs ml-1.5">({prob.acceptanceRate})</span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenTestCases(prob)}
                      className="px-2 py-1 text-xs"
                    >
                      Test Cases
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(prob)}
                      className="px-2 py-1 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProblemToDelete(prob)}
                      className="px-2 py-1 text-xs text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredProblems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No coding challenges match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingProblem ? `Edit Challenge: ${editingProblem.title}` : 'Create Algorithmic Challenge'}
        description="Configure problem statement, starter templates, tags, constraints, and publication state."
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveProblem} className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Challenge Title"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Invert Binary Tree"
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Difficulty
              </label>
              <select
                value={formDifficulty}
                onChange={e => setFormDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs sm:text-sm focus:outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category"
              value={formCategory}
              onChange={e => setFormCategory(e.target.value)}
              placeholder="e.g. Arrays & Hashing, Dynamic Programming"
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Publication Status
              </label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs sm:text-sm focus:outline-none"
              >
                <option value="published">Published (Visible in Arena)</option>
                <option value="draft">Draft (Admin Only)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Problem Description (Markdown supported)
            </label>
            <textarea
              rows={4}
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Describe the challenge, inputs, outputs, and requirements..."
              className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs sm:text-sm font-sans focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Constraints (One per line)
              </label>
              <textarea
                rows={3}
                value={formConstraints}
                onChange={e => setFormConstraints(e.target.value)}
                placeholder="1 <= nums.length <= 10^5&#10;-10^9 <= nums[i] <= 10^9"
                className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hints (One per line)
              </label>
              <textarea
                rows={3}
                value={formHints}
                onChange={e => setFormHints(e.target.value)}
                placeholder="Hint 1: Think about two pointers.&#10;Hint 2: Sort first if order doesn't matter."
                className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl text-xs font-sans focus:outline-none"
              />
            </div>
          </div>

          <Input
            label="Tags (Comma separated)"
            value={formTags}
            onChange={e => setFormTags(e.target.value)}
            placeholder="Array, Hash Table, Sliding Window"
          />

          {/* Starter Codes Accordion */}
          <div className="space-y-3 pt-2 border-t border-light-border dark:border-dark-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Starter Code Templates
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Python 3</label>
                <textarea
                  rows={3}
                  value={starterPython}
                  onChange={e => setStarterPython(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 text-emerald-300 rounded-lg text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">JavaScript</label>
                <textarea
                  rows={3}
                  value={starterJs}
                  onChange={e => setStarterJs(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 text-amber-300 rounded-lg text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">C++</label>
                <textarea
                  rows={3}
                  value={starterCpp}
                  onChange={e => setStarterCpp(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 text-blue-300 rounded-lg text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Java</label>
                <textarea
                  rows={3}
                  value={starterJava}
                  onChange={e => setStarterJava(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 text-rose-300 rounded-lg text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingProblem ? 'Save Changes' : 'Create Challenge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Cases Modal */}
      <Modal
        isOpen={isTestCasesModalOpen}
        onClose={() => setIsTestCasesModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-500" />
            <span>Test Cases: {activeProblemForTests?.title}</span>
          </div>
        }
        description="Public sample cases are visible to students; hidden evaluation cases are strictly verified on the server."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Add New Test Case Form */}
          <form onSubmit={handleAddTestCase} className="p-3.5 bg-slate-50 dark:bg-dark-sidebar/60 rounded-xl border border-light-border dark:border-dark-border space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Add New Test Case
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Input</label>
                <input
                  type="text"
                  value={tcInput}
                  onChange={e => setTcInput(e.target.value)}
                  placeholder="e.g. nums = [2,7,11,15], target = 9"
                  className="w-full px-3 py-1.5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Expected Output</label>
                <input
                  type="text"
                  value={tcExpected}
                  onChange={e => setTcExpected(e.target.value)}
                  placeholder="e.g. [0,1]"
                  className="w-full px-3 py-1.5 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tcIsHidden}
                  onChange={e => setTcIsHidden(e.target.checked)}
                  className="rounded text-brand-500"
                />
                <span className="flex items-center gap-1.5">
                  {tcIsHidden ? <EyeOff className="w-3.5 h-3.5 text-rose-500" /> : <Eye className="w-3.5 h-3.5 text-blue-500" />}
                  {tcIsHidden ? 'Hidden Evaluation Case (Strict Server-Side)' : 'Public Sample Case (Shown in problem description)'}
                </span>
              </label>

              <Button variant="primary" size="sm" type="submit">
                Add Case
              </Button>
            </div>
          </form>

          {/* Existing Test Cases List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {testCases.map((tc, idx) => (
              <div
                key={tc.id || idx}
                className="flex items-center justify-between p-3 bg-white dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500">#{idx + 1}</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tc.isHidden
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/25'
                          : 'bg-blue-500/15 text-blue-500 border border-blue-500/25'
                      }`}
                    >
                      {tc.isHidden ? 'Hidden Case' : 'Public Case'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400">In:</span> {tc.input}
                  </div>
                  <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    <span className="text-slate-400">Out:</span> {tc.expectedOutput}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => tc.id && handleDeleteTestCase(tc.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-dark-sidebar rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {testCases.length === 0 && (
              <p className="text-center py-6 text-xs text-slate-400">
                No test cases configured for this problem yet. Add a public sample and hidden evaluation test case above.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Bulk JSON Upload Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk JSON Challenge Import"
        description="Paste or upload JSON containing problem definitions, starter codes, and test cases."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
            <span>Download our verified JSON schema template before importing.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download Schema Template
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Paste JSON Array
            </label>
            <textarea
              rows={8}
              value={bulkJsonText}
              onChange={e => setBulkJsonText(e.target.value)}
              placeholder="[ { &quot;title&quot;: &quot;...&quot;, &quot;difficulty&quot;: &quot;Easy&quot;, ... } ]"
              className="w-full px-3 py-2 bg-slate-900 text-emerald-300 rounded-xl text-xs font-mono focus:outline-none"
            />
          </div>

          {bulkErrors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs space-y-1">
              <span className="font-bold text-rose-700 dark:text-rose-300 block">Import Errors:</span>
              <ul className="list-disc list-inside space-y-0.5 text-rose-600 dark:text-rose-400">
                {bulkErrors.map((err, i) => (
                  <li key={i}>
                    Item #{err.index + 1} ({err.title}): {err.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
            <Button variant="outline" size="sm" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkUploadSubmit}
              disabled={!bulkJsonText.trim()}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Validate &amp; Import Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deletion Confirm */}
      <ConfirmDialog
        isOpen={!!problemToDelete}
        onClose={() => setProblemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Coding Challenge"
        message={`Are you sure you want to permanently delete "${problemToDelete?.title}"? All test cases and student submissions will be purged.`}
        confirmText="Delete Challenge"
        variant="danger"
      />
    </div>
  );
};
