from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from mosaic.agents.identity import AgentIdentity

@dataclass
class PoliticalParty:
    id: str
    name: str
    abbreviation: str
    orientation_spectrum: float  # -1.0 (Left/Progressive) to +1.0 (Right/Conservative)
    leader_id: str
    platform_summary: str
    member_ids: List[str] = field(default_factory=list)
    seats_in_parliament: int = 0
    public_approval_rating: float = 0.5

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PoliticalParty":
        return cls(**data)


class PoliticalSystem:
    """
    Manages political parties, civic elections, parliamentary seat allocations,
    public sentiment tracking, and policy decisions.
    """
    def __init__(self):
        self.parties: Dict[str, PoliticalParty] = {}
        self.ruling_party_id: Optional[str] = None
        self.last_election_tick: int = 0
        self.next_election_tick: int = 24  # Elections every 2 years (24 ticks)

    def add_party(self, party: PoliticalParty):
        self.parties[party.id] = party

    def step_politics(self, current_tick: int, agents: Dict[str, AgentIdentity], prng) -> Dict[str, Any]:
        events = []
        election_results = None

        # Check if election is due
        if current_tick >= self.next_election_tick and self.parties:
            election_results = self.hold_election(current_tick, agents, prng)
            self.last_election_tick = current_tick
            self.next_election_tick = current_tick + 24
            events.append("ELECTION_HELD")

        # Update Party Approvals based on agent sentiments
        for party in self.parties.values():
            aligned_agents = [
                a for a in agents.values()
                if a.is_alive and abs(a.values.political_orientation - party.orientation_spectrum) < 0.4
            ]
            if agents:
                party.public_approval_rating = max(0.1, min(0.95, len(aligned_agents) / len(agents) + prng.uniform(-0.05, 0.05)))

        return {
            "ruling_party_id": self.ruling_party_id,
            "next_election_tick": self.next_election_tick,
            "election_results": election_results,
            "events": events
        }

    def hold_election(self, current_tick: int, agents: Dict[str, AgentIdentity], prng) -> Dict[str, Any]:
        """Simulates democratic election based on 500 agents voting according to political orientation & party alignment."""
        votes = {pid: 0 for pid in self.parties}

        for agent in agents.values():
            if not agent.is_alive or agent.age < 18:
                continue

            # Find closest party to agent's political values
            best_party_id = None
            min_diff = 999.0
            for party_id, party in self.parties.items():
                diff = abs(agent.values.political_orientation - party.orientation_spectrum)
                if diff < min_diff:
                    min_diff = diff
                    best_party_id = party_id

            if best_party_id:
                votes[best_party_id] += 1

        total_votes = sum(votes.values())
        winner_id = max(votes, key=votes.get) if votes else None
        self.ruling_party_id = winner_id

        # Allocate 100 parliamentary seats proportionally
        for party_id, party in self.parties.items():
            if total_votes > 0:
                party.seats_in_parliament = int((votes[party_id] / total_votes) * 100)
            else:
                party.seats_in_parliament = 0

        winner_name = self.parties[winner_id].name if winner_id in self.parties else "Independent Coalition"
        return {
            "total_votes": total_votes,
            "votes_by_party": votes,
            "winner_party_id": winner_id,
            "winner_party_name": winner_name
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "parties": {pid: party.to_dict() for pid, party in self.parties.items()},
            "ruling_party_id": self.ruling_party_id,
            "last_election_tick": self.last_election_tick,
            "next_election_tick": self.next_election_tick
        }

    def load_dict(self, data: Dict[str, Any]):
        self.parties = {pid: PoliticalParty.from_dict(pdata) for pid, pdata in data.get("parties", {}).items()}
        self.ruling_party_id = data.get("ruling_party_id")
        self.last_election_tick = data.get("last_election_tick", 0)
        self.next_election_tick = data.get("next_election_tick", 24)
