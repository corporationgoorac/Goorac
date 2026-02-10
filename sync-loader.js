/**
 * GOORAC QUANTUM BRIDGE (sync-loader.js)
 * 1. Registers the Service Worker (sw.js)
 * 2. Handles the handshake between Firebase Auth and the Background Engine
 * 3. Ensures Zero-Flicker activity status across page transitions
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log("📡 Quantum Bridge: Service Worker Registered");

            // Monitor Firebase Auth state
            // This ensures the worker knows WHICH user to track
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    const startEngine = () => {
                        // Locate the active controller (or installing/waiting)
                        const worker = reg.active || reg.waiting || reg.installing;
                        
                        if (worker) {
                            // Send the signal to start the Background Activity Engine
                            // We send the config and UID so the worker can init Firebase independently
                            worker.postMessage({
                                type: 'START_ACTIVITY_ENGINE',
                                uid: user.uid,
                                config: window.firebaseConfig
                            });
                            console.log("⚡ Activity Engine: Start Signal Sent");
                        }
                    };

                    // If the worker is already active, send the signal immediately
                    if (reg.active) {
                        startEngine();
                    } else {
                        // If it's still installing, wait for the state change to finish
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'activated') startEngine();
                            });
                        });
                    }
                }
            });
        }).catch(err => {
            console.error("❌ Quantum Bridge Error:", err);
        });
    });

    // Handle messages FROM the Service Worker (if needed in future)
    navigator.serviceWorker.addEventListener('message', (event) => {
        // You can use this space to receive data back from the background
        // such as background-synced notifications or status updates
    });
}
