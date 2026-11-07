import React, { useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { SupportedLanguage } from '../../services/codeExecutionService';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  height?: string;
  readOnly?: boolean;
}

const MONACO_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  height = '500px',
  readOnly = false,
}) => {
  const [cursorPos, setCursorPos] = useState({ lineNumber: 1, column: 1 });
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Track cursor movements for HackerRank-style status bar
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Define custom dark theme aligned with Yogneet Phoenix Design System
    monaco.editor.defineTheme('yogneet-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F97316', fontStyle: 'bold' }, // Phoenix brand orange
        { token: 'string', foreground: '34D399' }, // Emerald
        { token: 'number', foreground: '38BDF8' }, // Sky blue
        { token: 'type', foreground: 'A78BFA' },   // Purple
        { token: 'identifier', foreground: 'E2E8F0' },
      ],
      colors: {
        'editor.background': '#0B0F14',
        'editor.foreground': '#E2E8F0',
        'editor.lineHighlightBackground': '#161E28',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#F97316',
        'editorCursor.foreground': '#F97316',
        'editor.selectionBackground': '#F9731633',
        'editor.inactiveSelectionBackground': '#F973161A',
      },
    });

    monaco.editor.setTheme('yogneet-dark');
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-light-border dark:border-dark-border bg-[#0B0F14] flex flex-col">
      <div className="flex-1 min-h-0">
        <Editor
          height={height}
          language={MONACO_LANGUAGE_MAP[language] || 'plaintext'}
          value={value}
          onChange={(val) => onChange(val || '')}
          theme="vs-dark"
          onMount={handleEditorMount}
          loading={
            <div className="flex items-center justify-center h-full min-h-[300px] bg-[#0B0F14] text-slate-400 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping" />
                <span>Loading Monaco Editor...</span>
              </div>
            </div>
          }
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: language === 'javascript' ? 2 : 4,
            wordWrap: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      {/* Editor Status Bar matching HackerRank / Professional IDE standards */}
      <div className="flex items-center justify-between px-3.5 py-1 bg-[#0d131a] border-t border-slate-800/80 text-[11px] font-mono text-slate-400 select-none">
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-200 transition-colors">
            Ln {cursorPos.lineNumber}, Col {cursorPos.column}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Autocomplete
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Spaces: {language === 'javascript' ? '2' : '4'}</span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline">Mode: Normal</span>
        </div>
      </div>
    </div>
  );
};
