class ChatLoader extends HTMLElement {
    constructor() {
        super();
        this._unsubInbox = null;
        this._unsubUser = null;
        this._unsubLikes = null;
        this._unsubFollowers = null;
        this.myUid = null;
        this.userCache = JSON.parse(localStorage.getItem('goorac_u_cache')) || {};
        this.pinnedChats = [];
        this.following = [];
        
        // Configuration for limits
        this.MAX_PREFETCH_CHATS = 15; 

        // Notification Sync Map (Unified for Likes & Follows)
        this.notifMap = new Map();
    }

    connectedCallback() {
        this.initFirebase();
        this.initAuth();
    }

    disconnectedCallback() {
        if (this._unsubInbox) this._unsubInbox();
        if (this._unsubUser) this._unsubUser();
        if (this._unsubLikes) this._unsubLikes();
        if (this._unsubFollowers) this._unsubFollowers();
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
                this.startNotificationListener(); 
            } else {
                this.myUid = null;
                if(this._unsubInbox) this._unsubInbox();
                if(this._unsubLikes) this._unsubLikes();
                if(this._unsubFollowers) this._unsubFollowers();
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
                    // Also trigger notif update to refresh "Follow/Following" button states
                    this.regenerateNotificationCache();
                }
            });
    }

    // --- 📨 INBOX LISTENER (UNCHANGED AS REQUESTED) ---
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

                    if (change.type === 'added' || change.type === 'modified') {
                         const isRecent = chatData.lastTimestamp && (Date.now() - chatData.lastTimestamp.toMillis()) < (7 * 24 * 60 * 60 * 1000); 
                         if (isRecent || this.pinnedChats.includes(chatId)) {
                             this.prefetchChatMessages(chatId);
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

    // --- 🔔 NOTIFICATION LISTENER (FIXED & SYNCED) ---
    startNotificationListener() {
        const db = firebase.firestore();
        const uid = this.myUid;
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        // 1. Load existing data from LocalStorage first to prevent overwrites/loops
        try {
            const cachedJson = localStorage.getItem(`goorac_data_${uid}`);
            if (cachedJson) {
                const parsed = JSON.parse(cachedJson);
                parsed.forEach(item => this.notifMap.set(item.dedupeKey, item));
            }
        } catch(e) { console.log("Loader: No existing data"); }

        // A. Listen for LIKES
        this._unsubLikes = db.collection("notes").where("uid", "==", uid)
            .limit(30)
            .onSnapshot(async snapshot => {
                let hasChanges = false;
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    if (data.likes && Array.isArray(data.likes)) {
                        for (const liker of data.likes) {
                            // Skip self or invalid timestamps
                            if (liker.uid === uid || !liker.timestamp) continue;
                            
                            const dedupeKey = `like_${liker.uid}_${doc.id}`;
                            
                            // CHECK IF EXISTS
                            if(this.notifMap.has(dedupeKey)) continue;

                            const timeMillis = liker.timestamp.toMillis ? liker.timestamp.toMillis() : liker.timestamp;
                            if (timeMillis < oneDayAgo) continue;

                            const u = await this.getFastUser(liker.uid);
                            
                            this.notifMap.set(dedupeKey, {
                                dedupeKey: dedupeKey,
                                id: `${dedupeKey}_${timeMillis}`,
                                type: 'like',
                                senderId: liker.uid,
                                senderName: u.name, senderUsername: u.username,
                                senderPic: u.photoURL, isVerified: u.verified,
                                timestamp: timeMillis, 
                                text: "liked your note.",
                                noteData: { text: data.text, songName: data.songName, bgColor: data.bgColor, textColor: data.textColor }
                            });
                            hasChanges = true;
                        }
                    }
                }
                if(hasChanges) this.regenerateNotificationCache();
            });

        // B. Listen for FOLLOWERS
        this._unsubFollowers = db.collection("users").doc(uid)
            .onSnapshot(async doc => {
                if (doc.exists) {
                    const data = doc.data();
                    let hasChanges = false;
                    if (data.followers && Array.isArray(data.followers)) {
                        for (const f of data.followers) {
                            if (!f.timestamp) continue;
                            const uid = f.uid || f; // Handle legacy string array if exists
                            
                            const dedupeKey = `follow_${uid}`;
                            
                            // CHECK IF EXISTS
                            if(this.notifMap.has(dedupeKey)) continue;

                            const timeMillis = f.timestamp.toMillis ? f.timestamp.toMillis() : f.timestamp;
                            if (timeMillis < oneDayAgo) continue;

                            const u = await this.getFastUser(uid);
                            
                            this.notifMap.set(dedupeKey, {
                                dedupeKey: dedupeKey,
                                id: `${dedupeKey}_${timeMillis}`,
                                type: 'follow',
                                senderId: uid,
                                senderName: u.name, senderUsername: u.username,
                                senderPic: u.photoURL, isVerified: u.verified,
                                timestamp: timeMillis, 
                                text: "started following you."
                            });
                            hasChanges = true;
                        }
                    }
                    if(hasChanges) this.regenerateNotificationCache();
                }
            });
    }

    async getFastUser(uid) {
        if (this.userCache[uid]) return this.userCache[uid];
        try {
            const doc = await firebase.firestore().collection("users").doc(uid).get();
            if (doc.exists) {
                const d = doc.data();
                this.userCache[uid] = { name: d.name || d.username, username: d.username, photoURL: d.photoURL, verified: d.verified };
                localStorage.setItem('goorac_u_cache', JSON.stringify(this.userCache));
                return this.userCache[uid];
            }
        } catch(e) { console.error(e); }
        return { name: "User", username: "", photoURL: "", verified: false };
    }

    async fetchAndCacheUser(uid) {
        if (!uid) return;
        try {
            const doc = await firebase.firestore().collection("users").doc(uid).get();
            if (doc.exists) {
                this.userCache[uid] = doc.data();
                localStorage.setItem('goorac_u_cache', JSON.stringify(this.userCache));
            }
        } catch (e) { console.error("BG Loader: User fetch error", e); }
    }

    async prefetchChatMessages(chatId) {
        try {
            const snap = await firebase.firestore().collection("chats").doc(chatId).collection("messages")
                .orderBy("timestamp", "desc").limit(20).get();

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
            }
        } catch (e) { console.error("BG Loader: Message fetch error", e); }
    }

    // --- REGENERATE CACHE (DATA + HTML) ---
    regenerateNotificationCache() {
        if (!this.myUid) return;
        
        const READ_KEY = `goorac_read_${this.myUid}`;
        const DATA_KEY = `goorac_data_${this.myUid}`;
        
        let readIds = [];
        try {
            const rawReads = localStorage.getItem(READ_KEY);
            if (rawReads) readIds = JSON.parse(rawReads);
        } catch(e){}
        const readSet = new Set(readIds);
        
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        // Convert Map to Array
        let allData = Array.from(this.notifMap.values());
        
        // Filter & Sort
        allData = allData.filter(n => n.timestamp >= oneDayAgo);
        allData.sort((a,b) => b.timestamp - a.timestamp);

        // 1. SAVE DATA (Source of Truth for notifications.html)
        localStorage.setItem(DATA_KEY, JSON.stringify(allData));

        // 2. SAVE HTML (For Instant Load)
        const htmlStr = allData.slice(0, 30).map(n => {
            const isRead = readSet.has(n.id);
            const verifyIcon = n.isVerified ? `<img src="https://img.icons8.com/color/48/verified-badge.png" class="v-badge" style="width:13px;height:13px;vertical-align:-2px;margin-left:2px;">` : '';
            let actionHtml = '';

            if (n.type === 'follow') {
                const isFing = this.following.includes(n.senderId); // Check against My Following List
                const btnClass = isFing ? 'btn-following' : '';
                const btnText = isFing ? 'Following' : 'Follow';
                const btnStyle = isFing ? 'background:transparent; color:#fff; border:1px solid #262626;' : 'background:#0095f6; color:white; border:none;';
                
                actionHtml = `<button class="btn-follow ${btnClass}" style="${btnStyle} padding:7px 18px; border-radius:8px; font-weight:600; font-size:0.85rem; min-width:90px; cursor:pointer;">${btnText}</button>`;
            } else if (n.type === 'like' && n.noteData) {
                let bg = n.noteData.bgColor && n.noteData.bgColor.includes('gradient') ? `background:${n.noteData.bgColor}` : `background-color:${n.noteData.bgColor||'#333'}`;
                let content = n.noteData.text ? `<span style="font-size:0.5rem; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:40px;">${n.noteData.text}</span>` : `<span style="font-size:1rem;">🎵</span>`;
                actionHtml = `<div class="mini-note" style="${bg}; width:44px; height:44px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1); color:${n.noteData.textColor||'#fff'}; overflow:hidden;">${content}</div>`;
            }

            const unreadClass = isRead ? 'read' : 'unread';
            const unreadStyle = isRead ? 'background:transparent; border-left-color:transparent;' : 'background:rgba(0,149,246,0.08); border-left:3px solid #0095f6;';
            const dotDisplay = isRead ? 'none' : 'block';
            const nameColor = isRead ? '#fff' : '#0095f6';
            const textWeight = isRead ? '400' : '600';

            return `
                <div class="notif-item ${unreadClass}" data-id="${n.id}" style="display:flex; align-items:center; gap:14px; padding:14px 16px; border-bottom:1px solid #1a1a1a; cursor:pointer; position:relative; transition:background 0.3s; ${unreadStyle}">
                    <img src="${n.senderPic || 'https://via.placeholder.com/50'}" class="n-avatar" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:1px solid #333; background:#222; flex-shrink:0;">
                    <div class="n-content" style="flex:1; font-size:0.9rem; line-height:1.4; color:#fff; padding-right:10px;">
                        <span class="n-username" style="font-weight:700; color:${nameColor}; margin-right:4px;">${n.senderName} ${verifyIcon}</span>
                        <span class="n-text" style="color:#ccc; font-weight:${textWeight};">${n.text}</span>
                        <span class="n-time" style="font-size:0.75rem; color:#a8a8a8; display:block; margin-top:2px;">${this.formatTime(new Date(n.timestamp))}</span>
                    </div>
                    <div class="unread-dot" style="width:8px; height:8px; background:#0095f6; border-radius:50%; margin-left:auto; flex-shrink:0; box-shadow:0 0 8px #0095f6; display:${dotDisplay};"></div>
                    <div class="n-action" style="flex-shrink:0; margin-left:4px;">${actionHtml}</div>
                </div>
            `;
        }).join('');
        
        if (htmlStr) localStorage.setItem('goorac_notif_html', htmlStr);
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
            
            const amIFollowing = this.following.includes(otherUid);
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
