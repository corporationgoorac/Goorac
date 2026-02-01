/**
 * IMPORT CONFIG
 * Assumes config.js is one level up from this file
 */
import '../config.js'; 

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
        this.unsubscribe = null; // To store the real-time listener
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
            
            /* Username Row to center badge */
            .vn-username-row { 
                display: flex; align-items: center; justify-content: center; 
                gap: 6px; margin-bottom: 5px; font-weight: 700; font-size: 1.1rem; 
            }
            
            .vn-song-tag { 
                display: inline-flex; align-items: center; gap: 6px; 
                background: rgba(255,255,255,0.1); padding: 6px 14px; 
                border-radius: 20px; font-size: 0.85rem; font-weight: 600;
            }

            .vn-bubble-text { 
                font-size: 1.1rem; font-weight: 500; margin: 15px 0; 
                line-height: 1.4; color: #fff;
            }

            .vn-timestamp { font-size: 0.75rem; color: #8e8e93; margin-top: 8px; font-weight: 500; }

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

        // Listen for browser Back Button
        window.addEventListener('popstate', (event) => {
            const overlay = this.querySelector('#vn-overlay');
            if (overlay && overlay.classList.contains('open')) {
                // Close without calling history.back() again
                this.close(true);
            }
        });
    }

    // --- HELPER: Calculate Relative Time (e.g., 5m ago) ---
    getRelativeTime(timestamp) {
        if (!timestamp) return 'Recently';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    // --- HELPER: Get Verification Badge SVG ---
    getVerifiedBadge() {
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="#1DA1F2" style="flex-shrink:0;"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.746 2.747 1.863 3.483-.242.66-.375 1.38-.375 2.13 0 3.314 2.686 6 6 6 .63 0 1.235-.1 1.815-.28.847.886 2.033 1.442 3.352 1.442s2.505-.556 3.352-1.44c.58.178 1.185.28 1.815.28 3.315 0 6-2.686 6-6 0-.75-.134-1.47-.376-2.13C21.754 15.247 22.5 13.957 22.5 12.5zM9.547 17.5l-3.35-3.35 1.59-1.59 1.76 1.76 5.64-5.64 1.59 1.59-7.23 7.23z"/></svg>`;
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

        // 1. Initial Render
        content.innerHTML = isOwnNote ? this.renderOwnNote(noteData) : this.renderFriendNote(noteData);
        overlay.classList.add('open');
        
        // 2. Start Real-time Listener (Fixes the "Like not updating" issue)
        this.startRealtimeListener(noteData.uid, isOwnNote);

        // 3. Push History State (Fixes "Back button" issue)
        window.history.pushState({ vnOpen: true }, "", "#view-note");
        
        if(navigator.vibrate) navigator.vibrate(10);
        
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        this.handleActions();
    }

    // --- REAL-TIME UPDATER ---
    startRealtimeListener(uid, isOwnNote) {
        // Unsubscribe from previous listener if exists
        if(this.unsubscribe) this.unsubscribe();

        // Listen for changes to this specific note doc
        this.unsubscribe = this.db.collection('active_notes').doc(uid)
            .onSnapshot(doc => {
                if(doc.exists) {
                    const freshData = doc.data();
                    freshData.uid = doc.id;
                    this.currentNote = freshData;
                    // Update the parts of UI that change (Likes, Heart status)
                    this.updateDynamicUI(freshData, isOwnNote);
                }
            });
    }

    updateDynamicUI(note, isOwnNote) {
        // Update Likers List
        const likersContainer = this.querySelector('.vn-likers-section');
        if(likersContainer) {
            likersContainer.innerHTML = `
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
            `;
        }

        // Update Heart Icon button
        if(!isOwnNote) {
            const user = firebase.auth().currentUser;
            const isLiked = note.likes?.some(l => l.uid === user?.uid);
            const likeBtn = this.querySelector('#like-toggle-btn');
            if(likeBtn) likeBtn.innerText = isLiked ? '❤️' : '🤍';
        }
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
                <div class="vn-timestamp">${this.getRelativeTime(note.createdAt)}</div>
            </div>

            <div class="vn-likers-section">
                <div style="text-align:center; padding:20px; color:#8e8e93;">Loading activity...</div>
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
        const verifiedBadge = note.verification ? this.getVerifiedBadge() : '';

        return `
            <div class="vn-header">
                <img src="${note.photoURL || note.pfp || 'https://via.placeholder.com/85'}" class="vn-pfp-large">
                <div class="vn-username-row">
                    <span>${note.username || 'User'}</span>
                    ${verifiedBadge}
                </div>
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
                <div class="vn-timestamp">${this.getRelativeTime(note.createdAt)}</div>
            </div>

            <div class="vn-interaction-bar">
                <input type="text" class="vn-reply-input" placeholder="Reply to ${note.username || 'user'}...">
                <button class="vn-heart-btn" id="like-toggle-btn">
                    ${isLiked ? '❤️' : '🤍'}
                </button>
            </div>
        `;
    }

    close(fromHistory = false) {
        this.audioPlayer.pause();
        if(this.unsubscribe) this.unsubscribe(); // Stop listening to DB
        
        this.querySelector('#vn-overlay').classList.remove('open');
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.remove('hidden');

        // Only go back manually if NOT triggered by the browser back button
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
                
                // Optimistic UI update (feels instant)
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
                } catch (e) { 
                    console.error("Like toggle failed", e); 
                    // Revert UI if DB fails
                    likeBtn.innerText = isCurrentlyLiked ? '❤️' : '🤍';
                }
            };
        }
    }
}

customElements.define('view-notes', ViewNotes);


/**
 * =======================================================
 * PART 2: THE NOTES MANAGER
 * =======================================================
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

    loadMutualNotes: async function(user) {
        const db = firebase.firestore();
        const container = document.getElementById('notes-container');
        if(!container) return;

        try {
            const myProfileDoc = await db.collection("users").doc(user.uid).get();
            const myData = myProfileDoc.data() || {};
            const myFollowing = myData.following || []; 
            const myFollowers = myData.followers || []; 

            const mutualUIDs = myFollowing.filter(uid => myFollowers.includes(uid));

            if(mutualUIDs.length === 0) {
                const existing = container.querySelectorAll('.friend-note');
                existing.forEach(e => e.remove());
                return;
            }

            const chunks = [];
            while(mutualUIDs.length > 0) {
                chunks.push(mutualUIDs.splice(0, 30));
            }

            const queries = chunks.map(chunk => {
                return db.collection("active_notes")
                    .where(firebase.firestore.FieldPath.documentId(), "in", chunk) 
                    .get();
            });

            const snapshots = await Promise.all(queries);
            
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

            allNotes.sort((a, b) => {
                const ta = a.createdAt ? a.createdAt.toMillis() : 0;
                const tb = b.createdAt ? b.createdAt.toMillis() : 0;
                return tb - ta;
            });

            const existingFriends = container.querySelectorAll('.friend-note');
            existingFriends.forEach(e => e.remove());

            allNotes.forEach(note => {
                const div = document.createElement('div');
                div.className = 'note-item friend-note has-note';
                
                // --- VERIFICATION BADGE FOR MAIN VIEW ---
                const verifiedBadge = note.verification
                    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="#1DA1F2" style="position:absolute; right:-2px; bottom:2px; background:white; border-radius:50%; box-shadow: 0 0 0 1.5px #000;"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.746 2.747 1.863 3.483-.242.66-.375 1.38-.375 2.13 0 3.314 2.686 6 6 6 .63 0 1.235-.1 1.815-.28.847.886 2.033 1.442 3.352 1.442s2.505-.556 3.352-1.44c.58.178 1.185.28 1.815.28 3.315 0 6-2.686 6-6 0-.75-.134-1.47-.376-2.13C21.754 15.247 22.5 13.957 22.5 12.5zM9.547 17.5l-3.35-3.35 1.59-1.59 1.76 1.76 5.64-5.64 1.59 1.59-7.23 7.23z"/></svg>`
                    : '';

                div.innerHTML = `
                    <div class="note-bubble" style="background:${note.bgColor || '#262626'}; color:${note.textColor || '#fff'}">
                        ${note.text}
                    </div>
                    <div style="position:relative;">
                        <img src="${note.pfp || 'https://via.placeholder.com/65'}" class="note-pfp">
                        ${verifiedBadge}
                    </div>
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
