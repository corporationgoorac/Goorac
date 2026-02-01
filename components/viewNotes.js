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
        this._handlePopState = this._handlePopState.bind(this);
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        window.addEventListener('popstate', this._handlePopState);
    }

    disconnectedCallback() {
        window.removeEventListener('popstate', this._handlePopState);
    }

    _handlePopState(event) {
        // When back button is pressed, close the UI
        const overlay = this.querySelector('#vn-overlay');
        if (overlay && overlay.classList.contains('open')) {
            this.internalClose();
        }
    }

    render() {
        this.innerHTML = `
        <style>
            .vn-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); display: none; z-index: 2000;
                justify-content: center; align-items: flex-end;
                backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                opacity: 0; transition: opacity 0.3s ease;
            }
            .vn-overlay.open { display: flex; opacity: 1; }
            
            .vn-sheet {
                background: #1c1c1e; width: 100%; max-width: 500px;
                border-radius: 24px 24px 0 0; padding: 10px 0 30px 0;
                transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
                color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding-bottom: max(30px, env(safe-area-inset-bottom));
                display: flex; flex-direction: column;
                max-height: 85vh;
            }
            .vn-overlay.open .vn-sheet { transform: translateY(0); }
            
            .vn-drag-handle { 
                width: 36px; height: 4px; background: #3a3a3c; 
                border-radius: 10px; margin: 12px auto 25px; 
            }

            .vn-content-wrapper {
                padding: 0 24px;
                overflow-y: auto;
            }

            /* --- NEW HEADER UI --- */
            .vn-header-profile {
                display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;
            }
            
            .vn-pfp-ring {
                padding: 3px; border-radius: 50%; 
                border: 2px solid #333; margin-bottom: 10px;
            }
            .vn-pfp-large { 
                width: 75px; height: 75px; border-radius: 50%; 
                object-fit: cover; display: block;
            }

            .vn-user-row {
                display: flex; align-items: center; gap: 4px;
                margin-bottom: 2px;
            }
            .vn-username {
                font-weight: 700; font-size: 1rem; letter-spacing: -0.3px;
            }
            .vn-verified-badge {
                width: 14px; height: 14px; fill: #3897f0;
            }
            .vn-time-text {
                font-size: 0.75rem; color: #8e8e93; font-weight: 500;
            }

            /* --- NOTE BUBBLE --- */
            .vn-bubble-container {
                display: flex; justify-content: center; margin-bottom: 25px;
            }
            .vn-bubble-text { 
                font-size: 1.1rem; font-weight: 500; margin: 0; 
                line-height: 1.4; color: #fff; text-align: center;
                background: #2c2c2e; padding: 16px 24px; border-radius: 22px;
                position: relative; max-width: 90%;
            }
            
            /* Song Chip */
            .vn-song-pill { 
                display: inline-flex; align-items: center; gap: 6px; 
                background: rgba(255,255,255,0.08); padding: 6px 14px; 
                border-radius: 100px; font-size: 0.75rem; font-weight: 600;
                margin-top: 15px; color: #ccc;
            }

            /* --- FOOTER / ACTIONS --- */
            .vn-interaction-bar { 
                display: flex; align-items: center; gap: 12px; margin-top: 15px; 
                background: #2c2c2e; padding: 6px 6px 6px 16px; border-radius: 30px;
            }
            .vn-reply-input { 
                flex: 1; background: none; border: none; color: white; 
                font-size: 0.95rem; padding: 8px 0; outline: none;
            }
            .vn-heart-btn { 
                background: #3a3a3c; border: none; width: 36px; height: 36px;
                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                font-size: 1.1rem; cursor: pointer; transition: transform 0.1s;
            }
            .vn-heart-btn:active { transform: scale(0.9); }

            .vn-btn-danger { 
                width: 100%; padding: 14px; border-radius: 14px; border: none; 
                font-weight: 600; font-size: 0.95rem; cursor: pointer; 
                background: rgba(255, 59, 48, 0.15); color: #ff453a; margin-top: 10px;
            }
        </style>

        <div class="vn-overlay" id="vn-overlay">
            <div class="vn-sheet">
                <div class="vn-drag-handle"></div>
                <div class="vn-content-wrapper" id="vn-content">
                    </div>
            </div>
        </div>
        `;
    }

    setupEventListeners() {
        this.querySelector('#vn-overlay').onclick = (e) => {
            // Close if clicking outside the sheet
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

        // Play music
        if (noteData.songPreview) {
            this.audioPlayer.src = noteData.songPreview;
            this.audioPlayer.play().catch(err => console.log("Audio play deferred"));
        }

        // Render Content
        content.innerHTML = this.generateHTML(noteData, isOwnNote);
        
        // Open UI
        overlay.classList.add('open');
        if(navigator.vibrate) navigator.vibrate(10);
        
        // Hide Main Navbar
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        // Push History State for Back Button Support
        window.history.pushState({ vnOpen: true }, "");

        this.handleActions();
    }

    // Helper to format time (e.g. "2h")
    getTimeAgo(timestamp) {
        if(!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    }

    generateHTML(note, isOwn) {
        const timeString = this.getTimeAgo(note.createdAt);
        const isVerified = note.isVerified || false; // Check for verified status
        const user = firebase.auth().currentUser;
        const isLiked = note.likes?.some(l => l.uid === user?.uid);

        // Verification Badge SVG
        const verifiedBadge = `
            <svg class="vn-verified-badge" viewBox="0 0 24 24">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.746 2.74 1.863 3.494C2.88 16.63 2.5 17.618 2.5 18.75c0 2.07 1.68 3.75 3.75 3.75 1.13 0 2.118-.377 2.754-.863.754 1.115 2.037 1.86 3.495 1.86s2.74-.745 3.494-1.86c.636.486 1.624.863 2.755.863 2.07 0 3.75-1.68 3.75-3.75 0-1.132-.38-2.12-.864-2.755 1.117-.754 1.864-2.037 1.864-3.495z" fill="#0095f6"></path>
                <path d="M10 17.5l-4-4 1.41-1.41L10 14.67l7.59-7.59L19 8.5l-9 9z" fill="#fff"></path>
            </svg>
        `;

        return `
            <div class="vn-header-profile">
                <div class="vn-pfp-ring" style="border-color:${isOwn ? '#333' : '#0095f6'}">
                    <img src="${note.photoURL || note.pfp || 'https://via.placeholder.com/85'}" class="vn-pfp-large">
                </div>
                <div class="vn-user-row">
                    <span class="vn-username">${note.username || 'User'}</span>
                    ${isVerified ? verifiedBadge : ''}
                </div>
                <span class="vn-time-text">${timeString}</span>
            </div>

            <div class="vn-bubble-container">
                <div class="vn-bubble-text" style="background:${note.bgColor || '#2c2c2e'}; color:${note.textColor || '#fff'}">
                    ${note.text}
                </div>
            </div>

            ${note.songName ? `
                <div style="text-align:center; margin-bottom:20px;">
                    <div class="vn-song-pill">
                        <svg viewBox="0 0 24 24" style="width:12px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        <span>${note.songName} • ${note.songArtist}</span>
                    </div>
                </div>
            ` : ''}

            ${isOwn ? `
                <button class="vn-btn-danger" id="delete-note-btn">Delete note</button>
            ` : `
                <div class="vn-interaction-bar">
                    <input type="text" class="vn-reply-input" placeholder="Reply to ${note.username}...">
                    <button class="vn-heart-btn" id="like-toggle-btn" style="color:${isLiked ? '#ff3b30' : '#fff'}">
                        ${isLiked ? '❤️' : '🤍'}
                    </button>
                </div>
            `}
        `;
    }

    // Called when User clicks X or Backdrop
    close() {
        // If history state exists, go back (this triggers popstate, which calls internalClose)
        if (window.history.state && window.history.state.vnOpen) {
            window.history.back();
        } else {
            this.internalClose();
        }
    }

    // Internal function to actually hide UI
    internalClose() {
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

                // UI Optimistic Update
                likeBtn.innerText = isCurrentlyLiked ? '🤍' : '❤️';
                likeBtn.style.color = isCurrentlyLiked ? '#fff' : '#ff3b30';

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
 * Handles fetching, filtering, and populating the home screen bubbles.
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

    // 2. Load Mutual Notes (Batched Query - Fixes New Follower Issue)
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
                const existing = container.querySelectorAll('.friend-note');
                existing.forEach(e => e.remove());
                return;
            }

            // B. Chunking (Firestore 'IN' query limit is 30)
            const chunks = [];
            while(mutualUIDs.length > 0) {
                chunks.push(mutualUIDs.splice(0, 30));
            }

            // C. Perform Batched Queries
            const queries = chunks.map(chunk => {
                return db.collection("active_notes")
                    .where(firebase.firestore.FieldPath.documentId(), "in", chunk) 
                    .get();
            });

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
                    <div style="position:relative; width:65px; height:65px;">
                        <img src="${note.pfp || 'https://via.placeholder.com/65'}" class="note-pfp" style="width:100%; height:100%; border-radius:50%;">
                        ${note.isVerified ? '<div style="position:absolute; bottom:0; right:0; background:#fff; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center;"><svg viewBox="0 0 24 24" style="width:12px; fill:#0095f6;"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.746 2.74 1.863 3.494C2.88 16.63 2.5 17.618 2.5 18.75c0 2.07 1.68 3.75 3.75 3.75 1.13 0 2.118-.377 2.754-.863.754 1.115 2.037 1.86 3.495 1.86s2.74-.745 3.494-1.86c.636.486 1.624.863 2.755.863 2.07 0 3.75-1.68 3.75-3.75 0-1.132-.38-2.12-.864-2.755 1.117-.754 1.864-2.037 1.864-3.495z"></path><path d="M10 17.5l-4-4 1.41-1.41L10 14.67l7.59-7.59L19 8.5l-9 9z" fill="#fff"></path></svg></div>' : ''}
                    </div>
                    <span class="note-username">${(note.username || 'User').split(' ')[0]}</span>
                `;
                
                div.onclick = () => {
                    const viewer = document.querySelector('view-notes');
                    // Hide nav logic handled inside open()
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
