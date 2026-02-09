/**
 * components/profileNotes.js
 * Handles fetching and displaying note history with Privacy Logic.
 */
class ProfileNotes extends HTMLElement {
    constructor() {
        super();
        this._uid = null;
        this.db = firebase.firestore();
        this.auth = firebase.auth();
    }

    set uid(val) {
        if (this._uid === val) return;
        this._uid = val;
        this.init();
    }

    get uid() { return this._uid; }

    connectedCallback() {
        this.renderSkeleton();
    }

    // --- 1. INITIALIZATION & PRIVACY CHECK ---
    async init() {
        if (!this.uid) return;
        this.renderSkeleton();

        const user = this.auth.currentUser;
        if (!user) {
            this.renderError("Please login to view notes.");
            return;
        }

        // Case A: It's Me
        if (user.uid === this.uid) {
            this.fetchAndRenderNotes(true); // true = isOwnProfile
            return;
        }

        // Case B: Other User (Check Mutuals)
        try {
            // Check if I follow them AND they follow me
            // We can check this efficiently by looking at MY relationships
            const myDoc = await this.db.collection('users').doc(user.uid).get();
            const myData = myDoc.data() || {};
            
            const myFollowing = this.normalizeList(myData.following);
            const myFollowers = this.normalizeList(myData.followers);

            const iFollowThem = myFollowing.includes(this.uid);
            const theyFollowMe = myFollowers.includes(this.uid);

            if (iFollowThem && theyFollowMe) {
                this.fetchAndRenderNotes(false);
            } else {
                this.renderPrivate();
            }

        } catch (e) {
            console.error("Privacy check failed", e);
            this.renderError("Could not load history.");
        }
    }

    normalizeList(list) {
        if (!list) return [];
        return list.map(item => (typeof item === 'string' ? item : item.uid));
    }

    // --- 2. DATA FETCHING ---
    async fetchAndRenderNotes(isMine) {
        try {
            // Fetch last 30 notes, ordered by newest
            const snapshot = await this.db.collection('notes')
                .where('uid', '==', this.uid)
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
            console.error("Error fetching notes:", e);
            this.renderError("Failed to load notes.");
        }
    }

    // --- 3. RENDERING ---
    renderList(notes, isMine) {
        let html = `
            <style>
                .pn-container { padding: 10px 0; width: 100%; animation: fadeIn 0.4s ease; }
                .pn-header { 
                    font-size: 13px; font-weight: 700; color: #666; 
                    text-transform: uppercase; letter-spacing: 1.2px;
                    margin-bottom: 20px; padding-left: 5px; 
                    display: flex; align-items: center; gap: 8px;
                }
                
                .pn-list { display: flex; flex-direction: column; gap: 15px; }

                .pn-item {
                    background: #151515; border: 1px solid #222;
                    border-radius: 16px; padding: 16px;
                    display: flex; flex-direction: column; gap: 10px;
                    cursor: pointer; position: relative; overflow: hidden;
                    transition: transform 0.2s, background 0.2s;
                }
                .pn-item:active { transform: scale(0.98); background: #1a1a1a; }

                .pn-top { display: flex; justify-content: space-between; align-items: flex-start; }
                
                .pn-text { 
                    font-size: 15px; font-weight: 500; color: #fff; line-height: 1.5;
                    white-space: pre-wrap; word-break: break-word;
                }

                .pn-meta { 
                    font-size: 11px; color: #666; font-weight: 500; 
                    display: flex; align-items: center; gap: 6px; margin-top: 5px;
                }
                
                /* Music Badge */
                .pn-music {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(255,255,255,0.05); padding: 6px 10px;
                    border-radius: 100px; width: fit-content;
                    font-size: 12px; color: #ccc; border: 1px solid rgba(255,255,255,0.05);
                }
                .pn-music svg { width: 12px; fill: #00d2ff; }

                /* Status Dot */
                .pn-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: #333; display: inline-block;
                }
                .pn-dot.active { background: #00d2ff; box-shadow: 0 0 8px rgba(0,210,255,0.4); }

                @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
            </style>

            <div class="pn-container">
                <div class="pn-header">
                    <span class="material-icons-round" style="font-size:16px;">history</span>
                    Note History
                </div>
                <div class="pn-list" id="pn-list-wrapper"></div>
            </div>
        `;

        this.innerHTML = html;
        const listWrapper = this.querySelector('#pn-list-wrapper');

        notes.forEach(note => {
            const dateObj = note.createdAt ? note.createdAt.toDate() : new Date();
            const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            
            const el = document.createElement('div');
            el.className = 'pn-item';
            el.innerHTML = `
                <div class="pn-top">
                    <div class="pn-text">${note.text || '<i>🎵 Music Note</i>'}</div>
                    <div class="pn-dot ${note.isActive ? 'active' : ''}" title="${note.isActive ? 'Currently Active' : 'Archived'}"></div>
                </div>
                
                ${note.songName ? `
                <div class="pn-music">
                    <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <span>${note.songName}</span>
                </div>` : ''}

                <div class="pn-meta">
                    <span>${dateStr}</span> • <span>${timeStr}</span>
                    ${note.likes && note.likes.length > 0 ? `• ${note.likes.length} likes` : ''}
                </div>
            `;

            // CLICK HANDLER: Open the ViewNotes Modal
            el.onclick = () => {
                const viewer = document.querySelector('view-notes');
                if (viewer) {
                    if(navigator.vibrate) navigator.vibrate(10);
                    // Open modal. Logic inside viewNotes.js handles "My Note" vs "Friend Note" UI
                    viewer.open(note, isMine);
                }
            };

            listWrapper.appendChild(el);
        });
    }

    // --- 4. STATE HELPERS ---

    renderPrivate() {
        this.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #666; background: rgba(255,255,255,0.02); border-radius: 16px; margin-top:20px; border:1px dashed #333;">
                <span class="material-icons-round" style="font-size: 32px; margin-bottom: 10px;">lock</span>
                <div style="font-weight: 600; font-size: 15px; color: #fff;">Notes are Private</div>
                <div style="font-size: 13px; margin-top: 5px;">You must be mutual friends to see history.</div>
            </div>
        `;
    }

    renderEmpty(isMine) {
        this.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #666; margin-top:20px;">
                <span class="material-icons-round" style="font-size: 28px; opacity:0.5;">sticky_note_2</span>
                <div style="font-size: 14px; margin-top: 8px;">${isMine ? 'You haven\'t posted any notes yet.' : 'No notes history found.'}</div>
            </div>
        `;
    }

    renderSkeleton() {
        this.innerHTML = `
            <div style="margin-top:30px; display:flex; flex-direction:column; gap:15px;">
                <div style="height:15px; width:100px; background:#1a1a1a; border-radius:4px;"></div>
                <div style="height:80px; width:100%; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pn-shimmer 1.5s infinite; border-radius:16px;"></div>
                <div style="height:80px; width:100%; background:linear-gradient(90deg, #111, #1a1a1a, #111); background-size:200% 100%; animation:pn-shimmer 1.5s infinite; border-radius:16px;"></div>
            </div>
            <style>@keyframes pn-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }</style>
        `;
    }
    
    renderError(msg) {
        this.innerHTML = `<div style="padding:20px; text-align:center; color:#ff4444; font-size:13px;">${msg}</div>`;
    }
}

customElements.define('profile-notes', ProfileNotes);
