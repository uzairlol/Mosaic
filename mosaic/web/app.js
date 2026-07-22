/**
 * MOSAIC — Artificial Civilization God's Eye Observer App
 * Features real-time 2D simulation canvas & pastel neo-brutalist interactive UI
 */

class MosaicGodsEyeApp {
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
            agentPositions: new Map(), // agent_id -> { x, y, targetX, targetY, color, activity, city }
            hoveredAgent: null
        };

        // City Map Node Centers on 2D Canvas (1000x500 resolution)
        this.cityNodes = {
            city_solaria: { name: 'City Solaria', x: 500, y: 150, radius: 110, color: '#fef08a' },
            city_aethelgard: { name: 'Aethelgard Docks', x: 200, y: 220, radius: 95, color: '#bae6fd' },
            city_ironreach: { name: 'Ironreach Foundries', x: 300, y: 380, radius: 90, color: '#fecdd3' },
            city_veridia: { name: 'Veridia Tech Valley', x: 750, y: 320, radius: 100, color: '#a7f3d0' }
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
            eventsVal: document.getElementById('val-events'),
            tickBadge: document.getElementById('canvas-tick-badge'),

            btnStep: document.getElementById('btn-step'),
            btnStep6: document.getElementById('btn-step6'),
            btnPlay: document.getElementById('btn-play'),
            speedSelect: document.getElementById('speed-select'),

            tabBtns: document.querySelectorAll('.tab-btn'),
            tabPanels: document.querySelectorAll('.tab-panel'),

            godsCanvas: document.getElementById('gods-canvas'),
            mapTooltip: document.getElementById('map-tooltip'),
            mapAgentCount: document.getElementById('map-agent-count'),

            gdpCanvas: document.getElementById('canvas-gdp'),
            popCanvas: document.getElementById('canvas-pop'),

            citiesGrid: document.getElementById('cities-grid'),
            agentsGrid: document.getElementById('agents-grid'),
            agentSearch: document.getElementById('agent-search'),
            cityFilter: document.getElementById('city-filter'),

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

        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        if (this.elements.agentSearch) {
            this.elements.agentSearch.addEventListener('input', () => this.renderAgentsGrid());
        }
        if (this.elements.cityFilter) {
            this.elements.cityFilter.addEventListener('change', () => this.renderAgentsGrid());
        }

        if (this.elements.drawerClose) {
            this.elements.drawerClose.addEventListener('click', () => this.closeDrawer());
        }
        if (this.elements.drawerBackdrop) {
            this.elements.drawerBackdrop.addEventListener('click', (e) => {
                if (e.target === this.elements.drawerBackdrop) this.closeDrawer();
            });
        }

        // Canvas Mouse Events
        if (this.elements.godsCanvas) {
            this.elements.godsCanvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
            this.elements.godsCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.elements.godsCanvas.addEventListener('mouseleave', () => {
                this.state.hoveredAgent = null;
                if (this.elements.mapTooltip) this.elements.mapTooltip.style.display = 'none';
            });
        }
    }

    switchTab(tabId) {
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        this.elements.tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tabId}`);
        });

        if (tabId === 'agents' && this.state.agents.length === 0) this.fetchAgents();
        if (tabId === 'echo') this.fetchEchoFeed();
        if (tabId === 'newspaper') this.fetchNewspaper();
    }

    async refreshAll() {
        await Promise.all([
            this.fetchStatus(),
            this.fetchHistory(),
            this.fetchCities(),
            this.fetchAgents()
        ]);
        this.renderTelemetry();
        this.renderCities();

        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (activeTab === 'echo') this.fetchEchoFeed();
        if (activeTab === 'newspaper') this.fetchNewspaper();
        if (activeTab === 'overview') this.renderSparklines();
    }

    async fetchStatus() {
        try {
            const res = await fetch('/api/status');
            this.state.status = await res.json();
        } catch (e) {
            console.error('Failed to fetch status:', e);
        }
    }

    async fetchHistory() {
        try {
            const res = await fetch('/api/history');
            this.state.history = await res.json();
        } catch (e) {
            console.error('Failed to fetch history:', e);
        }
    }

    async fetchCities() {
        try {
            const res = await fetch('/api/cities');
            this.state.cities = await res.json();
        } catch (e) {
            console.error('Failed to fetch cities:', e);
        }
    }

    async fetchAgents() {
        try {
            const res = await fetch('/api/agents?limit=250');
            this.state.agents = await res.json();
            this.updateAgentPositions();
            this.renderAgentsGrid();
        } catch (e) {
            console.error('Failed to fetch agents:', e);
        }
    }

    async fetchEchoFeed() {
        try {
            const res = await fetch('/api/echo?limit=30');
            const data = await res.json();
            this.state.echoFeed = data.feed || [];
            this.renderEchoFeed();
        } catch (e) {
            console.error('Failed to fetch Echo feed:', e);
        }
    }

    async fetchNewspaper() {
        try {
            const res = await fetch('/api/newspaper/latest');
            this.state.latestNewspaper = await res.json();
            this.renderNewspaper();
        } catch (e) {
            console.error('Failed to fetch newspaper:', e);
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
        if (this.elements.tickBadge) this.elements.tickBadge.textContent = `#${s.tick || 0}`;
        if (this.elements.gdpVal) this.elements.gdpVal.textContent = `$${(s.monthly_gdp || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (this.elements.popVal) this.elements.popVal.textContent = `${s.living_population || 0} / ${s.total_population || 0}`;
        if (this.elements.partyVal) this.elements.partyVal.textContent = s.ruling_party || 'Council';
        if (this.elements.eventsVal) this.elements.eventsVal.textContent = s.salient_events_count || 0;
        if (this.elements.mapAgentCount) this.elements.mapAgentCount.textContent = `${s.living_population || 0} AGENTS LIVE`;
    }

    // ─────────────────────────────────────────────────────────────
    // GOD'S EYE 2D MAP CANVAS SIMULATION ENGINE
    // ─────────────────────────────────────────────────────────────
    initCanvas() {
        const canvas = this.elements.godsCanvas;
        if (!canvas) return;

        // Set high DPR resolution
        canvas.width = 1000;
        canvas.height = 500;

        // Start render loop
        const renderLoop = () => {
            this.updatePositionsLoop();
            this.drawGodsEyeCanvas();
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

    updateAgentPositions() {
        const agents = this.state.agents;
        const tick = this.state.status.tick || 0;

        agents.forEach((a, idx) => {
            const cityKey = a.city_id in this.cityNodes ? a.city_id : 'city_solaria';
            const node = this.cityNodes[cityKey];

            // Deterministic position inside city circle based on agent index and tick
            const seed = (idx * 37 + tick * 17) % 360;
            const angle = (seed * Math.PI) / 180;
            const dist = 15 + ((idx * 13) % (node.radius - 25));

            const targetX = node.x + Math.cos(angle) * dist;
            const targetY = node.y + Math.sin(angle) * dist;

            // Status color & activity
            let color = '#38bdf8'; // Workplace
            let activity = 'At Work';

            if (idx % 5 === 0) { color = '#10b981'; activity = 'At Residence'; }
            else if (idx % 7 === 0) { color = '#f59e0b'; activity = 'Political Assembly'; }
            else if (idx % 11 === 0) { color = '#a855f7'; activity = 'Market Plaza'; }
            else if (a.wealth < 1000) { color = '#f43f5e'; activity = 'Financial Stress'; }

            if (!this.state.agentPositions.has(a.id)) {
                this.state.agentPositions.set(a.id, {
                    id: a.id,
                    name: a.full_name,
                    occupation: a.occupation,
                    city: node.name,
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
        // Interpolate movement smoothly
        this.state.agentPositions.forEach(pos => {
            pos.x += (pos.targetX - pos.x) * 0.08;
            pos.y += (pos.targetY - pos.y) * 0.08;
        });
    }

    drawGodsEyeCanvas() {
        const canvas = this.elements.godsCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Background
        ctx.fillStyle = '#181825';
        ctx.fillRect(0, 0, w, h);

        // Draw connecting highways between cities
        ctx.strokeStyle = '#32324a';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);

        const nodes = Object.values(this.cityNodes);
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(nodes[1].x, nodes[1].y);
        ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(nodes[3].x, nodes[3].y);
        ctx.moveTo(nodes[1].x, nodes[1].y); ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw City Zones
        Object.values(this.cityNodes).forEach(node => {
            // Fill circle
            ctx.fillStyle = node.color + '1f'; // 12% opacity
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fill();

            // Thick border
            ctx.strokeStyle = node.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // City Label
            ctx.fillStyle = '#f4f0fa';
            ctx.font = 'bold 13px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.name.toUpperCase(), node.x, node.y - node.radius - 8);
        });

        // Draw Agent Sprites
        this.state.agentPositions.forEach(pos => {
            const isHovered = this.state.hoveredAgent?.id === pos.id;

            ctx.fillStyle = pos.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, isHovered ? 8 : 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#181825';
            ctx.lineWidth = isHovered ? 2 : 1;
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
                <span>📍 ${found.city}</span> • <span style="color:#181825;">${found.activity}</span>
            `;
        } else if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    handleCanvasClick(e) {
        if (this.state.hoveredAgent) {
            this.inspectAgent(this.state.hoveredAgent.id);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TELEMETRY & OTHER VIEWS
    // ─────────────────────────────────────────────────────────────
    renderSparklines() {
        const hist = this.state.history;
        if (!hist || hist.length === 0) return;
        this.drawSparkline(this.elements.gdpCanvas, hist.map(h => h.gdp), '#a7f3d0');
        this.drawSparkline(this.elements.popCanvas, hist.map(h => h.living_population), '#bae6fd');
    }

    drawSparkline(canvas, dataPoints, strokeColor) {
        if (!canvas || !dataPoints || dataPoints.length === 0) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = 200;

        ctx.clearRect(0, 0, width, height);
        const min = Math.min(...dataPoints);
        const max = Math.max(...dataPoints);
        const range = (max - min) || 1;
        const padding = 20;

        if (dataPoints.length < 2) return;

        ctx.beginPath();
        dataPoints.forEach((val, i) => {
            const x = padding + (i / (dataPoints.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    renderCities() {
        if (!this.elements.citiesGrid) return;
        const cities = this.state.cities;
        let html = '';
        Object.entries(cities).forEach(([cid, c]) => {
            html += `
                <div class="city-card">
                    <div class="city-name">${c.name}</div>
                    <div style="font-family:var(--font-mono); font-size:0.8rem; margin-bottom:0.5rem;">${c.architectural_style || 'Urban'}</div>
                    <p style="font-size:0.85rem; margin-bottom:0.8rem;">${c.description}</p>
                    <div style="font-family:var(--font-blocky); font-weight:700;">POPULATION: ${c.population_count || 0}</div>
                </div>
            `;
        });
        this.elements.citiesGrid.innerHTML = html;
    }

    renderAgentsGrid() {
        if (!this.elements.agentsGrid) return;
        const search = (this.elements.agentSearch?.value || '').toLowerCase();
        const citySel = this.elements.cityFilter?.value || '';

        const filtered = this.state.agents.filter(a => {
            const nameMatch = a.full_name.toLowerCase().includes(search) || a.occupation.toLowerCase().includes(search);
            const cityMatch = !citySel || a.city_id === citySel;
            return nameMatch && cityMatch;
        });

        let html = '';
        filtered.forEach(a => {
            html += `
                <div class="agent-card" onclick="app.inspectAgent('${a.id}')">
                    <div class="agent-name">${a.full_name}</div>
                    <div style="font-size:0.85rem; color:var(--ink-muted); font-weight:600;">${a.occupation}</div>
                    <div style="font-family:var(--font-mono); font-size:0.75rem; margin-top:0.4rem;">
                        ${a.age} yrs • Wealth: $${(a.wealth || 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                    </div>
                </div>
            `;
        });

        this.elements.agentsGrid.innerHTML = html || '<p>No matching citizens.</p>';
    }

    async inspectAgent(agentId) {
        try {
            const res = await fetch(`/api/agents/${agentId}`);
            const data = await res.json();
            this.renderAgentDossier(data);
            this.openDrawer();
        } catch (e) {
            console.error('Failed to load agent dossier:', e);
        }
    }

    renderAgentDossier(data) {
        const id = data.identity;
        const p = id.personality || {};

        let memHtml = (data.salient_memories || []).slice(0, 5).map(m => `
            <div style="padding:0.5rem; background:var(--bg-base); border:var(--border-thin); border-radius:var(--radius-sharp); margin-bottom:0.4rem; font-size:0.8rem;">
                <strong>Tick #${m.tick}:</strong> ${m.content}
            </div>
        `).join('') || '<p>No memories logged.</p>';

        let html = `
            <h2 style="font-family:var(--font-blocky); font-size:1.6rem; font-weight:800;">${id.full_name}</h2>
            <div style="font-family:var(--font-mono); font-size:0.9rem; font-weight:700; margin-bottom:1rem;">${id.occupation} in ${id.city_id.replace('city_', '').toUpperCase()}</div>

            <div style="background:var(--pastel-yellow); border:var(--border-thick); padding:0.8rem; border-radius:var(--radius-sharp); margin-bottom:1.2rem;">
                <div><strong>AGE:</strong> ${id.age}</div>
                <div><strong>WEALTH:</strong> $${(id.wealth || 0).toLocaleString()}</div>
                <div><strong>SPOUSE:</strong> ${data.spouse_name}</div>
                <div><strong>CHILDREN:</strong> ${data.children_names.length}</div>
            </div>

            <h3 style="font-family:var(--font-blocky); margin-bottom:0.4rem;">BIG-5 TRAITS</h3>
            <div style="font-size:0.8rem; margin-bottom:1rem;">
                Openness: ${p.openness || 0} | Extraversion: ${p.extraversion || 0} | Neuroticism: ${p.neuroticism || 0}
            </div>

            <h3 style="font-family:var(--font-blocky); margin-bottom:0.4rem;">SALIENT MEMORIES</h3>
            <div>${memHtml}</div>
        `;

        this.elements.drawerContent.innerHTML = html;
    }

    openDrawer() { this.elements.drawerBackdrop.classList.add('open'); }
    closeDrawer() { this.elements.drawerBackdrop.classList.remove('open'); }

    renderEchoFeed() {
        if (!this.elements.echoFeed) return;
        const posts = this.state.echoFeed;
        let html = '';
        posts.forEach(p => {
            html += `
                <div class="echo-card">
                    <div style="display:flex; justify-content:space-between; font-family:var(--font-blocky); font-weight:800;">
                        <span>${p.author_name}</span>
                        <span style="font-family:var(--font-pixel); font-size:0.75rem;">Tick #${p.tick}</span>
                    </div>
                    <p style="margin:0.5rem 0;">${p.content}</p>
                    <div style="font-family:var(--font-mono); font-size:0.75rem;">❤️ ${p.likes_count || 0} • 🔄 ${p.reposts_count || 0}</div>
                </div>
            `;
        });
        this.elements.echoFeed.innerHTML = html || '<p>No Echo posts.</p>';
    }

    renderNewspaper() {
        if (!this.elements.newspaperContainer) return;
        const news = this.state.latestNewspaper;
        if (!news || news.message) {
            this.elements.newspaperContainer.innerHTML = '<p>No gazette issue available.</p>';
            return;
        }

        const articles = (news.articles || []).map(a => `
            <div style="margin-bottom:1rem;">
                <h3 style="font-family:var(--font-blocky); font-size:1.3rem;">${a.title}</h3>
                <p>${a.body}</p>
            </div>
        `).join('');

        this.elements.newspaperContainer.innerHTML = `
            <div class="newspaper-wrapper">
                <div class="newspaper-title">The Solaria Chronicle</div>
                <div style="font-family:var(--font-mono); font-size:0.8rem; margin-bottom:1rem;">${news.date_str || `Tick ${news.tick}`} • ISSUE #${news.tick}</div>
                <h2 style="font-family:var(--font-blocky); font-size:1.8rem; margin-bottom:1rem;">${news.headline}</h2>
                <div>${articles}</div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new MosaicGodsEyeApp();
});
