export class ChatInput extends HTMLElement {
    constructor() {
        super();
        this.isEditMode = false;
        this.replyingTo = null;
    }

    connectedCallback() {
        this.render();
        this.cacheDOM();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
        <style>
            :host {
                display: block;
                position: absolute;
                bottom: 0; left: 0; right: 0;
                width: 100%;
                z-index: 3000; /* Highest z-index */
                background: #000;
            }

            .input-area-container { 
                background: #000; 
                border-top: 1px solid var(--border, #262626); 
                padding-bottom: env(safe-area-inset-bottom, 10px); 
                width: 100%; 
                position: relative;
            }

            #reply-dock { 
                display: none; background: #111; padding: 12px 16px; 
                border-top: 1px solid var(--border, #262626); 
                justify-content: space-between; align-items: center; 
            }
            #reply-text { font-size: 0.8rem; color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90%; }
            .close-reply { color: #fff; font-weight: bold; padding: 5px; cursor: pointer; }

            #emoji-tray { display: none; background: #000; border-top: 1px solid var(--border, #262626); height: 280px; padding: 0; }

            #attachment-menu {
                display: none; position: absolute; bottom: 80px; left: 15px;
                background: rgba(28, 28, 28, 0.95); backdrop-filter: blur(10px);
                border-radius: 16px; padding: 10px; z-index: 3001;
                box-shadow: 0 5px 20px rgba(0,0,0,0.5); border: 1px solid #333;
                animation: slideUpFade 0.2s ease-out; flex-direction: column; gap: 5px; width: 150px;
            }
            @keyframes slideUpFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .attach-opt { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; color: white; font-size: 0.95rem; font-weight: 500; }
            .attach-opt:active { background: rgba(255,255,255,0.1); }
            .attach-opt svg { width: 22px; height: 22px; fill: white; }

            .input-area { padding: 10px 12px; display: flex; align-items: flex-end; gap: 10px; background: #000; }
            
            .plus-btn { font-size: 26px; color: var(--accent, #0095f6); cursor: pointer; padding: 0 5px; height: 44px; display: flex; align-items: center; transition: transform 0.2s; }
            .plus-btn:active { transform: scale(0.9); }

            .input-box { flex: 1; background: #121212; border-radius: 22px; padding: 4px 14px; border: 1px solid #333; display: flex; align-items: center; min-height: 42px; transition: border-color 0.2s; }
            
            .msg-input { width: 100%; background: transparent; border: none; color: white; padding: 9px 0; font-size: 16px; resize: none; max-height: 120px; overflow-y: auto; line-height: 1.35; font-family: inherit; outline: none; }

            .send-btn { background: transparent; border: none; font-weight: 600; font-size: 1rem; padding: 0 5px; height: 44px; display: flex; align-items: center; color: #444; pointer-events: none; transition: color 0.2s ease; }
            .send-btn.active { color: var(--accent, #0095f6); cursor: pointer; pointer-events: auto; }

            .shake-anim { animation: shake 0.4s ease-in-out; border-color: #ff3b00 !important; }
            @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); } 20%, 40%, 60%, 80% { transform: translateX(4px); } }
        </style>

        <div class="input-area-container">
            <div id="reply-dock">
                <div id="reply-text"></div>
                <div class="close-reply" id="close-reply-btn">✕</div>
            </div>

            <div id="attachment-menu">
                <div class="attach-opt" id="btn-camera"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><span>Camera</span></div>
                <div class="attach-opt" id="btn-file"><svg viewBox="0 0 24 24" style="fill:white;"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg><span>File</span></div>
                <div class="attach-opt" id="btn-emoji-toggle"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg><span>Emoji</span></div>
            </div>

            <div class="input-area">
                <div class="plus-btn" id="plus-btn">+</div>
                <div class="input-box" id="msg-input-box">
                    <textarea id="m-input" class="msg-input" placeholder="Message..." rows="1"></textarea>
                </div>
                <button id="send-btn" class="send-btn">Send</button>
            </div>

            <div id="emoji-tray"><emoji-picker id="component-picker" style="width:100%; height:100%;"></emoji-picker></div>
        </div>`;
    }

    cacheDOM() {
        this.dom = {
            input: this.querySelector('#m-input'),
            inputBox: this.querySelector('#msg-input-box'),
            sendBtn: this.querySelector('#send-btn'),
            plusBtn: this.querySelector('#plus-btn'),
            attachMenu: this.querySelector('#attachment-menu'),
            emojiTray: this.querySelector('#emoji-tray'),
            emojiPicker: this.querySelector('#component-picker'),
            replyDock: this.querySelector('#reply-dock'),
            replyText: this.querySelector('#reply-text'),
            closeReply: this.querySelector('#close-reply-btn'),
            btnCamera: this.querySelector('#btn-camera'),
            btnFile: this.querySelector('#btn-file'),
            btnEmoji: this.querySelector('#btn-emoji-toggle')
        };
    }

    bindEvents() {
        this.dom.input.addEventListener('input', () => {
            this.handleResize();
            this.toggleSendButton();
            this.dispatchEvent(new CustomEvent('typing-status', { detail: { isTyping: this.dom.input.value.trim().length > 0 } }));
        });
        this.dom.input.addEventListener('focus', () => {
            this.dom.emojiTray.style.display = 'none';
            this.dom.attachMenu.style.display = 'none';
        });
        this.dom.sendBtn.addEventListener('click', (e) => { e.preventDefault(); this.sendMessage(); });
        this.dom.plusBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleAttachmentMenu(); });
        this.dom.btnCamera.addEventListener('click', () => { this.dom.attachMenu.style.display = 'none'; this.dispatchEvent(new CustomEvent('trigger-camera')); });
        this.dom.btnFile.addEventListener('click', () => { this.dom.attachMenu.style.display = 'none'; this.dispatchEvent(new CustomEvent('trigger-file')); });
        this.dom.btnEmoji.addEventListener('click', () => { this.dom.attachMenu.style.display = 'none'; this.toggleEmojiTray(); });
        
        if(this.dom.emojiPicker) {
            this.dom.emojiPicker.addEventListener('emoji-click', (e) => {
                this.dom.input.value += e.detail.emoji || e.detail.unicode;
                this.dom.input.focus();
                this.dom.input.dispatchEvent(new Event('input'));
            });
        }
        this.dom.closeReply.addEventListener('click', () => this.cancelInteraction());
        document.addEventListener('click', (e) => { if (!this.contains(e.target)) this.dom.attachMenu.style.display = 'none'; });
    }

    handleResize() {
        const el = this.dom.input;
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
        if(el.value === '') el.style.height = 'auto';
    }

    toggleSendButton() {
        if(this.dom.input.value.trim().length > 0) this.dom.sendBtn.classList.add('active');
        else this.dom.sendBtn.classList.remove('active');
    }

    toggleAttachmentMenu() {
        if (this.dom.attachMenu.style.display === 'flex') this.dom.attachMenu.style.display = 'none';
        else { this.dom.emojiTray.style.display = 'none'; this.dom.attachMenu.style.display = 'flex'; }
    }

    toggleEmojiTray() {
        if (this.dom.emojiTray.style.display === 'block') this.dom.emojiTray.style.display = 'none';
        else { this.dom.emojiTray.style.display = 'block'; this.dispatchEvent(new CustomEvent('req-scroll-bottom')); }
    }

    setReply(text) {
        this.replyingTo = text;
        this.isEditMode = false;
        this.dom.replyText.innerText = "Replying to: " + (text.length > 50 ? text.substring(0,50)+"..." : text);
        this.dom.replyDock.style.display = 'flex';
        this.dom.input.focus();
    }

    setEdit(text) {
        this.isEditMode = true;
        this.dom.input.value = text;
        this.handleResize();
        this.toggleSendButton();
        this.dom.replyText.innerHTML = "<strong style='color:#0095f6'>Editing Message:</strong><br> " + text;
        this.dom.replyDock.style.display = 'flex';
        this.dom.input.focus();
    }

    cancelInteraction() {
        if(this.isEditMode) { this.dom.input.value = ""; this.handleResize(); }
        this.replyingTo = null;
        this.isEditMode = false;
        this.dom.replyDock.style.display = 'none';
        this.dispatchEvent(new CustomEvent('cancel-edit'));
    }

    sendMessage() {
        const text = this.dom.input.value.trim();
        if (!text) {
            this.dom.inputBox.classList.add('shake-anim');
            setTimeout(() => this.dom.inputBox.classList.remove('shake-anim'), 400);
            return;
        }
        this.dispatchEvent(new CustomEvent('send-message', {
            detail: { text: text, replyTo: this.replyingTo, isEdit: this.isEditMode }
        }));
        this.dom.input.value = "";
        this.handleResize();
        this.toggleSendButton();
        this.dom.emojiTray.style.display = 'none';
        this.dom.attachMenu.style.display = 'none';
        if (!this.isEditMode) { this.dom.replyDock.style.display = 'none'; this.replyingTo = null; }
        this.dom.input.focus();
    }
}
customElements.define('chat-input', ChatInput);
