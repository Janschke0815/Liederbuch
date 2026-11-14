"""Lokaler Entwicklungsserver ohne Browser-Cache.  Start: python tools/serve.py [port]"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.webmanifest': 'application/manifest+json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    print(f'Liederbuch: http://localhost:{port}/')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
