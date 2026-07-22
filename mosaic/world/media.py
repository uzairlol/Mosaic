from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from mosaic.agents.identity import AgentIdentity
from mosaic.core.causal_graph import CausalNode

@dataclass
class Rumor:
    id: str
    original_event_id: str
    source_agent_id: str
    topic: str
    content: str
    truth_factor: float = 1.0  # 1.0 = 100% accurate, 0.2 = wild rumor / fake news
    bias_direction: str = "NEUTRAL"
    tick: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Rumor":
        return cls(**data)


@dataclass
class EchoPost:
    id: str
    author_id: str
    author_name: str
    tick: int
    content: str
    likes_count: int = 0
    reposts_count: int = 0
    hashtags: List[str] = field(default_factory=list)
    sentiment: float = 0.0  # -1.0 to +1.0
    rumor_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EchoPost":
        return cls(**data)


class SimSocialMedia:
    """
    Simulated social media network 'Echo' with Imperfect Knowledge Bubbles & Rumor Propagation.
    Information spreads through direct city observation, social connections, and media posts.
    """
    def __init__(self):
        self.posts: List[EchoPost] = []
        self.rumors: Dict[str, Rumor] = {}
        self.agent_knowledge: Dict[str, List[str]] = {}  # agent_id -> list of known event/rumor IDs
        self.trending_hashtags: Dict[str, int] = {}

    def publish_post(self, post: EchoPost):
        self.posts.append(post)
        for tag in post.hashtags:
            self.trending_hashtags[tag] = self.trending_hashtags.get(tag, 0) + 1

    def propagate_information(
        self,
        current_tick: int,
        events: List[CausalNode],
        agents: Dict[str, AgentIdentity],
        prng
    ):
        """
        Propagates events locally based on city proximity, family links, and workplace ties.
        Distorts information into rumors for low conscientiousness / high neuroticism agents.
        """
        for event in events:
            # 1. Direct local observation: Agents in the event's city learn the event
            for aid, agent in agents.items():
                if not agent.is_alive:
                    continue
                if aid not in self.agent_knowledge:
                    self.agent_knowledge[aid] = []

                if agent.city_id == event.location_city or prng.random() < 0.2:
                    if event.id not in self.agent_knowledge[aid]:
                        self.agent_knowledge[aid].append(event.id)

            # 2. Rumor generation: High-impact events morph into rumors as they spread to other cities
            if event.impact_salience > 0.6 and prng.random() < 0.5:
                truth = max(0.3, 1.0 - prng.uniform(0.1, 0.5))
                rumor_id = f"rumor_t{current_tick}_{event.id}"
                rumor = Rumor(
                    id=rumor_id,
                    original_event_id=event.id,
                    source_agent_id=event.primary_agent_id or "ANONYMOUS",
                    topic=event.event_type,
                    content=f"Word on the street in {event.location_city or 'Mosaic'}: {event.title}",
                    truth_factor=truth,
                    bias_direction="SENSATIONAL" if truth < 0.6 else "NEUTRAL",
                    tick=current_tick
                )
                self.rumors[rumor_id] = rumor

    def generate_agent_posts_for_tick(
        self,
        current_tick: int,
        year: int,
        month: int,
        salient_events: List[CausalNode],
        agents: Dict[str, AgentIdentity],
        llm_gateway,
        agent_memories,
        prng
    ) -> List[EchoPost]:
        self.propagate_information(current_tick, salient_events, agents, prng)
        new_posts = []

        # Select candidates to post on Echo this month
        candidate_ids = [
            aid for aid, a in agents.items()
            if a.is_alive and (a.personality.extraversion > 0.45 or prng.random() < 0.25)
        ]
        poster_ids = prng.sample(candidate_ids, min(8, len(candidate_ids))) if candidate_ids else []

        for aid in poster_ids:
            agent = agents[aid]
            known_events = [eid for eid in self.agent_knowledge.get(aid, [])]

            # Ask LLM Gateway to generate in-character post if LLM is available
            post_data = llm_gateway.generate_agent_echo_post(agent, known_events, salient_events, prng)

            content = post_data.get("content", "")
            hashtags = post_data.get("hashtags", ["MosaicLife"])
            if not isinstance(hashtags, list):
                hashtags = [str(hashtags)]
            sentiment = float(post_data.get("sentiment", 0.2))

            post_id = f"post_t{current_tick}_{aid}_{prng.randint(100, 999)}"
            post = EchoPost(
                id=post_id,
                author_id=agent.id,
                author_name=agent.full_name,
                tick=current_tick,
                content=content,
                likes_count=prng.randint(3, 85),
                reposts_count=prng.randint(0, 24),
                hashtags=hashtags,
                sentiment=sentiment
            )
            self.publish_post(post)
            new_posts.append(post)

        return new_posts

    def get_feed(self, limit: int = 25) -> List[EchoPost]:
        return sorted(self.posts, key=lambda p: p.tick, reverse=True)[:limit]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "posts": [p.to_dict() for p in self.posts],
            "rumors": {rid: r.to_dict() for rid, r in self.rumors.items()},
            "agent_knowledge": self.agent_knowledge,
            "trending_hashtags": self.trending_hashtags
        }

    def load_dict(self, data: Dict[str, Any]):
        self.posts = [EchoPost.from_dict(p) for p in data.get("posts", [])]
        self.rumors = {rid: Rumor.from_dict(rdata) for rid, rdata in data.get("rumors", {}).items()}
        self.agent_knowledge = data.get("agent_knowledge", {})
        self.trending_hashtags = data.get("trending_hashtags", {})
