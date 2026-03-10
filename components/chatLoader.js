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

        // Notification Audio (Crisp 'Ding' Sound)
        this.notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 

        // NEW: Variables to track multiple incoming messages
        this.activeNotifCount = 0;
        this.activeNotifUsers = new Set();
        this.notifTimer = null;
    }

    connectedCallback() {
        this.initFirebase();
        this.initAuth();
        this.createNotificationContainer(); // NEW: Setup popup UI
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
        // Redesigned UI: Sleeker, glassmorphism pill-shape, smoother animations
        style.textContent = `
            #cl-notif-container {
                position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
                width: 90%; max-width: 380px; z-index: 100000;
                display: flex; flex-direction: column; gap: 8px;
                pointer-events: none;
            }
            .cl-toast {
                background: rgba(30, 30, 30, 0.85);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #fff; padding: 10px 14px; border-radius: 24px;
                display: flex; align-items: center; gap: 14px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                opacity: 0; transform: translateY(-30px);
                transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
                pointer-events: auto; cursor: pointer;
            }
            .cl-toast.show { opacity: 1; transform: translateY(0); }
            .cl-toast-pfp { width: 40px; height: 40px; min-width: 40px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1); background: #333;}
            .cl-toast-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
            .cl-toast-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;}
            .cl-toast-name { font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 4px; color: #fff; letter-spacing: 0.2px;}
            .cl-toast-verified { width: 14px; height: 14px; }
            .cl-toast-time { font-size: 0.7rem; color: #aaa; font-variant-numeric: tabular-nums; }
            .cl-toast-msg { font-size: 0.85rem; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        `;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.id = 'cl-notif-container';
        document.body.appendChild(container);
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
                    const isGroup = chatData.isGroup === true;
                    const otherUid = chatData.participants.find(id => id !== this.myUid);

                    // 1. Ensure we have the Opponent's/Sender's Profile Data Cached
                    if (!isGroup) {
                        if (!this.userCache[otherUid]) {
                            await this.fetchAndCacheUser(otherUid);
                            needsInboxUpdate = true;
                        }
                    } else {
                        const lastSender = chatData.lastSender;
                        if (lastSender && lastSender !== this.myUid && !this.userCache[lastSender]) {
                            await this.fetchAndCacheUser(lastSender);
                        }
                    }

                    // 2. SMART CACHING (The Fix for 109k Reads)
                    if (change.type === 'added' || change.type === 'modified') {
                         const lastKnownTime = localStorage.getItem(`chat_time_${chatId}`);
                         const serverTime = chatData.lastTimestamp ? chatData.lastTimestamp.toMillis() : 0;
                         
                         // ONLY fetch if the server has newer data than what we have locally
                         // This prevents re-fetching 20 messages every time the page loads
                         if (!lastKnownTime || serverTime > Number(lastKnownTime)) {
                             const isRecent = (Date.now() - serverTime) < (7 * 24 * 60 * 60 * 1000); // 7 days
                             
                             if (isRecent || this.pinnedChats.includes(chatId)) {
                                 this.prefetchChatMessages(chatId, serverTime); // Pass serverTime to save it later
                             }
                         }

                         // NEW: TRIGGER NOTIFICATION POPUP
                         // Conditions: Modified event (new msg), I am NOT the sender, It is NOT seen
                         let isUnreadNotif = false;
                         if (isGroup) {
                             isUnreadNotif = chatData.unreadCount && chatData.unreadCount[this.myUid] > 0;
                         } else {
                             isUnreadNotif = chatData.seen === false;
                         }

                         if (change.type === 'modified' && 
                             chatData.lastSender !== this.myUid && 
                             isUnreadNotif) {
                             
                             let entityObj = isGroup ? chatData : this.userCache[otherUid];
                             let senderUserObj = isGroup ? (this.userCache[chatData.lastSender] || {}) : null;

                             if (!isGroup && !entityObj) {
                                await this.fetchAndCacheUser(otherUid);
                                entityObj = this.userCache[otherUid];
                             }
                             
                             // Don't show if already on that chat page
                             const targetUrl = isGroup ? `groupChat.html?id=${chatId}` : `chat.html?user=${entityObj?.username}`;
                             const isChattingWithUser = window.location.href.includes(targetUrl);
                             if (!isChattingWithUser && entityObj) {
                                 this.showNotification(chatData, entityObj, isGroup, senderUserObj, chatId);
                             }
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

    // NEW: Function to render and show the notification popup with Group Support
    showNotification(chat, entity, isGroup, senderUser, chatId) {
        if (!entity) return;

        // Play Sound (Commented out as requested)
        // this.notifSound.currentTime = 0;
        // this.notifSound.play().catch(() => {}); // Catch autoplay blocks
        
        // Vibrate (Commented out as requested)
        // if(navigator.vibrate) navigator.vibrate(50);

        const container = document.getElementById('cl-notif-container');
        
        // Handle "Like" messages or images
        let msgText = chat.lastMessage || "New Message";
        if(msgText.includes('<svg') || msgText.includes('Sent a photo')) msgText = "Sent a photo 📷";

        // Append Sender's name if it's a group
        if (isGroup && senderUser && senderUser.name) {
            msgText = `${senderUser.name}: ${msgText}`;
        }

        const time = "Now";

        // Check if there is already an active notification
        let existingNotif = container.querySelector('.cl-toast');
        
        if (existingNotif) {
            // Group notifications
            this.activeNotifCount = (this.activeNotifCount || 1) + 1;
            if (!this.activeNotifUsers) this.activeNotifUsers = new Set();
            
            const uniqueId = isGroup ? chatId : entity.username;
            this.activeNotifUsers.add(uniqueId);

            if (this.activeNotifUsers.size === 1) {
                // Multiple messages from the SAME user/group
                existingNotif.querySelector('.cl-toast-msg').innerText = `[${this.activeNotifCount} new messages] ${msgText}`;
            } else {
                // Messages from MULTIPLE users/groups
                existingNotif.querySelector('.cl-toast-name').innerText = `New Messages`;
                existingNotif.querySelector('.cl-toast-msg').innerText = `You have ${this.activeNotifCount} new messages from ${this.activeNotifUsers.size} chats`;
                existingNotif.querySelector('.cl-toast-pfp').src = 'https://via.placeholder.com/150'; // Generic icon for multiple
                
                // Clear the verified badge for multi-user grouping
                const verifiedIcon = existingNotif.querySelector('.cl-toast-verified');
                if (verifiedIcon) verifiedIcon.remove();

                // Update onclick to go to the main inbox instead
                existingNotif.onclick = () => {
                    // if(navigator.vibrate) navigator.vibrate(10);
                    window.location.href = `messages.html`; 
                };
            }

            // Reset the removal timer
            clearTimeout(this.notifTimer);
            this.notifTimer = setTimeout(() => {
                existingNotif.classList.remove('show');
                setTimeout(() => { 
                    if(existingNotif.parentNode) existingNotif.remove(); 
                    this.activeNotifCount = 0;
                    this.activeNotifUsers.clear();
                }, 500);
            }, 4000);

            return; // Exit early so we don't create a second popup element
        }

        // Setup for a completely fresh notification
        this.activeNotifCount = 1;
        this.activeNotifUsers = new Set([isGroup ? chatId : entity.username]);

        const notif = document.createElement('div');
        notif.className = 'cl-toast';
        
        const DEFAULT_GROUP_IMAGE = "https://fabulouspic.com/wp-content/uploads/2024/08/a-black-and-white-photo-of-a-persons-face.jpg";
        const pfp = isGroup ? (entity.groupPhoto || DEFAULT_GROUP_IMAGE) : (entity.photoURL || 'https://via.placeholder.com/150');
        const name = isGroup ? entity.groupName : (entity.name || entity.username || "User");
        const verifiedBadge = (!isGroup && entity.verified) ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" class="cl-toast-verified">` : '';

        notif.innerHTML = `
            <img src="${pfp}" class="cl-toast-pfp">
            <div class="cl-toast-content">
                <div class="cl-toast-header">
                    <div class="cl-toast-name">${name} ${verifiedBadge}</div>
                    <div class="cl-toast-time">${time}</div>
                </div>
                <div class="cl-toast-msg">${msgText}</div>
            </div>
        `;

        // Click interaction dynamically routes to standard or group chat
        notif.onclick = () => {
            // if(navigator.vibrate) navigator.vibrate(10);
            window.location.href = isGroup ? `groupChat.html?id=${chatId}` : `chat.html?user=${entity.username}`;
        };

        container.appendChild(notif);

        // Animate In (Next Frame)
        requestAnimationFrame(() => notif.classList.add('show'));

        // Remove after 4 seconds
        this.notifTimer = setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => { 
                if(notif.parentNode) notif.remove(); 
                this.activeNotifCount = 0;
                this.activeNotifUsers.clear();
            }, 500); // Wait for transition
        }, 4000);
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
    // UPDATED: Now saves timestamp to prevent re-fetching on next load
    async prefetchChatMessages(chatId, timestamp) {
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
                
                // CRITICAL: Save the timestamp so we don't fetch again until it changes
                if(timestamp) {
                    localStorage.setItem(`chat_time_${chatId}`, timestamp);
                }
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
            return; 
        }

        const badgeColors = ['#ff00ff', '#00ff41', '#00d2ff', '#ffff00', '#ff4444', '#aa00ff', '#ff9900'];
        const V_URL = "https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg";
        const DEFAULT_GROUP_IMAGE = "https://fabulouspic.com/wp-content/uploads/2024/08/a-black-and-white-photo-of-a-persons-face.jpg";

        // Map and Sort
        const chatItems = docs.map(doc => {
            const chat = doc.data();
            const isGroup = chat.isGroup === true;
            const otherUid = chat.participants.find(id => id !== this.myUid);
            const u = isGroup ? null : this.userCache[otherUid];
            const isPinned = this.pinnedChats.includes(doc.id);
            return { id: doc.id, chat, u, otherUid, isPinned, isGroup };
        });

        // Sort: Pinned first, then by timestamp
        chatItems.sort((a,b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.chat.lastTimestamp?.seconds || 0) - (a.chat.lastTimestamp?.seconds || 0);
        });

        let htmlAccumulator = "";

        chatItems.forEach(({id, chat, u, otherUid, isPinned, isGroup}) => {
            if (!isGroup && !u) return; // Skip if user data missing (will be caught next update)

            // Unread Logic Corrected for Group
            let isUnread = false;
            let count = 0;
            if (chat.unreadCount && chat.unreadCount[this.myUid] !== undefined) {
                count = Number(chat.unreadCount[this.myUid]);
            }
            
            if (isGroup) {
                isUnread = (count > 0);
            } else {
                if (count > 0) isUnread = true;
                else if (chat.lastSender && chat.lastSender !== this.myUid) isUnread = chat.seen === false;
            }

            const finalName = isGroup ? chat.groupName : (u.name || u.displayName || u.username || "Unknown");
            const finalPfp = isGroup ? (chat.groupPhoto || DEFAULT_GROUP_IMAGE) : (u.photoURL || 'https://via.placeholder.com/150');
            const lastMsg = chat.lastMessage ? chat.lastMessage : `<span style="font-style:italic; opacity:0.6;">Frequency cleared</span>`;
            
            const amIFollowing = isGroup ? false : this.following.some(f => (typeof f === 'string' ? f : f.uid) === otherUid);
            const isVerified = isGroup ? false : u.verified;
            const chatLinkUser = isGroup ? id : u.username;
            const randomColor = badgeColors[Math.floor(Math.random() * badgeColors.length)];
            const timeStr = chat.lastTimestamp ? this.formatTime(chat.lastTimestamp.toDate()) : '';

            // Safe User String for Long Press
            const safeUserStr = encodeURIComponent(JSON.stringify({
                name: finalName, username: chatLinkUser, photoURL: finalPfp, verified: isVerified, isGroup: isGroup
            }));

            // Conditional HTML Elements
            const onlineIndicator = !isGroup ? `<div class="online-indicator" id="online-${otherUid}"></div>` : '';
            const verifiedBadge = isVerified ? `<img src="${V_URL}" class="v-badge">` : '';
            const followBtn = (!amIFollowing && !isGroup) ? `<button class="follow-btn" onclick="visitProfile(event, '${u.username}')">Profile</button>` : '';

            htmlAccumulator += `
                <div class="chat-item" 
                     ontouchstart="startLongPress(this, '${id}', ${isPinned}, '${safeUserStr}')" 
                     ontouchend="endLongPress(this)" 
                     ontouchmove="cancelLongPress(this)" 
                     onclick="enterChat(event, '${chatLinkUser}', ${isGroup})">
                    <div class="pfp-container">
                        <img src="${finalPfp}" class="chat-pfp">
                        ${onlineIndicator}
                    </div>
                    <div class="chat-info">
                        <div class="chat-top-row">
                            <span class="u-name" id="name-${id}">
                                ${finalName} 
                                ${verifiedBadge}
                                ${isPinned ? `<span class="pin-indicator"></span>` : ''}
                            </span>
                            <span style="font-size:0.7rem; color:#444;">${timeStr}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="last-msg" id="last-msg-${id}" style="${isUnread ? 'color:#fff; font-weight:700;' : ''}">
                                ${lastMsg}
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;" id="meta-${id}">
                                ${followBtn}
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
            // Also store pure data for group Chat check glitches
            const mappedData = docs.map(d => ({id: d.id, chat: d.data(), isGroup: d.data().isGroup===true}));
            localStorage.setItem('goorac_inbox_data', JSON.stringify(mappedData));
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
