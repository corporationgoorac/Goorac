import './chat-message.js';

export class ChatList extends HTMLElement {
    constructor() {
        super();
        this.isLoadingMore = false;
    }

    connectedCallback() {
        this.render();
        this.cacheDOM();
        this.bindEvents();
        this.setupGlobalSlide();
    }

    render() {
        this.innerHTML = `
        <style>
            :host {
                display: block;
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                overflow: hidden;
            }

            /* --- CHAT FLOW & SCROLLBAR --- */
            #chat-flow { 
                flex: 1; 
                height: 100%;
                overflow-y: auto; 
                overflow-x: hidden; 
                padding: 15px 0; 
                display: flex; 
                flex-direction: column; 
                -webkit-overflow-scrolling: touch;
                background: transparent; 
                overscroll-behavior-y: contain; 
                position: relative;
                
                /* PADDING TOP to clear absolute header & BOTTOM for input */
                padding-top: calc(75px + env(safe-area-inset-top)); 
                padding-bottom: 90px; /* Space for input area */
                
                /* Hide Scrollbar */
                -ms-overflow-style: none; 
                scrollbar-width: none;
                
                /* Initial State Hidden (fade in via JS) */
                opacity: 0; 
                transition: opacity 0.2s ease-in;
            }
            #chat-flow::-webkit-scrollbar { display: none; }

            #messages-container { 
                display: flex; 
                flex-direction: column; 
                padding: 0 14px; 
                will-change: transform; 
                width: 100%; 
                padding-bottom: 10px; 
            }

            /* --- SCROLL TRIGGER (For Infinite Scroll) --- */
            #scroll-trigger { 
                text-align: center; 
                padding: 20px; 
                color: #262626; 
                font-size: 0.7rem; 
                order: -1; 
            }

            /* --- DATE DIVIDER --- */
            .date-divider { 
                text-align: center; 
                margin: 10px 0; 
                font-size: 0.75rem; 
                color: #fff; 
                font-weight: 600; 
                text-transform: capitalize; 
                background: rgba(40,40,40,0.6); 
                padding: 4px 10px; 
                border-radius: 12px; 
                align-self: center; 
                width: fit-content; 
                position: sticky; 
                top: 10px; 
                z-index: 5; 
                backdrop-filter: blur(4px); 
            }

            /* --- TYPING INDICATOR --- */
            #typing-indicator-bottom { 
                display: none; 
                margin-left: 56px; 
                margin-bottom: 15px; 
                background: #262626; 
                width: 54px; 
                height: 32px; 
                border-radius: 16px; 
                border-bottom-left-radius: 4px; 
                align-items: center; 
                justify-content: center; 
                gap: 4px; 
                padding: 0 12px; 
                align-self: flex-start; 
            }
            .typing-dot { 
                width: 6px; 
                height: 6px; 
                background: #999; 
                border-radius: 50%; 
                animation: typingWave 1.3s linear infinite; 
            }
            .typing-dot:nth-child(2) { animation-delay: -1.1s; }
            .typing-dot:nth-child(3) { animation-delay: -0.9s; }
            @keyframes typingWave { 
                0%, 60%, 100% { transform: translateY(0); } 
                30% { transform: translateY(-4px); } 
            }

            /* --- SCROLL DOWN BUTTON --- */
            #scroll-down-btn { 
                position: fixed; 
                bottom: 85px; 
                right: 20px; 
                width: 42px; 
                height: 42px; 
                background: #262626; 
                border-radius: 50%; 
                display: none; 
                align-items: center; 
                justify-content: center; 
                color: var(--accent, #0095f6); 
                box-shadow: 0 4px 15px rgba(0,0,0,0.5); 
                border: 1px solid #333; 
                z-index: 900; 
                cursor: pointer; 
                font-size: 1.2rem; 
                transition: all 0.3s ease; 
            }
            #scroll-down-btn.new-msg { 
                background: var(--accent, #0095f6); 
                color: #fff; 
                animation: bounce 1s infinite; 
            }
            @keyframes bounce { 
                0%, 100% { transform: translateY(0); } 
                50% { transform: translateY(-5px); } 
            }
        </style>

        <div id="chat-flow">
            <div id="scroll-trigger"></div>
            <div id="messages-container"></div>
            <div id="typing-indicator-bottom">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
        
        <div id="scroll-down-btn">⬇</div>
        `;
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
        // Scroll Event for Button Visibility
        this.dom.flow.addEventListener('scroll', () => {
            const diff = this.dom.flow.scrollHeight - this.dom.flow.scrollTop - this.dom.flow.clientHeight;
            if (diff > 250) {
                this.dom.scrollBtn.style.display = 'flex';
            } else {
                this.dom.scrollBtn.style.display = 'none';
                this.dom.scrollBtn.classList.remove('new-msg');
            }
        });

        // Click Scroll Button
        this.dom.scrollBtn.addEventListener('click', () => {
            this.scrollToBottom();
        });

        // Double Tap Background to Scroll Bottom
        this.dom.flow.addEventListener('dblclick', (e) => {
            if (e.target === this.dom.flow || e.target === this.dom.container) {
                this.scrollToBottom();
                if (navigator.vibrate) navigator.vibrate(30);
            }
        });

        // Intersection Observer for Infinite Scroll
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                this.dispatchEvent(new CustomEvent('load-more'));
            }
        }, { root: this.dom.flow, threshold: 0.5 });
        observer.observe(this.dom.trigger);
    }

    // --- INSTAGRAM STYLE TIME REVEAL GESTURE ---
    setupGlobalSlide() {
        let startX = 0, currentX = 0, isDragging = false;
        
        this.dom.flow.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = false;
        }, {passive: true});

        this.dom.flow.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            // Only trigger if pulling LEFT substantially
            if (diff < -10) { 
                isDragging = true;
                const translate = Math.max(diff, -70); // Limit to -70px
                this.dom.container.style.transform = `translateX(${translate}px)`;
                this.dom.container.style.transition = 'none';
            }
        }, {passive: true});

        this.dom.flow.addEventListener('touchend', (e) => {
            if (isDragging) {
                this.dom.container.style.transition = 'transform 0.2s cubic-bezier(0.215, 0.610, 0.355, 1.000)';
                this.dom.container.style.transform = `translateX(0px)`;
            }
            startX = 0; currentX = 0; isDragging = false;
        });
    }

    // --- PUBLIC API (Methods called by main script) ---

    clear() {
        this.dom.container.innerHTML = '';
    }

    reveal() {
        // Used on first load to show the list after processing
        this.dom.flow.style.opacity = '1';
    }

    scrollToBottom(smooth = true) {
        this.dom.flow.scrollTo({
            top: this.dom.flow.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    // This handles the "Date Dividers" (Today, Yesterday)
    addDateDivider(text) {
        const div = document.createElement('div');
        div.className = "date-divider";
        div.innerText = text;
        this.dom.container.appendChild(div);
    }

    // Adds a message bubble component
    // Note: 'data' is the full message object from Firebase
    addMessage(id, data, isMe, isLastInGroup, isLastSeen, targetUser) {
        const msgEl = document.createElement('chat-message');
        
        // Pass complex data down to the component
        msgEl.data = {
            id: id,
            msg: data,
            isMe: isMe,
            isLastInGroup: isLastInGroup,
            isLastSeen: isLastSeen,
            userPfp: targetUser ? targetUser.photoURL : null
        };

        this.dom.container.appendChild(msgEl);
    }

    // Helper to prepend messages (for load more)
    // Note: This is trickier with the Date Dividers, usually easier to 
    // clear and re-render all in the main script logic, 
    // but here is a helper if needed.
    prependHTML(htmlString) {
        // Implementation depends on controller logic
    }

    // Toggle Typing Indicators
    setTyping(isTyping) {
        this.dom.typing.style.display = isTyping ? 'flex' : 'none';
        if (isTyping) {
            this.scrollToBottom();
        }
    }

    // Trigger "New Message" bounce on the scroll button
    showNewMessageAlert() {
        const diff = this.dom.flow.scrollHeight - this.dom.flow.scrollTop - this.dom.flow.clientHeight;
        if (diff > 250) {
            this.dom.scrollBtn.classList.add('new-msg');
        }
    }
}

customElements.define('chat-list', ChatList);
