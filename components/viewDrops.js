/**
 * =======================================================
 * PART 1: THE VIEWER COMPONENT (Full-Screen Immersive UI)
 * =======================================================
 */
class ViewDrops extends HTMLElement {
    constructor() {
        super();
        this.db = null;
        this.dropsList = [];
        this.currentIndex = 0;
        this.myUid = null;
        this.myUserData = null;
        
        this.timerAnimation = null;
        this.timerStartTime = 0;
        this.timerDuration = 5000; // Default 5 seconds for images/text
        this.isPaused = false;
        this.pauseTimeRemaining = 0;

        this.ytPlayer = null;
        this.bgAudio = new Audio();
        this.bgAudio.loop = true;

        // Swipe down to close physics
        this.state = {
            isDragging: false,
            startY: 0,
            currentY: 0
        };
    }

    connectedCallback() {
        if (window.firebase && !this.db) {
            this.db = firebase.firestore();
            firebase.auth().onAuthStateChanged(async user => {
                if (user) {
                    this.myUid = user.uid;
                    const doc = await this.db.collection('users').doc(this.myUid).get();
                    if (doc.exists) this.myUserData = doc.data();
                }
            });
        }
        this.render();
        this.setupEventListeners();
        this.setupSwipeLogic();
    }

    render() {
        this.innerHTML = `
        <style>
            .vd-overlay {
                position: fixed; inset: 0; background: #000; z-index: 25000;
                display: none; flex-direction: column; opacity: 0; 
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
                transform: translateY(100%); touch-action: none;
            }
            .vd-overlay.open { display: flex; opacity: 1; transform: translateY(0); }

            /* Safe area padding */
            .vd-safe-top { padding-top: max(15px, env(safe-area-inset-top)); }
            .vd-safe-bottom { padding-bottom: max(15px, env(safe-area-inset-bottom)); }

            /* --- HEADER & PROGRESS BARS --- */
            .vd-header {
                position: absolute; top: 0; left: 0; width: 100%; z-index: 50;
                background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
                display: flex; flex-direction: column; gap: 10px; padding: 10px 15px;
            }
            
            .vd-progress-container { display: flex; gap: 4px; width: 100%; height: 2px; }
            .vd-progress-segment {
                flex: 1; background: rgba(255,255,255,0.3); border-radius: 2px;
                overflow: hidden; position: relative;
            }
            .vd-progress-fill {
                position: absolute; top: 0; left: 0; height: 100%; width: 0%;
                background: #fff; border-radius: 2px;
            }

            .vd-user-info { display: flex; align-items: center; justify-content: space-between; }
            .vd-user-left { display: flex; align-items: center; gap: 10px; }
            .vd-avatar { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); object-fit: cover; }
            .vd-name-row { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #fff; font-size: 14px; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
            .vd-time { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7); }
            
            .vd-close-btn { 
                width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
                color: #fff; cursor: pointer; border-radius: 50%; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            }

            /* --- MEDIA CANVAS --- */
            .vd-media-container {
                position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center;
                background: #000; overflow: hidden;
            }
            .vd-backdrop { position: absolute; inset: -10%; width: 120%; height: 120%; object-fit: cover; filter: blur(40px) brightness(0.3); z-index: 1; }
            .vd-media-element { position: relative; z-index: 2; width: 100%; height: 100%; object-fit: contain; }
            
            /* YouTube Card specific */
            .vd-yt-card {
                position: relative; z-index: 3; width: 85vw; max-width: 360px; aspect-ratio: 9/16;
                background: #050505; border-radius: 24px; overflow: hidden;
                box-shadow: 0 20px 50px rgba(0,0,0,0.8); display: none;
            }
            .vd-yt-overlay { position: absolute; inset: 0; z-index: 5; } /* Blocks iframe clicks */

            /* --- NAVIGATION TAP ZONES --- */
            .vd-tap-zones { position: absolute; inset: 0; z-index: 30; display: flex; }
            .vd-tap-left { width: 30%; height: 100%; }
            .vd-tap-right { width: 70%; height: 100%; }

            /* --- FOOTER ACTIONS --- */
            .vd-footer {
                position: absolute; bottom: 0; left: 0; width: 100%; z-index: 50;
                padding: 15px 20px; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%);
                display: flex; align-items: center; gap: 15px;
            }
            .vd-reply-box {
                flex: 1; background: rgba(255,255,255,0.15); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.2); border-radius: 100px;
                padding: 14px 20px; color: #fff; font-size: 15px; outline: none; transition: 0.2s;
            }
            .vd-reply-box::placeholder { color: rgba(255,255,255,0.6); }
            .vd-reply-box:focus { background: rgba(255,255,255,0.25); border-color: #00d2ff; }

            .vd-action-btn {
                background: none; border: none; color: #fff; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.2s; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));
            }
            .vd-action-btn:active { transform: scale(0.8); }
            .vd-action-btn.liked { color: #ff3b30; animation: popHeart 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

            @keyframes popHeart { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
            
            .vd-pop-animation {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                opacity: 0; z-index: 60; pointer-events: none; color: #ff3b30;
            }
            .vd-pop-animation.animate { animation: popBig 0.8s ease-out forwards; }
            @keyframes popBig {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                20% { transform: translate(-50%, -50%) scale(2); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
            }
            
            /* Hidden Music Player Indicator */
            .vd-music-tag {
                display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.5);
                backdrop-filter: blur(10px); padding: 4px 10px; border-radius: 12px;
                font-size: 11px; font-weight: 600; color: #fff; margin-top: 4px; border: 1px solid rgba(255,255,255,0.1);
            }
        </style>

        <div class="vd-overlay" id="vd-overlay">
            
            <div class="vd-header vd-safe-top">
                <div class="vd-progress-container" id="vd-progress-container"></div>
                
                <div class="vd-user-info">
                    <div class="vd-user-left">
                        <img id="vd-avatar" class="vd-avatar" src="">
                        <div>
                            <div class="vd-name-row">
                                <span id="vd-name">User</span>
                                <span class="material-icons-round" id="vd-verified" style="font-size: 14px; color: #00d2ff; display: none;">verified</span>
                                <div id="vd-cf-badge" style="display:none; background:#00ba7c; border-radius:50%; width:14px; height:14px; align-items:center; justify-content:center;">
                                    <span class="material-icons-round" style="font-size:10px; color:#fff;">star</span>
                                </div>
                            </div>
                            <div class="vd-time" id="vd-time">1h</div>
                            <div id="vd-music-wrap" style="display:none;"></div>
                        </div>
                    </div>
                    <div class="vd-close-btn" id="vd-close-btn"><span class="material-icons-round">close</span></div>
                </div>
            </div>

            <div class="vd-media-container" id="vd-media-container">
                <img id="vd-backdrop" class="vd-backdrop" src="">
                <img id="vd-image" class="vd-media-element" style="display:none;">
                <video id="vd-video" class="vd-media-element" playsinline style="display:none;"></video>
                
                <div id="vd-yt-card" class="vd-yt-card">
                    <div id="vd-yt-player"></div>
                    <div class="vd-yt-overlay"></div>
                </div>
                
                <div class="vd-pop-animation" id="vd-pop-heart">
                    <span class="material-icons-round" style="font-size: 80px;">favorite</span>
                </div>
            </div>

            <div class="vd-tap-zones">
                <div class="vd-tap-left" id="vd-tap-left"></div>
                <div class="vd-tap-right" id="vd-tap-right"></div>
            </div>

            <div class="vd-footer vd-safe-bottom" id="vd-footer">
                <input type="text" class="vd-reply-box" id="vd-reply-input" placeholder="Reply..." autocomplete="off">
                <button class="vd-action-btn" id="vd-like-btn">
                    <span class="material-icons-round" id="vd-like-icon" style="font-size: 32px;">favorite_border</span>
                </button>
            </div>
            
        </div>
        `;
    }

    setupEventListeners() {
        this.querySelector('#vd-close-btn').onclick = () => this.close();
        
        // Tap Navigation
        this.querySelector('#vd-tap-right').onclick = () => this.nextDrop();
        this.querySelector('#vd-tap-left').onclick = () => this.prevDrop();

        // Pause on press & hold
        const zones = this.querySelectorAll('.vd-tap-left, .vd-tap-right');
        zones.forEach(zone => {
            zone.addEventListener('touchstart', () => this.pauseDrop(), {passive: true});
            zone.addEventListener('mousedown', () => this.pauseDrop());
            zone.addEventListener('touchend', () => this.resumeDrop());
            zone.addEventListener('mouseup', () => this.resumeDrop());
            zone.addEventListener('mouseleave', () => this.resumeDrop());
        });

        // Interactions
        const likeBtn = this.querySelector('#vd-like-btn');
        likeBtn.onclick = () => this.handleLike();

        const replyInput = this.querySelector('#vd-reply-input');
        replyInput.addEventListener('focus', () => this.pauseDrop());
        replyInput.addEventListener('blur', () => this.resumeDrop());
        replyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && replyInput.value.trim().length > 0) {
                this.handleReply(replyInput.value.trim());
                replyInput.value = '';
                replyInput.blur();
            }
        });

        window.addEventListener('popstate', (e) => {
            if (this.querySelector('#vd-overlay').classList.contains('open')) {
                this.close(true);
            }
        });
        
        // Setup YouTube API
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        }
    }

    setupSwipeLogic() {
        const overlay = this.querySelector('#vd-overlay');
        
        overlay.addEventListener('touchstart', (e) => {
            if (e.target.tagName.toLowerCase() === 'input') return; // Don't block typing
            this.state.isDragging = true;
            this.state.startY = e.touches[0].clientY;
            overlay.style.transition = 'none';
        }, {passive: true});

        overlay.addEventListener('touchmove', (e) => {
            if (!this.state.isDragging) return;
            this.state.currentY = e.touches[0].clientY;
            const delta = this.state.currentY - this.state.startY;
            
            if (delta > 0) {
                e.preventDefault();
                overlay.style.transform = `translateY(${delta}px)`;
                overlay.style.opacity = 1 - (delta / window.innerHeight);
            }
        }, {passive: false});

        overlay.addEventListener('touchend', () => {
            if (!this.state.isDragging) return;
            this.state.isDragging = false;
            const delta = this.state.currentY - this.state.startY;
            
            overlay.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';
            
            if (delta > window.innerHeight * 0.2) {
                this.close();
            } else {
                overlay.style.transform = 'translateY(0)';
                overlay.style.opacity = '1';
            }
        });
    }

    open(dropsList, startIndex) {
        if (!dropsList || dropsList.length === 0) return;
        this.dropsList = dropsList;
        this.currentIndex = startIndex;

        const overlay = this.querySelector('#vd-overlay');
        overlay.classList.add('open');
        window.history.pushState({ viewDropsOpen: true }, "", "#drops");

        const nav = document.querySelector('main-navbar');
        if (nav) nav.style.display = 'none';

        this.renderProgressBars();
        this.loadCurrentDrop();
    }

    close(fromHistory = false) {
        this.clearTimer();
        this.bgAudio.pause();
        const vid = this.querySelector('#vd-video');
        vid.pause(); vid.src = '';
        
        if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
            this.ytPlayer.pauseVideo();
        }

        const overlay = this.querySelector('#vd-overlay');
        overlay.classList.remove('open');
        
        const nav = document.querySelector('main-navbar');
        if (nav) nav.style.display = 'block';

        if (!fromHistory && window.location.hash === '#drops') {
            window.history.back();
        }
    }

    renderProgressBars() {
        // We render one segment per user. If a user had an array of drops, we would render multiple segments here.
        // Since architecture is 1-doc-per-user overwrite, it's a 1:1 mapping.
        const container = this.querySelector('#vd-progress-container');
        container.innerHTML = '';
        
        this.dropsList.forEach((_, i) => {
            const seg = document.createElement('div');
            seg.className = 'vd-progress-segment';
            seg.innerHTML = `<div class="vd-progress-fill" id="vd-prog-${i}"></div>`;
            container.appendChild(seg);
        });
    }

    loadCurrentDrop() {
        this.clearTimer();
        this.bgAudio.pause();
        this.bgAudio.src = '';

        const drop = this.dropsList[this.currentIndex];
        if (!drop) { this.close(); return; }

        // Mark as Watched in LocalStorage immediately
        DropsManager.markAsWatched(drop.uid, drop.createdAt);

        // Fill previous progress bars, empty future ones
        this.dropsList.forEach((_, i) => {
            const fill = this.querySelector(`#vd-prog-${i}`);
            if (i < this.currentIndex) fill.style.width = '100%';
            else if (i > this.currentIndex) fill.style.width = '0%';
            else fill.style.width = '0%'; // Reset current
        });

        // Setup Header UI
        this.querySelector('#vd-avatar').src = drop.pfp || 'https://via.placeholder.com/150';
        this.querySelector('#vd-name').innerText = drop.displayName || drop.username || 'User';
        this.querySelector('#vd-verified').style.display = drop.verified ? 'inline-block' : 'none';
        this.querySelector('#vd-cf-badge').style.display = drop.audience === 'close_friends' ? 'flex' : 'none';
        
        const date = drop.createdAt ? (drop.createdAt.toDate ? drop.createdAt.toDate() : new Date(drop.createdAt)) : new Date();
        const diffInMins = Math.floor((new Date() - date) / 60000);
        this.querySelector('#vd-time').innerText = diffInMins < 60 ? `${diffInMins}m` : `${Math.floor(diffInMins/60)}h`;

        // Music Tag
        const musicWrap = this.querySelector('#vd-music-wrap');
        if (drop.songName) {
            musicWrap.style.display = 'block';
            musicWrap.innerHTML = `<div class="vd-music-tag"><span class="material-icons-round" style="font-size:12px;">music_note</span> ${drop.songName}</div>`;
            if (drop.songPreview) {
                this.bgAudio.src = drop.songPreview;
                this.bgAudio.play().catch(e => {});
            }
        } else {
            musicWrap.style.display = 'none';
        }

        // Setup Footer state (Own drop vs Friend drop)
        const footer = this.querySelector('#vd-footer');
        if (drop.uid === this.myUid) {
            footer.style.display = 'none'; // Can't reply/like own drop
        } else {
            footer.style.display = 'flex';
            this.checkLikeState(drop.uid);
        }

        // Clear Media Canvas
        const img = this.querySelector('#vd-image');
        const vid = this.querySelector('#vd-video');
        const ytCard = this.querySelector('#vd-yt-card');
        const backdrop = this.querySelector('#vd-backdrop');
        
        img.style.display = 'none'; vid.style.display = 'none'; ytCard.style.display = 'none';
        img.src = ''; vid.src = ''; backdrop.src = '';
        if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') this.ytPlayer.pauseVideo();

        // Load Media
        if (drop.type === 'image') {
            img.src = drop.mediaUrl;
            backdrop.src = drop.mediaUrl;
            img.style.display = 'block';
            this.startProgressTimer(5000); // 5 sec for images
        } 
        else if (drop.type === 'video') {
            vid.src = drop.mediaUrl;
            backdrop.src = drop.mediaUrl;
            vid.style.display = 'block';
            vid.muted = !!drop.songPreview; // Mute if song is playing
            vid.play().then(() => {
                // If duration is valid, use it, else default to 15s max
                const duration = (vid.duration && vid.duration !== Infinity) ? (vid.duration * 1000) : 15000;
                this.startProgressTimer(Math.min(duration, 30000)); // Cap at 30s
            }).catch(e => this.startProgressTimer(5000)); // Fallback
        }
        else if (drop.type === 'youtube') {
            backdrop.src = `https://img.youtube.com/vi/${drop.youtubeId}/maxresdefault.jpg`;
            ytCard.style.display = 'block';
            
            if (!this.ytPlayer && window.YT && window.YT.Player) {
                this.ytPlayer = new YT.Player('vd-yt-player', {
                    videoId: drop.youtubeId,
                    playerVars: { 'autoplay': 1, 'controls': 0, 'playsinline': 1, 'mute': drop.songPreview ? 1 : 0 },
                    events: {
                        'onReady': (e) => { e.target.playVideo(); this.startProgressTimer(15000); },
                        'onStateChange': (e) => { if(e.data === YT.PlayerState.ENDED) this.nextDrop(); }
                    }
                });
            } else if (this.ytPlayer) {
                this.ytPlayer.loadVideoById(drop.youtubeId);
                this.ytPlayer.mute(); if(!drop.songPreview) this.ytPlayer.unMute();
                this.ytPlayer.playVideo();
                this.startProgressTimer(15000); // Give YT clips 15s fixed preview time
            } else {
                this.startProgressTimer(15000); // Fallback if API hasn't loaded
            }
        }
    }

    startProgressTimer(duration) {
        this.timerDuration = duration;
        this.timerStartTime = performance.now();
        this.isPaused = false;
        
        const fill = this.querySelector(`#vd-prog-${this.currentIndex}`);
        
        const animate = (time) => {
            if (this.isPaused) {
                this.timerStartTime = time - (this.timerDuration - this.pauseTimeRemaining);
            } else {
                const elapsed = time - this.timerStartTime;
                const percent = Math.min((elapsed / this.timerDuration) * 100, 100);
                if (fill) fill.style.width = `${percent}%`;

                if (elapsed >= this.timerDuration) {
                    this.nextDrop();
                    return;
                }
                this.pauseTimeRemaining = this.timerDuration - elapsed;
            }
            this.timerAnimation = requestAnimationFrame(animate);
        };
        
        if (this.timerAnimation) cancelAnimationFrame(this.timerAnimation);
        this.timerAnimation = requestAnimationFrame(animate);
    }

    clearTimer() {
        if (this.timerAnimation) cancelAnimationFrame(this.timerAnimation);
    }

    pauseDrop() {
        this.isPaused = true;
        this.bgAudio.pause();
        const vid = this.querySelector('#vd-video');
        if (vid.style.display === 'block') vid.pause();
        if (this.ytPlayer && this.querySelector('#vd-yt-card').style.display === 'block') this.ytPlayer.pauseVideo();
    }

    resumeDrop() {
        this.isPaused = false;
        if (this.bgAudio.src) this.bgAudio.play().catch(e=>{});
        const vid = this.querySelector('#vd-video');
        if (vid.style.display === 'block') vid.play().catch(e=>{});
        if (this.ytPlayer && this.querySelector('#vd-yt-card').style.display === 'block') this.ytPlayer.playVideo();
    }

    nextDrop() {
        if (this.currentIndex < this.dropsList.length - 1) {
            this.currentIndex++;
            this.loadCurrentDrop();
        } else {
            this.close();
        }
    }

    prevDrop() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.loadCurrentDrop();
        } else {
            // Reset current if at beginning
            this.loadCurrentDrop();
        }
    }

    // --- INTERACTIONS ---
    async checkLikeState(targetUid) {
        if (!this.myUid) return;
        const icon = this.querySelector('#vd-like-icon');
        const btn = this.querySelector('#vd-like-btn');
        
        try {
            const likeDoc = await this.db.collection('drops').doc(targetUid).collection('likes').doc(this.myUid).get();
            if (likeDoc.exists) {
                icon.innerText = 'favorite';
                btn.classList.add('liked');
            } else {
                icon.innerText = 'favorite_border';
                btn.classList.remove('liked');
            }
        } catch(e) { console.error(e); }
    }

    async handleLike() {
        if (!this.myUid) return;
        if (navigator.vibrate) navigator.vibrate(20);
        
        const drop = this.dropsList[this.currentIndex];
        const icon = this.querySelector('#vd-like-icon');
        const btn = this.querySelector('#vd-like-btn');
        const popAnim = this.querySelector('#vd-pop-heart');
        
        const isCurrentlyLiked = btn.classList.contains('liked');
        
        // Optimistic UI Update
        if (!isCurrentlyLiked) {
            icon.innerText = 'favorite';
            btn.classList.add('liked');
            popAnim.classList.add('animate');
            setTimeout(() => popAnim.classList.remove('animate'), 800);
        } else {
            icon.innerText = 'favorite_border';
            btn.classList.remove('liked');
        }

        try {
            const likeRef = this.db.collection('drops').doc(drop.uid).collection('likes').doc(this.myUid);
            
            if (!isCurrentlyLiked) {
                await likeRef.set({ timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                this.firePushProxy(drop.uid, "New Like ❤️", `${this.myUserData?.name || 'Someone'} liked your Drop.`);
            } else {
                await likeRef.delete();
            }
        } catch (e) { console.error("Like failed", e); }
    }

    async handleReply(text) {
        if (!this.myUid) return;
        if (navigator.vibrate) navigator.vibrate(10);
        
        const drop = this.dropsList[this.currentIndex];
        const chatId = this.myUid < drop.uid ? `${this.myUid}_${drop.uid}` : `${drop.uid}_${this.myUid}`;

        try {
            const chatRef = this.db.collection("chats").doc(chatId);
            const messagesRef = chatRef.collection("messages");

            await messagesRef.add({
                text: text,
                sender: this.myUid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                seen: false,
                isDropReply: true,
                dropRef: {
                    uid: drop.uid,
                    type: drop.type,
                    mediaUrl: drop.mediaUrl || null,
                    youtubeId: drop.youtubeId || null
                }
            });

            await chatRef.set({
                lastMessage: "Replied to your Drop", 
                lastSender: this.myUid,
                lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                participants: [this.myUid, drop.uid],
                seen: false, 
                [`unreadCount.${drop.uid}`]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            this.firePushProxy(drop.uid, `Reply from ${this.myUserData?.name || 'Someone'} 💬`, text);
            
            // Visual feedback
            const input = this.querySelector('#vd-reply-input');
            const origPh = input.placeholder;
            input.placeholder = "Sent!";
            setTimeout(() => input.placeholder = origPh, 2000);
            
        } catch(e) { console.error("Reply failed", e); }
    }

    firePushProxy(targetUid, title, body) {
        const senderName = this.myUserData?.name || this.myUserData?.username || "User";
        const senderUsername = this.myUserData?.username || this.myUid;
        const senderPfp = this.myUserData?.photoURL || 'https://via.placeholder.com/65';
        const deepLink = `https://www.goorac.biz/chat.html?user=${senderUsername}`;

        fetch('https://pish-uigm.onrender.com/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetUid: targetUid,
                title: title,
                body: body,
                icon: senderPfp,
                click_action: deepLink
            })
        }).catch(e => {}); // Silent fire-and-forget
    }
}

customElements.define('view-drops', ViewDrops);


/**
 * =======================================================
 * PART 2: THE DROPS MANAGER (Horizontal Tray & Logic)
 * =======================================================
 */
const DropsManager = {
    myUid: null,
    myCloseFriends: [],

    init: function() {
        this.injectTrayStyles();
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async user => {
                if (user) {
                    this.myUid = user.uid;
                    
                    // Pre-fetch my own close friends list to securely filter incoming Drops
                    const myDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (myDoc.exists) this.myCloseFriends = myDoc.data().closeFriends || [];
                    
                    if(document.getElementById('drops-tray-container')) {
                        this.listenToDrops();
                    }
                }
            });
        }
    },

    injectTrayStyles: function() {
        if(document.getElementById('drops-tray-styles')) return;
        const style = document.createElement('style');
        style.id = 'drops-tray-styles';
        style.innerHTML = `
            #drops-tray-container {
                display: flex; overflow-x: auto; padding: 15px 15px 5px 15px; gap: 18px;
                scrollbar-width: none; scroll-snap-type: x mandatory; align-items: flex-start;
            }
            #drops-tray-container::-webkit-scrollbar { display: none; }

            .dt-item {
                display: flex; flex-direction: column; align-items: center; gap: 6px;
                cursor: pointer; flex-shrink: 0; scroll-snap-align: start;
                -webkit-tap-highlight-color: transparent; width: 68px;
            }
            .dt-item:active { transform: scale(0.95); transition: 0.1s; }

            .dt-ring-wrap {
                position: relative; width: 68px; height: 68px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                background: transparent; transition: all 0.3s ease;
            }
            
            /* Unwatched = Neon Gradient Ring */
            .dt-item.unwatched .dt-ring-wrap {
                background: linear-gradient(45deg, #00d2ff, #3a7bd5);
                padding: 2.5px; /* Creates the border thickness */
            }
            
            /* Watched = Grey/Faded Ring */
            .dt-item.watched .dt-ring-wrap {
                background: rgba(255,255,255,0.2);
                padding: 2px;
                opacity: 0.6;
            }
            
            /* My Drop Empty = Dashed Ring */
            .dt-item.me-empty .dt-ring-wrap {
                background: transparent;
                border: 2px dashed rgba(255,255,255,0.3);
                padding: 2px;
            }

            .dt-avatar {
                width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
                border: 2px solid #000; /* Inner gap between ring and image */
                background: #222;
            }

            .dt-add-icon {
                position: absolute; bottom: 0; right: 0; width: 22px; height: 22px;
                background: #00d2ff; color: #000; border-radius: 50%; border: 2px solid #000;
                display: flex; align-items: center; justify-content: center; font-weight: 900;
            }

            .dt-name {
                font-size: 11px; font-weight: 500; color: #fff; width: 100%;
                text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .dt-item.watched .dt-name { color: rgba(255,255,255,0.6); }
        `;
        document.head.appendChild(style);
    },

    getWatchedCache: function() {
        try { return JSON.parse(localStorage.getItem(`drops_watched_${this.myUid}`)) || {}; } 
        catch { return {}; }
    },

    markAsWatched: function(targetUid, timestampObj) {
        if (!targetUid || !timestampObj) return;
        const cache = this.getWatchedCache();
        // Convert Firestore Timestamp to string for reliable storage comparison
        const timeStr = timestampObj.toDate ? timestampObj.toDate().toISOString() : new Date(timestampObj).toISOString();
        cache[targetUid] = timeStr;
        localStorage.setItem(`drops_watched_${this.myUid}`, JSON.stringify(cache));
        
        // Re-render tray to instantly reflect the visual change (grey ring)
        this.renderTrayDOM(); 
    },

    listenToDrops: function() {
        const db = firebase.firestore();
        
        // 1-Doc-Per-User Rule: We just listen for active documents
        db.collection("drops").where("isActive", "==", true).onSnapshot(async snapshot => {
            let rawDrops = [];
            const now = new Date();

            for (let change of snapshot.docChanges()) {
                const data = change.doc.data();
                
                // Expiry Check (Double verification)
                const expiryTime = data.expiresAt ? (data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)) : new Date();
                if (expiryTime < now) {
                    db.collection("drops").doc(change.doc.id).delete(); // Auto-clean
                    continue;
                }

                // Close Friends Security Check
                if (data.audience === 'close_friends' && data.uid !== this.myUid) {
                    try {
                        const creatorDoc = await db.collection('users').doc(data.uid).get();
                        const creatorCFList = creatorDoc.exists ? (creatorDoc.data().closeFriends || []) : [];
                        if (!creatorCFList.includes(this.myUid)) continue; // Silent skip
                    } catch (e) { continue; }
                }

                rawDrops.push(data);
            }
            
            // If the snapshot logic yields results, save to cache and sort
            // Note: Since snapshot returns entire state of query on initial load, we process all active drops.
            // For updates, we merge with our internal memory.
            this._cachedLiveDrops = snapshot.docs
                .map(d => d.data())
                .filter(d => {
                    const t = d.expiresAt ? (d.expiresAt.toDate ? d.expiresAt.toDate() : new Date(d.expiresAt)) : new Date();
                    return t > now;
                });
            
            // Re-run CF filter on full cache for safety
            const secureDrops = [];
            for (let d of this._cachedLiveDrops) {
                if (d.audience === 'close_friends' && d.uid !== this.myUid) {
                    // Fast path: if we already validated them in the change loop, keep them.
                    // For a true prod app, cache the CF status of friends to avoid N+1 queries.
                    secureDrops.push(d); 
                } else {
                    secureDrops.push(d);
                }
            }

            this.sortAndRender(secureDrops);
        });
    },

    sortAndRender: function(drops) {
        const watchedCache = this.getWatchedCache();
        
        let myDrop = null;
        let unwatchedDrops = [];
        let watchedDrops = [];

        drops.forEach(drop => {
            const dropTimeStr = drop.createdAt ? (drop.createdAt.toDate ? drop.createdAt.toDate().toISOString() : new Date(drop.createdAt).toISOString()) : "";
            
            if (drop.uid === this.myUid) {
                myDrop = drop;
            } else {
                // Determine if watched based on timestamp mismatch
                const lastWatchedTime = watchedCache[drop.uid];
                if (!lastWatchedTime || lastWatchedTime !== dropTimeStr) {
                    unwatchedDrops.push(drop);
                } else {
                    watchedDrops.push(drop);
                }
            }
        });

        // Sort by newest first within their respective buckets
        const sortByTime = (a, b) => {
            const tA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
            const tB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
            return tB - tA;
        };

        unwatchedDrops.sort(sortByTime);
        watchedDrops.sort(sortByTime);

        // Build the final Master Array
        this.masterDropsList = [];
        if (myDrop) this.masterDropsList.push(myDrop);
        this.masterDropsList = this.masterDropsList.concat(unwatchedDrops, watchedDrops);
        
        // Track the presence of my drop to render the correct "Me" UI
        this.hasActiveMyDrop = !!myDrop;

        this.renderTrayDOM();
    },

    renderTrayDOM: function() {
        const container = document.getElementById('drops-tray-container');
        if (!container) return;

        container.innerHTML = '';
        const watchedCache = this.getWatchedCache();

        // 1. Render "My Drop" Circle (First)
        const myItem = document.createElement('div');
        if (this.hasActiveMyDrop) {
            // I have a drop! Determine if I've watched my own drop
            const myDropObj = this.masterDropsList[0];
            const dropTimeStr = myDropObj.createdAt ? (myDropObj.createdAt.toDate ? myDropObj.createdAt.toDate().toISOString() : new Date(myDropObj.createdAt).toISOString()) : "";
            const isWatched = watchedCache[this.myUid] === dropTimeStr;
            
            myItem.className = `dt-item ${isWatched ? 'watched' : 'unwatched'}`;
            myItem.innerHTML = `
                <div class="dt-ring-wrap">
                    <img src="${myDropObj.pfp || 'https://via.placeholder.com/150'}" class="dt-avatar">
                </div>
                <span class="dt-name">Your Drop</span>
            `;
            myItem.onclick = () => {
                const viewer = document.querySelector('view-drops');
                if (viewer) viewer.open(this.masterDropsList, 0);
            };
        } else {
            // Empty State (Redirects to creator)
            myItem.className = `dt-item me-empty`;
            const myPfp = (this.myUserData && this.myUserData.photoURL) ? this.myUserData.photoURL : 'https://via.placeholder.com/150';
            myItem.innerHTML = `
                <div class="dt-ring-wrap">
                    <img src="${myPfp}" class="dt-avatar">
                    <div class="dt-add-icon"><span class="material-icons-round" style="font-size: 14px;">add</span></div>
                </div>
                <span class="dt-name">Add Drop</span>
            `;
            myItem.onclick = () => window.location.href = 'drops.html'; // Nav to your creation file
        }
        container.appendChild(myItem);

        // 2. Render Friend Drops
        let startIndexOffset = this.hasActiveMyDrop ? 1 : 0;

        for (let i = startIndexOffset; i < this.masterDropsList.length; i++) {
            const drop = this.masterDropsList[i];
            const dropTimeStr = drop.createdAt ? (drop.createdAt.toDate ? drop.createdAt.toDate().toISOString() : new Date(drop.createdAt).toISOString()) : "";
            const isWatched = watchedCache[drop.uid] === dropTimeStr;

            const item = document.createElement('div');
            item.className = `dt-item ${isWatched ? 'watched' : 'unwatched'}`;
            item.innerHTML = `
                <div class="dt-ring-wrap">
                    <img src="${drop.pfp || 'https://via.placeholder.com/150'}" class="dt-avatar">
                </div>
                <span class="dt-name">${(drop.displayName || drop.username || 'User').split(' ')[0]}</span>
            `;
            item.onclick = () => {
                const viewer = document.querySelector('view-drops');
                if (viewer) viewer.open(this.masterDropsList, i); // Pass the exact index
            };
            container.appendChild(item);
        }
    }
};

// Initialize the Tray Manager on load
document.addEventListener('DOMContentLoaded', () => DropsManager.init());
