export class ChatHeader extends HTMLElement {
    connectedCallback() {
        this.render();
        this.cacheDOM();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
        <style>
            :host {
                display: block;
                position: absolute;
                top: 0; left: 0; right: 0;
                height: calc(60px + env(safe-area-inset-top));
                z-index: 2000;
                pointer-events: none; /* Let clicks pass through empty space */
            }

            header { 
                pointer-events: auto;
                padding: 0 16px;
                padding-top: calc(env(safe-area-inset-top) + 10px);
                height: 100%;
                background: var(--header-bg, rgba(0,0,0,0.96)); 
                border-bottom: 1px solid var(--border, #262626); 
                display: flex; align-items: center; gap: 12px; 
                backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px);
            }

            .back-btn { font-size: 1.8rem; color: var(--accent, #0095f6); cursor: pointer; display: flex; align-items: center; justify-content: center; height: 40px; width: 30px; }

            .h-profile-group { display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; overflow: hidden; }
            
            .pfp-container { position: relative; width: 38px; height: 38px; flex-shrink: 0; }
            .h-pfp { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #121212; border: 1px solid #333; transition: opacity 0.3s ease; }
            
            .online-dot { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: #00e676; border-radius: 50%; border: 2px solid #000; display: none; box-shadow: 0 0 4px rgba(0,230,118,0.5); animation: pulseGreen 2s infinite; }
            @keyframes pulseGreen { 0% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.7); } 70% { box-shadow: 0 0 0 4px rgba(0, 230, 118, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); } }

            .h-info { display: flex; flex-direction: column; justify-content: center; gap: 1px; min-width: 0; }
            .h-name-wrapper { display: flex; align-items: center; gap: 4px; line-height: 1.1; }
            .h-name { font-weight: 700; font-size: 1rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            
            .loading-shimmer { background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%); background-size: 400px 100%; animation: shimmer 1.2s ease-in-out infinite; }
            @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
            
            .h-name:empty { height: 16px; width: 120px; border-radius: 4px; background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%); background-size: 400px 100%; animation: shimmer 1.2s infinite; }
            
            .h-username-sub { font-size: 0.75rem; color: var(--text-secondary, #a8a8a8); font-weight: 400; transition: opacity 0.3s ease; }
            .v-badge { width: 14px; height: 14px; display: none; }

            .header-actions { display: flex; align-items: center; gap: 20px; margin-left: auto; padding-right: 5px; }
            .header-icon { width: 26px; height: 26px; cursor: pointer; fill: #ffffff; opacity: 0.9; transition: transform 0.2s, opacity 0.2s; }
            .header-icon:active { opacity: 0.6; transform: scale(0.9); }
        </style>

        <header>
            <div class="back-btn" id="back-btn">‹</div>
            <div class="h-profile-group" id="profile-group">
                <div class="pfp-container">
                    <img id="h-pfp" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="h-pfp loading-shimmer">
                    <div class="online-dot" id="h-online-dot"></div>
                </div>
                <div class="h-info">
                    <div class="h-name-wrapper">
                        <div class="h-name" id="h-display-name"></div>
                        <img id="v-badge" src="https://img.icons8.com/color/48/verified-badge.png" class="v-badge">
                    </div>
                    <div class="h-username-sub" id="h-username-label"></div>
                </div>
            </div>
            <div class="header-actions">
                <svg class="header-icon" id="audio-call-btn" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.22-.22.3-.54.24-1.01a11.36 11.36 0 0 1-.56-3.53c0-.55-.45-1-1-1H4.39c-.55 0-1 .45-1 1c0 9.39 7.61 17 17 17c.55 0 1-.45 1-1v-3.56c0-.55-.45-1-1-1z"/></svg>
                <svg class="header-icon" id="video-call-btn" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
            </div>
        </header>`;
    }

    cacheDOM() {
        this.dom = {
            pfp: this.querySelector('#h-pfp'),
            displayName: this.querySelector('#h-display-name'),
            badge: this.querySelector('#v-badge'),
            usernameLabel: this.querySelector('#h-username-label'),
            onlineDot: this.querySelector('#h-online-dot'),
            profileGroup: this.querySelector('#profile-group'),
            backBtn: this.querySelector('#back-btn'),
            audioBtn: this.querySelector('#audio-call-btn'),
            videoBtn: this.querySelector('#video-call-btn')
        };
    }

    attachEvents() {
        this.dom.backBtn.addEventListener('click', () => history.back());
        this.dom.profileGroup.addEventListener('click', () => this.dispatchEvent(new CustomEvent('profile-click', { bubbles: true })));
        this.dom.audioBtn.addEventListener('click', () => window.location.href = 'calls.html');
        this.dom.videoBtn.addEventListener('click', () => window.location.href = 'calls.html');
    }

    setUserData(user) {
        if (!user) return;
        this.dom.pfp.classList.remove('loading-shimmer');
        this.dom.pfp.src = user.photoURL || 'https://via.placeholder.com/150';
        this.dom.displayName.innerText = user.name || user.username;
        this.dom.usernameLabel.innerText = `@${user.username}`;
        if (user.verified) this.dom.badge.style.display = 'block';
    }

    setStatus(isTyping, isOnline, lastChanged) {
        if (isTyping) {
            this.dom.usernameLabel.innerText = "Typing...";
            this.dom.usernameLabel.style.color = "#00e676";
            this.dom.onlineDot.style.display = 'block'; 
            return;
        }
        if (isOnline) {
            this.dom.onlineDot.style.display = 'block';
            this.dom.usernameLabel.innerText = "Active now";
            this.dom.usernameLabel.style.color = "#00e676";
        } else {
            this.dom.onlineDot.style.display = 'none';
            this.dom.usernameLabel.innerText = this._formatActiveTime(lastChanged);
            this.dom.usernameLabel.style.color = "var(--text-secondary, #a8a8a8)";
        }
    }

    _formatActiveTime(ts) {
        if (!ts) return "";
        const diff = Date.now() - ts;
        if (diff < 60000) return "Active now";
        return "Active " + this._timeAgo(new Date(ts));
    }

    _timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        return "Just now";
    }
}
customElements.define('chat-header', ChatHeader);
