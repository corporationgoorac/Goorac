// components/navbar.js

/**
 * MainNavbar Component
 * A professional, Instagram-style bottom navigation bar.
 * Features:
 * - Glassmorphism & adaptive dark/light mode
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
               CSS VARIABLES & THEMING
               ========================================================================== */
            :host {
                display: block;
                /* Light Mode (Default) Variables */
                --nav-bg: rgba(255, 255, 255, 0.95);
                --nav-border: rgba(0, 0, 0, 0.08);
                --icon-inactive: #8e8e93; /* Subtle gray for inactive items */
                --icon-active: #000000;   /* High contrast for active items */
                --add-btn-bg: transparent;
                --add-btn-border: #000000;
                --pulse-color: #00d2ff;   /* Using your --accent color for the pulse */
                --nav-height: 60px;
                --safe-area-bottom: env(safe-area-inset-bottom, 0px);
                
                /* Transition definitions for smooth states */
                transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                            transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            /* Dark Mode Variables */
            @media (prefers-color-scheme: dark) {
                :host {
                    --nav-bg: rgba(18, 18, 18, 0.95);
                    --nav-border: rgba(255, 255, 255, 0.1);
                    --icon-inactive: #8e8e93;
                    --icon-active: #ffffff;
                    --add-btn-border: #ffffff;
                    --pulse-color: #00d2ff;
                }
            }

            /* ==========================================================================
               VISIBILITY TOGGLE CLASS (For Call Screen)
               ========================================================================== */
            /* This class is toggled by JS to hide the navbar during active calls */
            .nav-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                /* Sinks downwards instead of backwards for a cleaner exit */
                transform: translate(-50%, calc(100% + 20px)) !important; 
            }

            /* ==========================================================================
               MAIN NAV CONTAINER
               ========================================================================== */
            .bottom-nav {
                /* Positioning */
                position: fixed;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 100%;
                max-width: 600px; /* Constrain width on tablets/desktops */
                
                /* Layout */
                display: flex;
                justify-content: space-around;
                align-items: center;
                height: calc(var(--nav-height) + var(--safe-area-bottom));
                padding-bottom: var(--safe-area-bottom); /* iOS Home Bar padding */
                
                /* Glassmorphism & Background */
                background: var(--nav-bg);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                
                /* Borders & Shadows (Instagram style is very flat with a subtle top border) */
                border-top: 1px solid var(--nav-border);
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.02);
                
                /* Z-INDEX MANAGEMENT 
                   Set to 990 so it stays above standard content but naturally 
                   falls behind modals, dropdowns, and overlays (which usually use 1000+) */
                z-index: 990;
                
                /* Animation */
                transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                            opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                            background-color 0.3s ease;
            }

            /* Tablet/Desktop optimization: Float it slightly like a dock if screen is wide */
            @media (min-width: 601px) {
                .bottom-nav {
                    bottom: 20px;
                    border-radius: 30px;
                    border: 1px solid var(--nav-border);
                    height: var(--nav-height);
                    padding-bottom: 0;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
                }
            }

            /* ==========================================================================
               NAVIGATION ITEMS
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
                /* Remove tap highlight on mobile for cleaner feel */
                -webkit-tap-highlight-color: transparent; 
                cursor: pointer;
            }

            /* ==========================================================================
               MATERIAL ICON STYLING & ANIMATIONS
               ========================================================================== */
            .nav-item .material-icons-round {
                font-size: 28px;
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                            color 0.3s ease,
                            filter 0.3s ease;
            }

            /* Hidden text labels for screen readers. 
               Instagram typically does not show text on the bottom bar. */
            .nav-item span:not(.material-icons-round) {
                display: none; /* Visually hidden to match Instagram style */
            }

            /* ACTIVE STATE 
               When the URL matches, the icon becomes darker/lighter (theme dependent)
               and visually bolder, exactly like Instagram's active state. */
            .nav-item.active .material-icons-round {
                color: var(--icon-active);
                transform: scale(1.15); /* Subtle pop effect */
                filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.1));
            }

            /* HAPTIC FEEDBACK (CSS visual simulation)
               When actively pressing down on an icon */
            .nav-item:active .material-icons-round {
                transform: scale(0.9);
                opacity: 0.7;
            }

            /* ==========================================================================
               SPECIFIC ICON OVERRIDES
               ========================================================================== */
            
            /* 1. Add Customer (Center Button) Styling */
            .nav-item.add-btn {
                flex: 1.2; /* Slightly wider hit area */
            }

            /* 2. Pulse / Graphical Wave Icon Styling (From your Home Page) */
            .pulse-icon-container {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* The animated pulse effect for the graphic_eq icon */
            .nav-item .pulse-graphic {
                color: var(--pulse-color);
                animation: pulse-skel 2s infinite ease-in-out;
            }

            /* Stronger glow when active */
            .nav-item.active .pulse-graphic {
                filter: drop-shadow(0 0 10px rgba(0, 210, 255, 0.5));
                animation: pulse-skel-active 2s infinite ease-in-out;
            }

            @keyframes pulse-skel {
                0% { opacity: 0.7; transform: scale(0.95); }
                50% { opacity: 1; transform: scale(1.05); }
                100% { opacity: 0.7; transform: scale(0.95); }
            }

            @keyframes pulse-skel-active {
                0% { opacity: 0.8; transform: scale(1.1); }
                50% { opacity: 1; transform: scale(1.25); filter: drop-shadow(0 0 15px rgba(0, 210, 255, 0.8)); }
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
            
            <a href="add-customer.html" class="nav-item add-btn" aria-label="Add Customer">
                <span class="material-icons-round">add_box</span>
                <span>Add Customer</span>
            </a>
            
            <a href="pulse.html" class="nav-item" aria-label="Pulse">
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
     * to the navigation item that corresponds to the current page.
     */
    _highlightActive() {
        const path = window.location.pathname;
        // Default to home.html if we are at the root
        const page = path.split("/").pop() || "home.html";
        const links = this.querySelectorAll('.nav-item');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            // Check if the link's href matches the current page file
            if (page === href) {
                link.classList.add('active');
                
                // Professional Touch: Swap out the outlined chat bubble for the filled one when active
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
        
        // 1. Check function for call screen presence and visibility status
        const checkVisibility = () => {
            const callScreen = document.getElementById('call-screen');
            // If the element exists and is displaying flex or has 'active' class
            if (callScreen && (callScreen.style.display === 'flex' || callScreen.classList.contains('active'))) {
                navContainer.classList.add('nav-hidden');
            } else {
                navContainer.classList.remove('nav-hidden');
            }
        };

        // 2. Use a MutationObserver to watch for display/class changes on the call-screen
        const observer = new MutationObserver(() => {
            checkVisibility();
        });

        // Start observing once the page is fully loaded
        // Timeout ensures other DOM elements have finished mounting
        setTimeout(() => {
            const target = document.getElementById('call-screen');
            if (target) {
                // Watch for changes in the 'style' and 'class' attributes
                observer.observe(target, { 
                    attributes: true, 
                    attributeFilter: ['style', 'class'] 
                });
            }
            // Perform an initial check in case the call screen started open
            checkVisibility();
        }, 1000);
    }
}

// Register the custom element with the browser
customElements.define('main-navbar', MainNavbar);
