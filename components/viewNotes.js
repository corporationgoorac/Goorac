/**
 * =======================================================
 * PART 1: THE VIEWER COMPONENT (Bottom Sheet UI)
 * =======================================================
 */
class ViewNotes extends HTMLElement {
    constructor() {
        super();
        this.currentNote = null;
        this.isOwnNote = false;
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
        this.db = firebase.firestore();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.innerHTML = `
        <style>
            .vn-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); display: none; z-index: 2000;
                justify-content: center; align-items: flex-end;
                backdrop-filter: blur(4px);
            }
            .vn-sheet {
                background: #1c1c1e; width: 100%; max-width: 500px;
                border-radius: 20px 20px 0 0; padding: 24px 20px;
                transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding-bottom: max(30px, env(safe-area-inset-bottom));
            }
            .vn-overlay.open { display: flex; }
            .vn-overlay.open .vn-sheet { transform: translateY(0); }
            
            .vn-drag-handle { 
                width: 40px; height: 5px; background: #333; 
                border-radius: 10px; margin: -10px auto 20px; 
            }

            .vn-header { text-align: center; margin-bottom: 25px; }
            .vn-pfp-large { width: 85px; height: 85px; border-radius: 50%; object-fit: cover; border: 3px solid #333; margin-bottom: 12px; }
            
            .vn-song-tag { 
                display: inline-flex; align-items: center; gap: 6px; 
                background: rgba(255,255,255,0.1); padding: 6px 14px; 
                border-radius: 20px; font-size: 0.85rem; font-weight: 600;
            }

            .vn-bubble-text { 
                font-size: 1.1rem; font-weight: 500; margin: 15px 0; 
                line-height: 1.4; color: #fff;
            }

            .vn-timestamp { font-size: 0.75rem; color: #8e8e93; margin-top: 5px; }

            .vn-likers-section { 
                max-height: 250px; overflow-y: auto; 
                margin-top: 20px; border-top: 0.5px solid #333; padding-top: 15px; 
            }
            .vn-liker-item { 
                display: flex; align-items: center; justify-content: space-between; 
                margin-bottom: 15px; animation: vnFadeIn 0.3s ease;
            }
            .vn-liker-info { display: flex; align-items: center; gap: 12px; }
            .vn-pfp-small { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }

            .vn-action-group { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
            .vn-btn { 
                width: 100%; padding: 14px; border-radius: 14px; border: none; 
                font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: opacity 0.2s;
            }
            .vn-btn:active { opacity: 0.7; }
            .vn-btn-primary { background: #007aff; color: white; }
            .vn-btn-danger { background: transparent; color: #ff3b30; }

            .vn-interaction-bar { 
                display: flex; align-items: center; gap: 12px; margin-top: 20px; 
                background: #262626; padding: 8px 16px; border-radius: 30px;
            }
            .vn-reply-input { 
                flex: 1; background: none; border: none; color: white; 
                font-size: 0.95rem; padding: 8px 0; outline: none;
            }
            .vn-heart-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 5px; }

            @keyframes vnFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        </style>

        <div class="vn-overlay" id="vn-overlay">
            <div class="vn-sheet">
                <div class="vn-drag-handle"></div>
                <div id="vn-content"></div>
            </div>
        </div>
        `;
    }

    setupEventListeners() {
        this.querySelector('#vn-overlay').onclick = (e) => {
            if (e.target.id === 'vn-overlay') this.close();
        };
    }

    async open(noteData, isOwnNote = false) {
        if (!noteData && isOwnNote) {
            window.location.href = 'notes.html';
            return;
        }

        this.currentNote = noteData;
        this.isOwnNote = isOwnNote;
        const overlay = this.querySelector('#vn-overlay');
        const content = this.querySelector('#vn-content');

        if (noteData.songPreview) {
            this.audioPlayer.src = noteData.songPreview;
            this.audioPlayer.play().catch(err => console.log("Audio play deferred"));
        }

        content.innerHTML = isOwnNote ? this.renderOwnNote(noteData) : this.renderFriendNote(noteData);
        overlay.classList.add('open');
        if(navigator.vibrate) navigator.vibrate(10);
        
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        this.handleActions();
    }

    renderOwnNote(note) {
        return `
            <div class="vn-header">
                <img src="${note.photoURL || note.pfp || 'https://via.placeholder.com/85'}" class="vn-pfp-large">
                <div class="vn-bubble-text" style="color:${note.textColor || '#fff'}">${note.text || ''}</div>
                ${note.songName ? `
                    <div class="vn-song-tag">
                        <svg viewBox="0 0 24 24" style="width:14px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        <span>${note.songName}</span>
                    </div>
                ` : ''}
                <div class="vn-timestamp">Shared ${note.timeString || 'Recently'}</div>
            </div>

            <div class="vn-likers-section">
                <div style="font-weight:700; font-size:0.9rem; margin-bottom:15px; color:#8e8e93;">Activity</div>
                ${note.likes && note.likes.length > 0 ? note.likes.map(liker => `
                    <div class="vn-liker-item">
                        <div class="vn-liker-info">
                            <img src="${liker.photoURL || 'https://via.placeholder.com/44'}" class="vn-pfp-small">
                            <span style="font-weight:600;">${liker.displayName || 'Friend'}</span>
                        </div>
                        <span style="color:#ff3b30;">❤️</span>
                    </div>
                `).join('') : `
                    <div style="text-align:center; padding:20px; color:#8e8e93; font-size:0.9rem;">No likes yet</div>
                `}
            </div>

            <div class="vn-action-group">
                <button class="vn-btn vn-btn-primary" onclick="window.location.href='notes.html'">Leave a new note</button>
                <button class="vn-btn vn-btn-danger" id="delete-note-btn">Delete note</button>
            </div>
        `;
    }

    renderFriendNote(note) {
        const user = firebase.auth()?.currentUser;
        const isLiked = note.likes?.some(l => l.uid === user?.uid);

        return `
            <div class="vn-header">
                <img src="${note.photoURL || note.pfp || 'https://via.placeholder.com/85'}" class="vn-pfp-large">
                <div style="font-weight:700; margin-bottom:5px;">${note.username || 'User'}</div>
                <div class="vn-bubble-text" style="background:${note.bgColor || '#262626'}; color:${note.textColor || '#fff'}; padding:12px 20px; border-radius:22px; display:inline-block;">
                    ${note.text}
                </div>
                ${note.songName ? `
                    <div style="margin-top:10px;">
                        <div class="vn-song-tag">
                             <svg viewBox="0 0 24 24" style="width:14px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                             <span>${note.songName} • ${note.songArtist}</span>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="vn-interaction-bar">
                <input type="text" class="vn-reply-input" placeholder="Reply to ${note.username || 'user'}...">
                <button class="vn-heart-btn" id="like-toggle-btn">
                    ${isLiked ? '❤️' : '🤍'}
                </button>
            </div>
        `;
    }

    close() {
        this.audioPlayer.pause();
        this.querySelector('#vn-overlay').classList.remove('open');
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.remove('hidden');
    }

    handleActions() {
        const deleteBtn = this.querySelector('#delete-note-btn');
        if(deleteBtn) {
            deleteBtn.onclick = async () => {
                if(confirm("Delete this note?")) {
                    const user = firebase.auth().currentUser;
                    try {
                        await this.db.collection("active_notes").doc(user.uid).delete();
                        this.close();
                    } catch(e) { console.error("Delete failed", e); }
                }
            };
        }

        const likeBtn = this.querySelector('#like-toggle-btn');
        if(likeBtn) {
            likeBtn.onclick = async () => {
                const user = firebase.auth().currentUser;
                if(!user) return;

                if(navigator.vibrate) navigator.vibrate(15);
                const isCurrentlyLiked = likeBtn.innerText === '❤️';
                const noteRef = this.db.collection("active_notes").doc(this.currentNote.uid);

                likeBtn.innerText = isCurrentlyLiked ? '🤍' : '❤️';

                try {
                    if (!isCurrentlyLiked) {
                        await noteRef.update({
                            likes: firebase.firestore.FieldValue.arrayUnion({
                                uid: user.uid,
                                displayName: user.displayName || "User",
                                photoURL: user.photoURL || ""
                            })
                        });
                    } else {
                        const likerObj = this.currentNote.likes.find(l => l.uid === user.uid);
                        if (likerObj) {
                            await noteRef.update({
                                likes: firebase.firestore.FieldValue.arrayRemove(likerObj)
                            });
                        }
                    }
                } catch (e) { console.error("Like toggle failed", e); }
            };
        }
    }
}

customElements.define('view-notes', ViewNotes);


/**
 * =======================================================
 * PART 2: THE NOTES MANAGER (Batched Query Logic)
 * =======================================================
 * This version calculates Mutual Friends first, then 
 * specifically requests ONLY their notes.
 * This solves the "New Follower" issue.
 */
const NotesManager = {
    init: function() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.setupMyNote(user);
                this.loadMutualNotes(user);
            }
        });
    },

    // 1. My Note Bubble
    setupMyNote: function(user) {
        const db = firebase.firestore();
        db.collection("active_notes").doc(user.uid).onSnapshot(doc => {
            const btn = document.getElementById('my-note-btn');
            const preview = document.getElementById('my-note-preview');
            if (!btn || !preview) return; 

            const data = doc.exists ? doc.data() : null;

            if(data) {
                preview.style.display = 'block';
                preview.innerText = data.text;
                btn.classList.add('has-note');
            } else {
                preview.style.display = 'none';
                btn.classList.remove('has-note');
            }

            btn.onclick = () => {
                const viewer = document.querySelector('view-notes');
                if(data) viewer.open(data, true);
                else window.location.href = 'notes.html';
            };
        });
    },

    // 2. Load Mutual Notes (Batched Query - The Fix)
    loadMutualNotes: async function(user) {
        const db = firebase.firestore();
        const container = document.getElementById('notes-container');
        if(!container) return;

        try {
            // A. Identify Mutual Friends UIDs
            const myProfileDoc = await db.collection("users").doc(user.uid).get();
            const myData = myProfileDoc.data() || {};
            const myFollowing = myData.following || []; 
            const myFollowers = myData.followers || []; 

            // Strict Mutual: I follow them AND they follow me
            const mutualUIDs = myFollowing.filter(uid => myFollowers.includes(uid));

            if(mutualUIDs.length === 0) {
                // No mutuals, clear any existing notes
                const existing = container.querySelectorAll('.friend-note');
                existing.forEach(e => e.remove());
                return;
            }

            // B. Chunking (Firestore 'IN' query limit is 30)
            const chunks = [];
            while(mutualUIDs.length > 0) {
                chunks.push(mutualUIDs.splice(0, 30));
            }

            // C. Perform Batched Queries (Ask DB for these specific UIDs)
            const queries = chunks.map(chunk => {
                return db.collection("active_notes")
                    // We query by Document ID because in active_notes, DocID = UserID
                    .where(firebase.firestore.FieldPath.documentId(), "in", chunk) 
                    .get();
            });

            // Wait for all chunks
            const snapshots = await Promise.all(queries);
            
            // D. Process & Merge
            let allNotes = [];
            const now = new Date();

            snapshots.forEach(snap => {
                snap.forEach(doc => {
                    const note = doc.data();
                    const isActive = note.expiresAt ? note.expiresAt.toDate() > now : true;
                    if(isActive) {
                        allNotes.push({ ...note, uid: doc.id });
                    }
                });
            });

            // Sort: Newest First
            allNotes.sort((a, b) => {
                const ta = a.createdAt ? a.createdAt.toMillis() : 0;
                const tb = b.createdAt ? b.createdAt.toMillis() : 0;
                return tb - ta;
            });

            // E. Render
            const existingFriends = container.querySelectorAll('.friend-note');
            existingFriends.forEach(e => e.remove());

            allNotes.forEach(note => {
                const div = document.createElement('div');
                div.className = 'note-item friend-note has-note';
                div.innerHTML = `
                    <div class="note-bubble" style="background:${note.bgColor || '#262626'}; color:${note.textColor || '#fff'}">
                        ${note.text}
                    </div>
                    <img src="${note.pfp || 'https://via.placeholder.com/65'}" class="note-pfp">
                    <span class="note-username">${(note.username || 'User').split(' ')[0]}</span>
                `;
                
                div.onclick = () => {
                    const viewer = document.querySelector('view-notes');
                    const nav = document.querySelector('main-navbar');
                    if(nav) nav.classList.add('hidden');
                    viewer.open(note, false);
                };
                
                container.appendChild(div);
            });

        } catch (e) {
            console.error("Error loading notes:", e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => NotesManager.init());
