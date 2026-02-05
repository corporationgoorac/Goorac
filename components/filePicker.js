// Wrap in a closure to prevent variable conflicts
(function() {

    // ==========================================
    // ⚙️ CONFIGURATION
    // ==========================================
    const SUPABASE_URL = "https://ekgsgltykakwopcfyxqu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc";
    const THEME_COLOR = "#0095f6"; // Changed to a professional Blue (Messenger style) or keep Orange
    const STORAGE_BUCKET = "public-files"; 
    // ==========================================

    class FilePicker extends HTMLElement {
        constructor() {
            super();
            this.supabaseUrl = SUPABASE_URL;
            this.supabaseKey = SUPABASE_KEY;
            this.selectedFile = null;
            this.fileType = null;
            this.isUploading = false;
            this.videoDuration = 0;
            this.trimStart = 0;
            this.trimEnd = 0;
            this.sbClient = null;
            this.isOpen = false; // Internal state tracking
        }

        connectedCallback() {
            if (!this.querySelector('#fp-file-input')) {
                this.ensureSupabase();
                this.render();
                this.setupEvents();
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

        render() {
            this.innerHTML = `
            <style>
                :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: block; }
                
                /* --- Overlay & Animation --- */
                #fp-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); z-index: 10000;
                    display: none; justify-content: center; align-items: flex-end;
                    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
                    opacity: 0; transition: opacity 0.3s ease;
                }
                #fp-overlay.open { display: flex; opacity: 1; }

                /* --- Main Card --- */
                .fp-card {
                    width: 100%; max-width: 480px; height: 85vh;
                    background: #1c1c1c;
                    border-top-left-radius: 24px; border-top-right-radius: 24px;
                    display: flex; flex-direction: column; overflow: hidden;
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
                    transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
                    position: relative;
                }
                #fp-overlay.open .fp-card { transform: translateY(0); }

                /* --- Header --- */
                .fp-header {
                    padding: 18px 20px; 
                    display: flex; justify-content: space-between; align-items: center;
                    color: white; font-weight: 600; font-size: 1.1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    background: rgba(30,30,30,0.8);
                }
                .fp-close-btn { 
                    background: rgba(255,255,255,0.1); border: none; color: #ccc; 
                    width: 30px; height: 30px; border-radius: 50%; display: flex; 
                    align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer;
                    transition: background 0.2s;
                }
                .fp-close-btn:active { background: rgba(255,255,255,0.2); }

                /* --- Preview Area --- */
                .fp-preview-container {
                    flex: 1; padding: 20px; overflow-y: auto;
                    display: flex; flex-direction: column; align-items: center;
                    gap: 20px;
                }

                /* Video Preview */
                .fp-video-wrapper { 
                    width: 100%; max-height: 35vh; border-radius: 16px; overflow: hidden; 
                    background: #000; display:none; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                video { width: 100%; height: 100%; object-fit: contain; }

                /* File Icon Preview */
                .fp-file-icon-wrapper {
                    width: 120px; height: 120px; background: rgba(255,255,255,0.05); border-radius: 24px;
                    display: none; align-items: center; justify-content: center;
                    font-size: 3.5rem; color: #fff; border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-top: 20px;
                }
                
                /* File Meta Info */
                .fp-file-info-box { text-align: center; width: 100%; padding: 0 10px; }
                .fp-file-name { color: white; font-weight: 600; margin-bottom: 6px; word-break: break-word; font-size: 1.05rem; line-height: 1.3;}
                .fp-file-meta { color: #888; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;}

                /* --- Trimmer UI --- */
                .fp-trimmer-box {
                    width: 100%; padding: 16px; background: rgba(0,0,0,0.3); border-radius: 16px;
                    display: none; border: 1px solid rgba(255,255,255,0.08); margin-top: auto;
                }
                .fp-trim-label { font-size: 0.75rem; color: #aaa; margin-bottom: 14px; display: flex; justify-content: space-between; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                .fp-range-wrapper { position: relative; height: 36px; padding: 0 10px; }
                input[type=range] {
                    position: absolute; pointer-events: none; -webkit-appearance: none;
                    width: calc(100% - 20px); height: 4px; background: transparent; top: 16px; z-index: 5;
                }
                input[type=range]::-webkit-slider-thumb {
                    pointer-events: auto; -webkit-appearance: none;
                    width: 12px; height: 28px; background: #fff; 
                    border-radius: 4px; cursor: ew-resize; 
                    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                    transform: translateY(-12px); /* Center thumb */
                }
                .fp-track-bg {
                    position: absolute; top: 16px; height: 4px; width: calc(100% - 20px); 
                    background: rgba(255,255,255,0.1); border-radius: 2px;
                }
                .fp-track-fill {
                    position: absolute; top: 16px; height: 4px; background: ${THEME_COLOR}; z-index: 2;
                }

                /* --- Input & Footer --- */
                .fp-caption-box { padding: 15px 20px; background: #1c1c1c; border-top: 1px solid rgba(255,255,255,0.05); }
                .fp-caption-input {
                    width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white;
                    padding: 14px; border-radius: 14px; font-size: 1rem; outline: none; transition: all 0.2s;
                    box-sizing: border-box;
                }
                .fp-caption-input:focus { border-color: ${THEME_COLOR}; background: rgba(0,0,0,0.4); }

                .fp-footer { 
                    padding: 15px 20px 30px 20px; display: flex; gap: 12px; justify-content: space-between; 
                    background: #1c1c1c;
                }
                .fp-btn {
                    padding: 14px; border-radius: 14px; font-weight: 600; border: none; cursor: pointer; font-size: 1rem;
                    transition: transform 0.1s; flex: 1; text-align: center;
                }
                .fp-btn:active { transform: scale(0.98); }
                .fp-btn-cancel { background: rgba(255,255,255,0.08); color: #fff; max-width: 100px;}
                
                .fp-btn-send { 
                    background: ${THEME_COLOR}; color: white; 
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    position: relative; overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 149, 246, 0.3); /* Matches theme color glow */
                }
                .fp-btn-send:disabled { background: #333; color: #777; box-shadow: none; cursor: not-allowed; }

                /* --- Upload Progress Bar (Inside Button) --- */
                .fp-btn-progress {
                    position: absolute; bottom: 0; left: 0; height: 4px; background: rgba(255,255,255,0.5); 
                    width: 0%; transition: width 0.3s ease;
                }

                /* --- Toast Notification --- */
                .fp-toast {
                    position: absolute; top: 80px; left: 50%; transform: translateX(-50%) translateY(-10px);
                    background: rgba(20, 20, 20, 0.95); color: white; padding: 12px 24px;
                    border-radius: 30px; font-size: 0.9rem; pointer-events: none;
                    opacity: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex; align-items: center; gap: 8px; z-index: 100;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.4); font-weight: 500;
                }
                .fp-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

                #fp-file-input { display: none; }
            </style>

            <input type="file" id="fp-file-input" style="display:none !important">

            <div id="fp-overlay">
                <div class="fp-card">
                    
                    <div class="fp-header">
                        <span id="fp-header-title">Preview</span>
                        <button class="fp-close-btn" id="fp-close">✕</button>
                    </div>

                    <div class="fp-toast" id="fp-toast"><span></span></div>

                    <div class="fp-preview-container">
                        <div class="fp-video-wrapper" id="fp-vid-wrap">
                            <video id="fp-video-el" controls playsinline></video>
                        </div>
                        <div class="fp-file-icon-wrapper" id="fp-icon-wrap">
                            <span id="fp-type-emoji">📄</span>
                        </div>
                        <div class="fp-file-info-box" id="fp-info-text"></div>

                        <div class="fp-trimmer-box" id="fp-trimmer">
                            <div class="fp-trim-label">
                                <span style="display:flex; align-items:center; gap:6px;">✂️ Trim Video</span>
                                <span id="fp-time-display" style="font-family:monospace; color:white;">00:00 - 00:00</span>
                            </div>
                            <div class="fp-range-wrapper">
                                <div class="fp-track-bg"></div>
                                <div class="fp-track-fill" id="fp-fill"></div>
                                <input type="range" id="fp-start-range" min="0" value="0" step="0.1">
                                <input type="range" id="fp-end-range" min="0" value="100" step="0.1">
                            </div>
                        </div>
                    </div>

                    <div class="fp-caption-box">
                        <input type="text" class="fp-caption-input" id="fp-caption" placeholder="Add a caption..." autocomplete="off">
                    </div>

                    <div class="fp-footer">
                        <button class="fp-btn fp-btn-cancel" id="fp-cancel">Cancel</button>
                        <button class="fp-btn fp-btn-send" id="fp-send">
                            <span id="fp-send-text">Send</span>
                            <div class="fp-btn-progress" id="fp-bar"></div>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }

        setupEvents() {
            const input = this.querySelector('#fp-file-input');
            const overlay = this.querySelector('#fp-overlay');
            const closeBtn = this.querySelector('#fp-close');
            const cancelBtn = this.querySelector('#fp-cancel');
            const sendBtn = this.querySelector('#fp-send');
            
            if(input) {
                input.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) this.handleFileSelect(e.target.files[0]);
                });
            }

            // --- HISTORY HANDLING FIX ---
            // When user clicks Close/Cancel, we manually go back in history.
            // This triggers 'popstate', which then actually hides the UI.
            const triggerBack = () => {
                if (this.isOpen) {
                    history.back(); // This will trigger the popstate listener below
                } else {
                    this.hideUI(); // Fallback
                }
            };

            closeBtn.addEventListener('click', triggerBack);
            cancelBtn.addEventListener('click', triggerBack);
            overlay.addEventListener('click', (e) => { if(e.target === overlay) triggerBack(); });

            // Listen for browser Back Button (or history.back() called above)
            window.addEventListener('popstate', (event) => {
                // If we are open, and the state changes (pop), we must close UI
                if (this.isOpen) {
                    this.hideUI();
                }
            });

            sendBtn.addEventListener('click', () => this.uploadFile());

            // Video Trimmer Logic
            const startRange = this.querySelector('#fp-start-range');
            const endRange = this.querySelector('#fp-end-range');
            const video = this.querySelector('#fp-video-el');

            video.addEventListener('loadedmetadata', () => {
                if(this.fileType !== 'video') return;
                this.videoDuration = video.duration;
                this.trimStart = 0;
                this.trimEnd = video.duration;
                startRange.max = video.duration;
                endRange.max = video.duration;
                endRange.value = video.duration;
                startRange.value = 0;
                this.updateTrimmerUI();
            });

            const handleTrim = (isStart) => {
                let s = parseFloat(startRange.value);
                let e = parseFloat(endRange.value);
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
            const fill = this.querySelector('#fp-fill');
            const display = this.querySelector('#fp-time-display');
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

        handleFileSelect(file) {
            this.selectedFile = file;
            const overlay = this.querySelector('#fp-overlay');
            const title = this.querySelector('#fp-header-title');
            const infoText = this.querySelector('#fp-info-text');
            
            // Reset UI
            this.querySelector('#fp-vid-wrap').style.display = 'none';
            this.querySelector('#fp-icon-wrap').style.display = 'none';
            this.querySelector('#fp-trimmer').style.display = 'none';
            this.querySelector('#fp-video-el').src = '';

            const mime = file.type;
            const sizeStr = (file.size / (1024*1024)).toFixed(2) + " MB";
            const setMeta = (name, type) => {
                infoText.innerHTML = `<div class="fp-file-name">${name}</div><div class="fp-file-meta">${type} • ${sizeStr}</div>`;
            };

            if (mime.startsWith('video/')) {
                this.fileType = 'video';
                title.innerText = 'Send Video';
                const vidWrap = this.querySelector('#fp-vid-wrap');
                const video = this.querySelector('#fp-video-el');
                const trimmer = this.querySelector('#fp-trimmer');
                vidWrap.style.display = 'block';
                trimmer.style.display = 'block';
                video.src = URL.createObjectURL(file);
                setMeta(file.name, 'Video');
            } else if (mime === 'application/pdf') {
                this.fileType = 'pdf';
                title.innerText = 'Send PDF';
                this.showIcon('📄', '#ff3b30');
                setMeta(file.name, 'PDF');
            } else if (mime.startsWith('audio/')) {
                this.fileType = 'audio';
                title.innerText = 'Send Audio';
                this.showIcon('🎵', '#00e676');
                setMeta(file.name, 'Audio');
            } else if (mime.startsWith('image/')) {
                this.fileType = 'image';
                title.innerText = 'Send Image';
                this.showIcon('🖼️', '#ff6600');
                setMeta(file.name, 'Image');
            } else {
                this.fileType = 'file';
                title.innerText = 'Send File';
                this.showIcon('📁', '#0095f6');
                setMeta(file.name, 'File');
            }

            // Open UI and Push History
            this.isOpen = true;
            overlay.classList.add('open');
            // Crucial: We push state so Back Button works
            window.history.pushState({ filePickerOpen: true }, "");
        }

        showIcon(emoji, color) {
            const wrap = this.querySelector('#fp-icon-wrap');
            const icon = this.querySelector('#fp-type-emoji');
            wrap.style.display = 'flex';
            wrap.style.borderColor = color;
            wrap.style.boxShadow = `0 10px 30px ${color}20`; 
            icon.innerText = emoji;
        }

        showToast(message) {
            const toast = this.querySelector('#fp-toast');
            toast.querySelector('span').textContent = message;
            toast.classList.add('show');
            if(this.toastTimeout) clearTimeout(this.toastTimeout);
            this.toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }

        async uploadFile() {
            if (!this.selectedFile || this.isUploading) return;
            
            if (!this.sbClient) {
                this.initSupabaseClient();
                if(!this.sbClient) {
                    this.showToast("API Config Error");
                    return;
                }
            }

            this.isUploading = true;
            const sendBtn = this.querySelector('#fp-send');
            const sendText = this.querySelector('#fp-send-text');
            const bar = this.querySelector('#fp-bar');
            
            sendBtn.disabled = true;
            sendText.innerText = "Uploading...";
            bar.style.width = "20%"; 

            const file = this.selectedFile;
            const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${Date.now()}_${cleanName}`;

            try {
                const { data, error } = await this.sbClient.storage.from(STORAGE_BUCKET).upload(fileName, file, { cacheControl: '3600', upsert: false });

                if (error) throw error;
                bar.style.width = "100%";
                sendText.innerText = "Sent!";

                const { data: publicData } = this.sbClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
                const downloadUrl = publicData.publicUrl;
                const caption = this.querySelector('#fp-caption').value;

                let metadata = {
                    name: file.name,
                    size: file.size,
                    type: this.fileType,
                    caption: caption
                };

                if (this.fileType === 'video') {
                    metadata.trimStart = this.trimStart;
                    metadata.trimEnd = this.trimEnd;
                    metadata.duration = this.videoDuration;
                }

                this.dispatchEvent(new CustomEvent('file-uploaded', {
                    detail: { url: downloadUrl, metadata: metadata },
                    bubbles: true, composed: true
                }));

                // FIX: Don't just close(), go back in history to clean the state
                setTimeout(() => { 
                    if(this.isOpen) history.back(); 
                }, 400);

            } catch (error) {
                console.error('Upload error:', error);
                this.showToast("Upload failed");
                sendText.innerText = "Retry";
                bar.style.width = "0%";
                sendBtn.disabled = false;
            } finally {
                if(!sendBtn.disabled) this.isUploading = false;
            }
        }

        openPicker() {
            const fileInput = this.querySelector('#fp-file-input');
            if(fileInput) fileInput.click();
        }

        // This method strictly hides the UI and resets state.
        // It should NOT call history.back(). History events call THIS.
        hideUI() {
            this.isOpen = false;
            this.querySelector('#fp-overlay').classList.remove('open');
            this.querySelector('#fp-file-input').value = '';
            this.querySelector('#fp-caption').value = '';
            this.querySelector('#fp-bar').style.width = '0%';
            this.querySelector('#fp-send-text').innerText = "Send";
            this.selectedFile = null;
            this.isUploading = false;
            this.querySelector('#fp-send').disabled = false;
            const video = this.querySelector('#fp-video-el');
            video.pause();
            video.src = "";
        }
    }

    if(!customElements.get('file-picker')) {
        customElements.define('file-picker', FilePicker);
    }
})();
