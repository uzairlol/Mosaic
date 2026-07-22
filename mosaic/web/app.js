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
            drawerContent: document.getElementById('drawer-content'),

            btnExpandMap: document.getElementById('btn-expand-map'),
            mapCommandBox: document.getElementById('map-command-box'),
            newsToast: document.getElementById('news-toast'),
            toastHeadline: document.getElementById('toast-headline')
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

        // Expand Map Toggle Button
        if (this.elements.btnExpandMap && this.elements.mapCommandBox) {
            this.elements.btnExpandMap.addEventListener('click', () => {
                this.elements.mapCommandBox.classList.toggle('expanded-fullscreen');
                this.elements.btnExpandMap.textContent = this.elements.mapCommandBox.classList.contains('expanded-fullscreen') ? '🗗' : '⛶';
            });
        }

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
            const data = await res.json();
            if (data && data.headline && (!this.state.latestNewspaper || this.state.latestNewspaper.headline !== data.headline)) {
                this.showNewsToast(data.headline);
            }
            this.state.latestNewspaper = data;
            this.renderNewspaper();
        } catch (e) {
            console.error('Failed newspaper fetch:', e);
        }
    }

    showNewsToast(headline) {
        const toast = this.elements.newsToast;
        const text = this.elements.toastHeadline;
        if (!toast || !text) return;

        text.textContent = headline || 'Solaria Gazette Edition Published!';
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 5500);
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

        // 🌊 Animal Crossing Sunny Turquoise Ocean Water
        ctx.fillStyle = '#46b5d1';
        ctx.fillRect(0, 0, w, h);

        // Water Wave Ripples Texture
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        for (let rx = 20; rx < w; rx += 90) {
            for (let ry = 20; ry < h; ry += 70) {
                const waveX = (rx + (this.clouds[0].x * 0.4)) % w;
                ctx.beginPath();
                ctx.arc(waveX, ry, 12, Math.PI, Math.PI * 1.8);
                ctx.stroke();
            }
        }

        // Apply Zoom & Pan Transform
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        // 🏖️ Sandy Beach Rim (Warm Cream Sand)
        ctx.fillStyle = '#f5e3b5';
        ctx.strokeStyle = '#e6c88b';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(110, 170);
        ctx.bezierCurveTo(170, 70, 430, 50, 610, 70);
        ctx.bezierCurveTo(770, 90, 940, 170, 955, 320);
        ctx.bezierCurveTo(915, 465, 690, 515, 450, 495);
        ctx.bezierCurveTo(270, 475, 130, 435, 90, 300);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 🌿 Lush Grassland Island Tier 1 (Vibrant Green)
        ctx.fillStyle = '#7ec850';
        ctx.strokeStyle = '#5fb033';
        ctx.lineWidth = 5;

        ctx.beginPath();
        ctx.moveTo(130, 185);
        ctx.bezierCurveTo(185, 90, 420, 75, 590, 90);
        ctx.bezierCurveTo(745, 105, 915, 185, 930, 310);
        ctx.bezierCurveTo(890, 445, 670, 490, 440, 470);
        ctx.bezierCurveTo(275, 455, 145, 415, 110, 290);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 🍃 Upper Cliff Tier 2 (Darker Grass Green Accent)
        ctx.fillStyle = '#6cb043';
        ctx.beginPath();
        ctx.arc(340, 390, 75, 0, Math.PI * 2);
        ctx.arc(800, 310, 85, 0, Math.PI * 2);
        ctx.fill();

        // 🌳 Fruit Trees (Cherry & Apple Groves)
        const renderTree = (x, y, fruitEmoji) => {
            ctx.fillStyle = '#6b4423';
            ctx.fillRect(x - 3, y, 6, 12);
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.arc(x, y - 6, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7ec850';
            ctx.beginPath();
            ctx.arc(x - 3, y - 9, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '10px sans-serif';
            ctx.fillText(fruitEmoji, x - 4, y - 4);
        };

        // Veridia Apple Forest
        for (let i = 0; i < 8; i++) {
            renderTree(740 + (i * 18 % 100), 270 + (i * 23 % 70), '🍎');
        }
        // Solaria Cherry Forest
        for (let i = 0; i < 6; i++) {
            renderTree(500 + (i * 22 % 90), 110 + (i * 17 % 50), '🍒');
        }

        // ☁️ High-Res Layered Clouds Layer with Drop Shadows
        if (this.layers.clouds) {
            this.clouds.forEach(c => {
                // Cloud Shadow on ground
                ctx.fillStyle = 'rgba(74, 40, 16, 0.08)';
                ctx.beginPath();
                ctx.ellipse(c.x + 15, c.y + 35, c.size * 1.1, c.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();

                // High-Res Soft Puffy Cloud Body
                ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.size * 0.7, 0, Math.PI * 2);
                ctx.arc(c.x + c.size * 0.4, c.y - c.size * 0.2, c.size * 0.55, 0, Math.PI * 2);
                ctx.arc(c.x - c.size * 0.4, c.y + c.size * 0.1, c.size * 0.5, 0, Math.PI * 2);
                ctx.arc(c.x + c.size * 0.7, c.y + c.size * 0.1, c.size * 0.45, 0, Math.PI * 2);
                ctx.fill();

                // Soft Cloud Shading Highlight
                ctx.fillStyle = 'rgba(230, 245, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(c.x - c.size * 0.1, c.y - c.size * 0.2, c.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // 🏘️ High-Detail City Buildings (Town Hall, Nook's Shop, Able Sisters, Docks)
        const renderTownHall = (x, y) => {
            // Main Plaza Cobblestone Base
            ctx.fillStyle = '#f7ebd3';
            ctx.fillRect(x - 30, y - 25, 60, 45);
            ctx.strokeStyle = '#a67c52';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 30, y - 25, 60, 45);

            // Brick Building Structure
            ctx.fillStyle = '#c25e40';
            ctx.fillRect(x - 22, y - 18, 44, 30);
            ctx.strokeStyle = '#6b4423';
            ctx.strokeRect(x - 22, y - 18, 44, 30);

            // Roof with Clocktower Spike
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.moveTo(x - 26, y - 18);
            ctx.lineTo(x, y - 34);
            ctx.lineTo(x + 26, y - 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Clock Circle
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(x, y - 24, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Double Doors
            ctx.fillStyle = '#6b4423';
            ctx.fillRect(x - 6, y, 12, 12);
        };

        const renderNooksCranny = (x, y) => {
            // Wooden Shop Structure
            ctx.fillStyle = '#f5e3b5';
            ctx.fillRect(x - 18, y - 12, 36, 24);
            ctx.strokeStyle = '#6b4423';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 18, y - 12, 36, 24);

            // Green Striped Awning Roof
            ctx.fillStyle = '#52b788';
            ctx.fillRect(x - 22, y - 18, 44, 8);
            ctx.strokeRect(x - 22, y - 18, 44, 8);

            // Nook Leaf Signboard
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(x, y - 22, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = '8px sans-serif';
            ctx.fillText('🍃', x - 4, y - 19);
        };

        const renderAbleSisters = (x, y) => {
            ctx.fillStyle = '#ffb3c1';
            ctx.fillRect(x - 16, y - 10, 32, 20);
            ctx.strokeStyle = '#6b4423';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 16, y - 10, 32, 20);

            ctx.fillStyle = '#ff85a1';
            ctx.beginPath();
            ctx.moveTo(x - 20, y - 10);
            ctx.lineTo(x, y - 22);
            ctx.lineTo(x + 20, y - 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        // Render City Landmarks
        renderTownHall(550, 170); // Solaria Metropolis Town Hall Plaza
        renderNooksCranny(500, 140); // Nook's Cranny Shop
        renderAbleSisters(600, 190); // Able Sisters Tailor
        renderTownHall(340, 400); // Ironreach Community Hall
        renderNooksCranny(220, 240); // Aethelgard Port Shop
        renderAbleSisters(800, 320); // Veridia Farm Shop

        // 🌉 High-Detail Cobblestone Highways & Stone Bridges Layer
        if (this.layers.roads) {
            const drawHighway = (x1, y1, x2, y2) => {
                // Outer Stone Border
                ctx.strokeStyle = '#6b4423';
                ctx.lineWidth = 9;
                ctx.beginPath();
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                ctx.stroke();

                // Cobblestone Main Path
                ctx.strokeStyle = '#f5e3b5';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                ctx.stroke();

                // Paver Brick Dashes
                ctx.strokeStyle = '#a67c52';
                ctx.lineWidth = 4;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.setLineDash([]);
            };

            drawHighway(550, 170, 220, 240); // Solaria -> Port
            drawHighway(550, 170, 340, 400); // Solaria -> Ironreach
            drawHighway(550, 170, 800, 320); // Solaria -> Veridia
            drawHighway(220, 240, 340, 400); // Port -> Ironreach
        }

        // Factory Smoke Spirals (Ironreach House Smoke)
        this.smokeParticles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Cozy Village Zone Badges
        Object.values(this.citiesHD).forEach(c => {
            ctx.fillStyle = '#6b4423';
            ctx.font = 'bold 12px "Fredoka", sans-serif';
            ctx.textAlign = 'center';

            // Background pill for label
            const text = c.name.toUpperCase();
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = '#fffcf2';
            ctx.beginPath();
            const px = c.x - textWidth / 2 - 8;
            const py = c.y - c.radius - 20;
            const pw = textWidth + 16;
            const ph = 20;
            const pr = 8;
            ctx.moveTo(px + pr, py);
            ctx.lineTo(px + pw - pr, py);
            ctx.quadraticCurveTo(px + pw, py, px + pw, py + pr);
            ctx.lineTo(px + pw, py + ph - pr);
            ctx.quadraticCurveTo(px + pw, py + ph, px + pw - pr, py + ph);
            ctx.lineTo(px + pr, py + ph);
            ctx.quadraticCurveTo(px, py + ph, px, py + ph - pr);
            ctx.lineTo(px, py + pr);
            ctx.quadraticCurveTo(px, py, px + pr, py);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#6b4423';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#4a2810';
            ctx.fillText(text, c.x, c.y - c.radius - 6);
        });

        // 👥 Animal Crossing Villagers Layer with Speech Bubbles
        if (this.layers.agents) {
            this.state.agentPositions.forEach(pos => {
                if (this.activeFilter !== 'all' && pos.activity !== this.activeFilter) return;

                const isHovered = this.state.hoveredAgent?.id === pos.id;

                // Cute Villager Circle Body
                ctx.fillStyle = pos.color;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, isHovered ? 9 : 6, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#6b4423';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Eyes
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(pos.x - 2, pos.y - 2, 2, 0, Math.PI * 2);
                ctx.arc(pos.x + 2, pos.y - 2, 2, 0, Math.PI * 2);
                ctx.fill();

                // Hovered Villager Speech Bubble
                if (isHovered) {
                    ctx.fillStyle = '#fffcf2';
                    ctx.beginPath();
                    const bx = pos.x - 45;
                    const by = pos.y - 42;
                    const bw = 90;
                    const bh = 24;
                    const br = 8;
                    ctx.moveTo(bx + br, by);
                    ctx.lineTo(bx + bw - br, by);
                    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
                    ctx.lineTo(bx + bw, by + bh - br);
                    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
                    ctx.lineTo(bx + br, by + bh);
                    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
                    ctx.lineTo(bx, by + br);
                    ctx.quadraticCurveTo(bx, by, bx + br, by);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#6b4423';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.fillStyle = '#4a2810';
                    ctx.font = 'bold 9px "Fredoka", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`💭 ${pos.name.split(' ')[0]}`, pos.x, pos.y - 27);
                }
            });
        }

        // Drifting Fluffy AC Clouds
        if (this.layers.clouds) {
            this.clouds.forEach(c => {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
                ctx.arc(c.x + 25, c.y - 8, c.size * 0.7, 0, Math.PI * 2);
                ctx.arc(c.x - 25, c.y + 5, c.size * 0.65, 0, Math.PI * 2);
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
