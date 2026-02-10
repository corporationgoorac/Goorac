// sync-loader.js - The Storage Bridge
if ('serviceWorker' in navigator) {
    // Request notification permission
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    navigator.serviceWorker.register('/msgEngine.js').then(reg => {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Ensure worker is active before sending config
                const startWorker = () => {
                    const worker = reg.active || reg.installing || reg.waiting;
                    worker.postMessage({
                        type: 'START_ENGINE',
                        uid: user.uid,
                        config: window.firebaseConfig
                    });
                };

                if (reg.active) startWorker();
                else reg.addEventListener('updatefound', startWorker);
            }
        });
    });

    // LISTENER: Saves data to LocalStorage keys
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_UPDATE') {
            const { chatId, meta, messages, myUid } = event.data;

            // Update chat history
            localStorage.setItem(`chat_msgs_${chatId}`, JSON.stringify(messages));

            // Inject into Inbox HTML cache
            updateInboxCache(chatId, meta, myUid);
            console.log("⚡ Storage Sync: Successful");
        }
    });
}

function updateInboxCache(chatId, chat, myUid) {
    const userCache = JSON.parse(localStorage.getItem('goorac_u_cache')) || {};
    const otherUid = chat.participants.find(id => id !== myUid);
    const u = userCache[otherUid] || { name: "User", username: "unknown" };
    const isUnread = (chat.unreadCount && chat.unreadCount[myUid] > 0) || (chat.lastSender !== myUid && chat.seen === false);

    const newRow = `
        <div class="chat-item" onclick="enterChat(event, '${u.username}')">
            <div class="pfp-container">
                <img src="${u.photoURL || 'https://via.placeholder.com/150'}" class="chat-pfp">
                <div class="online-indicator" id="online-${otherUid}"></div>
            </div>
            <div class="chat-info">
                <div class="chat-top-row">
                    <span class="u-name">${u.name || u.username}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="last-msg" style="${isUnread ? 'color:#fff; font-weight:700;' : ''}">
                        ${chat.lastMessage || 'Transmission cleared'}
                    </div>
                    ${isUnread ? `<div class="unread-badge" style="background:#00d2ff;"></div>` : ''}
                </div>
            </div>
        </div>`;

    localStorage.setItem('goorac_inbox_html', newRow);
}
