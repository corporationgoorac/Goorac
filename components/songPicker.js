class SongPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.initLogic();
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            /* --- 1. RESET & CORE STYLES (Replicating Tailwind) --- */
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            
            :host {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 9999; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end;
                color: white; font-size: 14px;
            }
            :host(.active) { pointer-events: auto; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); }

            /* Main Container (Slide Up Animation) */
            .picker-container {
                background-color: #000000; height: 90vh; width: 100%;
                border-radius: 20px 20px 0 0; overflow: hidden; display: flex; flex-direction: column;
                transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                box-shadow: 0 -10px 40px rgba(0,0,0,0.5); position: relative;
            }
            :host(.active) .picker-container { transform: translateY(0); }

            /* --- 2. HEADER SECTION --- */
            .header-area { padding: 16px; background: #000; z-index: 40; border-bottom: 1px solid #1c1c1e; }
            
            /* Drag Handle */
            .drag-handle-area { width: 100%; display: flex; justify-content: center; padding-bottom: 15px; cursor: pointer; }
            .drag-handle { width: 40px; height: 5px; background: #3a3a3c; border-radius: 10px; }

            /* Search Box */
            .search-box { 
                background-color: #2c2c2e; border-radius: 10px; padding: 10px 14px; 
                display: flex; align-items: center; margin-bottom: 16px; 
            }
            .search-input { 
                background: transparent; border: none; outline: none; color: white; 
                width: 100%; font-size: 17px; margin-left: 10px; 
            }

            /* Tabs */
            .tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
            .tabs::-webkit-scrollbar { display: none; }
            
            .pill-tab { 
                background-color: #262626; border: none; border-radius: 8px; padding: 6px 16px; 
                font-weight: 600; font-size: 14px; color: #a8a8a8; transition: 0.2s; white-space: nowrap; cursor: pointer; 
            }
            .pill-tab.active { background-color: #ffffff; color: #000000; }

            /* --- 3. SONG LIST --- */
            .scroll-container { flex: 1; overflow-y: auto; padding: 0 16px 100px 16px; scrollbar-width: none; }
            .scroll-container::-webkit-scrollbar { display: none; }

            .song-row { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 12px 0; border-bottom: 0.5px solid #1c1c1e; cursor: pointer; 
            }
            .song-row:active { background-color: #1a1a1a; }

            .song-info { display: flex; align-items: center; gap: 12px; overflow: hidden; flex: 1; }
            .song-art { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; background: #1c1c1e; flex-shrink: 0;}
            .song-text { display: flex; flex-direction: column; overflow: hidden; }
            .song-title { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white; }
            .song-artist { font-size: 13px; color: #98989d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            .bookmark-btn { background: none; border: none; padding: 8px; cursor: pointer; display: flex; align-items: center; }

            /* --- 4. MINI PLAYER --- */
            .mini-player {
                position: absolute; bottom: 0; left: 0; right: 0; z-index: 50;
                background-color: #121217; border-top: 1px solid #1c1c1e; padding: 10px 16px;
                display: flex; align-items: center; justify-content: space-between;
                transform: translateY(100%); transition: transform 0.3s ease;
            }
            .mini-player.show { transform: translateY(0); }

            .controls { display: flex; align-items: center; gap: 20px; }
            .icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 5px; }
            
            /* The Selection Arrow Button */
            .select-btn {
                width: 32px; height: 32px; background: #ffffff; border-radius: 50%; border: none;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            .select-btn:active { transform: scale(0.9); }

            /* --- 5. ICONS (SVGs to replace FontAwesome) --- */
            svg { fill: white; width: 20px; height: 20px; }
            .text-gray svg { fill: #98989d; width: 16px; height: 16px; }
            .select-btn svg { fill: black; width: 14px; height: 14px; }
            
            /* --- 6. UTILS --- */
            .hidden { display: none; }
            .text-center { text-align: center; color: #666; padding: 20px; }
        </style>

        <div class="picker-container" id="mainContainer">
            <div class="header-area">
                <div class="drag-handle-area" id="closeDragBtn">
                    <div class="drag-handle"></div>
                </div>
                
                <div class="search-box">
                    <span class="text-gray">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    </span>
                    <input type="text" id="searchInput" class="search-input" placeholder="Search music" autocomplete="off">
                </div>

                <div class="tabs">
                    <button id="tabForYou" class="pill-tab active">For you</button>
                    <button id="tabTrending" class="pill-tab">Trending</button>
                    <button id="tabSaved" class="pill-tab">Saved</button>
                </div>
            </div>

            <div class="scroll-container" id="songList">
                <div id="statusMsg" class="text-center">Loading...</div>
            </div>

            <div id="miniPlayer" class="mini-player">
                <div class="song-info" id="miniInfoArea" style="cursor: pointer;">
                    <img id="mImg" src="" class="song-art">
                    <div class="song-text">
                        <span id="mTitle" class="song-title">Song Title</span>
                        <span id="mArtist" class="song-artist">Artist Name</span>
                    </div>
                </div>
                <div class="controls">
                    <button id="miniPlayBtn" class="icon-btn">
                        <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <svg id="pauseIcon" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    
                    <button id="confirmSelectionBtn" class="select-btn">
                        <svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                    </button>
                </div>
            </div>
        </div>

        <audio id="player"></audio>
        `;
    }

    initLogic() {
        const root = this.shadowRoot;
        
        // --- 🧠 CORE CONFIG (Preserved from your code) ---
        this.API_URL = "https://itunes.apple.com/search";
        this.PROXIES = [
            "https://api.codetabs.com/v1/proxy?quest=", 
            "https://api.allorigins.win/raw?url=",
            "https://corsproxy.io/?"
        ];
        
        // --- 💾 DATABASE ---
        this.DB = {
            getSaved: () => JSON.parse(localStorage.getItem('insta_saved')) || [],
            setSaved: (data) => localStorage.setItem('insta_saved', JSON.stringify(data)),
            getCache: () => JSON.parse(localStorage.getItem('insta_cache')) || {},
            addToCache: (songs) => {
                let c = this.DB.getCache();
                songs.forEach(s => c[s.trackId] = s);
                localStorage.setItem('insta_cache', JSON.stringify(c));
            }
        };

        this.currentView = [];
        this.activeTab = 'For You';
        this.currentSongData = null; // The song currently playing

        // --- DOM ELEMENTS ---
        this.player = root.getElementById('player');
        this.list = root.getElementById('songList');
        this.status = root.getElementById('statusMsg');
        this.searchInput = root.getElementById('searchInput');

        // --- EVENT LISTENERS ---
        let searchTimer;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            const val = e.target.value.trim();
            if (val.length > 2) {
                searchTimer = setTimeout(() => this.loadData(val), 800);
            } else if(val.length === 0) {
                this.loadSmartForYou();
            }
        });

        // Tabs
        root.getElementById('tabForYou').onclick = (e) => this.switchTab('For You', e.target);
        root.getElementById('tabTrending').onclick = (e) => this.switchTab('Trending', e.target);
        root.getElementById('tabSaved').onclick = (e) => this.switchTab('Saved', e.target);

        // Player Controls
        root.getElementById('miniPlayBtn').onclick = () => this.togglePlayState();
        root.getElementById('closeDragBtn').onclick = () => this.close();
        
        // *** THE FIX: Arrow Button Logic ***
        root.getElementById('confirmSelectionBtn').onclick = () => this.confirmSelection();

        this.player.onended = () => this.updateIcons(false);
    }

    // --- PUBLIC METHODS ---
    open() {
        this.classList.add('active');
        this.loadSmartForYou(); // Load data immediately on open
    }

    close() {
        this.classList.remove('active');
        this.player.pause();
        this.updateIcons(false);
    }

    // --- SELECTION LOGIC ---
    confirmSelection() {
        if (this.currentSongData) {
            // Dispatch event to parent
            this.dispatchEvent(new CustomEvent('song-selected', { 
                detail: this.currentSongData,
                bubbles: true,
                composed: true
            }));
            this.close();
        }
    }

    // --- 🧠 SMART LOGIC ---
    loadSmartForYou() {
        this.status.style.display = 'none';
        this.loadData("Tamil Top Hits"); 
    }

    async loadData(query, silent = false) {
        if(!silent) this.list.innerHTML = `<div class="text-center">Loading...</div>`;
        
        const targetUrl = `${this.API_URL}?term=${encodeURIComponent(query)}&country=IN&entity=song&limit=40`;
        let success = false;

        for (let proxy of this.PROXIES) {
            try {
                const res = await fetch(proxy + encodeURIComponent(targetUrl));
                if (!res.ok) continue;
                const data = await res.json();
                
                if(data.results && data.results.length > 0) {
                    this.currentView = data.results;
                    this.DB.addToCache(data.results);
                    this.renderList(this.currentView);
                    success = true;
                    break;
                }
            } catch (e) { console.log("Switching proxy..."); }
        }

        if (!success) {
            this.list.innerHTML = `<div class="text-center" style="color: #ff6b6b;">Network Error. Try searching.</div>`;
        }
    }

    renderList(songs) {
        this.list.innerHTML = '';
        const savedIds = this.DB.getSaved().map(s => s.trackId);

        songs.forEach(song => {
            const isSaved = savedIds.includes(song.trackId);
            const art = song.artworkUrl100.replace('100x100bb', '300x300bb');
            
            const item = document.createElement('div');
            item.className = 'song-row';
            
            // Bookmark Icon SVGs
            const bookmarkIcon = isSaved 
                ? `<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>` 
                : `<svg viewBox="0 0 24 24" style="fill:none; stroke:#98989d; stroke-width:2;"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;

            item.innerHTML = `
                <div class="song-info">
                    <img src="${art}" class="song-art">
                    <div class="song-text">
                        <span class="song-title">${song.trackName}</span>
                        <span class="song-artist">${song.artistName}</span>
                    </div>
                </div>
                <button class="bookmark-btn" data-id="${song.trackId}">
                    ${bookmarkIcon}
                </button>
            `;
            
            // Click Logic
            item.querySelector('.song-info').onclick = () => this.playTrack(song);
            item.querySelector('.bookmark-btn').onclick = (e) => this.toggleSave(song.trackId, e, item);
            
            this.list.appendChild(item);
        });
    }

    toggleSave(id, e, row) {
        e.stopPropagation();
        let saved = this.DB.getSaved();
        const index = saved.findIndex(s => s.trackId === id);
        
        if (index > -1) {
            saved.splice(index, 1);
        } else {
            const cache = this.DB.getCache();
            const song = this.currentView.find(s => s.trackId === id) || cache[id];
            if(song) saved.push(song);
        }
        
        this.DB.setSaved(saved);
        
        if (this.activeTab === 'Saved') {
            this.renderList(saved);
        } else {
            // Update icon visually
            const btn = row.querySelector('.bookmark-btn');
            const isSaved = index === -1; 
            btn.innerHTML = isSaved 
                ? `<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`
                : `<svg viewBox="0 0 24 24" style="fill:none; stroke:#98989d; stroke-width:2;"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
        }
    }

    playTrack(song) {
        this.currentSongData = song;
        const art = song.artworkUrl100.replace('100x100bb', '600x600bb');
        const root = this.shadowRoot;

        root.getElementById('mImg').src = art;
        root.getElementById('mTitle').innerText = song.trackName;
        root.getElementById('mArtist').innerText = song.artistName;
        
        this.player.src = song.previewUrl;
        this.player.play().catch(e => console.log("Autoplay blocked"));
        
        root.getElementById('miniPlayer').classList.add('show');
        this.updateIcons(true);
    }

    togglePlayState() {
        if (this.player.paused) { this.player.play(); this.updateIcons(true); } 
        else { this.player.pause(); this.updateIcons(false); }
    }

    updateIcons(isPlaying) {
        const root = this.shadowRoot;
        if(isPlaying) {
            root.getElementById('playIcon').style.display = 'none';
            root.getElementById('pauseIcon').style.display = 'block';
        } else {
            root.getElementById('playIcon').style.display = 'block';
            root.getElementById('pauseIcon').style.display = 'none';
        }
    }

    switchTab(name, btn) {
        this.activeTab = name;
        this.shadowRoot.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.status.style.display = 'none';

        if (name === 'Saved') {
            const s = this.DB.getSaved();
            if(s.length === 0) this.list.innerHTML = `<div class="text-center">No saved songs yet.</div>`;
            else this.renderList(s);
        } else if (name === 'Trending') {
            this.loadData("Global Top 100");
        } else {
            this.loadSmartForYou();
        }
    }
}

customElements.define('song-picker', SongPicker);
