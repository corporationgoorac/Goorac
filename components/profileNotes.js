
/**
 * components/profileNotes.js
 * Fixed: Handles Auth, Missing Indexes, and Modal interactions.
 */
class ProfileNotes extends HTMLElement {
    constructor() {
        super();
        this._uid = null;
        this._currentUser = null;
        this.db = firebase.firestore();
    }

    connectedCallback() {
        this.renderSkeleton();
        // Listen for Auth State Changes
        this.authUnsub = firebase.auth().onAuthStateChanged(user => {
            this._currentUser = user;
            if(this._uid) this.attemptLoad();
            else if(!user) this.renderError("Please log in.");
        });
    }

    disconnectedCallback() {
        if (this.authUnsub) this.authUnsub();
    }

    set uid(val) {
        if (this._uid === val) return;
        this._uid = val;
        // If auth is already ready, load immediately. Otherwise wait for listener.
        if(this._currentUser) this.attemptLoad();
    }

    get uid() { return this._uid; }

    // --- MAIN LOGIC ---
    async attemptLoad() {
        if (!this._uid || !this._currentUser) return;

        // Reset UI to Skeleton
        this.renderSkeleton();

        const isMe = (this._currentUser.uid === this._uid);

        if (isMe) {
            this.fetchAndRenderNotes(true);
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
                this.fetchAndRenderNotes(false);
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

    // --- DATA FETCHING ---
    async fetchAndRenderNotes(isMine) {
        try {
            // Note: This query requires a Firestore Index: Collection 'notes', Fields: uid (Asc/Desc), createdAt (Desc)
            const snapshot = await this.db.collection('notes')
                .where('uid', '==', this._uid)
                .orderBy('createdAt', 'desc')
                .limit(30)
                .get();

            if (snapshot.empty) {
                this.renderEmpty(isMine);
                return;
            }

            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderList(notes, isMine);

        } catch (e) {
            console.error("Fetch Notes Error:", e);
            if (e.message.includes("index")) {
                this.renderError("System Error: Missing Database Index. Check Console.");
            } else {
                this.renderError("Could not load notes.");
            }
        }
    }

    // --- RENDERING ---
    renderList(notes, isMine) {
        let html = `
            <style>
                .pn-container { width: 100%; animation: fadeIn 0.4s ease; padding-bottom: 20px; }
                .pn-header { 
                    font-size: 11px; font-weight: 800; color: #666; 
                    text-transform: uppercase; letter-spacing: 1px;
                    margin: 15px 0 15px 4px; display: flex; align-items: center; gap: 6px;
                }
                .pn-list { display: flex; flex-direction: column; gap: 12px; }
                .pn-item {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px; padding: 14px;
                    display: flex; flex-direction: column; gap: 8px;
                    cursor: pointer; position: relative; overflow: hidden;
                    transition: 0.2s;
                }
                .pn-item:active { transform: scale(0.98); background: rgba(255,255,255,0.08); }

                .pn-top { display: flex; justify-content: space-between; align-items: flex-start; }
                .pn-text { 
                    font-size: 14px; font-weight: 500; color: #eee; line-height: 1.4;
                    white-space: pre-wrap; word-break: break-word;
                }
                .pn-meta { 
                    font-size: 11px; color: #777; font-weight: 500; 
                    display: flex; align-items: center; gap: 6px; margin-top: 4px;
                }
                .pn-music {
                    display: inline-flex; align-items: center; gap: 5px;
                    background: rgba(0, 210, 255, 0.1); padding: 4px 10px;
                    border-radius: 50px; width: fit-content;
                    font-size: 11px; color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.2);
                }
                .pn-music svg { width: 12px; fill: #00d2ff; }
                .pn-dot { width: 6px; height: 6px; border-radius: 50%; background: #444; }
                .pn-dot.active { background: #00d2ff; box-shadow: 0 0 6px rgba(0,210,255,0.6); }

                @keyframes fadeIn { from { opacity:0; transform: translateY(5px); } to { opacity:1; transform: translateY(0); } }
            </style>

            <div class="pn-container">
                <div class="pn-header">
                    <span class="material-icons-round" style="font-size:14px;">history</span>
                    Recent Notes
                </div>
                <div class="pn-list" id="pn-list-wrapper"></div>
            </div>
        `;

        this.innerHTML = html;
        const listWrapper = this.querySelector('#pn-list-wrapper');

        notes.forEach(note => {
            const dateObj = note.createdAt ? note.createdAt.toDate() : new Date();
            const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            const el = document.createElement('div');
            el.className = 'pn-item';
            
            let songHtml = '';
            if (note.songName) {
                songHtml = `
                <div class="pn-music">
                    <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <span>${note.songName}</span>
                </div>`;
            }

            el.innerHTML = `
                <div class="pn-top">
                    <div class="pn-text">${note.text || '<i>🎵 Music</i>'}</div>
                    <div class="pn-dot ${note.isActive ? 'active' : ''}"></div>
                </div>
                ${songHtml}
                <div class="pn-meta">
                    <span>${dateStr}</span>
                    ${note.likes && note.likes.length > 0 ? ` • ${note.likes.length} likes` : ''}
                </div>
            `;

            // === ROBUST CLICK HANDLER ===
            el.onclick = (e) => {
                e.stopPropagation(); // Prevent bubbling
                const viewer = document.getElementById('view-notes-modal');
                if (viewer && viewer.open) {
                    if(navigator.vibrate) navigator.vibrate(10);
                    // Open with ID and "isMine" status
                    viewer.open({ ...note, id: note.id }, isMine);
                } else {
                    console.error("ViewNotes modal not found or not ready!", viewer);
                    alert("Error opening note viewer.");
                }
            };
            listWrapper.appendChild(el);
        });
    }

    renderPrivate() {
        this.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #555; background: rgba(255,255,255,0.02); border-radius: 12px; margin-top:20px; border:1px dashed #333;">
                <span class="material-icons-round" style="font-size: 28px; margin-bottom: 8px;">lock</span>
                <div style="font-weight: 600; font-size: 14px; color: #ccc;">Private History</div>
                <div style="font-size: 12px; margin-top: 4px;">Must be mutual friends to view notes.</div>
            </div>
        `;
    }

    renderEmpty(isMine) {
        this.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #555; margin-top:10px;">
                <div style="font-size: 13px;">${isMine ? 'No notes yet.' : 'User has no note history.'}</div>
            </div>
        `;
    }

    renderSkeleton() {
        this.innerHTML = `
            <div style="margin-top:20px; display:flex; flex-direction:column; gap:12px;">
                <div style="height:12px; width:80px; background:#1a1a1a; border-radius:4px;"></div>
                <div style="height:70px; width:100%; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pn-shimmer 1.5s infinite; border-radius:12px;"></div>
                <div style="height:70px; width:100%; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pn-shimmer 1.5s infinite; border-radius:12px;"></div>
            </div>
            <style>@keyframes pn-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }</style>
        `;
    }

    renderError(msg) {
        this.innerHTML = `<div style="padding:20px; text-align:center; color:#ff4444; font-size:12px; border:1px solid #333; border-radius:12px; margin-top:20px;">${msg}</div>`;
    }
}

customElements.define('profile-notes', ProfileNotes);
