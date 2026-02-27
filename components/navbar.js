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
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 900; /* Low enough to stay under modals naturally */
                transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                            transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* This class will be toggled to hide the navbar during active calls or modals */
            .nav-hidden {
                transform: translateY(150%) !important;
                pointer-events: none !important;
                opacity: 0 !important;
            }

            .bottom-nav {
                position: absolute;
                bottom: 0; 
                left: 0; 
                right: 0;
                height: calc(65px + env(safe-area-inset-bottom));
                background: rgba(5, 5, 5, 0.85);
                backdrop-filter: blur(25px); 
                -webkit-backdrop-filter: blur(25px);
                border-top: 1px solid rgba(255,255,255,0.05);
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding-bottom: env(safe-area-inset-bottom);
                transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s;
            }

            .nav-item {
                color: #888888;
                text-decoration: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 50px; 
                height: 50px;
                border-radius: 50%;
                transition: all 0.2s ease;
                -webkit-tap-highlight-color: transparent;
            }

            .nav-item i {
                width: 26px;
                height: 26px;
                stroke-width: 2px;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            .nav-item:active { 
                background: rgba(255,255,255,0.05); 
                transform: scale(0.9); 
            }

            .nav-item.active {
                color: #00d2ff;
            }

            /* Premium Glow & Lift Effect */
            .nav-item.active i {
                transform: translateY(-2px);
                filter: drop-shadow(0px 0px 8px rgba(0, 210, 255, 0.5));
                stroke-width: 2.5px;
            }

            /* Pulse Specific Animation */
            .pulse-anim {
                animation: pulse-skel 2s infinite;
                color: #00d2ff;
            }
            @keyframes pulse-skel { 
                0% { opacity: 0.6; transform: scale(0.95); } 
                50% { opacity: 1; transform: scale(1.05); } 
                100% { opacity: 0.6; transform: scale(0.95); } 
            }
        </style>

        <nav class="bottom-nav" id="main-nav-container">
            <a href="index.html" class="nav-item">
                <i data-lucide="home"></i>
            </a>
            <a href="messages.html" class="nav-item">
                <i data-lucide="message-circle"></i>
            </a>
            <a href="add-contact.html" class="nav-item">
                <i data-lucide="search"></i>
            </a>
            <a href="pulseLobby.html" class="nav-item">
                <i data-lucide="radio" class="pulse-anim"></i>
            </a>
            <a href="calls.html" class="nav-item">
                <i data-lucide="phone"></i>
            </a>
        </nav>
        `;
    }

    _highlightActive() {
        const path = window.location.pathname;
        const page = path.split("/").pop() || "index.html";
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
     * Logic to hide navbar when #call-screen is visible OR ANY modal is open
     */
    _setupVisibilityToggle() {
        const navContainer = this.querySelector('#main-nav-container');
        
        // 1. Check immediately for call screen AND any modals app-wide
        const checkVisibility = () => {
            const callScreen = document.getElementById('call-screen');
            
            // This aggressively checks for ANY element in the app that acts like an open modal/overlay
            const isAnyModalOpen = document.querySelector('.m-full-modal.open, .c-overlay.open, view-notes[open], view-notes.open, .modal-active, #install-popup.show');

            if (callScreen && (callScreen.style.display === 'flex' || callScreen.classList.contains('active'))) {
                navContainer.classList.add('nav-hidden');
            } else if (isAnyModalOpen) {
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

            // ADDED: App-wide observer. If a modal dynamically injects into the body anywhere, hide the nav.
            const bodyObserver = new MutationObserver(() => checkVisibility());
            bodyObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'open'] });

            checkVisibility();
        }, 1000);
    }
}

customElements.define('main-navbar', MainNavbar);
