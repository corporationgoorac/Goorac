/**
 * components/profileMoments.js
 * Features: 
 * - Lazy Loading (Pagination with 12 items per batch for a 3-column grid)
 * - Premium Grid UI mimicking Reels/Stories
 * - Active (Colored Ring) vs Archived Status Indicators
 * - Text, Image, and Video Moment type rendering
 * - Auto-handles Auth, Close Friends, and Mutuals Privacy logic
 */
class ProfileMoments extends HTMLElement {
    constructor() {
        super();
        this._uid = null;
        this._currentUser = null;
        this.db = firebase.firestore();
        
        // Pagination State
        this.lastDoc = null;      
        this.isLoading = false;   
        this.isFinished = false;  
        this.BATCH_SIZE = 12; // Multiple of 3 for perfect grid rows    
        this.observer = null;     
    }

    connectedCallback() {
        this.renderSkeleton();
        // Listen for Auth State Changes
        this.authUnsub = firebase.auth().onAuthStateChanged(user => {
            this._currentUser = user;
            if (this._uid) this.attemptLoad();
            else if (!user) this.renderError("Please log in to view moments.");
        });
    }

    disconnectedCallback() {
        if (this.authUnsub) this.authUnsub();
        if (this.observer) this.observer.disconnect();
    }

    set uid(val) {
        if (this._uid === val) return;
        this._uid = val;
        // Reset pagination state on new user
        this.lastDoc = null;
        this.isFinished = false;
        this.isLoading = false;
        
        if (this._currentUser) this.attemptLoad();
    }

    get uid() { return this._uid; }

    // --- HELPER: Views/Numbers Formatter ---
    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    // --- MAIN LOGIC ---
    async attemptLoad() {
        if (!this._uid || !this._currentUser) return;

        // Reset UI to Skeleton only on initial load
        if (!this.lastDoc) this.renderSkeleton();

        const isMe = (this._currentUser.uid === this._uid);

        if (isMe) {
            this.fetchMomentsBatched(true);
            return;
        }

        // Check Mutual Friends for Privacy
        try {
            const myDoc = await this.db.collection('users').doc(this._currentUser.uid).get();
            const myData = myDoc.data() || {};
            
            const myFollowing = this.normalizeList(myData.following);
            const myFollowers = this.normalizeList(myData.followers);

            // Logic: I follow them AND They follow me
            const iFollowThem = myFollowing.includes(this._uid);
            const theyFollowMe = myFollowers.includes(this._uid);

            if (iFollowThem && theyFollowMe) {
                this.fetchMomentsBatched(false);
            } else {
                this.renderPrivate();
            }

        } catch (e) {
            console.error("Privacy Check Failed:", e);
            this.renderError("Error checking friendship status.");
        }
    }

    normalizeList(list) {
        if (!list) return [];
        return list.map(item => (typeof item === 'string' ? item : item.uid));
    }

    // --- DATA FETCHING (PAGINATED) ---
    async fetchMomentsBatched(isMine) {
        // Prevent loading if already loading or finished
        if (this.isLoading || this.isFinished) return;
        
        this.isLoading = true;
        const isFirstLoad = this.lastDoc === null;

        try {
            // Build Query
            let query = this.db.collection('moments')
                .where('uid', '==', this._uid)
                .orderBy('createdAt', 'desc')
                .limit(this.BATCH_SIZE);

            // If not first page, start after last doc
            if (this.lastDoc) {
                query = query.startAfter(this.lastDoc);
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                this.isFinished = true;
                this.isLoading = false;
                if (isFirstLoad) this.renderEmpty(isMine);
                else this.removeLoader(); 
                return;
            }

            // Update Cursor
            this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            // Check if we reached the end 
            if (snapshot.docs.length < this.BATCH_SIZE) {
                this.isFinished = true;
            }

            // Process Moments & Filter Close Friends / Expired
            let moments = [];
            const now = new Date();
            
            // If viewing someone else's profile, get their CF list
            let authorCFList = [];
            if (!isMine) {
                const userDoc = await this.db.collection('users').doc(this._uid).get();
                if(userDoc.exists) authorCFList = userDoc.data().closeFriends || [];
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                
                // Determine if moment is actively 24h or archived
                let isExpired = false;
                if (data.expiresAt && data.expiresAt.toDate) {
                    isExpired = data.expiresAt.toDate() < now;
                }
                
                // Set calculated active state safely
                data._calculatedActive = (data.isActive !== false && !isExpired);

                if (isMine) {
                    // I can see all my moments (active and archived)
                    moments.push({ id: doc.id, ...data });
                } else {
                    // Force hide if purely inactive/deleted from feeds by owner
                    if (data.isActive === false) return; 

                    if (data.audience === 'close_friends') {
                        // Only add if I am in their list
                        if (authorCFList.includes(this._currentUser.uid)) {
                            moments.push({ id: doc.id, ...data });
                        }
                    } else {
                        moments.push({ id: doc.id, ...data });
                    }
                }
            });

            if (isFirstLoad) {
                this.setupContainer(isMine); // Create initial HTML structure
            }

            // If filtered out all moments, fetch next page automatically
            if (moments.length === 0 && !this.isFinished) {
                this.isLoading = false;
                this.fetchMomentsBatched(isMine);
                return;
            }

            this.renderItems(moments, isMine); // Append items
            this.isLoading = false;

            // Setup Intersection Observer for Infinite Scroll
            if (!this.isFinished) {
                this.setupInfiniteScroll(isMine);
            } else {
                this.removeLoader();
            }

        } catch (e) {
            console.error("Fetch Moments Error:", e);
            this.isLoading = false;
            if (isFirstLoad) {
                if (e.message.includes("index")) {
                    this.renderError("System Error: Missing Database Index for Moments.");
                } else {
                    this.renderError("Could not load moments.");
                }
            }
        }
    }

    // --- RENDERING LOGIC ---
    setupContainer(isMine) {
        this.innerHTML = `
            <style>
                .pm-container { width: 100%; animation: fadeIn 0.4s ease; padding-bottom: 40px; }
                
                .pm-header { 
                    font-size: 11px; font-weight: 800; color: #666; 
                    text-transform: uppercase; letter-spacing: 1.2px;
                    margin: 25px 0 15px 4px; display: flex; align-items: center; gap: 8px;
                }
                
                .pm-grid { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 3px; 
                    width: calc(100% + 48px); /* Bleed out of profile padding to edges */
                    margin-left: -24px;
                }

                .pm-item {
                    position: relative;
                    aspect-ratio: 9/16; 
                    background: #111;
                    cursor: pointer;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .pm-item:active { opacity: 0.8; }

                /* Media Layouts */
                .pm-media { width: 100%; height: 100%; object-fit: cover; }
                .pm-text-card { 
                    width: 100%; height: 100%; 
                    display: flex; align-items: center; justify-content: center; 
                    padding: 8px; text-align: center; color: #fff;
                    font-size: 11px; font-weight: 700; word-break: break-word; line-height: 1.3;
                }

                /* Overlays */
                .pm-overlay {
                    position: absolute; inset: 0; 
                    background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 30%);
                    display: flex; flex-direction: column; justify-content: flex-end; 
                    padding: 8px; pointer-events: none;
                }
                
                .pm-stats { 
                    display: flex; align-items: center; gap: 4px; 
                    font-size: 11px; font-weight: 700; color: #fff; 
                }
                .pm-stats .material-icons-round { font-size: 14px; }

                /* Type Indicators (Top Right) */
                .pm-type-icon { 
                    position: absolute; top: 6px; right: 6px; 
                    font-size: 16px; color: rgba(255,255,255,0.9); 
                    text-shadow: 0 1px 4px rgba(0,0,0,0.6); 
                }

                /* Close Friends Badge */
                .pm-cf-badge {
                    position: absolute; top: 6px; left: 6px;
                    background: #00ba7c; color: #fff;
                    border-radius: 50%; width: 18px; height: 18px;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                }
                .pm-cf-badge svg { width: 10px; fill: currentColor; }

                /* Active Ring */
                .pm-active-ring {
                    position: absolute; inset: 0;
                    border: 2px solid var(--accent, #00d2ff);
                    pointer-events: none;
                    z-index: 10;
                }

                /* Loader */
                .pm-loader { text-align: center; padding: 20px; color: #666; font-size: 12px; display: none; }
                .pm-loader.show { display: block; }
                
                @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
            </style>

            <div class="pm-container">
                <div class="pm-header">
                    <span class="material-icons-round" style="font-size:16px; color:#888;">view_carousel</span>
                    <span>Moments</span>
                </div>
                <div class="pm-grid" id="pm-grid-wrapper"></div>
                <div class="pm-loader" id="pm-scroll-loader">Loading more...</div>
                <div id="pm-sentinel"></div>
            </div>
        `;
    }

    renderItems(moments, isMine) {
        const gridWrapper = this.querySelector('#pm-grid-wrapper');
        if (!gridWrapper) return;

        moments.forEach(moment => {
            const viewsCount = moment.viewers ? moment.viewers.length : 0;
            const el = document.createElement('div');
            el.className = 'pm-item';
            
            let mediaContent = '';
            let typeIcon = '';

            // Render Media based on Type
            if (moment.type === 'video') {
                mediaContent = `<video src="${moment.mediaUrl}" class="pm-media" muted playsinline></video>`;
                typeIcon = `<span class="material-icons-round pm-type-icon">play_circle_outline</span>`;
            } else if (moment.type === 'image') {
                mediaContent = `<img src="${moment.mediaUrl}" class="pm-media" loading="lazy">`;
                typeIcon = `<span class="material-icons-round pm-type-icon">photo</span>`;
            } else {
                // Text Moment
                const bg = moment.bgColor || '#ff007f';
                mediaContent = `<div class="pm-text-card" style="background:${bg}; font-family:${moment.font || 'system-ui'}">${moment.text || ''}</div>`;
                typeIcon = `<span class="material-icons-round pm-type-icon">title</span>`;
            }

            // Close friends badge
            const cfHtml = moment.audience === 'close_friends' 
                ? `<div class="pm-cf-badge"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>` 
                : '';

            // Active Ring for <24h moments
            const activeRingHtml = moment._calculatedActive ? `<div class="pm-active-ring"></div>` : '';

            el.innerHTML = `
                ${mediaContent}
                ${activeRingHtml}
                ${cfHtml}
                ${typeIcon}
                <div class="pm-overlay">
                    <div class="pm-stats">
                        <span class="material-icons-round">play_arrow</span>
                        <span>${this.formatNumber(viewsCount)}</span>
                    </div>
                </div>
            `;

            // Open Modal Handler
            el.onclick = (e) => {
                e.stopPropagation(); 
                if(navigator.vibrate) navigator.vibrate(10);
                
                // Assuming there is a global modal for viewing moments
                const viewerModal = document.getElementById('view-moments-modal');
                if (viewerModal && typeof viewerModal.open === 'function') {
                    viewerModal.open({ ...moment, id: moment.id }, isMine);
                } 
                // Fallback to the feed's view-moments component if we are re-using it
                else {
                    const feedViewer = document.querySelector('view-moments');
                    if (feedViewer && typeof feedViewer.openFullModal === 'function') {
                        // Inject this moment into the viewer's array temporarily if it's not there
                        if (!feedViewer.moments.find(m => m.id === moment.id)) {
                            feedViewer.moments.push(moment);
                        }
                        feedViewer.openFullModal(moment.id);
                    } else {
                        console.warn("No moments viewer component found on this page.");
                        this.showFallbackToast("Could not open moment viewer.");
                    }
                }
            };
            gridWrapper.appendChild(el);
        });
    }

    setupInfiniteScroll(isMine) {
        const sentinel = this.querySelector('#pm-sentinel');
        const loader = this.querySelector('#pm-scroll-loader');
        
        if (!sentinel) return;
        if (this.observer) this.observer.disconnect();

        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && !this.isFinished) {
                if(loader) loader.classList.add('show');
                // Artificial delay for smoother UX
                setTimeout(() => {
                    this.fetchMomentsBatched(isMine);
                }, 500);
            }
        }, { threshold: 0.1 });

        this.observer.observe(sentinel);
    }

    removeLoader() {
        const loader = this.querySelector('#pm-scroll-loader');
        if (loader) loader.classList.remove('show');
        const sentinel = this.querySelector('#pm-sentinel');
        if (sentinel) sentinel.remove(); 
    }

    showFallbackToast(msg) {
        const existing = document.getElementById('toast');
        if (existing) {
            document.getElementById('toast-msg').innerText = msg;
            existing.classList.add('show');
            setTimeout(() => existing.classList.remove('show'), 2500);
        } else {
            alert(msg);
        }
    }

    renderPrivate() {
        this.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #555; background: #0a0a0a; border-radius: 18px; margin-top:20px; border:1px dashed #222;">
                <span class="material-icons-round" style="font-size: 32px; margin-bottom: 10px; color:#333;">lock</span>
                <div style="font-weight: 700; font-size: 14px; color: #ccc;">Private Moments</div>
                <div style="font-size: 12px; margin-top: 6px; color:#666;">You must be mutual friends to see this user's gallery.</div>
            </div>
        `;
    }

    renderEmpty(isMine) {
        this.innerHTML = `
            <div style="padding: 50px 20px; text-align: center; color: #444; margin-top:10px;">
                <span class="material-icons-round" style="font-size: 36px; opacity:0.3; margin-bottom:10px;">hide_image</span>
                <div style="font-size: 13px; font-weight:500;">${isMine ? 'You haven\'t posted any moments yet.' : 'No moments found.'}</div>
            </div>
        `;
    }

    renderSkeleton() {
        // Creates a 3-column grid of empty loading boxes
        this.innerHTML = `
            <div style="margin-top:25px; display:flex; flex-direction:column; gap:16px;">
                <div style="height:14px; width:100px; background:#1a1a1a; border-radius:4px;"></div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:3px; width: calc(100% + 48px); margin-left:-24px;">
                    <div style="aspect-ratio: 9/16; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pm-shimmer 1.5s infinite;"></div>
                    <div style="aspect-ratio: 9/16; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pm-shimmer 1.5s infinite; animation-delay: 0.2s;"></div>
                    <div style="aspect-ratio: 9/16; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pm-shimmer 1.5s infinite; animation-delay: 0.4s;"></div>
                </div>
            </div>
            <style>@keyframes pm-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }</style>
        `;
    }
    
    renderError(msg) {
        this.innerHTML = `<div style="padding:20px; text-align:center; color:#ff4444; font-size:12px; border:1px solid #333; border-radius:12px; margin-top:20px;">${msg}</div>`;
    }
}

customElements.define('profile-moments', ProfileMoments);
