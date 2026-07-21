import os
import json
from typing import Dict, Any, Optional

SNAPSHOT_SCHEMA_VERSION = "1.0.0"

class StatePersistenceEngine:
    """
    Handles saving and restoring complete simulation state snapshots.
    Ensures safe pause/resume, power failure recovery, deterministic replay, and branching.
    """
    def __init__(self, saves_dir: str = "saves"):
        self.saves_dir = saves_dir
        os.makedirs(self.saves_dir, exist_ok=True)

    def save_snapshot(self, tick: int, year: int, month: int, world_state: Dict[str, Any], filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"snapshot_y{year}_m{month}_t{tick}.json"
        
        filepath = os.path.join(self.saves_dir, filename)
        
        snapshot = {
            "schema_version": SNAPSHOT_SCHEMA_VERSION,
            "tick": tick,
            "year": year,
            "month": month,
            "world_state": world_state
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2)

        return filepath

    def load_snapshot(self, filepath: str) -> Dict[str, Any]:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Snapshot file not found: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            snapshot = json.load(f)

        if snapshot.get("schema_version") != SNAPSHOT_SCHEMA_VERSION:
            print(f"[Warning] Loading snapshot version {snapshot.get('schema_version')} (expected {SNAPSHOT_SCHEMA_VERSION})")

        return snapshot
