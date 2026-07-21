from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from mosaic.agents.identity import AgentIdentity
from mosaic.world.city import City

@dataclass
class Company:
    id: str
    name: str
    city_id: str
    industry: str
    founder_id: str
    ceo_id: str
    capital: float = 50000.0
    monthly_revenue: float = 20000.0
    employee_ids: List[str] = field(default_factory=list)
    average_wage: float = 3500.0
    is_active: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Company":
        return cls(**data)


class EconomicSystem:
    """
    Socio-Economic engine handling market dynamics, corporate revenue cycles, wage distribution,
    labor hiring/layoffs, and municipal taxation.
    """
    def __init__(self):
        self.companies: Dict[str, Company] = {}
        self.inflation_rate: float = 0.02
        self.total_gdp: float = 0.0

    def add_company(self, company: Company):
        self.companies[company.id] = company

    def step_economy(
        self,
        agents: Dict[str, AgentIdentity],
        cities: Dict[str, City],
        prng
    ) -> Dict[str, Any]:
        """
        Executes one monthly economic cycle across all companies and agents.
        """
        monthly_gdp = 0.0
        active_companies = 0
        bankruptcies = []

        # 1. Company Operations & Payroll
        for company in list(self.companies.values()):
            if not company.is_active:
                continue

            active_companies += 1
            # Revenue calculation based on industry & employee count
            emp_count = len(company.employee_ids) + 1  # include CEO
            productivity = emp_count * prng.uniform(2500, 4500)
            company.monthly_revenue = productivity
            monthly_gdp += productivity

            # Pay wages to employees
            total_payroll = 0.0
            for emp_id in company.employee_ids:
                if emp_id in agents and agents[emp_id].is_alive:
                    emp = agents[emp_id]
                    wage = company.average_wage * (1.0 + emp.skills.get("engineering", 0.2))
                    emp.monthly_income = wage
                    total_payroll += wage

            # Pay CEO
            if company.ceo_id in agents and agents[company.ceo_id].is_alive:
                ceo = agents[company.ceo_id]
                ceo_salary = company.average_wage * 2.0
                ceo.monthly_income = ceo_salary
                total_payroll += ceo_salary

            # Company profit / loss
            net_profit = company.monthly_revenue - total_payroll - (company.capital * 0.05)
            company.capital += net_profit

            # Bankruptcy condition
            if company.capital < -10000.0:
                company.is_active = False
                bankruptcies.append(company.id)
                # Layoff employees
                for emp_id in company.employee_ids:
                    if emp_id in agents:
                        agents[emp_id].occupation = "Unemployed"
                        agents[emp_id].monthly_income = 800.0  # Unemployment stipend
                        agents[emp_id].company_id = None

        # 2. Municipal Taxation
        tax_collected = 0.0
        for agent in agents.values():
            if not agent.is_alive:
                continue
            city = cities.get(agent.city_id)
            if city:
                tax = agent.monthly_income * city.tax_rate
                agent.wealth -= tax
                city.municipal_treasury += tax
                tax_collected += tax

        self.total_gdp = monthly_gdp

        return {
            "monthly_gdp": monthly_gdp,
            "active_companies": active_companies,
            "bankruptcies": bankruptcies,
            "tax_collected": tax_collected
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "companies": {cid: comp.to_dict() for cid, comp in self.companies.items()},
            "inflation_rate": self.inflation_rate,
            "total_gdp": self.total_gdp
        }

    def load_dict(self, data: Dict[str, Any]):
        self.companies = {cid: Company.from_dict(cdata) for cid, cdata in data.get("companies", {}).items()}
        self.inflation_rate = data.get("inflation_rate", 0.02)
        self.total_gdp = data.get("total_gdp", 0.0)
