import { useState, useRef } from 'react';

const CHAR_LIMIT = 49000;

export default function TextSplitter() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('split_text');
  const textareaRef = useRef(null);

  const charCount = text.length;
  const numParts = charCount > 0 ? Math.ceil(charCount / CHAR_LIMIT) : 0;

  const buildChunks = () => {
    if (!text.trim()) return [];
    const lines = text.split('\n');
    const chunks = [];
    let current = '';

    for (const line of lines) {
      if (current.length + line.length + 1 > CHAR_LIMIT && current.length > 0) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  const handleDownload = () => {
    const chunks = buildChunks();
    if (!chunks.length) return;
    const safeName = fileName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'split_text';

    chunks.forEach((chunk, i) => {
      const blob = new Blob([chunk], { type: 'text/plain' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = chunks.length === 1
        ? `${safeName}.txt`
        : `${safeName}_part${i + 1}_of_${chunks.length}.txt`;
      a.click();
      URL.revokeObjectURL(dlUrl);
    });
  };

  const handleClear = () => {
    setText('');
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {/* File name input */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">File name prefix</label>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="split_text"
          className="w-64 bg-[#1a1f2e] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#e0ddaa]"
        />
      </div>

      {/* Text area */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Paste your text below</label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type text here..."
          className="w-full h-96 bg-[#1a1f2e] border border-gray-700 rounded px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#e0ddaa] resize-y font-mono leading-relaxed"
        />
      </div>

      {/* Stats + actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{charCount.toLocaleString()} characters</span>
          {charCount > 0 && (
            <span>
              {numParts} {numParts === 1 ? 'file' : 'files'} @ 49k max each
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {text.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!text.trim()}
            className="text-sm bg-[#e0ddaa] text-[#141e27] px-5 py-1.5 rounded font-medium hover:bg-[#d4d19e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Download .txt{numParts > 1 ? ` (${numParts} files)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
