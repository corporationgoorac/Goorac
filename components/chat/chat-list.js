import './chat-message.js';

export class ChatList extends HTMLElement {
    constructor() { super(); }

    connectedCallback() {
        this.render();
        this.cacheDOM();
        this.setupGlobalSlide();
        this.bindEvents();
    }

    render() {
        this.innerHTML = `
        <style>
            :host { display: block; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
            #chat-flow { 
                flex: 1; height: 100%; overflow-y: auto; overflow-x: hidden; 
                display: flex; flex-direction: column; position: relative;
                padding-top: calc(75px + env(safe-area-inset-top)); 
                padding-bottom: 90px;
                opacity: 0; transition: opacity 0.2s ease-in;
            }
            #messages-container { display: flex; flex-direction: column; padding: 0 14px; width: 100%; padding-bottom: 10px; }
            #scroll-trigger { padding: 20px; text-align: center; order: -1; }
            .date-divider { text-align: center; margin: 10px 0; font-size: 0.75rem; color: #fff; background: rgba(40,40,40,0.6); padding: 4px 10px; border-radius: 12px; align-self: center; width: fit-content; position: sticky; top: 10px; z-index: 5; backdrop-filter: blur(4px); }
            #typing-indicator-bottom { display: none; margin-left: 56px; margin-bottom: 15px; background: #262626; width: 54px; height: 32px; border-radius: 16px; border-bottom-left-radius: 4px; align-items: center; justify-content: center; gap: 4px; align-self: flex-start; }
            .typing-dot { width: 6px; height: 6px; background: #999; border-radius: 50%; animation: typingWave 1.3s linear infinite; }
            .typing-dot:nth-child(2) { animation-delay: -1.1s; } .typing-dot:nth-child(3) { animation-delay: -0.9s; }
            @keyframes typingWave { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
            #scroll-down-btn { position: fixed; bottom: 85px; right: 20px; width: 42px; height: 42px; background: #262626; border-radius: 50%; display: none; align-items: center; justify-content: center; color: #0095f6; z-index: 900; cursor: pointer; border: 1px solid #333; }
            #scroll-down-btn.new-msg { background: #0095f6; color: #fff; animation: bounce 1s infinite; }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        </style>
        <div id="chat-flow">
            <div id="scroll-trigger"></div>
            <div id="messages-container"></div>
            <div id="typing-indicator-bottom"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
        </div>
        <div id="scroll-down-btn">⬇</div>`;
    }

    cacheDOM() {
        this.dom = {
            flow: this.querySelector('#chat-flow'),
            container: this.querySelector('#messages-container'),
            typing: this.querySelector('#typing-indicator-bottom'),
            scrollBtn: this.querySelector('#scroll-down-btn'),
            trigger: this.querySelector('#scroll-trigger')
        };
    }

    bindEvents() {
        this.dom.flow.addEventListener('scroll', () => {
            if ((this.dom.flow.scrollHeight - this.dom.flow.scrollTop - this.dom.flow.clientHeight) > 250) {
                this.dom.scrollBtn.style.display = 'flex';
            } else {
                this.dom.scrollBtn.style.display = 'none';
                this.dom.scrollBtn.classList.remove('new-msg');
            }
        });
        this.dom.scrollBtn.addEventListener('click', () => this.scrollToBottom());
        const observer = new IntersectionObserver((e) => { if (e[0].isIntersecting) this.dispatchEvent(new CustomEvent('load-more')); }, { threshold: 0.5 });
        observer.observe(this.dom.trigger);
    }

    setupGlobalSlide() {
        let startX = 0, currentX = 0;
        this.dom.flow.addEventListener('touchstart', (e) => startX = e.touches[0].clientX, {passive: true});
        this.dom.flow.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            if (currentX - startX < -10) {
                this.dom.container.style.transform = `translateX(${Math.max(currentX - startX, -70)}px)`;
                this.dom.container.style.transition = 'none';
            }
        }, {passive: true});
        this.dom.flow.addEventListener('touchend', () => {
            this.dom.container.style.transition = 'transform 0.2s';
            this.dom.container.style.transform = `translateX(0px)`;
        });
    }

    clear() { this.dom.container.innerHTML = ''; }
    reveal() { this.dom.flow.style.opacity = '1'; }
    scrollToBottom(smooth = true) { this.dom.flow.scrollTo({ top: this.dom.flow.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }
    addDateDivider(text) { const div = document.createElement('div'); div.className = "date-divider"; div.innerText = text; this.dom.container.appendChild(div); }
    addMessage(id, data, isMe, isLastInGroup, isLastSeen, targetUser) {
        const msgEl = document.createElement('chat-message');
        msgEl.data = { id, msg: data, isMe, isLastInGroup, isLastSeen, userPfp: targetUser ? targetUser.photoURL : null };
        this.dom.container.appendChild(msgEl);
    }
    setTyping(isTyping) { this.dom.typing.style.display = isTyping ? 'flex' : 'none'; if (isTyping) this.scrollToBottom(); }
    showNewMessageAlert() { this.dom.scrollBtn.classList.add('new-msg'); }
}
customElements.define('chat-list', ChatList);
