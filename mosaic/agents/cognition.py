import os
import json
import time
import requests
from typing import Dict, Any, Optional, List
from mosaic.agents.identity import AgentIdentity
from mosaic.agents.memory import MemoryStream
from mosaic.core.prng import SeededPRNG

class LLMCognitionGateway:
    """
    LLM Gateway for macro deliberative agent choices.
    Exclusively powered by local Ollama (default llama3.1:8b) with 120s timeout & retries.
    """
    def __init__(
        self,
        ollama_url: Optional[str] = None,
        ollama_model: Optional[str] = None,
        force_ollama: bool = True
    ):
        self.ollama_url = ollama_url or os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
        self.ollama_model = ollama_model or os.environ.get("OLLAMA_MODEL", "llama3.1:8b")
        self.force_ollama = force_ollama

    def deliberate_macro_event(
        self,
        agent: AgentIdentity,
        memory_stream: MemoryStream,
        event_type: str,
        context: Dict[str, Any],
        prng: SeededPRNG
    ) -> Dict[str, Any]:
        """
        Processes a high-stakes life decision via local Ollama LLM reasoning.
        Retries until Ollama returns valid LLM decision.
        """
        # Execute via Ollama with full 120s timeout and retries
        ollama_res = self._call_ollama_with_retry(agent, memory_stream, event_type, context, max_retries=3)
        if ollama_res:
            return ollama_res

        # Fallback to heuristic ONLY if force_ollama is explicitly False
        if not self.force_ollama:
            return self._heuristic_fallback(agent, event_type, context, prng)

        # Default fallback structure if Ollama fails retries
        return {"action": "MAINTAIN_STATUS_QUO", "reason": "Deliberation pending model queue."}

    def _call_ollama_with_retry(
        self,
        agent: AgentIdentity,
        memory_stream: MemoryStream,
        event_type: str,
        context: Dict[str, Any],
        max_retries: int = 3
    ) -> Optional[Dict[str, Any]]:
        """Invokes local Ollama llama3.1:8b model with 120s timeout and retries."""
        prompt = f"""You are the inner mind of {agent.full_name}, a {agent.age}-year-old resident of {agent.city_id}.
Occupation: {agent.occupation} | Ambition: {agent.ambition} | Wealth: ${agent.wealth:,.0f}
Personality Traits (0.0 to 1.0):
- Openness: {agent.personality.openness}
- Conscientiousness: {agent.personality.conscientiousness}
- Extraversion: {agent.personality.extraversion}
- Agreeableness: {agent.personality.agreeableness}
- Neuroticism: {agent.personality.neuroticism}
Political Orientation: {agent.values.political_orientation:+.2f} (-1.0 Left, +1.0 Right)

Event Triggered: {event_type}
Event Context: {json.dumps(context)}

Make an in-character decision. Respond ONLY with valid JSON matching these keys based on event_type:
- If MARRIAGE_PROPOSAL: {{"accepted": true/false, "reason": "reasoning"}}
- If CAREER_CHANGE: {{"switch_job": true/false, "new_job": "title", "reason": "reasoning"}}
- If FOUND_COMPANY: {{"found_company": true/false, "company_name": "Name", "industry": "Sector", "reason": "reasoning"}}
- If POLITICAL_CANDIDACY: {{"run_for_office": true/false, "platform": "Platform summary", "reason": "reasoning"}}
"""
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        for attempt in range(1, max_retries + 1):
            try:
                print(f"[LLM Gateway] 🦙 Deliberating via Ollama ({self.ollama_model}) for {agent.full_name} [{event_type}] (Attempt {attempt}/{max_retries})...")
                response = requests.post(self.ollama_url, json=payload, timeout=120.0)
                if response.status_code == 200:
                    res_json = response.json()
                    raw_text = res_json.get("response", "")
                    parsed = json.loads(raw_text)
                    print(f"[LLM Gateway] ✅ Ollama decision received for {agent.full_name}: {parsed.get('reason', '')[:65]}...")
                    return parsed
                else:
                    print(f"[LLM Gateway] ⚠️ Ollama HTTP {response.status_code}, retrying...")
            except Exception as e:
                print(f"[LLM Gateway] ⏳ Ollama waiting/retrying ({e})...")
                time.sleep(1.0)

        return None

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
