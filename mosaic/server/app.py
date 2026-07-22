import os
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from mosaic.core.tick_engine import SimulationEngine

app = FastAPI(title="Mosaic - Persistent Artificial Civilization API", version="2.0.0")

# Global Engine Instance
engine = SimulationEngine(master_seed=42)
engine.initialize_new_world(population=500)

WEB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web")
WIKI_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "wiki_data")
os.makedirs(WEB_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
def get_web_portal():
    index_path = os.path.join(WEB_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return "<h1>Mosaic Observer Portal Loading...</h1>"

@app.get("/api/status")
def get_simulation_status():
    living_count = len([a for a in engine.agents.values() if a.is_alive])
    return {
        "tick": engine.tick,
        "year": engine.year,
        "month": engine.month,
        "date_str": engine.current_date_str,
        "total_population": len(engine.agents),
        "living_population": living_count,
        "monthly_gdp": engine.economy.total_gdp,
        "ruling_party": engine.politics.ruling_party_id or "Local Councils",
        "salient_events_count": len(engine.causal_graph.nodes),
        "total_rumors": len(engine.media.rumors)
    }

@app.get("/api/history")
def get_simulation_history():
    return getattr(engine, "history", [])

@app.post("/api/step")
def step_simulation(months: int = Query(1, ge=1, le=24)):
    results = []
    for _ in range(months):
        res = engine.step_month()
        results.append(res)
    return {"stepped_months": len(results), "latest": results[-1]}

@app.get("/api/newspaper/latest")
def get_latest_newspaper():
    if not engine.newspapers:
        return {"message": "No newspapers published yet."}
    return engine.newspapers[-1].to_dict()

@app.get("/api/newspaper/all")
def get_all_newspapers():
    return [n.to_dict() for n in engine.newspapers]

@app.get("/api/agents")
def get_agents(city: Optional[str] = None, occupation: Optional[str] = None, search: Optional[str] = None, limit: int = 50):
    filtered = list(engine.agents.values())
    if city:
        filtered = [a for a in filtered if a.city_id == city]
    if occupation:
        filtered = [a for a in filtered if occupation.lower() in a.occupation.lower()]
    if search:
        s = search.lower()
        filtered = [a for a in filtered if s in a.full_name.lower()]

    return [a.to_dict() for a in filtered[:limit]]

@app.get("/api/agents/{agent_id}")
def get_agent_dossier(agent_id: str):
    if agent_id not in engine.agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = engine.agents[agent_id]
    memories = engine.agent_memories.get(agent_id)
    events = engine.causal_graph.get_agent_events(agent_id)
    
    # Spouse & children names
    spouse_name = engine.agents[agent.spouse_id].full_name if agent.spouse_id and agent.spouse_id in engine.agents else "Unmarried"
    children = [engine.agents[cid].full_name for cid in agent.children_ids if cid in engine.agents]
    parents = [engine.agents[pid].full_name for pid in agent.parent_ids if pid in engine.agents]

    return {
        "identity": agent.to_dict(),
        "spouse_name": spouse_name,
        "children_names": children,
        "parent_names": parents,
        "salient_memories": [m.to_dict() for m in (memories.get_salient_memories(engine.tick) if memories else [])],
        "historical_events": [e.to_dict() for e in events]
    }

@app.get("/api/cities")
def get_cities_overview():
    res = {}
    for cid, city in engine.cities.items():
        residents = [a for a in engine.agents.values() if a.city_id == cid and a.is_alive]
        data = city.to_dict()
        data["population_count"] = len(residents)
        res[cid] = data
    return res

@app.get("/api/economy")
def get_economy_overview():
    return engine.economy.to_dict()

@app.get("/api/politics")
def get_politics_overview():
    return engine.politics.to_dict()

@app.get("/api/echo")
def get_sim_social_feed(limit: int = 25):
    return {
        "feed": [p.to_dict() for p in engine.media.get_feed(limit)],
        "trending": engine.media.trending_hashtags,
        "rumors_count": len(engine.media.rumors)
    }

@app.get("/api/causal/explain/{event_id}")
def explain_causal_event(event_id: str, depth: int = 3):
    return engine.causal_graph.explain_event(event_id, depth)

@app.get("/api/causal/events")
def get_all_causal_events(limit: int = 50):
    nodes = list(engine.causal_graph.nodes.values())
    sorted_nodes = sorted(nodes, key=lambda n: n.tick, reverse=True)
    return [n.to_dict() for n in sorted_nodes[:limit]]

@app.get("/api/wiki/list")
def get_wiki_index():
    result = {"cities": [], "people": []}
    cities_dir = os.path.join(WIKI_DIR, "cities")
    people_dir = os.path.join(WIKI_DIR, "people")
    
    if os.path.exists(cities_dir):
        result["cities"] = [f.replace(".md", "") for f in os.listdir(cities_dir) if f.endswith(".md")]
    if os.path.exists(people_dir):
        result["people"] = [f.replace(".md", "") for f in os.listdir(people_dir) if f.endswith(".md")]
        
    return result

@app.get("/api/wiki/read/{category}/{entity_id}")
def read_wiki_article(category: str, entity_id: str):
    file_path = os.path.join(WIKI_DIR, category, f"{entity_id}.md")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Encyclopedia entry not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return {"category": category, "entity_id": entity_id, "markdown": f.read()}
