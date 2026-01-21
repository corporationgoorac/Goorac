// components/navbar.js
class MainNavbar extends HTMLElement {
    connectedCallback() {
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
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            /* This class will be toggled to hide the navbar during active calls */
            .nav-hidden {
                opacity: 0 !important;
                pointer-events: none !important;
                transform: translate(-50%, 100px) !important;
            }

            .bottom-nav {
                position: fixed;
                bottom: 25px;
                left: 50%;
                transform: translateX(-50%);
                width: calc(100% - 40px);
                max-width: 400px;
                background: rgba(10, 10, 10, 0.85);
                backdrop-filter: blur(25px) saturate(180%);
                -webkit-backdrop-filter: blur(25px) saturate(180%);
                display: flex;
                justify-content: space-around;
                align-items: center;
                padding: 12px 8px;
                border-radius: 28px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 25px 50px rgba(0,0,0,0.8);
                z-index: 10000;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .nav-item {
                position: relative;
                text-decoration: none;
                color: #666;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                flex: 1;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .nav-item i {
                width: 22px;
                height: 22px;
                stroke-width: 2.2px;
                transition: all 0.3s ease;
            }

            .nav-item span {
                font-size: 0.6rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                opacity: 0;
                transform: translateY(5px);
                transition: all 0.3s ease;
            }

            .nav-item.active {
                color: #00d2ff;
            }

            .nav-item.active i {
                transform: translateY(-4px);
                filter: drop-shadow(0 0 10px rgba(0, 210, 255, 0.6));
            }

            .nav-item.active span {
                opacity: 1;
                transform: translateY(0);
            }

            .nav-item.active::after {
                content: '';
                position: absolute;
                bottom: -6px;
                width: 5px;
                height: 5px;
                background: #00d2ff;
                border-radius: 50%;
                box-shadow: 0 0 12px #00d2ff, 0 0 20px rgba(0, 210, 255, 0.4);
                animation: navPulse 2s infinite;
            }

            @keyframes navPulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }

            .nav-item:active {
                transform: scale(0.85);
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
            if (callScreen && callScreen.style.display === 'flex') {
                navContainer.classList.add('nav-hidden');
            } else {
                navContainer.classList.remove('nav-hidden');
            }
        };

        // 2. Use a MutationObserver to watch for display changes on the call-screen
        // This makes it "fix" itself instantly when a call starts
        const observer = new MutationObserver(() => {
            checkVisibility();
        });

        // Start observing once the page is fully loaded
        setTimeout(() => {
            const target = document.getElementById('call-screen');
            if (target) {
                observer.observe(target, { attributes: true, attributeFilter: ['style'] });
            }
            checkVisibility();
        }, 1000);
    }
}

customElements.define('main-navbar', MainNavbar);