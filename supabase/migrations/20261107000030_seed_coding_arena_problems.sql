-- ==============================================================================
-- Migration: 20261107000030_seed_coding_arena_problems.sql
-- Description: Seed initial production-grade coding challenges and test cases
--              into public.coding_problems and public.coding_test_cases.
-- Resolves: Two Sum HTTP 406 (PGRST116) zero rows lookup failure.
-- ==============================================================================

-- 1. Two Sum Problem
INSERT INTO public.coding_problems (
  id,
  title,
  slug,
  problem_statement,
  difficulty,
  category,
  tags,
  constraints,
  input_format,
  output_format,
  sample_cases,
  editorial,
  supported_languages,
  starter_code,
  time_limit_ms,
  memory_limit_mb,
  status,
  acceptance_rate
) VALUES (
  'e0000000-0000-0000-0000-000000000001'::uuid,
  'Two Sum',
  'two-sum',
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
  'Easy',
  'Arrays & Hashing',
  ARRAY['Array', 'Hash Table'],
  ARRAY['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
  'nums = [2, 7, 11, 15], target = 9',
  '[0, 1]',
  '[{"input": "nums = [2, 7, 11, 15], target = 9", "output": "[0, 1]"}, {"input": "nums = [3, 2, 4], target = 6", "output": "[1, 2]"}, {"input": "nums = [3, 3], target = 6", "output": "[0, 1]"}]'::jsonb,
  'Use a hash map to look up the complement in O(1) time while iterating through the array once.',
  ARRAY['python', 'javascript', 'cpp', 'java'],
  '{
    "python": "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            complement = target - num\n            if complement in seen:\n                return [seen[complement], i]\n            seen[num] = i\n        return []",
    "javascript": "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}",
    "cpp": "#include <vector>\n#include <unordered_map>\n\nclass Solution {\npublic:\n    std::vector<int> twoSum(std::vector<int>& nums, int target) {\n        std::unordered_map<int, int> seen;\n        for (int i = 0; i < nums.size(); ++i) {\n            int complement = target - nums[i];\n            if (seen.find(complement) != seen.end()) {\n                return {seen[complement], i};\n            }\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};",
    "java": "import java.util.HashMap;\nimport java.util.Map;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[] { map.get(complement), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}"
  }'::jsonb,
  2000,
  256,
  'published',
  '54.2%'
) ON CONFLICT (slug) DO UPDATE SET
  status = 'published',
  problem_statement = EXCLUDED.problem_statement,
  starter_code = EXCLUDED.starter_code;

-- Test cases for Two Sum
INSERT INTO public.coding_test_cases (id, problem_id, input, expected_output, is_hidden, weight, order_index) VALUES
  ('e0000000-0000-0000-0001-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'nums = [2, 7, 11, 15], target = 9', '[0, 1]', false, 1, 1),
  ('e0000000-0000-0000-0001-000000000002'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'nums = [3, 2, 4], target = 6', '[1, 2]', false, 1, 2),
  ('e0000000-0000-0000-0001-000000000003'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'nums = [3, 3], target = 6', '[0, 1]', false, 1, 3),
  ('e0000000-0000-0000-0001-000000000004'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'nums = [1, 5, 8, 10, 14], target = 15', '[0, 4]', true, 1, 4),
  ('e0000000-0000-0000-0001-000000000005'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'nums = [-3, 4, 3, 90], target = 0', '[0, 2]', true, 1, 5),
  ('e0000000-0000-0000-0001-000000000006'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'nums = [0, 4, 3, 0], target = 0', '[0, 3]', true, 1, 6)
ON CONFLICT (id) DO UPDATE SET
  input = EXCLUDED.input,
  expected_output = EXCLUDED.expected_output;

-- 2. Valid Parentheses Problem
INSERT INTO public.coding_problems (
  id,
  title,
  slug,
  problem_statement,
  difficulty,
  category,
  tags,
  constraints,
  input_format,
  output_format,
  sample_cases,
  editorial,
  supported_languages,
  starter_code,
  time_limit_ms,
  memory_limit_mb,
  status,
  acceptance_rate
) VALUES (
  'e0000000-0000-0000-0000-000000000002'::uuid,
  'Valid Parentheses',
  'valid-parentheses',
  'Given a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
  'Easy',
  'Stack',
  ARRAY['String', 'Stack'],
  ARRAY['1 <= s.length <= 10^4', 's consists of parentheses only ''()[]{}''.'],
  's = "()"',
  'true',
  '[{"input": "s = \"()\"", "output": "true"}, {"input": "s = \"()[]{}\"", "output": "true"}, {"input": "s = \"(]\"", "output": "false"}]'::jsonb,
  'Use a stack to match opening brackets with corresponding closing brackets.',
  ARRAY['python', 'javascript', 'cpp', 'java'],
  '{
    "python": "class Solution:\n    def isValid(self, s: str) -> bool:\n        stack = []\n        mapping = {\")\": \"(\", \"}\": \"{\", \"]\": \"[\"}\n        for char in s:\n            if char in mapping:\n                top = stack.pop() if stack else \"#\"\n                if mapping[char] != top:\n                    return False\n            else:\n                stack.append(char)\n        return not stack",
    "javascript": "function isValid(s) {\n  const stack = [];\n  const map = { \")\": \"(\", \"}\": \"{\", \"]\": \"[\" };\n  for (const char of s) {\n    if (char in map) {\n      if (stack.pop() !== map[char]) return false;\n    } else {\n      stack.push(char);\n    }\n  }\n  return stack.length === 0;\n}",
    "cpp": "#include <string>\n#include <stack>\n#include <unordered_map>\n\nclass Solution {\npublic:\n    bool isValid(std::string s) {\n        std::stack<char> st;\n        std::unordered_map<char, char> map = {{\")\", \"(\"}, {\"}\", \"{\"}, {\"]\", \"[\"}};\n        for (char c : s) {\n            if (map.count(c)) {\n                if (st.empty() || st.top() != map[c]) return false;\n                st.pop();\n            } else {\n                st.push(c);\n            }\n        }\n        return st.empty();\n    }\n};",
    "java": "import java.util.Stack;\n\nclass Solution {\n    public boolean isValid(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == ''('') stack.push('')'');\n            else if (c == ''{'') stack.push(''}'');\n            else if (c == ''['') stack.push('']'');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}"
  }'::jsonb,
  2000,
  256,
  'published',
  '41.8%'
) ON CONFLICT (slug) DO UPDATE SET
  status = 'published',
  problem_statement = EXCLUDED.problem_statement,
  starter_code = EXCLUDED.starter_code;

-- Test cases for Valid Parentheses
INSERT INTO public.coding_test_cases (id, problem_id, input, expected_output, is_hidden, weight, order_index) VALUES
  ('e0000000-0000-0000-0002-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid, 's = "()"', 'true', false, 1, 1),
  ('e0000000-0000-0000-0002-000000000002'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid, 's = "()[]{}"', 'true', false, 1, 2),
  ('e0000000-0000-0000-0002-000000000003'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid, 's = "(]"', 'false', false, 1, 3),
  ('e0000000-0000-0000-0002-000000000004'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid, 's = "([)]"', 'false', true, 1, 4),
  ('e0000000-0000-0000-0002-000000000005'::uuid, 'e0000000-0000-0000-0000-000000000002'::uuid, 's = "{[]}"', 'true', true, 1, 5)
ON CONFLICT (id) DO UPDATE SET
  input = EXCLUDED.input,
  expected_output = EXCLUDED.expected_output;
