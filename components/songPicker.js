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
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        
        <style>
            :root { --bg-black: #000000; --bg-dark-gray: #1c1c1e; --bg-pill: #2c2c2e; --text-gray: #98989d; }
            /* Overlay styles for the modal effect */
            :host {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                z-index: 9999; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end;
            }
            :host(.active) { pointer-events: auto; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); }
            
            /* Main container that slides up */
            .picker-container {
                background-color: var(--bg-black); height: 85vh; width: 100%;
                border-radius: 20px 20px 0 0; overflow: hidden; display: flex; flex-direction: column;
                transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                position: relative;
            }
            :host(.active) .picker-container { transform: translateY(0); }

            /* Drag Handle */
            .drag-handle { width: 40px; height: 5px; background: #3a3a3c; border-radius: 10px; margin: 10px auto 5px; }

            /* Original CSS */
            .search-box { background-color: var(--bg-pill); border-radius: 10px; padding: 10px 14px; }
            .search-input { background: transparent; border: none; outline: none; color: white; width: 100%; font-size: 17px; }

            .pill-tab { background-color: #262626; border-radius: 8px; padding: 6px 16px; font-weight: 600; font-size: 14px; color: #a8a8a8; transition: 0.2s; white-space: nowrap; }
            .pill-tab.active { background-color: #ffffff; color: #000000; }

            .song-row { padding: 12px 0; border-bottom: 0.5px solid #1c1c1e; transition: background 0.2s; }
            .song-row:active { background-color: #1a1a1a; }

            .mini-player { background-color: #121217; border-top: 1px solid #1c1c1e; padding: 10px 16px; box-shadow: 0 -4px 20px rgba(0,0,0,0.8); }
            .full-modal { transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateY(100%); }
            .full-modal.active { transform: translateY(0); }
            
            .hide-scroll::-webkit-scrollbar { display: none; }
        </style>

        <div class="picker-container" id="mainContainer">
            <div class="w-full flex justify-center pb-2 cursor-pointer" id="closeDragBtn">
                <div class="drag-handle"></div>
            </div>

            <div class="px-4 pt-2 bg-black z-40">
                <div class="search-box flex items-center mb-4">
                    <i class="fas fa-search text-[#98989d] mr-3"></i>
                    <input type="text" id="searchInput" class="search-input" placeholder="Search music">
                </div>

                <div class="flex gap-2 overflow-x-auto hide-scroll mb-2">
                    <button id="tabForYou" class="pill-tab active">For you</button>
                    <button id="tabTrending" class="pill-tab">Trending</button>
                    <button id="tabSaved" class="pill-tab">Saved</button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 pb-28 hide-scroll" id="scrollContainer">
                <div id="statusMsg" class="hidden py-4 text-center text-xs text-gray-500"></div>
                <div id="songList" class="flex flex-col"></div>
            </div>

            <div id="miniPlayer" class="mini-player fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between translate-y-full transition-transform" style="position: absolute;">
                <div class="flex items-center gap-3 overflow-hidden" id="miniInfoArea">
                    <img id="mImg" src="" class="w-10 h-10 rounded-md object-cover bg-gray-800">
                    <div class="flex flex-col overflow-hidden">
                        <span id="mTitle" class="text-sm font-bold truncate">Song Title</span>
                        <span id="mArtist" class="text-xs text-[#98989d] truncate">Artist Name</span>
                    </div>
                </div>
                <div class="flex items-center gap-5">
                    <button id="miniPlayBtn" class="text-white text-xl p-2">
                        <i id="playBtnIcon" class="fas fa-pause"></i>
                    </button>
                    <button id="confirmSelectionBtn" class="w-8 h-8 bg-[#0095f6] text-white rounded-full flex items-center justify-center shadow-lg transform active:scale-90 transition">
                        <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
            
            <div id="fullModal" class="full-modal fixed inset-0 bg-black z-[60] p-6 flex flex-col" style="position:absolute; height:100%;">
                <button id="closeFullModal" class="mb-4 text-left">
                    <i class="fas fa-chevron-down text-xl p-2"></i>
                </button>
                <div class="flex-1 flex flex-col items-center justify-center">
                    <img id="modalImg" src="" class="w-full aspect-square rounded-2xl shadow-2xl mb-10 object-cover bg-[#1c1c1e]">
                    <div class="w-full mb-8">
                        <h2 id="modalTitle" class="text-2xl font-bold truncate">Song Title</h2>
                        <p id="modalArtist" class="text-lg text-gray-500 truncate">Artist</p>
                    </div>
                    <div class="w-full bg-gray-800 h-1 rounded-full mb-10 relative overflow-hidden">
                        <div id="progressBar" class="h-full bg-white w-0 transition-all duration-300"></div>
                    </div>
                    <div class="flex items-center justify-between w-full px-10">
                        <i class="fas fa-backward text-2xl text-gray-500"></i>
                        <button id="modalPlayBtn" class="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center text-3xl shadow-lg active:scale-95 transition">
                            <i id="modalPlayIcon" class="fas fa-pause ml-1"></i>
                        </button>
                        <i class="fas fa-forward text-2xl text-gray-500"></i>
                    </div>
                    <button id="bigSelectBtn" class="mt-8 w-full bg-[#0095f6] text-white font-bold py-4 rounded-xl">
                        Select This Song
                    </button>
                </div>
            </div>
        </div>

        <audio id="player"></audio>
        `;
    }

    initLogic() {
        const root = this.shadowRoot;
        
        // --- DATA & STATE ---
        this.API_URL = "https://itunes.apple.com/search";
        this.PROXIES = [
            "https://api.codetabs.com/v1/proxy?quest=", 
            "https://api.allorigins.win/raw?url=",
            "https://corsproxy.io/?"
        ];
        
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
        this.currentSongData = null; // Store currently playing song for selection

        // --- DOM ELEMENTS ---
        this.player = root.getElementById('player');
        this.list = root.getElementById('songList');
        this.status = root.getElementById('statusMsg');
        this.searchInput = root.getElementById('searchInput');

        // --- EVENT LISTENERS ---
        
        // Search
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
        root.getElementById('modalPlayBtn').onclick = () => this.togglePlayState();
        
        // Expand/Close Modal
        root.getElementById('miniInfoArea').onclick = () => this.showFullModal();
        root.getElementById('closeFullModal').onclick = () => this.hideFullModal();
        
        // Drag/Close Picker
        root.getElementById('closeDragBtn').onclick = () => this.close();

        // SELECTION LOGIC (The Arrow)
        root.getElementById('confirmSelectionBtn').onclick = () => this.confirmSelection();
        root.getElementById('bigSelectBtn').onclick = () => this.confirmSelection();

        // Audio Events
        this.player.ontimeupdate = () => this.onUpdate();
        this.player.onended = () => this.updateIcons(false);

        // Init
        this.loadSmartForYou();
    }

    // --- PUBLIC METHODS ---
    open() {
        this.classList.add('active');
        this.loadSmartForYou(); // Refresh list on open
    }

    close() {
        this.classList.remove('active');
        this.player.pause(); // Stop music when closing
    }

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

    // --- LOGIC FROM ORIGINAL ---
    loadSmartForYou() {
        this.status.classList.add('hidden');
        this.loadData("Tamil Top Hits"); 
    }

    async loadData(query, silent = false) {
        if(!silent) this.list.innerHTML = `<div class="py-10 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading...</div>`;
        
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
            this.list.innerHTML = `<div class="py-10 text-center text-red-400 text-xs">Network Error. Retry?</div>`;
        }
    }

    renderList(songs) {
        this.list.innerHTML = '';
        const savedIds = this.DB.getSaved().map(s => s.trackId);

        songs.forEach(song => {
            const isSaved = savedIds.includes(song.trackId);
            const art = song.artworkUrl100.replace('100x100bb', '300x300bb');
            
            const item = document.createElement('div');
            item.className = 'song-row flex items-center justify-between cursor-pointer';
            item.onclick = (e) => {
                if (e.target.closest('.bookmark-btn')) return;
                this.playTrack(song);
            };

            item.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    <img src="${art}" class="w-12 h-12 rounded-md object-cover bg-[#1c1c1e]">
                    <div class="flex flex-col overflow-hidden">
                        <span class="text-[15px] font-semibold truncate text-white">${song.trackName}</span>
                        <span class="text-[13px] text-[#98989d] truncate">${song.artistName}</span>
                    </div>
                </div>
                <button class="bookmark-btn px-3 py-2" data-id="${song.trackId}">
                    <i class="${isSaved ? 'fas text-white' : 'far text-gray-500'} fa-bookmark text-xl"></i>
                </button>
            `;
            
            // Attach Bookmark Event Manually to avoid inline JS issues in ShadowDOM
            item.querySelector('.bookmark-btn').onclick = (e) => this.toggleSave(song.trackId, e);
            
            this.list.appendChild(item);
        });
    }

    toggleSave(id, e) {
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
        
        if (this.activeTab === 'Saved') this.renderList(saved);
        else {
            const icon = e.target.querySelector('i');
            icon.className = index > -1 ? 'far text-gray-500 fa-bookmark text-xl' : 'fas text-white fa-bookmark text-xl';
        }
    }

    playTrack(song) {
        this.currentSongData = song; // Save for selection
        const art = song.artworkUrl100.replace('100x100bb', '600x600bb');
        const root = this.shadowRoot;

        // Update Mini Player
        root.getElementById('mImg').src = art;
        root.getElementById('mTitle').innerText = song.trackName;
        root.getElementById('mArtist').innerText = song.artistName;
        
        // Update Full Modal
        root.getElementById('modalImg').src = art;
        root.getElementById('modalTitle').innerText = song.trackName;
        root.getElementById('modalArtist').innerText = song.artistName;

        this.player.src = song.previewUrl;
        this.player.play().catch(e => console.log("Autoplay blocked"));
        
        root.getElementById('miniPlayer').classList.remove('translate-y-full');
        this.updateIcons(true);
    }

    togglePlayState() {
        if (this.player.paused) { this.player.play(); this.updateIcons(true); } 
        else { this.player.pause(); this.updateIcons(false); }
    }

    updateIcons(play) {
        const icon = play ? 'fa-pause' : 'fa-play';
        this.shadowRoot.getElementById('playBtnIcon').className = `fas ${icon}`;
        this.shadowRoot.getElementById('modalPlayIcon').className = `fas ${icon} ml-1`;
    }

    onUpdate() {
        if (this.player.duration) {
            const pct = (this.player.currentTime / this.player.duration) * 100;
            this.shadowRoot.getElementById('progressBar').style.width = pct + '%';
        }
    }

    switchTab(name, btn) {
        this.activeTab = name;
        this.shadowRoot.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.status.classList.add('hidden');

        if (name === 'Saved') {
            const s = this.DB.getSaved();
            if(s.length === 0) this.list.innerHTML = `<div class="py-20 text-center text-gray-500 text-sm">No saved songs yet.</div>`;
            else this.renderList(s);
        } else if (name === 'Trending') {
            this.loadData("Global Top 100");
        } else {
            this.loadSmartForYou();
        }
    }

    showFullModal() { this.shadowRoot.getElementById('fullModal').classList.add('active'); }
    hideFullModal() { this.shadowRoot.getElementById('fullModal').classList.remove('active'); }
}

customElements.define('song-picker', SongPicker);
