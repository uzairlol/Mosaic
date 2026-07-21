from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from mosaic.agents.identity import AgentIdentity

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

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EchoPost":
        return cls(**data)


class SimSocialMedia:
    """
    Simulated social media network 'Echo'.
    Agents post, react, and share opinions on world events, elections, local city life, and gossip.
    """
    def __init__(self):
        self.posts: List[EchoPost] = []
        self.trending_hashtags: Dict[str, int] = {}

    def publish_post(self, post: EchoPost):
        self.posts.append(post)
        for tag in post.hashtags:
            self.trending_hashtags[tag] = self.trending_hashtags.get(tag, 0) + 1

    def generate_agent_posts_for_tick(
        self,
        current_tick: int,
        year: int,
        month: int,
        salient_events: List[Any],
        agents: Dict[str, AgentIdentity],
        prng
    ) -> List[EchoPost]:
        new_posts = []

        # Select 5 to 15 agents to post on Echo this month based on extraversion / news events
        candidate_ids = [
            aid for aid, a in agents.items()
            if a.is_alive and (a.personality.extraversion > 0.5 or prng.random() < 0.2)
        ]
        poster_ids = prng.sample(candidate_ids, min(12, len(candidate_ids))) if candidate_ids else []

        templates = [
            ("Just moved to a new apartment in {city}! Excited for a fresh chapter. #CityLife #{city}", ["CityLife"]),
            ("Hard work pays off. Pushing forward at {occupation}! #Career #MosaicWork", ["Career", "MosaicWork"]),
            ("Inflation and municipal taxes are getting ridiculous. We need political change now! #Politics #Reform", ["Politics", "Reform"]),
            ("Spent the weekend reflecting on family and community. Hope everyone is doing well. #Community", ["Community"]),
            ("Innovating every single day. Big announcements coming soon from {city}! #Tech #Future", ["Tech", "Future"])
        ]

        for aid in poster_ids:
            agent = agents[aid]
            # Event-based post or general post
            if salient_events and prng.random() < 0.5:
                event = prng.choice(salient_events)
                content = f"Can't believe what happened in {event.location_city or 'Mosaic'}: '{event.title}'. Society is changing fast!"
                tags = ["MosaicNews", event.event_type]
            else:
                tmpl, tags = prng.choice(templates)
                content = tmpl.format(city=agent.city_id.replace("city_", "").capitalize(), occupation=agent.occupation)

            post_id = f"post_t{current_tick}_{aid}_{prng.randint(100, 999)}"
            post = EchoPost(
                id=post_id,
                author_id=agent.id,
                author_name=agent.full_name,
                tick=current_tick,
                content=content,
                likes_count=prng.randint(1, 45),
                reposts_count=prng.randint(0, 12),
                hashtags=tags,
                sentiment=prng.uniform(-0.5, 0.8)
            )
            self.publish_post(post)
            new_posts.append(post)

        return new_posts

    def get_feed(self, limit: int = 20) -> List[EchoPost]:
        return sorted(self.posts, key=lambda p: p.tick, reverse=True)[:limit]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "posts": [p.to_dict() for p in self.posts],
            "trending_hashtags": self.trending_hashtags
        }

    def load_dict(self, data: Dict[str, Any]):
        self.posts = [EchoPost.from_dict(p) for p in data.get("posts", [])]
        self.trending_hashtags = data.get("trending_hashtags", {})
