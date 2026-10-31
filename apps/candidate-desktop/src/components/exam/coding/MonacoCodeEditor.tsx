/**
 * Monaco Code Editor with Language Selector and Dark Theme
 * Traceability: FR-CODE-001, FR-CODE-002, UC-11
 * Supports Python (default), JavaScript, Java, C, and C++.
 */

import React, { useState, useEffect } from 'react';
import { SupportedLanguage } from '../../../types/codeRunner';
import { RotateCcw } from 'lucide-react';

interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  allowedLanguages?: SupportedLanguage[];
  readOnly?: boolean;
  starterTemplate?: string;
  fontScale?: 'normal' | 'large' | 'xlarge';
}

const DEFAULT_TEMPLATES: Record<SupportedLanguage, string> = {
  python: `# Python 3.10 Solution\ndef solution(nums, target):\n    # Write your code here\n    lookup = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in lookup:\n            return [lookup[complement], i]\n        lookup[num] = i\n    return []\n`,
  javascript: `// JavaScript (Node.js 20) Solution\nfunction solution(nums, target) {\n    // Write your code here\n    const lookup = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (lookup.has(complement)) {\n            return [lookup.get(complement), i];\n        }\n        lookup.set(nums[i], i);\n    }\n    return [];\n}\n`,
  java: `// Java 21 Solution\nimport java.util.*;\n\npublic class Solution {\n    public static int[] solution(int[] nums, int target) {\n        // Write your code here\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) {\n                return new int[] { map.get(comp), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[0];\n    }\n}\n`,
  c: `/* C (GCC 13.2) Solution */\n#include <stdio.h>\n#include <stdlib.h>\n\nvoid solution() {\n    /* Write your code here */\n}\n\nint main() {\n    solution();\n    return 0;\n}\n`,
  cpp: `/* C++20 (G++ 13.2) Solution */\n#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nvector<int> solution(vector<int>& nums, int target) {\n    // Write your code here\n    unordered_map<int, int> lookup;\n    for (int i = 0; i < (int)nums.size(); i++) {\n        int comp = target - nums[i];\n        if (lookup.count(comp)) {\n            return { lookup[comp], i };\n        }\n        lookup[nums[i]] = i;\n    }\n    return {};\n}\n`,
};

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  value,
  onChange,
  language,
  onLanguageChange,
  allowedLanguages = ['python', 'javascript', 'java', 'c', 'cpp'],
  readOnly = false,
  starterTemplate,
  fontScale = 'normal',
}) => {
  const [monacoLoaded, setMonacoLoaded] = useState(false);
  const [MonacoComponent, setMonacoComponent] = useState<React.ComponentType<{
    height?: string;
    language?: string;
    value?: string;
    theme?: string;
    onChange?: (val: string | undefined) => void;
    options?: Record<string, unknown>;
  }> | null>(null);

  // Determine font size from accessibility settings
  const fontSize = fontScale === 'xlarge' ? 18 : fontScale === 'large' ? 16 : 14;

  // Try dynamically importing @monaco-editor/react in runtime environments (safely handles SSR & jsdom)
  useEffect(() => {
    let mounted = true;
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      import('@monaco-editor/react')
        .then((mod) => {
          if (mounted) {
            setMonacoComponent(() => mod.default);
            setMonacoLoaded(true);
          }
        })
        .catch(() => {
          // Gracefully fallback to lightweight accessible code editor
          if (mounted) setMonacoLoaded(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const handleLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as SupportedLanguage;
    onLanguageChange(newLang);
    // If editor has default/blank template, supply starter code
    if (!value || value.trim().length === 0) {
      onChange(DEFAULT_TEMPLATES[newLang] || '');
    }
  };

  const handleReset = () => {
    const template = starterTemplate || DEFAULT_TEMPLATES[language] || '';
    onChange(template);
  };

  // Map supported language to Monaco language id
  const monacoLanguage = language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language;

  return (
    <div
      role="region"
      aria-label="Code Editor Workspace"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1e1e1e',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Editor Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: '#18181b',
          borderBottom: '1px solid #27272a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label
            htmlFor="language-selector"
            style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa' }}
          >
            Language:
          </label>
          <select
            id="language-selector"
            value={language}
            onChange={handleLanguageSelect}
            disabled={readOnly}
            aria-label="Programming Language"
            style={{
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: 6,
              color: '#f4f4f5',
              padding: '4px 10px',
              fontSize: 13,
              fontWeight: 600,
              cursor: readOnly ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            {allowedLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'python'
                  ? 'Python 3.10'
                  : lang === 'javascript'
                    ? 'JavaScript (Node 20)'
                    : lang === 'java'
                      ? 'Java 21 (Temurin)'
                      : lang === 'cpp'
                        ? 'C++ (G++ 13.2)'
                        : 'C (GCC 13.2)'}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: '#71717a' }}>Theme: vs-dark</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={readOnly}
            title="Reset code to starter template"
            aria-label="Reset Code Template"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: '#a1a1aa',
              backgroundColor: 'transparent',
              border: '1px solid #3f3f46',
              borderRadius: 6,
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Code Editor Surface */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {monacoLoaded && MonacoComponent ? (
          <MonacoComponent
            height="100%"
            language={monacoLanguage}
            value={value}
            theme="vs-dark"
            onChange={(val: string | undefined) => onChange(val || '')}
            options={{
              readOnly,
              fontSize,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              tabSize: 4,
              automaticLayout: true,
            }}
          />
        ) : (
          /* High-Fidelity Monaco-Styled Accessible Editor Fallback (Always reliable in Vitest/JSDOM & low-resource environments) */
          <textarea
            aria-label="Code Editor Input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            spellCheck={false}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize,
              lineHeight: 1.6,
              padding: '16px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              tabSize: 4,
              whiteSpace: 'pre',
            }}
            placeholder="Write your solution here..."
          />
        )}
      </div>
    </div>
  );
};
