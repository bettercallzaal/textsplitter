import { useState, useMemo } from 'react';

const CHAR_LIMIT = 49000;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildChunks(text) {
  if (!text) return [];
  const chunks = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (line.length > CHAR_LIMIT) {
      if (current) { chunks.push(current); current = ''; }
      const words = line.split(' ');
      for (const word of words) {
        if (current.length + word.length + 1 > CHAR_LIMIT && current.length > 0) {
          chunks.push(current);
          current = word;
        } else {
          current += (current ? ' ' : '') + word;
        }
      }
    } else if (current.length + line.length + 1 > CHAR_LIMIT && current.length > 0) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function downloadBlob(content, name) {
  const blob = new Blob([content], { type: 'text/plain' });
  const dlUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = dlUrl;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
}

export default function YouTubeTranscript() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState(null);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('transcript');

  const fullText = useMemo(
    () => transcript?.segments?.map(s => s.text).join('\n') || '',
    [transcript]
  );
  const chunks = useMemo(() => buildChunks(fullText), [fullText]);
  const numParts = chunks.length;

  const getSafeName = () =>
    fileName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'transcript';

  const getPartFileName = (total, index) => {
    const safeName = getSafeName();
    return total === 1
      ? `${safeName}.txt`
      : `${safeName}_part${index + 1}_of_${total}.txt`;
  };

  const handleGrab = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setTranscript(null);

    try {
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTranscript(data);
      // Use video_id as default file name
      if (data.video_id) setFileName(data.video_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (withTimestamps) => {
    if (!transcript?.segments?.length) return;
    const text = withTimestamps
      ? transcript.segments.map(s => `[${formatTime(s.start)}] ${s.text}`).join('\n')
      : fullText;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadPart = (index) => {
    if (!chunks[index]) return;
    downloadBlob(chunks[index], getPartFileName(chunks.length, index));
  };

  const handleDownloadAll = () => {
    if (!chunks.length) return;
    chunks.forEach((chunk, i) => {
      setTimeout(() => {
        downloadBlob(chunk, getPartFileName(chunks.length, i));
      }, i * 300);
    });
  };

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">YouTube URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGrab()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 bg-[#1a1f2e] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#e0ddaa]"
          />
          <button
            onClick={handleGrab}
            disabled={!url.trim() || loading}
            className="bg-[#e0ddaa] text-[#141e27] px-5 py-2 rounded text-sm font-medium hover:bg-[#d4d19e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Grabbing...' : 'Grab Transcript'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[#1a1f2e] rounded p-4 text-sm text-gray-400 text-center">
          Fetching YouTube captions...
        </div>
      )}

      {/* Results */}
      {transcript && transcript.segments && transcript.segments.length > 0 && (
        <div className="space-y-4">
          {/* File name */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">File name prefix</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="transcript"
              className="w-64 bg-[#1a1f2e] border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#e0ddaa]"
            />
          </div>

          {/* Stats & actions */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{transcript.segments.length} segments</span>
            <span>{fullText.length.toLocaleString()} characters</span>
            {fullText.length > 0 && (
              <span>
                {numParts} {numParts === 1 ? 'file' : 'files'} @ 49k max each
              </span>
            )}
          </div>

          {/* Per-part download buttons */}
          {numParts > 1 && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: numParts }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handleDownloadPart(i)}
                  className="text-xs bg-[#1a1f2e] border border-[#e0ddaa]/40 text-[#e0ddaa] px-3 py-1.5 rounded hover:bg-[#e0ddaa]/10"
                >
                  Part {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {copied && <span className="text-xs text-green-400">Copied!</span>}
            <button
              onClick={() => handleCopy(false)}
              className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
            >
              Copy Text
            </button>
            <button
              onClick={() => handleCopy(true)}
              className="text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600"
            >
              Copy + Timestamps
            </button>
            <button
              onClick={handleDownloadAll}
              className="text-sm bg-[#e0ddaa] text-[#141e27] px-5 py-1.5 rounded font-medium hover:bg-[#d4d19e]"
            >
              {numParts > 1 ? `Download All ${numParts} Parts` : 'Download .txt'}
            </button>
          </div>

          {/* Transcript preview */}
          <div className="max-h-96 overflow-y-auto bg-[#0f1419] border border-gray-800 rounded p-3 space-y-1">
            {transcript.segments.map((seg, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-[#e0ddaa] font-mono shrink-0 w-12 text-right">
                  {formatTime(seg.start)}
                </span>
                <span className="text-gray-300">{seg.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
