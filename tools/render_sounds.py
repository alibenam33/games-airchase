#!/usr/bin/env python3
# Rend les bruitages TIA en fichiers WAV dans Firefox headless (même code de rendu que le jeu).
# Usage : python3 tools/render_sounds.py  (bruitages TIA de js/assets.js → assets/sfx/<nom>.wav, pour l'APK)
# La page rend chaque son avec A.Sfx.render, envoie le WAV en POST /save/<nom>, puis POST /done.
import http.server, os, socketserver, subprocess, sys, threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGE, OUT = 'tools/render_sounds.html', os.path.join(ROOT, 'assets', 'sfx')
PROFILE = os.path.join(ROOT, '.cache', 'ff-render')   # Firefox snap : pas d'accès à /tmp
os.makedirs(OUT, exist_ok=True)
os.makedirs(PROFILE, exist_ok=True)
done, saved = threading.Event(), []


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if self.path.startswith('/save/'):
            name = os.path.basename(self.path[6:])
            with open(os.path.join(OUT, name), 'wb') as f:
                f.write(body)
            saved.append(f'{name} ({len(body) // 1024} Ko)')
        elif self.path == '/done':
            done.set()
        else:
            print(body.decode(errors='replace'))
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{srv.server_address[1]}/{PAGE}'
ff = subprocess.Popen(['firefox', '--headless', '--no-remote', '--profile', PROFILE, url],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
ok = done.wait(90)
ff.terminate()
srv.shutdown()
print('\n'.join(saved))
sys.exit(0 if ok and saved else 'Échec du rendu des sons (Firefox headless)')
