from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import time

@dataclass
class CausalNode:
    id: str
    tick: int
    year: int
    month: int
    event_type: str  # e.g., "MARRIAGE", "BANKRUPT", "ELECTION", "COMPANY_FOUNDED", "CRIME", "PROMOTED"
    title: str
    description: str
    primary_agent_id: Optional[str] = None
    secondary_agent_ids: List[str] = field(default_factory=list)
    location_city: str = ""
    cause_ids: List[str] = field(default_factory=list)  # Antecedent causal node IDs
    impact_salience: float = 0.5  # 0.0 to 1.0 news importance
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "tick": self.tick,
            "year": self.year,
            "month": self.month,
            "event_type": self.event_type,
            "title": self.title,
            "description": self.description,
            "primary_agent_id": self.primary_agent_id,
            "secondary_agent_ids": self.secondary_agent_ids,
            "location_city": self.location_city,
            "cause_ids": self.cause_ids,
            "impact_salience": self.impact_salience,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CausalNode":
        return cls(**data)


class CausalGraph:
    """
    Maintains a Directed Acyclic Graph (DAG) of all major societal and individual events.
    Enables instant "Why did this happen?" causal queries and back-tracing.
    """
    def __init__(self):
        self.nodes: Dict[str, CausalNode] = {}
        self.agent_timeline: Dict[str, List[str]] = {}  # agent_id -> list of event IDs

    def add_event(self, node: CausalNode) -> CausalNode:
        self.nodes[node.id] = node
        if node.primary_agent_id:
            if node.primary_agent_id not in self.agent_timeline:
                self.agent_timeline[node.primary_agent_id] = []
            self.agent_timeline[node.primary_agent_id].append(node.id)
        
        for agent_id in node.secondary_agent_ids:
            if agent_id not in self.agent_timeline:
                self.agent_timeline[agent_id] = []
            self.agent_timeline[agent_id].append(node.id)
            
        return node

    def explain_event(self, event_id: str, depth: int = 3) -> Dict[str, Any]:
        """
        Recursively traces antecedent cause_ids to produce an interpretable explanation chain.
        """
        if event_id not in self.nodes:
            return {"error": f"Event {event_id} not found."}
        
        node = self.nodes[event_id]
        explanation = {
            "target_event": node.to_dict(),
            "antecedents": []
        }

        if depth > 0 and node.cause_ids:
            for cause_id in node.cause_ids:
                if cause_id in self.nodes:
                    antecedent_tree = self.explain_event(cause_id, depth=depth-1)
                    explanation["antecedents"].append(antecedent_tree)
                    
        return explanation

    def get_agent_events(self, agent_id: str) -> List[CausalNode]:
        event_ids = self.agent_timeline.get(agent_id, [])
        return [self.nodes[eid] for eid in event_ids if eid in self.nodes]

    def get_salient_events_for_tick(self, tick: int, min_salience: float = 0.4) -> List[CausalNode]:
        return [
            node for node in self.nodes.values()
            if node.tick == tick and node.impact_salience >= min_salience
        ]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": {nid: node.to_dict() for nid, node in self.nodes.items()},
            "agent_timeline": self.agent_timeline
        }

    def load_dict(self, data: Dict[str, Any]):
        self.nodes = {nid: CausalNode.from_dict(ndata) for nid, ndata in data.get("nodes", {}).items()}
        self.agent_timeline = data.get("agent_timeline", {})
