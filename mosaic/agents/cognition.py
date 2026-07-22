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
    LLM Gateway for macro deliberative agent choices, in-character social media generation,
    and automated journalistic reporting via local Ollama (llama3.1:8b).
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

    def generate_agent_echo_post(
        self,
        agent: AgentIdentity,
        known_events: List[str],
        salient_events: List[Any],
        prng: SeededPRNG
    ) -> Dict[str, Any]:
        """Generates an in-character social media post on Echo via Ollama LLM."""
        city_clean = agent.city_id.replace("city_", "").capitalize()
        prompt = f"""You are {agent.full_name}, a {agent.age}-year-old resident of {city_clean}.
Occupation: {agent.occupation} | Ambition: {agent.ambition}
Personality: Openness={agent.personality.openness}, Extraversion={agent.personality.extraversion}, Neuroticism={agent.personality.neuroticism}
Political Orientation: {agent.values.political_orientation:+.2f}

Write a short, realistic social media post (under 200 characters) about your career, city life in {city_clean}, political views, or recent local developments.
Respond strictly in JSON format:
{{"content": "Your post text", "hashtags": ["Tag1", "Tag2"], "sentiment": 0.5}}
"""
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        try:
            res = requests.post(self.ollama_url, json=payload, timeout=15.0)
            if res.status_code == 200:
                parsed = json.loads(res.json().get("response", ""))
                if isinstance(parsed, dict) and "content" in parsed:
                    if "hashtags" not in parsed or not isinstance(parsed["hashtags"], list):
                        parsed["hashtags"] = ["MosaicLife", city_clean]
                    if "sentiment" not in parsed or not isinstance(parsed["sentiment"], (int, float)):
                        parsed["sentiment"] = 0.2
                    return parsed
        except Exception:
            pass

        # Fallback template post if Ollama is busy
        tmpl = f"Busy month working as {agent.occupation} in {city_clean}. Keeping my focus on {agent.ambition.lower()}!"
        return {"content": tmpl, "hashtags": ["MosaicLife", city_clean], "sentiment": 0.2}

    def deliberate_macro_event(
        self,
        agent: AgentIdentity,
        memory_stream: MemoryStream,
        event_type: str,
        context: Dict[str, Any],
        prng: SeededPRNG
    ) -> Dict[str, Any]:
        """Processes high-stakes life turning points via Ollama LLM."""
        ollama_res = self._call_ollama_with_retry(agent, memory_stream, event_type, context, max_retries=2)
        if ollama_res:
            return ollama_res

        if not self.force_ollama:
            return self._heuristic_fallback(agent, event_type, context, prng)

        return {"action": "MAINTAIN_STATUS_QUO", "reason": "Deliberation pending model queue."}

    def _call_ollama_with_retry(
        self,
        agent: AgentIdentity,
        memory_stream: MemoryStream,
        event_type: str,
        context: Dict[str, Any],
        max_retries: int = 2
    ) -> Optional[Dict[str, Any]]:
        prompt = f"""You are the inner mind of {agent.full_name}, a {agent.age}-year-old resident of {agent.city_id}.
Occupation: {agent.occupation} | Ambition: {agent.ambition} | Wealth: ${agent.wealth:,.0f}
Personality Traits: Openness={agent.personality.openness}, Extraversion={agent.personality.extraversion}, Conscientiousness={agent.personality.conscientiousness}
Political Orientation: {agent.values.political_orientation:+.2f}

Event Triggered: {event_type}
Context: {json.dumps(context)}

Respond ONLY with valid JSON matching these keys based on event_type:
- If MARRIAGE_PROPOSAL: {{"accepted": true/false, "reason": "reasoning"}}
- If CAREER_CHANGE: {{"switch_job": true/false, "new_job": "title", "reason": "reasoning"}}
- If FOUND_COMPANY: {{"found_company": true/false, "company_name": "Name", "industry": "Sector", "reason": "reasoning"}}
- If POLITICAL_CANDIDACY: {{"run_for_office": true/false, "platform": "Platform summary", "reason": "reasoning"}}
- If CRIME_TEMPTATION: {{"commit_crime": true/false, "crime_type": "Fraud", "reason": "reasoning"}}
"""
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        for attempt in range(1, max_retries + 1):
            try:
                print(f"[LLM Gateway] [OLLAMA] Deliberating via Ollama ({self.ollama_model}) for {agent.full_name} [{event_type}]...")
                response = requests.post(self.ollama_url, json=payload, timeout=60.0)
                if response.status_code == 200:
                    res_json = response.json()
                    parsed = json.loads(res_json.get("response", ""))
                    print(f"[LLM Gateway] [OK] Ollama decision received for {agent.full_name}: {parsed.get('reason', '')[:65]}...")
                    return parsed
            except Exception as e:
                print(f"[LLM Gateway] [RETRY] Retrying Ollama ({e})...")
                time.sleep(0.5)

        return None

    def _heuristic_fallback(
        self,
        agent: AgentIdentity,
        event_type: str,
        context: Dict[str, Any],
        prng: SeededPRNG
    ) -> Dict[str, Any]:
        if event_type == "MARRIAGE_PROPOSAL":
            accepted = (agent.personality.agreeableness * 0.6 + prng.random() * 0.4) > 0.45
            return {"accepted": accepted, "reason": f"Compatibility evaluation with partner."}
        elif event_type == "FOUND_COMPANY":
            found = agent.wealth >= 15000.0 and prng.random() < 0.4
            return {"found_company": found, "company_name": f"{agent.last_name} Enterprises", "industry": "Commerce", "reason": "Capital availability."}
        return {"action": "MAINTAIN_STATUS_QUO", "reason": "Routine decision."}


class FastPathRuleEngine:
    @staticmethod
    def process_monthly_routine(agent: AgentIdentity, prng: SeededPRNG) -> Dict[str, Any]:
        if not agent.is_alive:
            return {"status": "DECEASED"}

        actions = []
        rent = agent.monthly_rent_or_mortgage
        living_cost = 1200.0 * (0.8 + 0.4 * agent.personality.extraversion)
        total_expense = rent + living_cost
        
        net_savings = agent.monthly_income - total_expense
        agent.wealth += net_savings
        agent.savings += max(0, net_savings * 0.5)

        if agent.wealth < 0:
            agent.happiness = max(0.1, agent.happiness - 0.1)
            actions.append("FINANCIAL_STRESS")
        else:
            agent.happiness = min(1.0, agent.happiness + 0.02)

        if agent.age > 70:
            health_decay = 0.01 + (agent.age - 70) * 0.005
            agent.health -= health_decay
            if agent.health <= 0:
                agent.is_alive = False
                actions.append("DIED_NATURAL_CAUSES")

        return {
            "income": agent.monthly_income,
            "expenses": total_expense,
            "net_savings": net_savings,
            "wealth": agent.wealth,
            "actions": actions
        }
