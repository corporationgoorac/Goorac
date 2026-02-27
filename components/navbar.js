// components/navbar.js

/**
 * MainNavbar Component
 * A professional, sleek bottom navigation bar.
 * Features:
 * - Premium Glassmorphism & adaptive dark/light mode
 * - Mobile safe-area support for modern smartphones (notch/home indicator)
 * - Dynamic active states and high-fidelity micro-animations
 * - MutationObserver to automatically hide during active calls
 */
class MainNavbar extends HTMLElement {
    
    /**
     * Called when the element is inserted into the DOM.
     * Contains initialization logic, DOM rendering, and event bindings.
     */
    connectedCallback() {
        // --- AUTO-STORAGE LOGIC ---
        // Stores the class definition code to local storage automatically
        // (Retained exactly as requested)
        localStorage.setItem('goorac_navbar_component', this.constructor.toString());

        // Import Google Material Icons Round dynamically if not already present
        if (!document.getElementById('material-icons-round-css')) {
            const link = document.createElement('link');
            link.id = 'material-icons-round-css';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons+Round';
            document.head.appendChild(link);
        }

        // Render the HTML and CSS
        this.render();
        
        // Highlight the current page based on URL
        this._highlightActive();
        
        // Initialize the logic to hide the nav when calls are active
        this._setupVisibilityToggle();
    }

    /**
     * Renders the internal styling and HTML structure for the component.
     */
    render() {
        this.innerHTML = `
        <style>
            /* ==========================================================================
               CSS VARIABLES & THEMING (Synced with home.html hardcoded styles)
               ========================================================================== */
            :host {
                display: block;
                /* Light Mode (Default) Variables */
                --nav-bg: rgba(255, 255, 255, 0.90);
                --nav-border: rgba(0, 0, 0, 0.06);
                --icon-inactive: #9aa0a6; 
                --icon-active: #202124;   
                --pulse-color: #00d2ff;   
                --nav-height: 60px;
                --safe-area-bottom: env(safe-area-inset-bottom, 0px);
                
                transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                            transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* Dark Mode Variables (Synced with home.html:50-51) */
            @media (prefers-color-scheme: dark) {
                :host {
                    --nav-bg: rgba(15, 15, 15, 0.90);
                    --nav-border: rgba(255, 255, 255, 0.08);
                    --icon-inactive: #757575; 
                    --icon-active: #ffffff;   
                    --pulse-color: #00d2ff;
                }
            }

            /* ==========================================================================
               VISIBILITY TOGGLE CLASS (For Call Screen)
               ========================================================================== */
            .nav-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: translate(-50%, calc(100% + 20px)) !important; 
            }

            /* ==========================================================================
               MAIN NAV CONTAINER (Synced with .native-bottom-nav:191)
               ========================================================================== */
            .bottom-nav {
                position: fixed;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 100%;
                max-width: 600px; 
                
                display: flex;
                justify-content: space-around;
                align-items: center;
                height: calc(var(--nav-height) + var(--safe-area-bottom));
                padding-bottom: var(--safe-area-bottom); 
                
                /* High-End Glassmorphism (Synced with home.html:205) */
                background: var(--nav-bg);
                backdrop-filter: blur(24px) saturate(150%);
                -webkit-backdrop-filter: blur(24px) saturate(150%);
                
                border-top: 1px solid var(--nav-border);
                box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.03);
                
                z-index: 990;
                
                /* Animation Timing (Synced with home.html:213) */
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                            opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                            background-color 0.3s ease;
            }

            @media (min-width: 601px) {
                .bottom-nav {
                    bottom: 24px;
                    border-radius: 32px;
                    border: 1px solid var(--nav-border);
                    height: var(--nav-height);
                    padding-bottom: 0;
                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
                }
            }

            /* ==========================================================================
               NAVIGATION ITEMS (Synced with .nav-item:232)
               ========================================================================== */
            .nav-item {
                position: relative;
                text-decoration: none;
                color: var(--icon-inactive);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                height: 100%;
                -webkit-tap-highlight-color: transparent; 
                cursor: pointer;
            }

            .nav-item .material-icons-round {
                font-size: 26px; 
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                            color 0.3s ease,
                            filter 0.3s ease;
            }

            .nav-item span:not(.material-icons-round) {
                display: none; 
            }

            /* ACTIVE STATE (Synced with home.html:253-257) */
            .nav-item.active .material-icons-round {
                color: var(--icon-active);
                transform: scale(1.15); 
                filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.15)); 
            }

            .nav-item:active .material-icons-round {
                transform: scale(0.9);
                opacity: 0.7;
            }

            /* ==========================================================================
               SPECIFIC ICON OVERRIDES (Synced with home.html:265-285)
               ========================================================================== */
            .pulse-icon-container {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .nav-item .pulse-graphic {
                color: var(--pulse-color);
                animation: pulse-skel 2s infinite ease-in-out;
            }

            .nav-item.active .pulse-graphic {
                filter: drop-shadow(0 0 12px rgba(0, 210, 255, 0.6));
                animation: pulse-skel-active 2s infinite ease-in-out;
            }

            @keyframes pulse-skel {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
            }

            @keyframes pulse-skel-active {
                0% { opacity: 0.8; transform: scale(1.1); }
                50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 16px rgba(0, 210, 255, 0.8)); }
                100% { opacity: 0.8; transform: scale(1.1); }
            }

        </style>

        <nav class="bottom-nav" id="main-nav-container" aria-label="Main Navigation">
            <a href="home.html" class="nav-item" aria-label="Home">
                <span class="material-icons-round">home</span>
                <span>Home</span>
            </a>
            <a href="messages.html" class="nav-item" aria-label="Messages">
                <span class="material-icons-round">chat_bubble_outline</span>
                <span>Messages</span>
            </a>
            <a href="add-contact.html" class="nav-item" aria-label="Add Contact">
                <span class="material-icons-round">person_add</span>
                <span>Add Contact</span>
            </a>
            <a href="pulseLobby.html" class="nav-item" aria-label="Pulse Lobby">
                <div class="pulse-icon-container">
                    <span class="material-icons-round pulse-graphic">graphic_eq</span>
                </div>
                <span>Pulse</span>
            </a>
            <a href="calls.html" class="nav-item" aria-label="Calls">
                <span class="material-icons-round">phone</span>
                <span>Calls</span>
            </a>
        </nav>
        `;
    }

    /**
     * Examines the current window URL and applies the 'active' class
     */
    _highlightActive() {
        const path = window.location.pathname;
        const page = path.split("/").pop() || "home.html";
        const links = this.querySelectorAll('.nav-item');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (page === href) {
                link.classList.add('active');
                const icon = link.querySelector('.material-icons-round');
                if (icon && icon.innerText === 'chat_bubble_outline') {
                    icon.innerText = 'chat_bubble';
                }
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Logic to observe and hide the navbar when #call-screen is visible.
     */
    _setupVisibilityToggle() {
        const navContainer = this.querySelector('#main-nav-container');
        
        const checkVisibility = () => {
            const callScreen = document.getElementById('call-screen');
            if (callScreen && (callScreen.style.display === 'flex' || callScreen.classList.contains('active'))) {
                navContainer.classList.add('nav-hidden');
            } else {
                navContainer.classList.remove('nav-hidden');
            }
        };

        const observer = new MutationObserver(() => {
            checkVisibility();
        });

        setTimeout(() => {
            const target = document.getElementById('call-screen');
            if (target) {
                observer.observe(target, { 
                    attributes: true, 
                    attributeFilter: ['style', 'class'] 
                });
            }
            checkVisibility();
        }, 1000);
    }
}

// Register the custom element with the browser
customElements.define('main-navbar', MainNavbar);
