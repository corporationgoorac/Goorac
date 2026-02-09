// components/navbar.js
class MainNavbar extends HTMLElement {
    connectedCallback() {
        // --- AUTO-STORAGE LOGIC ---
        // Stores the class definition code to local storage automatically
        localStorage.setItem('goorac_navbar_component', this.constructor.toString());

        // Import Lucide Icons
        if (!document.getElementById('lucide-icons-script')) {
            const script = document.createElement('script');
            script.id = 'lucide-icons-script';
            script.src = 'https://unpkg.com/lucide@latest';
            script.onload = () => lucide.createIcons();
            document.head.appendChild(script);
        }

        this.render();
        this._highlightActive();
        this._setupVisibilityToggle();
    }

    render() {
        this.innerHTML = `
        <style>
            :host {
                display: block;
                transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                            transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* This class will be toggled to hide the navbar during active calls */
            .nav-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: translate(-50%, 40px) scale(0.95) !important;
            }

            .bottom-nav {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                width: calc(100% - 48px);
                max-width: 420px;
                /* Enhanced Glassmorphism */
                background: rgba(15, 15, 15, 0.7);
                backdrop-filter: blur(30px) saturate(200%) brightness(1.2);
                -webkit-backdrop-filter: blur(30px) saturate(200%) brightness(1.2);
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding: 10px 8px;
                border-radius: 35px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 20px 40px rgba(0,0,0,0.4), 
                            inset 0 1px 1px rgba(255,255,255,0.1);
                z-index: 10000;
                transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .nav-item {
                position: relative;
                text-decoration: none;
                color: #8e8e93; /* Apple-style dim text */
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                flex: 1;
                height: 48px;
                justify-content: center;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .nav-item i {
                width: 22px;
                height: 22px;
                stroke-width: 2px;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .nav-item span {
                font-size: 0.55rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1.2px;
                opacity: 0;
                transform: translateY(8px);
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .nav-item.active {
                color: #00d2ff;
            }

            /* Premium Glow & Lift Effect */
            .nav-item.active i {
                transform: translateY(-6px);
                filter: drop-shadow(0 0 12px rgba(0, 210, 255, 0.6));
                stroke-width: 2.5px;
            }

            .nav-item.active span {
                opacity: 1;
                transform: translateY(0);
                color: #00d2ff;
                text-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
            }

            .nav-item.active::after {
                content: '';
                position: absolute;
                bottom: 0px;
                width: 4px;
                height: 4px;
                background: #00d2ff;
                border-radius: 50%;
                box-shadow: 0 0 15px #00d2ff, 0 0 5px rgba(0, 210, 255, 1);
                animation: navPulse 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
            }

            @keyframes navPulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.5); opacity: 1; filter: brightness(1.2); }
                100% { transform: scale(1); opacity: 0.8; }
            }

            /* Haptic Press Effect */
            .nav-item:active {
                transform: scale(0.85);
                opacity: 0.7;
            }
        </style>

        <nav class="bottom-nav" id="main-nav-container">
            <a href="home.html" class="nav-item">
                <i data-lucide="layout-grid"></i>
                <span>Home</span>
            </a>
            <a href="messages.html" class="nav-item">
                <i data-lucide="message-circle"></i>
                <span>Chats</span>
            </a>
            <a href="add-contact.html" class="nav-item">
                <i data-lucide="search"></i>
                <span>Find</span>
            </a>
            <a href="calls.html" class="nav-item">
                <i data-lucide="phone"></i>
                <span>Calls</span>
            </a>
        </nav>
        `;
    }

    _highlightActive() {
        const path = window.location.pathname;
        const page = path.split("/").pop() || "home.html";
        const links = this.querySelectorAll('.nav-item');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (page === href) {
                link.classList.add('active');
            }
        });
        
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Logic to hide navbar when #call-screen is visible
     */
    _setupVisibilityToggle() {
        const navContainer = this.querySelector('#main-nav-container');
        
        // 1. Check immediately for call screen
        const checkVisibility = () => {
            const callScreen = document.getElementById('call-screen');
            if (callScreen && (callScreen.style.display === 'flex' || callScreen.classList.contains('active'))) {
                navContainer.classList.add('nav-hidden');
            } else {
                navContainer.classList.remove('nav-hidden');
            }
        };

        // 2. Use a MutationObserver to watch for display changes on the call-screen
        const observer = new MutationObserver(() => {
            checkVisibility();
        });

        // Start observing once the page is fully loaded
        setTimeout(() => {
            const target = document.getElementById('call-screen');
            if (target) {
                observer.observe(target, { attributes: true, attributeFilter: ['style', 'class'] });
            }
            checkVisibility();
        }, 1000);
    }
}

customElements.define('main-navbar', MainNavbar);
