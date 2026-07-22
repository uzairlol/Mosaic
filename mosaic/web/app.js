/**
 * MOSAIC — Solaria Prime Ultra-Detailed Planetary Observer Engine
 * Renders rich topographical terrain, mountain peaks, forest canopies, city grids,
 * animated particle clouds/smoke, ocean cargo routes, zoom/pan controls, and swarm activity filters.
 */

class MosaicUltraPlanetaryApp {
    constructor() {
        this.autoPlayTimer = null;
        this.autoPlaySpeed = 2000;
        this.isStepping = false;

        // Zoom & Pan State
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

        // Layer Toggles & Filter State
        this.layers = { clouds: true, ships: true, roads: true, agents: true };
        this.activeFilter = 'all';

        // Animated Particles & Ships
        this.clouds = [
            { x: 100, y: 80, speed: 0.25, size: 60 },
            { x: 450, y: 140, speed: 0.35, size: 80 },
            { x: 750, y: 60, speed: 0.20, size: 70 },
            { x: 300, y: 320, speed: 0.30, size: 65 }
        ];

        this.ships = [
            { x: 150, y: 240, targetX: 420, targetY: 180, speed: 0.4 },
            { x: 420, y: 180, targetX: 720, targetY: 340, speed: 0.3 }
        ];

        this.smokeParticles = [];

        this.state = {
            status: {},
            history: [],
            cities: {},
            agents: [],
            echoFeed: [],
            latestNewspaper: null,
            agentPositions: new Map(),
            hoveredAgent: null
        };

        // Detailed Solaria Prime Geography Nodes (1000x560 space)
        this.citiesHD = {
            city_solaria: { name: 'Solaria Metropolis', x: 550, y: 170, radius: 120, color: '#f4a261', type: 'Metropolis' },
            city_aethelgard: { name: 'Aethelgard Harbor & Docks', x: 220, y: 240, radius: 100, color: '#2a9d8f', type: 'Port' },
            city_ironreach: { name: 'Ironreach Foundries & Peaks', x: 340, y: 400, radius: 95, color: '#c25e40', type: 'Industrial' },
            city_veridia: { name: 'Veridia Valleys & Farms', x: 800, y: 320, radius: 110, color: '#2d6a4f', type: 'Valley' }
        };

        this.initDOM();
        this.bindEvents();
        this.initCanvasHD();
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

            btnZoomIn: document.getElementById('map-btn-zoom-in'),
            btnZoomOut: document.getElementById('map-btn-zoom-out'),
            btnReset: document.getElementById('map-btn-reset'),

            checkClouds: document.getElementById('layer-clouds'),
            checkShips: document.getElementById('layer-ships'),
            checkRoads: document.getElementById('layer-roads'),
            checkAgents: document.getElementById('layer-agents'),

            filterBtns: document.querySelectorAll('.filter-btn'),

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

        // Zoom Controls
        if (this.elements.btnZoomIn) this.elements.btnZoomIn.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
        if (this.elements.btnZoomOut) this.elements.btnZoomOut.addEventListener('click', () => this.setZoom(this.zoom / 1.25));
        if (this.elements.btnReset) this.elements.btnReset.addEventListener('click', () => { this.zoom = 1.0; this.panX = 0; this.panY = 0; });

        // Layer Toggles
        if (this.elements.checkClouds) this.elements.checkClouds.addEventListener('change', (e) => this.layers.clouds = e.target.checked);
        if (this.elements.checkShips) this.elements.checkShips.addEventListener('change', (e) => this.layers.ships = e.target.checked);
        if (this.elements.checkRoads) this.elements.checkRoads.addEventListener('change', (e) => this.layers.roads = e.target.checked);
        if (this.elements.checkAgents) this.elements.checkAgents.addEventListener('change', (e) => this.layers.agents = e.target.checked);

        // Activity Filters
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.dataset.filter;
            });
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

        // Canvas Mouse & Drag Events
        const canvas = this.elements.godsCanvas;
        if (canvas) {
            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
                this.setZoom(this.zoom * zoomFactor);
            });

            canvas.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
            });

            window.addEventListener('mouseup', () => this.isDragging = false);

            canvas.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    this.panX = e.clientX - this.dragStart.x;
                    this.panY = e.clientY - this.dragStart.y;
                } else {
                    this.handleCanvasMouseMove(e);
                }
            });

            canvas.addEventListener('click', () => {
                if (!this.isDragging && this.state.hoveredAgent) {
                    this.inspectAgent(this.state.hoveredAgent.id);
                }
            });
        }
    }

    setZoom(newZoom) {
        this.zoom = Math.max(0.8, Math.min(3.5, newZoom));
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
        if (this.elements.mapAgentCount) this.elements.mapAgentCount.textContent = `${s.living_population || 0} CITIZENS`;
    }

    // ─────────────────────────────────────────────────────────────
    // ULTRA-DETAILED SOLARIA PRIME MAP CANVAS ENGINE
    // ─────────────────────────────────────────────────────────────
    initCanvasHD() {
        const canvas = this.elements.godsCanvas;
        if (!canvas) return;

        canvas.width = 1000;
        canvas.height = 560;

        const renderLoop = () => {
            this.updateEnvironmentLoop();
            this.drawUltraPlanetaryCanvas();
            requestAnimationFrame(renderLoop);
        };
        requestAnimationFrame(renderLoop);
    }

    updateAgentPositions() {
        const agents = this.state.agents;
        const tick = this.state.status.tick || 0;

        agents.forEach((a, idx) => {
            const cityKey = a.city_id in this.citiesHD ? a.city_id : 'city_solaria';
            const b = this.citiesHD[cityKey];

            const seed = (idx * 41 + tick * 19) % 360;
            const angle = (seed * Math.PI) / 180;
            const dist = 12 + ((idx * 11) % (b.radius - 20));

            const targetX = b.x + Math.cos(angle) * dist;
            const targetY = b.y + Math.sin(angle) * dist;

            let color = '#f4a261'; // Work (Ochre)
            let activity = 'work';
            let actLabel = 'At Workplace';

            if (idx % 4 === 0) { color = '#2d6a4f'; activity = 'home'; actLabel = 'At Residence'; }
            else if (idx % 6 === 0) { color = '#d97724'; activity = 'rally'; actLabel = 'Political Assembly'; }
            else if (a.wealth < 1000) { color = '#c25e40'; activity = 'stress'; actLabel = 'Financial Stress'; }

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
                    activity,
                    actLabel
                });
            } else {
                const pos = this.state.agentPositions.get(a.id);
                pos.targetX = targetX;
                pos.targetY = targetY;
                pos.color = color;
                pos.activity = activity;
                pos.actLabel = actLabel;
            }
        });
    }

    updateEnvironmentLoop() {
        // Interpolate agent positions
        this.state.agentPositions.forEach(pos => {
            pos.x += (pos.targetX - pos.x) * 0.08;
            pos.y += (pos.targetY - pos.y) * 0.08;
        });

        // Drift clouds
        this.clouds.forEach(c => {
            c.x += c.speed;
            if (c.x > 1100) c.x = -100;
        });

        // Move cargo ships
        this.ships.forEach(s => {
            s.x += (s.targetX - s.x) * 0.005;
            s.y += (s.targetY - s.y) * 0.005;
            if (Math.hypot(s.targetX - s.x, s.targetY - s.y) < 10) {
                const tempX = s.x; const tempY = s.y;
                s.targetX = tempX === 150 ? 420 : 150;
            }
        });

        // Emit factory smoke particles at Ironreach
        if (Math.random() < 0.3) {
            this.smokeParticles.push({
                x: 340 + (Math.random() * 20 - 10),
                y: 390,
                radius: 4 + Math.random() * 4,
                alpha: 0.6,
                vy: -0.4 - Math.random() * 0.3
            });
        }

        // Update smoke particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.y += p.vy;
            p.radius += 0.15;
            p.alpha -= 0.008;
            if (p.alpha <= 0) this.smokeParticles.splice(i, 1);
        }
    }

    drawUltraPlanetaryCanvas() {
        const canvas = this.elements.godsCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.save();

        // Dark Deep Ocean Base
        ctx.fillStyle = '#0b1117';
        ctx.fillRect(0, 0, w, h);

        // Apply Zoom & Pan Transform
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        // Draw Jagged Island Continental Landmass
        ctx.fillStyle = '#17222d';
        ctx.strokeStyle = '#2a9d8f';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(120, 180);
        ctx.bezierCurveTo(180, 80, 420, 60, 600, 80);
        ctx.bezierCurveTo(750, 100, 920, 180, 940, 320);
        ctx.bezierCurveTo(900, 450, 680, 500, 450, 480);
        ctx.bezierCurveTo(280, 460, 140, 420, 100, 300);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shallow Reef Glow
        ctx.strokeStyle = '#2a9d8f44';
        ctx.lineWidth = 12;
        ctx.stroke();

        // Render Biome Contours & Textures
        // 🌲 Veridia Forest Canopy (Green)
        ctx.fillStyle = '#1e3a29';
        ctx.beginPath();
        ctx.arc(800, 320, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d6a4f';
        ctx.font = '10px sans-serif';
        for (let i = 0; i < 15; i++) {
            ctx.fillText('🌲', 740 + (i * 14 % 100), 280 + (i * 19 % 80));
        }

        // ⛰️ Ironreach Mountain Ridges (Terracotta & Snow Peaks)
        ctx.fillStyle = '#3a2520';
        ctx.beginPath();
        ctx.arc(340, 400, 95, 0, Math.PI * 2);
        ctx.fill();
        // Snow Peaks
        ctx.fillStyle = '#ffffffaa';
        ctx.beginPath();
        ctx.moveTo(320, 370); ctx.lineTo(330, 350); ctx.lineTo(340, 370);
        ctx.moveTo(350, 380); ctx.lineTo(360, 360); ctx.lineTo(370, 380);
        ctx.fill();

        // 🏙️ Solaria Metropolis Urban Grid
        ctx.fillStyle = '#3d2e23';
        ctx.fillRect(480, 110, 140, 120);
        ctx.fillStyle = '#f4a261aa';
        for (let bx = 490; bx < 610; bx += 18) {
            for (let by = 120; by < 220; by += 18) {
                ctx.fillRect(bx, by, 10, 10);
            }
        }

        // 🚢 Aethelgard Port & Docks
        ctx.fillStyle = '#1b333a';
        ctx.beginPath();
        ctx.arc(220, 240, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2a9d8f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(180, 250); ctx.lineTo(140, 250);
        ctx.moveTo(200, 270); ctx.lineTo(160, 270);
        ctx.stroke();

        // Highways & Bridges Layer
        if (this.layers.roads) {
            ctx.strokeStyle = '#d9772488';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);

            ctx.beginPath();
            ctx.moveTo(550, 170); ctx.lineTo(220, 240); // Solaria -> Port
            ctx.moveTo(550, 170); ctx.lineTo(340, 400); // Solaria -> Ironreach
            ctx.moveTo(550, 170); ctx.lineTo(800, 320); // Solaria -> Veridia
            ctx.moveTo(220, 240); ctx.lineTo(340, 400); // Port -> Ironreach
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Cargo Ships Layer
        if (this.layers.ships) {
            this.ships.forEach(s => {
                ctx.fillStyle = '#38bdf8';
                ctx.font = '12px sans-serif';
                ctx.fillText('🚢', s.x, s.y);
            });
        }

        // Factory Chimney Smoke Particles
        this.smokeParticles.forEach(p => {
            ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // City Labels
        Object.values(this.citiesHD).forEach(c => {
            ctx.fillStyle = '#f8f5ee';
            ctx.font = 'bold 12px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(c.name.toUpperCase(), c.x, c.y - c.radius - 8);
        });

        // Agent Swarm Layer
        if (this.layers.agents) {
            this.state.agentPositions.forEach(pos => {
                // Apply activity filter
                if (this.activeFilter !== 'all' && pos.activity !== this.activeFilter) return;

                const isHovered = this.state.hoveredAgent?.id === pos.id;

                ctx.fillStyle = pos.color;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, isHovered ? 8 : 4.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#0b1117';
                ctx.lineWidth = 1;
                ctx.stroke();

                if (isHovered) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        }

        // Drifting Clouds Layer
        if (this.layers.clouds) {
            this.clouds.forEach(c => {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
                ctx.arc(c.x + 30, c.y - 10, c.size * 0.75, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        ctx.restore();
    }

    handleCanvasMouseMove(e) {
        const canvas = this.elements.godsCanvas;
        const rect = canvas.getBoundingClientRect();

        // Transformed mouse coordinates accounting for Zoom & Pan
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        const worldX = (screenX - this.panX) / this.zoom;
        const worldY = (screenY - this.panY) / this.zoom;

        let found = null;
        this.state.agentPositions.forEach(pos => {
            if (this.activeFilter !== 'all' && pos.activity !== this.activeFilter) return;
            const dist = Math.hypot(pos.x - worldX, pos.y - worldY);
            if (dist < 12) found = pos;
        });

        this.state.hoveredAgent = found;
        const tooltip = this.elements.mapTooltip;

        if (found && tooltip) {
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 14}px`;
            tooltip.style.top = `${e.clientY + 14}px`;
            tooltip.innerHTML = `
                <strong style="font-family:var(--font-blocky);">${found.name}</strong> (${found.occupation})<br/>
                <span>📍 ${found.city}</span> • <strong style="color:var(--earth-terracotta);">${found.actLabel}</strong>
            `;
        } else if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

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
    window.app = new MosaicUltraPlanetaryApp();
});
