(function() {
    /**
     * ==========================================
     * 🎙️ VOICE RECORDER COMPONENT
     * ------------------------------------------
     * Handles audio capture, UI interactions (swipe/lock),
     * and direct upload to Supabase Storage.
     * ==========================================
     */

    // --- CONFIGURATION ---
    const CONFIG = {
        SUPABASE_URL: "https://ekgsgltykakwopcfyxqu.supabase.co",
        SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc",
        BUCKET: "public-files",
        THEME_COLOR: "#FF9800", // Orange Blaze
        THRESHOLDS: {
            CANCEL_X: -100, // Distance to swipe left to cancel
            LOCK_Y: -80     // Distance to swipe up to lock
        }
    };

    class VoiceRecorder extends HTMLElement {
        constructor() {
            super();
            
            // --- State ---
            this.state = {
                isRecording: false,
                isLocked: false,
                startTime: 0,
                duration: 0
            };

            // --- Hardware & Data ---
            this.mediaRecorder = null;
            this.audioChunks = [];
            this.sbClient = null;
            
            // --- Touch Tracking ---
            this.touchStart = { x: 0, y: 0 };
            
            // --- Timers ---
            this.timerInterval = null;
        }

        connectedCallback() {
            this.initSupabase();
            this.render();
            this.cacheDOM();
            this.bindEvents();
        }

        /**
         * Initialize Supabase Client if library exists
         */
        initSupabase() {
            if (window.supabase) {
                this.sbClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            } else {
                console.warn("⚠️ Supabase SDK not found. Uploads will fail.");
            }
        }

        /**
         * Render the Shadow DOM or Internal HTML
         */
        render() {
            this.innerHTML = `
            <style>
                /* --- CONTAINER --- */
                .vr-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    width: 100%;
                    height: 44px;
                    position: relative;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }

                /* --- RECORDING BAR (Slides in) --- */
                .vr-bar {
                    position: absolute;
                    right: 50px;
                    height: 44px;
                    background: #1a1a1a;
                    border-radius: 22px;
                    display: flex;
                    align-items: center;
                    padding: 0 16px;
                    z-index: 10;
                    width: 0;
                    opacity: 0;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease;
                    pointer-events: none; /* Click-through when hidden */
                }

                .vr-bar.active {
                    width: calc(100vw - 90px); /* Responsive width */
                    opacity: 1;
                    pointer-events: auto;
                }

                /* --- TIMER --- */
                .vr-timer {
                    color: #ff453a;
                    font-weight: 700;
                    font-family: monospace;
                    font-size: 15px;
                    margin-right: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 50px;
                }

                /* Red Recording Dot */
                .vr-timer::before {
                    content: '';
                    display: block;
                    width: 8px;
                    height: 8px;
                    background-color: #ff453a;
                    border-radius: 50%;
                    animation: pulseRed 1s infinite;
                }

                /* --- AUDIO VISUALIZER (CSS Animated) --- */
                .vr-visualizer {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    height: 16px;
                    mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
                    -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
                }

                .v-bar {
                    width: 3px;
                    height: 20%;
                    background-color: ${CONFIG.THEME_COLOR};
                    border-radius: 2px;
                    transition: height 0.1s;
                }

                /* Wave Animation when Active */
                .vr-bar.active .v-bar {
                    animation: audioWave 0.8s ease-in-out infinite;
                }
                .v-bar:nth-child(odd) { animation-duration: 0.6s; }
                .v-bar:nth-child(2n) { animation-duration: 1.1s; }
                .v-bar:nth-child(3n) { animation-duration: 0.9s; }
                .v-bar:nth-child(4n) { animation-duration: 1.3s; }

                /* --- SWIPE HINT TEXT --- */
                .vr-swipe-hint {
                    color: #888;
                    font-size: 13px;
                    font-weight: 500;
                    margin-left: 12px;
                    white-space: nowrap;
                    opacity: 0.8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                /* --- MAIN MIC BUTTON --- */
                .vr-record-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 20;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    -webkit-tap-highlight-color: transparent;
                }

                .vr-record-btn svg {
                    width: 24px;
                    height: 24px;
                    fill: ${CONFIG.THEME_COLOR};
                    transition: fill 0.2s;
                }

                /* Active Recording State for Button */
                .vr-record-btn.recording {
                    background-color: ${CONFIG.THEME_COLOR};
                    transform: scale(1.35);
                    box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.15);
                }

                .vr-record-btn.recording svg {
                    fill: #ffffff;
                    transform: scale(0.9);
                }

                /* --- LOCK INDICATOR (Floating) --- */
                .vr-lock-indicator {
                    position: absolute;
                    bottom: 85px;
                    right: 12px;
                    background: rgba(20, 20, 20, 0.95);
                    backdrop-filter: blur(10px);
                    padding: 12px 16px;
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    transform: translateY(20px);
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .vr-lock-indicator.visible {
                    transform: translateY(0);
                    opacity: 1;
                }

                /* --- ANIMATIONS --- */
                @keyframes pulseRed { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
                @keyframes audioWave { 0% { height: 20%; } 50% { height: 80%; } 100% { height: 20%; } }
            </style>

            <div class="vr-wrapper">
                <div class="vr-bar" id="vr-bar">
                    <div class="vr-timer" id="vr-timer">00:00</div>
                    
                    <div class="vr-visualizer">
                        <div class="v-bar"></div><div class="v-bar"></div>
                        <div class="v-bar"></div><div class="v-bar"></div>
                        <div class="v-bar"></div><div class="v-bar"></div>
                        <div class="v-bar"></div><div class="v-bar"></div>
                    </div>

                    <div class="vr-swipe-hint">
                        <span>Slide to cancel</span>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="#888"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </div>
                </div>
                
                <div class="vr-lock-indicator" id="vr-lock">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg>
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Locked</span>
                </div>

                <div class="vr-record-btn" id="vr-btn">
                    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
            </div>`;
        }

        cacheDOM() {
            this.dom = {
                btn: this.querySelector('#vr-btn'),
                bar: this.querySelector('#vr-bar'),
                timer: this.querySelector('#vr-timer'),
                lock: this.querySelector('#vr-lock')
            };
        }

        bindEvents() {
            // Touch Events for Mobile (Primary)
            this.dom.btn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent scrolling/ghost clicks
                this.handleTouchStart(e);
            }, { passive: false });

            this.dom.btn.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            this.dom.btn.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            
            // Mouse Events for Desktop Testing
            this.dom.btn.addEventListener('mousedown', (e) => this.handleTouchStart(e));
            // Note: Mouse move/up would need window listeners, omitting for simplicity/mobile-focus
        }

        // --- CORE LOGIC ---

        async handleTouchStart(e) {
            // Get coordinates
            const touch = e.touches ? e.touches[0] : e;
            this.touchStart = { x: touch.clientX, y: touch.clientY };
            
            // Reset State
            this.state.isLocked = false;
            this.state.isRecording = true;

            try {
                // Request Mic Permission
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.startRecording(stream);
                
                // Feedback
                if (navigator.vibrate) navigator.vibrate(50);
                this.updateUI(true);
            } catch (err) {
                console.error("❌ Mic Permission Denied:", err);
                alert("Please enable microphone access to send voice notes.");
                this.state.isRecording = false;
            }
        }

        handleTouchMove(e) {
            if (!this.mediaRecorder || this.state.isLocked) return;

            const touch = e.touches ? e.touches[0] : e;
            const diffX = touch.clientX - this.touchStart.x;
            const diffY = touch.clientY - this.touchStart.y;

            // 1. SWIPE LEFT TO CANCEL
            if (diffX < CONFIG.THRESHOLDS.CANCEL_X) {
                this.cancelRecording();
            }

            // 2. SWIPE UP TO LOCK
            if (diffY < CONFIG.THRESHOLDS.LOCK_Y) {
                this.lockRecording();
            }
        }

        handleTouchEnd() {
            // If not locked, stop recording on release
            if (!this.state.isLocked && this.state.isRecording) {
                this.stopRecording();
            }
        }

        // --- RECORDING ACTIONS ---

        startRecording(stream) {
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                // Only upload if intended (not cancelled)
                if (this.state.isRecording) {
                    this.uploadToSupabase();
                }
            };

            this.mediaRecorder.start();
            this.startTimer();
        }

        stopRecording() {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
                this.cleanup();
            }
        }

        cancelRecording() {
            this.state.isRecording = false; // Flag to prevent upload
            if (this.mediaRecorder) {
                this.mediaRecorder.stop();
            }
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // Error vibration pattern
            this.cleanup();
        }

        lockRecording() {
            this.state.isLocked = true;
            this.dom.lock.classList.add('visible');
            if (navigator.vibrate) navigator.vibrate(50);
            
            // Auto-hide lock indicator after 2s
            setTimeout(() => {
                this.dom.lock.classList.remove('visible');
            }, 2000);
        }

        // --- UPLOAD LOGIC ---

        async uploadToSupabase() {
            // Prevent accidental short taps
            if (this.state.duration < 1) return;

            const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const fileName = `voice_${Date.now()}_${Math.floor(Math.random() * 1000)}.webm`;

            try {
                if (!this.sbClient) throw new Error("Supabase client not initialized");

                // 1. Upload
                const { error: uploadError } = await this.sbClient.storage
                    .from(CONFIG.BUCKET)
                    .upload(fileName, blob, { cacheControl: '3600', upsert: false });

                if (uploadError) throw uploadError;

                // 2. Get Public URL
                const { data } = this.sbClient.storage
                    .from(CONFIG.BUCKET)
                    .getPublicUrl(fileName);

                // 3. Notify Parent Component
                this.dispatchEvent(new CustomEvent('voice-uploaded', {
                    detail: { 
                        url: data.publicUrl, 
                        duration: this.state.duration,
                        type: 'audio/webm'
                    },
                    bubbles: true, 
                    composed: true
                }));

            } catch (err) {
                console.error("❌ Upload Failed:", err);
                // Optional: Dispatch error event here
            }
        }

        // --- UI UTILITIES ---

        startTimer() {
            this.state.duration = 0;
            this.state.startTime = Date.now();
            
            this.dom.timer.innerText = "00:00";
            
            this.timerInterval = setInterval(() => {
                this.state.duration++;
                const mins = Math.floor(this.state.duration / 60).toString().padStart(2, '0');
                const secs = (this.state.duration % 60).toString().padStart(2, '0');
                this.dom.timer.innerText = `${mins}:${secs}`;
            }, 1000);
        }

        updateUI(isActive) {
            // Dispatch event for Chat UI transformation (Hides input box)
            this.dispatchEvent(new CustomEvent('recording-state-changed', {
                detail: { active: isActive },
                bubbles: true,
                composed: true
            }));

            // Toggle Classes
            this.dom.bar.classList.toggle('active', isActive);
            this.dom.btn.classList.toggle('recording', isActive);
        }

        cleanup() {
            clearInterval(this.timerInterval);
            this.updateUI(false);
            
            // Stop tracks to release microphone
            if (this.mediaRecorder && this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            // Reset Internal State
            this.state.isRecording = false;
            this.state.isLocked = false;
            this.dom.lock.classList.remove('visible');
        }
    }

    // Register Component
    if (!customElements.get('voice-recorder')) {
        customElements.define('voice-recorder', VoiceRecorder);
    }
})();
