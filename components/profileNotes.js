/**
 * components/profileNotes.js
 * Features: 
 * - Lazy Loading (Pagination) to save Firebase reads.
 * - Premium UI/UX with Glassmorphism and animations.
 * - Active/Archived Status Indicators.
 * - Relative Time formatting (e.g., "2h ago").
 * - Auto-handles Auth and Privacy logic.
 */
class ProfileNotes extends HTMLElement {
    constructor() {
        super();
        this._uid = null;
        this._currentUser = null;
        this.db = firebase.firestore();
        
        // Pagination State
        this.lastDoc = null;      // Last fetched document for cursor
        this.isLoading = false;   // Prevent duplicate fetches
        this.isFinished = false;  // True when no more notes exist
        this.BATCH_SIZE = 10;     // Fetch 10 at a time (Cost efficient)
        this.observer = null;     // Scroll observer
    }

    connectedCallback() {
        this.renderSkeleton();
        // Listen for Auth State Changes
        this.authUnsub = firebase.auth().onAuthStateChanged(user => {
            this._currentUser = user;
            if (this._uid) this.attemptLoad();
            else if (!user) this.renderError("Please log in to view notes.");
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

    // --- HELPER: Relative Time ---
    getRelativeTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds

        if (diff < 60) return 'Just now';
        const m = Math.floor(diff / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        if (d < 7) return `${d}d ago`;
        
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    // --- MAIN LOGIC ---
    async attemptLoad() {
        if (!this._uid || !this._currentUser) return;

        // Reset UI to Skeleton only on initial load
        if (!this.lastDoc) this.renderSkeleton();

        const isMe = (this._currentUser.uid === this._uid);

        if (isMe) {
            this.fetchNotesBatched(true);
            return;
        }

        // Check Mutual Friends
        try {
            const myDoc = await this.db.collection('users').doc(this._currentUser.uid).get();
            const myData = myDoc.data() || {};
            
            const myFollowing = this.normalizeList(myData.following);
            const myFollowers = this.normalizeList(myData.followers);

            // Logic: I follow them AND They follow me
            const iFollowThem = myFollowing.includes(this._uid);
            const theyFollowMe = myFollowers.includes(this._uid);

            if (iFollowThem && theyFollowMe) {
                this.fetchNotesBatched(false);
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
    async fetchNotesBatched(isMine) {
        // Prevent loading if already loading or finished
        if (this.isLoading || this.isFinished) return;
        
        this.isLoading = true;
        const isFirstLoad = this.lastDoc === null;

        try {
            // Build Query
            let query = this.db.collection('notes')
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
                else this.removeLoader(); // Remove spinner if exists
                return;
            }

            // Update Cursor
            this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            // Check if we reached the end (fewer docs than limit)
            if (snapshot.docs.length < this.BATCH_SIZE) {
                this.isFinished = true;
            }

            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (isFirstLoad) {
                this.setupContainer(isMine); // Create initial HTML structure
            }

            this.renderItems(notes, isMine); // Append items
            this.isLoading = false;

            // Setup Intersection Observer for Infinite Scroll
            if (!this.isFinished) {
                this.setupInfiniteScroll(isMine);
            } else {
                this.removeLoader();
            }

        } catch (e) {
            console.error("Fetch Notes Error:", e);
            this.isLoading = false;
            if (isFirstLoad) {
                if (e.message.includes("index")) {
                    this.renderError("System Error: Missing Database Index.");
                } else {
                    this.renderError("Could not load notes.");
                }
            }
        }
    }

    // --- RENDERING LOGIC ---

    setupContainer(isMine) {
        this.innerHTML = `
            <style>
                .pn-container { width: 100%; animation: fadeIn 0.4s ease; padding-bottom: 40px; }
                
                .pn-header { 
                    font-size: 11px; font-weight: 800; color: #666; 
                    text-transform: uppercase; letter-spacing: 1.2px;
                    margin: 25px 0 15px 4px; display: flex; align-items: center; gap: 8px;
                }
                
                .pn-list { display: flex; flex-direction: column; gap: 16px; }

                .pn-item {
                    background: #111; 
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 20px; padding: 18px;
                    display: flex; flex-direction: column; gap: 12px;
                    cursor: pointer; position: relative; overflow: hidden;
                    transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                .pn-item:active { transform: scale(0.98); background: #161616; }

                /* Status Indicator */
                .pn-status-badge {
                    position: absolute; top: 14px; right: 14px;
                    display: flex; align-items: center; gap: 4px;
                    font-size: 9px; font-weight: 700; text-transform: uppercase;
                    padding: 3px 8px; border-radius: 100px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .pn-status-badge.active { background: rgba(0, 210, 255, 0.1); color: #00d2ff; border-color: rgba(0, 210, 255, 0.3); }
                .pn-status-badge.archived { background: rgba(255, 255, 255, 0.05); color: #666; }
                
                .pn-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
                .pn-status-badge.active .pn-dot { box-shadow: 0 0 6px currentColor; animation: pulse 2s infinite; }

                .pn-content { 
                    font-size: 15px; font-weight: 500; color: #fff; 
                    line-height: 1.5; white-space: pre-wrap; word-break: break-word;
                    padding-right: 50px; /* Space for badge */
                }

                .pn-footer { 
                    display: flex; align-items: center; justify-content: space-between;
                    margin-top: 4px; padding-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }

                .pn-meta { font-size: 11px; color: #777; font-weight: 600; display:flex; align-items:center; gap:6px; }

                /* Music Badge */
                .pn-music {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(255,255,255,0.05); padding: 5px 12px;
                    border-radius: 100px; font-size: 11px; color: #ccc; 
                    border: 1px solid rgba(255,255,255,0.05);
                    max-width: 65%;
                }
                .pn-music svg { width: 12px; fill: #00d2ff; flex-shrink: 0; }
                .pn-music span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }

                /* Loader */
                .pn-loader { text-align: center; padding: 20px; color: #666; font-size: 12px; display: none; }
                .pn-loader.show { display: block; }

                @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
            </style>

            <div class="pn-container">
                <div class="pn-header">
                    <span class="material-icons-round" style="font-size:16px; color:#888;">history_edu</span>
                    <span>Note History</span>
                </div>
                <div class="pn-list" id="pn-list-wrapper"></div>
                <div class="pn-loader" id="pn-scroll-loader">Loading more...</div>
                <div id="pn-sentinel"></div>
            </div>
        `;
    }

    renderItems(notes, isMine) {
        const listWrapper = this.querySelector('#pn-list-wrapper');
        if (!listWrapper) return;

        notes.forEach(note => {
            const timeStr = this.getRelativeTime(note.createdAt);
            
            // Background Logic: Use custom if active, else darker fallback
            const customBg = note.bgColor ? note.bgColor : '#111';
            const textColor = note.textColor || '#ffffff';
            const isActive = note.isActive === true;

            const el = document.createElement('div');
            el.className = 'pn-item';
            
            // Only apply colorful background if active, otherwise subtle dark
            if(isActive) {
                el.style.background = customBg;
                el.style.color = textColor;
            }

            el.style.fontFamily = note.font || 'system-ui';

            let musicHtml = '';
            if (note.songName) {
                const borderStyle = isActive ? `border-color:${textColor}30; background:${textColor}15;` : '';
                const iconColor = isActive ? textColor : '#00d2ff';
                musicHtml = `
                <div class="pn-music" style="${borderStyle}">
                    <svg viewBox="0 0 24 24" style="fill:${iconColor}"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <span style="color:${isActive ? textColor : '#ccc'}">${note.songName}</span>
                </div>`;
            }

            el.innerHTML = `
                <div class="pn-status-badge ${isActive ? 'active' : 'archived'}" style="${isActive ? `color:${textColor}; border-color:${textColor}40; background:${textColor}10;` : ''}">
                    <div class="pn-dot"></div>
                    <span>${isActive ? 'Active' : 'Archived'}</span>
                </div>
                
                <div class="pn-content" style="text-align:${note.textAlign || 'left'}">
                    ${note.text || '<i style="opacity:0.7">🎵 Shared a song</i>'}
                </div>

                <div class="pn-footer" style="${isActive ? `border-color:${textColor}20;` : ''}">
                    ${musicHtml || '<div></div>'} 
                    <div class="pn-meta" style="${isActive ? `color:${textColor}cc;` : ''}">
                        ${timeStr} 
                        ${note.likes && note.likes.length > 0 ? `&nbsp;•&nbsp; ${note.likes.length} <span style="font-size:10px; margin-left:2px;">❤️</span>` : ''}
                    </div>
                </div>
            `;

            // Open Modal Handler
            el.onclick = (e) => {
                e.stopPropagation(); 
                const viewer = document.getElementById('view-notes-modal');
                if (viewer && viewer.open) {
                    if(navigator.vibrate) navigator.vibrate(10);
                    // Pass ID and Ownership
                    viewer.open({ ...note, id: note.id }, isMine);
                } else {
                    console.error("Viewer Modal Not Found");
                }
            };
            listWrapper.appendChild(el);
        });
    }

    setupInfiniteScroll(isMine) {
        const sentinel = this.querySelector('#pn-sentinel');
        const loader = this.querySelector('#pn-scroll-loader');
        
        if (!sentinel) return;

        if (this.observer) this.observer.disconnect();

        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && !this.isFinished) {
                if(loader) loader.classList.add('show');
                // Artificial delay for better UX (prevent flickering)
                setTimeout(() => {
                    this.fetchNotesBatched(isMine);
                }, 500);
            }
        }, { threshold: 0.1 });

        this.observer.observe(sentinel);
    }

    removeLoader() {
        const loader = this.querySelector('#pn-scroll-loader');
        if (loader) loader.classList.remove('show');
        const sentinel = this.querySelector('#pn-sentinel');
        if (sentinel) sentinel.remove(); // Remove sentinel to stop observing
    }

    renderPrivate() {
        this.innerHTML = `
            <div style="padding: 50px 20px; text-align: center; color: #555; background: #0a0a0a; border-radius: 18px; margin-top:20px; border:1px dashed #222;">
                <span class="material-icons-round" style="font-size: 32px; margin-bottom: 10px; color:#333;">lock</span>
                <div style="font-weight: 700; font-size: 14px; color: #ccc;">Private Notes</div>
                <div style="font-size: 12px; margin-top: 6px; color:#666;">You must be mutual friends to see this user's history.</div>
            </div>
        `;
    }

    renderEmpty(isMine) {
        this.innerHTML = `
            <div style="padding: 60px 20px; text-align: center; color: #444; margin-top:10px;">
                <span class="material-icons-round" style="font-size: 32px; opacity:0.3; margin-bottom:10px;">speaker_notes_off</span>
                <div style="font-size: 13px; font-weight:500;">${isMine ? 'You haven\'t posted any notes yet.' : 'No notes history found.'}</div>
            </div>
        `;
    }

    renderSkeleton() {
        this.innerHTML = `
            <div style="margin-top:25px; display:flex; flex-direction:column; gap:16px;">
                <div style="height:14px; width:100px; background:#1a1a1a; border-radius:4px;"></div>
                <div style="height:100px; width:100%; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pn-shimmer 1.5s infinite; border-radius:18px;"></div>
                <div style="height:100px; width:100%; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pn-shimmer 1.5s infinite; border-radius:18px;"></div>
            </div>
            <style>@keyframes pn-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }</style>
        `;
    }
    
    renderError(msg) {
        this.innerHTML = `<div style="padding:20px; text-align:center; color:#ff4444; font-size:12px; border:1px solid #333; border-radius:12px; margin-top:20px;">${msg}</div>`;
    }
}

customElements.define('profile-notes', ProfileNotes);
