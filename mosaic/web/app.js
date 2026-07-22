/**
 * MOSAIC — Artificial Civilization Telemetry Observer Client App
 */

class MosaicApp {
    constructor() {
        this.apiBase = '';
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
            causalEvents: [],
            selectedAgent: null
        };

        this.initDOM();
        this.bindEvents();
        this.refreshAll();
    }

    initDOM() {
        this.elements = {
            dateStr: document.getElementById('val-date'),
            tickVal: document.getElementById('val-tick'),
            gdpVal: document.getElementById('val-gdp'),
            popVal: document.getElementById('val-pop'),
            partyVal: document.getElementById('val-party'),
            eventsVal: document.getElementById('val-events'),

            btnStep: document.getElementById('btn-step'),
            btnStep6: document.getElementById('btn-step6'),
            btnPlay: document.getElementById('btn-play'),
            speedSelect: document.getElementById('speed-select'),

            tabBtns: document.querySelectorAll('.tab-btn'),
            tabPanels: document.querySelectorAll('.tab-panel'),

            gdpCanvas: document.getElementById('canvas-gdp'),
            popCanvas: document.getElementById('canvas-pop'),

            citiesGrid: document.getElementById('cities-grid'),
            agentsGrid: document.getElementById('agents-grid'),
            agentSearch: document.getElementById('agent-search'),
            cityFilter: document.getElementById('city-filter'),

            echoFeed: document.getElementById('echo-feed'),
            newspaperContainer: document.getElementById('newspaper-container'),
            causalTimeline: document.getElementById('causal-timeline'),

            drawerBackdrop: document.getElementById('drawer-backdrop'),
            drawerClose: document.getElementById('drawer-close'),
            drawerContent: document.getElementById('drawer-content')
        };
    }

    bindEvents() {
        // Step buttons
        this.elements.btnStep.addEventListener('click', () => this.stepSimulation(1));
        this.elements.btnStep6.addEventListener('click', () => this.stepSimulation(6));
        
        // Auto Play Toggle
        this.elements.btnPlay.addEventListener('click', () => this.toggleAutoPlay());
        this.elements.speedSelect.addEventListener('change', (e) => {
            this.autoPlaySpeed = parseInt(e.target.value, 10);
            if (this.autoPlayTimer) {
                this.stopAutoPlay();
                this.startAutoPlay();
            }
        });

        // Tabs
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // Agent Filters
        if (this.elements.agentSearch) {
            this.elements.agentSearch.addEventListener('input', () => this.renderAgentsGrid());
        }
        if (this.elements.cityFilter) {
            this.elements.cityFilter.addEventListener('change', () => this.renderAgentsGrid());
        }

        // Drawer Close
        if (this.elements.drawerClose) {
            this.elements.drawerClose.addEventListener('click', () => this.closeDrawer());
        }
        if (this.elements.drawerBackdrop) {
            this.elements.drawerBackdrop.addEventListener('click', (e) => {
                if (e.target === this.elements.drawerBackdrop) this.closeDrawer();
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

        // Lazy load tab contents if needed
        if (tabId === 'agents' && this.state.agents.length === 0) this.fetchAgents();
        if (tabId === 'echo') this.fetchEchoFeed();
        if (tabId === 'newspaper') this.fetchNewspaper();
        if (tabId === 'causal') this.fetchCausalEvents();
    }

    async refreshAll() {
        await Promise.all([
            this.fetchStatus(),
            this.fetchHistory(),
            this.fetchCities()
        ]);
        this.renderTelemetry();
        this.renderSparklines();
        this.renderCities();

        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (activeTab === 'agents') this.fetchAgents();
        if (activeTab === 'echo') this.fetchEchoFeed();
        if (activeTab === 'newspaper') this.fetchNewspaper();
        if (activeTab === 'causal') this.fetchCausalEvents();
    }

    async fetchStatus() {
        try {
            const res = await fetch('/api/status');
            this.state.status = await res.json();
        } catch (e) {
            console.error('Failed to fetch simulation status:', e);
        }
    }

    async fetchHistory() {
        try {
            const res = await fetch('/api/history');
            this.state.history = await res.json();
        } catch (e) {
            console.error('Failed to fetch simulation history:', e);
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
            const res = await fetch('/api/agents?limit=100');
            this.state.agents = await res.json();
            this.renderAgentsGrid();
        } catch (e) {
            console.error('Failed to fetch agents:', e);
        }
    }

    async fetchEchoFeed() {
        try {
            const res = await fetch('/api/echo?limit=35');
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

    async fetchCausalEvents() {
        try {
            const res = await fetch('/api/causal/events?limit=40');
            this.state.causalEvents = await res.json();
            this.renderCausalTimeline();
        } catch (e) {
            console.error('Failed to fetch causal events:', e);
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
            this.elements.btnStep.innerHTML = '▶ Step 1 Month';
        }
    }

    toggleAutoPlay() {
        if (this.autoPlayTimer) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
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
        if (this.elements.tickVal) this.elements.tickVal.textContent = `Tick #${s.tick || 0}`;
        if (this.elements.gdpVal) this.elements.gdpVal.textContent = `$${(s.monthly_gdp || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (this.elements.popVal) this.elements.popVal.textContent = `${s.living_population || 0} / ${s.total_population || 0}`;
        if (this.elements.partyVal) this.elements.partyVal.textContent = s.ruling_party || 'Council';
        if (this.elements.eventsVal) this.elements.eventsVal.textContent = s.salient_events_count || 0;
    }

    renderSparklines() {
        const hist = this.state.history;
        if (!hist || hist.length === 0) return;

        // GDP Sparkline
        this.drawSparkline(this.elements.gdpCanvas, hist.map(h => h.gdp), '#10b981');
        // Population Sparkline
        this.drawSparkline(this.elements.popCanvas, hist.map(h => h.living_population), '#38bdf8');
    }

    drawSparkline(canvas, dataPoints, strokeColor) {
        if (!canvas || !dataPoints || dataPoints.length === 0) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = canvas.parentElement.clientHeight || 180;

        ctx.clearRect(0, 0, width, height);

        const min = Math.min(...dataPoints);
        const max = Math.max(...dataPoints);
        const range = (max - min) || 1;
        const padding = 20;

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        if (dataPoints.length < 2) return;

        // Sparkline path
        ctx.beginPath();
        dataPoints.forEach((val, i) => {
            const x = padding + (i / (dataPoints.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Gradient Fill
        const lastX = width - padding;
        const firstX = padding;
        ctx.lineTo(lastX, height - padding);
        ctx.lineTo(firstX, height - padding);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, strokeColor + '33');
        grad.addColorStop(1, strokeColor + '00');
        ctx.fillStyle = grad;
        ctx.fill();
    }

    renderCities() {
        if (!this.elements.citiesGrid) return;
        const cities = this.state.cities;
        let html = '';

        Object.entries(cities).forEach(([cid, c]) => {
            html += `
                <div class="city-card">
                    <div class="city-header">
                        <span class="city-name">${c.name}</span>
                        <span class="city-tag">${c.architectural_style || 'Urban'}</span>
                    </div>
                    <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:0.6rem;">${c.description}</p>
                    <div class="city-stats">
                        <div>
                            <div class="city-stat-label">POPULATION</div>
                            <div class="city-stat-val" style="color:var(--accent-cyan);">${c.population_count || 0}</div>
                        </div>
                        <div>
                            <div class="city-stat-label">DOMINANT INDUSTRY</div>
                            <div class="city-stat-val" style="color:var(--accent-emerald);">${c.dominant_industry || 'Trade'}</div>
                        </div>
                    </div>
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
            const cityClean = a.city_id.replace('city_', '').toUpperCase();
            html += `
                <div class="agent-card" onclick="app.inspectAgent('${a.id}')">
                    <div class="agent-name">${a.full_name}</div>
                    <div class="agent-occ">${a.occupation}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.4rem;">
                        ${a.age} yrs • Wealth: $${(a.wealth || 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                    </div>
                    <div class="agent-pills">
                        <span class="pill">${cityClean}</span>
                        <span class="pill">Ambition: ${a.ambition}</span>
                    </div>
                </div>
            `;
        });

        this.elements.agentsGrid.innerHTML = html || '<p style="color:var(--text-muted);">No agents match criteria.</p>';
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
        const v = id.values || {};
        
        let memHtml = (data.salient_memories || []).slice(0, 5).map(m => `
            <div style="padding:0.5rem; background:var(--bg-surface-2); border-radius:var(--radius-sm); margin-bottom:0.4rem; font-size:0.8rem;">
                <span style="color:var(--accent-cyan); font-family:var(--font-mono);">Tick #${m.tick}:</span> ${m.content}
            </div>
        `).join('') || '<p style="color:var(--text-muted); font-size:0.8rem;">No memories logged.</p>';

        let html = `
            <h2 style="font-family:var(--font-display); font-size:1.4rem; margin-bottom:0.2rem;">${id.full_name}</h2>
            <div style="color:var(--accent-cyan); font-size:0.9rem; font-weight:600; margin-bottom:1rem;">${id.occupation} in ${id.city_id.replace('city_', '').toUpperCase()}</div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; margin-bottom:1.2rem; background:var(--bg-surface-2); padding:0.8rem; border-radius:var(--radius-md);">
                <div><span style="color:var(--text-muted); font-size:0.75rem;">AGE:</span> <strong style="font-family:var(--font-mono);">${id.age}</strong></div>
                <div><span style="color:var(--text-muted); font-size:0.75rem;">WEALTH:</span> <strong style="font-family:var(--font-mono); color:var(--accent-emerald);">$${(id.wealth || 0).toLocaleString()}</strong></div>
                <div><span style="color:var(--text-muted); font-size:0.75rem;">SPOUSE:</span> <strong style="font-size:0.82rem;">${data.spouse_name}</strong></div>
                <div><span style="color:var(--text-muted); font-size:0.75rem;">CHILDREN:</span> <strong style="font-size:0.82rem;">${data.children_names.length}</strong></div>
            </div>

            <h4 style="font-family:var(--font-display); font-size:0.9rem; margin-bottom:0.5rem; color:var(--text-secondary);">PERSONALITY SPECTRUM</h4>
            <div style="display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.2rem; font-size:0.78rem;">
                <div>Openness: <progress value="${p.openness || 0}" max="1" style="width:100%; height:6px;"></progress></div>
                <div>Extraversion: <progress value="${p.extraversion || 0}" max="1" style="width:100%; height:6px;"></progress></div>
                <div>Neuroticism: <progress value="${p.neuroticism || 0}" max="1" style="width:100%; height:6px;"></progress></div>
            </div>

            <h4 style="font-family:var(--font-display); font-size:0.9rem; margin-bottom:0.5rem; color:var(--text-secondary);">SALIENT MEMORIES</h4>
            <div>${memHtml}</div>
        `;

        this.elements.drawerContent.innerHTML = html;
    }

    openDrawer() {
        this.elements.drawerBackdrop.classList.add('open');
    }

    closeDrawer() {
        this.elements.drawerBackdrop.classList.remove('open');
    }

    renderEchoFeed() {
        if (!this.elements.echoFeed) return;
        const posts = this.state.echoFeed;
        if (!posts || posts.length === 0) {
            this.elements.echoFeed.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No posts available on Echo feed yet.</p>';
            return;
        }

        let html = '';
        posts.forEach(p => {
            const tags = (p.hashtags || []).map(t => `<span class="hashtag">#${t}</span>`).join(' ');
            html += `
                <div class="echo-card">
                    <div class="echo-author">
                        <span class="echo-name">${p.author_name}</span>
                        <span class="echo-tick">Tick #${p.tick}</span>
                    </div>
                    <div class="echo-body">${p.content}</div>
                    <div class="echo-footer">
                        <div class="echo-hashtags">${tags}</div>
                        <div>❤️ ${p.likes_count || 0} • 🔄 ${p.reposts_count || 0}</div>
                    </div>
                </div>
            `;
        });

        this.elements.echoFeed.innerHTML = html;
    }

    renderNewspaper() {
        if (!this.elements.newspaperContainer) return;
        const news = this.state.latestNewspaper;
        if (!news || news.message) {
            this.elements.newspaperContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No gazette issue published yet. Step the simulation to generate news!</p>';
            return;
        }

        const articles = (news.articles || []).map(a => `
            <div style="margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:0.4rem;">${a.title}</h3>
                <p>${a.body}</p>
            </div>
        `).join('');

        const html = `
            <div class="newspaper-wrapper">
                <div class="newspaper-title">The Solaria Chronicle</div>
                <div class="newspaper-meta">
                    <span>${news.date_str || `Tick ${news.tick}`}</span>
                    <span>Issue #${news.tick}</span>
                    <span>Price: 5 Credits</span>
                </div>
                <div class="newspaper-headline">${news.headline || 'Simulation Progresses'}</div>
                <div class="newspaper-columns">${articles}</div>
            </div>
        `;

        this.elements.newspaperContainer.innerHTML = html;
    }

    renderCausalTimeline() {
        if (!this.elements.causalTimeline) return;
        const events = this.state.causalEvents;
        if (!events || events.length === 0) {
            this.elements.causalTimeline.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No causal turning points recorded yet.</p>';
            return;
        }

        let html = '<div class="timeline">';
        events.forEach(e => {
            html += `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div style="display:flex; justify-space-between; align-items:center; margin-bottom:0.3rem;">
                            <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-cyan);">TICK #${e.tick} • ${e.event_type}</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${e.location_city || 'Solaria'}</span>
                        </div>
                        <h4 style="font-family:var(--font-display); font-weight:700; font-size:1rem; margin-bottom:0.3rem;">${e.title}</h4>
                        <p style="font-size:0.85rem; color:var(--text-secondary);">${e.description}</p>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        this.elements.causalTimeline.innerHTML = html;
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MosaicApp();
});
