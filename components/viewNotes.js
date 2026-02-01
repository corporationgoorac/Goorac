/**
 * =======================================================
 * PART 1: THE VIEWER COMPONENT (Bottom Sheet UI)
 * =======================================================
 */
class ViewNotes extends HTMLElement {
    constructor() {
        super();
        this.currentNote = null;
        this.currentUserProfile = null; // Store the fetched user profile
        this.isOwnNote = false;
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
        this.db = firebase.firestore();
        this.unsubscribe = null;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

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

    render() {
        this.innerHTML = `
        <style>
            .vn-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.7); display: none; z-index: 2000;
                justify-content: center; align-items: flex-end;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }
            .vn-sheet {
                background: #1c1c1e; width: 100%; max-width: 500px;
                border-radius: 24px 24px 0 0; padding: 24px 20px;
                transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.32, 1.25, 0.32, 1);
                color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding-bottom: max(30px, env(safe-area-inset-bottom));
                box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
            }
            .vn-overlay.open { display: flex; }
            .vn-overlay.open .vn-sheet { transform: translateY(0); }
            
            .vn-drag-handle { 
                width: 36px; height: 4px; background: #48484a; 
                border-radius: 10px; margin: -10px auto 25px; 
            }

            /* --- NEW UI: Friend Profile Header --- */
            .vn-profile-header {
                display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
            }
            .vn-friend-pfp {
                width: 50px; height: 50px; border-radius: 50%; object-fit: cover;
                border: 1px solid #333;
            }
            .vn-friend-info { display: flex; flex-direction: column; }
            .vn-friend-name { 
                font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 4px; 
            }
            .vn-friend-handle { color: #8e8e93; font-size: 0.85rem; }
            
            .vn-verify-badge {
                width: 14px; height: 14px; background: #00d2ff; display: inline-block; border-radius: 50%;
                mask: url('https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg') no-repeat center / contain;
                -webkit-mask: url('https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg') no-repeat center / contain;
            }

            /* --- NEW UI: Note Card --- */
            .vn-note-card {
                padding: 24px; border-radius: 24px; margin-bottom: 20px;
                text-align: center; position: relative; overflow: hidden;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                min-height: 120px;
            }
            .vn-note-text { 
                font-size: 1.4rem; font-weight: 600; line-height: 1.3; z-index: 2;
                text-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            /* Song Pill */
            .vn-song-pill { 
                display: inline-flex; align-items: center; gap: 8px; 
                background: rgba(255,255,255,0.08); padding: 8px 16px; 
                border-radius: 100px; font-size: 0.85rem; font-weight: 500;
                margin-top: 20px; border: 1px solid rgba(255,255,255,0.05);
                backdrop-filter: blur(5px);
            }
            .vn-music-icon { width: 14px; height: 14px; fill: currentColor; opacity: 0.8; }

            /* Timestamp */
            .vn-timestamp { 
                font-size: 0.75rem; color: #636366; text-align: center; 
                margin-top: 10px; margin-bottom: 20px; font-weight: 500; 
            }

            /* Own Note Specifics */
            .vn-header { text-align: center; margin-bottom: 25px; }
            .vn-pfp-large { width: 85px; height: 85px; border-radius: 50%; object-fit: cover; border: 3px solid #333; margin-bottom: 12px; }
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

            /* Buttons */
            .vn-action-group { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
            .vn-btn { 
                width: 100%; padding: 14px; border-radius: 14px; border: none; 
                font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: opacity 0.2s;
            }
            .vn-btn-primary { background: #007aff; color: white; }
            .vn-btn-danger { background: transparent; color: #ff3b30; }

            /* Interaction Bar */
            .vn-interaction-bar { 
                display: flex; align-items: center; gap: 12px; 
                background: #2c2c2e; padding: 6px 6px 6px 16px; border-radius: 30px;
                border: 0.5px solid #3a3a3c;
            }
            .vn-reply-input { 
                flex: 1; background: none; border: none; color: white; 
                font-size: 0.95rem; padding: 8px 0; outline: none;
            }
            .vn-heart-btn { 
                background: #3a3a3c; border: none; font-size: 1.2rem; cursor: pointer; 
                width: 40px; height: 40px; border-radius: 50%; display: flex; 
                justify-content: center; align-items: center; transition: transform 0.1s;
            }
            .vn-heart-btn:active { transform: scale(0.9); }

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

        window.addEventListener('popstate', (event) => {
            const overlay = this.querySelector('#vn-overlay');
            if (overlay && overlay.classList.contains('open')) {
                this.close(true);
            }
        });
    }

    async open(initialNoteData, isOwnNote = false) {
        if (!initialNoteData && isOwnNote) {
            window.location.href = 'notes.html';
            return;
        }

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.isOwnNote = isOwnNote;
        this.currentNote = initialNoteData;
        this.currentUserProfile = null; // Reset
        
        const overlay = this.querySelector('#vn-overlay');
        const content = this.querySelector('#vn-content');

        if (initialNoteData.songPreview) {
            this.audioPlayer.src = initialNoteData.songPreview;
            this.audioPlayer.play().catch(err => console.log("Audio play deferred"));
        }

        // --- FETCH REAL USER DATA (UI Redesign Requirement) ---
        if (!isOwnNote) {
            try {
                // Fetch the user document from the 'users' collection using the note's UID
                const userDoc = await this.db.collection('users').doc(initialNoteData.uid).get();
                if (userDoc.exists) {
                    this.currentUserProfile = userDoc.data();
                }
            } catch (err) {
                console.error("Error fetching user profile for note:", err);
            }
        }

        // Render with new data
        content.innerHTML = isOwnNote 
            ? this.renderOwnNote(initialNoteData) 
            : this.renderFriendNote(initialNoteData);
            
        overlay.classList.add('open');
        window.history.pushState({ vnOpen: true }, "", "#view-note");
        if(navigator.vibrate) navigator.vibrate(10);
        
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        this.handleActions();

        // Realtime listener for Note updates (likes)
        if (initialNoteData.uid) {
            this.unsubscribe = this.db.collection("active_notes").doc(initialNoteData.uid)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const updatedData = doc.data();
                        this.currentNote = { ...updatedData, uid: doc.id };
                        
                        // Re-render, preserving user profile data if we have it
                        content.innerHTML = this.isOwnNote 
                            ? this.renderOwnNote(this.currentNote) 
                            : this.renderFriendNote(this.currentNote);
                        
                        this.handleActions();
                    } else {
                        this.close();
                    }
                });
        }
    }

    renderOwnNote(note) {
        // Keep original layout for Own Note, just slight clean up
        const timeAgo = this.getRelativeTime(note.createdAt);
        return `
            <div class="vn-header">
                <img src="${note.photoURL || note.pfp || 'https://via.placeholder.com/85'}" class="vn-pfp-large">
                <div class="vn-bubble-text" style="color:${note.textColor || '#fff'}">${note.text || ''}</div>
                ${note.songName ? `
                    <div class="vn-song-pill">
                        <svg class="vn-music-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        <span>${note.songName}</span>
                    </div>
                ` : ''}
                <div class="vn-timestamp">${timeAgo}</div>
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
        const timeAgo = this.getRelativeTime(note.createdAt);
        
        // Use fetched profile data if available, fallback to note data
        const displayPfp = this.currentUserProfile?.photoURL || note.pfp || 'https://via.placeholder.com/85';
        const displayName = this.currentUserProfile?.name || note.username || 'User';
        const displayHandle = this.currentUserProfile?.username ? `@${this.currentUserProfile.username}` : '';
        const isVerified = this.currentUserProfile?.verified === true;

        return `
            <div class="vn-profile-header">
                <img src="${displayPfp}" class="vn-friend-pfp" onclick="window.location.href='userProfile.html?user=${this.currentUserProfile?.username || ''}'">
                <div class="vn-friend-info">
                    <div class="vn-friend-name">
                        ${displayName}
                        ${isVerified ? '<span class="vn-verify-badge"></span>' : ''}
                    </div>
                    <div class="vn-friend-handle">${displayHandle}</div>
                </div>
            </div>

            <div class="vn-note-card" style="background:${note.bgColor || '#262626'}; color:${note.textColor || '#fff'}">
                <div class="vn-note-text">${note.text}</div>
                
                ${note.songName ? `
                    <div class="vn-song-pill">
                        <svg class="vn-music-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        <span>${note.songName} • ${note.songArtist}</span>
                    </div>
                ` : ''}
            </div>

            <div class="vn-timestamp">${timeAgo}</div>

            <div class="vn-interaction-bar">
                <input type="text" class="vn-reply-input" placeholder="Reply to ${displayName}...">
                <button class="vn-heart-btn" id="like-toggle-btn">
                    ${isLiked ? '❤️' : '🤍'}
                </button>
            </div>
        `;
    }

    close(fromHistory = false) {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.audioPlayer.pause();
        this.querySelector('#vn-overlay').classList.remove('open');
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.remove('hidden');

        if (!fromHistory && window.location.hash === "#view-note") {
            window.history.back();
        }
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
                // Pass UID explicitly so the realtime listener works
                if(data) viewer.open({ ...data, uid: user.uid }, true);
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
