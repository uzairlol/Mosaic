from typing import Dict, Any, List, Optional
from mosaic.agents.identity import AgentIdentity

class KinshipEngine:
    """
    Manages generation-spanning family trees, marriage, divorce, children birth, and asset inheritance.
    """
    @staticmethod
    def marry(agent1: AgentIdentity, agent2: AgentIdentity) -> bool:
        if agent1.spouse_id or agent2.spouse_id:
            return False
        agent1.spouse_id = agent2.id
        agent2.spouse_id = agent1.id
        # Take or hyphenate last name in 50% cases
        return True

    @staticmethod
    def divorce(agent1: AgentIdentity, agent2: AgentIdentity) -> bool:
        if agent1.spouse_id == agent2.id and agent2.spouse_id == agent1.id:
            agent1.spouse_id = None
            agent2.spouse_id = None
            # Wealth split
            combined_wealth = (agent1.wealth + agent2.wealth) / 2.0
            agent1.wealth = combined_wealth
            agent2.wealth = combined_wealth
            return True
        return False

    @staticmethod
    def add_child(parent1: AgentIdentity, parent2: Optional[AgentIdentity], child: AgentIdentity):
        child.parent_ids.append(parent1.id)
        parent1.children_ids.append(child.id)
        if parent2:
            child.parent_ids.append(parent2.id)
            parent2.children_ids.append(child.id)

    @staticmethod
    def execute_inheritance(deceased: AgentIdentity, all_agents: Dict[str, AgentIdentity]) -> Dict[str, Any]:
        """Transfers wealth & assets of deceased agent to spouse and surviving children."""
        estate_wealth = max(0.0, deceased.wealth)
        deceased.wealth = 0.0
        
        beneficiaries = []
        if deceased.spouse_id and deceased.spouse_id in all_agents:
            spouse = all_agents[deceased.spouse_id]
            if spouse.is_alive:
                beneficiaries.append(spouse)
                
        for child_id in deceased.children_ids:
            if child_id in all_agents:
                child = all_agents[child_id]
                if child.is_alive:
                    beneficiaries.append(child)

        if not beneficiaries:
            return {"estate_wealth": estate_wealth, "distributed": 0.0, "reverted_to_city": estate_wealth}

        share = estate_wealth / len(beneficiaries)
        for beneficiary in beneficiaries:
            beneficiary.wealth += share

        return {
            "estate_wealth": estate_wealth,
            "distributed_per_beneficiary": share,
            "beneficiary_ids": [b.id for b in beneficiaries]
        }
