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
        this.MAX_PREFETCH_CHATS = 15; // Only keep messages fresh for top 15 active chats

        // Notification Sync Maps
        this.likeMap = new Map();
        this.followMap = new Map();
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
                this.startNotificationListener(); // Sync Notifications in background
            } else {
                this.myUid = null;
                if(this._unsubInbox) this._unsubInbox();
                if(this._unsubLikes) this._unsubLikes();
                if(this._unsubFollowers) this._unsubFollowers();
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

    // 2. The Master Listener for Chats
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
                         const isRecent = chatData.lastTimestamp && (Date.now() - chatData.lastTimestamp.toMillis()) < (7 * 24 * 60 * 60 * 1000); // 7 days
                         
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

    // --- 💎 Master Listener for Notifications (Background HTML Sync) ---
    startNotificationListener() {
        const db = firebase.firestore();
        const uid = this.myUid;

        // A. Listen for LIKES on my notes
        this._unsubLikes = db.collection("notes").where("uid", "==", uid)
            .onSnapshot(async snapshot => {
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    if (data.likes) {
                        for (const liker of data.likes) {
                            if (liker.uid !== uid && liker.timestamp) {
                                const timeMillis = liker.timestamp.toMillis ? liker.timestamp.toMillis() : liker.timestamp;
                                const notifId = `like_${liker.uid}_${timeMillis}`;
                                const mapKey = `like_${liker.uid}_${doc.id}`; // Deduplicate by note
                                
                                const u = await this.getFastUser(liker.uid);
                                this.likeMap.set(mapKey, {
                                    id: notifId, type: 'like', senderId: liker.uid,
                                    senderName: u.name, senderUsername: u.username,
                                    senderPic: u.photoURL, isVerified: u.verified,
                                    timestamp: timeMillis, text: "liked your note.",
                                    noteData: { text: data.text, songName: data.songName, bgColor: data.bgColor, textColor: data.textColor }
                                });
                            }
                        }
                    }
                }
                this.regenerateNotificationCache();
            });

        // B. Listen for new FOLLOWERS
        this._unsubFollowers = db.collection("users").doc(uid)
            .onSnapshot(async doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.followers) {
                        for (const f of data.followers) {
                            if (f.timestamp) {
                                const timeMillis = f.timestamp.toMillis ? f.timestamp.toMillis() : f.timestamp;
                                const notifId = `follow_${f.uid}_${timeMillis}`;
                                const mapKey = `follow_${f.uid}`; // Deduplicate by user
                                
                                const u = await this.getFastUser(f.uid);
                                this.followMap.set(mapKey, {
                                    id: notifId, type: 'follow', senderId: f.uid,
                                    senderName: u.name, senderUsername: u.username,
                                    senderPic: u.photoURL, isVerified: u.verified,
                                    timestamp: timeMillis, text: "started following you."
                                });
                            }
                        }
                    }
                }
                this.regenerateNotificationCache();
            });
    }

    async getFastUser(uid) {
        if (this.userCache[uid]) return this.userCache[uid];
        const doc = await firebase.firestore().collection("users").doc(uid).get();
        if (doc.exists) {
            const d = doc.data();
            this.userCache[uid] = { name: d.name || d.username, username: d.username, photoURL: d.photoURL, verified: d.verified };
            localStorage.setItem('goorac_u_cache', JSON.stringify(this.userCache));
            return this.userCache[uid];
        }
        return { name: "Someone", username: "", photoURL: "", verified: false };
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

    async prefetchChatMessages(chatId) {
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
            }
        } catch (e) {
            console.error("BG Loader: Message fetch error", e);
        }
    }

    // 4. Regenerate Notification HTML and Data Objects
    regenerateNotificationCache() {
        if (!this.myUid) return;
        const READ_KEY = `goorac_read_${this.myUid}`;
        const readList = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
        
        let combined = [];
        this.likeMap.forEach(v => combined.push(v));
        this.followMap.forEach(v => combined.push(v));
        combined.sort((a,b) => b.timestamp - a.timestamp);

        // Store pure data for notifications.html logic
        localStorage.setItem(`goorac_notif_data_${this.myUid}`, JSON.stringify(combined));

        // Pre-render HTML for 0ms loading
        let htmlStr = combined.slice(0, 30).map(n => {
            const isRead = readList.includes(n.id);
            const verifyIcon = n.isVerified ? `<img src="https://img.icons8.com/color/48/verified-badge.png" class="v-badge" style="width:13px;height:13px;vertical-align:-2px;margin-left:2px;">` : '';
            let actionHtml = '';

            if (n.type === 'follow') {
                const isFing = this.following.some(f => (typeof f === 'string' ? f : f.uid) === n.senderId);
                actionHtml = `<button class="btn-follow ${isFing?'btn-following':''}" style="background:${isFing?'transparent':'#0095f6'}; color:#fff; border:${isFing?'1px solid #262626':'none'}; padding:7px 18px; border-radius:8px; font-weight:600; font-size:0.85rem; min-width:90px;">${isFing?'Following':'Follow'}</button>`;
            } else if (n.type === 'like' && n.noteData) {
                let bg = n.noteData.bgColor.includes('gradient') ? `background:${n.noteData.bgColor}` : `background-color:${n.noteData.bgColor}`;
                actionHtml = `<div class="mini-note" style="${bg}; width:44px; height:44px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1); color:${n.noteData.textColor}; font-size:1.2rem;">${n.noteData.text ? '<span style="font-size:0.5rem;">📄</span>' : '🎵'}</div>`;
            }

            return `
                <div class="notif-item ${isRead?'read':'unread'}" data-id="${n.id}" style="display:flex; align-items:center; gap:14px; padding:14px 16px; border-bottom:1px solid #1a1a1a; cursor:pointer; position:relative; ${!isRead?'background:rgba(0,149,246,0.08); border-left:3px solid #0095f6;':''}">
                    <img src="${n.senderPic || 'https://via.placeholder.com/50'}" class="n-avatar" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:1px solid #333; background:#222; flex-shrink:0;">
                    <div class="n-content" style="flex:1; font-size:0.9rem; line-height:1.4; color:#fff; padding-right:10px;">
                        <span class="n-username" style="font-weight:700; color:${!isRead?'#0095f6':'#fff'}">${n.senderName} ${verifyIcon}</span>
                        <span class="n-text" style="color:#ccc; font-weight:${!isRead?'600':'400'}">${n.text}</span>
                        <span class="n-time" style="font-size:0.75rem; color:#a8a8a8; display:block; margin-top:2px;">${this.formatTime(new Date(n.timestamp))}</span>
                    </div>
                    <div class="unread-dot" style="width:8px; height:8px; background:#0095f6; border-radius:50%; margin-left:auto; flex-shrink:0; box-shadow:0 0 8px #0095f6; display:${isRead?'none':'block'};"></div>
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
