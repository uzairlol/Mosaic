from typing import Dict, Any, List, Tuple
from mosaic.agents.identity import AgentIdentity, PersonalityTraits, ValuesBeliefs
from mosaic.agents.kinship import KinshipEngine
from mosaic.world.city import BUILTIN_CITIES, City
from mosaic.world.economy import Company, EconomicSystem
from mosaic.world.politics import PoliticalParty, PoliticalSystem
from mosaic.core.prng import SeededPRNG

FIRST_NAMES_MALE = ["Arthur", "Julian", "Marcus", "Cedric", "Ethan", "Damian", "Gabriel", "Lucas", "Oliver", "Sebastian",
                    "Victor", "Xavier", "Felix", "Tristan", "Adrian", "Dominic", "Leo", "Vincent", "Matteo", "Hugo"]
FIRST_NAMES_FEMALE = ["Elena", "Clara", "Sophia", "Aria", "Isabella", "Maya", "Valerie", "Genevieve", "Seraphina", "Nora",
                      "Lydia", "Camilla", "Aurora", "Iris", "Freya", "Stella", "Vivian", "Naomi", "Celia", "Diana"]
LAST_NAMES = ["Vane", "Sterling", "Hawthorne", "Mercer", "Blackwood", "Sinclair", "Kensington", "Davenport", "Ashford",
              "Montague", "Winter", "Vance", "Cross", "Fletcher", "St. Clair", "Holt", "Castile", "Rhodes", "Vanguard", "Thorne"]

JOB_CATALOG = [
    ("Dock Logistics Specialist", 3200.0, "city_aethelgard"),
    ("Steel Foundry Engineer", 4100.0, "city_aethelgard"),
    ("Maritime Transport Officer", 3800.0, "city_aethelgard"),
    ("Financial Analyst", 5800.0, "city_vespera"),
    ("Software Engineer", 6200.0, "city_vespera"),
    ("Venture Investment Director", 8500.0, "city_vespera"),
    ("Organic Agronomist", 2900.0, "city_oakhaven"),
    ("Artisan Brewer", 3100.0, "city_oakhaven"),
    ("Solar Infrastructure Tech", 3600.0, "city_oakhaven"),
    ("Investigative Journalist", 4200.0, "city_solaria"),
    ("Public Relations Strategist", 4800.0, "city_solaria"),
    ("Broadcast Media Producer", 5200.0, "city_solaria")
]

class WorldBuilder:
    """
    Generates the baseline world state with 500 heterogeneous agents, starter companies,
    family networks, and political parties across 4 cities.
    """
    @classmethod
    def generate_world(cls, prng: SeededPRNG, target_population: int = 500) -> Dict[str, Any]:
        cities = {cid: city for cid, city in BUILTIN_CITIES.items()}
        city_ids = list(cities.keys())
        
        agents: Dict[str, AgentIdentity] = {}
        families: List[Tuple[str, str]] = []  # spouse pairs
        
        # 1. Create Agents
        for i in range(1, target_population + 1):
            agent_id = f"agent_{i:04d}"
            gender = "Male" if prng.random() < 0.5 else "Female"
            first_name = prng.choice(FIRST_NAMES_MALE if gender == "Male" else FIRST_NAMES_FEMALE)
            last_name = prng.choice(LAST_NAMES)
            age = prng.randint(18, 72)
            birth_year = 2000 - (age - 26)
            birth_month = prng.randint(1, 12)
            city_id = prng.choice(city_ids)
            
            # Matched job for city
            available_jobs = [j for j in JOB_CATALOG if j[2] == city_id]
            job_title, base_income, _ = prng.choice(available_jobs) if available_jobs else ("General Labor", 2800.0, city_id)
            
            wealth = max(1000.0, prng.normalvariate(12000.0, 6000.0))
            rent = cities[city_id].cost_of_living_index * 800.0
            
            personality = PersonalityTraits(
                openness=round(prng.uniform(0.1, 0.95), 2),
                conscientiousness=round(prng.uniform(0.1, 0.95), 2),
                extraversion=round(prng.uniform(0.1, 0.95), 2),
                agreeableness=round(prng.uniform(0.1, 0.95), 2),
                neuroticism=round(prng.uniform(0.1, 0.95), 2)
            )
            
            values = ValuesBeliefs(
                political_orientation=round(prng.uniform(-0.9, 0.9), 2),
                materialism=round(prng.uniform(0.1, 0.9), 2),
                tradition_vs_innovation=round(prng.uniform(0.1, 0.9), 2),
                community_vs_individualism=round(prng.uniform(0.1, 0.9), 2)
            )
            
            agent = AgentIdentity(
                id=agent_id,
                first_name=first_name,
                last_name=last_name,
                gender=gender,
                age=age,
                birth_year=birth_year,
                birth_month=birth_month,
                city_id=city_id,
                education_level=prng.choice(["High School", "Bachelor", "Master", "Trade"]),
                occupation=job_title,
                monthly_income=base_income,
                wealth=wealth,
                savings=wealth * 0.4,
                monthly_rent_or_mortgage=rent,
                personality=personality,
                values=values,
                ambition=prng.choice(["Wealth", "Political Power", "Family", "Fame", "Innovation"]),
                happiness=round(prng.uniform(0.5, 0.9), 2)
            )
            agents[agent_id] = agent

        # 2. Establish Kinship Networks & Marriages
        adult_agents = [a for a in agents.values() if 22 <= a.age <= 65]
        prng.shuffle(adult_agents)
        for idx in range(0, len(adult_agents) - 1, 2):
            if prng.random() < 0.55:  # 55% married rate
                a1 = adult_agents[idx]
                a2 = adult_agents[idx+1]
                if a1.gender != a2.gender and not a1.spouse_id and not a2.spouse_id:
                    KinshipEngine.marry(a1, a2)

        # 3. Create Starter Companies
        economy = EconomicSystem()
        companies_def = [
            ("Aethelgard Ironworks", "city_aethelgard", "Manufacturing"),
            ("Vespera Dynamic Capital", "city_vespera", "Finance"),
            ("Oakhaven Harvest Corp", "city_oakhaven", "Agriculture"),
            ("Solaria Daily Broadcaster", "city_solaria", "Journalism & Media")
        ]
        for idx, (cname, cid, ind) in enumerate(companies_def, start=1):
            founder = prng.choice([a for a in agents.values() if a.city_id == cid])
            company = Company(
                id=f"comp_00{idx}",
                name=cname,
                city_id=cid,
                industry=ind,
                founder_id=founder.id,
                ceo_id=founder.id,
                capital=150000.0
            )
            economy.add_company(company)
            founder.company_id = company.id
            founder.occupation = f"CEO of {cname}"

        # 4. Create Initial Political Parties
        politics = PoliticalSystem()
        party1 = PoliticalParty(
            id="party_libertat",
            name="Libertat Progress Coalition",
            abbreviation="LPC",
            orientation_spectrum=-0.6,
            leader_id=prng.choice(list(agents.keys())),
            platform_summary="Focusing on innovation, civic freedoms, and modern infrastructure."
        )
        party2 = PoliticalParty(
            id="party_concordia",
            name="Concordia Heritage Party",
            abbreviation="CHP",
            orientation_spectrum=0.6,
            leader_id=prng.choice(list(agents.keys())),
            platform_summary="Focusing on traditional values, fiscal conservatism, and local enterprise."
        )
        politics.add_party(party1)
        politics.add_party(party2)

        return {
            "cities": {cid: c.to_dict() for cid, c in cities.items()},
            "agents": {aid: a.to_dict() for aid, a in agents.items()},
            "economy": economy.to_dict(),
            "politics": politics.to_dict()
        }
