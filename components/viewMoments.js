/**
 * =======================================================
 * viewMoments.js - Goorac Quantum Immersive Feed
 * =======================================================
 */

class ViewMoments extends HTMLElement {
    constructor() {
        super();
        this.db = null;
        this.auth = null;
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

    getIcons() {
        return {
            heartEmpty: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            heartFilled: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#ff3b30" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            send: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0095f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
            verified: `<span class="material-icons-round" style="color:#0095f6; font-size:16px; margin-left:4px; vertical-align:middle;">verified</span>`,
            closeFriendsBadge: `<div style="display:inline-flex; align-items:center; justify-content:center; background:#00ba7c; border-radius:50%; width:18px; height:18px; margin-left:6px; box-shadow:0 0 5px rgba(0,186,124,0.4);"><svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>`
        };
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

    async connectedCallback() {
        if (window.firebase) {
            this.db = firebase.firestore();
            this.auth = firebase.auth();
        }

        this.render();
        this.setupEventListeners();
        
        // Render from cache immediately
        this.loadCachedMoments();
        
        if (this.auth) {
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const doc = await this.db.collection('users').doc(user.uid).get();
                    this.currentUserData = { uid: user.uid, ...doc.data() };
                    this.initFeed(user.uid);
                }
            });
        }
    }

    setupEventListeners() {
        window.addEventListener('scroll', () => {
            if (!this.loading && !this.feedEnd && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
                this.fetchMoments(true);
            }
        });

        const cList = this.querySelector('#comment-list-container');
        if(cList) {
            cList.addEventListener('scroll', () => {
                if (!this.loadingComments && (cList.scrollTop + cList.clientHeight >= cList.scrollHeight - 100)) {
                    this.loadComments(this.activeMomentId, true);
                }
            });
        }

        window.addEventListener('popstate', (e) => {
            if (this.querySelector('#full-moment-modal').classList.contains('open') && (!e.state || e.state.modal !== 'momentFull')) {
                this.closeFullModal(true);
            }
            if (this.querySelector('#comment-sheet').classList.contains('open') && (!e.state || e.state.modal !== 'momentComments')) {
                this.closeComments(true);
            }
        });
    }

    async initFeed(uid) {
        await this.fetchRelations(uid);
        this.setupMediaObserver();
        this.fetchMoments();
    }

    async fetchRelations(uid) {
        try {
            // Mutual Followers Logic - Handling both pure string arrays and object arrays
            const followingDoc = await this.db.collection('follows').doc(uid).get();
            const rawFollowing = followingDoc.data()?.uids || followingDoc.data()?.following || [];
            
            const followersDoc = await this.db.collection('followers').doc(uid).get();
            const rawFollowers = followersDoc.data()?.uids || followersDoc.data()?.followers || [];

            const mapUid = (i) => typeof i === 'string' ? i : i.uid;
            const myFollowing = rawFollowing.map(mapUid);
            const myFollowers = rawFollowers.map(mapUid);

            this.mutualUids = myFollowing.filter(id => myFollowers.includes(id));
            this.mutualUids.push(uid); // Always include myself

            // Close Friends Logic
            const cfDoc = await this.db.collection('close_friends').doc(uid).get();
            const rawCF = cfDoc.data()?.uids || cfDoc.data()?.closeFriends || [];
            this.myCF = rawCF.map(mapUid);
        } catch(e) { console.error("Relations error", e); }
    }

    async fetchMoments(isNextPage = false) {
        if (this.loading || this.feedEnd) return;
        this.loading = true;
        this.querySelector('#feed-loader').style.display = 'block';

        let query = this.db.collection('moments')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(20); 

        if (isNextPage && this.lastDoc) {
            query = query.startAfter(this.lastDoc);
        }

        try {
            const snap = await query.get();
            if (snap.empty) {
                this.feedEnd = true;
                this.loading = false;
                this.querySelector('#feed-loader').style.display = 'none';
                return;
            }

            this.lastDoc = snap.docs[snap.docs.length - 1];
            
            let newMoments = [];
            const now = new Date();

            for (let doc of snap.docs) {
                const data = doc.data();
                
                // Expiry Check
                const expiresAt = data.expiresAt ? (data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)) : new Date(0);
                if (expiresAt < now) {
                    doc.ref.update({ isActive: false });
                    continue; // Skip rendering expired moment
                }
                
                // FILTER: Mutuals Only
                if (!this.mutualUids.includes(data.uid)) continue;

                // FILTER: Close Friends Only 
                if (data.audience === 'close_friends' && data.uid !== this.auth.currentUser.uid) {
                    const creatorCF = await this.db.collection('users').doc(data.uid).get();
                    const allowedListRaw = creatorCF.data()?.closeFriends || [];
                    const allowedList = allowedListRaw.map(i => typeof i === 'string' ? i : i.uid);
                    if (!allowedList.includes(this.auth.currentUser.uid)) continue;
                }

                newMoments.push({ id: doc.id, ...data });
                if (newMoments.length >= 8) break; // Reached target for this batch
            }

            if (isNextPage) {
                this.moments = [...this.moments, ...newMoments];
            } else {
                this.moments = newMoments;
                localStorage.setItem('goorac_moments_cache', JSON.stringify(this.moments.slice(0, 10))); 
            }

            this.renderFeed();
            
            // If we filtered out too many and got none, recursively fetch next
            if (newMoments.length === 0 && !this.feedEnd) {
                this.loading = false;
                this.fetchMoments(true);
                return;
            }

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
            
            // Clean cache of expired moments before rendering
            this.moments = parsedCache.filter(m => {
                const exp = m.expiresAt ? new Date(m.expiresAt.seconds ? m.expiresAt.seconds * 1000 : m.expiresAt) : new Date(0);
                return exp > now;
            });
            
            localStorage.setItem('goorac_moments_cache', JSON.stringify(this.moments));
            this.renderFeed();
        }
    }

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
        if (!moment.viewers) moment.viewers = [];
        
        if (moment.uid !== myUid && !moment.viewers.includes(myUid)) {
            try {
                moment.viewers.push(myUid); // Optimistic UI Update
                await this.db.collection('moments').doc(momentId).update({
                    viewers: firebase.firestore.FieldValue.arrayUnion(myUid)
                });
            } catch(e) { console.error("Seen tracking error", e); }
        }
    }

    // --- LIKES & NOTIFICATIONS ---
    async toggleLike(momentId) {
        const myUid = this.auth.currentUser.uid;
        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;

        if(!moment.likes) moment.likes = [];
        const isLiked = moment.likes.includes(myUid);
        const ref = this.db.collection('moments').doc(momentId);

        // Optimistic UI update
        if (isLiked) {
            moment.likes = moment.likes.filter(id => id !== myUid);
            this.renderFeed();
            await ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) });
            
            // Remove notification 
            if (moment.uid !== myUid) {
                const notifId = `like_moment_${myUid}_${momentId}`;
                await this.db.collection('notifications').doc(notifId).delete().catch(()=>{});
            }
        } else {
            moment.likes.push(myUid);
            this.renderFeed();
            await ref.update({ likes: firebase.firestore.FieldValue.arrayUnion(myUid) });
            
            if (moment.uid !== myUid) {
                this.sendNotification(moment.uid, 'like_moment', momentId, 'liked your moment.', moment.caption || moment.text || '');
            }
        }
    }

    async sendNotification(toUid, type, referenceId, body, noteText = '') {
        if (!this.currentUserData || toUid === this.currentUserData.uid) return;
        
        const notifId = `${type}_${this.currentUserData.uid}_${referenceId}`;
        const notifRef = this.db.collection('notifications').doc(notifId);
        const receiverRef = this.db.collection('users').doc(toUid);
        
        try {
            const docSnap = await notifRef.get();
            if (!docSnap.exists) {
                const batch = this.db.batch();
                batch.set(notifRef, {
                    type: type,
                    toUid: toUid,
                    fromUid: this.currentUserData.uid,
                    senderName: this.currentUserData.name || this.currentUserData.username || 'User',
                    senderPfp: this.currentUserData.photoURL || 'https://via.placeholder.com/65',
                    isSenderVerified: this.currentUserData.verified || false,
                    referenceId: referenceId,
                    body: body,
                    noteText: noteText,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    isSeen: false
                });
                batch.update(receiverRef, { unreadCount: firebase.firestore.FieldValue.increment(1) });
                await batch.commit();
            }
        } catch(e) { console.error("Notification failed:", e); }
    }

    // --- UI RENDERING ---
    render() {
        this.innerHTML = `
            <style>
                .moments-container { display: flex; flex-direction: column; background: #000; width: 100%; }
                
                /* Feed Card */
                .m-card { width: 100%; border-bottom: 1px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 10px; }
                .m-header { display: flex; align-items: center; padding: 12px 15px; gap: 10px; }
                .m-pfp { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
                .m-user-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
                .m-name-row { display: flex; align-items: center; gap: 4px; font-weight: 700; font-size: 14.5px; color: #fff; }
                .m-timestamp { font-size: 12px; color: #888; font-weight: 500; display:flex; align-items:center; gap:6px; }
                .m-song { font-size: 11px; color: #fff; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
                
                .m-canvas { 
                    width: 100%; aspect-ratio: 4/5; background: #050505; 
                    position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; border: 1px solid rgba(255,255,255,0.05);
                }
                .m-media { width: 100%; height: 100%; object-fit: contain; z-index: 2; position: relative; }
                .m-backdrop { position: absolute; inset: -10%; width: 120%; height: 120%; object-fit: cover; filter: blur(30px) brightness(0.4); z-index: 0; }
                
                .mute-btn { position: absolute; bottom: 15px; right: 15px; z-index: 10; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color:#fff; border:1px solid rgba(255,255,255,0.1); cursor:pointer;}
                
                .m-actions { display: flex; padding: 12px 15px; gap: 20px; align-items: center; }
                .m-btn { background: none; border: none; color: #fff; padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;}
                .m-btn:active { transform: scale(0.9); }
                .liked svg path { fill: #ff3b30; stroke: #ff3b30; }

                .m-caption { padding: 0 15px 10px; font-size: 14px; color: #fff; line-height: 1.4; word-break: break-word; }
                .m-caption-name { font-weight: 700; margin-right: 5px; }

                /* Full Screen Modal */
                .m-full-modal {
                    position: fixed; inset: 0; background: #000; z-index: 2000;
                    transform: translateX(100%); transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
                    display: flex; flex-direction: column; width: 100vw; height: 100dvh;
                }
                .m-full-modal.open { transform: translateX(0); }
                .m-full-header { padding: calc(15px + env(safe-area-inset-top)) 20px 15px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #1a1a1a; }
                
                /* Viewers List UI */
                .my-stats-box { background: #111; border-radius: 16px; padding: 15px; margin: 15px 0; display: flex; justify-content: space-around; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
                .stat-num { font-weight: 800; font-size: 20px; color: #fff; }
                .stat-lbl { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
                
                .viewer-item { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; background:rgba(255,255,255,0.03); padding:12px; border-radius:16px; border:1px solid rgba(255,255,255,0.02); }

                /* Comment Bottom Sheet */
                .c-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); z-index: 3000; display: none; align-items: flex-end; opacity: 0; transition: 0.3s; }
                .c-overlay.open { display: flex; opacity: 1; }
                .c-sheet { width: 100%; height: 75vh; background: #121212; border-top-left-radius: 24px; border-top-right-radius: 24px; display: flex; flex-direction: column; transform: translateY(100%); transition: 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); box-shadow: 0 -10px 40px rgba(0,0,0,0.5); }
                .c-overlay.open .c-sheet { transform: translateY(0); }
                
                .c-header { display: flex; justify-content: center; padding: 12px; border-bottom: 1px solid #222; position: relative; }
                .c-drag { width: 40px; height: 5px; background: #444; border-radius: 10px; }
                .c-title { position: absolute; top: 15px; font-weight: 700; font-size: 14px; }
                
                .c-list { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 20px; }
                .c-item { display: flex; gap: 12px; }
                .c-pfp { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
                .c-content { flex: 1; }
                .c-name { font-weight: 700; font-size: 13px; color: #fff; margin-bottom: 2px; }
                .c-text { font-size: 14px; color: #eee; line-height: 1.4; }
                .c-meta { display: flex; gap: 15px; font-size: 11px; color: #888; margin-top: 6px; font-weight: 600; }
                
                .c-input-area { padding: 10px 15px calc(15px + env(safe-area-inset-bottom)); border-top: 1px solid #222; display: flex; align-items: center; gap: 10px; background: #121212; }
                .c-input { flex: 1; background: #222; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 15px; border-radius: 20px; font-size: 14px; outline: none; transition: border 0.2s;}
                .c-input:focus { border-color: #0095f6; }
                .c-send { color: #0095f6; font-weight: 700; background: none; border: none; padding: 8px; cursor: pointer; }

                /* Loader */
                .loader-spinner { text-align: center; padding: 20px; color: #fff; display: none; }
                .loader-spinner .material-icons-round { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            </style>

            <div class="moments-container" id="feed-container"></div>
            <div class="loader-spinner" id="feed-loader"><span class="material-icons-round">refresh</span></div>

            <div class="m-full-modal" id="full-moment-modal">
                <div class="m-full-header">
                    <span class="material-icons-round" onclick="document.querySelector('view-moments').closeFullModal()" style="cursor:pointer; font-size:28px;">arrow_back</span>
                    <span style="font-weight: 700; font-size: 16px;">Moment</span>
                </div>
                <div id="full-modal-content" style="flex:1; overflow-y:auto; overflow-x:hidden;"></div>
            </div>

            <div class="c-overlay" id="comment-sheet" onclick="if(event.target === this) document.querySelector('view-moments').closeComments()">
                <div class="c-sheet" onclick="event.stopPropagation()">
                    <div class="c-header" onclick="document.querySelector('view-moments').closeComments()"><div class="c-drag"></div><div class="c-title">Comments</div></div>
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
        const icons = this.getIcons();

        this.moments.forEach(moment => {
            const isLiked = moment.likes && moment.likes.includes(myUid);
            const isCF = moment.audience === 'close_friends';
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
                const effectClass = (moment.effect && moment.effect !== 'none') ? `fx-${moment.effect}` : '';
                mediaHtml = `<div class="m-media" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align}; color:#fff; padding:30px; font-size:28px; word-break:break-word;"><span class="${effectClass}">${moment.text}</span></div>`;
            }

            const muteIcon = this.isMuted ? 'volume_off' : 'volume_up';

            card.innerHTML = `
                <div class="m-header">
                    <img src="${moment.pfp}" class="m-pfp">
                    <div class="m-user-info">
                        <div class="m-name-row">
                            ${moment.displayName} 
                            ${moment.verified ? icons.verified : ''}
                        </div>
                        <div class="m-timestamp">
                            ${timeAgo}
                            ${isCF ? icons.closeFriendsBadge : ''}
                        </div>
                        ${moment.songName ? `
                            <div class="m-song">
                                <span class="material-icons-round" style="font-size:12px;">music_note</span>
                                ${moment.songName} • ${moment.songArtist}
                            </div>
                        ` : ''}
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
                        ${isLiked ? icons.heartFilled : icons.heartEmpty}
                    </button>
                    <button class="m-btn" onclick="document.querySelector('view-moments').openComments('${moment.id}')">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </button>
                    <button class="m-btn">${icons.send}</button>
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
        return text.replace(/(#[a-zA-Z0-9]+)/g, '<span style="color:#0095f6;">$1</span>');
    }

    // --- FULL SCREEN MODAL & VIEWERS ---
    async openFullModal(momentId) {
        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;
        
        this.activeMomentId = momentId;
        const modal = this.querySelector('#full-moment-modal');
        const content = this.querySelector('#full-modal-content');
        const icons = this.getIcons();
        
        window.history.pushState({ modal: 'momentFull' }, '');
        modal.classList.add('open');

        const isMe = moment.uid === this.auth.currentUser.uid;
        const viewsCount = moment.viewers ? moment.viewers.length : 0;
        const likesCount = moment.likes ? moment.likes.length : 0;

        let mediaHtml = '';
        if (moment.type === 'video') {
            mediaHtml = `<video src="${moment.mediaUrl}" class="m-media" loop autoplay playsinline ${this.isMuted ? 'muted' : ''}></video>`;
        } else if (moment.type === 'image') {
            mediaHtml = `<img src="${moment.mediaUrl}" class="m-media">`;
        } else {
            const effectClass = (moment.effect && moment.effect !== 'none') ? `fx-${moment.effect}` : '';
            mediaHtml = `<div class="m-media" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align}; color:#fff; padding:30px; font-size:32px; word-break:break-word;"><span class="${effectClass}">${moment.text}</span></div>`;
        }

        let viewersSection = '';
        if (isMe) {
            viewersSection = `
                <div class="my-stats-box">
                    <div><div class="stat-num">${likesCount}</div><div class="stat-lbl">Likes</div></div>
                    <div><div class="stat-num">${viewsCount}</div><div class="stat-lbl">Views</div></div>
                </div>
                <div id="modal-viewers-list" style="margin-top:20px;">
                    <div style="color:#aaa; font-size:12px; font-weight:800; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">Viewers List</div>
                    <div id="viewers-content"><div class="loader-spinner" style="display:block;"><span class="material-icons-round">refresh</span></div></div>
                </div>
            `;
        }

        content.innerHTML = `
            <div class="m-canvas" style="aspect-ratio: auto; height: 65vh; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                 ${moment.mediaUrl || moment.songArt ? `<img src="${moment.mediaUrl || moment.songArt}" class="m-backdrop">` : ''}
                 ${mediaHtml}
                 ${moment.songPreview ? `
                    <button class="mute-btn" onclick="document.querySelector('view-moments').toggleMute()">
                        <span class="material-icons-round" style="font-size:18px;">${this.isMuted ? 'volume_off' : 'volume_up'}</span>
                    </button>
                ` : ''}
            </div>
            
            <div style="padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom));">
                <div class="m-header" style="padding:0; margin-bottom:15px;">
                    <img src="${moment.pfp}" class="m-pfp">
                    <div class="m-user-info">
                        <div class="m-name-row">${moment.displayName}</div>
                        ${moment.songName ? `<div class="m-song"><span class="material-icons-round" style="font-size:12px;">music_note</span>${moment.songName}</div>` : ''}
                    </div>
                </div>

                ${moment.caption ? `<div class="m-caption" style="padding: 0 0 15px; font-size:15px; border-bottom: 1px solid rgba(255,255,255,0.05);">${this.formatCaption(moment.caption)}</div>` : ''}

                ${isMe ? `
                    ${viewersSection}
                    <div style="display:flex; gap:10px; margin-top:25px;">
                        <button style="flex:1; padding:14px; border-radius:16px; background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.2); font-weight:700; cursor:pointer;" onclick="document.querySelector('view-moments').deleteMoment('${moment.id}')">Delete Moment</button>
                    </div>
                ` : ''}
            </div>
        `;

        if (isMe) this.loadViewersList(moment);

        const feedVideo = this.querySelector(`.m-card[data-id="${momentId}"] video`);
        if(feedVideo) feedVideo.pause();
    }

    async loadViewersList(moment) {
        const container = this.querySelector('#viewers-content');
        if (!container || !moment.viewers || moment.viewers.length === 0) {
            if (container) container.innerHTML = '<div style="color:#666; font-size:13px; text-align:center; padding:20px;">No viewers yet.</div>';
            return;
        }
        
        const likes = moment.likes || [];
        const icons = this.getIcons();
        
        // Sort: Likers at the top
        const sortedViewers = [...moment.viewers].sort((a, b) => likes.includes(b) - likes.includes(a));
        
        let html = '';
        for (let uid of sortedViewers) {
            try {
                const doc = await this.db.collection('users').doc(uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    const hasLiked = likes.includes(uid);
                    html += `
                        <div class="viewer-item">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <img src="${data.photoURL || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border: 1px solid rgba(255,255,255,0.1);">
                                <div style="font-size:14px; font-weight:700; color:#fff; display:flex; align-items:center;">
                                    ${data.name || data.username || 'User'}
                                    ${data.verified ? icons.verified : ''}
                                </div>
                            </div>
                            ${hasLiked ? `<span style="color:#ff3b30;">${icons.heartFilled}</span>` : ''}
                        </div>
                    `;
                }
            } catch (e) { console.error("Error loading viewer", e); }
        }
        container.innerHTML = html;
    }

    closeFullModal(fromHistory = false) {
        const modal = this.querySelector('#full-moment-modal');
        modal.classList.remove('open');
        this.activeMomentId = null;
        if (!fromHistory && window.history.state?.modal === 'momentFull') {
            window.history.back();
        }
    }

    async deleteMoment(momentId) {
        if(confirm("Delete this moment permanently?")) {
            await this.db.collection('moments').doc(momentId).update({ isActive: false });
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
        overlay.classList.add('open');
        
        this.commentsLastDoc = null;
        this.querySelector('#comment-list-container').innerHTML = '<div class="loader-spinner" style="display:block;"><span class="material-icons-round">refresh</span></div>';
        await this.loadComments(momentId, false);
    }

    closeComments(fromHistory = false) {
        this.querySelector('#comment-sheet').classList.remove('open');
        this.activeMomentId = null;
        if (!fromHistory && window.history.state?.modal === 'momentComments') {
            window.history.back();
        }
    }

    async loadComments(momentId, isNextPage = false) {
        if (this.loadingComments) return;
        this.loadingComments = true;

        let query = this.db.collection('moments').doc(momentId).collection('comments')
            .orderBy('timestamp', 'desc')
            .limit(15);

        if (isNextPage && this.commentsLastDoc) {
            query = query.startAfter(this.commentsLastDoc);
        }

        const snap = await query.get();
        const cList = this.querySelector('#comment-list-container');
        
        if (!isNextPage) cList.innerHTML = '';
        if (snap.empty && !isNextPage) {
            cList.innerHTML = '<div style="text-align:center; color:#666; padding:40px 20px;">No comments yet. Start the conversation!</div>';
            this.loadingComments = false;
            return;
        }

        if(!snap.empty) this.commentsLastDoc = snap.docs[snap.docs.length - 1];

        snap.forEach(doc => {
            const c = doc.data();
            const timeStr = this.getRelativeTime(c.timestamp);
            
            const div = document.createElement('div');
            div.className = 'c-item';
            div.innerHTML = `
                <img src="${c.pfp}" class="c-pfp">
                <div class="c-content">
                    <div class="c-name">${c.name}</div>
                    <div class="c-text">${c.text}</div>
                    <div class="c-meta">
                        <span>${timeStr}</span>
                        <span style="cursor:pointer;">Reply</span>
                    </div>
                </div>
                <span class="material-icons-round" style="font-size:16px; color:#666; margin-top:5px; cursor:pointer;">favorite_border</span>
            `;
            cList.appendChild(div);
        });

        this.loadingComments = false;
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
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.commentsLastDoc = null;
            this.loadComments(momentId, false);

            if (moment && moment.uid !== this.currentUserData.uid) {
                this.sendNotification(moment.uid, 'comment_moment', momentId, `commented: "${text}"`, moment.caption || moment.text || '');
            }
        } catch(e) { console.error("Comment error", e); }
    }
}

customElements.define('view-moments', ViewMoments);
