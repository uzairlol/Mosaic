import math
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class MemoryItem:
    id: str
    tick: int
    year: int
    month: int
    description: str
    emotional_intensity: float  # 0.0 to 1.0
    importance: float           # 0.0 to 1.0
    tags: List[str] = field(default_factory=list)
    salience_score: float = 1.0  # Decays over time

    def compute_current_salience(self, current_tick: int) -> float:
        """
        Computes salience using Ebbinghaus retention decay curve with emotional weighting.
        Salience = BaseImportance * e^(-lambda * delta_ticks) * (1 + emotional_intensity)
        """
        delta = max(0, current_tick - self.tick)
        # Decay factor: half-life of ~24 ticks (2 years) for normal memories
        decay_rate = 0.03
        decay = math.exp(-decay_rate * delta)
        weight = 1.0 + (self.emotional_intensity * 1.5)
        self.salience_score = self.importance * weight * decay
        return self.salience_score

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MemoryItem":
        return cls(**data)


class MemoryStream:
    """
    Episodic memory stream for an agent.
    Retains detailed high-salience memories while low-salience memories fade.
    Consolidates old memories into a coherent biographic summary.
    """
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.memories: List[MemoryItem] = []
        self.biography_summary: str = "A resilient resident eager to find their place in Mosaic."

    def add_memory(self, memory: MemoryItem):
        self.memories.append(memory)

    def get_salient_memories(self, current_tick: int, top_k: int = 5) -> List[MemoryItem]:
        for mem in self.memories:
            mem.compute_current_salience(current_tick)
        sorted_mems = sorted(self.memories, key=lambda m: m.salience_score, reverse=True)
        return sorted_mems[:top_k]

    def consolidate_memories(self, current_tick: int):
        """Periodically prune low-salience memories into biography summary."""
        for mem in self.memories:
            mem.compute_current_salience(current_tick)
        # Keep top 30 memories, compress the rest
        if len(self.memories) > 30:
            self.memories = sorted(self.memories, key=lambda m: m.salience_score, reverse=True)[:30]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "memories": [m.to_dict() for m in self.memories],
            "biography_summary": self.biography_summary
        }

    def load_dict(self, data: Dict[str, Any]):
        self.biography_summary = data.get("biography_summary", self.biography_summary)
        self.memories = [MemoryItem.from_dict(m) for m in data.get("memories", [])]
