#!/usr/bin/env python3
"""Tiny static file server for the viewer. Binds to 127.0.0.1 only.

    python serve.py            # http://127.0.0.1:5173
    python serve.py --port 8080 --no-open
"""
import argparse
import http.server
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BLOCKED = ("/.git", "/_font_src")


class Handler(http.server.SimpleHTTPRequestHandler):
    # Windows registry sometimes maps .js to text/plain, which breaks ES modules.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
        ".html": "text/html; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.startswith(BLOCKED):
            self.send_error(404)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, format, *args):  # keep the console quiet
        pass


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=5173)
    ap.add_argument("--no-open", action="store_true")
    args = ap.parse_args()

    socketserver.TCPServer.allow_reuse_address = True
    try:
        server = socketserver.ThreadingTCPServer(("127.0.0.1", args.port), Handler)
    except OSError as e:
        print(f"Cannot listen on port {args.port}: {e}", file=sys.stderr)
        return 1
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Claude Export Viewer running at {url}  (Ctrl+C to stop)")
    if not args.no_open:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
