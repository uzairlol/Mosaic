from dataclasses import dataclass, field
from typing import Dict, Any, List

@dataclass
class City:
    id: str
    name: str
    tagline: str
    description: str
    primary_industries: List[str]
    cost_of_living_index: float  # Base 1.0
    population_count: int = 0
    municipal_treasury: float = 500000.0
    tax_rate: float = 0.15       # 15% income tax
    quality_of_life: float = 0.75

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "City":
        return cls(**data)


BUILTIN_CITIES = {
    "city_aethelgard": City(
        id="city_aethelgard",
        name="Aethelgard",
        tagline="The Forge of Trade & Manufacturing",
        description="A bustling industrial port city dominated by shipping docks, steel mills, logistics hubs, and strong trade unions.",
        primary_industries=["Shipping", "Manufacturing", "Heavy Logistics", "Metallurgy"],
        cost_of_living_index=0.9,
        municipal_treasury=750000.0,
        tax_rate=0.14
    ),
    "city_vespera": City(
        id="city_vespera",
        name="Vespera",
        tagline="The Citadel of Finance & Technology",
        description="A gleaming metropolis of skyscrapers, venture capital firms, corporate headquarters, and cutting-edge tech startups.",
        primary_industries=["Finance", "Software & Tech", "Biotech", "Real Estate"],
        cost_of_living_index=1.4,
        municipal_treasury=1200000.0,
        tax_rate=0.18
    ),
    "city_oakhaven": City(
        id="city_oakhaven",
        name="Oakhaven",
        tagline="The Heart of Agriculture & Artisan Craft",
        description="A picturesque valley city surrounded by fertile farmland, craft breweries, organic agriculture, and traditional community governance.",
        primary_industries=["Agriculture", "Artisan Crafts", "Renewable Energy", "Ecotourism"],
        cost_of_living_index=0.8,
        municipal_treasury=400000.0,
        tax_rate=0.10
    ),
    "city_solaria": City(
        id="city_solaria",
        name="Solaria",
        tagline="The Beacon of Culture, Media & Politics",
        description="A vibrant coastal capital renowned for news outlets, broadcasting studios, fashion houses, political think tanks, and civic debate.",
        primary_industries=["Journalism & Media", "Arts & Entertainment", "Public Relations", "Law & Governance"],
        cost_of_living_index=1.1,
        municipal_treasury=900000.0,
        tax_rate=0.16
    )
}
