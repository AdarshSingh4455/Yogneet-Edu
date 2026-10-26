import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Check for safe URL schemes (block javascript:, data:, vbscript:, etc.)
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('mailto:')) {
    return true;
  }
  return false;
}

// Convert common LaTeX mathematical commands and symbols to readable Unicode & React elements
function formatMathLatex(latex: string): React.ReactNode {
  // Normalize double backslashes
  let expr = latex.replace(/\\\\/g, '\\');

  // Math symbol replacements
  const symbolMap: Record<string, string> = {
    '\\lfloor': '⌊',
    '\\rfloor': '⌋',
    '\\lceil': '⌈',
    '\\rceil': '⌉',
    '\\log': 'log',
    '\\ln': 'ln',
    '\\times': '×',
    '\\cdot': '·',
    '\\div': '÷',
    '\\pm': '±',
    '\\mp': '∓',
    '\\leq': '≤',
    '\\le': '≤',
    '\\geq': '≥',
    '\\ge': '≥',
    '\\neq': '≠',
    '\\ne': '≠',
    '\\approx': '≈',
    '\\equiv': '≡',
    '\\in': '∈',
    '\\notin': '∉',
    '\\subset': '⊂',
    '\\subseteq': '⊆',
    '\\cup': '∪',
    '\\cap': '∩',
    '\\setminus': '∖',
    '\\forall': '∀',
    '\\exists': '∃',
    '\\to': '→',
    '\\gets': '←',
    '\\infty': '∞',
    '\\sum': '∑',
    '\\prod': '∏',
    '\\int': '∫',
    '\\dots': '…',
    '\\cdots': '…',
    '\\ldots': '…',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\sigma': 'σ',
    '\\omega': 'ω',
    '\\Delta': 'Δ',
    '\\Omega': 'Ω',
  };

  // Replace recognized LaTeX command tokens
  for (const [cmd, sym] of Object.entries(symbolMap)) {
    const escaped = cmd.replace(/\\/g, '\\\\');
    expr = expr.replace(new RegExp(`${escaped}(?![a-zA-Z])`, 'g'), sym);
  }

  // Handle \sqrt{...}
  expr = expr.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // Handle \frac{a}{b} -> (a / b)
  expr = expr.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');

  // Handle superscripts and subscripts using sub/sup tags
  // Regex to tokenize superscripts (^... or ^{...}) and subscripts (_... or _{...})
  const parts: React.ReactNode[] = [];
  const scriptRegex = /(\^\{[^}]+\}|\^[a-zA-Z0-9+\-=()]|_\{[^}]+\}|_[a-zA-Z0-9+\-=()])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(expr)) !== null) {
    if (match.index > lastIndex) {
      parts.push(expr.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('^')) {
      const supVal = token.startsWith('^{') ? token.slice(2, -1) : token.slice(1);
      parts.push(<sup key={match.index} className="text-[0.8em] font-sans font-bold">{supVal}</sup>);
    } else if (token.startsWith('_')) {
      const subVal = token.startsWith('_{') ? token.slice(2, -1) : token.slice(1);
      parts.push(<sub key={match.index} className="text-[0.8em] font-sans">{subVal}</sub>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < expr.length) {
    parts.push(expr.substring(lastIndex));
  }

  return parts.length > 0 ? parts : expr;
}

// Code block with syntax styling and one-click copy button
const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback
    });
  };

  return (
    <div className="rounded-2xl overflow-hidden my-4 border border-slate-700/80 bg-[#0d1117] text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] text-xs font-mono text-slate-400 border-b border-slate-700/60">
        <span className="uppercase font-bold tracking-wider text-[11px] text-brand-400">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-sans text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors"
          title="Copy code snippet"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed selection:bg-brand-500/40 selection:text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Inline parser for math, bold, italic, code, links
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  // Regex pattern for inline tokens:
  // 1. Block math within inline or escaped math: \$\$([^\$]+)\$\$
  // 2. Inline math: \$([^\$]+)\$
  // 3. Inline code: `([^`]+)`
  // 4. Bold + Italic: \*\*\*([^*]+)\*\*\* or ___([^_]+)___
  // 5. Bold: \*\*([^*]+)\*\* or __([^_]+)__
  // 6. Italic: \*([^*]+)\* or _([^_]+)_
  // 7. Links: \[([^\]]+)\]\(([^)]+)\)
  const tokenRegex = /(\$\$([^\$]+)\$\$|\$([^\$\n]+)\$|`([^`]+)`|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/;

  while (remaining.length > 0) {
    const match = tokenRegex.exec(remaining);
    if (!match) {
      nodes.push(remaining);
      break;
    }

    const matchIndex = match.index;
    if (matchIndex > 0) {
      nodes.push(remaining.substring(0, matchIndex));
    }

    const fullMatch = match[0];
    const key = `inline-${keyCounter++}`;

    if (fullMatch.startsWith('$$') && fullMatch.endsWith('$$')) {
      // Block math
      const mathContent = match[2];
      nodes.push(
        <div
          key={key}
          className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border overflow-x-auto text-center font-mono text-sm text-blue-800 dark:text-blue-300 shadow-2xs font-semibold"
        >
          {formatMathLatex(mathContent)}
        </div>
      );
    } else if (fullMatch.startsWith('$') && fullMatch.endsWith('$')) {
      // Inline math
      const mathContent = match[3];
      nodes.push(
        <span
          key={key}
          className="inline-flex items-center font-mono text-[0.88em] px-1.5 py-0.5 rounded-md bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/40 mx-0.5 shadow-2xs font-semibold"
          title={`LaTeX: ${mathContent}`}
        >
          {formatMathLatex(mathContent)}
        </span>
      );
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      // Inline code
      const codeContent = match[4];
      nodes.push(
        <code
          key={key}
          className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-border text-brand-600 dark:text-blue-400 font-semibold"
        >
          {codeContent}
        </code>
      );
    } else if (fullMatch.startsWith('***') && fullMatch.endsWith('***')) {
      // Bold + Italic
      const content = match[5];
      nodes.push(
        <strong key={key} className="font-bold italic text-slate-900 dark:text-slate-100">
          {parseInline(content)}
        </strong>
      );
    } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      // Bold
      const content = match[6];
      nodes.push(
        <strong key={key} className="font-bold text-slate-900 dark:text-slate-100">
          {parseInline(content)}
        </strong>
      );
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      // Italic
      const content = match[7];
      nodes.push(
        <em key={key} className="italic text-slate-700 dark:text-slate-300">
          {parseInline(content)}
        </em>
      );
    } else if (fullMatch.startsWith('[')) {
      // Link [text](url)
      const linkText = match[8];
      const linkUrl = match[9];

      if (isSafeUrl(linkUrl)) {
        nodes.push(
          <a
            key={key}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 dark:text-brand-400 font-semibold underline underline-offset-2 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
          >
            {parseInline(linkText)}
          </a>
        );
      } else {
        nodes.push(<span key={key} className="text-slate-500 line-through">{linkText}</span>);
      }
    }

    remaining = remaining.substring(matchIndex + fullMatch.length);
  }

  return nodes;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced Code Blocks (```lang ... ```)
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <CodeBlock
          key={`block-${blockKey++}`}
          code={codeLines.join('\n')}
          language={language}
        />
      );
      continue;
    }

    // 2. Block Math ($$ ... $$)
    if (line.trim().startsWith('$$')) {
      const mathLines: string[] = [];
      if (line.trim() === '$$') {
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        i++; // skip closing $$
      } else if (line.trim().endsWith('$$') && line.trim().length > 2) {
        mathLines.push(line.trim().slice(2, -2));
        i++;
      } else {
        mathLines.push(line.trim().slice(2));
        i++;
        while (i < lines.length && !lines[i].trim().endsWith('$$')) {
          mathLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          mathLines.push(lines[i].trim().slice(0, -2));
          i++;
        }
      }

      blocks.push(
        <div
          key={`block-${blockKey++}`}
          className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-light-border dark:border-dark-border overflow-x-auto text-center font-mono text-sm sm:text-base text-blue-800 dark:text-blue-300 shadow-xs font-semibold"
        >
          {formatMathLatex(mathLines.join('\n'))}
        </div>
      );
      continue;
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    if (line.startsWith('#')) {
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        const parsed = parseInline(headingText);

        if (level === 1) {
          blocks.push(
            <h1
              key={`block-${blockKey++}`}
              className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-6 mb-3 pb-2 border-b border-light-border dark:border-dark-border"
            >
              {parsed}
            </h1>
          );
        } else if (level === 2) {
          blocks.push(
            <h2
              key={`block-${blockKey++}`}
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2.5"
            >
              {parsed}
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3
              key={`block-${blockKey++}`}
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2"
            >
              {parsed}
            </h3>
          );
        } else {
          blocks.push(
            <h4
              key={`block-${blockKey++}`}
              className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1.5"
            >
              {parsed}
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // 4. Tables (| col 1 | col 2 |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .slice(1, -1)
            .split('|')
            .map(c => c.trim());

        const headers = parseRow(tableLines[0]);
        // Row 1 is divider (|---|---|)
        const dataRows = tableLines.slice(2).map(parseRow);

        blocks.push(
          <div
            key={`block-${blockKey++}`}
            className="overflow-x-auto my-4 rounded-xl border border-light-border dark:border-dark-border shadow-xs"
          >
            <table className="w-full text-left text-xs sm:text-sm divide-y divide-light-border dark:divide-dark-border min-w-[500px]">
              <thead className="bg-slate-50 dark:bg-dark-sidebar font-bold uppercase text-[10px] tracking-wider text-slate-400">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-2.5 px-4">
                      {parseInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {dataRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50/80 dark:hover:bg-dark-hover/70 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 5. Unordered Lists (- item or * item)
    if (/^(\s*[-*]\s+)/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^(\s*[-*]\s+)/.test(lines[i])) {
        listItems.push(lines[i].replace(/^(\s*[-*]\s+)/, ''));
        i++;
      }
      blocks.push(
        <ul
          key={`block-${blockKey++}`}
          className="space-y-1.5 my-3 ml-4 list-disc text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed"
        >
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="pl-1">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered Lists (1. item, 2. item)
    if (/^(\s*\d+\.\s+)/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^(\s*\d+\.\s+)/.test(lines[i])) {
        listItems.push(lines[i].replace(/^(\s*\d+\.\s+)/, ''));
        i++;
      }
      blocks.push(
        <ol
          key={`block-${blockKey++}`}
          className="space-y-1.5 my-3 ml-4 list-decimal text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed"
        >
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="pl-1">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Horizontal Rule (--- or ***)
    if (/^(\s*[-*_]{3,}\s*)$/.test(line)) {
      blocks.push(
        <hr
          key={`block-${blockKey++}`}
          className="my-6 border-t border-light-border dark:border-dark-border"
        />
      );
      i++;
      continue;
    }

    // 8. Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // 9. Standard Paragraphs
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('$$') &&
      !/^(\s*[-*]\s+)/.test(lines[i]) &&
      !/^(\s*\d+\.\s+)/.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !/^(\s*[-*_]{3,}\s*)$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push(
        <p
          key={`block-${blockKey++}`}
          className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2.5"
        >
          {parseInline(paraLines.join(' '))}
        </p>
      );
    }
  }

  return (
    <article className={`space-y-1 ${className}`}>
      {blocks}
    </article>
  );
};
