/**
 * =======================================================
 * GOORAC QUANTUM - VIEW NOTES ENGINE v3.0
 * Handles: Viewer Modal, Swipe Logic, Audio, Feed & Privacy
 * =======================================================
 */

class ViewNotes extends HTMLElement {
    constructor() {
        super();
        this.currentNote = null;
        this.currentUserProfile = null;
        this.isOwnNote = false;
        
        // Dedicated audio player
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
        this.audioPlayer.volume = 1.0; 
        
        this.db = null; 
        this.unsubscribe = null;

        // Physics-based Swipe State
        this.swipeState = {
            isDragging: false,
            startY: 0,
            currentY: 0,
            startTime: 0,
            velocityY: 0,
            sheetHeight: 0
        };
        
        this.lastTap = 0;
    }

    connectedCallback() {
        if (window.firebase && !this.db) {
            this.db = firebase.firestore();
        }
        this.render();
        this.setupEventListeners();
        this.setupSwipeLogic();
    }

    disconnectedCallback() {
        if (this.unsubscribe) this.unsubscribe();
        this.audioPlayer.pause();
    }

    // --- UTILITIES ---

    getRelativeTime(timestamp) {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    }

    // Determine if text should be Black or White based on BG brightness
    getContrastColor(hexColor) {
        if(!hexColor || hexColor.includes('gradient') || hexColor.includes('url')) return 'light';
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'dark' : 'light';
    }

    getIcons() {
        return {
            heartEmpty: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            heartFilled: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#ff3b30" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            send: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0095f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
            verified: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#0095f6"><path d="M22.5 12.5l-2.5 2.5 0.5 3.5-3.5 0.5-2.5 2.5-3-1.5-3 1.5-2.5-2.5-3.5-0.5 0.5-3.5-2.5-2.5 2.5-2.5-0.5-3.5 3.5-0.5 2.5-2.5 3 1.5 3-1.5 2.5 2.5 3.5 0.5-0.5 3.5z"></path><path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4z" fill="white"></path></svg>`,
            star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#00ba7c"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
            expand: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`
        };
    }

    // --- DOM STRUCTURE ---

    render() {
        const icons = this.getIcons();
        this.innerHTML = `
        <style>
            /* BACKDROP */
            .vn-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.01); /* Start transparent */
                display: none; z-index: 2000;
                justify-content: center; align-items: flex-end;
                transition: background 0.4s ease;
                touch-action: none;
            }
            .vn-overlay.open { 
                display: flex; 
                background: rgba(0,0,0,0.6); 
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }
            
            /* MODAL SHEET */
            .vn-sheet {
                background: #101010; width: 100%; max-width: 500px;
                border-radius: 32px 32px 0 0; 
                transform: translateY(100%); 
                transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                color: white; font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
                
                /* MOBILE DIMENSIONS */
                position: absolute; bottom: 0; left: 0; right: 0; margin: 0 auto;
                height: 85dvh; 
                max-height: 850px;
                
                border-top: 1px solid rgba(255,255,255,0.08);
                display: flex; flex-direction: column;
                overflow: hidden;
                box-shadow: 0 -10px 50px rgba(0,0,0,0.6);
                will-change: transform;
            }
            .vn-overlay.open .vn-sheet { transform: translateY(0); }
            
            /* Desktop Adjustment */
            @media (min-width: 768px) {
                .vn-sheet {
                    height: 80%; border-radius: 24px; position: relative;
                    margin-bottom: 20px; overflow: hidden;
                }
            }

            /* BACKGROUND VISUALS */
            .vn-bg-layer { position: absolute; inset: 0; z-index: 0; background-size: cover; background-position: center; transition: background 0.4s ease; opacity: 0.5; }
            .vn-texture {
                position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0;
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
            }
            .vn-texture.visible { opacity: 0.12; }
            .vn-grid {
                position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.04;
                background-size: 30px 30px;
                background-image: radial-gradient(circle, #ffffff 1px, transparent 1px);
            }

            /* HEADER & CONTROLS */
            .vn-header {
                position: absolute; top: 0; left: 0; width: 100%;
                height: 60px;
                display: flex; justify-content: center; align-items: center;
                z-index: 20;
                touch-action: none; /* Crucial for drag */
            }
            
            .vn-drag-handle { 
                width: 40px; height: 4px; background: rgba(255,255,255,0.3); 
                border-radius: 10px; cursor: grab;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }

            .vn-close-btn {
                position: absolute; right: 15px; top: 15px;
                width: 34px; height: 34px; border-radius: 50%;
                background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
                display: flex; align-items: center; justify-content: center;
                color: #fff; cursor: pointer; border: 1px solid rgba(255,255,255,0.08);
                transition: background 0.2s;
            }
            .vn-close-btn:active { background: rgba(255,255,255,0.2); }

            /* MAIN CONTENT LAYOUT */
            .vn-content {
                flex: 1; display: flex; flex-direction: column;
                justify-content: center; align-items: center;
                position: relative; z-index: 5;
                padding-bottom: 20px; width: 100%;
            }

            /* PROFILE SECTION */
            .vn-profile-header {
                display: flex; align-items: center; gap: 12px; margin-bottom: 30px;
                position: absolute; top: 60px; left: 20px; z-index: 10;
                cursor: pointer;
            }
            .vn-friend-pfp {
                width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
                border: 2px solid rgba(255,255,255,0.15); background: #222;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            }
            .vn-friend-info { display: flex; flex-direction: column; justify-content: center; }
            
            /* Dynamic Text Colors */
            .vn-text-dark { color: #000 !important; text-shadow: none !important; }
            .vn-text-light { color: #fff !important; text-shadow: 0 2px 4px rgba(0,0,0,0.3) !important; }

            .vn-friend-name { font-weight: 800; font-size: 1.05rem; display: flex; align-items: center; gap: 5px; }
            .vn-friend-handle { font-size: 0.85rem; opacity: 0.7; font-weight: 500; }

            /* BUBBLE & SONG CONTAINER */
            .vn-bubble-container {
                display: flex; flex-direction: column; align-items: center; gap: 15px;
                width: 85%; max-width: 340px; position: relative;
            }

            /* THE BUBBLE */
            .vn-bubble {
                width: 100%; aspect-ratio: 1/1;
                border-radius: 42px;
                display: flex; align-items: center; justify-content: center;
                text-align: center; padding: 30px;
                position: relative; z-index: 2;
                box-shadow: 0 20px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.1);
                transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                overflow: hidden;
            }
            .vn-bubble.pump { transform: scale(0.95); }
            
            /* Glassmorphism */
            .vn-bubble.glass {
                background: rgba(255, 255, 255, 0.1) !important;
                backdrop-filter: blur(25px) !important;
                -webkit-backdrop-filter: blur(25px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                box-shadow: 0 15px 40px rgba(0,0,0,0.15) !important;
            }

            /* Note Text */
            .vn-note-text { 
                font-size: 1.7rem; font-weight: 700; line-height: 1.3; z-index: 2;
                word-break: break-word; width: 100%;
            }
            .fx-glow { text-shadow: 0 0 15px currentColor; }
            .fx-shadow { text-shadow: 3px 3px 0px rgba(0,0,0,0.6); }

            /* Heart Animation */
            .vn-pop-heart {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                opacity: 0; pointer-events: none; z-index: 10;
            }
            .vn-pop-heart.animate { animation: popHeart 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            @keyframes popHeart {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.8); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
            }

            /* SONG PILL - Placed below bubble to avoid overlap */
            .vn-music-pill { 
                display: inline-flex; align-items: center; gap: 8px; 
                background: rgba(20, 20, 20, 0.7); padding: 8px 18px; 
                border-radius: 100px; font-size: 0.8rem; font-weight: 600;
                border: 1px solid rgba(255,255,255,0.15);
                backdrop-filter: blur(10px); color: #fff; z-index: 10;
                width: max-content; max-width: 100%;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .vn-eq span { display: inline-block; width: 3px; height: 12px; background: #00d2ff; animation: vn-eq 1s infinite; margin-right: 1px; border-radius: 2px; }
            .vn-eq span:nth-child(2) { animation-delay: 0.15s; } 
            .vn-eq span:nth-child(3) { animation-delay: 0.3s; } 
            @keyframes vn-eq { 0%, 100% { height: 40%; } 50% { height: 100%; } }

            .vn-timestamp { 
                font-size: 0.75rem; text-align: center; 
                margin-top: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
                opacity: 0.6;
            }

            /* FOOTER (Actions) */
            .vn-footer {
                padding: 10px 15px calc(25px + env(safe-area-inset-bottom));
                position: relative; z-index: 10;
                background: linear-gradient(to top, rgba(0,0,0,0.95) 20%, transparent);
            }
            
            .vn-emoji-bar {
                display: flex; justify-content: space-between; margin-bottom: 12px; padding: 0 10px;
            }
            .vn-quick-emoji {
                font-size: 2.4rem; cursor: pointer; transition: transform 0.2s;
                user-select: none; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            }
            .vn-quick-emoji:active { transform: scale(1.3); }

            .vn-interaction-bar { 
                display: flex; align-items: center; gap: 10px; 
                background: rgba(35, 35, 35, 0.95); backdrop-filter: blur(25px);
                padding: 6px 6px 6px 18px; border-radius: 35px;
                border: 1px solid rgba(255,255,255,0.12);
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            }
            .vn-reply-input { 
                flex: 1; background: none; border: none; color: white; 
                font-size: 1rem; padding: 10px 0; outline: none; font-weight: 500;
            }
            .vn-reply-input::placeholder { color: #777; font-weight: 400; }
            
            .vn-send-btn {
                background: #00d2ff; border: none; padding: 10px; cursor: pointer; display: none;
                align-items: center; justify-content: center; border-radius: 50%; color: #000;
            }
            .vn-send-btn.visible { display: flex; animation: fadeIn 0.2s ease; }

            .vn-heart-btn { 
                background: transparent; border: none; cursor: pointer; 
                width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; 
                transition: transform 0.1s; color: #888;
            }
            .vn-heart-btn:active { transform: scale(0.8); }

            /* OWN NOTE BUTTONS */
            .vn-likers-section { 
                margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); 
                padding: 20px 20px calc(30px + env(safe-area-inset-bottom));
                background: rgba(18,18,18,0.98); 
                max-height: 45vh; overflow-y: auto; 
            }
            .vn-liker-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
            
            .vn-btn { width: 100%; padding: 16px; border-radius: 18px; border: none; font-weight: 700; font-size: 1rem; cursor: pointer; margin-top: 10px; transition: transform 0.1s; }
            .vn-btn:active { transform: scale(0.98); }
            .vn-btn-primary { background: #fff; color: #000; }
            .vn-btn-danger { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }
            .vn-btn-archive { background: rgba(255, 159, 10, 0.15); color: #ff9f0a; }

            @keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        </style>

        <div class="vn-overlay" id="vn-overlay">
            <div class="vn-sheet" id="vn-sheet">
                
                <div class="vn-bg-layer" id="bg-layer"></div>
                <div class="vn-texture" id="tex-layer"></div>
                <div class="vn-grid"></div>

                <div class="vn-header" id="vn-drag-target">
                    <div class="vn-drag-handle"></div>
                    <div class="vn-close-btn" id="btn-close">${icons.expand}</div>
                </div>

                <div id="vn-content" style="display:contents;"></div>

            </div>
        </div>
        `;
    }

    // --- INTERACTION LOGIC ---

    setupEventListeners() {
        this.querySelector('#btn-close').onclick = () => this.close();
        this.querySelector('#vn-overlay').onclick = (e) => {
            if (e.target.id === 'vn-overlay') this.close();
        };

        window.addEventListener('popstate', (event) => {
            const overlay = this.querySelector('#vn-overlay');
            if (overlay && overlay.classList.contains('open')) {
                this.close(true);
            }
        });
    }

    setupSwipeLogic() {
        const sheet = this.querySelector('#vn-sheet');
        const header = this.querySelector('.vn-header');
        
        // Only allow dragging from header/top area to prevent conflict with content
        const dragTarget = header; 

        dragTarget.addEventListener('touchstart', (e) => {
            this.swipeState.isDragging = true;
            this.swipeState.startY = e.touches[0].clientY;
            this.swipeState.startTime = Date.now();
            sheet.style.transition = 'none'; // Instant follow
        }, {passive: true});

        dragTarget.addEventListener('touchmove', (e) => {
            if (!this.swipeState.isDragging) return;
            
            this.swipeState.currentY = e.touches[0].clientY;
            const delta = this.swipeState.currentY - this.swipeState.startY;
            
            // Only allow dragging DOWN
            if (delta > 0) {
                // 1:1 Movement - No resistance feels smoother for sheets
                sheet.style.transform = `translateY(${delta}px)`;
            }
        }, {passive: false});

        dragTarget.addEventListener('touchend', (e) => {
            if (!this.swipeState.isDragging) return;
            this.swipeState.isDragging = false;
            
            const delta = this.state.currentY - this.state.startY;
            const time = Date.now() - this.swipeState.startTime;
            const velocity = Math.abs(delta / time); // Calculate speed

            sheet.style.transition = 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)';
            
            // Close if dragged far OR flicked fast
            if (delta > 150 || (velocity > 0.5 && delta > 50)) {
                this.close();
            } else {
                sheet.style.transform = `translateY(0)`; // Snap back
            }
        });
    }

    // --- MAIN OPEN FUNCTION ---

    async open(initialNoteData, isOwnNote = false) {
        if (!this.db && window.firebase) this.db = firebase.firestore();
        if (!this.db) {
            console.error("Firebase not initialized yet.");
            return;
        }

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        // Reset Audio
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;

        this.isOwnNote = isOwnNote;
        this.currentNote = initialNoteData;
        this.currentUserProfile = null;
        
        this.renderContent(); // Initial render with passed data

        // Animate In
        const overlay = this.querySelector('#vn-overlay');
        overlay.classList.add('open');
        window.history.pushState({ vnOpen: true }, "", "#view-note");
        if(navigator.vibrate) navigator.vibrate(15);
        
        // Hide Main Navbar
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        // Play Audio if present
        if (initialNoteData && initialNoteData.songPreview) {
            this.audioPlayer.src = initialNoteData.songPreview;
            this.audioPlayer.play().catch(err => console.log("Auto-play limited"));
        }

        // Fetch Extended Profile Data
        if(initialNoteData.uid) {
            this.db.collection('users').doc(initialNoteData.uid).get().then(doc => {
                if(doc.exists) {
                    this.currentUserProfile = doc.data();
                    this.renderContent(); // Re-render to show updated pfp/name
                }
            });
        }

        // Live Listener for Likes/Updates
        if (initialNoteData.id) {
            this.unsubscribe = this.db.collection("notes").doc(initialNoteData.id)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        this.currentNote = { ...data, id: doc.id };
                        
                        // Handle Song Change
                        if (data.songPreview && this.audioPlayer.src !== data.songPreview) {
                             this.audioPlayer.src = data.songPreview;
                             this.audioPlayer.play().catch(()=>{});
                        }
                        
                        this.renderContent();
                    } else {
                        this.close(); // Close if note deleted
                    }
                });
        }
    }

    renderContent() {
        const root = this;
        const content = this.querySelector('#vn-content');
        const note = this.currentNote;
        
        if (!note) return;

        // 1. SET BACKGROUNDS
        const bgStyle = note.bgStyle || note.bgColor || '#000'; 
        root.querySelector('#bg-layer').style.background = bgStyle;

        // Texture Toggle
        const texLayer = root.querySelector('#tex-layer');
        if (note.bgTexture) texLayer.classList.add('visible');
        else texLayer.classList.remove('visible');

        // Text Contrast Logic (Black vs White)
        const contrastMode = this.getContrastColor(note.bgColor || '#000');
        const textColorClass = contrastMode === 'dark' ? 'vn-text-dark' : 'vn-text-light';

        // Render specific view
        content.innerHTML = this.isOwnNote 
            ? this.getOwnNoteHTML(note, textColorClass) 
            : this.getFriendNoteHTML(note, textColorClass);
        
        this.attachDynamicListeners();
    }

    getTextShadow(color) {
        if (color === '#000000' || color === '#000') return '0 1px 15px rgba(255,255,255,0.4)';
        return '0 2px 10px rgba(0,0,0,0.3)';
    }

    getOwnNoteHTML(note, textClass) {
        const timeAgo = this.getRelativeTime(note.createdAt);
        const icons = this.getIcons();
        
        const displayPfp = note.pfp || this.currentUserProfile?.photoURL || 'https://via.placeholder.com/85';
        const displayName = note.username || this.currentUserProfile?.name || 'You';
        const isVerified = note.verified || this.currentUserProfile?.verified; 
        const isCF = note.audience === 'close_friends';

        const textAlign = note.textAlign || 'center';
        const alignItems = textAlign === 'left' ? 'flex-start' : 'center';
        
        const bgColor = note.bgColor || '#262626';
        const txtColor = note.textColor || '#fff';
        const textShadow = this.getTextShadow(txtColor);
        
        const effectClass = (note.effect && note.effect !== 'none') ? `fx-${note.effect}` : '';
        const glassClass = note.isGlass ? 'glass' : '';

        return `
            <div class="vn-content">
                <div class="vn-profile-header vn-clickable" id="vn-header-click">
                    <img src="${displayPfp}" class="vn-friend-pfp">
                    <div class="vn-friend-info">
                        <div class="vn-friend-name ${textClass}">
                            ${displayName} (You)
                            ${isVerified ? icons.verified : ''}
                            ${isCF ? icons.star : ''}
                        </div>
                        <div class="vn-friend-handle ${textClass}">${note.isActive ? 'Active Note' : 'Archived'}</div>
                    </div>
                </div>

                <div class="vn-bubble-container">
                    <div class="vn-bubble ${glassClass}" style="background:${bgColor}; color:${txtColor}; align-items:${alignItems};">
                        <div class="vn-note-text ${effectClass}" style="text-align:${textAlign}; font-family:${note.font}; text-shadow:${textShadow};">${note.text || '...'}</div>
                    </div>
                    
                    ${note.songName ? `
                        <div class="vn-music-pill">
                            <div class="vn-eq"><span></span><span></span><span></span></div>
                            <span>${note.songName}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="vn-timestamp ${textClass}">${timeAgo}</div>
            </div>

            <div class="vn-likers-section">
                <div style="font-weight:700; font-size:0.9rem; margin-bottom:15px; color:#aaa; display:flex; justify-content:space-between;">
                    Activity <span>${(note.likes||[]).length}</span>
                </div>
                ${note.likes && note.likes.length > 0 ? note.likes.map(liker => `
                    <div class="vn-liker-item">
                        <div style="display:flex; align-items:center; gap:10px; color:#fff;">
                            <img src="${liker.photoURL || 'https://via.placeholder.com/44'}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                            <span style="font-weight:600; display:flex; align-items:center; gap:4px; font-size:0.9rem;">
                                ${liker.displayName || 'User'}
                                ${liker.verified ? icons.verified : ''}
                            </span>
                        </div>
                        <span style="color:#ff3b30;">${icons.heartFilled}</span>
                    </div>
                `).join('') : `<div style="text-align:center; color:#555; padding:20px;">No likes yet</div>`}
                
                ${note.isActive ? 
                    `<button class="vn-btn vn-btn-primary" id="vn-leave-new-note">Update Note 📝</button>` : 
                    `<button class="vn-btn vn-btn-primary" id="vn-leave-new-note">Post New Note 📝</button>`
                }
                <div style="display:flex; gap:10px;">
                    ${note.isActive ? `<button class="vn-btn vn-btn-archive" id="archive-note-btn">Archive</button>` : ''}
                    <button class="vn-btn vn-btn-danger" id="delete-forever-btn">Delete</button>
                </div>
            </div>
        `;
    }

    getFriendNoteHTML(note, textClass) {
        const user = firebase.auth()?.currentUser;
        const isLiked = note.likes?.some(l => l.uid === user?.uid);
        const timeAgo = this.getRelativeTime(note.createdAt);
        const icons = this.getIcons();
        
        const displayPfp = note.pfp || this.currentUserProfile?.photoURL || 'https://via.placeholder.com/85';
        const displayName = note.username || this.currentUserProfile?.name || 'User';
        const displayHandle = note.handle ? `@${note.handle}` : (this.currentUserProfile?.username ? `@${this.currentUserProfile.username}` : '');
        const isVerified = note.verified || this.currentUserProfile?.verified;
        
        // CF Badge Check
        const isCF = note.audience === 'close_friends';

        const textAlign = note.textAlign || 'center';
        const alignItems = textAlign === 'left' ? 'flex-start' : 'center';
        
        const bgColor = note.bgColor || '#262626';
        const txtColor = note.textColor || '#fff';
        const textShadow = this.getTextShadow(txtColor);
        
        const effectClass = (note.effect && note.effect !== 'none') ? `fx-${note.effect}` : '';
        const glassClass = note.isGlass ? 'glass' : '';

        return `
            <div class="vn-content">
                <div class="vn-profile-header vn-clickable" id="vn-header-click">
                    <img src="${displayPfp}" class="vn-friend-pfp">
                    <div class="vn-friend-info">
                        <div class="vn-friend-name ${textClass}">
                            ${displayName}
                            ${isVerified ? icons.verified : ''}
                            ${isCF ? icons.star : ''}
                        </div>
                        <div class="vn-friend-handle ${textClass}">${displayHandle}</div>
                    </div>
                </div>

                <div class="vn-bubble-container">
                    <div class="vn-bubble ${glassClass}" id="vn-active-card" style="background:${bgColor}; color:${txtColor}; align-items:${alignItems};">
                        <div class="vn-pop-heart" id="vn-pop-heart">${icons.heartFilled}</div>
                        <div class="vn-note-text ${effectClass}" style="text-align:${textAlign}; font-family:${note.font}; text-shadow:${textShadow};">${note.text}</div>
                    </div>
                    
                    ${note.songName ? `
                        <div class="vn-music-pill">
                            <div class="vn-eq"><span></span><span></span><span></span></div>
                            <span>${note.songName} • ${note.songArtist || ''}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="vn-timestamp ${textClass}">${timeAgo}</div>
            </div>

            <div class="vn-footer">
                <div class="vn-emoji-bar">
                    <span class="vn-quick-emoji" data-emoji="😂">😂</span>
                    <span class="vn-quick-emoji" data-emoji="😮">😮</span>
                    <span class="vn-quick-emoji" data-emoji="😍">😍</span>
                    <span class="vn-quick-emoji" data-emoji="😢">😢</span>
                    <span class="vn-quick-emoji" data-emoji="🔥">🔥</span>
                    <span class="vn-quick-emoji" data-emoji="👏">👏</span>
                </div>
                <div class="vn-interaction-bar">
                    <input type="text" id="vn-reply-input" class="vn-reply-input" placeholder="Reply to ${displayName}..." autocomplete="off">
                    <button id="vn-send-text-btn" class="vn-send-btn">${icons.send}</button>
                    <button class="vn-heart-btn" id="like-toggle-btn">
                        ${isLiked ? icons.heartFilled : icons.heartEmpty}
                    </button>
                </div>
            </div>
        `;
    }

    // --- ACTIONS ---

    async handleProfileRedirect() {
        if (!this.currentNote) return;
        window.location.href = `userProfile.html?user=${this.currentNote.uid}`;
    }

    attachDynamicListeners() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const icons = this.getIcons();

        // Redirect
        const headerClick = this.querySelector('#vn-header-click');
        if (headerClick) headerClick.onclick = () => this.handleProfileRedirect();

        // Double Tap
        const card = this.querySelector('#vn-active-card');
        if(card && !this.isOwnNote) {
            card.addEventListener('click', (e) => {
                const currentTime = new Date().getTime();
                if (currentTime - this.lastTap < 300) {
                    const popHeart = this.querySelector('#vn-pop-heart');
                    const likeBtn = this.querySelector('#like-toggle-btn');
                    
                    popHeart.classList.add('animate');
                    setTimeout(() => popHeart.classList.remove('animate'), 800);
                    if(navigator.vibrate) navigator.vibrate([10, 30]);
                    if(likeBtn && likeBtn.innerHTML.includes('fill="none"')) likeBtn.click();
                }
                this.lastTap = currentTime;
            });
        }

        // Nav Buttons
        const leaveNoteBtn = this.querySelector('#vn-leave-new-note');
        if(leaveNoteBtn) {
            leaveNoteBtn.onclick = () => window.location.href = 'notes.html';
        }

        const deleteForeverBtn = this.querySelector('#delete-forever-btn');
        if (deleteForeverBtn) {
            deleteForeverBtn.onclick = async () => {
                if(confirm("Delete permanently?")) {
                    await this.db.collection("notes").doc(this.currentNote.id).delete();
                    this.close();
                }
            };
        }

        // Like Logic
        const likeBtn = this.querySelector('#like-toggle-btn');
        if(likeBtn) {
            likeBtn.onclick = async () => {
                if(navigator.vibrate) navigator.vibrate(10);
                const isCurrentlyLiked = likeBtn.innerHTML.includes('#ff3b30');
                likeBtn.innerHTML = isCurrentlyLiked ? icons.heartEmpty : icons.heartFilled;
                
                const noteRef = this.db.collection("notes").doc(this.currentNote.id);
                try {
                    if (!isCurrentlyLiked) {
                        await noteRef.update({
                            likes: firebase.firestore.FieldValue.arrayUnion({ uid: user.uid, photoURL: user.photoURL })
                        });
                    } else {
                        // Find and remove complex object
                        const likerObj = this.currentNote.likes.find(l => l.uid === user.uid);
                        if(likerObj) await noteRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(likerObj) });
                    }
                } catch (e) { console.error(e); }
            };
        }

        if(this.isOwnNote) return;

        // Reply Logic
        const input = this.querySelector('#vn-reply-input');
        const sendBtn = this.querySelector('#vn-send-text-btn');
        const emojis = this.querySelectorAll('.vn-quick-emoji');
        const heartBtn = this.querySelector('#like-toggle-btn');

        input.addEventListener('input', () => {
            sendBtn.classList.toggle('visible', input.value.trim().length > 0);
            heartBtn.style.display = input.value.trim().length > 0 ? 'none' : 'flex';
        });

        sendBtn.onclick = () => {
            this.handleSendReply(input.value.trim());
            input.value = '';
        };

        emojis.forEach(el => {
            el.onclick = () => {
                this.handleSendReply(el.dataset.emoji);
                if(navigator.vibrate) navigator.vibrate(10);
            };
        });
    }

    async handleSendReply(text) {
        if(!text) return;
        const myUid = firebase.auth().currentUser.uid;
        const targetUid = this.currentNote.uid;
        const chatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;
        
        try {
            await this.db.collection("chats").doc(chatId).collection("messages").add({
                text: text, sender: myUid, timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                replyToNote: this.currentNote.text
            });
            await this.db.collection("chats").doc(chatId).set({
                lastMessage: "Replied to note", lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                participants: [myUid, targetUid]
            }, { merge: true });
            
            // Visual feedback
            const input = this.querySelector('#vn-reply-input');
            input.value = 'Sent!';
            setTimeout(() => input.value = '', 1000);
        } catch(e) { console.error(e); }
    }

    close(fromHistory = false) {
        if (this.unsubscribe) this.unsubscribe();
        this.audioPlayer.pause();
        this.querySelector('#vn-overlay').classList.remove('open');
        document.querySelector('main-navbar').classList.remove('hidden');
        if (!fromHistory && window.location.hash === "#view-note") window.history.back();
    }
}

customElements.define('view-notes', ViewNotes);


/**
 * =======================================================
 * PART 2: THE NOTES MANAGER (List Logic)
 * =======================================================
 */
const NotesManager = {
    init: function() {
        this.injectBubbleStyles(); 
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (user && document.getElementById('notes-container')) {
                    this.setupMyNote(user);
                    this.loadMutualNotes(user);
                }
            });
        }
    },

    injectBubbleStyles: function() {
        if(document.getElementById('notes-bubble-styles')) return;
        const style = document.createElement('style');
        style.id = 'notes-bubble-styles';
        style.innerHTML = `
            #notes-container {
                display: flex; overflow-x: auto; padding: 75px 15px 10px; gap: 20px;
                scrollbar-width: none; align-items: flex-start;
            }
            #notes-container::-webkit-scrollbar { display: none; }
            .note-item {
                display: flex; flex-direction: column; align-items: center; position: relative; width: 75px; flex-shrink: 0;
            }
            .note-bubble, #my-note-preview {
                display: none; flex-direction: column; justify-content: center; align-items: center; text-align: center;
                position: absolute; top: 0; left: 50%; transform: translate(-50%, -100%); z-index: 10;
                padding: 6px 12px; border-radius: 16px; font-size: 0.7rem; width: max-content; max-width: 90px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.1);
                background-size: cover; background-position: center;
            }
            .note-bubble.visible, #my-note-preview.visible { display: flex; }
            .note-bubble.cf-note { border: 2px dashed #00d2ff !important; }
            .note-bubble::after, #my-note-preview::after {
                content: ''; position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%);
                width: 6px; height: 6px; background: inherit; border-radius: 50%; z-index: -1;
            }
            .note-pfp {
                width: 65px; height: 65px; border-radius: 50%; border: 2px solid #222; object-fit: cover; background: #333;
            }
            .note-username {
                font-size: 0.75rem; margin-top: 6px; color: #aaa; max-width: 75px;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
        `;
        document.head.appendChild(style);
    },

    setupMyNote: function(user) {
        const db = firebase.firestore();
        const btn = document.getElementById('my-note-btn');
        const preview = document.getElementById('my-note-preview');
        if (!btn) return;

        db.collection("notes").where("uid", "==", user.uid).where("isActive", "==", true).onSnapshot(snap => {
            if (!snap.empty) {
                const data = snap.docs[0].data();
                if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
                    db.collection("notes").doc(snap.docs[0].id).update({ isActive: false });
                } else {
                    preview.classList.add('visible');
                    preview.style.background = data.bgColor || '#333';
                    preview.style.color = data.textColor || '#fff';
                    preview.innerHTML = `<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;">${data.text}</div>`;
                    btn.onclick = () => document.querySelector('view-notes').open({ ...data, id: snap.docs[0].id }, true);
                    return;
                }
            }
            preview.classList.remove('visible');
            btn.onclick = () => window.location.href = 'notes.html';
        });
    },

    loadMutualNotes: async function(user) {
        const db = firebase.firestore();
        const container = document.getElementById('notes-container');
        if(!container) return;

        try {
            // Get user's following list
            const userDoc = await db.collection("users").doc(user.uid).get();
            const following = (userDoc.data().following || []).map(u => typeof u === 'string' ? u : u.uid);
            
            if (following.length === 0) return;

            // Batch fetch (Firestore 'in' limit 10)
            const chunks = [];
            while(following.length) chunks.push(following.splice(0, 10));

            // Helper to render
            const renderNoteItem = (noteData, uid) => {
                const existingEl = document.getElementById(`note-${uid}`);
                if(existingEl) existingEl.remove();

                const isLiked = noteData.likes && noteData.likes.some(l => l.uid === user.uid);
                const isCF = noteData.audience === 'close_friends';
                const div = document.createElement('div');
                div.id = `note-${uid}`; 
                div.className = 'note-item friend-note has-note';
                
                const bgStyle = `background:${noteData.bgColor || '#262626'}; color:${noteData.textColor || '#fff'}`;
                const cfClass = isCF ? 'cf-note' : '';

                div.innerHTML = `
                    <div class="note-bubble visible ${cfClass}" style="${bgStyle}">
                        <div class="note-text-content" style="text-align:${noteData.textAlign || 'center'}; font-family:${noteData.font || 'system-ui'}">${noteData.text}</div>
                        ${noteData.songName ? `
                            <div class="note-music-tag">
                                <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                <span>${noteData.songName.substring(0, 10)}${noteData.songName.length>10?'...':''}</span>
                            </div>
                        ` : ''}
                    </div>
                    <img src="${noteData.pfp || 'https://via.placeholder.com/65'}" class="note-pfp">
                    ${isLiked ? `
                        <div class="note-like-indicator">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </div>` : ''}
                    <span class="note-username">${(noteData.username || 'User').split(' ')[0]}</span>
                `;
                div.onclick = () => {
                    const viewer = document.querySelector('view-notes');
                    const nav = document.querySelector('main-navbar');
                    if(nav) nav.classList.add('hidden');
                    if(navigator.vibrate) navigator.vibrate(10);
                    // Pass note data with ID
                    viewer.open({ ...noteData, id: uid }, false);
                };
                container.appendChild(div);
            };

            chunks.forEach(chunk => {
                db.collection("notes")
                    .where("uid", "in", chunk) 
                    .where("isActive", "==", true)
                    .onSnapshot(snapshot => {
                        snapshot.docChanges().forEach(change => {
                            const noteData = change.doc.data();
                            const uid = change.doc.id; 
                            
                            if (change.type === "removed") {
                                const el = document.getElementById(`note-${uid}`);
                                if(el) el.remove();
                                return;
                            }

                            if (!noteData.expiresAt || noteData.expiresAt.toDate() > new Date()) {
                                // --- STRICT CLOSE FRIENDS LOGIC FIXED ---
                                if (noteData.audience === 'close_friends') {
                                    // Fetch Author's Profile using noteData.uid (NOT uid which is Note ID)
                                    db.collection('users').doc(noteData.uid).get().then(doc => {
                                        if (doc.exists) {
                                            const authorCF = doc.data().closeFriends || [];
                                            // Check if I am in their list
                                            if (authorCF.includes(user.uid
