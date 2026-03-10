// Wrap in a closure to prevent variable conflicts
(function() {

    // ==========================================
    // ⚙️ SYSTEM CONFIGURATION
    // ==========================================
    const SUPABASE_URL = "https://ekgsgltykakwopcfyxqu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc";
    const THEME_COLOR = "#0095f6"; 
    const EXPORT_GRADIENT = "url(#exportGradient)"; // Matches screenshot
    const STORAGE_BUCKET = "public-files"; 
    // ==========================================

    class QuantumEditor extends HTMLElement {
        constructor() {
            super();
            // Network State
            this.supabaseUrl = SUPABASE_URL;
            this.supabaseKey = SUPABASE_KEY;
            this.sbClient = null;
            
            // File State
            this.originalFile = null;
            this.fileType = null;
            this.originalSizeMB = 0;

            // Editor State
            this.videoDuration = 0;
            this.trimStart = 0;
            this.trimEnd = 0;
            this.selectedFilter = 'none'; // CSS filter string
            this.textOverlays = []; // Array of { id, text, color, font, xPct, yPct }
            this.activeDragElement = null;
            this.dragStartX = 0;
            this.dragStartY = 0;

            // App State
            this.mode = 'closed'; // closed | editor | exporting
        }

        connectedCallback() {
            if (!this.querySelector('#q-file-input')) {
                this.ensureSupabase();
                this.render();
                this.setupEvents();
                this.setupEditorEvents();
                this.setupDragEvents();
            }
        }

        ensureSupabase() {
            if (!window.supabase) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                document.head.appendChild(script);
                script.onload = () => this.initSupabaseClient();
            } else {
                this.initSupabaseClient();
            }
        }

        initSupabaseClient() {
            if(this.supabaseUrl && this.supabaseKey && window.supabase) {
                this.sbClient = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
            }
        }

        // ==========================================
        // 🎨 MASSIVE UI & CSS DEFINITION
        // ==========================================
        render() {
            this.innerHTML = `
            <style>
                :host { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    display: block; 
                    --q-black: #000000;
                    --q-dark: #111111;
                    --q-gray: #222222;
                    --q-text: #ffffff;
                    --q-accent: #0095f6;
                    --q-danger: #ff3b30;
                }
                
                /* --- Base Overlay --- */
                #q-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: var(--q-black); z-index: 10000;
                    display: none; flex-direction: column; overflow: hidden;
                    opacity: 0; transition: opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                #q-overlay.open { display: flex; opacity: 1; }

                /* --- Top Navigation --- */
                .q-nav {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 15px 20px; z-index: 50;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent);
                    position: absolute; top: 0; left: 0; width: 100%; box-sizing: border-box;
                }
                .q-nav-btn {
                    background: rgba(255,255,255,0.15); border: none; color: white;
                    width: 40px; height: 40px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; backdrop-filter: blur(10px); transition: all 0.2s;
                }
                .q-nav-btn:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }
                .q-nav-btn svg { width: 20px; height: 20px; fill: white; }
                
                .q-nav-send {
                    background: var(--q-accent); width: auto; padding: 0 20px; border-radius: 20px;
                    font-weight: 600; font-size: 14px; gap: 8px;
                }
                .q-nav-send svg { width: 16px; height: 16px; }

                /* --- Editor Preview Area --- */
                .q-workspace {
                    flex: 1; position: relative; width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden; background: var(--q-black); margin-top: 60px; margin-bottom: 120px;
                }
                .q-preview-container {
                    position: relative; max-width: 100%; max-height: 100%;
                    border-radius: 16px; overflow: hidden;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.8);
                }
                #q-video-preview {
                    display: block; width: auto; height: auto;
                    max-width: 100vw; max-height: calc(100vh - 200px);
                    object-fit: contain; transition: filter 0.3s;
                }
                
                /* Text Overlay Layer */
                #q-text-layer {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; overflow: hidden;
                }
                .q-text-element {
                    position: absolute; pointer-events: auto;
                    font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                    cursor: grab; padding: 10px; user-select: none;
                    transform: translate(-50%, -50%); /* Center on coordinates */
                    white-space: pre-wrap; text-align: center; line-height: 1.2;
                }
                .q-text-element:active { cursor: grabbing; }

                /* --- Bottom Toolbar --- */
                .q-toolbar {
                    position: absolute; bottom: 0; left: 0; width: 100%;
                    background: var(--q-dark); padding: 15px 10px 30px 10px;
                    box-sizing: border-box; border-top: 1px solid rgba(255,255,255,0.05);
                    display: flex; flex-direction: column; gap: 15px; z-index: 50;
                }
                .q-tools-menu {
                    display: flex; justify-content: space-around; align-items: center; width: 100%;
                }
                .q-tool-btn {
                    background: transparent; border: none; color: #888;
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    font-size: 11px; cursor: pointer; font-weight: 500; transition: color 0.2s;
                }
                .q-tool-btn svg { width: 24px; height: 24px; fill: #888; transition: fill 0.2s; }
                .q-tool-btn.active { color: white; }
                .q-tool-btn.active svg { fill: white; }

                /* --- Tool Panels (Drawers) --- */
                .q-panel { display: none; width: 100%; padding: 0 10px; box-sizing: border-box; animation: slideUp 0.3s ease; }
                .q-panel.active { display: block; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                /* Trimmer Panel */
                .q-trim-info { display: flex; justify-content: space-between; color: white; font-size: 12px; margin-bottom: 10px; font-variant-numeric: tabular-nums;}
                .q-trim-track { position: relative; height: 40px; background: #333; border-radius: 8px; margin: 0 10px;}
                .q-trim-fill { position: absolute; height: 100%; background: rgba(255, 255, 255, 0.2); border-left: 3px solid var(--q-accent); border-right: 3px solid var(--q-accent); pointer-events: none;}
                .q-range-input { position: absolute; top: 0; width: 100%; height: 100%; appearance: none; background: transparent; pointer-events: none; margin:0; left:0;}
                .q-range-input::-webkit-slider-thumb { pointer-events: auto; appearance: none; width: 20px; height: 44px; background: white; border-radius: 4px; cursor: ew-resize; box-shadow: 0 0 10px rgba(0,0,0,0.5); }

                /* Filters Panel */
                .q-filter-scroll { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 10px; scrollbar-width: none; }
                .q-filter-scroll::-webkit-scrollbar { display: none; }
                .q-filter-item { display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; }
                .q-filter-thumb { width: 60px; height: 60px; border-radius: 10px; background: #333; overflow: hidden; position: relative; border: 2px solid transparent; transition: border 0.2s;}
                .q-filter-item.active .q-filter-thumb { border-color: var(--q-accent); }
                .q-filter-name { color: #888; font-size: 11px; }
                .q-filter-item.active .q-filter-name { color: white; }

                /* Text Panel */
                .q-text-controls { display: flex; flex-direction: column; gap: 15px; }
                .q-text-input-wrap { display: flex; gap: 10px; }
                .q-text-input { flex: 1; background: #222; border: none; color: white; padding: 12px 15px; border-radius: 10px; font-size: 14px; outline: none; }
                .q-add-text-btn { background: white; color: black; border: none; border-radius: 10px; padding: 0 15px; font-weight: 600; cursor: pointer; }
                .q-color-picker { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; }
                .q-color-dot { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; flex-shrink: 0;}
                .q-color-dot.active { border-color: white; transform: scale(1.1); }

                /* ==========================================
                   🎬 EXPORT SCREEN (SCREENSHOT STYLE)
                   ========================================== */
                #q-export-screen {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: var(--q-black); z-index: 20000;
                    display: none; flex-direction: column; align-items: center;
                }
                #q-export-screen.active { display: flex; }
                
                .q-export-header {
                    margin-top: 60px; display: flex; flex-direction: column; align-items: center; text-align: center;
                }
                .q-export-pct { font-size: 36px; font-weight: 800; color: white; margin-bottom: 10px; font-variant-numeric: tabular-nums;}
                .q-export-sub { color: #aaa; font-size: 14px; max-width: 280px; line-height: 1.4; }

                /* SVG Border Container */
                .q-export-visual {
                    position: relative; margin-top: 40px; 
                    width: 75vw; max-width: 350px; aspect-ratio: 9/16;
                    display: flex; align-items: center; justify-content: center;
                }
                
                #q-export-video {
                    position: absolute; width: calc(100% - 16px); height: calc(100% - 16px);
                    object-fit: cover; border-radius: 20px; background: #111; z-index: 2;
                }

                .q-svg-border {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3;
                    pointer-events: none;
                }
                
                .q-svg-rect-bg {
                    fill: none; stroke: #222; stroke-width: 6; rx: 24; ry: 24;
                }
                .q-svg-rect-fg {
                    fill: none; stroke: var(--q-accent); stroke-width: 6; rx: 24; ry: 24;
                    stroke-linecap: round;
                    /* Dash array will be set via JS based on actual perimeter */
                    transition: stroke-dashoffset 0.1s linear;
                    filter: drop-shadow(0 0 8px var(--q-accent));
                }

                /* Hidden elements for processing */
                #q-hidden-canvas { display: none; }
                #q-file-input { display: none; }
            </style>

            <input type="file" id="q-file-input" accept="video/*,image/*,.pdf,audio/*">
            <canvas id="q-hidden-canvas"></canvas>

            <div id="q-overlay">
                
                <div class="q-nav">
                    <button class="q-nav-btn" id="q-btn-close">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                    <button class="q-nav-btn q-nav-send" id="q-btn-send">
                        Send
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>

                <div class="q-workspace" id="q-workspace">
                    <div class="q-preview-container" id="q-preview-wrap">
                        <video id="q-video-preview" playsinline loop></video>
                        <div id="q-text-layer"></div>
                    </div>
                </div>

                <div class="q-toolbar" id="q-toolbar">
                    
                    <div class="q-panel" id="panel-trim">
                        <div class="q-trim-info">
                            <span>Trim</span>
                            <span id="q-trim-text">0:00 - 0:00</span>
                        </div>
                        <div class="q-trim-track">
                            <div class="q-trim-fill" id="q-trim-fill"></div>
                            <input type="range" class="q-range-input" id="q-trim-start" min="0" max="100" value="0" step="0.1">
                            <input type="range" class="q-range-input" id="q-trim-end" min="0" max="100" value="100" step="0.1">
                        </div>
                    </div>

                    <div class="q-panel" id="panel-filter">
                        <div class="q-filter-scroll" id="q-filter-list">
                            </div>
                    </div>

                    <div class="q-panel" id="panel-text">
                        <div class="q-text-controls">
                            <div class="q-text-input-wrap">
                                <input type="text" class="q-text-input" id="q-text-input" placeholder="Type something..." autocomplete="off">
                                <button class="q-add-text-btn" id="q-btn-add-text">Add</button>
                            </div>
                            <div class="q-color-picker" id="q-color-picker">
                                </div>
                        </div>
                    </div>

                    <div class="q-tools-menu">
                        <button class="q-tool-btn" data-panel="panel-trim">
                            <svg viewBox="0 0 24 24"><path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/></svg>
                            Trim
                        </button>
                        <button class="q-tool-btn" data-panel="panel-filter">
                            <svg viewBox="0 0 24 24"><path d="M19.03 7.39l1.42-1.42c-.45-.51-.9-.97-1.41-1.41L17.62 6c-1.55-1.26-3.5-2-5.62-2-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10c0-2.12-.74-4.07-2-5.62zM12 22c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
                            Filters
                        </button>
                        <button class="q-tool-btn" data-panel="panel-text">
                            <svg viewBox="0 0 24 24"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>
                            Text
                        </button>
                    </div>
                </div>

                <div id="q-export-screen">
                    <div class="q-export-header">
                        <div class="q-export-pct" id="q-export-pct">0.0%</div>
                        <div class="q-export-sub">Please don't close the app. We are optimizing your video for Quantum.</div>
                    </div>
                    
                    <div class="q-export-visual">
                        <svg class="q-svg-border" width="100%" height="100%" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="exportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#ff0050" />
                                    <stop offset="100%" stop-color="#00f2fe" />
                                </linearGradient>
                            </defs>
                            <rect class="q-svg-rect-bg" width="100%" height="100%" />
                            <rect class="q-svg-rect-fg" id="q-progress-rect" width="100%" height="100%" />
                        </svg>
                        <video id="q-export-video" muted playsinline></video>
                    </div>
                </div>

            </div>
            `;
        }

        // ==========================================
        // 🎛️ EVENT LISTENERS & SETUP
        // ==========================================
        setupEvents() {
            const input = this.querySelector('#q-file-input');
            const closeBtn = this.querySelector('#q-btn-close');
            const sendBtn = this.querySelector('#q-btn-send');
            
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleFileSelect(e.target.files[0]);
            });

            closeBtn.addEventListener('click', () => {
                if (this.mode !== 'closed') history.back();
            });

            window.addEventListener('popstate', () => {
                if (this.mode !== 'closed') this.hideUI();
            });

            sendBtn.addEventListener('click', () => this.startPipeline());

            // Initialize Filters
            const filters = [
                { name: 'Normal', value: 'none' },
                { name: 'Mono', value: 'grayscale(100%)' },
                { name: 'Sepia', value: 'sepia(100%)' },
                { name: 'Contrast', value: 'contrast(150%) saturate(120%)' },
                { name: 'Cool', value: 'hue-rotate(180deg) saturate(150%)' },
                { name: 'Warm', value: 'sepia(50%) saturate(200%) hue-rotate(-30deg)' }
            ];
            
            const filterList = this.querySelector('#q-filter-list');
            filters.forEach((f, i) => {
                const el = document.createElement('div');
                el.className = `q-filter-item ${i===0 ? 'active' : ''}`;
                el.innerHTML = `<div class="q-filter-thumb" style="filter: ${f.value}"></div><div class="q-filter-name">${f.name}</div>`;
                el.onclick = () => {
                    this.querySelectorAll('.q-filter-item').forEach(e => e.classList.remove('active'));
                    el.classList.add('active');
                    this.selectedFilter = f.value;
                    this.querySelector('#q-video-preview').style.filter = f.value;
                };
                filterList.appendChild(el);
            });

            // Initialize Colors
            const colors = ['#ffffff', '#000000', '#ff3b30', '#0095f6', '#34c759', '#ffcc00', '#af52de'];
            const colorPicker = this.querySelector('#q-color-picker');
            let activeColor = '#ffffff';
            colors.forEach((c, i) => {
                const el = document.createElement('div');
                el.className = `q-color-dot ${i===0 ? 'active' : ''}`;
                el.style.backgroundColor = c;
                el.onclick = () => {
                    this.querySelectorAll('.q-color-dot').forEach(e => e.classList.remove('active'));
                    el.classList.add('active');
                    activeColor = c;
                };
                colorPicker.appendChild(el);
            });

            // Text Tool
            this.querySelector('#q-btn-add-text').addEventListener('click', () => {
                const input = this.querySelector('#q-text-input');
                if(input.value.trim() === '') return;
                
                this.addTextOverlay({
                    id: Date.now(),
                    text: input.value,
                    color: activeColor,
                    font: 'system-ui',
                    size: 36,
                    xPct: 50, // Center
                    yPct: 50
                });
                input.value = '';
            });

            // Panel Toggles
            this.querySelectorAll('.q-tool-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.querySelectorAll('.q-tool-btn').forEach(b => b.classList.remove('active'));
                    this.querySelectorAll('.q-panel').forEach(p => p.classList.remove('active'));
                    
                    const panelId = btn.currentTarget.getAttribute('data-panel');
                    btn.currentTarget.classList.add('active');
                    this.querySelector(`#${panelId}`).classList.add('active');
                });
            });
        }

        setupEditorEvents() {
            const video = this.querySelector('#q-video-preview');
            const startRange = this.querySelector('#q-trim-start');
            const endRange = this.querySelector('#q-trim-end');

            video.addEventListener('loadedmetadata', () => {
                if(this.fileType !== 'video') return;
                this.videoDuration = video.duration;
                this.trimStart = 0;
                this.trimEnd = video.duration;
                
                startRange.max = video.duration;
                endRange.max = video.duration;
                startRange.value = 0;
                endRange.value = video.duration;
                
                this.updateTrimmerUI();
                video.play();
            });

            // Loop playback within trim range
            video.addEventListener('timeupdate', () => {
                if (video.currentTime >= this.trimEnd) {
                    video.currentTime = this.trimStart;
                }
            });

            const handleTrim = (isStart) => {
                let s = parseFloat(startRange.value);
                let e = parseFloat(endRange.value);
                
                // Maintain 1 second minimum
                if (s > e - 1) {
                    if (isStart) { startRange.value = e - 1; s = e - 1; }
                    else { endRange.value = s + 1; e = s + 1; }
                }
                
                this.trimStart = s;
                this.trimEnd = e;
                video.currentTime = isStart ? this.trimStart : this.trimEnd;
                this.updateTrimmerUI();
            };

            startRange.addEventListener('input', () => handleTrim(true));
            endRange.addEventListener('input', () => handleTrim(false));
        }

        updateTrimmerUI() {
            const fill = this.querySelector('#q-trim-fill');
            const display = this.querySelector('#q-trim-text');
            const duration = this.videoDuration || 100;
            
            const leftPct = (this.trimStart / duration) * 100;
            const widthPct = ((this.trimEnd - this.trimStart) / duration) * 100;

            fill.style.left = leftPct + '%';
            fill.style.width = widthPct + '%';
            display.innerText = `${this.formatTime(this.trimStart)} - ${this.formatTime(this.trimEnd)}`;
        }

        formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s < 10 ? '0'+s : s}`;
        }

        // ==========================================
        // ✍️ DRAGGABLE TEXT LOGIC
        // ==========================================
        addTextOverlay(textObj) {
            this.textOverlays.push(textObj);
            this.renderTextOverlays();
        }

        renderTextOverlays() {
            const layer = this.querySelector('#q-text-layer');
            layer.innerHTML = '';
            
            this.textOverlays.forEach(t => {
                const el = document.createElement('div');
                el.className = 'q-text-element';
                el.innerText = t.text;
                el.style.color = t.color;
                el.style.fontSize = `${t.size}px`;
                el.style.fontFamily = t.font;
                el.style.left = `${t.xPct}%`;
                el.style.top = `${t.yPct}%`;
                el.setAttribute('data-id', t.id);
                layer.appendChild(el);
            });
        }

        setupDragEvents() {
            const layer = this.querySelector('#q-text-layer');
            
            const getCoords = (e) => {
                if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            };

            const startDrag = (e) => {
                if (e.target.classList.contains('q-text-element')) {
                    this.activeDragElement = e.target;
                    const coords = getCoords(e);
                    
                    const rect = layer.getBoundingClientRect();
                    // Store initial offset
                    this.dragStartX = coords.x;
                    this.dragStartY = coords.y;
                }
            };

            const doDrag = (e) => {
                if (!this.activeDragElement) return;
                e.preventDefault(); // Prevent scrolling
                
                const coords = getCoords(e);
                const rect = layer.getBoundingClientRect();
                
                // Calculate movement delta
                const dx = coords.x - this.dragStartX;
                const dy = coords.y - this.dragStartY;
                
                // Get current percentages
                const id = parseInt(this.activeDragElement.getAttribute('data-id'));
                const textObj = this.textOverlays.find(t => t.id === id);
                
                // Convert delta to percentage of container
                const pctX = (dx / rect.width) * 100;
                const pctY = (dy / rect.height) * 100;
                
                let newXPct = textObj.xPct + pctX;
                let newYPct = textObj.yPct + pctY;
                
                // Clamp to screen
                newXPct = Math.max(0, Math.min(100, newXPct));
                newYPct = Math.max(0, Math.min(100, newYPct));
                
                this.activeDragElement.style.left = `${newXPct}%`;
                this.activeDragElement.style.top = `${newYPct}%`;
                
                // Update start position for next frame
                this.dragStartX = coords.x;
                this.dragStartY = coords.y;
                
                // Save back to state
                textObj.xPct = newXPct;
                textObj.yPct = newYPct;
            };

            const stopDrag = () => {
                this.activeDragElement = null;
            };

            layer.addEventListener('mousedown', startDrag);
            layer.addEventListener('touchstart', startDrag, {passive: false});
            
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('touchmove', doDrag, {passive: false});
            
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        }

        // ==========================================
        // 📁 FILE HANDLING
        // ==========================================
        handleFileSelect(file) {
            this.originalFile = file;
            this.originalSizeMB = file.size / (1024 * 1024);
            const mime = file.type;

            this.isOpen = true;
            this.mode = 'editor';
            this.querySelector('#q-overlay').classList.add('open');
            window.history.pushState({ qEditorOpen: true }, "");

            if (mime.startsWith('video/')) {
                this.fileType = 'video';
                
                // Setup Video Preview
                const video = this.querySelector('#q-video-preview');
                const url = URL.createObjectURL(file);
                video.src = url;
                
                // Ensure Toolbar shows
                this.querySelector('#q-toolbar').style.display = 'flex';
                this.querySelector('.q-tool-btn[data-panel="panel-trim"]').click();
            } else {
                // If it's an image or doc, skip editor and go straight to upload logic
                this.fileType = 'file';
                this.querySelector('#q-workspace').innerHTML = `<div style="color:white; font-size:4rem;">📄</div><div style="color:white; margin-top:20px;">${file.name}</div>`;
                this.querySelector('#q-toolbar').style.display = 'none';
            }
        }

        // ==========================================
        // 📉 DYNAMIC COMPRESSION (THE CORE)
        // ==========================================
        async startPipeline() {
            if (!this.originalFile) return;

            // Non-video files go straight to upload
            if (this.fileType !== 'video') {
                return this.uploadFile(this.originalFile);
            }

            // Show Screenshot-Style Export Screen
            this.mode = 'exporting';
            this.querySelector('#q-toolbar').style.display = 'none';
            this.querySelector('#q-workspace').style.display = 'none';
            const exportScreen = this.querySelector('#q-export-screen');
            exportScreen.classList.add('active');
            
            // Setup Export Video Preview (Silent)
            const exportVideo = this.querySelector('#q-export-video');
            exportVideo.src = URL.createObjectURL(this.originalFile);
            exportVideo.style.filter = this.selectedFilter;
            exportVideo.currentTime = this.trimStart;
            exportVideo.muted = true;
            await exportVideo.play();

            // Setup SVG Border Length
            const rectFg = this.querySelector('#q-progress-rect');
            // Give layout a tick to calculate dimensions
            setTimeout(async () => {
                const rectLength = rectFg.getTotalLength() || 1000;
                rectFg.style.strokeDasharray = rectLength;
                rectFg.style.strokeDashoffset = rectLength;
                
                try {
                    const compressedFile = await this.executeCanvasCompression(exportVideo, rectFg, rectLength);
                    this.uploadFile(compressedFile);
                } catch (e) {
                    console.error(e);
                    alert("Compression failed. Uploading original file.");
                    this.uploadFile(this.originalFile);
                }
            }, 100);
        }

        async executeCanvasCompression(exportVideo, rectFg, rectLength) {
            return new Promise((resolve, reject) => {
                
                // 1. Dynamic Bitrate Calculation (Relative Quality)
                // 60MB targets 2MB. 120MB targets 4MB. 
                const targetSizeMB = Math.max((this.originalSizeMB / 60) * 2, 1); // Min 1MB floor
                const exportDuration = this.trimEnd - this.trimStart;
                
                // Bitrate = (Megabytes * 8 bits * 1024 * 1024) / Seconds
                let calculatedBitrate = Math.floor((targetSizeMB * 8388608) / exportDuration);
                
                // Hard Caps so we don't destroy quality or make it too big
                const MIN_BITRATE = 250000;  // 250kbps
                const MAX_BITRATE = 2500000; // 2.5Mbps
                calculatedBitrate = Math.max(MIN_BITRATE, Math.min(MAX_BITRATE, calculatedBitrate));

                // 2. Setup Canvas
                const canvas = this.querySelector('#q-hidden-canvas');
                const ctx = canvas.getContext('2d');
                
                // Restrict resolution to save memory (e.g. 480p equivalent)
                const MAX_DIMENSION = 640;
                let w = exportVideo.videoWidth;
                let h = exportVideo.videoHeight;
                if (Math.max(w, h) > MAX_DIMENSION) {
                    const scale = MAX_DIMENSION / Math.max(w, h);
                    w = Math.floor(w * scale);
                    h = Math.floor(h * scale);
                }
                canvas.width = w;
                canvas.height = h;

                // 3. Audio Extraction via Web Audio API
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaElementSource(exportVideo);
                const dest = audioCtx.createMediaStreamDestination();
                source.connect(dest); // Routes audio to destination, NOT speakers

                // 4. Capture Stream & Recorder
                const videoStream = canvas.captureStream(24); // 24 FPS
                const audioStream = dest.stream;
                
                const combinedStream = new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...audioStream.getAudioTracks()
                ]);

                const recorder = new MediaRecorder(combinedStream, {
                    videoBitsPerSecond: calculatedBitrate,
                    audioBitsPerSecond: 64000
                });

                const chunks = [];
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/mp4' });
                    const file = new File([blob], `quantum_optimized_${Date.now()}.mp4`, { type: 'video/mp4' });
                    audioCtx.close();
                    resolve(file);
                };

                recorder.start();

                // 5. Render Loop
                const pctText = this.querySelector('#q-export-pct');
                
                const drawFrame = () => {
                    // Check if we hit the trim end point
                    if (exportVideo.currentTime >= this.trimEnd || exportVideo.paused || exportVideo.ended) {
                        if(recorder.state === "recording") recorder.stop();
                        exportVideo.pause();
                        pctText.innerText = "100%";
                        rectFg.style.strokeDashoffset = 0;
                        return;
                    }

                    // A. Draw Video with Filter
                    ctx.filter = this.selectedFilter;
                    ctx.drawImage(exportVideo, 0, 0, w, h);
                    
                    // B. Draw Text Overlays
                    ctx.filter = 'none'; // reset filter for text
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    this.textOverlays.forEach(t => {
                        // Scale font size relative to canvas dimension vs screen dimension
                        // Rough estimate: canvas is 'w' wide, screen might be 350px wide. 
                        const scaleFactor = w / 350; 
                        ctx.font = `800 ${t.size * scaleFactor}px ${t.font}`;
                        ctx.fillStyle = t.color;
                        ctx.shadowColor = 'rgba(0,0,0,0.8)';
                        ctx.shadowBlur = 10 * scaleFactor;
                        
                        const x = w * (t.xPct / 100);
                        const y = h * (t.yPct / 100);
                        ctx.fillText(t.text, x, y);
                    });

                    // C. Update Progress UI
                    const progress = (exportVideo.currentTime - this.trimStart) / exportDuration;
                    const safeProgress = Math.max(0, Math.min(1, progress));
                    
                    pctText.innerText = (safeProgress * 100).toFixed(1) + "%";
                    // Animate SVG Border
                    rectFg.style.strokeDashoffset = rectLength - (rectLength * safeProgress);

                    requestAnimationFrame(drawFrame);
                };
                
                drawFrame();
                
                // Fallback in case of weird video end events
                exportVideo.onended = () => {
                    if(recorder.state === "recording") recorder.stop();
                };

            });
        }

        // ==========================================
        // ☁️ UPLOAD TO SUPABASE
        // ==========================================
        async uploadFile(finalFile) {
            if (!this.sbClient) {
                this.initSupabaseClient();
            }

            const pctText = this.querySelector('#q-export-pct');
            const subText = this.querySelector('.q-export-sub');
            const rectFg = this.querySelector('#q-progress-rect');
            const rectLength = rectFg.getTotalLength() || 1000;
            
            // Re-purpose the UI for Upload Progress
            pctText.innerText = "Uploading...";
            subText.innerText = `Final Size: ${(finalFile.size / (1024*1024)).toFixed(2)} MB`;
            rectFg.style.strokeDashoffset = rectLength; // reset border
            rectFg.style.stroke = "#34c759"; // change border to green for upload

            const fileName = `${Date.now()}_${finalFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            try {
                // Simulate Upload Progress for UI feel
                let simProgress = 0;
                const uploadInterval = setInterval(() => {
                    if(simProgress < 0.9) {
                        simProgress += 0.05;
                        rectFg.style.strokeDashoffset = rectLength - (rectLength * simProgress);
                    }
                }, 300);

                const { data, error } = await this.sbClient.storage.from(STORAGE_BUCKET).upload(fileName, finalFile, { cacheControl: '3600', upsert: false });

                clearInterval(uploadInterval);
                if (error) throw error;

                rectFg.style.strokeDashoffset = 0; // 100% complete

                const { data: publicData } = this.sbClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
                
                this.dispatchEvent(new CustomEvent('file-uploaded', {
                    detail: { 
                        url: publicData.publicUrl, 
                        metadata: {
                            name: finalFile.name,
                            size: finalFile.size,
                            type: this.fileType,
                            trimStart: this.trimStart,
                            trimEnd: this.trimEnd,
                            filter: this.selectedFilter
                        } 
                    },
                    bubbles: true, composed: true
                }));

                setTimeout(() => { if(this.isOpen) history.back(); }, 600);

            } catch (error) {
                console.error(error);
                alert("Upload Failed. Please check connection.");
                this.hideUI();
            }
        }

        openPicker() {
            this.querySelector('#q-file-input').click();
        }

        hideUI() {
            this.isOpen = false;
            this.mode = 'closed';
            this.querySelector('#q-overlay').classList.remove('open');
            this.querySelector('#q-export-screen').classList.remove('active');
            
            const prev = this.querySelector('#q-video-preview');
            const exp = this.querySelector('#q-export-video');
            prev.pause(); prev.src = "";
            exp.pause(); exp.src = "";
            
            this.selectedFile = null;
            this.originalFile = null;
            this.textOverlays = [];
            this.querySelector('#q-text-layer').innerHTML = '';
        }
    }

    if(!customElements.get('quantum-editor')) {
        customElements.define('quantum-editor', QuantumEditor);
    }
})();
