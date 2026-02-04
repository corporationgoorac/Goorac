class ViewMedia extends HTMLElement {
    constructor() {
        super();
        this.mediaUrl = null;
        this.mediaType = 'image'; 
        
        // Interaction State
        this.startY = 0;
        this.currentY = 0;
        this.isDragging = false;
        this.lastTap = 0;
        this.isZoomed = false;
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
    }

    render() {
        this.innerHTML = `
        <style>
            :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

            /* --- FULL SCREEN OVERLAY --- */
            .vm-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #000; z-index: 100000; 
                display: none; flex-direction: column;
                opacity: 0; transition: opacity 0.25s ease-in-out;
            }
            .vm-overlay.open { display: flex; opacity: 1; }
            /* When dragging to close, background fades */
            .vm-overlay.fading { transition: background 0.1s; background: rgba(0,0,0,0.5); }

            /* --- HEADER --- */
            .vm-header {
                position: absolute; top: 0; left: 0; width: 100%;
                padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;
                z-index: 20;
                background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
                pointer-events: none; 
                padding-top: max(15px, env(safe-area-inset-top));
            }
            .vm-header-actions { display: flex; gap: 15px; pointer-events: auto; }
            .vm-header button { pointer-events: auto; }

            .vm-btn {
                background: rgba(255,255,255,0.1); border: none; color: white;
                width: 44px; height: 44px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; backdrop-filter: blur(10px);
                transition: background 0.2s, transform 0.1s;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .vm-btn:active { background: rgba(255,255,255,0.3); transform: scale(0.9); }
            .vm-btn svg { width: 22px; height: 22px; fill: white; }

            /* --- CONTENT AREA --- */
            .vm-content {
                flex: 1; display: flex; justify-content: center; align-items: center;
                width: 100%; height: 100%; overflow: hidden;
                position: relative;
            }
            
            .vm-media {
                max-width: 100%; max-height: 100%;
                object-fit: contain;
                transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: transform, opacity;
            }
            
            .vm-media.zoomed { transform: scale(2); cursor: zoom-out; }

            /* --- LOADING SPINNER --- */
            .vm-loader {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.2);
                border-top-color: white; border-radius: 50%;
                animation: vm-spin 0.8s linear infinite; z-index: 5;
                display: none;
            }
            @keyframes vm-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

        </style>
        
        <div class="vm-overlay" id="vm-overlay">
            <div class="vm-header">
                <button class="vm-btn" id="vm-back">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                
                <div class="vm-header-actions">
                     <button class="vm-btn" id="vm-share">
                        <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                    </button>
                    <button class="vm-btn" id="vm-save">
                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    </button>
                </div>
            </div>

            <div class="vm-content" id="vm-container">
                <div class="vm-loader" id="vm-loader"></div>
                </div>
        </div>
        `;
    }

    setupEvents() {
        const overlay = this.querySelector('#vm-overlay');
        const backBtn = this.querySelector('#vm-back');
        const saveBtn = this.querySelector('#vm-save');
        const shareBtn = this.querySelector('#vm-share');
        const container = this.querySelector('#vm-container');

        backBtn.onclick = () => this.close();
        saveBtn.onclick = () => this.downloadMedia();
        shareBtn.onclick = () => this.shareMedia();

        window.addEventListener('popstate', (e) => {
            if (overlay.classList.contains('open')) this.close(true);
        });

        // --- GESTURES: Swipe to Close & Double Tap ---
        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: true});
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Double Click for Desktop
        container.addEventListener('dblclick', (e) => this.toggleZoom(e));
    }

    handleTouchStart(e) {
        if (e.touches.length > 1) return; // Ignore multi-touch (pinch)
        
        const now = new Date().getTime();
        const timeDiff = now - this.lastTap;
        
        if (timeDiff < 300 && timeDiff > 0) {
            // Double Tap Detected
            this.toggleZoom(e);
            this.lastTap = 0;
            return;
        }
        this.lastTap = now;

        if (this.isZoomed) return; // Disable swipe when zoomed

        this.startY = e.touches[0].clientY;
        this.isDragging = true;
        
        const media = this.querySelector('.vm-media');
        if(media) media.style.transition = 'none'; // Remove transition for instant drag
    }

    handleTouchMove(e) {
        if (!this.isDragging || this.isZoomed) return;
        
        this.currentY = e.touches[0].clientY;
        const deltaY = this.currentY - this.startY;

        const media = this.querySelector('.vm-media');
        const overlay = this.querySelector('#vm-overlay');
        
        if (media) {
            e.preventDefault(); // Prevent scrolling bg
            media.style.transform = `translateY(${deltaY}px) scale(${1 - Math.abs(deltaY)/1000})`;
            
            // Fade background based on distance
            const opacity = Math.max(0, 1 - Math.abs(deltaY) / 500);
            overlay.style.backgroundColor = `rgba(0,0,0,${opacity})`;
        }
    }

    handleTouchEnd(e) {
        if (!this.isDragging || this.isZoomed) return;
        this.isDragging = false;

        const deltaY = this.currentY - this.startY;
        const media = this.querySelector('.vm-media');
        const overlay = this.querySelector('#vm-overlay');

        if (Math.abs(deltaY) > 100) {
            // Swipe threshold met -> Close
            this.close();
        } else if (media) {
            // Snap back
            media.style.transition = 'transform 0.3s ease';
            media.style.transform = 'translateY(0) scale(1)';
            overlay.style.backgroundColor = '#000';
        }
    }

    toggleZoom(e) {
        if (this.mediaType === 'video') return; // Don't zoom videos
        const media = this.querySelector('.vm-media');
        if (!media) return;

        this.isZoomed = !this.isZoomed;
        
        if (this.isZoomed) {
            media.style.transform = "scale(2)";
            media.style.cursor = "zoom-out";
            // Simple zoom logic: Just scale center. 
            // Full pinch-zoom requires complex matrix math usually handled by libraries (Panzoom/Hammer.js)
        } else {
            media.style.transform = "scale(1)";
            media.style.cursor = "default";
        }
    }

    open(url, type = null) {
        if (!url) return;
        this.mediaUrl = url;
        
        if (!type) {
            const ext = url.split('.').pop().split('?')[0].toLowerCase();
            type = ['mp4', 'webm', 'ogg', 'mov'].includes(ext) ? 'video' : 'image';
        }
        this.mediaType = type;

        const container = this.querySelector('#vm-container');
        const loader = this.querySelector('#vm-loader');
        
        // Remove old media but keep loader
        const oldMedia = container.querySelector('.vm-media');
        if(oldMedia) oldMedia.remove();

        loader.style.display = 'block';

        let mediaEl;
        if (type === 'video') {
            mediaEl = document.createElement('video');
            mediaEl.controls = true;
            mediaEl.playsInline = true;
            mediaEl.autoplay = true;
            mediaEl.loop = true; // Loop short videos
            mediaEl.onloadeddata = () => loader.style.display = 'none';
        } else {
            mediaEl = document.createElement('img');
            mediaEl.onload = () => loader.style.display = 'none';
        }
        
        mediaEl.src = url;
        mediaEl.className = 'vm-media';
        container.appendChild(mediaEl);

        const overlay = this.querySelector('#vm-overlay');
        overlay.classList.add('open');
        overlay.style.backgroundColor = '#000'; // Reset opacity from any previous swipe
        
        window.history.pushState({ mediaViewerOpen: true }, document.title);
        
        // Reset State
        this.isZoomed = false;
        this.startY = 0;
    }

    close(fromHistory = false) {
        const overlay = this.querySelector('#vm-overlay');
        overlay.classList.remove('open');
        
        const video = this.querySelector('video');
        if (video) video.pause();

        if (!fromHistory && history.state && history.state.mediaViewerOpen) {
            history.back();
        }

        setTimeout(() => {
            const media = this.querySelector('.vm-media');
            if(media) media.style.transform = ''; // Reset transform
        }, 300);
    }

    async downloadMedia() {
        if (!this.mediaUrl) return;
        const saveBtn = this.querySelector('#vm-save');
        const originalHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<div style="width:16px; height:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:vm-spin 1s linear infinite;"></div>';
        
        try {
            const response = await fetch(this.mediaUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `goorac_${Date.now()}.${this.mediaType === 'video' ? 'mp4' : 'jpg'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            if(navigator.vibrate) navigator.vibrate(50);
        } catch (e) { alert("Download failed"); } 
        finally { saveBtn.innerHTML = originalHtml; }
    }

    async shareMedia() {
        if (!navigator.share) {
            alert("Sharing not supported on this browser");
            return;
        }
        try {
            // Attempt to share File if possible (better experience)
            const response = await fetch(this.mediaUrl);
            const blob = await response.blob();
            const file = new File([blob], `share.${this.mediaType==='video'?'mp4':'jpg'}`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Check this out on Goorac'
                });
            } else {
                // Fallback to URL sharing
                await navigator.share({
                    title: 'Check this out on Goorac',
                    url: this.mediaUrl
                });
            }
        } catch (e) {
            console.log("Share aborted or failed", e);
        }
    }
}

customElements.define('view-media', ViewMedia);
