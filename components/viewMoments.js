/**
 * =======================================================
 * viewMoments.js - Goorac Quantum Immersive Feed
 * =======================================================
 */

class ViewMoments extends HTMLElement {
    constructor() {
        super();
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.moments = [];
        this.mutualUids = [];
        this.myCF = []; 
        
        // Audio & Observer
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
        this.isMuted = true; 
        this.observer = null;
        this.seenTimers = {}; 
        
        // Pagination
        this.lastDoc = null;
        this.loading = false;
        this.feedEnd = false;
        
        // Comments Pagination
        this.commentsLastDoc = null;
        this.loadingComments = false;
        this.activeMomentId = null;

        // Current User Cache
        this.currentUserData = null;
    }

    async connectedCallback() {
        this.render();
        this.setupEventListeners();
        
        this.auth.onAuthStateChanged(async (user) => {
            const cachedUid = localStorage.getItem('goorac_moments_last_uid');
            
            if (user) {
                // Clear cache immediately if a different user logs in
                if (cachedUid !== user.uid) {
                    localStorage.removeItem('goorac_moments_cache');
                    localStorage.setItem('goorac_moments_last_uid', user.uid);
                    this.moments = [];
                    this.renderFeed(); // clear UI
                } else {
                    this.loadCachedMoments(); // Safe to load
                }

                const doc = await this.db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    this.currentUserData = { uid: user.uid, ...doc.data() };
                    this.initFeed(user.uid);
                }
            } else {
                localStorage.removeItem('goorac_moments_cache');
                localStorage.removeItem('goorac_moments_last_uid');
            }
        });
    }

    setupEventListeners() {
        // Infinite scroll for body (Feed)
        window.addEventListener('scroll', () => {
            if (!this.loading && !this.feedEnd && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
                this.fetchMoments(true);
            }
        });

        // Infinite scroll for comments sheet
        const cList = this.querySelector('#comment-list-container');
        if(cList) {
            cList.addEventListener('scroll', () => {
                if (!this.loadingComments && (cList.scrollTop + cList.clientHeight >= cList.scrollHeight - 100)) {
                    this.loadComments(this.activeMomentId, true);
                }
            });
        }

        // Handle Mobile Back Button for Modals
        window.addEventListener('popstate', (e) => {
            if (this.querySelector('#full-moment-modal').classList.contains('open') && (!e.state || e.state.modal !== 'momentFull')) {
                this.closeFullModal(true);
            }
            if (this.querySelector('#comment-sheet').classList.contains('open') && (!e.state || e.state.modal !== 'momentComments')) {
                this.closeComments(true);
            }
        });
    }

    // --- UTILS ---
    toggleBodyScroll(lock) {
        if (lock) {
            document.body.style.overflow = 'hidden';
        } else {
            const modalOpen = this.querySelector('#full-moment-modal').classList.contains('open');
            const sheetOpen = this.querySelector('#comment-sheet').classList.contains('open');
            if (!modalOpen && !sheetOpen) {
                document.body.style.overflow = '';
            }
        }
    }

    getRelativeTime(timestamp) {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d`;
    }

    async initFeed(uid) {
        await this.fetchRelations(uid);
        this.setupMediaObserver();
        this.fetchMoments();
    }

    async fetchRelations(uid) {
        try {
            const myFollowing = this.currentUserData.following || []; 
            const myFollowers = this.currentUserData.followers || []; 

            const followingUIDs = myFollowing.map(i => typeof i === 'string' ? i : i.uid);
            const followersUIDs = myFollowers.map(i => typeof i === 'string' ? i : i.uid);

            this.mutualUids = followingUIDs.filter(id => followersUIDs.includes(id));
            this.mutualUids.push(uid); // Always include myself in the feed

            this.myCF = this.currentUserData.closeFriends || [];
        } catch(e) { console.error("Relations error", e); }
    }

    async fetchMoments(isNextPage = false) {
        if (this.loading || this.feedEnd) return;
        this.loading = true;
        this.querySelector('#feed-loader').style.display = 'block';

        let fetchedCount = 0;
        let newMoments = [];
        const now = new Date();

        let query = this.db.collection('moments')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(20); // Larger batch to find mutuals faster

        if (isNextPage && this.lastDoc) {
            query = query.startAfter(this.lastDoc);
        }

        try {
            // Actively fetch until we have enough mutual moments or run out of DB documents
            while (fetchedCount < 6 && !this.feedEnd) {
                const snap = await query.get();
                
                if (snap.empty) {
                    this.feedEnd = true;
                    break;
                }

                this.lastDoc = snap.docs[snap.docs.length - 1];
                
                // Prepare next query in case we need to loop again
                query = this.db.collection('moments')
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .startAfter(this.lastDoc)
                    .limit(20);

                for (let doc of snap.docs) {
                    const data = doc.data();
                    
                    // EXPIRE LOGIC: Archive if past 24 hours
                    if (data.expiresAt && data.expiresAt.toDate() < now) {
                        this.db.collection('moments').doc(doc.id).update({ isActive: false });
                        continue; 
                    }
                    
                    // FILTER: Mutuals Only
                    if (!this.mutualUids.includes(data.uid)) continue;

                    // FILTER: Close Friends Only 
                    if (data.audience === 'close_friends' && data.uid !== this.auth.currentUser.uid) {
                        try {
                            const authorDoc = await this.db.collection('users').doc(data.uid).get();
                            const authorData = authorDoc.data();
                            if (!authorData || !authorData.closeFriends || !authorData.closeFriends.includes(this.auth.currentUser.uid)) {
                                continue; 
                            }
                        } catch (e) { continue; }
                    }

                    newMoments.push({ id: doc.id, ...data });
                    fetchedCount++;
                    if (fetchedCount >= 6) break; // Stop loop if batch filled
                }
            }

            if (isNextPage) {
                this.moments = [...this.moments, ...newMoments];
            } else {
                this.moments = newMoments;
                localStorage.setItem('goorac_moments_cache', JSON.stringify(this.moments.slice(0, 6))); // Cache latest 6
            }

            this.renderFeed();
        } catch(e) {
            console.error("Feed error", e);
        } finally {
            this.loading = false;
            this.querySelector('#feed-loader').style.display = 'none';
        }
    }

    loadCachedMoments() {
        const cache = localStorage.getItem('goorac_moments_cache');
        if (cache) {
            const parsedCache = JSON.parse(cache);
            const now = new Date();
            this.moments = parsedCache.filter(m => !m.expiresAt || new Date(m.expiresAt.seconds ? m.expiresAt.seconds * 1000 : m.expiresAt) > now);
            this.renderFeed();
        }
    }

    // --- INTERSECTION OBSERVER (AUDIO & SEEN) ---
    setupMediaObserver() {
        const options = { threshold: 0.65 }; 
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const momentId = entry.target.dataset.id;
                const moment = this.moments.find(m => m.id === momentId);
                
                if (entry.isIntersecting) {
                    if (moment && moment.songPreview) {
                        this.playMomentMusic(moment.songPreview);
                    }
                    
                    this.seenTimers[momentId] = setTimeout(() => {
                        this.markAsSeen(momentId, moment);
                    }, 1500);
                    
                } else {
                    clearTimeout(this.seenTimers[momentId]);
                }
            });
        }, options);
    }

    playMomentMusic(url) {
        if (this.audioPlayer.src !== url) {
            this.audioPlayer.src = url;
        }
        this.audioPlayer.muted = this.isMuted;
        this.audioPlayer.play().catch(() => {});
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audioPlayer.muted = this.isMuted;
        if (!this.isMuted) this.audioPlayer.play().catch(()=>{});
        this.renderFeed(); 
    }

    async markAsSeen(momentId, moment) {
        const myUid = this.auth.currentUser.uid;
        const viewers = moment.viewers || [];
        
        if (moment.uid !== myUid && !viewers.includes(myUid)) {
            try {
                await this.db.collection('moments').doc(momentId).update({
                    viewers: firebase.firestore.FieldValue.arrayUnion(myUid)
                });
                if(!moment.viewers) moment.viewers = [];
                moment.viewers.push(myUid);
            } catch(e) {}
        }
    }

    // --- LIKES & NOTIFICATIONS ---
    async toggleLike(momentId) {
        const myUid = this.auth.currentUser.uid;
        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;

        if(navigator.vibrate) navigator.vibrate(10);

        const isLiked = moment.likes && moment.likes.includes(myUid);
        const ref = this.db.collection('moments').doc(momentId);

        if (isLiked) {
            moment.likes = moment.likes.filter(id => id !== myUid);
            this.renderFeed();
            await ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) });
        } else {
            if(!moment.likes) moment.likes = [];
            moment.likes.push(myUid);
            this.renderFeed();
            await ref.update({ likes: firebase.firestore.FieldValue.arrayUnion(myUid) });
            
            if (moment.uid !== myUid) {
                this.sendNotification(moment.uid, 'like_moment', momentId, 'liked your moment.');
            }
        }
    }

    async sendNotification(toUid, type, referenceId, body) {
        if (!this.currentUserData || toUid === this.currentUserData.uid) return; 
        
        const notifId = `${type}_${this.currentUserData.uid}_${referenceId}`;
        const notifRef = this.db.collection('notifications').doc(notifId);

        try {
            const docSnap = await notifRef.get();
            if (!docSnap.exists) {
                await notifRef.set({
                    toUid: toUid,
                    fromUid: this.currentUserData.uid,
                    senderName: this.currentUserData.name || this.currentUserData.username || 'User',
                    senderPfp: this.currentUserData.photoURL || 'https://via.placeholder.com/65',
                    isSenderVerified: this.currentUserData.verified || false,
                    type: type, 
                    body: body,
                    referenceId: referenceId,
                    isSeen: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                await this.db.collection('users').doc(toUid).update({
                    unreadCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        } catch(e) { console.error("Notification Error", e); }
    }

    // --- UI RENDERING ---
    render() {
        this.innerHTML = `
            <style>
                .moments-container { display: flex; flex-direction: column; background: #000; width: 100%; }
                
                /* Feed Card */
                .m-card { width: 100%; border-bottom: 1px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 10px; }
                .m-header { display: flex; align-items: center; padding: 12px 15px; gap: 10px; }
                .m-pfp { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent); cursor: pointer; }
                .m-user-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                .m-name-row { display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 14px; color: #fff; }
                .m-verified { color: #0095f6; font-size: 14px; }
                .m-username { font-size: 12px; color: #aaa; font-weight: 400; }
                .m-timestamp { font-size: 11px; color: #888; font-weight: 500; }
                .m-song { font-size: 11px; color: #fff; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
                
                .m-canvas { 
                    width: 100%; aspect-ratio: 4/5; background: #050505; 
                    position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                }
                .m-media { width: 100%; height: 100%; object-fit: contain; z-index: 2; position: relative; }
                .m-backdrop { position: absolute; inset: -10%; width: 120%; height: 120%; object-fit: cover; filter: blur(30px) brightness(0.4); z-index: 0; }
                
                .mute-btn { position: absolute; bottom: 15px; right: 15px; z-index: 10; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color:#fff; border:none; cursor:pointer;}
                
                .m-actions { display: flex; padding: 12px 15px; gap: 20px; align-items: center; }
                .m-btn { background: none; border: none; color: #fff; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;}
                .m-btn:active { transform: scale(0.9); }
                .m-btn .material-icons-round { font-size: 28px; }
                .liked { color: #ff3b30 !important; }

                .m-caption { padding: 0 15px 10px; font-size: 14px; color: #fff; line-height: 1.4; word-break: break-word; }
                .m-caption-name { font-weight: 700; margin-right: 5px; }

                /* Full Screen Modal */
                .m-full-modal {
                    position: fixed; inset: 0; background: #000; z-index: 2000;
                    transform: translateX(100%); transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
                    display: flex; flex-direction: column; width: 100vw; height: 100dvh;
                }
                .m-full-modal.open { transform: translateX(0); }
                .m-full-header { padding: calc(15px + env(safe-area-inset-top)) 20px 15px; display: flex; align-items: center; justify-content: space-between; gap: 15px; border-bottom: 1px solid #1a1a1a; }
                
                /* Advanced Action Buttons Top */
                .m-action-btn-row { display: flex; gap: 10px; margin: 15px 0 25px; }
                .m-action-btn { flex: 1; padding: 12px; border-radius: 16px; font-weight: 600; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; border: none; transition: 0.2s; }
                .m-action-btn .material-icons-round { font-size: 22px; }
                .m-action-btn.primary { background: rgba(255, 255, 255, 0.1); color: #fff; }
                .m-action-btn.secondary { background: rgba(255, 255, 255, 0.05); color: #ccc; }
                .m-action-btn.danger { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }
                .m-action-btn:active { transform: scale(0.95); }

                /* My Moments Dashboard */
                .my-stats-box { background: #111; border-radius: 16px; padding: 15px; margin: 15px 0; display: flex; justify-content: space-around; text-align: center; }
                .stat-num { font-weight: 800; font-size: 20px; color: #fff; }
                .stat-lbl { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
                
                /* Advanced Viewer List */
                .advanced-viewers-list { margin-top: 15px; max-height: 350px; overflow-y: auto; padding: 0 5px; scrollbar-width: none; }
                .advanced-viewers-list::-webkit-scrollbar { display: none; }
                .viewer-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 16px; }
                .viewer-info { display: flex; align-items: center; gap: 12px; }
                .viewer-avatar { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); object-fit: cover; }
                .viewer-name { color: #fff; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
                .viewer-action-icon { display: flex; align-items: center; justify-content: center; }

                /* Comment Bottom Sheet */
                .c-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 3000; display: none; align-items: flex-end; opacity: 0; transition: 0.3s; backdrop-filter: blur(4px); }
                .c-overlay.open { display: flex; opacity: 1; }
                .c-sheet { width: 100%; height: 75vh; background: #121212; border-top-left-radius: 24px; border-top-right-radius: 24px; display: flex; flex-direction: column; transform: translateY(100%); transition: 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); box-shadow: 0 -10px 40px rgba(0,0,0,0.5); }
                .c-overlay.open .c-sheet { transform: translateY(0); }
                
                .c-header { display: flex; justify-content: center; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; }
                .c-drag { width: 40px; height: 4px; background: #444; border-radius: 10px; }
                .c-title { position: absolute; top: 15px; font-weight: 700; font-size: 14px; }
                
                .c-list { flex: 1; overflow-y: auto; padding: 15px 20px; display: flex; flex-direction: column; gap: 20px; scrollbar-width: none; }
                .c-item { display: flex; gap: 12px; }
                .c-pfp { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
                .c-content { flex: 1; }
                .c-name { font-weight: 700; font-size: 13px; color: #fff; margin-bottom: 2px; }
                .c-text { font-size: 14px; color: #eee; line-height: 1.4; }
                .c-meta { display: flex; align-items: center; gap: 15px; font-size: 11px; color: #888; margin-top: 6px; font-weight: 600; }
                .c-reply-btn { cursor: pointer; transition: 0.2s; }
                .c-reply-btn:active { color: #fff; }
                
                .c-input-area { padding: 10px 15px calc(15px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; background: #121212; }
                .c-input { flex: 1; background: #222; border: none; color: #fff; padding: 12px 15px; border-radius: 20px; font-size: 14px; outline: none; }
                .c-send { color: var(--accent); font-weight: 700; background: none; border: none; padding: 8px; cursor: pointer; }

                /* Loader */
                .loader-spinner { text-align: center; padding: 20px; color: var(--accent); display: none; }
                .loader-spinner .material-icons-round { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            </style>

            <div class="moments-container" id="feed-container"></div>
            <div class="loader-spinner" id="feed-loader"><span class="material-icons-round">refresh</span></div>

            <div class="m-full-modal" id="full-moment-modal">
                <div class="m-full-header">
                    <span class="material-icons-round" onclick="document.querySelector('view-moments').closeFullModal()" style="cursor:pointer; font-size:28px;">arrow_back</span>
                    <span style="font-weight: 700; font-size: 16px;">Moment Info</span>
                    <span style="width:28px;"></span> 
                </div>
                <div id="full-modal-content" style="flex:1; overflow-y:auto; overflow-x:hidden; padding-bottom: 40px;"></div>
            </div>

            <div class="c-overlay" id="comment-sheet" onclick="if(event.target === this) document.querySelector('view-moments').closeComments()">
                <div class="c-sheet" onclick="event.stopPropagation()">
                    <div class="c-header" onclick="document.querySelector('view-moments').closeComments()">
                        <div class="c-drag"></div><div class="c-title">Comments</div>
                    </div>
                    <div class="c-list" id="comment-list-container"></div>
                    <div class="c-input-area">
                        <img src="" id="c-my-pfp" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                        <input type="text" class="c-input" id="c-input-field" placeholder="Add a comment...">
                        <button class="c-send" onclick="document.querySelector('view-moments').postComment()">Post</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderFeed() {
        const container = this.querySelector('#feed-container');
        if (!container) return;
        
        container.innerHTML = '';
        const myUid = this.auth.currentUser?.uid;

        this.moments.forEach(moment => {
            const isLiked = moment.likes && moment.likes.includes(myUid);
            const timeAgo = this.getRelativeTime(moment.createdAt);
            const card = document.createElement('div');
            card.className = 'm-card';
            card.dataset.id = moment.id;
            
            let mediaHtml = '';
            if (moment.type === 'video') {
                mediaHtml = `<video src="${moment.mediaUrl}" class="m-media" loop muted playsinline></video>`;
            } else if (moment.type === 'image') {
                mediaHtml = `<img src="${moment.mediaUrl}" class="m-media">`;
            } else {
                mediaHtml = `<div class="m-media" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align}; color:#fff; padding:30px; font-size:28px; word-break:break-word;">${moment.text}</div>`;
            }

            const muteIcon = this.isMuted ? 'volume_off' : 'volume_up';
            const cfBadge = moment.audience === 'close_friends' ? `<div style="display:inline-flex; align-items:center; justify-content:center; background:#00ba7c; border-radius:50%; width:14px; height:14px; margin-left:4px;"><svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>` : '';

            card.innerHTML = `
                <div class="m-header">
                    <img src="${moment.pfp}" class="m-pfp">
                    <div class="m-user-info">
                        <div class="m-name-row">
                            ${moment.displayName} 
                            ${moment.verified ? '<span class="material-icons-round m-verified">verified</span>' : ''}
                            <span class="m-timestamp">• ${timeAgo}</span>
                            ${cfBadge}
                        </div>
                        <div class="m-song">
                            ${moment.songName ? `
                                <span class="material-icons-round" style="font-size:12px;">music_note</span>
                                ${moment.songName} • ${moment.songArtist}
                            ` : `<span class="m-username">@${moment.username}</span>`}
                        </div>
                    </div>
                    <span class="material-icons-round" style="color:#fff; cursor:pointer;">more_vert</span>
                </div>

                <div class="m-canvas" onclick="document.querySelector('view-moments').openFullModal('${moment.id}')">
                    ${moment.mediaUrl || moment.songArt ? `<img src="${moment.mediaUrl || moment.songArt}" class="m-backdrop">` : ''}
                    ${mediaHtml}
                    ${moment.songPreview ? `
                        <button class="mute-btn" onclick="event.stopPropagation(); document.querySelector('view-moments').toggleMute()">
                            <span class="material-icons-round" style="font-size:18px;">${muteIcon}</span>
                        </button>
                    ` : ''}
                </div>

                <div class="m-actions">
                    <button class="m-btn ${isLiked ? 'liked' : ''}" onclick="document.querySelector('view-moments').toggleLike('${moment.id}')">
                        <span class="material-icons-round">${isLiked ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button class="m-btn" onclick="document.querySelector('view-moments').openComments('${moment.id}')">
                        <span class="material-icons-round">chat_bubble_outline</span>
                    </button>
                    <button class="m-btn"><span class="material-icons-round">send</span></button>
                </div>
                
                ${moment.caption ? `
                    <div class="m-caption">
                        <span class="m-caption-name">${moment.displayName}</span> ${this.formatCaption(moment.caption)}
                    </div>
                ` : ''}
            `;

            container.appendChild(card);
            
            if(this.observer) this.observer.observe(card);
        });
    }

    formatCaption(text) {
        return text.replace(/(#[a-zA-Z0-9]+)/g, '<span style="color:var(--accent);">$1</span>');
    }

    // --- FULL SCREEN MODAL ---
    async openFullModal(momentId) {
        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;
        
        this.activeMomentId = momentId;
        const modal = this.querySelector('#full-moment-modal');
        const content = this.querySelector('#full-modal-content');
        
        window.history.pushState({ modal: 'momentFull' }, '');
        this.toggleBodyScroll(true);
        modal.classList.add('open');

        const isMe = moment.uid === this.auth.currentUser.uid;
        const viewsCount = moment.viewers ? moment.viewers.length : 0;
        const likesCount = moment.likes ? moment.likes.length : 0;

        let mediaHtml = '';
        if (moment.type === 'video') mediaHtml = `<video src="${moment.mediaUrl}" class="m-media" loop autoplay playsinline ${this.isMuted ? 'muted' : ''}></video>`;
        else if (moment.type === 'image') mediaHtml = `<img src="${moment.mediaUrl}" class="m-media">`;
        else mediaHtml = `<div class="m-media" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align}; color:#fff; padding:30px; font-size:32px; word-break:break-word;">${moment.text}</div>`;

        let viewersHtml = '';
        if (isMe) {
            viewersHtml = `<div class="advanced-viewers-list">`;
            
            const likers = moment.likes || [];
            const viewers = moment.viewers || [];
            const allUids = [...new Set([...likers, ...viewers])];
            
            allUids.sort((a, b) => {
                const aLiked = likers.includes(a);
                const bLiked = likers.includes(b);
                return aLiked === bLiked ? 0 : aLiked ? -1 : 1;
            });

            if (allUids.length === 0) {
                viewersHtml += `<div style="text-align:center; color:#666; font-size:13px; padding: 20px;">No views yet. Share it around!</div>`;
            } else {
                for (let vid of allUids) {
                    try {
                        const vDoc = await this.db.collection('users').doc(vid).get();
                        if (vDoc.exists) {
                            const vData = vDoc.data();
                            const hasLiked = likers.includes(vid);
                            
                            viewersHtml += `
                                <div class="viewer-row">
                                    <div class="viewer-info">
                                        <img src="${vData.photoURL || 'https://via.placeholder.com/40'}" class="viewer-avatar">
                                        <div class="viewer-name">
                                            ${vData.name || vData.username}
                                            ${vData.verified ? '<span class="material-icons-round" style="color:#0095f6; font-size:14px;">verified</span>' : ''}
                                        </div>
                                    </div>
                                    <div class="viewer-action-icon">
                                        ${hasLiked ? 
                                            `<span class="material-icons-round" style="color:#ff3b30; font-size:20px;">favorite</span>` : 
                                            `<span class="material-icons-round" style="color:#888; font-size:20px;">visibility</span>`
                                        }
                                    </div>
                                </div>
                            `;
                        }
                    } catch(e) {}
                }
            }
            viewersHtml += `</div>`;
        }

        const timerDisplay = moment.isActive !== false ? "Active 24h" : "Archived";

        content.innerHTML = `
            <div class="m-canvas" style="aspect-ratio: auto; height: 55vh; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                 ${moment.mediaUrl || moment.songArt ? `<img src="${moment.mediaUrl || moment.songArt}" class="m-backdrop">` : ''}
                 ${mediaHtml}
                 ${moment.songPreview ? `
                    <button class="mute-btn" onclick="document.querySelector('view-moments').toggleMute()">
                        <span class="material-icons-round" style="font-size:18px;">${this.isMuted ? 'volume_off' : 'volume_up'}</span>
                    </button>
                ` : ''}
            </div>
            
            <div style="padding: 20px;">
                <div class="m-header" style="padding:0;">
                    <img src="${moment.pfp}" class="m-pfp">
                    <div class="m-user-info">
                        <div class="m-name-row">${moment.displayName} <span style="font-size:11px; color:#888; font-weight:normal;">• ${this.getRelativeTime(moment.createdAt)}</span></div>
                        ${moment.songName ? `<div class="m-song"><span class="material-icons-round" style="font-size:12px;">music_note</span>${moment.songName}</div>` : ''}
                    </div>
                </div>

                <div class="m-caption" style="padding: 15px 0 0; font-size:15px;">
                    ${this.formatCaption(moment.caption)}
                </div>

                ${isMe ? `
                    <div class="my-stats-box">
                        <div><div class="stat-num">${likesCount}</div><div class="stat-lbl">Likes</div></div>
                        <div><div class="stat-num">${viewsCount}</div><div class="stat-lbl">Views</div></div>
                        <div><div class="stat-num" style="font-size: 14px; margin-top: 4px; color:#00ba7c;">${timerDisplay}</div><div class="stat-lbl">Status</div></div>
                    </div>
                    
                    <div class="m-action-btn-row">
                        <button class="m-action-btn primary" onclick="window.location.href='moments.html'">
                            <span class="material-icons-round">add_circle_outline</span> New
                        </button>
                        <button class="m-action-btn secondary" onclick="document.querySelector('view-moments').archiveMoment('${moment.id}')">
                            <span class="material-icons-round">inventory_2</span> Archive
                        </button>
                        <button class="m-action-btn danger" onclick="document.querySelector('view-moments').deleteMoment('${moment.id}')">
                            <span class="material-icons-round">delete_outline</span> Delete
                        </button>
                    </div>

                    <h3 style="font-size: 14px; margin: 15px 0 5px; border-bottom: 1px solid #222; padding-bottom: 10px;">Activity Viewers</h3>
                    ${viewersHtml}
                ` : ''}
            </div>
        `;

        const feedVideo = this.querySelector(`.m-card[data-id="${momentId}"] video`);
        if(feedVideo) feedVideo.pause();
    }

    closeFullModal(fromHistory = false) {
        const modal = this.querySelector('#full-moment-modal');
        modal.classList.remove('open');
        this.activeMomentId = null;
        this.toggleBodyScroll(false);
        if (!fromHistory && window.history.state?.modal === 'momentFull') {
            window.history.back();
        }
    }

    async archiveMoment(momentId) {
        if(confirm("Archive this moment? It will be removed from feeds but remain in your history.")) {
            await this.db.collection('moments').doc(momentId).update({ isActive: false });
            this.moments = this.moments.filter(m => m.id !== momentId);
            this.closeFullModal();
            this.renderFeed();
        }
    }

    async deleteMoment(momentId) {
        if(confirm("Permanently delete this moment? This cannot be undone.")) {
            await this.db.collection('moments').doc(momentId).delete();
            this.moments = this.moments.filter(m => m.id !== momentId);
            this.closeFullModal();
            this.renderFeed();
        }
    }

    // --- COMMENTS MODAL ---
    async openComments(momentId) {
        this.activeMomentId = momentId;
        const overlay = this.querySelector('#comment-sheet');
        
        if(this.currentUserData) {
            this.querySelector('#c-my-pfp').src = this.currentUserData.photoURL;
        }

        window.history.pushState({ modal: 'momentComments' }, '');
        this.toggleBodyScroll(true);
        overlay.classList.add('open');
        
        this.commentsLastDoc = null;
        this.querySelector('#comment-list-container').innerHTML = '<div class="loader-spinner" style="display:block;"><span class="material-icons-round">refresh</span></div>';
        await this.loadComments(momentId, false);
    }

    closeComments(fromHistory = false) {
        this.querySelector('#comment-sheet').classList.remove('open');
        this.activeMomentId = null;
        this.toggleBodyScroll(false);
        if (!fromHistory && window.history.state?.modal === 'momentComments') {
            window.history.back();
        }
    }

    async loadComments(momentId, isNextPage = false) {
        if (this.loadingComments) return;
        this.loadingComments = true;
        const myUid = this.auth.currentUser?.uid;

        let query = this.db.collection('moments').doc(momentId).collection('comments')
            .orderBy('timestamp', 'desc')
            .limit(10);

        if (isNextPage && this.commentsLastDoc) {
            query = query.startAfter(this.commentsLastDoc);
        }

        const snap = await query.get();
        const cList = this.querySelector('#comment-list-container');
        
        if (!isNextPage) cList.innerHTML = '';
        if (snap.empty && !isNextPage) {
            cList.innerHTML = '<div style="text-align:center; color:#666; padding:30px;">No comments yet. Start the conversation!</div>';
            this.loadingComments = false;
            return;
        }

        if(!snap.empty) this.commentsLastDoc = snap.docs[snap.docs.length - 1];

        snap.forEach(doc => {
            const c = doc.data();
            const timeStr = this.getRelativeTime(c.timestamp);
            const isCommentLiked = c.likes && c.likes.includes(myUid);
            
            const div = document.createElement('div');
            div.className = 'c-item';
            div.innerHTML = `
                <img src="${c.pfp}" class="c-pfp">
                <div class="c-content">
                    <div class="c-name">${c.name}</div>
                    <div class="c-text">${c.text}</div>
                    <div class="c-meta">
                        <span>${timeStr}</span>
                        <span class="c-reply-btn" onclick="document.querySelector('view-moments').replyTo('${c.name || c.username}')">Reply</span>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <span class="material-icons-round c-like-btn" 
                          onclick="document.querySelector('view-moments').toggleCommentLike('${momentId}', '${doc.id}', this)"
                          style="font-size:16px; cursor:pointer; color: ${isCommentLiked ? '#ff3b30' : '#666'};">
                          ${isCommentLiked ? 'favorite' : 'favorite_border'}
                    </span>
                </div>
            `;
            cList.appendChild(div);
        });

        this.loadingComments = false;
    }

    replyTo(username) {
        const input = this.querySelector('#c-input-field');
        input.value = `@${username} `;
        input.focus();
    }

    async toggleCommentLike(momentId, commentId, iconElement) {
        const myUid = this.auth.currentUser?.uid;
        if (!myUid) return;
        
        if(navigator.vibrate) navigator.vibrate(10);
        
        const isCurrentlyLiked = iconElement.innerHTML.trim() === 'favorite';
        const ref = this.db.collection('moments').doc(momentId).collection('comments').doc(commentId);
        
        // Optimistic toggle
        if (isCurrentlyLiked) {
            iconElement.innerHTML = 'favorite_border';
            iconElement.style.color = '#666';
            await ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) });
        } else {
            iconElement.innerHTML = 'favorite';
            iconElement.style.color = '#ff3b30';
            await ref.update({ likes: firebase.firestore.FieldValue.arrayUnion(myUid) });
        }
    }

    async postComment() {
        const input = this.querySelector('#c-input-field');
        const text = input.value.trim();
        if (!text || !this.activeMomentId || !this.currentUserData) return;

        input.value = ''; 
        const momentId = this.activeMomentId;
        const moment = this.moments.find(m => m.id === momentId);

        try {
            await this.db.collection('moments').doc(momentId).collection('comments').add({
                uid: this.currentUserData.uid,
                name: this.currentUserData.name || this.currentUserData.username,
                pfp: this.currentUserData.photoURL,
                text: text,
                likes: [],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.commentsLastDoc = null;
            this.loadComments(momentId, false);

            if (moment && moment.uid !== this.currentUserData.uid) {
                this.sendNotification(moment.uid, 'comment_moment', momentId, `commented: "${text}"`);
            }
        } catch(e) { console.error("Comment error", e); }
    }
}

customElements.define('view-moments', ViewMoments);
