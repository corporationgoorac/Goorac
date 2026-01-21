// components/call-notifier.js
class CallNotifier extends HTMLElement {
    async connectedCallback() {
        const currentPath = window.location.pathname;
        if (currentPath.endsWith('calls.html')) {
            if (new URLSearchParams(window.location.search).has('callId')) {
                this.remove();
                return;
            }
        }

        await this.loadDependencies();
        this.render();
        this.init();
        this.initSwipe();
        this.unlockAudio(); 
    }

    // Fixed: Unlocks audio silently so you don't hear a "blip" on load
    unlockAudio() {
        const unlock = () => {
            const tone = this.querySelector('#n-tone');
            if (tone) {
                tone.muted = true; // Mute it first
                tone.play().then(() => {
                    tone.pause();
                    tone.currentTime = 0;
                    tone.muted = false; // Unmute for future use
                }).catch(() => {});
            }
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('touchstart', unlock);
        document.addEventListener('click', unlock);
    }

    async loadDependencies() {
        const scripts = [
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
        ];
        for (const src of scripts) {
            if (!document.querySelector(`script[src="${src}"]`)) {
                await new Promise(res => {
                    const s = document.createElement('script');
                    s.src = src; 
                    s.onload = res;
                    s.onerror = res;
                    document.head.appendChild(s);
                });
            }
        }
    }

    render() {
        this.innerHTML = `
        <style>
            #notif-banner {
                position: fixed; 
                top: -150px; 
                left: 50%; 
                transform: translateX(-50%) scale(0.9);
                width: calc(100% - 32px); 
                max-width: 400px;
                background: rgba(28, 39, 46, 0.85); 
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.1); 
                border-radius: 24px;
                padding: 12px 16px; 
                display: flex; 
                align-items: center; 
                justify-content: space-between;
                z-index: 2147483647;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                font-family: -apple-system, system-ui, sans-serif;
                touch-action: none; 
                user-select: none;
                visibility: hidden;
                opacity: 0;
            }
            #notif-banner.active { 
                top: 20px; 
                visibility: visible;
                opacity: 1;
                transform: translateX(-50%) scale(1);
            }
            .c-prof { display: flex; align-items: center; gap: 12px; flex: 1; }
            .c-pfp-wrapper { position: relative; }
            .c-pfp { width: 52px; height: 52px; border-radius: 18px; object-fit: cover; background: #000; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
            .c-det h4 { margin: 0; font-size: 1rem; color: #fff; font-weight: 600; display: flex; align-items: center; gap: 4px; }
            .c-det p { margin: 1px 0 0; font-size: 0.75rem; color: #00d2ff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            
            .v-chk { 
                width: 16px; height: 16px; background: #0095f6; display: inline-block;
                -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58.8-3.04 2.12-4.03l-1.1-2.48-2.74.05a4.95 4.95 0 0 1-4.04-2.12L14.24 3l-2.47 1.1-1.1-2.48-2.5.78L7.1 5.14a4.95 4.95 0 0 1-4.04 2.12l-2.74-.05-1.1 2.48 2.12 4.03-2.12 4.03 1.1 2.48 2.74-.05a4.95 4.95 0 0 1 4.04 2.12L9.76 21l2.47-1.1 1.1 2.48 2.5-.78.78-2.73a4.95 4.95 0 0 1 4.04-2.12l2.74.05 1.1-2.48-2.12-4.03Z"/></svg>') no-repeat center;
                mask-size: contain; -webkit-mask-size: contain; 
            }

            .n-btns { display: flex; gap: 8px; }
            .n-btn { 
                width: 44px; height: 44px; border: none; border-radius: 14px; 
                cursor: pointer; transition: 0.2s active; display: flex; 
                align-items: center; justify-content: center;
            }
            .n-dec { background: rgba(255, 68, 68, 0.15); color: #ff4444; }
            .n-ans { background: #1ebea5; color: #fff; box-shadow: 0 8px 20px rgba(30, 190, 165, 0.3); }
            
            /* SVG Icons */
            .n-btn svg { width: 22px; height: 22px; fill: currentColor; }

            @keyframes pulse-border {
                0% { border-color: rgba(0, 210, 255, 0.3); }
                50% { border-color: rgba(0, 210, 255, 0.8); }
                100% { border-color: rgba(0, 210, 255, 0.3); }
            }
            #notif-banner.active { animation: pulse-border 2s infinite; }
        </style>

        

        <div id="notif-banner">
            <div class="c-prof">
                <div class="c-pfp-wrapper">
                    <img src="" class="c-pfp" id="n-img">
                </div>
                <div class="c-det">
                    <h4 id="n-user">User <span id="n-v"></span></h4>
                    <p id="n-msg">Incoming Call...</p>
                </div>
            </div>
            <div class="n-btns">
                <button class="n-btn n-dec" id="n-dec" title="Decline">
                    <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" transform="rotate(135 12 12)"/></svg>
                </button>
                <button class="n-btn n-ans" id="n-ans" title="Answer">
                    <svg viewBox="0 0 24 24"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.14-3.76-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>
                </button>
            </div>
            <audio id="n-tone" loop preload="auto">
                <source src="https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3" type="audio/mpeg">
            </audio>
        </div>`;
    }

    init() {
        const check = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth().currentUser) {
                clearInterval(check);
                this.listen();
            }
        }, 1000);
    }

    initSwipe() {
        const banner = this.querySelector('#notif-banner');
        let startY = 0; 
        let currentY = 0;

        banner.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            banner.style.transition = 'none'; // Disable transition during swipe
        }, { passive: true });

        banner.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY - startY;
            if (currentY < 0) {
                banner.style.transform = `translateX(-50%) translateY(${currentY}px)`;
                banner.style.opacity = 1 - Math.abs(currentY) / 120;
            }
        }, { passive: true });

        banner.addEventListener('touchend', () => {
            banner.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            if (currentY < -50) {
                this.hide();
            } else {
                banner.style.transform = `translateX(-50%)`;
                banner.style.opacity = '1';
            }
            currentY = 0;
        });
    }

    listen() {
        const uid = firebase.auth().currentUser.uid;
        this.signalRef = firebase.database().ref(`signaling/${uid}`);
        
        this.signalRef.on('value', snap => {
            const data = snap.val();
            if (!data) { this.hide(); return; }

            if (Date.now() - data.timestamp > 45000) {
                this.signalRef.remove();
                this.hide();
                return;
            }

            if (window.location.pathname.endsWith('calls.html')) {
                const params = new URLSearchParams(window.location.search);
                if (params.get('callId') === data.callId) return;
            }

            this.show(data);

            this.querySelector('#n-dec').onclick = (e) => {
                e.preventDefault();
                firebase.database().ref(`calls/${data.callId}`).update({ status: 'declined' });
                this.signalRef.remove();
                this.hide();
            };

            this.querySelector('#n-ans').onclick = (e) => {
                e.preventDefault();
                this.signalRef.off();
                this.hide();
                const url = new URL('calls.html', window.location.href);
                url.searchParams.set('callId', data.callId);
                url.searchParams.set('answer', 'true');
                window.location.href = url.href;
            };

            firebase.database().ref(`calls/${data.callId}/status`).on('value', s => {
                if (['cancelled', 'ended', 'connected', 'declined'].includes(s.val())) {
                    this.hide();
                }
            });
        });
    }

    show(data) {
        const banner = this.querySelector('#notif-banner');
        const userEl = this.querySelector('#n-user');
        const imgEl = this.querySelector('#n-img');
        const vEl = this.querySelector('#n-v');
        const tone = this.querySelector('#n-tone');

        userEl.childNodes[0].textContent = data.name + " ";
        vEl.className = data.verified ? 'v-chk' : '';
        imgEl.src = data.pfp || 'https://via.placeholder.com/150';
        
        banner.classList.add('active');

        // Play the ringtone
        tone.muted = false;
        const playPromise = tone.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log("Waiting for user interaction for audio...");
            });
        }
    }

    hide() {
        const banner = this.querySelector('#notif-banner');
        const audio = this.querySelector('#n-tone');
        if (banner) {
            banner.classList.remove('active');
        }
        if (audio) { 
            audio.pause(); 
            audio.currentTime = 0; 
        }
    }
}
customElements.define('call-notifier', CallNotifier);