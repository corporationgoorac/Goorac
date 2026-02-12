(function() {
    /**
     * ==========================================
     * 🎙️ VOICE RECORDER COMPONENT (UPDATED)
     * ------------------------------------------
     * - Professional Mic Icon
     * - "Wind" Visualizer
     * - Direct Supabase Upload -> Link Return
     * ==========================================
     */

    // --- CONFIGURATION (Matches filePicker.js) ---
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
            this.state = {
                isRecording: false,
                isLocked: false,
                startTime: 0,
                duration: 0
            };
            this.mediaRecorder = null;
            this.audioChunks = [];
            this.sbClient = null;
            this.touchStart = { x: 0, y: 0 };
            this.timerInterval = null;
        }

        connectedCallback() {
            this.initSupabase();
            this.render();
            this.cacheDOM();
            this.bindEvents();
        }

        initSupabase() {
            if (window.supabase) {
                this.sbClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            } else {
                console.warn("⚠️ Supabase SDK not found.");
            }
        }

        render() {
            this.innerHTML = `
            <style>
                /* --- CONTAINER --- */
                .vr-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px; /* Fixed width to match Send button */
                    height: 44px;
                    position: relative;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }

                /* --- RECORDING BAR (Slides out to left) --- */
                .vr-bar {
                    position: absolute;
                    right: 0; /* Anchored right */
                    height: 48px;
                    background: #1a1a1a;
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    padding: 0 16px;
                    z-index: 100;
                    width: 44px; /* Start small */
                    opacity: 0;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease;
                    pointer-events: none;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }

                .vr-bar.active {
                    width: calc(100vw - 24px); /* Full width minus margins */
                    right: -6px; /* Adjust positioning */
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
                    min-width: 60px;
                }

                .vr-timer::before {
                    content: '';
                    display: block;
                    width: 8px;
                    height: 8px;
                    background-color: #ff453a;
                    border-radius: 50%;
                    animation: pulseRed 1s infinite;
                }

                /* --- WIND INDICATOR (Visualizer) --- */
                .vr-visualizer {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    height: 20px;
                    mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
                    -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
                }

                .v-bar {
                    width: 3px;
                    height: 10%;
                    background-color: ${CONFIG.THEME_COLOR};
                    border-radius: 2px;
                    transition: height 0.1s;
                }

                /* Wind/Wave Animation */
                .vr-bar.active .v-bar {
                    animation: windWave 0.8s ease-in-out infinite;
                }
                .v-bar:nth-child(odd) { animation-duration: 0.6s; }
                .v-bar:nth-child(2n) { animation-duration: 1.1s; }
                .v-bar:nth-child(3n) { animation-duration: 0.9s; }
                .v-bar:nth-child(4n) { animation-duration: 1.3s; }

                /* --- SWIPE HINT --- */
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

                /* --- SLEEK MIC BUTTON --- */
                .vr-record-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 101; /* Above bar */
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    -webkit-tap-highlight-color: transparent;
                }

                .vr-record-btn svg {
                    width: 24px;
                    height: 24px;
                    fill: ${CONFIG.THEME_COLOR}; /* Orange default */
                    transition: fill 0.2s, transform 0.2s;
                }

                /* Active Recording State */
                .vr-record-btn.recording {
                    background-color: ${CONFIG.THEME_COLOR};
                    transform: scale(1.2);
                    box-shadow: 0 0 0 6px rgba(255, 152, 0, 0.2);
                }

                .vr-record-btn.recording svg {
                    fill: #ffffff;
                    transform: scale(0.8);
                }

                /* --- LOCK INDICATOR --- */
                .vr-lock-indicator {
                    position: absolute;
                    bottom: 90px;
                    right: 0;
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
                    z-index: 2000;
                }

                .vr-lock-indicator.visible {
                    transform: translateY(0);
                    opacity: 1;
                }

                @keyframes pulseRed { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
                @keyframes windWave { 0% { height: 10%; } 50% { height: 90%; } 100% { height: 10%; } }
            </style>

            <div class="vr-wrapper">
                <div class="vr-bar" id="vr-bar">
                    <div class="vr-timer" id="vr-timer">00:00</div>
                    <div class="vr-visualizer">
                        <div class="v-bar"></div><div class="v-bar"></div>
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
            this.dom.btn.addEventListener('touchstart', (e) => {
                // e.preventDefault(); // Removed to allow potential clicks if needed, managed by logic
                this.handleTouchStart(e);
            }, { passive: false });

            this.dom.btn.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            this.dom.btn.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            this.dom.btn.addEventListener('mousedown', (e) => this.handleTouchStart(e));
        }

        async handleTouchStart(e) {
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            this.touchStart = { x: touch.clientX, y: touch.clientY };
            this.state.isLocked = false;
            
            // Delay slightly to differentiate click from hold if needed, 
            // but for instant record, we start now.
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.startRecording(stream);
                if (navigator.vibrate) navigator.vibrate(50);
                this.updateUI(true);
            } catch (err) {
                console.error("❌ Mic Permission Denied:", err);
                alert("Please enable microphone access.");
            }
        }

        handleTouchMove(e) {
            if (!this.mediaRecorder || this.state.isLocked) return;
            const touch = e.touches ? e.touches[0] : e;
            const diffX = touch.clientX - this.touchStart.x;
            const diffY = touch.clientY - this.touchStart.y;

            if (diffX < CONFIG.THRESHOLDS.CANCEL_X) {
                this.cancelRecording();
            }
            if (diffY < CONFIG.THRESHOLDS.LOCK_Y) {
                this.lockRecording();
            }
        }

        handleTouchEnd() {
            if (!this.state.isLocked && this.state.isRecording) {
                this.stopRecording();
            }
        }

        startRecording(stream) {
            this.state.isRecording = true;
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) this.audioChunks.push(event.data);
            };
            this.mediaRecorder.onstop = () => {
                if (this.state.isRecording) this.uploadToSupabase();
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
            if (this.mediaRecorder) this.mediaRecorder.stop();
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
            this.cleanup();
        }

        lockRecording() {
            this.state.isLocked = true;
            this.dom.lock.classList.add('visible');
            if (navigator.vibrate) navigator.vibrate(50);
            setTimeout(() => {
                this.dom.lock.classList.remove('visible');
            }, 2000);
        }

        async uploadToSupabase() {
            if (this.state.duration < 1) return; // Prevent accident
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

                // 3. Emit event with Link
                this.dispatchEvent(new CustomEvent('voice-uploaded', {
                    detail: { url: data.publicUrl, duration: this.state.duration },
                    bubbles: true, composed: true
                }));

            } catch (err) { console.error("❌ Upload Failed:", err); }
        }

        startTimer() {
            this.state.duration = 0;
            this.dom.timer.innerText = "00:00";
            this.timerInterval = setInterval(() => {
                this.state.duration++;
                const mins = Math.floor(this.state.duration / 60).toString().padStart(2, '0');
                const secs = (this.state.duration % 60).toString().padStart(2, '0');
                this.dom.timer.innerText = `${mins}:${secs}`;
            }, 1000);
        }

        updateUI(isActive) {
            // Signal Chat UI to hide Input Box
            this.dispatchEvent(new CustomEvent('recording-state-changed', {
                detail: { active: isActive }, bubbles: true, composed: true
            }));
            this.dom.bar.classList.toggle('active', isActive);
            this.dom.btn.classList.toggle('recording', isActive);
        }

        cleanup() {
            clearInterval(this.timerInterval);
            this.updateUI(false);
            if (this.mediaRecorder && this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            // Reset but don't clear chunks instantly in case of async issues (cleared on start)
            this.state.isRecording = false;
            this.state.isLocked = false;
            this.dom.lock.classList.remove('visible');
        }
    }

    if (!customElements.get('voice-recorder')) {
        customElements.define('voice-recorder', VoiceRecorder);
    }
})();
