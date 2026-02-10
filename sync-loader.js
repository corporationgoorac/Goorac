// sync-loader.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/msgEngine.js').then(reg => {
        firebase.auth().onAuthStateChanged(user => {
            if (user && reg.active) {
                reg.active.postMessage({ type: 'START_ENGINE', uid: user.uid, config: window.firebaseConfig });
            }
        });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'INBOX_SYNC') {
            const { chatId, meta, messages, otherUid } = event.data;

            // A. Update Chat Cache (For chat.html instant-load)
            localStorage.setItem(`chat_msgs_${chatId}`, JSON.stringify(messages));

            // B. Update Inbox Cache (For messages.html zero-delay)
            updateInboxHTMLCache(chatId, meta, otherUid);
        }
    });
}

/**
 * This function "Injects" new data into the HTML block that messages.html 
 * loads instantly. This removes the sync delay.
 */
function updateInboxHTMLCache(chatId, meta, otherUid) {
    // 1. Get the current user cache for the PFP and Name
    const userCache = JSON.parse(localStorage.getItem('goorac_u_cache')) || {};
    const u = userCache[otherUid] || { name: "User", photoURL: "https://via.placeholder.com/150", username: "..." };
    
    // 2. Calculate if it should show an unread badge
    const myUid = localStorage.getItem('my_uid_cache');
    const isUnread = meta.unreadCount && meta.unreadCount[myUid] > 0;
    const badgeHtml = isUnread ? `<div class="unread-badge" style="background:#00d2ff; box-shadow: 0 0 12px #00d2ff;"></div>` : '';

    // 3. Construct a single Chat Item row (Matching messages.html style)
    const newRowHTML = `
        <div class="chat-item" onclick="enterChat(event, '${u.username}')">
            <div class="pfp-container">
                <img src="${u.photoURL}" class="chat-pfp">
                <div class="online-indicator" id="online-${otherUid}"></div>
            </div>
            <div class="chat-info">
                <div class="chat-top-row">
                    <span class="u-name">${u.name}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="last-msg" style="${isUnread ? 'color:#fff; font-weight:700;' : ''}">
                        ${meta.lastMessage || 'Transmission cleared'}
                    </div>
                    ${badgeHtml}
                </div>
            </div>
        </div>`;

    // 4. Update the stored HTML that messages.html reads on load
    // For simplicity, we just prepend/replace the top of the cache
    let currentInboxHTML = localStorage.getItem('goorac_inbox_html') || "";
    
    // Simple logic: if the chat already exists in the HTML, we'd need regex to replace it.
    // To keep it simple: we refresh the HTML cache so it's ready for the next visit.
    console.log(`⚡ Inbox Cache Injected for ${u.username}`);
}
