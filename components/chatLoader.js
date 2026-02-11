class ChatLoader extends HTMLElement {
    constructor() {
        super();
        this._unsubInbox = null;
        this._unsubUser = null;
        this.myUid = null;
        this.userCache = JSON.parse(localStorage.getItem('goorac_u_cache')) || {};
        this.pinnedChats = [];
        this.following = [];
        
        // Configuration for limits
        this.MAX_PREFETCH_CHATS = 15; // Only keep messages fresh for top 15 active chats
    }

    connectedCallback() {
        this.initFirebase();
        this.initAuth();
    }

    disconnectedCallback() {
        if (this._unsubInbox) this._unsubInbox();
        if (this._unsubUser) this._unsubUser();
    }

    initFirebase() {
        // 1. Try to use the global init function from config.js
        if (typeof window.initFirebaseCore === 'function') {
            const success = window.initFirebaseCore();
            if (success) return; 
        }

        // 2. Fallback: If function didn't run, try using the global config object directly
        if (!firebase.apps.length && window.firebaseConfig) {
            firebase.initializeApp(window.firebaseConfig);
            // Ensure globals are set for consistency with your config.js
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
                this.loadUserData(); // Get pinned chats/following
                this.startInboxListener(); // Start the heavy lifting
            } else {
                this.myUid = null;
                if(this._unsubInbox) this._unsubInbox();
            }
        });
    }

    // 1. Get User's Pinned Chats & Following list to help render the Inbox HTML correctly
    loadUserData() {
        this._unsubUser = firebase.firestore().collection("users").doc(this.myUid)
            .onSnapshot(doc => {
                const data = doc.data();
                if (data) {
                    this.pinnedChats = data.pinnedChats || [];
                    this.following = data.following || [];
                    // Trigger a re-render of inbox cache if user data changes
                    this.regenerateInboxCache(); 
                }
            });
    }

    // 2. The Master Listener
    startInboxListener() {
        const db = firebase.firestore();
        
        // Listen to ALL chats where I am a participant
        this._unsubInbox = db.collection("chats")
            .where("participants", "array-contains", this.myUid)
            .onSnapshot(async snapshot => {
                let needsInboxUpdate = false;

                // A. Handle individual chat updates
                const updates = snapshot.docChanges().map(async change => {
                    const chatData = change.doc.data();
                    const chatId = change.doc.id;
                    const otherUid = chatData.participants.find(id => id !== this.myUid);

                    // 1. Ensure we have the Opponent's Profile Data Cached
                    if (!this.userCache[otherUid]) {
                        await this.fetchAndCacheUser(otherUid);
                        needsInboxUpdate = true;
                    }

                    // 2. CACHE MESSAGES: If this is a new/modified chat, fetch its latest messages
                    // We only do this for "modified" (new msg) or "added" (new chat) events
                    if (change.type === 'added' || change.type === 'modified') {
                         // Check if we should pre-fetch (Optimization: Don't fetch for very old stale chats)
                         const isRecent = chatData.lastTimestamp && (Date.now() - chatData.lastTimestamp.toMillis()) < (7 * 24 * 60 * 60 * 1000); // 7 days
                         
                         if (isRecent || this.pinnedChats.includes(chatId)) {
                             this.prefetchChatMessages(chatId);
                         }
                    }

                    needsInboxUpdate = true;
                });

                await Promise.all(updates);

                // B. Regenerate the full Inbox HTML for messages.html
                if (needsInboxUpdate || snapshot.size > 0) {
                    this.regenerateInboxCache(snapshot.docs);
                }
            });
    }

    async fetchAndCacheUser(uid) {
        if (!uid) return;
        try {
            const doc = await firebase.firestore().collection("users").doc(uid).get();
            if (doc.exists) {
                this.userCache[uid] = doc.data();
                localStorage.setItem('goorac_u_cache', JSON.stringify(this.userCache));
                
                // Also cache for chat.html specific key (chat_user_username)
                // This ensures instant load when entering chat via URL
                const userData = doc.data();
                if(userData.username) {
                    localStorage.setItem(`chat_user_${userData.username}`, JSON.stringify({
                        ...userData,
                        uid: uid // Ensure UID is attached
                    }));
                }
            }
        } catch (e) {
            console.error("BG Loader: User fetch error", e);
        }
    }

    // 3. Pre-fetch the actual messages for chat.html
    async prefetchChatMessages(chatId) {
        try {
            const snap = await firebase.firestore().collection("chats").doc(chatId).collection("messages")
                .orderBy("timestamp", "desc")
                .limit(20) // Only grab the last 20 to render the first screen instantly
                .get();

            if (!snap.empty) {
                const msgsToSave = snap.docs.map(doc => {
                    let m = doc.data();
                    m.id = doc.id;
                    // Convert timestamps to ISO Strings so JSON.stringify works
                    if (m.timestamp && m.timestamp.toDate) m.timestampIso = m.timestamp.toDate().toISOString();
                    if (m.seenAt && m.seenAt.toDate) m.seenAtIso = m.seenAt.toDate().toISOString();
                    
                    // Remove complex objects
                    delete m.timestamp;
                    delete m.seenAt;
                    return m;
                });
                
                // Reverse to match time order if needed, but chat.html handles sorting
                msgsToSave.sort((a, b) => new Date(a.timestampIso) - new Date(b.timestampIso));

                localStorage.setItem(`chat_msgs_${chatId}`, JSON.stringify(msgsToSave));
                // console.log(`⚡ BG Loader: Updated cache for ${chatId}`);
            }
        } catch (e) {
            console.error("BG Loader: Message fetch error", e);
        }
    }

    // 4. Generate the HTML string for messages.html
    // This replicates the render logic in messages.html so it's ready to go.
    regenerateInboxCache(docs) {
        if (!docs) {
            // If docs not provided (called from loadUserData), we might need to rely on what we have
            // But since this is a background loader, we rely on the listener to provide docs usually.
            // If strictly needed, we could store 'lastDocs' in memory.
            return; 
        }

        const badgeColors = ['#ff00ff', '#00ff41', '#00d2ff', '#ffff00', '#ff4444', '#aa00ff', '#ff9900'];
        const V_URL = "https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg";

        // Map and Sort
        const chatItems = docs.map(doc => {
            const chat = doc.data();
            const otherUid = chat.participants.find(id => id !== this.myUid);
            const u = this.userCache[otherUid];
            const isPinned = this.pinnedChats.includes(doc.id);
            return { id: doc.id, chat, u, otherUid, isPinned };
        });

        // Sort: Pinned first, then by timestamp
        chatItems.sort((a,b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.chat.lastTimestamp?.seconds || 0) - (a.chat.lastTimestamp?.seconds || 0);
        });

        let htmlAccumulator = "";

        chatItems.forEach(({id, chat, u, otherUid, isPinned}) => {
            if (!u) return; // Skip if user data missing (will be caught next update)

            // Unread Logic
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

            // Safe User String for Long Press
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

        // SAVE TO LOCAL STORAGE
        if (htmlAccumulator) {
            localStorage.setItem('goorac_inbox_html', htmlAccumulator);
            // console.log("⚡ BG Loader: Inbox HTML updated in cache");
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
