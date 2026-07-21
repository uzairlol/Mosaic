from dataclasses import dataclass, field
from typing import Dict, Any, List
from mosaic.core.causal_graph import CausalNode

@dataclass
class NewspaperIssue:
    issue_number: int
    year: int
    month: int
    headline: str
    subheadline: str
    lead_story: str
    economic_report: str
    political_editorial: str
    social_pulse: str
    salient_event_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "NewspaperIssue":
        return cls(**data)


class AutomatedHistorianNewspaper:
    """
    Automated Journalist & Historian.
    At the conclusion of each tick, compiles a formatted issue of 'The Mosaic Chronicle'.
    """
    MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]

    @classmethod
    def generate_issue(
        cls,
        tick: int,
        year: int,
        month: int,
        salient_events: List[CausalNode],
        econ_stats: Dict[str, Any],
        political_stats: Dict[str, Any],
        echo_feed: List[Any]
    ) -> NewspaperIssue:
        month_name = cls.MONTH_NAMES[(month - 1) % 12]
        
        # Lead Story Selection based on highest impact event
        sorted_events = sorted(salient_events, key=lambda e: e.impact_salience, reverse=True)
        
        if sorted_events:
            lead_event = sorted_events[0]
            headline = f"{lead_event.title.upper()}"
            subheadline = f"Major developments in {lead_event.location_city or 'Mosaic'} send waves across the republic."
            lead_story = (
                f"**MOSAIC (CHRONICLE DESK)** — In {month_name} of Year {year}, {lead_event.description} "
                f"Observers mark this as a defining milestone for local institutions."
            )
        else:
            headline = f"THE QUIET PULSE OF {month_name.upper()} YEAR {year}"
            subheadline = "Civilization moves forward through steady trade and civic life."
            lead_story = (
                f"**MOSAIC (CHRONICLE DESK)** — {month_name} Year {year} registered as a month of institutional consolidation. "
                "Citizens across all four cities engaged in regular commerce and civic routines."
            )

        # Economic Report
        gdp = econ_stats.get("monthly_gdp", 0.0)
        active_comps = econ_stats.get("active_companies", 0)
        bankrupts = len(econ_stats.get("bankruptcies", []))
        economic_report = (
            f"Monthly Gross Domestic Product reached **${gdp:,.2f}** with **{active_comps}** active corporate enterprises. "
            f"{f'Notably, {bankrupts} businesses filed for restructuring.' if bankrupts else 'Corporate financial stability remained firm across sectors.'}"
        )

        # Political Editorial
        ruling = political_stats.get("ruling_party_id", "Coalition Government")
        political_editorial = (
            f"Civic governance remains anchored under {ruling or 'Local Municipal Councils'}. "
            f"Public debates continue to focus on municipal tax rates and infrastructure development."
        )

        # Social Pulse
        social_pulse = "Echo social sentiment indicates active community discourse around career opportunities and urban living."
        if echo_feed:
            top_post = echo_feed[0]
            social_pulse = f"Popular discourse on Echo was headlined by {top_post.author_name}: '{top_post.content}'"

        return NewspaperIssue(
            issue_number=tick,
            year=year,
            month=month,
            headline=headline,
            subheadline=subheadline,
            lead_story=lead_story,
            economic_report=economic_report,
            political_editorial=political_editorial,
            social_pulse=social_pulse,
            salient_event_ids=[e.id for e in sorted_events]
        )
