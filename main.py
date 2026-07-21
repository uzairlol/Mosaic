import sys
import argparse
import uvicorn
from mosaic.core.tick_engine import SimulationEngine

def main():
    parser = argparse.ArgumentParser(description="Mosaic — Persistent Artificial Civilization Platform")
    parser.add_argument("--server", action="store_true", help="Launch the Web Observer Server")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Server host IP")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--ticks", type=int, default=0, help="Run N discrete monthly ticks via CLI")
    
    args = parser.parse_args()

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
