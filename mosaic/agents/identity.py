from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class PersonalityTraits:
    openness: float = 0.5        # 0.0 to 1.0
    conscientiousness: float = 0.5
    extraversion: float = 0.5
    agreeableness: float = 0.5
    neuroticism: float = 0.5

@dataclass
class ValuesBeliefs:
    political_orientation: float = 0.0  # -1.0 (Progressive/Left) to +1.0 (Conservative/Right)
    materialism: float = 0.5
    tradition_vs_innovation: float = 0.5
    community_vs_individualism: float = 0.5
    religiosity: float = 0.2

@dataclass
class AgentIdentity:
    id: str
    first_name: str
    last_name: str
    gender: str
    age: int
    birth_year: int
    birth_month: int
    city_id: str
    
    # Demographics & Family
    spouse_id: Optional[str] = None
    parent_ids: List[str] = field(default_factory=list)
    children_ids: List[str] = field(default_factory=list)
    
    # Socio-Economic
    education_level: str = "High School"
    occupation: str = "Unemployed"
    company_id: Optional[str] = None
    monthly_income: float = 3000.0
    wealth: float = 10000.0
    savings: float = 5000.0
    housing_status: str = "Renting"
    monthly_rent_or_mortgage: float = 800.0
    
    # Psychology & Traits
    personality: PersonalityTraits = field(default_factory=PersonalityTraits)
    values: ValuesBeliefs = field(default_factory=ValuesBeliefs)
    ambition: str = "Financial Stability"
    happiness: float = 0.7
    health: float = 0.9
    is_alive: bool = True
    
    # Reputation, Social & Migration
    reputation: float = 0.5
    friend_ids: List[str] = field(default_factory=list)
    rival_ids: List[str] = field(default_factory=list)
    political_party_id: Optional[str] = None
    city_history: List[str] = field(default_factory=list)  # History of cities lived in
    is_in_scandal: bool = False
    criminal_record: List[str] = field(default_factory=list)
    
    # Skills dictionary (skill_name -> proficiency 0.0-1.0)
    skills: Dict[str, float] = field(default_factory=lambda: {
        "management": 0.3, "engineering": 0.2, "commerce": 0.4,
        "politics": 0.2, "journalism": 0.2, "arts": 0.3
    })

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "gender": self.gender,
            "age": self.age,
            "birth_year": self.birth_year,
            "birth_month": self.birth_month,
            "city_id": self.city_id,
            "spouse_id": self.spouse_id,
            "parent_ids": self.parent_ids,
            "children_ids": self.children_ids,
            "education_level": self.education_level,
            "occupation": self.occupation,
            "company_id": self.company_id,
            "monthly_income": self.monthly_income,
            "wealth": self.wealth,
            "savings": self.savings,
            "housing_status": self.housing_status,
            "monthly_rent_or_mortgage": self.monthly_rent_or_mortgage,
            "personality": self.personality.__dict__,
            "values": self.values.__dict__,
            "ambition": self.ambition,
            "happiness": self.happiness,
            "health": self.health,
            "is_alive": self.is_alive,
            "reputation": self.reputation,
            "friend_ids": self.friend_ids,
            "rival_ids": self.rival_ids,
            "political_party_id": self.political_party_id,
            "city_history": self.city_history,
            "is_in_scandal": self.is_in_scandal,
            "criminal_record": self.criminal_record,
            "skills": self.skills
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AgentIdentity":
        data_copy = dict(data)
        data_copy["personality"] = PersonalityTraits(**data_copy.get("personality", {}))
        data_copy["values"] = ValuesBeliefs(**data_copy.get("values", {}))
        return cls(**data_copy)
