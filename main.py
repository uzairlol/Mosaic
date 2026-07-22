import os
import sys
import time
import subprocess
import argparse
import requests
import uvicorn
from mosaic.core.tick_engine import SimulationEngine

def ensure_ollama_service():
    """Ensures Ollama service is running automatically without requiring manual 'ollama serve'."""
    try:
        r = requests.get("http://localhost:11434/api/tags", timeout=2.0)
        if r.status_code == 200:
            print("[Ollama Manager] [OK] Ollama service active on http://localhost:11434")
            return
    except Exception:
        pass

    print("[Ollama Manager] [LAUNCH] Auto-launching local Ollama background service...")
    launched = False
    try:
        flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
        subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
        launched = True
    except FileNotFoundError:
        user_appdata_ollama = os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe")
        if os.path.exists(user_appdata_ollama):
            subprocess.Popen([user_appdata_ollama, "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
            launched = True

    # Give Ollama up to 5 seconds to warm up
    for _ in range(10):
        time.sleep(0.5)
        try:
            r = requests.get("http://localhost:11434/api/tags", timeout=1.0)
            if r.status_code == 200:
                print("[Ollama Manager] [OK] Ollama background service launched successfully!")
                return
        except Exception:
            continue

def main():
    parser = argparse.ArgumentParser(description="Mosaic — Persistent Artificial Civilization Platform")
    parser.add_argument("--server", action="store_true", help="Launch the Web Observer Server")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Server host IP")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--ticks", type=int, default=0, help="Run N discrete monthly ticks via CLI")
    
    args = parser.parse_args()

    # Ensure Ollama service is active
    ensure_ollama_service()

    if args.ticks > 0:
        print(f"[Mosaic CLI] Initializing world and running {args.ticks} monthly ticks...")
        engine = SimulationEngine(master_seed=42)
        engine.initialize_new_world(population=500)
        for i in range(1, args.ticks + 1):
            res = engine.step_month()
            print(f" -> Month {res['date']}: {res['headline']} (GDP: ${res['monthly_gdp']:,.2f})")
        print(f"[Mosaic CLI] Completed {args.ticks} ticks successfully.")

    if args.server or args.ticks == 0:
        print(f"[Mosaic Server] Starting Observer Portal on http://{args.host}:{args.port}...")
        uvicorn.run("mosaic.server.app:app", host=args.host, port=args.port, reload=False)

if __name__ == "__main__":
    main()
