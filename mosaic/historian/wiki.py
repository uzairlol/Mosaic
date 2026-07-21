import os
from typing import Dict, Any, List
from mosaic.agents.identity import AgentIdentity
from mosaic.world.city import City
from mosaic.world.economy import Company
from mosaic.world.politics import PoliticalParty

class LivingEncyclopediaWiki:
    """
    Auto-generates dynamic Wikipedia-style documentation (Markdown) for every person,
    city, company, political party, and major historical milestone.
    """
    def __init__(self, output_dir: str = "wiki_data"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "people"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "cities"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "companies"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "parties"), exist_ok=True)

    def generate_agent_article(self, agent: AgentIdentity, memories: List[Any], events: List[Any]) -> str:
        status_str = "Living" if agent.is_alive else "Deceased"
        content = f"""# {agent.full_name}

**Status:** {status_str} | **Age:** {agent.age} | **City:** {agent.city_id} | **Occupation:** {agent.occupation}

---

## Biography & Overview
{agent.full_name} is a citizen residing in **{agent.city_id}**. Born in Year {agent.birth_year}, Month {agent.birth_month}, {agent.first_name} has pursued a career in {agent.occupation} with an ambition centered on **{agent.ambition}**.

## Personal & Demographic Dossier
- **Gender:** {agent.gender}
- **Education:** {agent.education_level}
- **Monthly Income:** ${agent.monthly_income:,.2f}
- **Accumulated Wealth:** ${agent.wealth:,.2f}
- **Housing Status:** {agent.housing_status}
- **Spouse ID:** {agent.spouse_id or "Unmarried"}
- **Children:** {", ".join(agent.children_ids) if agent.children_ids else "None"}

## Personality & Belief Matrix
- **Openness:** {agent.personality.openness:.2f}
- **Conscientiousness:** {agent.personality.conscientiousness:.2f}
- **Extraversion:** {agent.personality.extraversion:.2f}
- **Agreeableness:** {agent.personality.agreeableness:.2f}
- **Neuroticism:** {agent.personality.neuroticism:.2f}
- **Political Spectrum:** {agent.values.political_orientation:+.2f}

## Life Events & Historical Timeline
"""
        if events:
            for ev in events:
                content += f"- **Year {ev.year}, Month {ev.month} (Tick {ev.tick}):** {ev.title} — {ev.description}\n"
        else:
            content += "*No major recorded public events yet.*\n"

        filepath = os.path.join(self.output_dir, "people", f"{agent.id}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        return content

    def generate_city_article(self, city: City, resident_count: int) -> str:
        content = f"""# {city.name} — Living Encyclopedia

> *"{city.tagline}"*

---

## Overview
{city.description}

## Key Demographics & Economy
- **Current Resident Population:** {resident_count}
- **Municipal Treasury:** ${city.municipal_treasury:,.2f}
- **Tax Rate:** {city.tax_rate * 100:.1f}%
- **Cost of Living Index:** {city.cost_of_living_index:.2f}
- **Primary Industries:** {", ".join(city.primary_industries)}
"""
        filepath = os.path.join(self.output_dir, "cities", f"{city.id}.md")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        return content
