// sync-loader.js
if ('serviceWorker' in navigator) {
    // 1. Register the engine
    navigator.serviceWorker.register('/msgEngine.js').then(reg => {
        
        // 2. Wait for Firebase Auth (Uses the 'auth' object from your config.js)
        auth.onAuthStateChanged(user => {
            if (user) {
                // If worker is already active, send data now
                if (reg.active) {
                    sendInit(reg.active, user.uid);
                }
                // If worker is still installing, wait for it to be ready
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') sendInit(newWorker, user.uid);
                    });
                });
            }
        });
    });

    // 3. Centralized LocalStorage Writer
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_LOCAL_STORAGE') {
            const { chatId, data } = event.data;
            // This syncs the data so chat.html finds it instantly
            localStorage.setItem(`chat_msgs_${chatId}`, JSON.stringify(data));
            console.log(`⚡ Sync Engine: ${chatId} updated.`);
        }
    });
}

function sendInit(worker, uid) {
    worker.postMessage({
        type: 'START_ENGINE',
        uid: uid,
        config: window.firebaseConfig
    });
}
