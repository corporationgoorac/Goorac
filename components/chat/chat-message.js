export class ChatMessage extends HTMLElement {
    constructor() {
        super();
        // Bind methods to handle events
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleDoubleTap = this.handleDoubleTap.bind(this);
    }

    set data({ id, msg, isMe, isLastInGroup, isLastSeen, userPfp }) {
        this._id = id;
        this._msg = msg;
        this._isMe = isMe;
        this._isLastInGroup = isLastInGroup;
        this._isLastSeen = isLastSeen;
        this._userPfp = userPfp || 'https://via.placeholder.com/30';
        this.render();
    }

    render() {
        // We use Light DOM (this.innerHTML) so global variables and fonts apply easily
        this.innerHTML = `
        <style>
            /* --- COMPONENT ISOLATED STYLES --- */
            :host { display: block; width: 100%; }

            .msg-row { display: flex; width: 100%; margin-bottom: 6px; position: relative; flex-direction: column; }
            .msg-row.sent { align-items: flex-end; padding-right: 0px; }
            .msg-row.received { align-items: flex-start; }
            
            .received-inner-row { display: flex; align-items: flex-end; gap: 8px; max-width: 100%; }
            .msg-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; margin-bottom: 4px; background: #121212; border: 1px solid #222; }

            .msg-bubble-box { position: relative; max-width: 78%; display: flex; flex-direction: column; transition: margin-bottom 0.2s; }
            .sent .msg-bubble-box { align-items: flex-end; }
            .received .msg-bubble-box { align-items: flex-start; }

            .bubble { padding: 12px 16px; border-radius: 20px; font-size: 1rem; line-height: 1.45; position: relative; word-wrap: break-word; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
            .sent .bubble { background: var(--sent-bg, linear-gradient(135deg, #ff6b00 0%, #ff3b00 100%)); color: #fff; border-top-right-radius: 18px; border-top-left-radius: 18px; border-bottom-left-radius: 18px; border-bottom-right-radius: 4px; text-align: left; }
            .received .bubble { background: var(--received-bg, #262626); color: #fff; border-top-left-radius: 18px; border-top-right-radius: 18px; border-bottom-right-radius: 18px; border-bottom-left-radius: 4px; text-align: left; }
            
            .bubble a { color: #87ceeb; text-decoration: underline; cursor: pointer; }

            .sliding-timestamp { position: absolute; top: 50%; transform: translateY(-50%); right: -65px; font-size: 0.7rem; color: #666; font-weight: 500; width: 50px; text-align: center; pointer-events: none; }
            
            .reaction-badge { 
                position: absolute; bottom: -10px; background: #1a1a1a; border: 2px solid #000; 
                border-radius: 20px; padding: 4px 7px; font-size: 0.85rem; z-index: 20; 
                cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.5); 
            }
            .sent .reaction-badge { right: 0; }
            .received .reaction-badge { left: 0; }

            .seen-status { font-size: 0.65rem; color: var(--text-secondary, #a8a8a8); margin-top: 4px; margin-right: 2px; text-align: right; font-weight: 500; height: 14px; width: 100%; opacity: 0; animation: fadeIn 0.3s forwards; position: relative; z-index: 1; }
            @keyframes fadeIn { to { opacity: 1; } }

            .reply-box-ui { background: rgba(0, 0, 0, 0.25); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px; font-size: 0.88rem; border-left: 4px solid rgba(255, 255, 255, 0.5); color: #e0e0e0; max-width: 100%; cursor: pointer; white-space: normal; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35; }

            /* MEDIA & FILES */
            .msg-media-wrapper { position: relative; cursor: pointer; margin-bottom: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
            .chat-media-img { display: block; width: 100%; max-width: 280px; max-height: 350px; object-fit: cover; border-radius: 18px; animation: imgFadeIn 0.4s ease-out; }
            .received .chat-media-img { border-bottom-left-radius: 4px; }
            .sent .chat-media-img { border-bottom-right-radius: 4px; }
            .bubble.has-media { border-top-left-radius: 4px; border-top-right-radius: 4px; margin-top: 2px; }
            @keyframes imgFadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

            /* VIDEO */
            .msg-video-container { position: relative; max-width: 280px; border-radius: 18px; overflow: hidden; }
            .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 45px; height: 45px; background: rgba(0, 0, 0, 0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2); pointer-events: none; }

            /* AUDIO PILL & VISUALIZER */
            .msg-audio-pill { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #262626; border-radius: 22px; min-width: 220px; border: 1px solid rgba(255,255,255,0.1); position: relative; }
            .audio-control-btn { width: 32px; height: 32px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; cursor: pointer; flex-shrink: 0; z-index: 5; }
            .audio-wave-container { flex: 1; display: flex; align-items: center; gap: 3px; height: 15px; overflow: hidden; position: relative; }
            .wave-bar { width: 3px; background: #666; border-radius: 2px; height: 100%; transition: height 0.1s; animation: none; }
            
            .audio-playing .wave-bar { background: var(--accent, #0095f6); animation: waveAnim 0.8s ease-in-out infinite; }
            .audio-playing .wave-bar:nth-child(odd) { animation-duration: 0.6s; }
            .audio-playing .wave-bar:nth-child(2n) { animation-duration: 1.1s; }
            .audio-playing .wave-bar:nth-child(3n) { animation-duration: 0.9s; }
            @keyframes waveAnim { 0% { height: 20%; } 50% { height: 100%; } 100% { height: 20%; } }
            
            .audio-progress-track { position: absolute; bottom: -5px; left: 0; width: 100%; height: 2px; background: #444; }
            .audio-real-progress { height: 100%; background: #fff; width: 0%; transition: width 0.1s linear; }

            /* FILE PILL */
            .msg-file-pill { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #262626; border-radius: 16px; min-width: 200px; max-width: 260px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
            .file-icon { width: 40px; height: 40px; background: #333; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
            .file-details { flex: 1; min-width: 0; }
            .file-name { font-size: 0.9rem; font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
            .file-meta { font-size: 0.75rem; color: #888; }
            .file-dl-btn { color: #0095f6; font-size: 1.2rem; padding: 5px; }

            /* NOTE REPLY */
            .note-reply-wrapper { margin-bottom: 8px; display: flex; flex-direction: column; align-items: center; max-width: 100%; cursor: pointer; }
            .note-reply-pill { background: #262626; padding: 10px 16px; border-radius: 22px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.2); min-width: 120px; max-width: 220px; text-align: center; position: relative; }
            .note-header-row { display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }
            .note-mini-pfp { width: 16px; height: 16px; border-radius: 50%; background: #444; object-fit: cover; }
            .note-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255,255,255,0.7); }
            .note-content-text { font-size: 0.9rem; font-weight: 600; color: #fff; line-height: 1.3; margin-bottom: 2px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
            .note-song-tag { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: rgba(255,255,255,0.8); margin-top: 4px; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 10px; }
            .note-connector { width: 2px; height: 8px; background: rgba(255,255,255,0.2); margin-top: -1px; margin-bottom: -4px; z-index: 0; }
        </style>
        
        ${this.buildHTML()}
        `;

        this.attachListeners();
    }

    // --- HTML CONSTRUCTION METHODS ---

    buildHTML() {
        const side = this._isMe ? 'sent' : 'received';
        const date = this._msg.timestamp ? this._msg.timestamp.toDate() : new Date();
        const timeStr = this.formatTime12(date);
        
        // Build Reactions
        let reactionDisplay = '';
        if (this._msg.reactions) {
            reactionDisplay = Object.values(this._msg.reactions).map(r => r.emoji).join(' ');
        }
        
        // Check "Seen" status
        let seenText = "";
        if (this._isLastSeen && side === 'sent') {
            if (this._msg.seenAt) {
                seenText = "Seen " + this.timeAgo(this._msg.seenAt.toDate());
            } else {
                seenText = "Seen";
            }
        }

        const boxStyle = reactionDisplay ? 'style="margin-bottom: 14px"' : '';
        const contentHTML = this.buildContent(reactionDisplay);

        let rowContent = '';
        if (side === 'received') {
            const visibility = this._isLastInGroup ? 'visible' : 'hidden';
            rowContent = `
                <div class="received-inner-row">
                    <img src="${this._userPfp}" class="msg-avatar" style="visibility: ${visibility}">
                    <div class="msg-bubble-box" ${boxStyle}>
                        ${contentHTML}
                    </div>
                </div>`;
        } else {
            rowContent = `
                <div class="msg-bubble-box" ${boxStyle}>
                    ${contentHTML}
                </div>`;
        }

        return `
            <div class="msg-row ${side}" id="${this._id}">
                ${rowContent}
                ${seenText ? `<div class="seen-status">${seenText}</div>` : ''}
                <div class="sliding-timestamp">${timeStr}</div>
            </div>
        `;
    }

    buildContent(reactionDisplay) {
        const m = this._msg;
        const id = this._id;
        
        // 1. NOTE REPLY
        const noteReplyHtml = m.replyToNote ? `
            <div class="note-reply-wrapper">
                <div class="note-reply-pill" style="background: ${m.noteMetadata ? (m.noteMetadata.bgColor || '#262626') : '#262626'}; color: ${m.noteMetadata ? (m.noteMetadata.textColor || '#fff') : '#fff'}">
                    <div class="note-header-row">
                        <img src="${m.noteMetadata && m.noteMetadata.pfp ? m.noteMetadata.pfp : 'https://via.placeholder.com/20'}" class="note-mini-pfp">
                        <span class="note-label">Replied to note</span>
                    </div>
                    <div class="note-content-text">"${m.replyToNote}"</div>
                    ${m.noteMetadata && m.noteMetadata.songName ? `
                    <div class="note-song-tag">
                        <span>🎵 ${m.noteMetadata.songName}</span>
                    </div>` : ''}
                </div>
                <div class="note-connector"></div>
            </div>
        ` : '';

        // 2. STANDARD REPLY
        const replyHtml = m.replyTo ? `<div class="reply-box-ui">⤴ ${m.replyTo}</div>` : '';

        // 3. MEDIA (Image, Video, Audio, File)
        let mediaHtml = '';
        let bubbleClass = 'bubble';
        let bubbleStyle = '';

        if (m.imageUrl) {
            mediaHtml = `
            <div class="msg-media-wrapper" id="media-${id}">
                <img src="${m.imageUrl}" class="chat-media-img">
                <div class="reaction-badge" id="react-btn-media" style="${reactionDisplay ? 'display:block' : 'display:none'}">${reactionDisplay}</div>
            </div>`;
            bubbleClass = "bubble has-media";
            if(!m.text) bubbleStyle = "display:none;";
        } 
        else if (m.fileUrl && m.fileMeta && m.fileMeta.type.includes('video')) {
            mediaHtml = `
            <div class="msg-video-container" id="video-${id}">
                <video src="${m.fileUrl}#t=0.5" class="chat-media-img" style="object-fit:cover; width:100%; height:200px; background:#000;" preload="metadata"></video>
                <div class="play-overlay"><svg viewBox="0 0 24 24" fill="white" style="width:24px; height:24px;"><path d="M8 5v14l11-7z"/></svg></div>
                <div class="reaction-badge" id="react-btn-vid" style="${reactionDisplay ? 'display:block' : 'display:none'}">${reactionDisplay}</div>
            </div>`;
            bubbleClass = "bubble has-media";
            if(!m.text) bubbleStyle = "display:none;";
        }
        else if (m.fileUrl && m.fileMeta && m.fileMeta.type.includes('audio')) {
            const safeId = 'audio-' + id;
            mediaHtml = `
            <div class="msg-audio-pill" id="pill-${safeId}">
                <div class="audio-control-btn" id="ctrl-${safeId}">
                    <svg id="icon-${safeId}" viewBox="0 0 24 24" style="width:18px; fill:#000;"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div class="audio-wave-container" id="wave-${safeId}">
                    ${Array(12).fill('<div class="wave-bar"></div>').join('')}
                    <div class="audio-progress-track"><div id="prog-${safeId}" class="audio-real-progress"></div></div>
                </div>
                <audio id="${safeId}" src="${m.fileUrl}"></audio>
                <div class="reaction-badge" style="position:absolute; bottom:-8px; right:10px; ${reactionDisplay ? 'display:block' : 'display:none'}">${reactionDisplay}</div>
            </div>`;
            bubbleClass = "bubble has-media"; 
            if(!m.text) bubbleStyle = "display:none;";
        }
        else if (m.fileUrl) {
            mediaHtml = `
            <div class="msg-file-pill" id="file-${id}">
                <div class="file-icon">📄</div>
                <div class="file-details">
                    <div class="file-name">${m.fileMeta.name || "File"}</div>
                    <div class="file-meta">${(m.fileMeta.size / (1024*1024)).toFixed(2)} MB • ${m.fileMeta.type.toUpperCase()}</div>
                </div>
                <div class="file-dl-btn">⬇</div>
                <div class="reaction-badge" style="right:0; ${reactionDisplay ? 'display:block' : 'display:none'}">${reactionDisplay}</div>
            </div>`;
            bubbleClass = "bubble has-media";
            if(!m.text) bubbleStyle = "display:none;";
        }

        const safeText = this.linkify(m.text || "");
        
        return `
            ${noteReplyHtml}
            ${replyHtml}
            ${mediaHtml}
            <div class="${bubbleClass}" id="bubble-${id}" style="${bubbleStyle}">
                <span id="text-${id}">${safeText} ${m.edited ? '<small style="opacity:0.4;font-size:0.6rem"> (edited)</small>' : ''}</span>
                ${(!m.imageUrl && !m.fileUrl) ? `<div class="reaction-badge" id="react-btn-txt" style="${reactionDisplay ? 'display:block' : 'display:none'}">${reactionDisplay}</div>` : ''}
            </div>
        `;
    }

    // --- INTERACTION LOGIC ---

    attachListeners() {
        // We need to attach listeners to the interactive parts: The text bubble, or the media wrapper
        let target = this.querySelector('.bubble');
        const media = this.querySelector('.msg-media-wrapper') || this.querySelector('.msg-video-container') || this.querySelector('.msg-audio-pill') || this.querySelector('.msg-file-pill');

        // Prefer media if it exists for gestures
        if (media) {
            if (this._msg.imageUrl) {
                media.addEventListener('click', (e) => {
                    // Prevent interaction if clicking reaction badge
                    if(e.target.closest('.reaction-badge')) return;
                    document.getElementById('media-viewer').open(this._msg.imageUrl);
                });
            } else if (this.querySelector('video')) {
                 media.addEventListener('click', (e) => {
                    if(e.target.closest('.reaction-badge')) return;
                    document.getElementById('media-viewer').open(this._msg.fileUrl, 'video');
                 });
            } else if (this.querySelector('audio')) {
                // Audio control logic
                const btn = this.querySelector('.audio-control-btn');
                btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleAudio(); });
            } else if (this.querySelector('.file-dl-btn')) {
                media.addEventListener('click', () => window.open(this._msg.fileUrl, '_blank'));
            }
            target = media; // Set target for gestures to the media element
        }

        // 1. Gesture Listeners (Double Tap, Long Press, Swipe)
        target.addEventListener('touchstart', this.handleTouchStart, {passive: true});
        target.addEventListener('touchmove', this.handleTouchMove, {passive: true});
        target.addEventListener('touchend', this.handleTouchEnd);
        target.addEventListener('dblclick', this.handleDoubleTap);

        // 2. Reaction Click Listener
        const badges = this.querySelectorAll('.reaction-badge');
        badges.forEach(b => {
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                // Dispatch event to main app to show details
                this.dispatchEvent(new CustomEvent('show-reaction-details', { 
                    bubbles: true, 
                    composed: true,
                    detail: { id: this._id, reactions: this._msg.reactions } 
                }));
            });
        });

        // 3. Audio Time Update
        const audio = this.querySelector('audio');
        if (audio) {
            audio.ontimeupdate = () => this.updateAudioUI();
            audio.onended = () => this.resetAudioUI();
        }
    }

    // --- GESTURE HANDLERS ---
    
    handleTouchStart(e) {
        this.startX = e.touches[0].clientX;
        this.isScrolling = false;
        this.swipeTriggered = false;
        
        // Long Press for Menu
        this.menuTimer = setTimeout(() => {
            if (!this.isScrolling) {
                if (navigator.vibrate) navigator.vibrate(70);
                this.dispatchMenuEvent();
            }
        }, 500);
    }

    handleTouchMove(e) {
        this.currentX = e.touches[0].clientX;
        if (Math.abs(this.currentX - this.startX) > 10) { 
            clearTimeout(this.menuTimer);
            this.isScrolling = true;
        }
        
        // Swipe Logic
        let diff = this.currentX - this.startX;
        // Only swipe right
        if (diff > 0 && diff < 80) {
            const target = e.currentTarget;
            target.style.transform = `translateX(${diff}px)`;
            target.style.transition = "none";
            
            if (diff > 50 && !this.swipeTriggered) {
                if (navigator.vibrate) navigator.vibrate(20);
                this.swipeTriggered = true;
            }
        }
    }

    handleTouchEnd(e) {
        clearTimeout(this.menuTimer);
        const target = e.currentTarget;
        const diff = this.currentX - this.startX;
        
        target.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        target.style.transform = `translateX(0px)`;
        
        if (diff > 50 && this.swipeTriggered) {
            this.dispatchReplyEvent();
        }
        this.startX = 0; this.currentX = 0;
    }

    handleDoubleTap(e) {
        e.preventDefault(); e.stopPropagation();
        if (navigator.vibrate) navigator.vibrate(50);
        
        // Dispatch "Like" event
        const myReaction = (this._msg.reactions && this._msg.reactions[this.getMyUid()]) ? this._msg.reactions[this.getMyUid()].emoji : null;
        const emoji = myReaction === '❤️' ? '' : '❤️'; // Toggle
        
        // Trigger Heart Overlay via Global ID (Assuming chat.html structure)
        const heart = document.getElementById('heart-overlay');
        if(heart) {
            heart.style.animation = 'none';
            heart.offsetHeight; // trigger reflow
            heart.style.animation = 'heartPop 0.8s ease-out';
        }

        this.dispatchEvent(new CustomEvent('reaction', {
            bubbles: true,
            composed: true,
            detail: { id: this._id, emoji: emoji }
        }));
    }

    // --- AUDIO LOGIC ---

    toggleAudio() {
        const audio = this.querySelector('audio');
        const icon = this.querySelector('svg'); // The play icon
        const wave = this.querySelector('.audio-wave-container');

        // Pause others
        document.querySelectorAll('audio').forEach(a => {
            if(a !== audio) {
                a.pause();
                // We can't easily reset UI of other components without complex signaling, 
                // but standard <audio> behavior stops sound.
            }
        });

        if (audio.paused) {
            audio.play().catch(e => console.log(e));
            icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; // Pause Path
            if(wave) wave.classList.add('audio-playing');
        } else {
            audio.pause();
            icon.innerHTML = '<path d="M8 5v14l11-7z"/>'; // Play Path
            if(wave) wave.classList.remove('audio-playing');
        }
    }

    updateAudioUI() {
        const audio = this.querySelector('audio');
        const prog = this.querySelector('.audio-real-progress');
        if(audio && audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            prog.style.width = pct + '%';
        }
    }

    resetAudioUI() {
        const icon = this.querySelector('svg');
        const prog = this.querySelector('.audio-real-progress');
        const wave = this.querySelector('.audio-wave-container');
        
        if(icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        if(prog) prog.style.width = '0%';
        if(wave) wave.classList.remove('audio-playing');
    }

    // --- UTILS & DISPATCHERS ---

    dispatchMenuEvent() {
        this.dispatchEvent(new CustomEvent('open-msg-menu', {
            bubbles: true,
            composed: true,
            detail: { 
                id: this._id, 
                sender: this._msg.sender, 
                text: this._msg.text || "Attachment" 
            }
        }));
    }

    dispatchReplyEvent() {
        let text = this._msg.text;
        if (!text) {
             if(this._msg.imageUrl) text = "📷 Photo";
             else if(this._msg.fileMeta?.type.includes('video')) text = "🎥 Video";
             else if(this._msg.fileMeta?.type.includes('audio')) text = "🎵 Audio";
             else text = "Attachment";
        }
        
        this.dispatchEvent(new CustomEvent('trigger-reply', {
            bubbles: true,
            composed: true,
            detail: { text: text }
        }));
    }

    linkify(text) {
        if (!text) return "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, function(url) {
            return `<a onclick="event.stopPropagation(); window.open('${url}', '_blank')">${url}</a>`;
        });
    }

    formatTime12(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0'+minutes : minutes;
        return hours + ':' + minutes + ' ' + ampm;
    }

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    }

    // Helper to get My UID from global context or attribute
    getMyUid() {
        // Assuming 'myUid' is global in the app scope, 
        // OR we can rely on this._isMe which is passed in.
        // For double-tap reaction logic, we need to know who "I" am to toggle.
        // Since we don't have global access easily in strict mode modules,
        // we rely on the controller to handle the toggle logic via the event detail.
        // We just pass "toggle" intent.
        return window.myUid; 
    }
}
customElements.define('chat-message', ChatMessage);
