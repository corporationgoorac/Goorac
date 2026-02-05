class FilePicker extends HTMLElement {
    constructor() {
        super();
        
        // Load credentials from global CONFIG object
        if (typeof CONFIG !== 'undefined') {
            this.supabaseUrl = CONFIG.supabaseUrl;
            this.supabaseKey = CONFIG.supabaseKey;
        } else {
            console.error("CONFIG is not defined. Please load config.js");
            this.supabaseUrl = "";
            this.supabaseKey = "";
        }
        
        this.selectedFile = null;
        this.fileType = null; // 'video', 'image', 'pdf', 'audio', 'file'
        this.isUploading = false;
        
        // Video Trimming State
        this.videoDuration = 0;
        this.trimStart = 0;
        this.trimEnd = 0;
    }

    connectedCallback() {
        this.ensureSupabase();
        this.render();
        this.setupEvents();
    }

    ensureSupabase() {
        if (!window.supabase) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            document.head.appendChild(script);
            script.onload = () => {
                if(this.supabaseUrl && this.supabaseKey) {
                    this.sbClient = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
                }
            };
        } else if(this.supabaseUrl && this.supabaseKey) {
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
                width: 100%; max-width: 500px; height: 85vh;
                background: #1c1c1c; 
                border-top-left-radius: 20px; border-top-right-radius: 20px;
                display: flex; flex-direction: column; overflow: hidden;
                box-shadow: 0 -5px 30px rgba(0,0,0,0.5);
                border: 1px solid #333;
            }

            /* Header */
            .fp-header {
                padding: 15px 20px; border-bottom: 1px solid #333;
                display: flex; justify-content: space-between; align-items: center;
                color: white; font-weight: 600; font-size: 1.1rem;
            }
            .fp-close-btn { background: none; border: none; color: #aaa; font-size: 1.5rem; cursor: pointer; }

            /* Preview Area */
            .fp-preview-container {
                flex: 1; padding: 20px; overflow-y: auto;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                position: relative;
            }

            /* Media Types UI */
            .fp-video-wrapper { width: 100%; max-height: 40vh; border-radius: 12px; overflow: hidden; background: #000; display:none;}
            video { width: 100%; height: 100%; object-fit: contain; }

            .fp-file-icon-wrapper {
                width: 120px; height: 120px; background: #2a2a2a; border-radius: 20px;
                display: none; align-items: center; justify-content: center; margin-bottom: 15px;
                font-size: 3rem; color: #fff; border: 1px solid #444;
            }
            .fp-file-info { color: #ccc; text-align: center; font-size: 0.9rem; margin-top: 10px;}
            .fp-file-name { color: white; font-weight: 600; margin-bottom: 4px; word-break: break-all; }

            /* Trimmer UI */
            .fp-trimmer-box {
                width: 100%; padding: 15px; background: #262626; border-radius: 12px;
                margin-top: 15px; display: none;
            }
            .fp-trim-label { font-size: 0.8rem; color: #aaa; margin-bottom: 8px; display: flex; justify-content: space-between; }
            .fp-range-wrapper { position: relative; height: 30px; }
            input[type=range] {
                position: absolute; pointer-events: none; -webkit-appearance: none;
                width: 100%; height: 6px; background: transparent; top: 12px; z-index: 5;
            }
            input[type=range]::-webkit-slider-thumb {
                pointer-events: auto; -webkit-appearance: none;
                width: 16px; height: 24px; background: #0095f6; border-radius: 4px; cursor: ew-resize; border: 2px solid white;
            }
            .fp-track-bg {
                position: absolute; top: 12px; height: 6px; width: 100%; background: #444; border-radius: 3px;
            }
            .fp-track-fill {
                position: absolute; top: 12px; height: 6px; background: #0095f6; z-index: 2;
            }

            /* Caption Input */
            .fp-caption-box { padding: 15px 20px; border-top: 1px solid #333; background: #1c1c1c; }
            .fp-caption-input {
                width: 100%; background: #2a2a2a; border: 1px solid #333; color: white;
                padding: 12px; border-radius: 12px; font-size: 1rem; outline: none; resize: none;
            }

            /* Footer */
            .fp-footer { padding: 15px 20px; display: flex; gap: 10px; justify-content: flex-end; }
            .fp-btn {
                padding: 12px 24px; border-radius: 30px; font-weight: 600; border: none; cursor: pointer; font-size: 1rem;
            }
            .fp-btn-cancel { background: #2a2a2a; color: white; }
            .fp-btn-send { background: #0095f6; color: white; display: flex; align-items: center; gap: 8px; }
            .fp-btn-send:disabled { opacity: 0.5; cursor: not-allowed; }

            /* Progress Bar */
            .fp-progress-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: transparent; z-index: 100;
            }
            .fp-progress-bar { height: 100%; width: 0%; background: #00e676; transition: width 0.2s; }

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

                <div class="fp-preview-container">
                    
                    <div class="fp-video-wrapper" id="fp-vid-wrap">
                        <video id="fp-video-el" controls playsinline></video>
                    </div>

                    <div class="fp-file-icon-wrapper" id="fp-icon-wrap">
                        <span id="fp-type-emoji">📄</span>
                    </div>

                    <div class="fp-file-info" id="fp-info-text"></div>

                    <div class="fp-trimmer-box" id="fp-trimmer">
                        <div class="fp-trim-label">
                            <span>Trim Video</span>
                            <span id="fp-time-display">00:00 - 00:00</span>
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

        // Close / Cancel
        const closeAction = () => this.close();
        closeBtn.addEventListener('click', closeAction);
        cancelBtn.addEventListener('click', closeAction);
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
            this.videoDuration = video.duration;
            this.trimStart = 0;
            this.trimEnd = video.duration;
            
            startRange.max = video.duration;
            endRange.max = video.duration;
            endRange.value = video.duration;
            
            this.updateTrimmerUI();
        });

        const handleTrim = (isStart) => {
            let s = parseFloat(startRange.value);
            let e = parseFloat(endRange.value);

            if (s > e - 1) {
                if (isStart) startRange.value = e - 1;
                else endRange.value = s + 1;
            }

            this.trimStart = parseFloat(startRange.value);
            this.trimEnd = parseFloat(endRange.value);
            
            // Snap video to changed time
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

        if (mime.startsWith('video/')) {
            this.fileType = 'video';
            title.innerText = 'Send Video';
            const vidWrap = this.querySelector('#fp-vid-wrap');
            const video = this.querySelector('#fp-video-el');
            const trimmer = this.querySelector('#fp-trimmer');
            
            vidWrap.style.display = 'block';
            trimmer.style.display = 'block';
            video.src = URL.createObjectURL(file);
            infoText.innerHTML = `<div class="fp-file-name">${file.name}</div>${sizeStr}`;

        } else if (mime === 'application/pdf') {
            this.fileType = 'pdf';
            title.innerText = 'Send PDF';
            this.showIcon('📄', '#ff3b30');
            infoText.innerHTML = `<div class="fp-file-name">${file.name}</div>PDF Document • ${sizeStr}`;

        } else if (mime.startsWith('audio/')) {
            this.fileType = 'audio';
            title.innerText = 'Send Audio';
            this.showIcon('🎵', '#00e676');
            infoText.innerHTML = `<div class="fp-file-name">${file.name}</div>Audio File • ${sizeStr}`;

        } else {
            this.fileType = 'file';
            title.innerText = 'Send File';
            this.showIcon('📁', '#0095f6');
            infoText.innerHTML = `<div class="fp-file-name">${file.name}</div>${sizeStr}`;
        }

        overlay.classList.add('open');
    }

    showIcon(emoji, color) {
        const wrap = this.querySelector('#fp-icon-wrap');
        const icon = this.querySelector('#fp-type-emoji');
        wrap.style.display = 'flex';
        wrap.style.borderColor = color;
        icon.innerText = emoji;
    }

    async uploadFile() {
        if (!this.selectedFile || this.isUploading) return;
        
        if (!this.sbClient) {
            alert("Database connection initializing... try again in a second.");
            this.ensureSupabase();
            return;
        }

        this.isUploading = true;
        const sendBtn = this.querySelector('#fp-send');
        const sendText = this.querySelector('#fp-send-text');
        const bar = this.querySelector('#fp-bar');
        
        sendBtn.disabled = true;
        sendText.innerText = "Uploading...";

        const file = this.selectedFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`;

        try {
            const { data, error } = await this.sbClient.storage
                .from('public-files')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            bar.style.width = "100%";

            const { data: publicData } = this.sbClient.storage
                .from('public-files')
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

            this.dispatchEvent(new CustomEvent('file-uploaded', {
                detail: {
                    url: downloadUrl,
                    metadata: metadata
                },
                bubbles: true,
                composed: true
            }));

            this.close();

        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
            sendText.innerText = "Retry";
            bar.style.width = "0%";
        } finally {
            this.isUploading = false;
            sendBtn.disabled = false;
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
        
        const video = this.querySelector('#fp-video-el');
        video.pause();
        video.src = "";
    }
}

customElements.define('file-picker', FilePicker);
