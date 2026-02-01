/**
 * =======================================================
 * PART 1: THE VIEWER COMPONENT (Bottom Sheet UI)
 * =======================================================
 */
class ViewNotes extends HTMLElement {
    constructor() {
        super();
        this.currentNote = null;
        this.currentUserProfile = null;
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
            }
            .vn-sheet {
                background: #1c1c1e; width: 100%; max-width: 500px;
                border-radius: 24px 24px 0 0; padding: 24px 20px;
                transform: translateY(100%); transition: transform 0.25s cubic-bezier(0.32, 1.25, 0.32, 1);
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

            .vn-song-pill { 
                display: inline-flex; align-items: center; gap: 8px; 
                background: rgba(255,255,255,0.08); padding: 8px 16px; 
                border-radius: 100px; font-size: 0.85rem; font-weight: 500;
                margin-top: 20px; border: 1px solid rgba(255,255,255,0.05);
                backdrop-filter: blur(5px);
            }
            .vn-music-icon { width: 14px; height: 14px; fill: currentColor; opacity: 0.8; }

            .vn-timestamp { 
                font-size: 0.75rem; color: #636366; text-align: center; 
                margin-top: 10px; margin-bottom: 20px; font-weight: 500; 
            }

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
            .vn-btn-primary { background: #007aff; color: white; }
            .vn-btn-danger { background: transparent; color: #ff3b30; }

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
        this.currentUserProfile = null; 
        
        const overlay = this.querySelector('#vn-overlay');
        const content = this.querySelector('#vn-content');

        if (initialNoteData.songPreview) {
            this.audioPlayer.src = initialNoteData.songPreview;
            this.audioPlayer.play().catch(err => console.log("Audio play deferred"));
        }

        try {
            const userDoc = await this.db.collection('users').doc(initialNoteData.uid).get();
            if (userDoc.exists) {
                this.currentUserProfile = userDoc.data();
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
        }

        content.innerHTML = isOwnNote 
            ? this.renderOwnNote(initialNoteData) 
            : this.renderFriendNote(initialNoteData);
            
        overlay.classList.add('open');
        window.history.pushState({ vnOpen: true }, "", "#view-note");
        if(navigator.vibrate) navigator.vibrate(10);
        
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        this.handleActions();

        if (initialNoteData.uid) {
            this.unsubscribe = this.db.collection("active_notes").doc(initialNoteData.uid)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const updatedData = doc.data();
                        this.currentNote = { ...updatedData, uid: doc.id };
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
        const timeAgo = this.getRelativeTime(note.createdAt);
        const displayPfp = this.currentUserProfile?.photoURL || note.pfp || 'https://via.placeholder.com/85';
        const displayName = this.currentUserProfile?.name || note.username || 'You';
        const displayHandle = this.currentUserProfile?.username ? `@${this.currentUserProfile.username}` : '';
        const isVerified = this.currentUserProfile?.verified === true;

        return `
            <div class="vn-profile-header">
                <img src="${displayPfp}" class="vn-friend-pfp" onclick="window.location.href='profile.html'">
                <div class="vn-friend-info">
                    <div class="vn-friend-name">
                        ${displayName}
                        ${isVerified ? '<span class="vn-verify-badge"></span>' : ''}
                    </div>
                    <div class="vn-friend-handle">${displayHandle}</div>
                </div>
            </div>

            <div class="vn-note-card" style="background:${note.bgColor || '#262626'}; color:${note.textColor || '#fff'}">
                <div class="vn-note-text">${note.text || ''}</div>
                ${note.songName ? `
                    <div class="vn-song-pill">
                        <svg class="vn-music-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        <span>${note.songName}</span>
                    </div>
                ` : ''}
            </div>

            <div class="vn-timestamp">${timeAgo}</div>

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
        this.injectBubbleStyles(); // Inject CSS for bubbles
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.setupMyNote(user);
                this.loadMutualNotes(user);
            }
        });
    },

    // --- NEW: Inject Bubble CSS with SKELETONS ---
    injectBubbleStyles: function() {
        const style = document.createElement('style');
        style.innerHTML = `
            /* CONTAINER */
            #notes-container {
                display: flex;
                overflow-x: auto;
                padding-top: 70px;
                padding-bottom: 10px;
                padding-left: 15px;
                gap: 25px;
                scrollbar-width: none;
                align-items: flex-start;
            }
            #notes-container::-webkit-scrollbar { display: none; }

            /* ITEM WRAPPER */
            .note-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                width: 75px; 
                flex-shrink: 0;
                cursor: pointer;
            }

            /* BUBBLE: Floating, Centered, Sized Correctly */
            .note-bubble, #my-note-preview {
                display: flex !important;
                flex-direction: column;
                justify-content: center !important;
                align-items: center !important;
                text-align: center;
                
                position: absolute;
                top: 5px; /* Anchor point */
                left: 50%;
                transform: translate(-50%, -100%); /* Moves UP */
                z-index: 10;
                
                padding: 6px 12px !important;
                border-radius: 16px !important;
                font-size: 0.75rem !important;
                
                /* Auto width logic */
                width: max-content;
                max-width: 90px; 
                
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                box-sizing: border-box;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            /* TAIL */
            .note-bubble::after, #my-note-preview::after {
                content: '';
                position: absolute;
                bottom: -4px;
                left: 50%;
                transform: translateX(-50%);
                width: 6px;
                height: 6px;
                background: inherit;
                border-radius: 50%;
                z-index: -1;
            }
            .note-bubble::before, #my-note-preview::before {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 55%;
                width: 3px;
                height: 3px;
                background: inherit;
                border-radius: 50%;
                z-index: -1;
                opacity: 0.7;
            }

            /* CONTENT */
            .note-text-content {
                line-height: 1.25;
                font-weight: 500;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                width: 100%;
                text-align: center;
                margin-bottom: 2px;
            }

            .note-music-tag {
                display: flex; align-items: center; justify-content: center;
                gap: 3px; font-size: 0.65rem; opacity: 0.8; margin-top: 2px;
                white-space: nowrap; overflow: hidden; max-width: 100%; width: 100%;
            }
            .note-music-tag svg { flex-shrink: 0; }
            
            .note-pfp {
                width: 65px; height: 65px;
                border-radius: 50%; border: 2px solid #262626;
                object-fit: cover; background: #333;
                z-index: 2;
            }

            .note-username {
                font-size: 0.75rem; margin-top: 6px;
                color: #a0a0a0; max-width: 75px;
                overflow: hidden; text-overflow: ellipsis;
                white-space: nowrap; text-align: center;
            }

            #my-note-preview { display: none; }

            /* --- SKELETON STYLES --- */
            .skeleton-item {
                display: flex; flex-direction: column;
                align-items: center; position: relative;
                width: 75px; flex-shrink: 0;
            }
            .skeleton-bubble {
                width: 60px; height: 35px;
                background: #2a2a2a; border-radius: 16px;
                position: absolute; top: 5px; left: 50%;
                transform: translate(-50%, -100%);
                border-bottom-left-radius: 4px;
            }
            .skeleton-pfp {
                width: 65px; height: 65px;
                border-radius: 50%; background: #2a2a2a;
                border: 2px solid #1a1a1a;
            }
            .skeleton-text {
                width: 50px; height: 8px;
                background: #2a2a2a; margin-top: 8px;
                border-radius: 4px;
            }
            .pulse { animation: skelPulse 1.5s infinite ease-in-out; }
            @keyframes skelPulse {
                0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
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
                preview.style.display = 'flex';
                preview.style.backgroundColor = data.bgColor || '#262626';
                preview.style.color = data.textColor || '#fff';
                
                preview.innerHTML = `
                    <div class="note-text-content">${data.text}</div>
                    ${data.songName ? `
                        <div class="note-music-tag">
                            <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                            <span>${data.songName.substring(0, 10)}${data.songName.length>10?'...':''}</span>
                        </div>
                    ` : ''}
                `;
                btn.classList.add('has-note');
            } else {
                preview.style.display = 'none';
                btn.classList.remove('has-note');
            }

            btn.onclick = () => {
                const viewer = document.querySelector('view-notes');
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

        // --- RENDER SKELETONS ---
        const skeletonHTML = `
            <div class="skeleton-item pulse">
                <div class="skeleton-bubble"></div>
                <div class="skeleton-pfp"></div>
                <div class="skeleton-text"></div>
            </div>
        `.repeat(5); // Show 5 skeletons
        
        // Append to container (keep "My Note" if physically separate, otherwise append)
        // Assuming "My Note" is separate in HTML, we just append skeletons to the list
        const skeletonWrapper = document.createElement('div');
        skeletonWrapper.id = 'skeleton-wrapper';
        skeletonWrapper.style.display = 'flex';
        skeletonWrapper.style.gap = '25px';
        skeletonWrapper.innerHTML = skeletonHTML;
        container.appendChild(skeletonWrapper);

        try {
            // A. Identify Mutual Friends UIDs
            const myProfileDoc = await db.collection("users").doc(user.uid).get();
            const myData = myProfileDoc.data() || {};
            const myFollowing = myData.following || []; 
            const myFollowers = myData.followers || []; 

            const mutualUIDs = myFollowing.filter(uid => myFollowers.includes(uid));

            // REMOVE SKELETONS ONCE DATA IS READY (or empty)
            if(mutualUIDs.length === 0) {
                skeletonWrapper.remove();
                const existing = container.querySelectorAll('.friend-note');
                existing.forEach(e => e.remove());
                return;
            }

            // B. Chunking
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

            // REMOVE SKELETONS BEFORE RENDERING REAL NOTES
            skeletonWrapper.remove();

            // E. Render
            const existingFriends = container.querySelectorAll('.friend-note');
            existingFriends.forEach(e => e.remove());

            allNotes.forEach(note => {
                const div = document.createElement('div');
                div.className = 'note-item friend-note has-note';
                
                div.innerHTML = `
                    <div class="note-bubble" style="background:${note.bgColor || '#262626'}; color:${note.textColor || '#fff'}">
                        <div class="note-text-content">${note.text}</div>
                        ${note.songName ? `
                            <div class="note-music-tag">
                                <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                <span>${note.songName.substring(0, 10)}${note.songName.length>10?'...':''}</span>
                            </div>
                        ` : ''}
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
            // Ensure skeletons are removed even on error
            const skel = document.getElementById('skeleton-wrapper');
            if(skel) skel.remove();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => NotesManager.init());
