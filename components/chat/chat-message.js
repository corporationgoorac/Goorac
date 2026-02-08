export class ChatMessage extends HTMLElement {
    constructor() { super(); }

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
        this.innerHTML = `
        <style>
            :host { display: block; width: 100%; }
            .msg-row { display: flex; width: 100%; margin-bottom: 6px; position: relative; flex-direction: column; }
            .msg-row.sent { align-items: flex-end; }
            .msg-row.received { align-items: flex-start; }
            .received-inner-row { display: flex; align-items: flex-end; gap: 8px; max-width: 100%; }
            .msg-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0; margin-bottom: 4px; background: #121212; border: 1px solid #222; }
            .msg-bubble-box { position: relative; max-width: 78%; display: flex; flex-direction: column; }
            .sent .msg-bubble-box { align-items: flex-end; }
            .bubble { padding: 12px 16px; border-radius: 20px; font-size: 1rem; line-height: 1.45; position: relative; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.15); word-wrap: break-word; }
            .sent .bubble { background: var(--sent-bg); color: #fff; border-radius: 18px 18px 4px 18px; }
            .received .bubble { background: var(--received-bg); color: #fff; border-radius: 18px 18px 18px 4px; }
            .bubble a { color: #87ceeb; text-decoration: underline; cursor: pointer; }
            .sliding-timestamp { position: absolute; top: 50%; transform: translateY(-50%); right: -65px; font-size: 0.7rem; color: #666; font-weight: 500; width: 50px; text-align: center; }
            .reaction-badge { position: absolute; bottom: -10px; background: #1a1a1a; border: 2px solid #000; border-radius: 20px; padding: 4px 7px; font-size: 0.85rem; z-index: 20; cursor: pointer; }
            .sent .reaction-badge { right: 0; } .received .reaction-badge { left: 0; }
            .seen-status { font-size: 0.65rem; color: #a8a8a8; margin-top: 4px; margin-right: 2px; text-align: right; font-weight: 500; }
            .reply-box-ui { background: rgba(0,0,0,0.25); padding: 10px 14px; border-radius: 12px; margin-bottom: 6px; font-size: 0.88rem; border-left: 4px solid rgba(255,255,255,0.5); color: #e0e0e0; max-width: 100%; cursor: pointer; }
            
            /* Media Styles */
            .chat-media-img { display: block; width: 100%; max-width: 280px; max-height: 350px; object-fit: cover; border-radius: 18px; margin-bottom: 4px; }
            .bubble.has-media { margin-top: 2px; border-radius: 4px; }
            .msg-file-pill { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #262626; border-radius: 16px; min-width: 200px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
            .file-icon { width: 40px; height: 40px; background: #333; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
            .file-name { font-size: 0.9rem; font-weight: 500; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .file-meta { font-size: 0.75rem; color: #888; }
        </style>
        ${this.buildHTML()}`;
        this.attachListeners();
    }

    buildHTML() {
        const side = this._isMe ? 'sent' : 'received';
        const date = this._msg.timestamp ? this._msg.timestamp.toDate() : new Date();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let reactionDisplay = this._msg.reactions ? Object.values(this._msg.reactions).map(r => r.emoji).join(' ') : '';
        let seenText = (this._isLastSeen && side === 'sent') ? "Seen" : "";

        let content = '';
        if (this._msg.replyTo) content += `<div class="reply-box-ui">⤴ ${this._msg.replyTo}</div>`;
        
        if (this._msg.imageUrl) {
            content += `<div class="msg-media-wrapper"><img src="${this._msg.imageUrl}" class="chat-media-img"></div>`;
        } else if (this._msg.fileUrl) {
            const label = this._msg.fileMeta?.name || "File";
            content += `<div class="msg-file-pill"><div class="file-icon">📄</div><div class="file-details"><div class="file-name">${label}</div><div class="file-meta">Attachment</div></div></div>`;
        }
        
        const safeText = this._msg.text ? this._msg.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#87ceeb">$1</a>') : '';
        const bubbleStyle = (this._msg.imageUrl || this._msg.fileUrl) && !safeText ? 'display:none' : '';
        const bubbleClass = (this._msg.imageUrl || this._msg.fileUrl) ? 'bubble has-media' : 'bubble';

        content += `<div class="${bubbleClass}" style="${bubbleStyle}"><span class="msg-text">${safeText}</span></div>`;
        if (reactionDisplay) content += `<div class="reaction-badge">${reactionDisplay}</div>`;

        if (side === 'received') {
            return `<div class="msg-row received"><div class="received-inner-row"><img src="${this._userPfp}" class="msg-avatar" style="visibility:${this._isLastInGroup?'visible':'hidden'}"><div class="msg-bubble-box">${content}</div></div><div class="sliding-timestamp">${timeStr}</div></div>`;
        } else {
            return `<div class="msg-row sent"><div class="msg-bubble-box">${content}</div>${seenText?`<div class="seen-status">${seenText}</div>`:''}<div class="sliding-timestamp">${timeStr}</div></div>`;
        }
    }

    attachListeners() {
        const target = this.querySelector('.msg-bubble-box');
        if(!target) return;

        let startX = 0;
        target.addEventListener('touchstart', (e) => startX = e.touches[0].clientX, {passive:true});
        target.addEventListener('touchend', (e) => {
            if (e.changedTouches[0].clientX - startX > 50) {
                this.dispatchEvent(new CustomEvent('trigger-reply', { bubbles: true, detail: { text: this._msg.text || "Attachment" } }));
            }
        });
        target.addEventListener('dblclick', () => {
            this.dispatchEvent(new CustomEvent('reaction', { bubbles: true, detail: { id: this._id, emoji: '❤️' } }));
        });
        target.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.dispatchEvent(new CustomEvent('open-msg-menu', { bubbles: true, detail: { id: this._id, sender: this._msg.sender, text: this._msg.text } }));
        });
        const badge = this.querySelector('.reaction-badge');
        if(badge) badge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('show-reaction-details', { bubbles: true, detail: { reactions: this._msg.reactions } }));
        });
        const filePill = this.querySelector('.msg-file-pill');
        if(filePill) filePill.addEventListener('click', () => window.open(this._msg.fileUrl, '_blank'));
    }
}
customElements.define('chat-message', ChatMessage);
