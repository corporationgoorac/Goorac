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
                --bg-color: #000000;
                --surface-glass: rgba(20, 20, 20, 0.85); /* Modern Glass Effect */
                --surface-highlight: #2c2c2e;
                --accent-color: #0a84ff;
                --accent-gradient: linear-gradient(135deg, #0a84ff, #5ac8fa);
                --text-primary: #ffffff;
                --text-secondary: #a1a1a6;
                --border-color: rgba(255, 255, 255, 0.1);
                --safe-area-top: env(safe-area-inset-top, 20px);
                --safe-area-bottom: env(safe-area-inset-bottom, 20px);
            }

            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif; -webkit-tap-highlight-color: transparent; }
            
            :host {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 9999; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end;
                color: var(--text-primary); font-size: 14px;
            }
            
            :host(.active) { 
                pointer-events: auto; 
                background-color: rgba(0,0,0,0.6); 
                backdrop-filter: blur(5px);
                transition: opacity 0.3s ease;
            }

            .picker-container {
                background-color: var(--bg-color); 
                height: 100%; width: 100%;
                margin: 0 auto;
                border-radius: 0;
                overflow: hidden; display: flex; flex-direction: column;
                transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                position: relative;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
            }
            
            @media (min-width: 600px) {
                .picker-container { max-width: 500px; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color); }
            }

            :host(.active) .picker-container { transform: translateY(0); }

            /* --- 2. HEADER SECTION (Glassmorphism) --- */
            .header-area { 
                padding: calc(20px + var(--safe-area-top)) 20px 16px 20px;
                background: var(--surface-glass);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                z-index: 40; 
                border-bottom: 1px solid var(--border-color); 
                position: relative; 
                flex-shrink: 0;
            }
            
            .drag-handle-area { width: 100%; display: flex; justify-content: center; padding-bottom: 20px; cursor: pointer; }
            .drag-handle { width: 40px; height: 5px; background: rgba(255,255,255,0.3); border-radius: 10px; }

            /* Modern iOS Style Search */
            .search-box { 
                background-color: rgba(118, 118, 128, 0.24); border-radius: 12px; padding: 10px 14px; 
                display: flex; align-items: center; margin-bottom: 16px;
                border: 1px solid transparent; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .search-box:focus-within { 
                background-color: #1c1c1e; 
                border-color: var(--accent-color); 
                box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.3);
            }
            
            .search-input { 
                background: transparent; border: none; outline: none; color: white; 
                width: 100%; font-size: 16px; margin-left: 10px; font-weight: 400;
                letter-spacing: 0.3px;
            }
            .search-input::placeholder { color: #8e8e93; }

            /* Tabs */
            .tabs { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
            .tabs::-webkit-scrollbar { display: none; }
            
            .pill-tab { 
                background: transparent; border: 1px solid var(--border-color); 
                border-radius: 20px; padding: 8px 16px; 
                font-weight: 600; font-size: 13px; color: var(--text-secondary); 
                transition: all 0.3s; white-space: nowrap; cursor: pointer; flex-shrink: 0;
            }
            .pill-tab.active { 
                background: var(--text-primary); 
                color: #000; 
                border-color: var(--text-primary);
                transform: scale(1.02);
            }

            /* --- 3. SONG LIST --- */
            .scroll-container { 
                flex: 1; overflow-y: auto; 
                padding: 10px 20px calc(100px + var(--safe-area-bottom)) 20px; 
                scrollbar-width: none; 
            }
            .scroll-container::-webkit-scrollbar { display: none; }

            .section-title {
                font-size: 20px; font-weight: 700; color: var(--text-primary);
                margin: 20px 0 10px 0; letter-spacing: 0.5px;
            }

            .song-row { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; 
                transition: background 0.2s, transform 0.1s;
                border-radius: 8px;
            }
            .song-row:hover { background: rgba(255,255,255,0.03); }
            .song-row:active { transform: scale(0.98); opacity: 0.8; }

            .song-info { display: flex; align-items: center; gap: 16px; overflow: hidden; flex: 1; }
            .song-art { 
                width: 56px; height: 56px; border-radius: 8px; object-fit: cover; 
                background: #1c1c1e; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            }
            .song-text { display: flex; flex-direction: column; overflow: hidden; gap: 4px; }
            .song-title { font-size: 16px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
            .song-artist { font-size: 14px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            .bookmark-btn { 
                background: none; border: none; padding: 12px; cursor: pointer; 
                display: flex; align-items: center; transition: transform 0.2s; opacity: 0.7;
            }
            .bookmark-btn:active { transform: scale(1.2); }
            .song-row:hover .bookmark-btn { opacity: 1; }

            /* --- 4. MINI PLAYER (Glassmorphism) --- */
            .mini-player {
                position: absolute; bottom: 0; left: 0; right: 0; z-index: 50;
                background: var(--surface-glass);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-top: 1px solid var(--border-color); 
                padding: 12px 20px calc(16px + var(--safe-area-bottom)) 20px;
                display: flex; align-items: center; justify-content: space-between;
                transform: translateY(110%); transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
            }
            .mini-player.show { transform: translateY(0); }

            .controls { display: flex; align-items: center; gap: 24px; }
            
            .icon-btn { 
                background: none; border: none; cursor: pointer; display: flex; align-items: center; 
                padding: 8px; color: white; transition: opacity 0.2s;
            }
            .icon-btn:active { opacity: 0.5; }
            
            .select-btn {
                width: 44px; height: 44px; background: var(--text-primary); border-radius: 50%; border: none;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2); transition: transform 0.2s;
            }
            .select-btn:active { transform: scale(0.9); }

            /* --- 5. LOADING SKELETON --- */
            .loading-skeleton { display: flex; align-items: center; gap: 14px; padding: 12px 0; }
            .sk-img { width: 54px; height: 54px; border-radius: 8px; background: #1c1c1e; animation: pulse 1.5s infinite; }
            .sk-text-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
            .sk-line { height: 12px; border-radius: 4px; background: #1c1c1e; animation: pulse 1.5s infinite; }
            
            @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 0.6; } 100% { opacity: 0.3; } }

            svg { fill: currentColor; width: 24px; height: 24px; }
            .text-gray svg { fill: #8e8e93; width: 20px; height: 20px; }
            .select-btn svg { fill: black; width: 22px; height: 22px; }
            
            .text-center { text-align: center; color: var(--text-secondary); padding: 60px 20px; font-size: 15px; font-weight: 500; }
            
            /* Dynamic Greeting Styles */
            .greeting { font-size: 13px; color: var(--accent-color); font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
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
                    <input type="text" id="searchInput" class="search-input" placeholder="Search artists, songs, lyrics..." autocomplete="off">
                </div>

                <div class="tabs">
                    <button id="tabForYou" class="pill-tab active">For You</button>
                    <button id="tabTrending" class="pill-tab">Charts</button>
                    <button id="tabSaved" class="pill-tab">Library</button>
                </div>
            </div>

            <div class="scroll-container" id="songList">
                <div id="statusMsg" class="text-center">Start typing to search...</div>
            </div>

            <div id="miniPlayer" class="mini-player">
                <div class="song-info" id="miniInfoArea">
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
        
        // --- CONFIGURATION ---
        this.API_URL = "https://itunes.apple.com/search";
        this.PAGE_SIZE = 20; // Load 20 at a time
        this.MAX_LIMIT = 200; // Fetch maximum 200
        this.PROXIES = [
            "https://api.allorigins.win/raw?url=",
            "https://corsproxy.io/?",
            "https://api.codetabs.com/v1/proxy?quest="
        ];
        
        // --- STATE VARIABLES ---
        this.allFetchedSongs = []; // Store the full 200 list here
        this.renderedCount = 0; // Keep track of how many are on screen
        this.isLoadingMore = false; // Debounce scroll events
        
        this.DB = {
            getSaved: () => JSON.parse(localStorage.getItem('insta_saved')) || [],
            setSaved: (data) => localStorage.setItem('insta_saved', JSON.stringify(data)),
            
            getCache: (key) => JSON.parse(localStorage.getItem('picker_cache_' + key)) || null,
            setCache: (key, data) => localStorage.setItem('picker_cache_' + key, JSON.stringify(data)),
            
            globalCache: {}, 
            addToGlobal: (songs) => songs.forEach(s => this.DB.globalCache[s.trackId] = s),

            // Real-time History tracking (Most Watched)
            getHistory: () => JSON.parse(localStorage.getItem('picker_history')) || [],
            addToHistory: (song) => {
                let history = this.DB.getHistory();
                history = history.filter(s => s.trackId !== song.trackId);
                history.unshift(song);
                localStorage.setItem('picker_history', JSON.stringify(history.slice(0, 50)));
            },

            // --- UPGRADED ML PROFILE STORAGE (V5) ---
            getUserProfile: () => JSON.parse(localStorage.getItem('picker_user_profile_v5')) || { 
                artists: {}, 
                genres: {},
                timeContext: {}, // Tracks what genre is played at what hour (0-23)
                explicitPref: false // Tracks if user clicks explicit songs
            },
            setUserProfile: (data) => localStorage.setItem('picker_user_profile_v5', JSON.stringify(data)),

            // --- ADVANCED WEIGHTING SYSTEM ---
            trackInteraction: (song, weight) => {
                if(!song) return;
                const profile = this.DB.getUserProfile();
                const currentHour = new Date().getHours();
                
                // Artist Weighting
                const artistName = song.artistName ? song.artistName.split(',')[0].trim() : null;
                if (artistName) {
                    profile.artists[artistName] = (profile.artists[artistName] || 0) + weight;
                }

                // Genre Weighting & Time Context
                const genre = song.primaryGenreName;
                if (genre) {
                    profile.genres[genre] = (profile.genres[genre] || 0) + weight;
                    // Track time-of-day preference (e.g., Morning Jazz vs Night Pop)
                    if(!profile.timeContext[currentHour]) profile.timeContext[currentHour] = {};
                    profile.timeContext[currentHour][genre] = (profile.timeContext[currentHour][genre] || 0) + weight;
                }

                this.DB.setUserProfile(profile);
            },

            // --- INTELLIGENT SUGGESTION ENGINE ---
            getRecommendationQuery: () => {
                const profile = this.DB.getUserProfile();
                const history = this.DB.getHistory();
                const currentHour = new Date().getHours();
                
                const getTop = (obj) => Object.entries(obj).sort(([,a], [,b]) => b - a).map(([k]) => k);
                
                const topArtists = getTop(profile.artists);
                const topGenres = getTop(profile.genres);
                
                // Get top genre for THIS specific time of day (e.g., Morning vs Night)
                const timeSpecificGenres = profile.timeContext[currentHour] ? getTop(profile.timeContext[currentHour]) : [];

                const dice = Math.random();
                let query = "";
                let reason = "Top Hits";

                // ML Strategy:
                // 1. Time Relevance (30%)
                if (dice < 0.3 && timeSpecificGenres.length > 0) {
                    query = timeSpecificGenres[0] + " hits";
                    reason = getTimeGreeting() + " • " + timeSpecificGenres[0];
                } 
                // 2. Artist Affinity (30%)
                else if (dice < 0.6 && topArtists.length > 0) {
                    const artist = topArtists[Math.floor(Math.random() * Math.min(topArtists.length, 3))];
                    query = "Best of " + artist;
                    reason = "Because you like " + artist;
                } 
                // 3. Genre Affinity (20%)
                else if (dice < 0.8 && topGenres.length > 0) {
                    const genre = topGenres[0];
                    query = "Best " + genre + " songs";
                    reason = "Your favorite: " + genre;
                } 
                // 4. History (20%)
                else if (history.length > 0) {
                    query = history[0].artistName;
                    reason = "Jump back in";
                } 
                else {
                    query = "Global Top 100";
                    reason = "Global Trends";
                }
                
                return { query, reason };
            }
        };

        // Helper for Time Greeting
        const getTimeGreeting = () => {
            const h = new Date().getHours();
            if (h < 12) return "Good Morning";
            if (h < 18) return "Good Afternoon";
            return "Good Evening";
        };

        this.currentView = [];
        this.activeTab = 'For You';
        this.currentSongData = null; 

        this.player = root.getElementById('player');
        this.list = root.getElementById('songList');
        this.status = root.getElementById('statusMsg');
        this.searchInput = root.getElementById('searchInput');

        // --- INFINITE SCROLL LISTENER ---
        this.list.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.list;
            // Load more when user is 50px from bottom
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                this.loadMoreItems();
            }
        });

        let searchTimer;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            let val = e.target.value.trim();
            
            // Fuzzy/Spelling Prep: Remove double spaces, weird chars
            val = val.replace(/\s+/g, ' ').replace(/[^\w\s]/gi, '');

            if (val.length > 1) { 
                this.renderSkeletonLoading();
                searchTimer = setTimeout(() => {
                    // ML: Searching for something gives it weight (1 point)
                    this.loadData(val, false, 'search', false);
                }, 500); 
            } else if(val.length === 0) {
                this.switchTab('For You', root.getElementById('tabForYou'));
            }
        });

        root.getElementById('tabForYou').onclick = (e) => this.switchTab('For You', e.target);
        root.getElementById('tabTrending').onclick = (e) => this.switchTab('Trending', e.target);
        root.getElementById('tabSaved').onclick = (e) => this.switchTab('Saved', e.target);

        root.getElementById('miniPlayBtn').onclick = () => this.togglePlayState();
        root.getElementById('closeDragBtn').onclick = () => this.close();
        root.getElementById('confirmSelectionBtn').onclick = () => this.confirmSelection();

        this.player.onended = () => this.updateIcons(false);

        window.addEventListener('popstate', () => {
            if (this.classList.contains('active')) this.close();
        });
    }

    open() {
        this.classList.add('active');
        history.pushState({ modalOpen: true }, "", "");
        this.switchTab('For You', this.shadowRoot.getElementById('tabForYou'));
    }

    close() {
        this.classList.remove('active');
        this.player.pause();
        this.updateIcons(false);
        if (history.state && history.state.modalOpen) history.back();
    }

    confirmSelection() {
        if (this.currentSongData) {
            this.DB.trackInteraction(this.currentSongData, 15); // Selection is strong signal (15 pts)
            this.dispatchEvent(new CustomEvent('song-selected', { 
                detail: this.currentSongData,
                bubbles: true,
                composed: true
            }));
            this.close();
        }
    }

    async switchTab(name, btn) {
        this.activeTab = name;
        this.shadowRoot.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.searchInput.value = ''; 

        if (name === 'Saved') {
            const s = this.DB.getSaved();
            this.DB.addToGlobal(s);
            // Saved tab doesn't need infinite scroll from API, just render all
            if(s.length === 0) this.list.innerHTML = `<div class="text-center">No bookmarks found.<br>Save songs to see them here.</div>`;
            else {
                this.allFetchedSongs = s;
                this.renderInitialList(s, "Your Library");
            }
            return;
        }

        let query = "Global Top 100";
        let cacheKey = 'trending';
        let subHeading = "Trending Now";

        if (name === 'For You') {
            cacheKey = 'foryou';
            const rec = this.DB.getRecommendationQuery();
            query = rec.query;
            subHeading = rec.reason;
        }

        const cachedData = this.DB.getCache(cacheKey);
        
        // ML: Force refresh For You every time to keep it dynamic based on new watches
        if (cachedData && cachedData.length > 0 && name !== 'For You') { 
            this.allFetchedSongs = cachedData;
            this.renderInitialList(cachedData, subHeading); 
        } else {
            this.renderSkeletonLoading();
            this.loadData(query, false, cacheKey, name === 'For You', subHeading);
        }
    }

    renderSkeletonLoading() {
        let html = '';
        for(let i=0; i<8; i++) {
            html += `
            <div class="loading-skeleton">
                <div class="sk-img"></div>
                <div class="sk-text-col">
                    <div class="sk-line" style="width: 60%"></div>
                    <div class="sk-line" style="width: 35%"></div>
                </div>
            </div>`;
        }
        this.list.innerHTML = html;
    }

    async loadData(query, silent = false, cacheKey = null, isRecommendation = false, subHeadingTitle = "") {
        // --- UPDATED: FETCH MAX 200 SONGS ---
        const targetUrl = `${this.API_URL}?term=${encodeURIComponent(query)}&country=IN&entity=song&limit=${this.MAX_LIMIT}`;
        
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
                
                if (isRecommendation) {
                    const savedIds = this.DB.getSaved().map(s => s.trackId);
                    // Filter out already saved from For You to keep it fresh
                    results = results.filter(s => !savedIds.includes(s.trackId));
                    // Shuffle logic for freshness
                    results = results.sort(() => Math.random() - 0.5);
                }

                this.allFetchedSongs = results; // Store full 200 list
                
                if (cacheKey && cacheKey !== 'search' && !isRecommendation) {
                    this.DB.setCache(cacheKey, results);
                }
                
                // Render only the first batch (20)
                this.renderInitialList(results, subHeadingTitle);

            } else {
                if(!silent) this.list.innerHTML = `<div class="text-center">No results found for "${query}"</div>`;
            }
        } catch (error) {
            if (!silent) this.list.innerHTML = `<div class="text-center" style="color: #ff453a;">Unable to connect to music service.</div>`;
        }
    }

    // --- NEW: LAZY LOADING LOGIC ---
    renderInitialList(songs, title) {
        this.list.innerHTML = ''; // Clear skeleton/previous
        
        // Add Dynamic Header based on ML Context
        if(title) {
            const header = document.createElement('div');
            header.innerHTML = `
                <div class="greeting">${title.split('•')[0]}</div>
                <div class="section-title">${title.includes('•') ? title.split('•')[1] : title}</div>
            `;
            this.list.appendChild(header);
        }

        this.renderedCount = 0;
        this.isLoadingMore = false;
        
        // Initial render of first batch
        this.appendBatch();
    }

    loadMoreItems() {
        if (this.isLoadingMore || this.renderedCount >= this.allFetchedSongs.length) return;
        this.isLoadingMore = true;
        
        // Simulate slight network delay for UX or just process
        requestAnimationFrame(() => {
            this.appendBatch();
            this.isLoadingMore = false;
        });
    }

    appendBatch() {
        const batch = this.allFetchedSongs.slice(this.renderedCount, this.renderedCount + this.PAGE_SIZE);
        if (batch.length === 0) return;

        this.renderItemsToDOM(batch);
        this.renderedCount += batch.length;
    }

    renderItemsToDOM(songs) {
        const savedIds = this.DB.getSaved().map(s => s.trackId);
        const fragment = document.createDocumentFragment();

        songs.forEach(song => {
            const isSaved = savedIds.includes(song.trackId);
            const art = song.artworkUrl100.replace('100x100bb', '300x300bb'); // Higher Quality
            
            const item = document.createElement('div');
            item.className = 'song-row';
            
            const bookmarkIcon = isSaved 
                ? `<svg viewBox="0 0 24 24" style="fill: #0a84ff"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>` 
                : `<svg viewBox="0 0 24 24" style="fill:none; stroke:rgba(255,255,255,0.6); stroke-width:2;"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;

            item.innerHTML = `
                <div class="song-info">
                    <img src="${art}" class="song-art" loading="lazy">
                    <div class="song-text">
                        <span class="song-title">${song.trackName}</span>
                        <span class="song-artist">${song.artistName}</span>
                    </div>
                </div>
                <button class="bookmark-btn" data-id="${song.trackId}">${bookmarkIcon}</button>
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
            const song = this.DB.globalCache[id] || this.allFetchedSongs.find(s => s.trackId === id);
            if(song) {
                saved.push(song);
                // ML: Saving a song is high weight interaction (10 pts)
                this.DB.trackInteraction(song, 10);
            }
        }
        
        this.DB.setSaved(saved);
        if (this.activeTab === 'Saved') {
            this.allFetchedSongs = saved; // Reset buffer for saved tab
            this.renderInitialList(saved, "Your Library");
        }
        else {
            const btn = row.querySelector('.bookmark-btn');
            btn.innerHTML = index === -1 
                ? `<svg viewBox="0 0 24 24" style="fill: #0a84ff"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`
                : `<svg viewBox="0 0 24 24" style="fill:none; stroke:rgba(255,255,255,0.6); stroke-width:2;"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
        }
    }

    playTrack(song) {
        this.currentSongData = song;
        const art = song.artworkUrl100.replace('100x100bb', '600x600bb');
        const root = this.shadowRoot;

        root.getElementById('mImg').src = art;
        root.getElementById('mTitle').innerText = song.trackName;
        root.getElementById('mArtist').innerText = song.artistName;
        
        // ML: Track play (3 pts) and add to History
        this.DB.trackInteraction(song, 3);
        this.DB.addToHistory(song); 
        
        this.player.src = song.previewUrl;
        this.player.play().catch(e => console.warn("Playback Error"));
        
        root.getElementById('miniPlayer').classList.add('show');
        this.updateIcons(true);
    }

    togglePlayState() {
        if (this.player.paused) { this.player.play(); this.updateIcons(true); } 
        else { this.player.pause(); this.updateIcons(false); }
    }

    updateIcons(isPlaying) {
        const root = this.shadowRoot;
        root.getElementById('playIcon').style.display = isPlaying ? 'none' : 'block';
        root.getElementById('pauseIcon').style.display = isPlaying ? 'block' : 'none';
    }
}

customElements.define('song-picker', SongPicker);
