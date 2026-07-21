from typing import Dict, Any, List, Optional
from mosaic.core.prng import SeededPRNG
from mosaic.core.causal_graph import CausalGraph, CausalNode
from mosaic.core.persistence import StatePersistenceEngine
from mosaic.agents.identity import AgentIdentity
from mosaic.agents.memory import MemoryStream, MemoryItem
from mosaic.agents.cognition import FastPathRuleEngine, LLMCognitionGateway
from mosaic.agents.kinship import KinshipEngine
from mosaic.world.city import BUILTIN_CITIES, City
from mosaic.world.economy import EconomicSystem
from mosaic.world.politics import PoliticalSystem
from mosaic.world.media import SimSocialMedia, EchoPost
from mosaic.historian.newspaper import AutomatedHistorianNewspaper, NewspaperIssue
from mosaic.historian.wiki import LivingEncyclopediaWiki
from mosaic.generator.world_builder import WorldBuilder

class SimulationEngine:
    """
    Main Discrete Tick Simulation Engine for Mosaic.
    1 Tick = 1 Month of in-world time.
    """
    def __init__(self, master_seed: int = 42):
        self.master_seed = master_seed
        self.prng = SeededPRNG(master_seed)
        
        self.tick: int = 0
        self.start_year: int = 2026
        self.year: int = 2026
        self.month: int = 1
        
        # World Objects
        self.cities: Dict[str, City] = {cid: city for cid, city in BUILTIN_CITIES.items()}
        self.agents: Dict[str, AgentIdentity] = {}
        self.agent_memories: Dict[str, MemoryStream] = {}
        self.economy = EconomicSystem()
        self.politics = PoliticalSystem()
        self.media = SimSocialMedia()
        self.causal_graph = CausalGraph()
        
        # Services
        self.llm_gateway = LLMCognitionGateway()
        self.persistence = StatePersistenceEngine()
        self.wiki = LivingEncyclopediaWiki()
        
        # History Records
        self.newspapers: List[NewspaperIssue] = []

    def initialize_new_world(self, population: int = 500):
        """Builds a fresh world with 500 agents across 4 cities."""
        world_data = WorldBuilder.generate_world(self.prng, target_population=population)
        
        self.agents = {aid: AgentIdentity.from_dict(adata) for aid, adata in world_data["agents"].items()}
        for aid in self.agents:
            self.agent_memories[aid] = MemoryStream(aid)
            
        self.economy.load_dict(world_data["economy"])
        self.politics.load_dict(world_data["politics"])
        
        # Initial Save Snapshot
        self.save_current_snapshot()
        print(f"[Mosaic] Initialized world with {len(self.agents)} agents across 4 cities.")

    @property
    def current_date_str(self) -> str:
        month_name = AutomatedHistorianNewspaper.MONTH_NAMES[(self.month - 1) % 12]
        return f"{month_name} {self.year} (Tick {self.tick})"

    def step_month(self) -> Dict[str, Any]:
        """
        Executes one monthly tick step across all civilization subsystems.
        """
        self.tick += 1
        self.month = (self.tick - 1) % 12 + 1
        self.year = self.start_year + (self.tick - 1) // 12

        tick_prng = self.prng.spawn_sub_stream(f"tick_{self.tick}")
        current_salient_events: List[CausalNode] = []

        # 1. Fast Path Agent Routines (Income, expenses, health, decay)
        for aid, agent in list(self.agents.items()):
            if not agent.is_alive:
                continue

            agent_prng = tick_prng.spawn_sub_stream(f"agent_{aid}")
            routine_res = FastPathRuleEngine.process_monthly_routine(agent, agent_prng)

            # Check for Natural Death
            if "DIED_NATURAL_CAUSES" in routine_res.get("actions", []):
                event_id = f"evt_death_t{self.tick}_{aid}"
                death_node = CausalNode(
                    id=event_id,
                    tick=self.tick,
                    year=self.year,
                    month=self.month,
                    event_type="DEATH",
                    title=f"{agent.full_name} Passed Away",
                    description=f"{agent.full_name} passed away peacefully at age {agent.age} in {agent.city_id}.",
                    primary_agent_id=aid,
                    location_city=agent.city_id,
                    impact_salience=0.6
                )
                self.causal_graph.add_event(death_node)
                current_salient_events.append(death_node)
                
                # Inheritance Execution
                KinshipEngine.execute_inheritance(agent, self.agents)

        # 2. Macro Deliberative Choices (Marriages, Company Foundings)
        living_agents = [a for a in self.agents.values() if a.is_alive]
        if living_agents:
            # Random Marriage Proposal Trigger
            single_adults = [a for a in living_agents if 20 <= a.age <= 55 and not a.spouse_id]
            if len(single_adults) >= 2 and tick_prng.random() < 0.35:
                p1, p2 = tick_prng.sample(single_adults, 2)
                if p1.gender != p2.gender and p1.city_id == p2.city_id:
                    delib = self.llm_gateway.deliberate_macro_event(
                        p1, self.agent_memories[p1.id], "MARRIAGE_PROPOSAL",
                        {"target_partner_name": p2.full_name}, tick_prng
                    )
                    if delib.get("accepted"):
                        KinshipEngine.marry(p1, p2)
                        m_node = CausalNode(
                            id=f"evt_marriage_t{self.tick}_{p1.id}_{p2.id}",
                            tick=self.tick,
                            year=self.year,
                            month=self.month,
                            event_type="MARRIAGE",
                            title=f"Wedding of {p1.full_name} and {p2.full_name}",
                            description=f"{p1.full_name} and {p2.full_name} were happily wed in {p1.city_id}.",
                            primary_agent_id=p1.id,
                            secondary_agent_ids=[p2.id],
                            location_city=p1.city_id,
                            impact_salience=0.55
                        )
                        self.causal_graph.add_event(m_node)
                        current_salient_events.append(m_node)

        # 3. Socio-Economic Step
        econ_res = self.economy.step_economy(self.agents, self.cities, tick_prng)
        for comp_id in econ_res.get("bankruptcies", []):
            b_node = CausalNode(
                id=f"evt_bankrupt_t{self.tick}_{comp_id}",
                tick=self.tick,
                year=self.year,
                month=self.month,
                event_type="BANKRUPTCY",
                title=f"Corporate Bankruptcy of {comp_id}",
                description=f"Company {comp_id} has dissolved due to negative capital balance.",
                location_city="Mosaic",
                impact_salience=0.7
            )
            self.causal_graph.add_event(b_node)
            current_salient_events.append(b_node)

        # 4. Political Step
        political_res = self.politics.step_politics(self.tick, self.agents, tick_prng)
        if "ELECTION_HELD" in political_res.get("events", []):
            el_res = political_res.get("election_results", {})
            winner_name = el_res.get("winner_party_name", "Coalition")
            el_node = CausalNode(
                id=f"evt_election_t{self.tick}",
                tick=self.tick,
                year=self.year,
                month=self.month,
                event_type="ELECTION",
                title=f"Democratic Elections Conclude: {winner_name} Victorious",
                description=f"Over {el_res.get('total_votes', 0)} citizens cast ballots. {winner_name} secured majority seats in Parliament.",
                location_city="Solaria",
                impact_salience=0.9
            )
            self.causal_graph.add_event(el_node)
            current_salient_events.append(el_node)

        # 5. Sim-Social Media Feed ("Echo")
        echo_posts = self.media.generate_agent_posts_for_tick(
            self.tick, self.year, self.month, current_salient_events, self.agents, tick_prng
        )

        # 6. Automated Historian Newspaper
        gazette = AutomatedHistorianNewspaper.generate_issue(
            self.tick, self.year, self.month, current_salient_events,
            econ_res, political_res, echo_posts
        )
        self.newspapers.append(gazette)

        # 7. Update Wiki Articles for top changed agents & cities
        for city in self.cities.values():
            residents = [a for a in self.agents.values() if a.city_id == city.id and a.is_alive]
            self.wiki.generate_city_article(city, len(residents))

        # Save snapshot automatically
        self.save_current_snapshot()

        return {
            "tick": self.tick,
            "date": self.current_date_str,
            "headline": gazette.headline,
            "salient_events_count": len(current_salient_events),
            "monthly_gdp": econ_res.get("monthly_gdp", 0.0)
        }

    def save_current_snapshot(self) -> str:
        state = {
            "cities": {cid: c.to_dict() for cid, c in self.cities.items()},
            "agents": {aid: a.to_dict() for aid, a in self.agents.items()},
            "economy": self.economy.to_dict(),
            "politics": self.politics.to_dict(),
            "media": self.media.to_dict(),
            "causal_graph": self.causal_graph.to_dict(),
            "newspapers": [n.to_dict() for n in self.newspapers]
        }
        return self.persistence.save_snapshot(self.tick, self.year, self.month, state)

    def load_snapshot(self, filepath: str):
        snapshot = self.persistence.load_snapshot(filepath)
        self.tick = snapshot["tick"]
        self.year = snapshot["year"]
        self.month = snapshot["month"]
        
        ws = snapshot["world_state"]
        self.cities = {cid: City.from_dict(cdata) for cid, cdata in ws.get("cities", {}).items()}
        self.agents = {aid: AgentIdentity.from_dict(adata) for aid, adata in ws.get("agents", {}).items()}
        self.economy.load_dict(ws.get("economy", {}))
        self.politics.load_dict(ws.get("politics", {}))
        self.media.load_dict(ws.get("media", {}))
        self.causal_graph.load_dict(ws.get("causal_graph", {}))
        self.newspapers = [NewspaperIssue.from_dict(ndata) for ndata in ws.get("newspapers", [])]
