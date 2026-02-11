class ChatLoader extends HTMLElement {
    constructor() {
        super();
        
        // --- ⚙️ CONFIGURATION (Change Here) ---
        this.config = {
            // Professional 'Ding' Sound
            soundUrl: 'https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3', 
            // Notification Background (Glassmorphism Black)
            themeColor: 'rgba(15, 15, 15, 0.92)',
            // Text Color for App Name
            accentColor: '#00d2ff' 
        };

        this._unsubInbox = null;
        this._unsubUser = null;
        this.myUid = null;
        this.userCache = JSON.parse(localStorage.getItem('goorac_u_cache')) || {};
        this.pinnedChats = [];
        this.following = [];
        
        // Configuration for limits
        this.MAX_PREFETCH_CHATS = 15; // Only keep messages fresh for top 15 active chats

        // Initialize Audio
        this.notifSound = new Audio(this.config.soundUrl); 
    }

    connectedCallback() {
        this.initFirebase();
        this.initAuth();
        this.createNotificationContainer(); // Setup popup UI
    }

    disconnectedCallback() {
        if (this._unsubInbox) this._unsubInbox();
        if (this._unsubUser) this._unsubUser();
    }

    // NEW: Inject Styles and Container for Native-like Notifications
    createNotificationContainer() {
        // Prevent duplicate containers
        if(document.getElementById('cl-notif-container')) return;

        const style = document.createElement('style');
        style.textContent = `
            #cl-notif-container {
                position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
                width: 95%; max-width: 380px; z-index: 100000;
                display: flex; flex-direction: column; gap: 8px;
                pointer-events: none;
            }
            .cl-toast {
                background: ${this.config.themeColor};
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.08);
                color: #fff; padding: 14px 16px; border-radius: 22px;
                display: flex; align-items: flex-start; gap: 14px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                opacity: 0; transform: translateY(-30px) scale(0.95);
                transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.4s ease;
                pointer-events: auto; cursor: default;
                position: relative; overflow: hidden;
            }
            .cl-toast.show { opacity: 1; transform: translateY(0) scale(1); }
            .cl-toast.swiping { transition: none; }
            
            .cl-toast-pfp { 
                width: 48px; height: 48px; min-width: 48px; 
                border-radius: 50%; object-fit: cover; 
                background: #333; border: 1px solid rgba(255,255,255,0.1); 
            }
            .cl-toast-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 3px; }
            
            .cl-app-header {
                font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px;
                color: ${this.config.accentColor}; font-weight: 800; margin-bottom: 2px;
                display: flex; justify-content: space-between;
            }
            .cl-toast-header { display: flex; align-items: center; gap: 5px; }
            .cl-toast-name { font-weight: 700; font-size: 0.95rem; color: #fff; display: flex; align-items: center; gap: 4px; }
            .cl-toast-verified { width: 14px; height: 14px; display: inline-block; vertical-align: middle; }
            .cl-toast-time { font-size: 0.7rem; color: #888; font-weight: 500; }
            .cl-toast-msg { 
                font-size: 0.9rem; color: #ddd; 
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
                line-height: 1.3;
            }
            /* Small handle to indicate swipe */
            .cl-toast::after {
                content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%);
                width: 30px; height: 3px; background: rgba(255,255,255,0.2); border-radius: 10px;
            }
        `;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.id = 'cl-notif-container';
        document.body.appendChild(container);
    }

    initFirebase() {
        if (typeof window.initFirebaseCore === 'function') {
            const success = window.initFirebaseCore();
            if (success) return; 
        }
        if (!firebase.apps.length && window.firebaseConfig) {
            firebase.initializeApp(window.firebaseConfig);
            window.db = firebase.firestore();
            window.rdb = firebase.database();
            window.auth = firebase.auth();
        } else if (!firebase.apps.length) {
            console.error("❌ ChatLoader: config.js not loaded or firebaseConfig missing!");
        }
    }

    initAuth() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.myUid = user.uid;
                this.loadUserData(); 
                this.startInboxListener(); 
            } else {
                this.myUid = null;
                if(this._unsubInbox) this._unsubInbox();
            }
        });
    }

    loadUserData() {
        this._unsubUser = firebase.firestore().collection("users").doc(this.myUid)
            .onSnapshot(doc => {
                const data = doc.data();
                if (data) {
                    this.pinnedChats = data.pinnedChats || [];
                    this.following = data.following || [];
                    this.regenerateInboxCache(); 
                }
            });
    }

    startInboxListener() {
        const db = firebase.firestore();
        this._unsubInbox = db.collection("chats")
            .where("participants", "array-contains", this.myUid)
            .onSnapshot(async snapshot => {
                let needsInboxUpdate = false;
                const updates = snapshot.docChanges().map(async change => {
                    const chatData = change.doc.data();
                    const chatId = change.doc.id;
                    const otherUid = chatData.participants.find(id => id !== this.myUid);

                    if (!this.userCache[otherUid]) {
                        await this.fetchAndCacheUser(otherUid);
                        needsInboxUpdate = true;
                    }

                    // SMART CACHING LOGIC
                    if (change.type === 'added' || change.type === 'modified') {
                         const lastKnownTime = localStorage.getItem(`chat_time_${chatId}`);
                         const serverTime = chatData.lastTimestamp ? chatData.lastTimestamp.toMillis() : 0;
                         
                         if (!lastKnownTime || serverTime > Number(lastKnownTime)) {
                             const isRecent = (Date.now() - serverTime) < (7 * 24 * 60 * 60 * 1000); 
                             if (isRecent || this.pinnedChats.includes(chatId)) {
                                 this.prefetchChatMessages(chatId, serverTime); 
                             }
                         }

                         // NOTIFICATION TRIGGER
                         if (change.type === 'modified' && 
                             chatData.lastSender !== this.myUid && 
                             chatData.seen === false) {
                             
                             let user = this.userCache[otherUid];
                             if(!user) {
                                await this.fetchAndCacheUser(otherUid);
                                user = this.userCache[otherUid];
                             }
                             
                             const isChattingWithUser = window.location.href.includes(`chat.html?user=${user?.username}`);
                             if (!isChattingWithUser) {
                                 this.showNotification(chatData, user);
                             }
                         }
                    }
                    needsInboxUpdate = true;
                });

                await Promise.all(updates);
                if (needsInboxUpdate || snapshot.size > 0) {
                    this.regenerateInboxCache(snapshot.docs);
                }
            });
    }

    // UPDATED: Show Notification with Swipe Logic & Native Header
    showNotification(chat, user) {
        if (!user) return;

        // Play Sound
        this.notifSound.currentTime = 0;
        this.notifSound.play().catch(() => {});
        if(navigator.vibrate) navigator.vibrate([40, 30, 40]);

        const container = document.getElementById('cl-notif-container');
        const notif = document.createElement('div');
        notif.className = 'cl-toast';
        
        const pfp = user.photoURL || 'https://via.placeholder.com/150';
        const name = user.name || user.username || "User";
        let msgText = chat.lastMessage || "New Message";
        if(msgText.includes('<svg') || msgText.includes('Sent a photo')) msgText = "Sent a photo 📷";

        const V_BADGE = `https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg`;
        const verifiedHtml = user.verified ? `<img src="${V_BADGE}" class="cl-toast-verified">` : '';

        notif.innerHTML = `
            <img src="${pfp}" class="cl-toast-pfp">
            <div class="cl-toast-content">
                <div class="cl-app-header">
                    <span>GOORAC QUANTUM</span>
                    <span style="opacity:0.6">now</span>
                </div>
                <div class="cl-toast-header">
                    <span class="cl-toast-name">${name} ${verifiedHtml}</span>
                </div>
                <div class="cl-toast-msg">${msgText}</div>
            </div>
        `;

        // --- CLICK TO OPEN ---
        notif.addEventListener('click', (e) => {
            // Prevent triggering if we were swiping
            if (this.isSwiping) return; 
            if(navigator.vibrate) navigator.vibrate(10);
            window.location.href = `chat.html?user=${user.username}`;
        });

        // --- SWIPE TO DISMISS LOGIC ---
        let startY = 0;
        let currentY = 0;
        this.isSwiping = false;

        notif.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            notif.classList.add('swiping');
            this.isSwiping = false;
        }, {passive: true});

        notif.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff < 0) { // Moving Up
                this.isSwiping = true;
                notif.style.transform = `translateY(${diff}px) scale(0.98)`;
                notif.style.opacity = `${1 - (Math.abs(diff) / 60)}`;
            }
        }, {passive: true});

        notif.addEventListener('touchend', () => {
            notif.classList.remove('swiping');
            const diff = currentY - startY;
            if (this.isSwiping && diff < -40) { // Swiped Up Enough
                notif.style.transform = `translateY(-100px) scale(0.9)`;
                notif.style.opacity = '0';
                setTimeout(() => notif.remove(), 300);
            } else {
                // Snap Back
                notif.style.transform = `translateY(0) scale(1)`;
                notif.style.opacity = '1';
                this.isSwiping = false;
            }
        });

        container.appendChild(notif);

        // Animate In
        requestAnimationFrame(() => notif.classList.add('show'));

        // Auto Remove (Extended to 5 seconds + Animation)
        setTimeout(() => {
            if(document.body.contains(notif)) {
                notif.classList.remove('show');
                setTimeout(() => { if(notif.parentNode) notif.remove(); }, 500); 
            }
        }, 5000); 
    }

    async fetchAndCacheUser(uid) {
        if (!uid) return;
        try {
            const doc = await firebase.firestore().collection("users").doc(uid).get();
            if (doc.exists) {
                this.userCache[uid] = doc.data();
                localStorage.setItem('goorac_u_cache', JSON.stringify(this.userCache));
                const userData = doc.data();
                if(userData.username) {
                    localStorage.setItem(`chat_user_${userData.username}`, JSON.stringify({
                        ...userData,
                        uid: uid 
                    }));
                }
            }
        } catch (e) {
            console.error("BG Loader: User fetch error", e);
        }
    }

    async prefetchChatMessages(chatId, timestamp) {
        try {
            const snap = await firebase.firestore().collection("chats").doc(chatId).collection("messages")
                .orderBy("timestamp", "desc")
                .limit(20)
                .get();

            if (!snap.empty) {
                const msgsToSave = snap.docs.map(doc => {
                    let m = doc.data();
                    m.id = doc.id;
                    if (m.timestamp && m.timestamp.toDate) m.timestampIso = m.timestamp.toDate().toISOString();
                    if (m.seenAt && m.seenAt.toDate) m.seenAtIso = m.seenAt.toDate().toISOString();
                    delete m.timestamp;
                    delete m.seenAt;
                    return m;
                });
                
                msgsToSave.sort((a, b) => new Date(a.timestampIso) - new Date(b.timestampIso));
                localStorage.setItem(`chat_msgs_${chatId}`, JSON.stringify(msgsToSave));
                
                if(timestamp) {
                    localStorage.setItem(`chat_time_${chatId}`, timestamp);
                }
            }
        } catch (e) {
            console.error("BG Loader: Message fetch error", e);
        }
    }

    regenerateInboxCache(docs) {
        if (!docs) return; 

        const badgeColors = ['#ff00ff', '#00ff41', '#00d2ff', '#ffff00', '#ff4444', '#aa00ff', '#ff9900'];
        const V_URL = "https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg";

        const chatItems = docs.map(doc => {
            const chat = doc.data();
            const otherUid = chat.participants.find(id => id !== this.myUid);
            const u = this.userCache[otherUid];
            const isPinned = this.pinnedChats.includes(doc.id);
            return { id: doc.id, chat, u, otherUid, isPinned };
        });

        chatItems.sort((a,b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.chat.lastTimestamp?.seconds || 0) - (a.chat.lastTimestamp?.seconds || 0);
        });

        let htmlAccumulator = "";

        chatItems.forEach(({id, chat, u, otherUid, isPinned}) => {
            if (!u) return; 

            let isUnread = false;
            let count = 0;
            if (chat.unreadCount && chat.unreadCount[this.myUid] !== undefined) {
                count = Number(chat.unreadCount[this.myUid]);
            }
            if (count > 0) isUnread = true;
            else if (chat.lastSender && chat.lastSender !== this.myUid) isUnread = chat.seen === false;

            const finalName = u.name || u.displayName || u.username || "Unknown";
            const lastMsg = chat.lastMessage ? chat.lastMessage : `<span style="font-style:italic; opacity:0.6;">Frequency cleared</span>`;
            const amIFollowing = this.following.some(f => (typeof f === 'string' ? f : f.uid) === otherUid);
            const randomColor = badgeColors[Math.floor(Math.random() * badgeColors.length)];
            const timeStr = chat.lastTimestamp ? this.formatTime(chat.lastTimestamp.toDate()) : '';

            const safeUserStr = encodeURIComponent(JSON.stringify({
                name: finalName, username: u.username, photoURL: u.photoURL, verified: u.verified
            }));

            htmlAccumulator += `
                <div class="chat-item" 
                     ontouchstart="startLongPress(this, '${id}', ${isPinned}, '${safeUserStr}')" 
                     ontouchend="endLongPress(this)" 
                     ontouchmove="cancelLongPress(this)" 
                     onclick="enterChat(event, '${u.username}')">
                    <div class="pfp-container">
                        <img src="${u.photoURL || 'https://via.placeholder.com/150'}" class="chat-pfp">
                        <div class="online-indicator" id="online-${otherUid}"></div>
                    </div>
                    <div class="chat-info">
                        <div class="chat-top-row">
                            <span class="u-name" id="name-${id}">
                                ${finalName} 
                                ${u.verified ? `<img src="${V_URL}" class="v-badge">` : ''}
                                ${isPinned ? `<span class="pin-indicator"></span>` : ''}
                            </span>
                            <span style="font-size:0.7rem; color:#444;">${timeStr}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="last-msg" id="last-msg-${id}" style="${isUnread ? 'color:#fff; font-weight:700;' : ''}">
                                ${lastMsg}
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;" id="meta-${id}">
                                ${!amIFollowing ? `<button class="follow-btn" onclick="visitProfile(event, '${u.username}')">Profile</button>` : ''}
                                ${isUnread ? `<div class="unread-badge" style="background:${randomColor}; box-shadow: 0 0 12px ${randomColor};"></div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        if (htmlAccumulator) {
            localStorage.setItem('goorac_inbox_html', htmlAccumulator);
        }
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const sec = Math.floor(diff / 1000);
        const min = Math.floor(sec / 60);
        const hour = Math.floor(min / 60);
        const day = Math.floor(hour / 24);

        if(sec < 60) return "Just now";
        if(min < 60) return `${min}m ago`;
        if(hour < 24) return `${hour}h ago`;
        if(day < 7) return `${day}d ago`;
        return date.toLocaleDateString();
    }
}

customElements.define('chat-loader', ChatLoader);
