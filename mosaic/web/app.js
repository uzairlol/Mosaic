/**
 * MOSAIC — Earthy Planetary God's Eye Observer App (Solaria Prime)
 * Renders topographical planet map, biome zones, agent swarms, and multi-box telemetry.
 */

class MosaicPlanetaryApp {
    constructor() {
        this.autoPlayTimer = null;
        this.autoPlaySpeed = 2000;
        this.isStepping = false;

        this.state = {
            status: {},
            history: [],
            cities: {},
            agents: [],
            echoFeed: [],
            latestNewspaper: null,
            agentPositions: new Map(), // agent_id -> position info
            hoveredAgent: null
        };

        // Topographical Biome Node Centers on Solaria Prime (1000x480 resolution)
        this.planetBiomes = {
            city_solaria: { name: 'Solaria Metropolis', x: 520, y: 160, radius: 110, color: '#f4a261', type: 'Metropolis' },
            city_aethelgard: { name: 'Aethelgard Bay & Docks', x: 220, y: 220, radius: 95, color: '#2a9d8f', type: 'Coastal Docks' },
            city_ironreach: { name: 'Ironreach Granite Ridges', x: 320, y: 360, radius: 90, color: '#c25e40', type: 'Foundry Ridges' },
            city_veridia: { name: 'Veridia Forest Valley', x: 760, y: 300, radius: 105, color: '#2d6a4f', type: 'Forest Valley' }
        };

        this.initDOM();
        this.bindEvents();
        this.initCanvas();
        this.refreshAll();
    }

    initDOM() {
        this.elements = {
            dateStr: document.getElementById('val-date'),
            gdpVal: document.getElementById('val-gdp'),
            popVal: document.getElementById('val-pop'),
            partyVal: document.getElementById('val-party'),
            polRuling: document.getElementById('pol-ruling'),
            eventsVal: document.getElementById('val-events'),
            tickBadge: document.getElementById('canvas-tick-badge'),

            btnStep: document.getElementById('btn-step'),
            btnStep6: document.getElementById('btn-step6'),
            btnPlay: document.getElementById('btn-play'),
            speedSelect: document.getElementById('speed-select'),

            godsCanvas: document.getElementById('gods-canvas'),
            mapTooltip: document.getElementById('map-tooltip'),
            mapAgentCount: document.getElementById('map-agent-count'),

            gdpCanvas: document.getElementById('canvas-gdp'),

            agentsGrid: document.getElementById('agents-grid'),
            agentSearch: document.getElementById('agent-search'),

            echoFeed: document.getElementById('echo-feed'),
            newspaperContainer: document.getElementById('newspaper-container'),

            drawerBackdrop: document.getElementById('drawer-backdrop'),
            drawerClose: document.getElementById('drawer-close'),
            drawerContent: document.getElementById('drawer-content')
        };
    }

    bindEvents() {
        this.elements.btnStep.addEventListener('click', () => this.stepSimulation(1));
        this.elements.btnStep6.addEventListener('click', () => this.stepSimulation(6));

        this.elements.btnPlay.addEventListener('click', () => this.toggleAutoPlay());
        this.elements.speedSelect.addEventListener('change', (e) => {
            this.autoPlaySpeed = parseInt(e.target.value, 10);
            if (this.autoPlayTimer) {
                this.stopAutoPlay();
                this.startAutoPlay();
            }
        });

        if (this.elements.agentSearch) {
            this.elements.agentSearch.addEventListener('input', () => this.renderAgentsGrid());
        }

        if (this.elements.drawerClose) {
            this.elements.drawerClose.addEventListener('click', () => this.closeDrawer());
        }
        if (this.elements.drawerBackdrop) {
            this.elements.drawerBackdrop.addEventListener('click', (e) => {
                if (e.target === this.elements.drawerBackdrop) this.closeDrawer();
            });
        }

        // Canvas Events
        if (this.elements.godsCanvas) {
            this.elements.godsCanvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
            this.elements.godsCanvas.addEventListener('click', () => this.handleCanvasClick());
            this.elements.godsCanvas.addEventListener('mouseleave', () => {
                this.state.hoveredAgent = null;
                if (this.elements.mapTooltip) this.elements.mapTooltip.style.display = 'none';
            });
        }
    }

    async refreshAll() {
        await Promise.all([
            this.fetchStatus(),
            this.fetchHistory(),
            this.fetchCities(),
            this.fetchAgents(),
            this.fetchEchoFeed(),
            this.fetchNewspaper()
        ]);
        this.renderTelemetry();
        this.renderSparkline();
    }

    async fetchStatus() {
        try {
            const res = await fetch('/api/status');
            this.state.status = await res.json();
        } catch (e) {
            console.error('Failed status fetch:', e);
        }
    }

    async fetchHistory() {
        try {
            const res = await fetch('/api/history');
            this.state.history = await res.json();
        } catch (e) {
            console.error('Failed history fetch:', e);
        }
    }

    async fetchCities() {
        try {
            const res = await fetch('/api/cities');
            this.state.cities = await res.json();
        } catch (e) {
            console.error('Failed cities fetch:', e);
        }
    }

    async fetchAgents() {
        try {
            const res = await fetch('/api/agents?limit=250');
            this.state.agents = await res.json();
            this.updateAgentPositions();
            this.renderAgentsGrid();
        } catch (e) {
            console.error('Failed agents fetch:', e);
        }
    }

    async fetchEchoFeed() {
        try {
            const res = await fetch('/api/echo?limit=15');
            const data = await res.json();
            this.state.echoFeed = data.feed || [];
            this.renderEchoFeed();
        } catch (e) {
            console.error('Failed echo fetch:', e);
        }
    }

    async fetchNewspaper() {
        try {
            const res = await fetch('/api/newspaper/latest');
            this.state.latestNewspaper = await res.json();
            this.renderNewspaper();
        } catch (e) {
            console.error('Failed newspaper fetch:', e);
        }
    }

    async stepSimulation(months = 1) {
        if (this.isStepping) return;
        this.isStepping = true;
        this.elements.btnStep.disabled = true;
        this.elements.btnStep.innerHTML = '⚡ Stepping...';

        try {
            await fetch(`/api/step?months=${months}`, { method: 'POST' });
            await this.refreshAll();
        } catch (e) {
            console.error('Step execution error:', e);
        } finally {
            this.isStepping = false;
            this.elements.btnStep.disabled = false;
            this.elements.btnStep.innerHTML = '⚡ Step Month';
        }
    }

    toggleAutoPlay() {
        if (this.autoPlayTimer) this.stopAutoPlay();
        else this.startAutoPlay();
    }

    startAutoPlay() {
        this.elements.btnPlay.innerHTML = '⏸ Pause';
        this.elements.btnPlay.classList.add('btn-active');
        this.autoPlayTimer = setInterval(() => {
            if (!this.isStepping) this.stepSimulation(1);
        }, this.autoPlaySpeed);
    }

    stopAutoPlay() {
        this.elements.btnPlay.innerHTML = '▶ Auto Play';
        this.elements.btnPlay.classList.remove('btn-active');
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }

    renderTelemetry() {
        const s = this.state.status;
        if (!s) return;
        if (this.elements.dateStr) this.elements.dateStr.textContent = s.date_str || `Month ${s.tick}`;
        if (this.elements.tickBadge) this.elements.tickBadge.textContent = `TICK #${s.tick || 0}`;
        if (this.elements.gdpVal) this.elements.gdpVal.textContent = `$${(s.monthly_gdp || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (this.elements.popVal) this.elements.popVal.textContent = `${s.living_population || 0} / ${s.total_population || 0}`;
        if (this.elements.partyVal) this.elements.partyVal.textContent = s.ruling_party || 'Council';
        if (this.elements.polRuling) this.elements.polRuling.textContent = s.ruling_party || 'Council';
        if (this.elements.eventsVal) this.elements.eventsVal.textContent = s.salient_events_count || 0;
        if (this.elements.mapAgentCount) this.elements.mapAgentCount.textContent = `${s.living_population || 0} CITIZENS LIVE`;
    }

    // ─────────────────────────────────────────────────────────────
    // TOPOGRAPHICAL PLANETARY CANVAS SIMULATION ENGINE
    // ─────────────────────────────────────────────────────────────
    initCanvas() {
        const canvas = this.elements.godsCanvas;
        if (!canvas) return;

        canvas.width = 1000;
        canvas.height = 480;

        const renderLoop = () => {
            this.updatePositionsLoop();
            this.drawPlanetaryCanvas();
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

    updateAgentPositions() {
        const agents = this.state.agents;
        const tick = this.state.status.tick || 0;

        agents.forEach((a, idx) => {
            const cityKey = a.city_id in this.planetBiomes ? a.city_id : 'city_solaria';
            const b = this.planetBiomes[cityKey];

            const seed = (idx * 41 + tick * 19) % 360;
            const angle = (seed * Math.PI) / 180;
            const dist = 12 + ((idx * 11) % (b.radius - 20));

            const targetX = b.x + Math.cos(angle) * dist;
            const targetY = b.y + Math.sin(angle) * dist;

            let color = '#f4a261'; // Ochre
            let activity = 'Working';

            if (idx % 4 === 0) { color = '#2d6a4f'; activity = 'At Home'; }
            else if (idx % 6 === 0) { color = '#d97724'; activity = 'Assembly'; }
            else if (idx % 9 === 0) { color = '#2a9d8f'; activity = 'Harbor Trade'; }
            else if (a.wealth < 1000) { color = '#c25e40'; activity = 'Financial Distress'; }

            if (!this.state.agentPositions.has(a.id)) {
                this.state.agentPositions.set(a.id, {
                    id: a.id,
                    name: a.full_name,
                    occupation: a.occupation,
                    city: b.name,
                    x: targetX,
                    y: targetY,
                    targetX,
                    targetY,
                    color,
                    activity
                });
            } else {
                const pos = this.state.agentPositions.get(a.id);
                pos.targetX = targetX;
                pos.targetY = targetY;
                pos.color = color;
                pos.activity = activity;
            }
        });
    }

    updatePositionsLoop() {
        this.state.agentPositions.forEach(pos => {
            pos.x += (pos.targetX - pos.x) * 0.08;
            pos.y += (pos.targetY - pos.y) * 0.08;
        });
    }

    drawPlanetaryCanvas() {
        const canvas = this.elements.godsCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Ocean Basin Fill
        ctx.fillStyle = '#121920';
        ctx.fillRect(0, 0, w, h);

        // Draw Coastlines / Biomes
        Object.values(this.planetBiomes).forEach(b => {
            // Biome terrain glow
            const grad = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.radius);
            grad.addColorStop(0, b.color + '44');
            grad.addColorStop(1, b.color + '05');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Biome contour border
            ctx.strokeStyle = b.color + 'aa';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Biome Title
            ctx.fillStyle = '#f8f5ee';
            ctx.font = 'bold 12px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.name.toUpperCase(), b.x, b.y - b.radius - 6);
        });

        // Trade Roads
        ctx.strokeStyle = '#26323e';
        ctx.lineWidth = 3;
        const bm = Object.values(this.planetBiomes);
        ctx.beginPath();
        ctx.moveTo(bm[0].x, bm[0].y); ctx.lineTo(bm[1].x, bm[1].y);
        ctx.moveTo(bm[0].x, bm[0].y); ctx.lineTo(bm[2].x, bm[2].y);
        ctx.moveTo(bm[0].x, bm[0].y); ctx.lineTo(bm[3].x, bm[3].y);
        ctx.stroke();

        // Render Agent Swarm Sprites
        this.state.agentPositions.forEach(pos => {
            const isHovered = this.state.hoveredAgent?.id === pos.id;

            ctx.fillStyle = pos.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isHovered ? 8 : 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#121920';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (isHovered) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
    }

    handleCanvasMouseMove(e) {
        const canvas = this.elements.godsCanvas;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

        let found = null;
        this.state.agentPositions.forEach(pos => {
            const dist = Math.hypot(pos.x - mouseX, pos.y - mouseY);
            if (dist < 10) found = pos;
        });

        this.state.hoveredAgent = found;
        const tooltip = this.elements.mapTooltip;

        if (found && tooltip) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 12}px`;
            tooltip.style.top = `${e.clientY + 12}px`;
            tooltip.innerHTML = `
                <strong>${found.name}</strong> (${found.occupation})<br/>
                <span>📍 ${found.city}</span> • <span style="color:var(--earth-terracotta);">${found.activity}</span>
            `;
        } else if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    handleCanvasClick() {
        if (this.state.hoveredAgent) {
            this.inspectAgent(this.state.hoveredAgent.id);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // OTHER DOMAIN BOXES & INSPECTOR
    // ─────────────────────────────────────────────────────────────
    renderSparkline() {
        const hist = this.state.history;
        const canvas = this.elements.gdpCanvas;
        if (!canvas || !hist || hist.length < 2) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = 120;

        ctx.clearRect(0, 0, width, height);
        const dataPoints = hist.map(h => h.gdp);
        const min = Math.min(...dataPoints);
        const max = Math.max(...dataPoints);
        const range = (max - min) || 1;
        const padding = 15;

        ctx.beginPath();
        dataPoints.forEach((val, i) => {
            const x = padding + (i / (dataPoints.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    renderAgentsGrid() {
        if (!this.elements.agentsGrid) return;
        const search = (this.elements.agentSearch?.value || '').toLowerCase();

        const filtered = this.state.agents.filter(a =>
            a.full_name.toLowerCase().includes(search) || a.occupation.toLowerCase().includes(search)
        ).slice(0, 12);

        let html = '';
        filtered.forEach(a => {
            html += `
                <div style="background:var(--earth-cream); border:var(--border-thin); padding:0.55rem; border-radius:var(--radius-sharp); cursor:pointer;" onclick="app.inspectAgent('${a.id}')">
                    <strong style="font-family:var(--font-blocky); font-size:0.9rem;">${a.full_name}</strong>
                    <div style="font-size:0.75rem; color:var(--ink-muted);">${a.occupation}</div>
                </div>
            `;
        });
        this.elements.agentsGrid.innerHTML = html || '<p style="font-size:0.8rem;">No citizens found.</p>';
    }

    async inspectAgent(agentId) {
        try {
            const res = await fetch(`/api/agents/${agentId}`);
            const data = await res.json();
            this.renderAgentDossier(data);
            this.openDrawer();
        } catch (e) {
            console.error('Failed to load dossier:', e);
        }
    }

    renderAgentDossier(data) {
        const id = data.identity;
        let html = `
            <h2 style="font-family:var(--font-blocky); font-size:1.5rem; font-weight:800;">${id.full_name}</h2>
            <div style="font-family:var(--font-mono); font-size:0.85rem; font-weight:700; margin-bottom:1rem;">${id.occupation} in ${id.city_id.replace('city_', '').toUpperCase()}</div>

            <div style="background:var(--earth-cream); border:var(--border-thick); padding:0.8rem; border-radius:var(--radius-sharp); margin-bottom:1rem; font-size:0.85rem;">
                <div><strong>AGE:</strong> ${id.age}</div>
                <div><strong>WEALTH:</strong> $${(id.wealth || 0).toLocaleString()}</div>
                <div><strong>SPOUSE:</strong> ${data.spouse_name}</div>
            </div>
        `;
        this.elements.drawerContent.innerHTML = html;
    }

    openDrawer() { this.elements.drawerBackdrop.classList.add('open'); }
    closeDrawer() { this.elements.drawerBackdrop.classList.remove('open'); }

    renderEchoFeed() {
        if (!this.elements.echoFeed) return;
        const posts = this.state.echoFeed.slice(0, 4);
        let html = '';
        posts.forEach(p => {
            html += `
                <div style="background:var(--earth-cream); border:var(--border-thin); padding:0.6rem; border-radius:var(--radius-sharp); font-size:0.82rem;">
                    <strong>${p.author_name}:</strong> "${p.content}"
                </div>
            `;
        });
        this.elements.echoFeed.innerHTML = html || '<p style="font-size:0.8rem;">No Echo posts.</p>';
    }

    renderNewspaper() {
        if (!this.elements.newspaperContainer) return;
        const news = this.state.latestNewspaper;
        if (!news || news.message) {
            this.elements.newspaperContainer.innerHTML = '<p style="font-size:0.8rem;">No gazette issue.</p>';
            return;
        }

        this.elements.newspaperContainer.innerHTML = `
            <div style="background:var(--earth-cream); border:var(--border-thin); padding:0.8rem; border-radius:var(--radius-sharp);">
                <div style="font-family:var(--font-pixel); font-size:0.7rem; color:var(--earth-terracotta);">ISSUE #${news.tick}</div>
                <h3 style="font-family:var(--font-blocky); font-size:1.1rem; margin:0.3rem 0;">${news.headline}</h3>
                <p style="font-size:0.82rem; color:var(--ink-muted);">${(news.articles || [])[0]?.body || ''}</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new MosaicPlanetaryApp();
});
