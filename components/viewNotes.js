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
        
        // Double Tap Logic
        this.lastTap = 0;
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

    getIcons() {
        return {
            heartEmpty: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            heartFilled: `<svg width="28" height="28" viewBox="0 0 24 24" fill="#ff3b30" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            send: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0095f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
            verified: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#0095f6"><path d="M22.5 12.5l-2.5 2.5 0.5 3.5-3.5 0.5-2.5 2.5-3-1.5-3 1.5-2.5-2.5-3.5-0.5 0.5-3.5-2.5-2.5 2.5-2.5-0.5-3.5 3.5-0.5 2.5-2.5 3 1.5 3-1.5 2.5 2.5 3.5 0.5-0.5 3.5z"></path><path d="M10 16l-4-4 1.4-1.4 2.6 2.6 6.6-6.6 1.4 1.4z" fill="white"></path></svg>`
        };
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
            
            @media (min-width: 768px) {
                .vn-overlay { align-items: center; } 
                .vn-sheet {
                    border-radius: 24px; width: 420px; max-height: 80vh;
                    transform: scale(0.95); opacity: 0; margin: 0 auto;
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
            .vn-clickable { cursor: pointer; transition: opacity 0.2s; -webkit-tap-highlight-color: transparent; }
            .vn-clickable:active { opacity: 0.6; }

            .vn-friend-pfp {
                width: 48px; height: 48px; border-radius: 50%; object-fit: cover;
                border: 1px solid #333;
            }
            .vn-friend-info { display: flex; flex-direction: column; }
            .vn-friend-name { 
                font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 4px; 
            }
            .vn-friend-handle { color: #888; font-size: 0.85rem; }
            
            .vn-scroll-content { overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
            .vn-scroll-content::-webkit-scrollbar { display: none; }

            .vn-note-card {
                padding: 30px 24px; border-radius: 24px; margin-bottom: 20px;
                text-align: center; position: relative; overflow: hidden;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                min-height: 140px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transition: transform 0.1s;
                cursor: default;
                /* Background Logic - Gradient Support */
                background-size: cover;
                background-position: center;
            }
            .vn-note-card:active { transform: scale(0.98); }

            .vn-pop-heart {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                opacity: 0; pointer-events: none; z-index: 10;
            }
            .vn-pop-heart.animate { animation: popHeart 0.8s ease-out forwards; }
            @keyframes popHeart {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                20% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
            }

            .vn-note-text { 
                font-size: 1.5rem; font-weight: 700; line-height: 1.3; z-index: 2;
                word-break: break-word; width: 100%;
            }

            .vn-song-pill { 
                display: inline-flex; align-items: center; gap: 8px; 
                background: rgba(255,255,255,0.1); padding: 8px 16px; 
                border-radius: 100px; font-size: 0.8rem; font-weight: 600;
                margin-top: 20px; border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(10px); color: inherit; opacity: 0.9;
            }
            .vn-music-icon { width: 12px; height: 12px; fill: currentColor; }

            .vn-timestamp { 
                font-size: 0.75rem; color: #555; text-align: center; 
                margin-top: 5px; margin-bottom: 20px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;
            }

            .vn-footer-actions { margin-top: auto; padding-top: 10px; }
            
            .vn-emoji-bar {
                display: flex; justify-content: space-between; margin-bottom: 12px;
                padding: 0 5px;
            }
            .vn-quick-emoji {
                font-size: 2.2rem; cursor: pointer; transition: transform 0.2s;
                user-select: none; -webkit-tap-highlight-color: transparent;
            }
            .vn-quick-emoji:active { transform: scale(1.4); }

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
                background: transparent; border: none; padding: 8px; cursor: pointer; display: none;
                align-items: center; justify-content: center;
            }
            .vn-send-btn.visible { display: flex; }

            .vn-heart-btn { 
                background: transparent; border: none; cursor: pointer; 
                width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; 
                transition: transform 0.1s; -webkit-tap-highlight-color: transparent;
                color: #888;
            }
            .vn-heart-btn:active { transform: scale(0.8); }

            .vn-likers-section { 
                margin-top: 20px; border-top: 1px solid #222; padding-top: 15px;
                max-height: 250px; overflow-y: auto; scrollbar-width: thin; 
            }
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
        
        this.renderContent();

        const overlay = this.querySelector('#vn-overlay');
        overlay.classList.add('open');
        window.history.pushState({ vnOpen: true }, "", "#view-note");
        if(navigator.vibrate) navigator.vibrate(15);
        
        const mainNav = document.querySelector('main-navbar');
        if(mainNav) mainNav.classList.add('hidden');

        if (initialNoteData && initialNoteData.songPreview) {
            this.audioPlayer.src = initialNoteData.songPreview;
            this.audioPlayer.play().catch(err => console.log("Audio play deferred"));
        }

        // Fetch User Profile
        if(initialNoteData.uid) {
            this.db.collection('users').doc(initialNoteData.uid).get().then(doc => {
                if(doc.exists) {
                    this.currentUserProfile = doc.data();
                    this.renderContent(); 
                }
            });
        }

        // === FIXED: LISTEN TO SPECIFIC NOTE ID IN 'notes' COLLECTION ===
        if (initialNoteData.id) {
            this.unsubscribe = this.db.collection("notes").doc(initialNoteData.id)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        // Close if note is no longer active (deleted or overwritten)
                        if (data.isActive === false) { this.close(); return; }
                        
                        this.currentNote = { ...data, id: doc.id };
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

    getTextShadow(color) {
        if (color === '#000000' || color === '#000') return '0 1px 15px rgba(255,255,255,0.4)';
        return '0 2px 10px rgba(0,0,0,0.3)';
    }

    getOwnNoteHTML(note) {
        const timeAgo = this.getRelativeTime(note.createdAt);
        const user = firebase.auth().currentUser;
        const icons = this.getIcons();
        
        const displayPfp = note.pfp || this.currentUserProfile?.photoURL || user?.photoURL || 'https://via.placeholder.com/85';
        const displayName = note.username || this.currentUserProfile?.name || user?.displayName || 'You';
        
        const isVerified = note.verified === true || this.currentUserProfile?.verified === true; 
        const textAlign = note.textAlign || 'center';
        const alignItems = textAlign === 'left' ? 'flex-start' : 'center';
        const fontStyle = note.font || 'system-ui';
        
        // Gradient Support - Use 'background' property for compatibility
        const bgColor = note.bgColor || '#262626';
        const txtColor = note.textColor || '#fff';
        const textShadow = this.getTextShadow(txtColor);

        return `
            <div class="vn-profile-header vn-clickable" id="vn-header-click">
                <img src="${displayPfp}" class="vn-friend-pfp">
                <div class="vn-friend-info">
                    <div class="vn-friend-name">
                        ${displayName} (You)
                        ${isVerified ? icons.verified : ''}
                    </div>
                    <div class="vn-friend-handle">Active Note</div>
                </div>
            </div>

            <div class="vn-scroll-content">
                <div class="vn-note-card" style="background:${bgColor}; color:${txtColor}; align-items:${alignItems}; font-family:${fontStyle}">
                    <div class="vn-note-text" style="text-align:${textAlign}; text-shadow:${textShadow};">${note.text || 'Share a thought...'}</div>
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
                                <span style="font-weight:600; display:flex; align-items:center; gap:4px;">
                                    ${liker.displayName || 'User'}
                                    ${liker.verified ? icons.verified : ''}
                                </span>
                            </div>
                            <span style="color:#ff3b30;">${icons.heartFilled}</span>
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
        const icons = this.getIcons();
        
        const displayPfp = note.pfp || this.currentUserProfile?.photoURL || 'https://via.placeholder.com/85';
        const displayName = note.username || this.currentUserProfile?.name || 'User';
        const displayHandle = note.handle ? `@${note.handle}` : (this.currentUserProfile?.username ? `@${this.currentUserProfile.username}` : '');
        const isVerified = note.verified === true || this.currentUserProfile?.verified === true;

        const textAlign = note.textAlign || 'center';
        const alignItems = textAlign === 'left' ? 'flex-start' : 'center';
        const fontStyle = note.font || 'system-ui';
        
        // Gradient Support
        const bgColor = note.bgColor || '#262626';
        const txtColor = note.textColor || '#fff';
        const textShadow = this.getTextShadow(txtColor);

        return `
            <div class="vn-profile-header vn-clickable" id="vn-header-click">
                <img src="${displayPfp}" class="vn-friend-pfp">
                <div class="vn-friend-info">
                    <div class="vn-friend-name">
                        ${displayName}
                        ${isVerified ? icons.verified : ''}
                    </div>
                    <div class="vn-friend-handle">${displayHandle}</div>
                </div>
            </div>

            <div class="vn-scroll-content">
                <div class="vn-note-card" id="vn-active-card" style="background:${bgColor}; color:${txtColor}; align-items:${alignItems}; font-family:${fontStyle}">
                    <div class="vn-pop-heart" id="vn-pop-heart">${icons.heartFilled}</div>
                    <div class="vn-note-text" style="text-align:${textAlign}; text-shadow:${textShadow};">${note.text}</div>
                    ${note.songName ? `
                        <div class="vn-song-pill">
                            <svg class="vn-music-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                            <span>${note.songName} • ${note.songArtist || ''}</span>
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
                    <button id="vn-send-text-btn" class="vn-send-btn">${icons.send}</button>
                    <button class="vn-heart-btn" id="like-toggle-btn">
                        ${isLiked ? icons.heartFilled : icons.heartEmpty}
                    </button>
                </div>
            </div>
        `;
    }

    async handleProfileRedirect() {
        if (!this.currentNote) return;
        const uid = this.currentNote.uid;
        let username = this.currentUserProfile ? this.currentUserProfile.username : null;

        if (!username && this.currentNote.username && !this.currentNote.username.includes(" ")) {
            username = this.currentNote.username;
        }

        if (!username) {
            try {
                if(navigator.vibrate) navigator.vibrate(5);
                const doc = await this.db.collection('users').doc(uid).get();
                if (doc.exists) {
                    username = doc.data().username;
                    if(!this.currentUserProfile) this.currentUserProfile = doc.data();
                }
            } catch (e) {
                console.error("Error fetching user for redirect:", e);
            }
        }

        const param = username || uid;
        window.location.href = `userProfile.html?user=${param}`;
    }

    attachDynamicListeners() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const icons = this.getIcons();

        // --- ATTACH REDIRECT LISTENER ---
        const headerClick = this.querySelector('#vn-header-click');
        if (headerClick) {
            headerClick.onclick = () => this.handleProfileRedirect();
        }

        // Double Tap Logic
        const card = this.querySelector('#vn-active-card');
        if(card && !this.isOwnNote) {
            card.addEventListener('click', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - this.lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    // Double Tap Detected
                    const popHeart = this.querySelector('#vn-pop-heart');
                    const likeBtn = this.querySelector('#like-toggle-btn');
                    
                    popHeart.classList.add('animate');
                    setTimeout(() => popHeart.classList.remove('animate'), 1000);
                    
                    if(navigator.vibrate) navigator.vibrate([10, 30]);

                    if(likeBtn && likeBtn.innerHTML.includes('fill="none"')) {
                         likeBtn.click();
                    }
                }
                this.lastTap = currentTime;
            });
        }

        const leaveNoteBtn = this.querySelector('#vn-leave-new-note');
        if(leaveNoteBtn) {
            leaveNoteBtn.onclick = () => {
                if(navigator.vibrate) navigator.vibrate(10);
                window.location.href = 'notes.html';
            };
        }

        const deleteBtn = this.querySelector('#delete-note-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if(navigator.vibrate) navigator.vibrate(10);
                if(confirm("Delete this note?")) {
                    try {
                        // Mark as inactive in 'notes' collection (this is the correct collection now)
                        await this.db.collection("notes").doc(this.currentNote.id).update({ isActive: false });
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
                const isCurrentlyLiked = likeBtn.innerHTML.includes('#ff3b30');
                
                likeBtn.innerHTML = isCurrentlyLiked ? icons.heartEmpty : icons.heartFilled;
                likeBtn.style.transform = "scale(1.3)";
                setTimeout(() => likeBtn.style.transform = "scale(1)", 150);

                const noteRef = this.db.collection("notes").doc(this.currentNote.id);
                try {
                    if (!isCurrentlyLiked) {
                        const userDoc = await this.db.collection('users').doc(user.uid).get();
                        const userData = userDoc.exists ? userDoc.data() : {};
                        
                        await noteRef.update({
                            likes: firebase.firestore.FieldValue.arrayUnion({ 
                                uid: user.uid, 
                                displayName: userData.name || user.displayName,
                                username: userData.username || user.displayName,
                                photoURL: userData.photoURL || user.photoURL, 
                                verified: userData.verified || false,
                                timestamp: firebase.firestore.Timestamp.now()
                            })
                        });
                        
                        // ADD NOTIFICATION
                        if (this.currentNote.uid !== user.uid) {
                            await this.db.collection('notifications').add({
                                recipientId: this.currentNote.uid,
                                type: 'like',
                                senderId: user.uid,
                                senderName: userData.name || user.displayName,
                                senderPic: userData.photoURL || user.photoURL,
                                isVerified: userData.verified || false,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                noteData: {
                                    text: this.currentNote.text,
                                    bgColor: this.currentNote.bgColor,
                                    textColor: this.currentNote.textColor,
                                    songName: this.currentNote.songName
                                }
                            });
                        }

                    } else {
                        const likerObj = this.currentNote.likes.find(l => l.uid === user.uid);
                        if (likerObj) {
                            await noteRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(likerObj) });
                        }
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
        if(navigator.vibrate) navigator.vibrate(20);

        const myUid = firebase.auth().currentUser.uid;
        const targetUid = this.currentNote.uid;
        const chatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;
        
        // Full Metadata for Chat Bubble
        const noteMetadata = {
            text: this.currentNote.text || "",
            bgColor: this.currentNote.bgColor || "#262626",
            textColor: this.currentNote.textColor || "#fff",
            textAlign: this.currentNote.textAlign || 'center',
            songName: this.currentNote.songName || null,
            songArtist: this.currentNote.songArtist || null,
            songArt: this.currentNote.songArt || null,
            username: this.currentNote.username || "User",
            pfp: this.currentNote.pfp || null,
            verified: this.currentNote.verified || false,
            uid: this.currentNote.uid,
            font: this.currentNote.font || 'system-ui' // Include Font!
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
                background-size: cover;
                background-position: center;
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

            .note-like-indicator {
                position: absolute;
                top: 72px; 
                right: 0px;  
                background: #1c1c1e;
                border-radius: 50%;
                width: 22px; height: 22px;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.4);
                border: 2px solid #000; 
                z-index: 20;
            }
            .note-like-indicator svg { width: 12px; height: 12px; fill: #ff3b30; stroke: none; }

            .note-text-content {
                line-height: 1.25;
                font-weight: 500;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                width: 100%;
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

    // === CRITICAL FIX: QUERY "notes" COLLECTION WITH ACTIVE FILTER ===
    setupMyNote: function(user) {
        const db = firebase.firestore();
        // Query for MY active note in 'notes' collection (Sort by newest)
        // Ensure "Active" logic is robust (ignores old docs)
        db.collection("notes")
            .where("uid", "==", user.uid)
            .where("isActive", "==", true)
            .onSnapshot(snapshot => {
                const btn = document.getElementById('my-note-btn');
                const preview = document.getElementById('my-note-preview');
                if (!btn || !preview) return; 

                let data = null;
                let noteId = null;

                if (!snapshot.empty) {
                    // Get latest doc from client-side array
                    const docs = snapshot.docs;
                    const doc = docs[docs.length - 1]; // Fallback if multiple are active
                    data = doc.data();
                    noteId = doc.id;
                    
                    // Expiration Check (24H)
                    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
                        db.collection("notes").doc(noteId).update({ isActive: false });
                        data = null;
                    }
                }

                preview.classList.add('visible');

                if(data && (data.text || data.songName)) {
                    // Use 'background' to support gradients
                    preview.style.background = data.bgColor || '#262626'; 
                    preview.style.color = data.textColor || '#fff';
                    
                    preview.innerHTML = `
                        ${data.text ? `<div class="note-text-content" style="text-align:${data.textAlign || 'center'}; font-family:${data.font || 'system-ui'}">${data.text}</div>` : ''}
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
                        // Pass note data + ID so viewer listens to correct doc
                        if(data) viewer.open({ ...data, id: noteId }, true);
                    };
                } else {
                    // Empty State Logic
                    preview.style.background = 'rgba(255,255,255,0.1)';
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

            // Handle potential object/string mix in arrays
            const followingUIDs = myFollowing.map(i => typeof i === 'string' ? i : i.uid);
            const followersUIDs = myFollowers.map(i => typeof i === 'string' ? i : i.uid);

            const mutualUIDs = followingUIDs.filter(uid => followersUIDs.includes(uid));

            if(mutualUIDs.length === 0) {
                container.querySelectorAll('.friend-note').forEach(e => e.remove());
                return;
            }

            const chunks = [];
            let tempUIDs = [...mutualUIDs];
            while(tempUIDs.length > 0) chunks.push(tempUIDs.splice(0, 10)); // Limit 10

            chunks.forEach(chunk => {
                // Query "notes" collection, filtering by UID + Active Status
                db.collection("notes")
                    .where("uid", "in", chunk) 
                    .where("isActive", "==", true)
                    .onSnapshot(snapshot => {
                        snapshot.docChanges().forEach(change => {
                            const noteData = change.doc.data();
                            const uid = change.doc.id; // Note Document ID
                            
                            const existingEl = document.getElementById(`note-${uid}`);
                            if(existingEl) existingEl.remove();

                            if (change.type !== "removed" && (!noteData.expiresAt || noteData.expiresAt.toDate() > new Date())) {
                                const isLiked = noteData.likes && noteData.likes.some(l => l.uid === user.uid);
                                const div = document.createElement('div');
                                div.id = `note-${uid}`; 
                                div.className = 'note-item friend-note has-note';
                                
                                // Robust Background support
                                const bgStyle = `background:${noteData.bgColor || '#262626'}; color:${noteData.textColor || '#fff'}`;

                                div.innerHTML = `
                                    <div class="note-bubble visible" style="${bgStyle}">
                                        <div class="note-text-content" style="text-align:${noteData.textAlign || 'center'}; font-family:${noteData.font || 'system-ui'}">${noteData.text}</div>
                                        ${noteData.songName ? `
                                            <div class="note-music-tag">
                                                <svg viewBox="0 0 24 24" style="width:10px; fill:currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                                <span>${noteData.songName.substring(0, 10)}${noteData.songName.length>10?'...':''}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <img src="${noteData.pfp || 'https://via.placeholder.com/65'}" class="note-pfp">
                                    ${isLiked ? `
                                        <div class="note-like-indicator">
                                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                        </div>` : ''}
                                    <span class="note-username">${(noteData.username || 'User').split(' ')[0]}</span>
                                `;
                                div.onclick = () => {
                                    const viewer = document.querySelector('view-notes');
                                    const nav = document.querySelector('main-navbar');
                                    if(nav) nav.classList.add('hidden');
                                    if(navigator.vibrate) navigator.vibrate(10);
                                    // Pass note data with ID
                                    viewer.open({ ...noteData, id: uid }, false);
                                };
                                container.appendChild(div);
                            }
                        });
                    });
            });

        } catch (e) { console.error("Error loading notes:", e); }
    }
};

document.addEventListener('DOMContentLoaded', () => NotesManager.init());
