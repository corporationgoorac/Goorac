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
            /* --- 1. RESET & CORE STYLES --- */
            :host {
                --bg-color: #000000; /* Solid Black for Full Screen */
                --surface-color: #1c1c1e;
                --surface-highlight: #2c2c2e;
                --accent-color: #0a84ff;
                --text-primary: #ffffff;
                --text-secondary: #8e8e93;
                --border-color: rgba(255, 255, 255, 0.1);
                --safe-area-top: env(safe-area-inset-top, 20px);
                --safe-area-bottom: env(safe-area-inset-bottom, 20px);
            }

            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
            
            :host {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 9999; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end;
                color: var(--text-primary); font-size: 14px;
            }
            
            /* FULL SCREEN MODAL: Solid background, no blur */
            :host(.active) { 
                pointer-events: auto; 
                background-color: var(--bg-color); 
                transition: opacity 0.3s;
            }

            /* Main Container (Slide Up Animation) */
            .picker-container {
                background-color: var(--bg-color); 
                height: 100%; width: 100%; /* Full Height */
                margin: 0 auto;
                border-radius: 0; /* No corners for full screen */
                overflow: hidden; display: flex; flex-direction: column;
                transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
                position: relative;
            }
            
            /* Desktop adjustment: Keep it centered but full height */
            @media (min-width: 600px) {
                .picker-container { max-width: 600px; border-right: 1px solid var(--border-color); border-left: 1px solid var(--border-color); }
            }

            :host(.active) .picker-container { transform: translateY(0); }

            /* --- 2. HEADER SECTION --- */
            .header-area { 
                padding: calc(12px + var(--safe-area-top)) 16px 16px 16px; /* Added Safe Area Top */
                background: var(--surface-color);
                z-index: 40; 
                border-bottom: 1px solid var(--border-color); 
                position: relative; 
                flex-shrink: 0;
            }
            
            /* Drag Handle (Optional in full screen, kept for visual hint) */
            .drag-handle-area { width: 100%; display: flex; justify-content: center; padding-bottom: 15px; cursor: pointer; }
            .drag-handle { width: 36px; height: 5px; background: rgba(255,255,255,0.3); border-radius: 10px; }

            /* Close 'X' Button */
            .close-btn {
                position: absolute; top: calc(16px + var(--safe-area-top)); right: 16px; width: 32px; height: 32px;
                background: var(--surface-highlight); border-radius: 50%; display: flex; align-items: center; justify-content: center;
                cursor: pointer; border: none; z-index: 50; transition: transform 0.1s;
            }
            .close-btn:active { transform: scale(0.9); background: #3a3a3c; }
            .close-btn svg { width: 12px; height: 12px; fill: var(--text-secondary); }

            /* Search Box */
            .search-box { 
                background-color: var(--surface-highlight); border-radius: 12px; padding: 10px 12px; 
                display: flex; align-items: center; margin-bottom: 16px; margin-top: 5px;
                transition: background 0.2s;
            }
            .search-box:focus-within { background-color: #3a3a3c; }
            
            .search-input { 
                background: transparent; border: none; outline: none; color: white; 
                width: 100%; font-size: 16px; margin-left: 10px; font-weight: 400;
            }
            .search-input::placeholder { color: #6e6e73; }

            /* Tabs */
            .tabs { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
            .tabs::-webkit-scrollbar { display: none; }
            
            .pill-tab { 
                background: transparent; border: 1px solid var(--border-color); border-radius: 20px; padding: 6px 16px; 
                font-weight: 500; font-size: 13px; color: var(--text-secondary); transition: all 0.2s; 
                white-space: nowrap; cursor: pointer; flex-shrink: 0;
            }
            .pill-tab.active { background-color: var(--text-primary); color: #000000; border-color: var(--text-primary); }
            .pill-tab:active { transform: scale(0.96); }

            /* --- 3. SONG LIST --- */
            .scroll-container { 
                flex: 1; overflow-y: auto; 
                padding: 0 16px calc(80px + var(--safe-area-bottom)) 16px; 
                scrollbar-width: none; 
            }
            .scroll-container::-webkit-scrollbar { display: none; }

            .song-row { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 10px 0; border-bottom: 1px solid var(--border-color); cursor: pointer; 
                transition: background 0.2s; border-radius: 8px;
            }
            .song-row:hover { background: rgba(255,255,255,0.03); }
            .song-row:active { background: rgba(255,255,255,0.08); transform: scale(0.99); }

            .song-info { display: flex; align-items: center; gap: 14px; overflow: hidden; flex: 1; }
            .song-art { 
                width: 50px; height: 50px; border-radius: 8px; object-fit: cover; 
                background: var(--surface-highlight); flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            .song-text { display: flex; flex-direction: column; overflow: hidden; gap: 3px; }
            .song-title { font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
            .song-artist { font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            .bookmark-btn { 
                background: none; border: none; padding: 10px; cursor: pointer; 
                display: flex; align-items: center; opacity: 0.8; transition: opacity 0.2s;
            }
            .bookmark-btn:active { transform: scale(0.8); }

            /* --- 4. MINI PLAYER --- */
            .mini-player {
                position: absolute; bottom: 0; left: 0; right: 0; z-index: 50;
                background: var(--surface-color);
                border-top: 1px solid rgba(255,255,255,0.15); 
                padding: 12px 16px calc(12px + var(--safe-area-bottom)) 16px;
                display: flex; align-items: center; justify-content: space-between;
                transform: translateY(110%); transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
                box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
            }
            .mini-player.show { transform: translateY(0); }

            .controls { display: flex; align-items: center; gap: 16px; }
            
            .icon-btn { 
                background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; 
                padding: 8px; color: white; transition: transform 0.1s;
            }
            .icon-btn:active { transform: scale(0.9); }
            
            /* The Selection Arrow Button */
            .select-btn {
                width: 36px; height: 36px; background: var(--text-primary); border-radius: 50%; border: none;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                box-shadow: 0 4px 15px rgba(255,255,255,0.2); transition: transform 0.1s;
            }
            .select-btn:active { transform: scale(0.9); background: #e5e5e5; }

            /* --- 5. LOADING SKELETON & UTILS --- */
            .loading-skeleton {
                display: flex; align-items: center; gap: 14px; padding: 12px 0;
            }
            .sk-img { width: 50px; height: 50px; border-radius: 8px; background: var(--surface-highlight); animation: pulse 1.5s infinite; }
            .sk-text-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
            .sk-line { height: 10px; border-radius: 4px; background: var(--surface-highlight); animation: pulse 1.5s infinite; }
            
            @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

            svg { fill: currentColor; width: 22px; height: 22px; }
            .text-gray svg { fill: var(--text-secondary); width: 18px; height: 18px; }
            .select-btn svg { fill: black; width: 16px; height: 16px; }
            
            .hidden { display: none; }
            .text-center { text-align: center; color: var(--text-secondary); padding: 40px 20px; font-size: 14px; }
        </style>

        <div class="picker-container" id="mainContainer">
            <div class="header-area">
                <div class="drag-handle-area" id="closeDragBtn">
                    <div class="drag-handle"></div>
                </div>
                
                <button class="close-btn" id="closeXBtn">
                     <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>

                <div class="search-box">
                    <span class="text-gray">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    </span>
                    <input type="text" id="searchInput" class="search-input" placeholder="Search songs, artists..." autocomplete="off">
                </div>

                <div class="tabs">
                    <button id="tabForYou" class="pill-tab active">For You</button>
                    <button id="tabTrending" class="pill-tab">Trending</button>
                    <button id="tabSaved" class="pill-tab">Saved</button>
                </div>
            </div>

            <div class="scroll-container" id="songList">
                <div id="statusMsg" class="text-center">Start searching...</div>
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
                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </button>
                </div>
            </div>
        </div>

        <audio id="player"></audio>
        `;
    }

    initLogic() {
        const root = this.shadowRoot;
        
        // --- 🧠 CORE CONFIG ---
        this.API_URL = "https://itunes.apple.com/search";
        this.PROXIES = [
            "https://api.allorigins.win/raw?url=",
            "https://corsproxy.io/?",
            "https://api.codetabs.com/v1/proxy?quest="
        ];
        
        // --- 💾 DATABASE & ANALYTICS ENGINE ---
        this.DB = {
            // Basic Saving
            getSaved: () => JSON.parse(localStorage.getItem('insta_saved')) || [],
            setSaved: (data) => localStorage.setItem('insta_saved', JSON.stringify(data)),
            
            // Caching
            getCache: (key) => JSON.parse(localStorage.getItem('picker_cache_' + key)) || null,
            setCache: (key, data) => localStorage.setItem('picker_cache_' + key, JSON.stringify(data)),
            
            // Global Mem Cache
            globalCache: {}, 
            addToGlobal: (songs) => songs.forEach(s => this.DB.globalCache[s.trackId] = s),

            // --- 🤖 ML / ANALYTICS START ---
            // Profile stores: { artists: {name: score}, genres: {name: score} }
            getUserProfile: () => JSON.parse(localStorage.getItem('picker_user_profile_v2')) || { artists: {}, genres: {} },
            setUserProfile: (data) => localStorage.setItem('picker_user_profile_v2', JSON.stringify(data)),

            // Log Interaction (Play=3, Save=10)
            trackInteraction: (song, weight) => {
                if(!song) return;
                const profile = this.DB.getUserProfile();
                
                // Track Artist
                const artistName = song.artistName ? song.artistName.split(',')[0].trim() : null;
                if (artistName) {
                    if (!profile.artists[artistName]) profile.artists[artistName] = 0;
                    profile.artists[artistName] += weight;
                }

                // Track Genre
                const genre = song.primaryGenreName;
                if (genre) {
                    if (!profile.genres[genre]) profile.genres[genre] = 0;
                    profile.genres[genre] += weight;
                }

                this.DB.setUserProfile(profile);
            },

            // Get Recommendations (Artist OR Genre)
            getRecommendationQuery: () => {
                const profile = this.DB.getUserProfile();
                
                // Helper to sort keys by value
                const getTopKeys = (obj) => Object.entries(obj).sort(([,a], [,b]) => b - a).map(([k]) => k);
                
                const topArtists = getTopKeys(profile.artists || {});
                const topGenres = getTopKeys(profile.genres || {});

                // 30% Chance to suggest by GENRE, 70% by ARTIST
                const useGenre = Math.random() < 0.3;

                if (useGenre && topGenres.length > 0) {
                    // Pick top genre
                    return topGenres[0] + " top hits";
                } else if (topArtists.length > 0) {
                    // Pick one of top 3 artists randomly
                    return topArtists[Math.floor(Math.random() * Math.min(topArtists.length, 3))];
                }
                
                return null; // No history
            }
            // --- 🤖 ML / ANALYTICS END ---
        };

        this.currentView = [];
        this.activeTab = 'For You';
        this.currentSongData = null; 

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
            if (val.length > 1) { 
                this.renderSkeletonLoading();
                searchTimer = setTimeout(() => this.loadData(val, false, 'search'), 600); 
            } else if(val.length === 0) {
                this.switchTab('For You', root.getElementById('tabForYou'));
            }
        });

        // Tabs
        root.getElementById('tabForYou').onclick = (e) => this.switchTab('For You', e.target);
        root.getElementById('tabTrending').onclick = (e) => this.switchTab('Trending', e.target);
        root.getElementById('tabSaved').onclick = (e) => this.switchTab('Saved', e.target);

        // Player Controls
        root.getElementById('miniPlayBtn').onclick = () => this.togglePlayState();
        root.getElementById('closeDragBtn').onclick = () => this.close();
        root.getElementById('closeXBtn').onclick = () => this.close();
        root.getElementById('confirmSelectionBtn').onclick = () => this.confirmSelection();

        this.player.onended = () => this.updateIcons(false);

        window.addEventListener('popstate', () => {
            if (this.classList.contains('active')) {
                this.close();
            }
        });
    }

    // --- PUBLIC METHODS ---
    open() {
        this.classList.add('active');
        history.pushState({ modalOpen: true }, "", "");
        this.switchTab('For You', this.shadowRoot.getElementById('tabForYou'));
    }

    close() {
        this.classList.remove('active');
        this.player.pause();
        this.updateIcons(false);
        if (history.state && history.state.modalOpen) {
            history.back();
        }
    }

    confirmSelection() {
        if (this.currentSongData) {
            // Track selection as high interest (Artist + Genre)
            this.DB.trackInteraction(this.currentSongData, 5); 
            this.dispatchEvent(new CustomEvent('song-selected', { 
                detail: this.currentSongData,
                bubbles: true,
                composed: true
            }));
            this.close();
        }
    }

    // --- 🧠 SMART LOGIC & CACHING ---
    async switchTab(name, btn) {
        this.activeTab = name;
        this.shadowRoot.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.searchInput.value = ''; 

        if (name === 'Saved') {
            const s = this.DB.getSaved();
            this.DB.addToGlobal(s);
            if(s.length === 0) this.list.innerHTML = `<div class="text-center">No saved songs yet.</div>`;
            else this.renderList(s);
            return;
        }

        // --- 🤖 RECOMMENDATION LOGIC ---
        let query = "Global Top 100";
        let cacheKey = 'trending';

        if (name === 'For You') {
            cacheKey = 'foryou';
            // Get smart recommendation based on Artist OR Genre
            const smartQuery = this.DB.getRecommendationQuery();
            
            if (smartQuery) {
                query = smartQuery;
            } else {
                query = "Tamil Top Hits"; // Fallback for new users
            }
        }

        // 1. Check Local Cache
        const cachedData = this.DB.getCache(cacheKey);
        
        // If For You, we generally want fresh suggestions, but cache acts as fallback
        if (cachedData && cachedData.length > 0 && name !== 'For You') { 
            this.renderList(cachedData); 
        } else {
            this.renderSkeletonLoading();
            // Pass 'true' for isRecommendation if tab is For You
            this.loadData(query, false, cacheKey, name === 'For You');
        }
    }

    renderSkeletonLoading() {
        let html = '';
        for(let i=0; i<6; i++) {
            html += `
            <div class="loading-skeleton">
                <div class="sk-img"></div>
                <div class="sk-text-col">
                    <div class="sk-line" style="width: 70%"></div>
                    <div class="sk-line" style="width: 40%"></div>
                </div>
            </div>`;
        }
        this.list.innerHTML = html;
    }

    async loadData(query, silent = false, cacheKey = null, isRecommendation = false) {
        const targetUrl = `${this.API_URL}?term=${encodeURIComponent(query)}&country=IN&entity=song&limit=40`;
        
        const fetchWithProxy = async (proxyUrl) => {
            const res = await fetch(proxyUrl + encodeURIComponent(targetUrl));
            if (!res.ok) throw new Error('Proxy failed');
            return res.json();
        };

        try {
            const data = await Promise.any(this.PROXIES.map(p => fetchWithProxy(p)));
            
            if(data.results && data.results.length > 0) {
                let results = data.results;
                this.DB.addToGlobal(results);
                
                // --- 🤖 FILTERING LOGIC ---
                if (isRecommendation) {
                    // Filter out songs already saved to avoid "Same suggestions"
                    const savedIds = this.DB.getSaved().map(s => s.trackId);
                    results = results.filter(s => !savedIds.includes(s.trackId));
                    
                    // Shuffle results slightly for variety
                    results = results.sort(() => Math.random() - 0.5);
                }

                this.currentView = results;

                if (cacheKey && cacheKey !== 'search' && !isRecommendation) {
                    this.DB.setCache(cacheKey, results);
                }

                this.renderList(results);
                
                // NOTE: Removed search tracking point logic as requested to prevent letter-by-letter spam

            } else {
                if(!silent) this.list.innerHTML = `<div class="text-center">No results found.</div>`;
            }
        } catch (error) {
            console.error("All proxies failed", error);
            if (!silent) {
                this.list.innerHTML = `<div class="text-center" style="color: #ff453a;">Network Error. Please try again.</div>`;
            }
        }
    }

    renderList(songs) {
        this.list.innerHTML = '';
        const savedIds = this.DB.getSaved().map(s => s.trackId);
        
        const fragment = document.createDocumentFragment();

        songs.forEach(song => {
            const isSaved = savedIds.includes(song.trackId);
            const art = song.artworkUrl100.replace('100x100bb', '300x300bb');
            
            const item = document.createElement('div');
            item.className = 'song-row';
            
            const bookmarkIcon = isSaved 
                ? `<svg viewBox="0 0 24 24" style="fill: #0a84ff"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>` 
                : `<svg viewBox="0 0 24 24" style="fill:none; stroke:#8e8e93; stroke-width:2;"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;

            item.innerHTML = `
                <div class="song-info">
                    <img src="${art}" class="song-art" loading="lazy"> <div class="song-text">
                        <span class="song-title">${song.trackName}</span>
                        <span class="song-artist">${song.artistName}</span>
                    </div>
                </div>
                <button class="bookmark-btn" data-id="${song.trackId}">
                    ${bookmarkIcon}
                </button>
            `;
            
            item.querySelector('.song-info').onclick = () => this.playTrack(song);
            item.querySelector('.bookmark-btn').onclick = (e) => this.toggleSave(song.trackId, e, item);
            
            fragment.appendChild(item);
        });
        
        this.list.appendChild(fragment);
    }

    toggleSave(id, e, row) {
        e.stopPropagation();
        let saved = this.DB.getSaved();
        const index = saved.findIndex(s => s.trackId === id);
        
        if (index > -1) {
            saved.splice(index, 1);
        } else {
            const song = this.DB.globalCache[id] || this.currentView.find(s => s.trackId === id);
            if(song) {
                saved.push(song);
                // --- 🤖 ML: Saving is a strong signal (Artist + Genre) ---
                this.DB.trackInteraction(song, 10);
            }
        }
        
        this.DB.setSaved(saved);
        
        if (this.activeTab === 'Saved') {
            this.renderList(saved);
        } else {
            const btn = row.querySelector('.bookmark-btn');
            const isSaved = index === -1; 
            btn.innerHTML = isSaved 
                ? `<svg viewBox="0 0 24 24" style="fill: #0a84ff"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`
                : `<svg viewBox="0 0 24 24" style="fill:none; stroke:#8e8e93; stroke-width:2;"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
        }
    }

    playTrack(song) {
        this.currentSongData = song;
        const art = song.artworkUrl100.replace('100x100bb', '600x600bb');
        const root = this.shadowRoot;

        root.getElementById('mImg').src = art;
        root.getElementById('mTitle').innerText = song.trackName;
        root.getElementById('mArtist').innerText = song.artistName;
        
        // --- 🤖 ML: Playing is a moderate signal (Artist + Genre) ---
        this.DB.trackInteraction(song, 3);
        
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
}

customElements.define('song-picker', SongPicker);
