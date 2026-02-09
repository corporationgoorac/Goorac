
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
            :host {
                --bg-color: #000000;
                --surface-color: #121212;
                --surface-highlight: #1c1c1e;
                --accent-color: #0a84ff;
                --text-primary: #ffffff;
                --text-secondary: #a1a1a6;
                --border-color: #262629;
                --safe-area-top: env(safe-area-inset-top, 20px);
                --safe-area-bottom: env(safe-area-inset-bottom, 20px);
            }

            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; -webkit-tap-highlight-color: transparent; }
            
            :host {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 9999; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end;
                color: var(--text-primary);
            }
            
            :host(.active) { pointer-events: auto; background-color: var(--bg-color); transition: opacity 0.3s ease; }

            .picker-container {
                background-color: var(--bg-color); height: 100%; width: 100%;
                margin: 0 auto; overflow: hidden; display: flex; flex-direction: column;
                transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            
            @media (min-width: 600px) {
                .picker-container { max-width: 500px; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color); }
            }

            :host(.active) .picker-container { transform: translateY(0); }

            /* HEADER */
            .header-area { 
                padding: calc(15px + var(--safe-area-top)) 20px 15px 20px;
                background: var(--bg-color); z-index: 40; border-bottom: 1px solid var(--border-color);
            }
            
            .drag-handle-area { width: 100%; display: flex; justify-content: center; padding-bottom: 15px; cursor: pointer; }
            .drag-handle { width: 36px; height: 4px; background: #333; border-radius: 10px; }

            .search-box { 
                background-color: var(--surface-highlight); border-radius: 12px; padding: 12px 14px; 
                display: flex; align-items: center; margin-bottom: 15px; border: 1px solid transparent;
            }
            .search-box:focus-within { border-color: var(--accent-color); }
            
            .search-input { 
                background: transparent; border: none; outline: none; color: white; 
                width: 100%; font-size: 16px; margin-left: 10px;
            }

            .tabs { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
            .tabs::-webkit-scrollbar { display: none; }
            
            .pill-tab { 
                background: #1c1c1e; border: none; border-radius: 8px; padding: 8px 20px; 
                font-weight: 600; font-size: 13px; color: var(--text-secondary); cursor: pointer;
            }
            .pill-tab.active { background-color: var(--text-primary); color: #000; }

            /* LIST */
            .scroll-container { 
                flex: 1; overflow-y: auto; padding: 10px 20px calc(110px + var(--safe-area-bottom)) 20px; 
                scrollbar-width: none; 
            }
            .scroll-container::-webkit-scrollbar { display: none; }

            .song-row { 
                display: flex; justify-content: space-between; align-items: center; 
                padding: 14px 0; border-bottom: 1px solid #111;
            }
            .song-row:active { opacity: 0.6; }

            .song-info { display: flex; align-items: center; gap: 14px; overflow: hidden; flex: 1; cursor: pointer; }
            .song-art { width: 52px; height: 52px; border-radius: 4px; object-fit: cover; background: #1c1c1e; }
            .song-text { display: flex; flex-direction: column; overflow: hidden; }
            .song-title { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
            .song-artist { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

            .bookmark-btn { background: none; border: none; padding: 8px; cursor: pointer; }

            /* MINI PLAYER */
            .mini-player {
                position: absolute; bottom: 0; left: 0; right: 0; z-index: 50;
                background: #111; border-top: 1px solid var(--border-color); 
                padding: 12px 20px calc(12px + var(--safe-area-bottom)) 20px;
                display: flex; align-items: center; justify-content: space-between;
                transform: translateY(110%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .mini-player.show { transform: translateY(0); }

            .controls { display: flex; align-items: center; gap: 15px; }
            .icon-btn { background: none; border: none; cursor: pointer; color: white; padding: 5px; }
            .select-btn {
                width: 42px; height: 42px; background: var(--text-primary); border-radius: 50%; 
                display: flex; align-items: center; justify-content: center; cursor: pointer; border: none;
            }

            /* UTILS */
            .loading-skeleton { display: flex; align-items: center; gap: 14px; padding: 12px 0; }
            .sk-img { width: 52px; height: 52px; border-radius: 4px; background: #1c1c1e; animation: pulse 1.5s infinite; }
            .sk-text-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
            .sk-line { height: 12px; border-radius: 4px; background: #1c1c1e; animation: pulse 1.5s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }

            svg { fill: currentColor; width: 22px; height: 22px; }
            .text-gray svg { fill: #555; width: 18px; height: 18px; }
            .select-btn svg { fill: black; }
            .text-center { text-align: center; color: var(--text-secondary); padding: 50px 20px; }
        </style>

        <div class="picker-container" id="mainContainer">
            <div class="header-area">
                <div class="drag-handle-area" id="closeDragBtn"><div class="drag-handle"></div></div>
                <div class="search-box">
                    <span class="text-gray"><svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></span>
                    <input type="text" id="searchInput" class="search-input" placeholder="Search music..." autocomplete="off">
                </div>
                <div class="tabs">
                    <button id="tabForYou" class="pill-tab active">For You</button>
                    <button id="tabTrending" class="pill-tab">Trending</button>
                    <button id="tabSaved" class="pill-tab">Saved</button>
                </div>
            </div>

            <div class="scroll-container" id="songList"></div>

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
        this.API_URL = "https://itunes.apple.com/search";
        this.PROXIES = ["https://api.allorigins.win/raw?url=", "https://corsproxy.io/?", "https://api.codetabs.com/v1/proxy?quest="];
        
        this.DB = {
            getSaved: () => JSON.parse(localStorage.getItem('m_saved')) || [],
            setSaved: (val) => localStorage.setItem('m_saved', JSON.stringify(val)),
            getProfile: () => JSON.parse(localStorage.getItem('m_user_profile')) || { artists: {}, genres: {}, history: [] },
            setProfile: (val) => localStorage.setItem('m_user_profile', JSON.stringify(val)),
            
            track: (song, weight) => {
                if(!song) return;
                const p = this.DB.getProfile();
                const artist = song.artistName?.split(',')[0].trim();
                const genre = song.primaryGenreName;

                if (artist) p.artists[artist] = (p.artists[artist] || 0) + weight;
                if (genre) p.genres[genre] = (p.genres[genre] || 0) + weight;
                
                // Add to history if it's a play/save
                if(weight >= 3) {
                    p.history = [song, ...p.history.filter(s => s.trackId !== song.trackId)].slice(0, 30);
                }
                this.DB.setProfile(p);
            },

            getRecommendationQuery: () => {
                const p = this.DB.getProfile();
                const sortKeys = (obj) => Object.entries(obj).sort((a,b) => b[1] - a[1]).map(e => e[0]);
                const topArtists = sortKeys(p.artists);
                const topGenres = sortKeys(p.genres);

                if (Math.random() > 0.4 && topArtists.length > 0) {
                    return topArtists[Math.floor(Math.random() * Math.min(topArtists.length, 3))];
                } else if (topGenres.length > 0) {
                    return topGenres[0] + " songs";
                }
                return "Global Hits";
            }
        };

        this.player = root.getElementById('player');
        this.list = root.getElementById('songList');
        this.searchInput = root.getElementById('searchInput');

        let searchTimer;
        this.searchInput.oninput = (e) => {
            clearTimeout(searchTimer);
            const val = e.target.value.trim();
            if (val.length > 1) {
                this.renderSkeleton();
                searchTimer = setTimeout(() => this.loadData(val), 500);
            } else if (val === "") this.switchTab('For You', root.getElementById('tabForYou'));
        };

        root.getElementById('tabForYou').onclick = (e) => this.switchTab('For You', e.target);
        root.getElementById('tabTrending').onclick = (e) => this.switchTab('Trending', e.target);
        root.getElementById('tabSaved').onclick = (e) => this.switchTab('Saved', e.target);
        root.getElementById('miniPlayBtn').onclick = () => this.togglePlay();
        root.getElementById('closeDragBtn').onclick = () => this.close();
        root.getElementById('confirmSelectionBtn').onclick = () => this.confirm();

        this.player.onended = () => this.updatePlayIcon(false);
    }

    open() {
        this.classList.add('active');
        history.pushState({ modal: true }, "");
        this.switchTab('For You', this.shadowRoot.getElementById('tabForYou'));
    }

    close() {
        this.classList.remove('active');
        this.player.pause();
        if (history.state?.modal) history.back();
    }

    confirm() {
        if (this.currentSong) {
            this.DB.track(this.currentSong, 5);
            this.dispatchEvent(new CustomEvent('song-selected', { detail: this.currentSong, bubbles: true, composed: true }));
            this.close();
        }
    }

    async switchTab(name, btn) {
        this.shadowRoot.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.searchInput.value = '';

        if (name === 'Saved') {
            const saved = this.DB.getSaved();
            saved.length ? this.renderList(saved) : this.list.innerHTML = `<div class="text-center">No saved tracks.</div>`;
            return;
        }

        this.renderSkeleton();
        const query = (name === 'For You') ? this.DB.getRecommendationQuery() : "Popular Music 2026";
        this.loadData(query, name === 'For You');
    }

    async loadData(query, isRec = false) {
        const url = `${this.API_URL}?term=${encodeURIComponent(query)}&country=IN&entity=song&limit=40`;
        try {
            const data = await Promise.any(this.PROXIES.map(p => fetch(p + encodeURIComponent(url)).then(r => r.json())));
            let results = data.results || [];
            if(isRec) results = results.sort(() => Math.random() - 0.5);
            this.currentResults = results;
            this.renderList(results);
        } catch (e) {
            this.list.innerHTML = `<div class="text-center">Connection error.</div>`;
        }
    }

    renderList(songs) {
        this.list.innerHTML = '';
        const savedIds = new Set(this.DB.getSaved().map(s => s.trackId));
        songs.forEach(song => {
            const row = document.createElement('div');
            row.className = 'song-row';
            const isSaved = savedIds.has(song.trackId);
            row.innerHTML = `
                <div class="song-info">
                    <img src="${song.artworkUrl100}" class="song-art">
                    <div class="song-text">
                        <span class="song-title">${song.trackName}</span>
                        <span class="song-artist">${song.artistName}</span>
                    </div>
                </div>
                <button class="bookmark-btn">
                    <svg style="fill: ${isSaved ? '#0a84ff' : 'none'}; stroke: ${isSaved ? '#0a84ff' : '#555'}; stroke-width: 2;">
                        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                </button>`;
            row.querySelector('.song-info').onclick = () => this.play(song);
            row.querySelector('.bookmark-btn').onclick = () => this.toggleSave(song);
            this.list.appendChild(row);
        });
    }

    toggleSave(song) {
        let saved = this.DB.getSaved();
        const idx = saved.findIndex(s => s.trackId === song.trackId);
        if (idx > -1) saved.splice(idx, 1);
        else { saved.push(song); this.DB.track(song, 10); }
        this.DB.setSaved(saved);
        this.renderList(this.currentResults || saved);
    }

    play(song) {
        this.currentSong = song;
        const root = this.shadowRoot;
        root.getElementById('mImg').src = song.artworkUrl100;
        root.getElementById('mTitle').textContent = song.trackName;
        root.getElementById('mArtist').textContent = song.artistName;
        this.player.src = song.previewUrl;
        this.player.play();
        this.DB.track(song, 3);
        root.getElementById('miniPlayer').classList.add('show');
        this.updatePlayIcon(true);
    }

    togglePlay() {
        this.player.paused ? this.player.play() : this.player.pause();
        this.updatePlayIcon(!this.player.paused);
    }

    updatePlayIcon(playing) {
        const root = this.shadowRoot;
        root.getElementById('playIcon').style.display = playing ? 'none' : 'block';
        root.getElementById('pauseIcon').style.display = playing ? 'block' : 'none';
    }

    renderSkeleton() {
        let h = '';
        for(let i=0; i<8; i++) h += `<div class="loading-skeleton"><div class="sk-img"></div><div class="sk-text-col"><div class="sk-line" style="width:60%"></div><div class="sk-line" style="width:30%"></div></div></div>`;
        this.list.innerHTML = h;
    }
}
customElements.define('song-picker', SongPicker);
