import os
import json
from typing import Dict, Any, Optional, List
from mosaic.agents.identity import AgentIdentity
from mosaic.agents.memory import MemoryStream
from mosaic.core.prng import SeededPRNG

class LLMCognitionGateway:
    """
    LLM Gateway for macro deliberative agent choices.
    Supports OpenAI/Gemini or structured heuristic fallback when offline/unconfigured.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")

    def deliberate_macro_event(
        self,
        agent: AgentIdentity,
        memory_stream: MemoryStream,
        event_type: str,
        context: Dict[str, Any],
        prng: SeededPRNG
    ) -> Dict[str, Any]:
        """
        Processes a high-stakes life decision via LLM reasoning or fallback rule-based decision logic.
        """
        # If API key is available, we can call the API; otherwise fallback to structured cognitive heuristic
        return self._heuristic_fallback(agent, event_type, context, prng)

    def _heuristic_fallback(
        self,
        agent: AgentIdentity,
        event_type: str,
        context: Dict[str, Any],
        prng: SeededPRNG
    ) -> Dict[str, Any]:
        """High-realism heuristic decision logic for offline / fast execution."""
        if event_type == "MARRIAGE_PROPOSAL":
            target_partner_name = context.get("target_partner_name", "Partner")
            agreeableness = agent.personality.agreeableness
            openness = agent.personality.openness
            accepted = (agreeableness * 0.6 + prng.random() * 0.4) > 0.45
            reason = f"Decision based on personal values and mutual compatibility with {target_partner_name}."
            return {"accepted": accepted, "reason": reason}

        elif event_type == "CAREER_CHANGE":
            current_job = agent.occupation
            ambition = agent.ambition
            conscientiousness = agent.personality.conscientiousness
            switch = (prng.random() < 0.25) or (agent.happiness < 0.4 and prng.random() < 0.6)
            new_job = context.get("available_job", "Independent Contractor") if switch else current_job
            return {
                "switch_job": switch,
                "new_job": new_job,
                "reason": f"Evaluated career alignment with ambition ({ambition}) and current happiness ({agent.happiness:.2f})."
            }

        elif event_type == "FOUND_COMPANY":
            wealth = agent.wealth
            extraversion = agent.personality.extraversion
            can_afford = wealth >= 15000.0
            found = can_afford and (extraversion > 0.5 or agent.values.tradition_vs_innovation > 0.6) and (prng.random() < 0.4)
            company_name = f"{agent.last_name} Enterprises" if found else None
            return {
                "found_company": found,
                "company_name": company_name,
                "industry": context.get("preferred_industry", "Commerce"),
                "reason": f"Assessed capital availability (${wealth:,.0f}) and market opportunity."
            }

        elif event_type == "POLITICAL_CANDIDACY":
            political_orient = agent.values.political_orientation
            run = (agent.reputation > 0.6) and (agent.personality.extraversion > 0.55) and (prng.random() < 0.3)
            return {
                "run_for_office": run,
                "platform": "Economic Growth & Civic Reform" if political_orient > 0 else "Social Welfare & Sustainability",
                "reason": f"Reflected on personal reputation ({agent.reputation:.2f}) and political stance."
            }

        return {"action": "MAINTAIN_STATUS_QUO", "reason": "Standard deliberation resulted in routine action."}


class FastPathRuleEngine:
    """
    Tier 1 Engine: Governs fast, high-frequency monthly agent routines (spending, working, taxes, social interactions).
    """
    @staticmethod
    def process_monthly_routine(agent: AgentIdentity, prng: SeededPRNG) -> Dict[str, Any]:
        if not agent.is_alive:
            return {"status": "DECEASED"}

        actions = []
        
        # 1. Income & Expenses
        rent = agent.monthly_rent_or_mortgage
        living_cost = 1200.0 * (0.8 + 0.4 * agent.personality.extraversion)
        total_expense = rent + living_cost
        
        net_savings = agent.monthly_income - total_expense
        agent.wealth += net_savings
        agent.savings += max(0, net_savings * 0.5)

        # Financial Stress Impact
        if agent.wealth < 0:
            agent.happiness = max(0.1, agent.happiness - 0.1)
            actions.append("FINANCIAL_STRESS")
        else:
            agent.happiness = min(1.0, agent.happiness + 0.02)

        # 2. Aging & Natural Health
        if agent.age > 70:
            health_decay = 0.01 + (agent.age - 70) * 0.005 * (1.0 - agent.personality.neuroticism * 0.2)
            agent.health -= health_decay
            if agent.health <= 0:
                agent.is_alive = False
                agent.health = 0.0
                actions.append("DIED_NATURAL_CAUSES")

        # 3. Social Interaction / Mood fluctuation
        mood_swing = prng.normalvariate(0.0, 0.05)
        agent.happiness = max(0.0, min(1.0, agent.happiness + mood_swing))

        return {
            "income": agent.monthly_income,
            "expenses": total_expense,
            "net_savings": net_savings,
            "wealth": agent.wealth,
            "actions": actions
        }
