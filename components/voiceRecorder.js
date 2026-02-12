// voiceRecorder.js
(function() {
    // ==========================================
    // ⚙️ CONFIGURATION (Matches filePicker.js)
    // ==========================================
    const SUPABASE_URL = "https://ekgsgltykakwopcfyxqu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc";
    const STORAGE_BUCKET = "voice-notes"; 
    const THEME_ACCENT = "#FF9800"; // Orange Blaze
    // ==========================================

    class VoiceRecorder extends HTMLElement {
        constructor() {
            super();
            this.mediaRecorder = null;
            this.audioChunks = [];
            this.timerInterval = null;
            this.seconds = 0;
            this.isLocked = false;
            this.sbClient = null;
            this.startX = 0;
            this.startY = 0;
            this.isRecording = false;
        }

        connectedCallback() {
            this.render();
            this.initSupabase();
            this.setupEvents();
        }

        initSupabase() {
            if (window.supabase) {
                this.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            }
        }

        render() {
            this.innerHTML = `
            <style>
                :host { display: block; }
                
                .vr-wrapper {
                    display: flex; align-items: center; justify-content: flex-end;
                    width: 100%; position: relative; height: 44px;
                }

                /* --- Recording Bar (Slides from Right) --- */
                .vr-bar {
                    position: absolute; right: 45px; height: 44px;
                    background: #1a1a1a; border-radius: 22px; 
                    display: none; align-items: center; padding: 0 15px; 
                    z-index: 10; width: 0; overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: width 0.3s cubic-bezier(0.33, 1, 0.68, 1);
                }
                .vr-bar.active { display: flex; width: calc(100vw - 80px); }

                .vr-timer { 
                    color: #ff453a; font-weight: 700; margin-right: 12px; 
                    font-family: monospace; font-size: 1rem;
                    display: flex; align-items: center; gap: 6px;
                }
                .vr-timer::before {
                    content: ''; width: 8px; height: 8px; background: #ff453a;
                    border-radius: 50%; display: inline-block;
                    animation: pulseTimer 1s infinite;
                }

                /* --- Visualizer Bars --- */
                .vr-visualizer {
                    display: flex; align-items: center; gap: 2px; height: 15px; flex: 1;
                }
                .v-bar { width: 2px; height: 40%; background: ${THEME_ACCENT}; border-radius: 1px; }
                .vr-bar.active .v-bar { animation: v-wave 0.8s ease-in-out infinite; }
                .v-bar:nth-child(2n) { animation-delay: 0.2s; }
                .v-bar:nth-child(3n) { animation-delay: 0.4s; }

                .vr-swipe-hint { 
                    color: #888; font-size: 0.8rem; font-weight: 500;
                    margin-left: 10px; white-space: nowrap;
                }

                /* --- Buttons --- */
                .vr-record-btn {
                    width: 44px; height: 44px; border-radius: 50%; background: transparent;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; z-index: 11; transition: all 0.2s ease;
                }
                .vr-record-btn svg { fill: ${THEME_ACCENT}; transition: fill 0.2s; }
                
                .vr-record-btn.recording { 
                    background: ${THEME_ACCENT}; transform: scale(1.3); 
                    box-shadow: 0 0 20px rgba(255, 152, 0, 0.4);
                }
                .vr-record-btn.recording svg { fill: #fff; }

                /* --- Lock UI --- */
                .vr-lock-indicator {
                    position: absolute; bottom: 80px; right: 12px;
                    background: rgba(30,30,30,0.9); backdrop-filter: blur(10px);
                    padding: 10px; border-radius: 20px; display: none;
                    flex-direction: column; align-items: center; gap: 8px; 
                    color: #fff; border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .vr-lock-indicator.visible { display: flex; animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

                @keyframes v-wave { 0%, 100% { height: 30%; } 50% { height: 100%; } }
                @keyframes pulseTimer { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            </style>

            <div class="vr-wrapper">
                <div class="vr-bar" id="vr-bar">
                    <span class="vr-timer" id="vr-timer">00:00</span>
                    <div class="vr-visualizer">
                        <div class="v-bar"></div><div class="v-bar"></div><div class="v-bar"></div>
                        <div class="v-bar"></div><div class="v-bar"></div><div class="v-bar"></div>
                    </div>
                    <span class="vr-swipe-hint">⬅️ Slide to cancel</span>
                </div>
                
                <div class="vr-lock-indicator" id="vr-lock">
                    <span style="font-size: 1.2rem;">🔒</span>
                    <span style="font-size: 0.6rem; font-weight: bold; text-transform: uppercase;">Locked</span>
                </div>

                <div class="vr-record-btn" id="vr-btn">
                    <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
            </div>
            `;
        }

        setupEvents() {
            const btn = this.querySelector('#vr-btn');
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startHold(e);
            });
            
            btn.addEventListener('touchmove', (e) => {
                this.handleMove(e);
            });
            
            btn.addEventListener('touchend', (e) => {
                this.endHold(e);
            });
        }

        async startHold(e) {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            this.isLocked = false;
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];
                
                this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
                this.mediaRecorder.onstop = () => this.uploadRecording();
                
                this.mediaRecorder.start();
                this.startTimer();
                this.toggleUI(true);
            } catch (err) {
                console.error("Mic Error:", err);
            }
        }

        handleMove(e) {
            if (!this.mediaRecorder || this.isLocked) return;
            
            const moveX = e.touches[0].clientX - this.startX;
            const moveY = e.touches[0].clientY - this.startY;

            // Swipe Left to Cancel
            if (moveX < -100) {
                this.cancelRecording();
            }
            // Swipe Up to Lock
            if (moveY < -80) {
                this.isLocked = true;
                this.querySelector('#vr-lock').classList.add('visible');
                if (navigator.vibrate) navigator.vibrate(40);
            }
        }

        endHold() {
            if (!this.isLocked && this.mediaRecorder?.state === "recording") {
                this.mediaRecorder.stop();
                this.toggleUI(false);
            }
        }

        startTimer() {
            this.seconds = 0;
            this.timerInterval = setInterval(() => {
                this.seconds++;
                const mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
                const secs = (this.seconds % 60).toString().padStart(2, '0');
                this.querySelector('#vr-timer').innerText = `${mins}:${secs}`;
            }, 1000);
        }

        cancelRecording() {
            if (!this.mediaRecorder) return;
            this.mediaRecorder.onstop = null; 
            this.mediaRecorder.stop();
            this.toggleUI(false);
            if (navigator.vibrate) navigator.vibrate([30, 30]);
        }

        toggleUI(active) {
            this.isRecording = active;
            this.querySelector('#vr-bar').classList.toggle('active', active);
            this.querySelector('#vr-btn').classList.toggle('recording', active);
            if (!active) {
                this.querySelector('#vr-lock').classList.remove('visible');
                clearInterval(this.timerInterval);
            }
            
            // Dispatch UI change to chat screen
            this.dispatchEvent(new CustomEvent('recording-state-changed', {
                detail: { active }, bubbles: true, composed: true
            }));
        }

        async uploadRecording() {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            if (this.seconds < 1) return; // Ignore accidental taps

            const fileName = `voice_${Date.now()}.webm`;

            try {
                // Upload to Supabase
                const { data, error } = await this.sbClient.storage
                    .from(STORAGE_BUCKET)
                    .upload(fileName, audioBlob);

                if (error) throw error;

                const { data: publicUrl } = this.sbClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

                // Dispatch to Firebase
                this.dispatchEvent(new CustomEvent('voice-uploaded', {
                    detail: { url: publicUrl.publicUrl, duration: this.seconds },
                    bubbles: true, composed: true
                }));
            } catch (err) {
                console.error("Upload failed:", err);
            }
        }
    }

    if(!customElements.get('voice-recorder')) {
        customElements.define('voice-recorder', VoiceRecorder);
    }
})();
