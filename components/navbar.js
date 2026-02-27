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
               CSS VARIABLES & THEMING (Matching Home Page)
               ========================================================================== */
            :host {
                display: block;
                --nav-bg: rgba(5, 5, 5, 0.85);
                --accent: #00d2ff;
                --accent-dim: rgba(0, 210, 255, 0.1);
                --text-dim: #888888;
                --nav-height: 65px;
                --safe-area-bottom: env(safe-area-inset-bottom, 0px);
                
                /* Transition definitions for smooth states */
                transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                            transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* ==========================================================================
               VISIBILITY TOGGLE CLASS (For Call Screen)
               ========================================================================== */
            /* This class is toggled by JS to hide the navbar during active calls */
            .nav-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: translateY(100%) !important; 
            }

            /* ==========================================================================
               MAIN NAV CONTAINER (Mirroring .native-bottom-nav)
               ========================================================================== */
            .bottom-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: calc(var(--nav-height) + var(--safe-area-bottom));
                background: var(--nav-bg);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding-bottom: var(--safe-area-bottom);
                z-index: 9999; /* Absolute priority matching hardcoded version */
                transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            }

            /* ==========================================================================
               NAVIGATION ITEMS (Mirroring .nav-item)
               ========================================================================== */
            .nav-item {
                color: var(--text-dim);
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
                cursor: pointer;
            }

            /* ==========================================================================
               MATERIAL ICON STYLING
               ========================================================================== */
            .nav-item .material-icons-round {
                font-size: 26px;
                transition: 0.2s;
            }

            /* Active Item Styling */
            .nav-item.active {
                color: var(--accent);
            }

            .nav-item.active .material-icons-round {
                filter: drop-shadow(0px 0px 8px var(--accent-dim));
            }

            /* Press feedback */
            .nav-item:active {
                background: rgba(255, 255, 255, 0.05);
                transform: scale(0.9);
            }

            /* Hide text spans visually like hardcoded version */
            .nav-item span:not(.material-icons-round) {
                display: none;
            }

            /* ==========================================================================
               PULSE ANIMATION (Matching your Home Page requirement)
               ========================================================================== */
            .pulse-graphic {
                animation: pulse-skel 2s infinite;
            }

            @keyframes pulse-skel {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
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
            
            <a href="pulseLobby.html" class="nav-item" aria-label="Pulse">
                <span class="material-icons-round pulse-graphic" style="color: var(--accent);">graphic_eq</span>
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
     * to the navigation item that corresponds to the current page.
     */
    _highlightActive() {
        const path = window.location.pathname;
        // Default to home.html if we are at the root
        const page = path.split("/").pop() || "home.html";
        const links = this.querySelectorAll('.nav-item');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (page === href) {
                link.classList.add('active');
                
                // Swap to filled icon for Messages if active
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
     * Retains original logic precisely but adds JSDoc documentation.
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
