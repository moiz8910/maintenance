import subprocess
import sys
import threading
import os
import importlib.util

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
REQ_PATH = os.path.join(BASE_DIR, "requirements.txt")
BACKEND_PATH = os.path.join(BASE_DIR, "backend", "main.py")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

print("Checking and installing backend dependencies (this may take a minute)...")
try:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", REQ_PATH, "--break-system-packages"], cwd=BASE_DIR)
except subprocess.CalledProcessError:
    # Fallback if the flag is not supported by older pip versions
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", REQ_PATH], cwd=BASE_DIR)
print("Dependencies installed successfully!\n")

def stream_output(pipe, prefix):
    for line in iter(pipe.readline, b''):
        try:
            print(f"[{prefix}] {line.decode('utf-8', errors='replace')}", end='', flush=True)
        except UnicodeEncodeError:
            # Fallback for Windows console encoding issues
            clean_line = line.decode('utf-8', errors='replace').encode('ascii', 'backslashreplace').decode('ascii')
            print(f"[{prefix}] {clean_line}", end='', flush=True)

print("Starting backend server...")
backend = subprocess.Popen([sys.executable, BACKEND_PATH], cwd=BASE_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

print("Starting frontend server...")
frontend = subprocess.Popen("npm run dev", cwd=FRONTEND_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True)

t1 = threading.Thread(target=stream_output, args=(backend.stdout, "BACKEND"))
t2 = threading.Thread(target=stream_output, args=(frontend.stdout, "FRONTEND"))

t1.daemon = True
t2.daemon = True

t1.start()
t2.start()

try:
    t1.join()
    t2.join()
except KeyboardInterrupt:
    print("\nShutting down servers...")
    backend.terminate()
    frontend.terminate()
    sys.exit(0)