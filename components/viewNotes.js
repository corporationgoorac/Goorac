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

        // Swipe Logic Variables
        this.startY = 0;
        this.currentY = 0;
        this.isDragging = false;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.setupSwipeLogic();
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
                background: rgba(0,0,0,0.65); display: none; z-index: 2000;
                justify-content: center; align-items: flex-end;
                backdrop-filter: none; 
                opacity: 0; transition: opacity 0.2s ease;
            }
            .vn-overlay.open { display: flex; opacity: 1; }
            
            .vn-sheet {
                background: #121212; width: 100%; max-width: 500px;
                border-radius: 24px 24px 0 0; padding: 24px 20px;
                transform: translateY(100%); 
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding-bottom: max(20px, env(safe-area-inset-bottom));
                display: flex; flex-direction: column; max-height: 90vh;
                border-top: 1px solid #333;
                box-shadow: 0 -5px 30px rgba(0,0,0,0.5);
            }
            .vn-overlay.open .vn-sheet { transform: translateY(0); }
            
            /* --- PC RESPONSIVENESS --- */
            @media (min-width: 768px) {
                .vn-overlay { align-items: center; } 
                .vn-sheet {
                    border-radius: 24px; 
                    width: 420px;
                    max-height: 80vh;
                    transform: scale(0.95); opacity: 0;
                    margin: 0 auto;
                    border: 1px solid #333;
                }
                .vn-overlay.open .vn-sheet { transform: scale(1); opacity: 1; }
            }

            .vn-drag-handle { 
                width: 40px; height: 5px; background: #3a3a3c; 
                border-radius: 10px; margin: -10px auto 25px; cursor: grab;
            }

            .vn-profile-header {
                display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-shrink: 0;
            }
            .vn-friend-pfp {
                width: 48px; height: 48px; border-radius: 50%; object-fit: cover;
                border: 1px solid #333;
            }
            .vn-friend-info { display: flex; flex-direction: column; }
            .vn-friend-name { 
                font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 4px; 
            }
            .vn-friend-handle { color: #888; font-size: 0.85rem; }
            
            /* Verification Badge (General) */
            .vn-verify-badge {
                width: 14px; height: 14px; background: #00d2ff; display: inline-block; border-radius: 50%;
                mask: url('https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg') no-repeat center / contain;
                -webkit-mask: url('https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg') no-repeat center / contain;
            }

            .vn-scroll-content { overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
            .vn-scroll-content::-webkit-scrollbar { display: none; }

            .vn-note-card {
                padding: 30px 24px; border-radius: 24px; margin-bottom: 20px;
                text-align: center; position: relative; overflow: hidden;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                min-height: 140px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .vn-note-text { 
                font-size: 1.5rem; font-weight: 700; line-height: 1.3; z-index: 2;
                text-shadow: 0 2px 10px rgba(0,0,0,0.1); word-break: break-word;
            }

            .vn-song-pill { 
                display: inline-flex; align-items: center; gap: 8px; 
                background: rgba(255,255,255,0.1); padding: 8px 16px; 
                border-radius: 100px; font-size: 0.8rem; font-weight: 600;
                margin-top: 20px; border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(10px); color: rgba(255,255,255,0.9);
            }
            .vn-music-icon { width: 12px; height: 12px; fill: currentColor; }

            .vn-timestamp { 
                font-size: 0.75rem; color: #555; text-align: center; 
                margin-top: 5px; margin-bottom: 20px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;
            }

            /* --- REPLY SECTION & EMOJIS --- */
            .vn-footer-actions { margin-top: auto; padding-top: 10px; }
            
            .vn-emoji-bar {
                display: flex; justify-content: space-between; margin-bottom: 12px;
                padding: 0 5px;
            }
            .vn-quick-emoji {
                font-size: 2.2rem; cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                user-select: none; -webkit-tap-highlight-color: transparent;
            }
            .vn-quick-emoji:active { transform: scale(1.4); }
            .vn-quick-emoji.popped { animation: emojiPop 0.5s ease forwards; }

            .vn-interaction-bar { 
                display: flex; align-items: center; gap: 10px; 
                background: #1c1c1e; padding: 5px 6px 5px 16px; border-radius: 30px;
                border: 1px solid #333; position: relative;
            }
            .vn-reply-input { 
                flex: 1; background: none; border: none; color: white; 
                font-size: 1rem; padding: 12px 0; outline: none;
            }
            .vn-reply-input::placeholder { color: #666; }
            
            .vn-send-btn {
                color: #0095f6; font-weight: 700; font-size: 0.95rem; border: none; background: transparent;
                padding: 0 12px; cursor: pointer; display: none;
            }
            .vn-send-btn.visible { display: block; }

            .vn-heart-btn { 
                background: transparent; border: none; font-size: 1.6rem; cursor: pointer; 
                width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; 
                transition: transform 0.1s; -webkit-tap-highlight-color: transparent;
            }
            .vn-heart-btn:active { transform: scale(0.8); }

            /* --- OWN NOTE STYLES --- */
            .vn-likers-section { 
                margin-top: 20px; border-top: 1px solid #222; padding-top: 15px;
                max-height: 250px; /* SCROLL LIMIT */
                overflow-y: auto; /* SCROLL ENABLED */
                scrollbar-width: thin; 
                scrollbar-color: #333 #121212;
            }
            .vn-likers-section::-webkit-scrollbar { width: 4px; }
            .vn-likers-section::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

            .vn-liker-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; padding-right: 5px; }
            
            .vn-btn { width: 100%; padding: 16px; border-radius: 16px; border: none; font-weight: 700; font-size: 1rem; cursor: pointer; margin-top: 10px; }
            .vn-btn-primary { background: #262626; color: #fff; border: 1px solid #333; }
            .vn-btn-danger { background: rgba(255, 59, 48, 0.1); color: #ff3b30; }

            @keyframes emojiPop { 
                0% { transform: scale(1); opacity: 1; } 
                50% { transform: scale(1.6) translateY(-15px); opacity: 1; } 
                100% { transform: scale(1); opacity: 1; } 
            }
        </style>

        <div class="vn-overlay" id="vn-overlay">
            <div class="vn-sheet" id="vn-sheet">
                <div class="vn-drag-handle" id="vn-handle"></div>
                <div id="vn-content" style="display:flex; flex-direction:column; height:100%;"></div>
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

    setupSwipeLogic() {
        const sheet = this.querySelector('#vn-sheet');
        const handle = this.querySelector('#vn-handle');
        
        const startDrag = (e) => {
            if(window.innerWidth > 768) return; 
            this.startY = e.touches ? e.touches[0].clientY : e.clientY;
            this.isDragging = true;
            sheet.style.transition = 'none'; 
        };

        const onDrag = (e) => {
            if (!this.isDragging) return;
            this.currentY = e.touches ? e.touches[0].clientY : e.clientY;
            const deltaY = this.currentY - this.startY;
            if (deltaY > 0) {
                e.preventDefault(); 
                sheet.style.transform = `translateY(${deltaY}px)`;
            }
        };

        const endDrag = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            sheet.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            const deltaY = this.currentY - this.startY;
            if (deltaY > 100) {
                this.close();
            } else {
                sheet.style.transform = `translateY(0)`;
            }
        };

        handle.addEventListener('touchstart', startDrag);
        handle.addEventListener('touchmove', onDrag);
        handle.addEventListener('touchend', endDrag);
    }

    async open(initialNoteData, isOwnNote = false) {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.isOwnNote = isOwnNote;
        this.currentNote = initialNoteData;
        this.currentUserProfile = null; 
        
        const overlay = this.querySelector('#vn-overlay');
        const content = this.querySelector('#vn-content');

        if (initialNoteData && initialNoteData.songPreview) {
            this.audioPlayer.src = initialNoteData.songPreview;
            this.audioPlayer.play().catch(err => console.log("Audio play deferred"));
        }

        try {
            if(initialNoteData && initialNoteData.uid) {
                const userDoc = await this.db.collection('users').doc(initialNoteData.uid).get();
                if (userDoc.exists) {
                    this.currentUserProfile = userDoc.data();
                }
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
        }

        this.renderContent();
            
        overlay.classList.add('open');
        window.history.pushState({ vnOpen: true }, "", "#view-note");
        if(navigator.vibrate) navigator.vibrate(15);
        
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        if (initialNoteData && initialNoteData.uid) {
            this.unsubscribe = this.db.collection("active_notes").doc(initialNoteData.uid)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        this.currentNote = { ...doc.data(), uid: doc.id };
                        this.renderContent(); 
                    } else if (!this.isOwnNote) {
                        this.close(); 
                    }
                });
        }
    }

    renderContent() {
        const content = this.querySelector('#vn-content');
        if (this.isOwnNote && !this.currentNote) {
             this.currentNote = { text: "Add a note...", uid: firebase.auth().currentUser.uid };
        }

        content.innerHTML = this.isOwnNote 
            ? this.getOwnNoteHTML(this.currentNote) 
            : this.getFriendNoteHTML(this.currentNote);
        
        this.attachDynamicListeners();
    }

    getOwnNoteHTML(note) {
        const timeAgo = this.getRelativeTime(note.createdAt);
        const user = firebase.auth().currentUser;
        const displayPfp = this.currentUserProfile?.photoURL || user?.photoURL || 'https://via.placeholder.com/85';
        const displayName = this.currentUserProfile?.name || user?.displayName || 'You';
        
        const isVerified = this.currentUserProfile?.verified === true; 

        return `
            <div class="vn-profile-header">
                <img src="${displayPfp}" class="vn-friend-pfp" onclick="window.location.href='profile.html'">
                <div class="vn-friend-info">
                    <div class="vn-friend-name">
                        ${displayName} (You)
                        ${isVerified ? '<span class="vn-verify-badge"></span>' : ''}
                    </div>
                    <div class="vn-friend-handle">Your Note</div>
                </div>
            </div>

            <div class="vn-scroll-content">
                <div class="vn-note-card" style="background:${note.bgColor || '#262626'}; color:${note.textColor || '#fff'}">
                    <div class="vn-note-text">${note.text || 'Share a thought...'}</div>
                    ${note.songName ? `
                        <div class="vn-song-pill">
                            <svg class="vn-music-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                            <span>${note.songName}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="vn-timestamp">${timeAgo}</div>

                <div class="vn-likers-section">
                    <div style="font-weight:700; font-size:0.9rem; margin-bottom:15px; color:#888;">Activity</div>
                    ${note.likes && note.likes.length > 0 ? note.likes.map(liker => `
                        <div class="vn-liker-item">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="${liker.photoURL || 'https://via.placeholder.com/44'}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                                <span style="font-weight:600; display:flex; align-items:center;">
                                    ${liker.displayName || 'User'}
                                    ${liker.verified ? '<span class="vn-verify-badge" style="width:12px;height:12px;margin-left:4px;"></span>' : ''}
                                </span>
                            </div>
                            <span style="color:#ff3b30;">❤️</span>
                        </div>
                    `).join('') : `<div style="text-align:center; color:#555;">No likes yet</div>`}
                </div>
                
                <button class="vn-btn vn-btn-primary" id="vn-leave-new-note">Leave a New Note 📝</button>
                <button class="vn-btn vn-btn-danger" id="delete-note-btn">Delete Note</button>
            </div>
        `;
    }

    getFriendNoteHTML(note) {
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

            <div class="vn-scroll-content">
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
            </div>

            <div class="vn-footer-actions">
                <div class="vn-emoji-bar">
                    <span class="vn-quick-emoji" data-emoji="😂">😂</span>
                    <span class="vn-quick-emoji" data-emoji="😮">😮</span>
                    <span class="vn-quick-emoji" data-emoji="😍">😍</span>
                    <span class="vn-quick-emoji" data-emoji="😢">😢</span>
                    <span class="vn-quick-emoji" data-emoji="🔥">🔥</span>
                    <span class="vn-quick-emoji" data-emoji="👏">👏</span>
                </div>
                <div class="vn-interaction-bar">
                    <input type="text" id="vn-reply-input" class="vn-reply-input" placeholder="Reply to ${displayName}..." autocomplete="off">
                    <button id="vn-send-text-btn" class="vn-send-btn">Send</button>
                    <button class="vn-heart-btn" id="like-toggle-btn">
                        ${isLiked ? '❤️' : '🤍'}
                    </button>
                </div>
            </div>
        `;
    }

    attachDynamicListeners() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const leaveNoteBtn = this.querySelector('#vn-leave-new-note');
        if(leaveNoteBtn) {
            leaveNoteBtn.onclick = () => {
                window.location.href = 'notes.html';
            };
        }

        const deleteBtn = this.querySelector('#delete-note-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if(confirm("Delete this note?")) {
                    try {
                        await this.db.collection("active_notes").doc(user.uid).delete();
                        this.close();
                        window.location.reload(); 
                    } catch(e) { console.error(e); }
                }
            };
        }

        const likeBtn = this.querySelector('#like-toggle-btn');
        if(likeBtn) {
            likeBtn.onclick = async () => {
                if(navigator.vibrate) navigator.vibrate(10);
                const isCurrentlyLiked = likeBtn.innerText === '❤️';
                likeBtn.innerText = isCurrentlyLiked ? '🤍' : '❤️'; 
                
                likeBtn.style.transform = "scale(1.3)";
                setTimeout(() => likeBtn.style.transform = "scale(1)", 150);

                const noteRef = this.db.collection("active_notes").doc(this.currentNote.uid);
                try {
                    if (!isCurrentlyLiked) {
                        // FETCH REAL DB USER DATA BEFORE LIKING
                        const userDoc = await this.db.collection('users').doc(user.uid).get();
                        const userData = userDoc.exists ? userDoc.data() : {};
                        
                        await noteRef.update({
                            likes: firebase.firestore.FieldValue.arrayUnion({ 
                                uid: user.uid, 
                                displayName: userData.name || user.displayName, 
                                photoURL: userData.photoURL || user.photoURL, // Uses DB pic
                                verified: userData.verified || false // Stores verified status
                            })
                        });
                    } else {
                        const likerObj = this.currentNote.likes.find(l => l.uid === user.uid);
                        if (likerObj) await noteRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(likerObj) });
                    }
                } catch (e) { console.error("Like toggle failed", e); }
            };
        }

        if(this.isOwnNote) return;

        const input = this.querySelector('#vn-reply-input');
        const sendBtn = this.querySelector('#vn-send-text-btn');
        const emojis = this.querySelectorAll('.vn-quick-emoji');
        const heartBtn = this.querySelector('#like-toggle-btn');

        input.addEventListener('input', () => {
            if(input.value.trim().length > 0) {
                sendBtn.classList.add('visible');
                heartBtn.style.display = 'none';
            } else {
                sendBtn.classList.remove('visible');
                heartBtn.style.display = 'flex';
            }
        });

        input.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' && input.value.trim().length > 0) {
                this.handleSendReply(input.value.trim());
                input.value = '';
                input.blur(); 
                sendBtn.classList.remove('visible');
                heartBtn.style.display = 'flex';
            }
        });

        sendBtn.onclick = () => {
            if(input.value.trim().length > 0) {
                this.handleSendReply(input.value.trim());
                input.value = '';
                input.blur(); 
                sendBtn.classList.remove('visible');
                heartBtn.style.display = 'flex';
            }
        };

        emojis.forEach(emojiEl => {
            emojiEl.onclick = () => {
                const emoji = emojiEl.dataset.emoji;
                if(navigator.vibrate) navigator.vibrate(25);
                emojiEl.classList.add('popped');
                setTimeout(() => emojiEl.classList.remove('popped'), 500);
                this.handleSendReply(emoji);
            };
        });
    }

    async handleSendReply(text) {
        const myUid = firebase.auth().currentUser.uid;
        const targetUid = this.currentNote.uid;
        const chatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;
        
        const noteMetadata = {
            text: this.currentNote.text || "",
            bgColor: this.currentNote.bgColor || "#262626",
            textColor: this.currentNote.textColor || "#fff",
            songName: this.currentNote.songName || null,
            username: this.currentNote.username || "User",
            pfp: this.currentNote.pfp || null,
            uid: this.currentNote.uid 
        };

        try {
            const chatRef = this.db.collection("chats").doc(chatId);
            const messagesRef = chatRef.collection("messages");

            await messagesRef.add({
                text: text,
                sender: myUid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                seen: false,
                replyToNote: this.currentNote.text, 
                noteMetadata: noteMetadata 
            });

            await chatRef.set({
                lastMessage: "Replied to a note", 
                lastSender: myUid,
                lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                participants: [myUid, targetUid],
                seen: false, 
                [`unreadCount.${targetUid}`]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

        } catch(e) {
            console.error("Failed to send reply", e);
        }
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
}

customElements.define('view-notes', ViewNotes);


/**
 * =======================================================
 * PART 2: THE NOTES MANAGER (Logic & Styles)
 * =======================================================
 */
const NotesManager = {
    init: function() {
        this.injectBubbleStyles(); 
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.setupMyNote(user);
                this.loadMutualNotes(user);
            }
        });
    },

    injectBubbleStyles: function() {
        const style = document.createElement('style');
        style.innerHTML = `
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

            .note-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                width: 75px; 
                flex-shrink: 0;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
            }

            .note-bubble, #my-note-preview {
                display: none; 
                flex-direction: column;
                justify-content: center !important;
                align-items: center !important;
                text-align: center;
                
                position: absolute;
                top: 0px; 
                left: 50%;
                transform: translate(-50%, -100%); 
                z-index: 10;
                
                padding: 6px 12px !important;
                border-radius: 16px !important;
                
                font-size: 0.75rem !important;
                width: max-content;
                max-width: 90px; 
                
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                box-sizing: border-box;
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .note-bubble.visible, #my-note-preview.visible { display: flex !important; }
            
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

            /* --- NEW: Like Indicator OUTSIDE Note Bubble (Bottom Right of PFP) --- */
            .note-like-indicator {
                position: absolute;
                top: 75px; /* Positions below the top of container (approx PFP bottom) */
                right: 0px;  /* Align to right side */
                font-size: 11px;
                background: #1c1c1e;
                border-radius: 50%;
                width: 20px; height: 20px;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.4);
                border: 2px solid #000; 
                z-index: 20;
            }

            .note-text-content {
                line-height: 1.25;
                font-weight: 500;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                width: 100%;
                text-align: center;
            }

            .note-music-tag {
                display: flex; 
                align-items: center; 
                justify-content: center;
                gap: 3px;
                font-size: 0.65rem; 
                opacity: 0.8; 
                margin-top: 2px;
                white-space: nowrap; 
                overflow: hidden; 
                max-width: 100%;
                width: 100%;
            }
            
            .note-music-tag svg { flex-shrink: 0; }
            
            .note-pfp {
                width: 65px;
                height: 65px;
                border-radius: 50%;
                border: 2px solid #262626;
                object-fit: cover;
                background: #333;
                z-index: 2;
            }

            .note-username {
                font-size: 0.75rem;
                margin-top: 6px;
                color: #a0a0a0;
                max-width: 75px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    },

    setupMyNote: function(user) {
        const db = firebase.firestore();
        db.collection("active_notes").doc(user.uid).onSnapshot(doc => {
            const btn = document.getElementById('my-note-btn');
            const preview = document.getElementById('my-note-preview');
            if (!btn || !preview) return; 

            const data = doc.exists ? doc.data() : null;
            preview.classList.add('visible');

            if(data && (data.text || data.songName)) {
                preview.style.backgroundColor = data.bgColor || '#262626';
                preview.style.color = data.textColor || '#fff';
                
                preview.innerHTML = `
                    ${data.text ? `<div class="note-text-content">${data.text}</div>` : ''}
                    ${data.songName ? `
                        <div class="note-music-tag">
                            <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                            <span>${data.songName.substring(0, 10)}${data.songName.length>10?'...':''}</span>
                        </div>
                    ` : ''}
                `;
                btn.classList.add('has-note');
                
                btn.onclick = () => {
                    const viewer = document.querySelector('view-notes');
                    if(data) viewer.open({ ...data, uid: user.uid }, true);
                };
            } else {
                preview.style.backgroundColor = 'rgba(255,255,255,0.1)';
                preview.style.color = 'rgba(255,255,255,0.7)';
                preview.innerHTML = `<div class="note-text-content" style="font-size:0.7rem; font-weight:400;">What's on your mind?</div>`;
                btn.classList.remove('has-note');
                btn.onclick = () => {
                    window.location.href = 'notes.html';
                };
            }
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
                container.querySelectorAll('.friend-note').forEach(e => e.remove());
                return;
            }

            const chunks = [];
            let tempUIDs = [...mutualUIDs];
            while(tempUIDs.length > 0) chunks.push(tempUIDs.splice(0, 30));

            // REAL-TIME UPDATES FOR FRIENDS NOTES
            chunks.forEach(chunk => {
                db.collection("active_notes")
                    .where(firebase.firestore.FieldPath.documentId(), "in", chunk) 
                    .onSnapshot(snapshot => {
                        snapshot.docChanges().forEach(change => {
                            const noteData = change.doc.data();
                            const uid = change.doc.id;
                            
                            const existingEl = document.getElementById(`note-${uid}`);
                            if(existingEl) existingEl.remove();

                            if (change.type === "added" || change.type === "modified") {
                                const now = new Date();
                                const isActive = noteData.expiresAt ? noteData.expiresAt.toDate() > now : true;
                                
                                if(isActive) {
                                    const isLiked = noteData.likes && noteData.likes.some(l => l.uid === user.uid);
                                    const div = document.createElement('div');
                                    div.id = `note-${uid}`; 
                                    div.className = 'note-item friend-note has-note';
                                    div.innerHTML = `
                                        <div class="note-bubble visible" style="background:${noteData.bgColor || '#262626'}; color:${noteData.textColor || '#fff'}">
                                            <div class="note-text-content">${noteData.text}</div>
                                            ${noteData.songName ? `
                                                <div class="note-music-tag">
                                                    <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                                    <span>${noteData.songName.substring(0, 10)}${noteData.songName.length>10?'...':''}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                        <img src="${noteData.pfp || 'https://via.placeholder.com/65'}" class="note-pfp">
                                        ${isLiked ? '<div class="note-like-indicator">❤️</div>' : ''}
                                        <span class="note-username">${(noteData.username || 'User').split(' ')[0]}</span>
                                    `;
                                    div.onclick = () => {
                                        const viewer = document.querySelector('view-notes');
                                        const nav = document.querySelector('main-navbar');
                                        if(nav) nav.classList.add('hidden');
                                        viewer.open({ ...noteData, uid: uid }, false);
                                    };
                                    container.appendChild(div);
                                }
                            }
                        });
                    });
            });

        } catch (e) { console.error("Error loading notes:", e); }
    }
};

document.addEventListener('DOMContentLoaded', () => NotesManager.init());
