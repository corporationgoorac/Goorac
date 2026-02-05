// ==========================================
// ⚙️ CONFIGURATION (EDIT HERE)
// ==========================================
const SUPABASE_URL = "https://ekgsgltykakwopcfyxqu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc";
const THEME_COLOR = "#ff6600"; // Orange Theme
const STORAGE_BUCKET = "public-files"; // Ensure this bucket exists in Supabase
// ==========================================

class FilePicker extends HTMLElement {
    constructor() {
        super();
        
        // Use hardcoded credentials
        this.supabaseUrl = SUPABASE_URL;
        this.supabaseKey = SUPABASE_KEY;
        
        this.selectedFile = null;
        this.fileType = null; // 'video', 'image', 'pdf', 'audio', 'file'
        this.isUploading = false;
        
        // Video Trimming State
        this.videoDuration = 0;
        this.trimStart = 0;
        this.trimEnd = 0;
        
        this.sbClient = null;
    }

    connectedCallback() {
        this.ensureSupabase();
        this.render();
        this.setupEvents();
    }

    ensureSupabase() {
        // Dynamically load Supabase SDK if not present
        if (!window.supabase) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            document.head.appendChild(script);
            script.onload = () => {
                this.initSupabaseClient();
            };
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
            :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            
            /* Overlay */
            #fp-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85); z-index: 10000;
                display: none; justify-content: center; align-items: flex-end;
                backdrop-filter: blur(5px);
            }
            #fp-overlay.open { display: flex; animation: slideUp 0.3s cubic-bezier(0.19, 1, 0.22, 1); }

            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

            /* Card */
            .fp-card {
                width: 100%; max-width: 500px; height: 90vh;
                background: #121212; 
                border-top-left-radius: 20px; border-top-right-radius: 20px;
                display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 -5px 30px rgba(0,0,0,0.5);
                border: 1px solid #333; position: relative;
            }

            /* Header */
            .fp-header {
                padding: 15px 20px; border-bottom: 1px solid #333;
                display: flex; justify-content: space-between; align-items: center;
                color: white; font-weight: 600; font-size: 1.1rem;
                background: rgba(30,30,30,0.5); backdrop-filter: blur(10px);
            }
            .fp-close-btn { 
                background: rgba(255,255,255,0.1); border: none; color: #fff; 
                width: 32px; height: 32px; border-radius: 50%; display: flex; 
                align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; 
            }

            /* Preview Area */
            .fp-preview-container {
                flex: 1; padding: 20px; overflow-y: auto;
                display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
                position: relative; gap: 20px;
            }

            /* Media Types UI */
            .fp-video-wrapper { 
                width: 100%; max-height: 40vh; border-radius: 12px; overflow: hidden; 
                background: #000; display:none; border: 1px solid #333;
            }
            video { width: 100%; height: 100%; object-fit: contain; }

            .fp-file-icon-wrapper {
                width: 100px; height: 100px; background: #2a2a2a; border-radius: 20px;
                display: none; align-items: center; justify-content: center;
                font-size: 3rem; color: #fff; border: 1px solid #444;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            .fp-file-info-box { text-align: center; width: 100%; }
            .fp-file-name { color: white; font-weight: 600; margin-bottom: 4px; word-break: break-all; font-size: 1rem;}
            .fp-file-meta { color: #888; font-size: 0.85rem; }

            /* Trimmer UI */
            .fp-trimmer-box {
                width: 100%; padding: 15px; background: #1e1e1e; border-radius: 12px;
                display: none; border: 1px solid #333;
            }
            .fp-trim-label { font-size: 0.8rem; color: #aaa; margin-bottom: 12px; display: flex; justify-content: space-between; }
            .fp-range-wrapper { position: relative; height: 30px; padding: 0 10px; }
            input[type=range] {
                position: absolute; pointer-events: none; -webkit-appearance: none;
                width: calc(100% - 20px); height: 4px; background: transparent; top: 12px; z-index: 5;
            }
            input[type=range]::-webkit-slider-thumb {
                pointer-events: auto; -webkit-appearance: none;
                width: 16px; height: 24px; background: ${THEME_COLOR}; 
                border-radius: 4px; cursor: ew-resize; border: 2px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            }
            .fp-track-bg {
                position: absolute; top: 12px; height: 4px; width: calc(100% - 20px); 
                background: #444; border-radius: 2px;
            }
            .fp-track-fill {
                position: absolute; top: 12px; height: 4px; background: ${THEME_COLOR}; z-index: 2;
            }

            /* Caption Input */
            .fp-caption-box { padding: 15px 20px; border-top: 1px solid #333; background: #121212; }
            .fp-caption-input {
                width: 100%; background: #1e1e1e; border: 1px solid #333; color: white;
                padding: 14px; border-radius: 12px; font-size: 1rem; outline: none; resize: none;
                transition: border-color 0.2s; box-sizing: border-box;
            }
            .fp-caption-input:focus { border-color: ${THEME_COLOR}; }

            /* Footer */
            .fp-footer { padding: 15px 20px; display: flex; gap: 10px; justify-content: flex-end; background: #121212;}
            .fp-btn {
                padding: 12px 24px; border-radius: 30px; font-weight: 600; border: none; cursor: pointer; font-size: 1rem;
                transition: transform 0.1s, opacity 0.2s;
            }
            .fp-btn:active { transform: scale(0.96); }
            .fp-btn-cancel { background: #2a2a2a; color: white; }
            .fp-btn-send { 
                background: ${THEME_COLOR}; color: white; display: flex; align-items: center; gap: 8px; 
                box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3);
            }
            .fp-btn-send:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(0.5); }

            /* Toast Notification */
            .fp-toast {
                position: absolute; top: 70px; left: 50%; transform: translateX(-50%);
                background: rgba(30, 30, 30, 0.95); color: white; padding: 10px 20px;
                border-radius: 30px; font-size: 0.9rem; pointer-events: none;
                opacity: 0; transition: opacity 0.3s; border: 1px solid #444;
                display: flex; align-items: center; gap: 8px; z-index: 60;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .fp-toast.show { opacity: 1; }

            /* Progress Bar */
            .fp-progress-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: transparent; z-index: 100;
            }
            .fp-progress-bar { height: 100%; width: 0%; background: ${THEME_COLOR}; transition: width 0.4s ease-out; box-shadow: 0 0 10px ${THEME_COLOR}; }

            /* Hidden Input */
            #fp-file-input { display: none; }
        </style>

        <input type="file" id="fp-file-input">

        <div id="fp-overlay">
            <div class="fp-card">
                <div class="fp-progress-container"><div class="fp-progress-bar" id="fp-bar"></div></div>
                
                <div class="fp-header">
                    <span id="fp-header-title">Preview File</span>
                    <button class="fp-close-btn" id="fp-close">×</button>
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
                    <input type="text" class="fp-caption-input" id="fp-caption" placeholder="Add a caption...">
                </div>

                <div class="fp-footer">
                    <button class="fp-btn fp-btn-cancel" id="fp-cancel">Cancel</button>
                    <button class="fp-btn fp-btn-send" id="fp-send">
                        <span id="fp-send-text">Send</span>
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
        
        // Input Change
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Close / Cancel Logic
        const closeAction = () => {
            // Check if we pushed history state before going back
            if (history.state && history.state.filePickerOpen) {
                history.back(); // This triggers popstate, which calls close()
            } else {
                this.close(); // Fallback if no history state
            }
        };

        closeBtn.addEventListener('click', closeAction);
        cancelBtn.addEventListener('click', closeAction);
        
        // Mobile Back Button Support
        window.addEventListener('popstate', (event) => {
            if (overlay.classList.contains('open')) {
                this.close();
            }
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if(e.target === overlay) closeAction();
        });

        // Send
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

            // Prevent crossing
            if (s > e - 1) {
                if (isStart) {
                    startRange.value = e - 1;
                    s = e - 1;
                } else {
                    endRange.value = s + 1;
                    e = s + 1;
                }
            }

            this.trimStart = s;
            this.trimEnd = e;
            
            // Snap video to preview trim point
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

        // Detect Type
        const mime = file.type;
        const sizeStr = (file.size / (1024*1024)).toFixed(2) + " MB";
        
        // Set metadata text
        const setMeta = (name, type) => {
            infoText.innerHTML = `
                <div class="fp-file-name">${name}</div>
                <div class="fp-file-meta">${type} • ${sizeStr}</div>
            `;
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
            setMeta(file.name, 'Video File');

        } else if (mime === 'application/pdf') {
            this.fileType = 'pdf';
            title.innerText = 'Send PDF';
            this.showIcon('📄', '#ff3b30');
            setMeta(file.name, 'PDF Document');

        } else if (mime.startsWith('audio/')) {
            this.fileType = 'audio';
            title.innerText = 'Send Audio';
            this.showIcon('🎵', '#00e676');
            setMeta(file.name, 'Audio File');

        } else if (mime.startsWith('image/')) {
            this.fileType = 'image';
            title.innerText = 'Send Image';
            this.showIcon('🖼️', '#ff6600');
            setMeta(file.name, 'Image File');

        } else {
            this.fileType = 'file';
            title.innerText = 'Send File';
            this.showIcon('📁', '#0095f6');
            setMeta(file.name, 'Generic File');
        }

        // Open Overlay & Push History
        overlay.classList.add('open');
        window.history.pushState({ filePickerOpen: true }, document.title);
    }

    showIcon(emoji, color) {
        const wrap = this.querySelector('#fp-icon-wrap');
        const icon = this.querySelector('#fp-type-emoji');
        wrap.style.display = 'flex';
        wrap.style.borderColor = color;
        wrap.style.boxShadow = `0 0 15px ${color}33`; // Glow effect
        icon.innerText = emoji;
    }

    showToast(message) {
        const toast = this.querySelector('#fp-toast');
        toast.querySelector('span').textContent = message;
        toast.classList.add('show');
        
        if(this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    async uploadFile() {
        if (!this.selectedFile || this.isUploading) return;
        
        if (!this.sbClient) {
            this.initSupabaseClient();
            if(!this.sbClient) {
               this.showToast("Connection failed. Check API Keys.");
               return;
            }
        }

        this.isUploading = true;
        const sendBtn = this.querySelector('#fp-send');
        const sendText = this.querySelector('#fp-send-text');
        const bar = this.querySelector('#fp-bar');
        
        sendBtn.disabled = true;
        sendText.innerText = "Uploading...";
        bar.style.width = "30%"; // Fake start progress

        const file = this.selectedFile;
        // Clean filename
        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${cleanName}`;

        try {
            bar.style.width = "60%"; // Fake progress

            const { data, error } = await this.sbClient.storage
                .from(STORAGE_BUCKET)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            bar.style.width = "100%";
            sendText.innerText = "Done!";

            // Get Public URL
            const { data: publicData } = this.sbClient.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(fileName);

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

            // Dispatch Event
            this.dispatchEvent(new CustomEvent('file-uploaded', {
                detail: {
                    url: downloadUrl,
                    metadata: metadata
                },
                bubbles: true,
                composed: true
            }));

            // Short delay to show 100% bar before closing
            setTimeout(() => {
                this.close();
            }, 500);

        } catch (error) {
            console.error('Upload error:', error);
            this.showToast("Upload failed: " + error.message);
            sendText.innerText = "Retry";
            bar.style.width = "0%";
            sendBtn.disabled = false;
        } finally {
            if(!sendBtn.disabled) this.isUploading = false;
        }
    }

    openPicker() {
        this.querySelector('#fp-file-input').click();
    }

    close() {
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

customElements.define('file-picker', FilePicker);
