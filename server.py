"""Local dev server for YouTube transcript fetching (bypasses Vercel cloud IP blocks)."""

import json
import re
from http.server import HTTPServer, BaseHTTPRequestHandler


def extract_video_id(url: str) -> str:
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("Invalid YouTube URL")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(content_length)) if content_length else {}
        url = body.get('url', '')

        try:
            video_id = extract_video_id(url)
        except ValueError as e:
            self._respond(400, {'error': str(e)})
            return

        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            api = YouTubeTranscriptApi()
            transcript = api.fetch(video_id, languages=['en'])
            segments = []
            for i, entry in enumerate(transcript):
                segments.append({
                    'id': i,
                    'start': round(entry.start, 3),
                    'end': round(entry.start + entry.duration, 3),
                    'text': entry.text.strip(),
                })
            full_text = '\n'.join(s['text'] for s in segments)
            self._respond(200, {
                'video_id': video_id,
                'segment_count': len(segments),
                'char_count': len(full_text),
                'segments': segments,
            })
        except Exception as e:
            self._respond(400, {'error': f'Could not get transcript: {str(e)}', 'video_id': video_id})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8001), Handler)
    print('YouTube transcript server running on http://localhost:8001')
    server.serve_forever()
