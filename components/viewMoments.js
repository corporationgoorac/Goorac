/**
 * ============================================================================
 * viewMoments.js - Goorac Quantum Immersive Feed
 * ============================================================================
 * Extended & Enhanced Edition
 * * Features Included:
 * - Infinite Scroll Pagination
 * - Intersection Observer for Auto-Play & View Tracking
 * - Dedicated Audio Players (Feed vs Full Modal)
 * - Smart Mobile Keyboard Handling via Visual Viewport API
 * - Instant Optimistic UI Updates (Likes & View Counts)
 * - Bottom Sheet Modals (Comments & Replies & Options)
 * - Toast Notification System
 * - Advanced CSS Architecture & Animations
 * - Instagram-style Long Press to Pause & Progress Bar
 * - Smart Autoplay Block Recovery
 * - Enhanced Edge Caching & Performance Optimization
 * ============================================================================
 */

class ViewMoments extends HTMLElement {
    
    /**
     * Component Constructor
     * Initializes all state variables, database references, and audio players.
     */
    constructor() {
        super();
        
        // Firebase References
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        
        // Data State
        this.moments = [];
        this.mutualUids = [];
        this.myCF = []; 
        
        // Feed Background Audio Player
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
        
        // Dedicated Audio Player for the Full-Screen Modal
        this.modalAudioPlayer = new Audio();
        this.modalAudioPlayer.loop = true;
        
        // Modal State
        this.isModalOpen = false;
        this.lastClickTime = 0; // Tracks timestamps for double-tap detection
        this.isMuted = true; 
        
        // Observer & Timers
        this.observer = null;
        this.seenTimers = {}; 
        
        // Feed Pagination State
        this.lastDoc = null;
        this.loading = false;
        this.feedEnd = false;
        
        // Comments Pagination State
        this.commentsLastDoc = null;
        this.loadingComments = false;
        this.activeMomentId = null;

        // Current User Identity Cache
        this.currentUserData = null;
        
        // Press interaction state for Instagram-style hold
        this.pressTimer = null;
        this.isPressing = false;

        // Local Storage Cache for Likes to prevent flicker
        this.localLikes = JSON.parse(localStorage.getItem('goorac_local_likes') || '[]');
    }

    /**
     * Lifecycle Hook: connectedCallback
     * Fires when the component is inserted into the DOM.
     * Handles initial rendering, cache loading, and Auth state.
     */
    async connectedCallback() {
        // Initial DOM setup
        this.render();
        this.setupEventListeners();
        
        // INSTANT LOAD: Render from cache immediately (0ms) before network requests block it
        this.loadCachedMoments();
        
        // Listen to Authentication State
        this.auth.onAuthStateChanged(async (user) => {
            const cachedUid = localStorage.getItem('goorac_moments_last_uid');
            
            if (user) {
                // Clear cache immediately if a different user logs in
                if (cachedUid !== user.uid) {
                    localStorage.removeItem('goorac_moments_cache');
                    localStorage.removeItem('goorac_local_likes');
                    localStorage.removeItem('goorac_relations_cache');
                    localStorage.setItem('goorac_moments_last_uid', user.uid);
                    this.moments = [];
                    this.localLikes = [];
                    this.renderFeed(); // clear UI
                }

                try {
                    // Fetch full user profile for relations and meta
                    // Added enhanced caching layer for user profile
                    const cachedProfile = localStorage.getItem('goorac_user_profile');
                    if(cachedProfile) this.currentUserData = JSON.parse(cachedProfile);

                    const doc = await this.db.collection('users').doc(user.uid).get();
                    if (doc.exists) {
                        this.currentUserData = { uid: user.uid, ...doc.data() };
                        localStorage.setItem('goorac_user_profile', JSON.stringify(this.currentUserData)); // Cache sync
                        this.initFeed(user.uid);
                    }
                } catch (error) {
                    console.error("Failed to fetch user data on auth state change:", error);
                    this.showToast("Network error while loading profile.");
                }
            } else {
                // User logged out, clear sensitive cache
                localStorage.removeItem('goorac_moments_cache');
                localStorage.removeItem('goorac_local_likes');
                localStorage.removeItem('goorac_moments_last_uid');
                localStorage.removeItem('goorac_relations_cache');
                localStorage.removeItem('goorac_user_profile');
                this.currentUserData = null;
            }
        });
    }

    /**
     * Sets up all DOM Event Listeners for the component.
     * Handles infinite scrolling, back buttons, and keyboard adjustments.
     */
    setupEventListeners() {
        // Infinite scroll for body (Feed)
        window.addEventListener('scroll', () => {
            const scrollPosition = window.innerHeight + window.scrollY;
            const threshold = document.body.offsetHeight - 800;
            
            if (!this.loading && !this.feedEnd && scrollPosition >= threshold) {
                this.fetchMoments(true);
            }
        });

        // Infinite scroll for comments sheet
        const cList = this.querySelector('#comment-list-container');
        if(cList) {
            cList.addEventListener('scroll', () => {
                const scrollPosition = cList.scrollTop + cList.clientHeight;
                const threshold = cList.scrollHeight - 100;
                
                if (!this.loadingComments && scrollPosition >= threshold) {
                    this.loadComments(this.activeMomentId, true);
                }
            });
        }

        // Handle Mobile Back Button for Modals
        window.addEventListener('popstate', (e) => {
            const fullModal = this.querySelector('#full-moment-modal');
            const commentSheet = this.querySelector('#comment-sheet');
            const replySheet = this.querySelector('#reply-sheet');
            const optionsSheet = this.querySelector('#options-sheet');
            
            if (fullModal && fullModal.classList.contains('open') && (!e.state || e.state.modal !== 'momentFull')) {
                this.closeFullModal(true);
            }
            if (commentSheet && commentSheet.classList.contains('open') && (!e.state || e.state.modal !== 'momentComments')) {
                this.closeComments(true);
            }
            if (replySheet && replySheet.classList.contains('open') && (!e.state || e.state.modal !== 'momentReply')) {
                this.closeReplySheet(true);
            }
            if (optionsSheet && optionsSheet.classList.contains('open') && (!e.state || e.state.modal !== 'momentOptions')) {
                this.closeOptions(true);
            }
        });
    }

    /**
     * UTILS: Toggles the background body scroll to prevent 
     * double-scrolling when modals are open. Captures previous scroll position to eliminate jumps.
     * @param {boolean} lock - True to lock, false to unlock
     */
    toggleBodyScroll(lock) {
        if (lock) {
            this.scrollPos = window.scrollY;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed'; // Hard lock for iOS
            document.body.style.width = '100%';
            document.body.style.top = `-${this.scrollPos}px`; // Prevent page jumping to top
        } else {
            const modalOpen = this.querySelector('#full-moment-modal').classList.contains('open');
            const sheetOpen = this.querySelector('#comment-sheet').classList.contains('open');
            const replyOpen = this.querySelector('#reply-sheet').classList.contains('open');
            const optionsOpen = this.querySelector('#options-sheet').classList.contains('open');
            
            if (!modalOpen && !sheetOpen && !replyOpen && !optionsOpen) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.top = '';
                window.scrollTo(0, this.scrollPos);
            }
        }
    }

    /**
     * UTILS: Converts Firestore timestamps into human-readable strings.
     * @param {Object|number|string} timestamp - The timestamp to convert
     * @returns {string} Relative time string (e.g., "5m", "2h", "1d")
     */
    getRelativeTime(timestamp) {
        if (!timestamp) return 'Just now';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d`;
    }

    /**
     * UTILS: Calculates exact time remaining until moment expiration.
     */
    getTimeLeft(expiresAt) {
        if (!expiresAt) return 'Unknown';
        const date = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
        const now = new Date();
        const diffMs = date - now;
        
        if (diffMs <= 0) return 'Expired';
        
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m`;
        
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours}h`;
    }

    /**
     * UTILS: Displays a non-intrusive notification toast on the screen.
     * @param {string} message - The text to display
     * @param {string} icon - Material icon name
     */
    showToast(message, icon = 'info') {
        const existingToast = document.querySelector('.goorac-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'goorac-toast';
        toast.innerHTML = `<span class="material-icons-round" style="margin-right:8px; font-size:18px;">${icon}</span> <span>${message}</span>`;
        
        // Inline styles for the toast to ensure it works without external CSS
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(100px)',
            background: '#333',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: '9999',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fontSize: '14px',
            fontWeight: '600'
        });

        document.body.appendChild(toast);
        
        // Trigger reflow
        void toast.offsetWidth;
        toast.style.transform = 'translateX(-50%) translateY(0)';
        
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    /**
     * Core Initialization for Feed Data.
     * Resolves relationship mappings before fetching.
     * @param {string} uid - Current User ID
     */
    async initFeed(uid) {
        // Fast local relational cache injection
        const cachedRels = localStorage.getItem('goorac_relations_cache');
        if (cachedRels) {
            try {
                const parsed = JSON.parse(cachedRels);
                this.mutualUids = parsed.mutualUids || [];
                this.myCF = parsed.myCF || [];
            } catch(e) {}
        }
        await this.fetchRelations(uid);
        this.setupMediaObserver();
        this.fetchMoments();
    }

    /**
     * Maps out followers, following, and close friends 
     * to determine the mutual pool for the feed algorithm.
     * @param {string} uid - Current User ID
     */
    async fetchRelations(uid) {
        try {
            const myFollowing = this.currentUserData.following || []; 
            const myFollowers = this.currentUserData.followers || []; 

            const followingUIDs = myFollowing.map(i => typeof i === 'string' ? i : i.uid);
            const followersUIDs = myFollowers.map(i => typeof i === 'string' ? i : i.uid);

            // Mutual calculation
            this.mutualUids = followingUIDs.filter(id => followersUIDs.includes(id));
            this.mutualUids.push(uid); // Always include myself in the feed

            this.myCF = this.currentUserData.closeFriends || [];

            // Cache relations for extreme fast-boot
            localStorage.setItem('goorac_relations_cache', JSON.stringify({ mutualUids: this.mutualUids, myCF: this.myCF }));

        } catch(e) { 
            console.error("Relations compilation error:", e); 
        }
    }

    /**
     * Safely stores heavy video and image contents into the Browser Cache API
     * which acts as a robust local storage for media without hitting 5MB LocalStorage limits.
     * This fulfills the requirement to locally store the contents (videos/images).
     */
    async cacheMediaFilesAggressively(momentsToCache) {
        if (!('caches' in window)) return;
        try {
            const cache = await caches.open('goorac-media-content-cache');
            for (let m of momentsToCache) {
                if (m.mediaUrl) {
                    cache.match(m.mediaUrl).then(res => {
                        if (!res) cache.add(m.mediaUrl).catch(e => console.warn('Cache media fail', e));
                    });
                }
                if (m.pfp) {
                    cache.match(m.pfp).then(res => {
                        if (!res) cache.add(m.pfp).catch(e => console.warn('Cache pfp fail', e));
                    });
                }
            }
        } catch(e) {
            console.warn("Media caching disabled or failed", e);
        }
    }

    /**
     * Fetches the latest active moments from Firestore based on mutual relations.
     * Includes infinite scroll pagination logic.
     * @param {boolean} isNextPage - Whether to append or overwrite data
     */
    async fetchMoments(isNextPage = false) {
        if (this.loading || this.feedEnd) return;
        
        this.loading = true;
        const loader = this.querySelector('#feed-loader');
        if (loader) loader.style.display = 'block';

        let fetchedCount = 0;
        let newMoments = [];
        const now = new Date();

        let query = this.db.collection('moments')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(20); // Larger batch to find mutuals faster amidst non-mutuals

        if (isNextPage && this.lastDoc) {
            query = query.startAfter(this.lastDoc);
        }

        try {
            // Actively fetch until we have enough mutual moments or run out of DB documents
            while (fetchedCount < 6 && !this.feedEnd) {
                const snap = await query.get();
                
                if (snap.empty) {
                    this.feedEnd = true;
                    break;
                }

                this.lastDoc = snap.docs[snap.docs.length - 1];
                
                // Prepare next query in case we need to loop again
                query = this.db.collection('moments')
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .startAfter(this.lastDoc)
                    .limit(20);

                for (let doc of snap.docs) {
                    const data = doc.data();
                    
                    // EXPIRE LOGIC: Archive if past 24 hours automatically on client read
                    if (data.expiresAt && data.expiresAt.toDate() < now) {
                        this.db.collection('moments').doc(doc.id).update({ isActive: false });
                        continue; 
                    }
                    
                    // FILTER 1: Mutuals Only
                    if (!this.mutualUids.includes(data.uid)) continue;

                    // FILTER 2: Close Friends Only 
                    if (data.audience === 'close_friends' && data.uid !== this.auth.currentUser.uid) {
                        try {
                            const authorDoc = await this.db.collection('users').doc(data.uid).get();
                            const authorData = authorDoc.data();
                            
                            if (!authorData || !authorData.closeFriends || !authorData.closeFriends.includes(this.auth.currentUser.uid)) {
                                continue; // Skip if not in CF list
                            }
                        } catch (e) { 
                            console.warn("Error fetching CF data for moment:", e);
                            continue; 
                        }
                    }

                    // Approved Moment
                    newMoments.push({ id: doc.id, ...data });
                    fetchedCount++;
                    
                    if (fetchedCount >= 6) break; // Stop loop if batch filled optimally
                }
            }

            if (isNextPage) {
                this.moments = [...this.moments, ...newMoments];
            } else {
                this.moments = newMoments;
                // Cache latest 20 for immediate launch rendering next time (Increased limit for enhanced speed)
                // ADDED: Explicitly mapped to ensure all detailed metadata (video/images/profiles) caches faithfully into local storage
                const momentsToCache = this.moments.slice(0, 20).map(m => ({
                    ...m,
                    createdAt: m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().getTime() : m.createdAt,
                    expiresAt: m.expiresAt && m.expiresAt.toDate ? m.expiresAt.toDate().getTime() : m.expiresAt,
                    pfp: m.pfp || '',
                    displayName: m.displayName || '',
                    username: m.username || '',
                    verified: m.verified || false,
                    mediaUrl: m.mediaUrl || '',
                    type: m.type || ''
                }));
                localStorage.setItem('goorac_moments_cache', JSON.stringify(momentsToCache)); 
                this.cacheMediaFilesAggressively(momentsToCache);
            }

            this.renderFeed();
            
        } catch(e) {
            console.error("Feed generation network error:", e);
            this.showToast("Network error loading moments.", "wifi_off");
        } finally {
            this.loading = false;
            if (loader) loader.style.display = 'none';
        }
    }

    /**
     * Hydrates feed with cached data from localStorage for instant perceived performance.
     */
    loadCachedMoments() {
        try {
            const cache = localStorage.getItem('goorac_moments_cache');
            if (cache) {
                const parsedCache = JSON.parse(cache);
                const now = new Date();
                
                // Filter out expired cache entries locally
                this.moments = parsedCache.filter(m => {
                    if (!m.expiresAt) return true;
                    const expireTime = m.expiresAt.seconds ? m.expiresAt.seconds * 1000 : (m.expiresAt.toDate ? m.expiresAt.toDate() : new Date(m.expiresAt).getTime());
                    return new Date(expireTime) > now;
                });
                
                if (this.moments.length > 0) {
                    this.renderFeed();
                }
            }
        } catch (e) {
            console.warn("Cache parsing error:", e);
            localStorage.removeItem('goorac_moments_cache');
        }
    }

    /**
     * --- INTERSECTION OBSERVER (AUDIO & SEEN TRACKING) ---
     * Sets up the Intersection Observer to trigger view counts
     * and auto-play media when scrolling.
     */
    setupMediaObserver() {
        const options = { threshold: 0.65 }; 
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const momentId = entry.target.dataset.id;
                const moment = this.moments.find(m => m.id === momentId);
                // ADDED: Target embedded video inside the feed list item dynamically
                const feedVideo = entry.target.querySelector('video.m-media');
                
                if (entry.isIntersecting) {
                    // Prevent background music playing if the Full Modal is actively open
                    if (moment && moment.songPreview && !this.isModalOpen) {
                        this.playMomentMusic(moment.songPreview);
                    }

                    // ADDED: Play video gracefully inside the feed when it comes into view
                    if (feedVideo && !this.isModalOpen) {
                        feedVideo.muted = this.isMuted;
                        let playPromise = feedVideo.play();
                        if (playPromise !== undefined) playPromise.catch(()=>{});
                    }
                    
                    // Mark as viewed after 1.5 seconds of intersection focus
                    this.seenTimers[momentId] = setTimeout(() => {
                        this.markAsSeen(momentId, moment);
                    }, 1500);
                    
                } else {
                    // Clear timer if user scrolls past too quickly
                    clearTimeout(this.seenTimers[momentId]);

                    // Stop audio if the moment passing out of view was the one playing
                    if (moment && moment.songPreview && this.audioPlayer.src.includes(moment.songPreview)) {
                        this.audioPlayer.pause();
                    }

                    // ADDED: Pause video moment dynamically as it exits the viewport
                    if (feedVideo) {
                        feedVideo.pause();
                    }
                }
            });
        }, options);
    }

    /**
     * Centralized Autoplay Block Error Handling
     * Activates when the browser stops media from auto-playing due to missing interaction
     */
    handleAutoplayBlock() {
        this.isMuted = true;
        this.audioPlayer.muted = true;
        this.modalAudioPlayer.muted = true;
        
        // Notify the user subtly
        this.showToast("Tap screen to enable audio", "volume_off");
        
        // Apply pulsing visual cue to all mute buttons visible to attract tap interaction
        const mutes = this.querySelectorAll('.mute-btn');
        mutes.forEach(btn => {
            const icon = btn.querySelector('span');
            if (icon) icon.innerText = 'volume_off';
            btn.classList.add('pulse-attention');
        });

        // Show big explicit tap overlay in modal if blocked there
        const audioOverlay = this.querySelector('#audio-enable-overlay');
        if (this.isModalOpen && audioOverlay) {
            audioOverlay.classList.add('show');
        }
    }

    /**
     * Plays background music for a moment if available.
     * @param {string} url - Audio source URL
     */
    playMomentMusic(url) {
        if (!url) return;
        
        if (this.audioPlayer.src !== url) {
            this.audioPlayer.src = url;
        }
        
        this.audioPlayer.muted = this.isMuted;
        
        // Catch DOM exceptions (like auto-play policy blocks) cleanly
        const playPromise = this.audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Auto-play was prevented. Show speaker icon cue!
                this.handleAutoplayBlock();
            });
        }
    }

    /**
     * Toggles global mute state across both feed and modal players.
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audioPlayer.muted = this.isMuted;
        this.modalAudioPlayer.muted = this.isMuted; // Sync to modal player
        
        if (!this.isMuted) {
            // Remove pulsing attention class as the user has now interacted
            const pulsingBtns = this.querySelectorAll('.pulse-attention');
            pulsingBtns.forEach(btn => btn.classList.remove('pulse-attention'));

            // Hide explicit modal overlay
            const audioOverlay = this.querySelector('#audio-enable-overlay');
            if (audioOverlay) audioOverlay.classList.remove('show');

            if (this.isModalOpen) {
                this.modalAudioPlayer.play().catch(()=>{});
                // Also trigger video if it exists
                const vid = this.querySelector('#full-modal-content video');
                if(vid) {
                    vid.muted = this.isMuted;
                    vid.play().catch(()=>{});
                }
            } else {
                this.audioPlayer.play().catch(()=>{});
            }
        } else {
            this.audioPlayer.pause();
            this.modalAudioPlayer.pause();
        }

        // ADDED: Sync mute state to all rendered feed videos explicitly on toggle
        const allFeedVideos = this.querySelectorAll('.m-card video.m-media');
        allFeedVideos.forEach(vid => {
            vid.muted = this.isMuted;
        });
        
        // Update live modal UI mute icon instantly
        const modalMutes = this.querySelectorAll('#full-moment-modal .mute-btn span');
        modalMutes.forEach(modalMute => {
             modalMute.innerText = this.isMuted ? 'volume_off' : 'volume_up';
        });
        
        // Render feed purely to update icon states
        this.renderFeed(); 
    }

    /**
     * 🚀 CRITICAL FIX: Marks a moment as seen immediately locally, updates UI, then hits DB.
     * @param {string} momentId - Document ID
     * @param {Object} moment - Moment object reference
     */
    async markAsSeen(momentId, moment) {
        if (!this.auth.currentUser || !moment) return;
        
        const myUid = this.auth.currentUser.uid;
        if (!moment.viewers) moment.viewers = [];
        
        // If not me, and I haven't viewed it yet
        if (moment.uid !== myUid && !moment.viewers.includes(myUid)) {
            
            // 1. Optimistic Local Update
            moment.viewers.push(myUid);
            
            // 2. Direct DOM Update if Modal is actively looking at this moment
            // This prevents the bug where views only updated after liking
            if (this.isModalOpen && this.activeMomentId === momentId) {
                const viewsStatNode = this.querySelector('.live-views-count');
                if (viewsStatNode) {
                    viewsStatNode.innerText = moment.viewers.length;
                }
                
                const viewsStatNodeBasic = this.querySelector('.live-views-count-basic');
                if (viewsStatNodeBasic) {
                    viewsStatNodeBasic.innerText = moment.viewers.length;
                }
            }
            
            // 3. Database Sync
            try {
                await this.db.collection('moments').doc(momentId).update({
                    viewers: firebase.firestore.FieldValue.arrayUnion(myUid)
                });
            } catch(e) {
                console.warn("Non-fatal: Failed to log view count to db", e);
            }
        }
    }

    /**
     * Shows a bouncy heartbeat pop animation specifically on double tap
     * @param {string} momentId - Target moment ID
     * @param {boolean} isModal - Context flag
     */
    showHeartAnimation(momentId, isModal = false) {
        let heart;
        if (isModal) {
            heart = this.querySelector('#full-moment-modal .double-tap-heart');
        } else {
            const card = this.querySelector(`.m-card[data-id="${momentId}"]`);
            if (card) heart = card.querySelector('.double-tap-heart');
        }
        
        if (heart) {
            // Force DOM reflow to restart animation seamlessly
            heart.classList.remove('animate');
            void heart.offsetWidth; 
            heart.classList.add('animate');
            
            // Haptic feedback
            if(navigator.vibrate) navigator.vibrate([10, 30, 10]);
        }
    }

    /**
     * --- LIKES & NOTIFICATIONS ---
     * Handles liking logic optimistically
     * @param {string} momentId - Target ID
     */
    async toggleLike(momentId) {
        if (!this.auth.currentUser) return;
        const myUid = this.auth.currentUser.uid;
        
        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;

        // Micro-interaction Haptic
        if(navigator.vibrate) navigator.vibrate(10);

        // Updated check: Utilize both DB state and local cached state to prevent flicker
        const isLiked = (moment.likes && moment.likes.includes(myUid)) || this.localLikes.includes(momentId);
        const ref = this.db.collection('moments').doc(momentId);

        if (isLiked) {
            // Unlike Sequence
            if (moment.likes) moment.likes = moment.likes.filter(id => id !== myUid);
            
            // Local Storage Sequence Update
            this.localLikes = this.localLikes.filter(id => id !== momentId);
            localStorage.setItem('goorac_local_likes', JSON.stringify(this.localLikes));

            this.renderFeed(); // Re-render feed card icons
            
            // Re-render modal stats dynamically if open
            if (this.isModalOpen && this.activeMomentId === momentId) {
                const likesStatNode = this.querySelector('.live-likes-count');
                if (likesStatNode && moment.likes) likesStatNode.innerText = moment.likes.length;
                
                const likesStatNodeBasic = this.querySelector('.live-likes-count-basic');
                if (likesStatNodeBasic && moment.likes) likesStatNodeBasic.innerText = moment.likes.length;
            }
            
            await ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) }).catch(e=>console.warn(e));
        } else {
            // Like Sequence
            if(!moment.likes) moment.likes = [];
            moment.likes.push(myUid);
            
            // Local Storage Sequence Update
            if (!this.localLikes.includes(momentId)) this.localLikes.push(momentId);
            localStorage.setItem('goorac_local_likes', JSON.stringify(this.localLikes));

            this.renderFeed(); 
            
            if (this.isModalOpen && this.activeMomentId === momentId) {
                const likesStatNode = this.querySelector('.live-likes-count');
                if (likesStatNode) likesStatNode.innerText = moment.likes.length;
                
                const likesStatNodeBasic = this.querySelector('.live-likes-count-basic');
                if (likesStatNodeBasic) likesStatNodeBasic.innerText = moment.likes.length;
            }
            
            await ref.update({ likes: firebase.firestore.FieldValue.arrayUnion(myUid) }).catch(e=>console.warn(e));
            
            // Fire background notification
            if (moment.uid !== myUid) {
                this.sendNotification(moment.uid, 'like_moment', momentId, 'liked your moment.');
            }
        }
    }

    /**
     * Generates a notification payload for the target user.
     * Prevents self-notifications automatically.
     */
    async sendNotification(toUid, type, referenceId, body) {
        if (!this.currentUserData || toUid === this.currentUserData.uid) return; 
        
        const notifId = `${type}_${this.currentUserData.uid}_${referenceId}`;
        const notifRef = this.db.collection('notifications').doc(notifId);

        try {
            const docSnap = await notifRef.get();
            if (!docSnap.exists) {
                await notifRef.set({
                    toUid: toUid,
                    fromUid: this.currentUserData.uid,
                    senderName: this.currentUserData.name || this.currentUserData.username || 'User',
                    senderPfp: this.currentUserData.photoURL || 'https://via.placeholder.com/65',
                    isSenderVerified: this.currentUserData.verified || false,
                    type: type, 
                    body: body,
                    referenceId: referenceId,
                    isSeen: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update unread count bubble
                await this.db.collection('users').doc(toUid).update({
                    unreadCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        } catch(e) { 
            console.error("Notification pipeline error:", e); 
        }
    }

    /**
     * --- UI RENDERING ---
     * Main DOM template injection with expanded CSS formatting
     */
    render() {
        this.innerHTML = `
            <style>
                /* Base Container */
                .moments-container { 
                    display: flex; 
                    flex-direction: column; 
                    background: #000; 
                    width: 100%; 
                }
                
                /* Feed Card Styling */
                .m-card { 
                    width: 100%; 
                    border-bottom: 1px solid #1a1a1a; 
                    padding-bottom: 10px; 
                    margin-bottom: 10px; 
                }
                .m-header { 
                    display: flex; 
                    align-items: center; 
                    padding: 12px 15px; 
                    gap: 10px; 
                }
                .m-pfp { 
                    width: 36px; 
                    height: 36px; 
                    border-radius: 50%; 
                    object-fit: cover; 
                    border: 2px solid var(--accent); 
                    cursor: pointer; 
                }
                .m-user-info { 
                    flex: 1; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: center; 
                }
                .m-name-row { 
                    display: flex; 
                    align-items: center; 
                    gap: 4px; 
                    font-weight: 700; 
                    font-size: 14px; 
                    color: #fff; 
                }
                .m-verified { 
                    color: #0095f6; 
                    font-size: 14px; 
                }
                .m-username { 
                    font-size: 12px; 
                    color: #aaa; 
                    font-weight: 400; 
                }
                .m-timestamp { 
                    font-size: 11px; 
                    color: #888; 
                    font-weight: 500; 
                }
                .m-song { 
                    font-size: 11px; 
                    color: #fff; 
                    display: flex; 
                    align-items: center; 
                    gap: 4px; 
                    margin-top: 2px; 
                }
                
                /* Main Media Canvas (4:5 Aspect Ratio) */
                .m-canvas { 
                    width: 100%; 
                    aspect-ratio: 4/5; 
                    background: #050505; 
                    position: relative; 
                    overflow: hidden; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    cursor: pointer;
                }
                .m-media { 
                    width: 100%; 
                    height: 100%; 
                    object-fit: contain; 
                    z-index: 2; 
                    position: relative; 
                }
                .m-backdrop { 
                    position: absolute; 
                    inset: -10%; 
                    width: 120%; 
                    height: 120%; 
                    object-fit: cover; 
                    filter: blur(30px) brightness(0.4); 
                    -webkit-filter: blur(30px) brightness(0.4);
                    z-index: 0; 
                }
                
                /* Advanced Text FX */
                .fx-glow { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
                .fx-shadow { text-shadow: 3px 3px 0px rgba(0,0,0,0.8); }

                /* Double Tap Heart Animation Complex */
                .double-tap-heart {
                    position: absolute; 
                    top: 50%; 
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0);
                    color: #ff3b30; 
                    font-size: 90px; 
                    opacity: 0;
                    z-index: 100; 
                    pointer-events: none;
                    text-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .double-tap-heart.animate { 
                    animation: heartBeatPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; 
                }
                
                @keyframes heartBeatPop {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    45% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }

                /* Pulse Attention Animation for Autoplay Blocks */
                @keyframes pulseAttention {
                    0% { box-shadow: 0 0 0 0 rgba(255, 0, 127, 0.7); transform: scale(1); }
                    50% { box-shadow: 0 0 0 15px rgba(255, 0, 127, 0); transform: scale(1.1); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 0, 127, 0); transform: scale(1); }
                }
                .pulse-attention {
                    animation: pulseAttention 1.5s infinite !important;
                    background: rgba(255,0,127,0.8) !important;
                    border: 2px solid #fff !important;
                }

                /* Audio Overlay */
                .tap-to-enable-audio {
                    position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 50;
                    display: none; flex-direction: column; align-items: center; justify-content: center;
                    color: white; font-weight: bold; pointer-events: none;
                }
                .tap-to-enable-audio.show { display: flex; }

                /* Progress Bar */
                .m-progress-container {
                    position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.2); z-index: 100;
                }
                .m-progress-fill { height: 100%; background: #fff; width: 0%; transition: width 0.1s linear; }

                /* Hide UI for long press */
                .hide-ui-transition { transition: opacity 0.2s; }
                .hide-ui { opacity: 0 !important; pointer-events: none; }

                /* UI Buttons overlaying canvas */
                .mute-btn { 
                    position: absolute; 
                    bottom: 15px; 
                    right: 15px; 
                    z-index: 10; 
                    background: rgba(0,0,0,0.6); 
                    backdrop-filter: blur(5px); 
                    -webkit-backdrop-filter: blur(5px);
                    border-radius: 50%; 
                    width: 32px; 
                    height: 32px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color:#fff; 
                    border:none; 
                    cursor:pointer;
                    transition: all 0.2s ease;
                }
                
                /* Post Actions Row */
                .m-actions { 
                    display: flex; 
                    padding: 12px 15px; 
                    gap: 20px; 
                    align-items: center; 
                }
                .m-btn { 
                    background: none; 
                    border: none; 
                    color: #fff; 
                    padding: 0; 
                    cursor: pointer; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    transition: 0.2s;
                }
                .m-btn:active { 
                    transform: scale(0.9); 
                }
                .m-btn .material-icons-round { 
                    font-size: 28px; 
                    font-weight: 300;
                    -webkit-font-smoothing: antialiased;
                }
                .liked { 
                    color: #ff3b30 !important; 
                }

                /* Text Content */
                .m-caption { 
                    padding: 0 15px 10px; 
                    font-size: 14px; 
                    color: #fff; 
                    line-height: 1.4; 
                    word-break: break-word; 
                }
                .m-caption-name { 
                    font-weight: 700; 
                    margin-right: 5px; 
                }

                /* Full Screen Modal Base */
                .m-full-modal {
                    position: fixed; 
                    inset: 0; 
                    background: #000; 
                    z-index: 2000;
                    transform: translateX(100%); 
                    transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
                    display: flex; 
                    flex-direction: column; 
                    width: 100vw; 
                    height: 100dvh;
                }
                .m-full-modal.open { 
                    transform: translateX(0); 
                }
                .m-full-header { 
                    padding: calc(15px + env(safe-area-inset-top)) 20px 15px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    gap: 15px; 
                    border-bottom: 1px solid #1a1a1a; 
                    position: relative;
                }
                
                /* Advanced Action Buttons (Creator specific tools) */
                .m-action-btn-row { 
                    display: flex; 
                    gap: 10px; 
                    margin: 15px 0 25px; 
                }
                .m-action-btn { 
                    flex: 1; 
                    padding: 12px; 
                    border-radius: 16px; 
                    font-weight: 600; 
                    font-size: 13px; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    gap: 6px; 
                    cursor: pointer; 
                    border: none; 
                    transition: 0.2s; 
                }
                .m-action-btn .material-icons-round { 
                    font-size: 22px; 
                }
                .m-action-btn.primary { 
                    background: rgba(255, 255, 255, 0.1); 
                    color: #fff; 
                }
                .m-action-btn.secondary { 
                    background: rgba(255, 255, 255, 0.05); 
                    color: #ccc; 
                }
                .m-action-btn.danger { 
                    background: rgba(255, 59, 48, 0.1); 
                    color: #ff3b30; 
                }
                .m-action-btn:active { 
                    transform: scale(0.95); 
                }

                /* Button Loaders */
                .btn-spinner {
                    width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid #fff; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
                }
                .c-opt-btn { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 12px; font-weight: 600; width: 100%; margin-top: 10px; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 15px; transition: 0.2s;}
                .c-opt-btn.danger { color: #ff3b30; background: rgba(255,59,48,0.1); border-color: rgba(255,59,48,0.3); }
                .c-opt-btn:active { transform: scale(0.98); }
                .c-opt-btn:disabled { opacity: 0.6; pointer-events: none; }

                /* Creator Statistics Dashboard */
                .my-stats-box { 
                    background: #111; 
                    border-radius: 16px; 
                    padding: 15px; 
                    margin: 15px 0; 
                    display: flex; 
                    justify-content: space-around; 
                    text-align: center; 
                }
                .stat-num { 
                    font-weight: 800; 
                    font-size: 20px; 
                    color: #fff; 
                }
                .stat-lbl { 
                    font-size: 11px; 
                    color: #888; 
                    text-transform: uppercase; 
                    letter-spacing: 1px; 
                    margin-top: 4px; 
                }
                
                /* Viewers List Styling */
                .advanced-viewers-list { 
                    margin-top: 15px; 
                    max-height: 350px; 
                    overflow-y: auto; 
                    padding: 0 5px; 
                    scrollbar-width: none; 
                }
                .advanced-viewers-list::-webkit-scrollbar { 
                    display: none; 
                }
                .viewer-row { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    margin-bottom: 12px; 
                    padding: 10px; 
                    background: rgba(255,255,255,0.03); 
                    border-radius: 16px; 
                }
                .viewer-info { 
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                }
                .viewer-avatar { 
                    width: 40px; 
                    height: 40px; 
                    border-radius: 50%; 
                    border: 1px solid rgba(255,255,255,0.1); 
                    object-fit: cover; 
                }
                .viewer-name { 
                    color: #fff; 
                    font-size: 14px; 
                    font-weight: 600; 
                    display: flex; 
                    align-items: center; 
                    gap: 4px; 
                }
                .viewer-action-icon { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                }

                /* Generic Bottom Sheet (Comments/Reply Overlays) */
                .c-overlay { 
                    position: fixed; 
                    inset: 0; 
                    background: rgba(0,0,0,0.6); 
                    z-index: 3000; 
                    display: none; 
                    align-items: flex-end; 
                    opacity: 0; 
                    transition: 0.3s ease; 
                    backdrop-filter: blur(4px); 
                    -webkit-backdrop-filter: blur(4px);
                }
                .c-overlay.open { 
                    display: flex; 
                    opacity: 1; 
                }
                
                .c-sheet { 
                    width: 100%; 
                    height: 75vh; 
                    background: #121212; 
                    border-top-left-radius: 24px; 
                    border-top-right-radius: 24px; 
                    display: flex; 
                    flex-direction: column; 
                    transform: translateY(100%); 
                    transition: 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); 
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.5); 
                }
                .c-sheet.auto-height { 
                    height: auto; 
                    min-height: 250px; 
                    padding-bottom: calc(20px + env(safe-area-inset-bottom)); 
                }
                .c-overlay.open .c-sheet { 
                    transform: translateY(0); 
                }
                
                .c-header { 
                    display: flex; 
                    justify-content: center; 
                    padding: 12px; 
                    border-bottom: 1px solid rgba(255,255,255,0.05); 
                    position: relative; 
                }
                .c-drag { 
                    width: 40px; 
                    height: 4px; 
                    background: #444; 
                    border-radius: 10px; 
                }
                .c-title { 
                    position: absolute; 
                    top: 15px; 
                    font-weight: 700; 
                    font-size: 14px; 
                }
                
                /* Chat / Comments Inner Layout */
                .c-list { 
                    flex: 1; 
                    overflow-y: auto; 
                    padding: 15px 20px; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 20px; 
                    scrollbar-width: none; 
                }
                .c-item { 
                    display: flex; 
                    gap: 12px; 
                }
                .c-pfp { 
                    width: 36px; 
                    height: 36px; 
                    border-radius: 50%; 
                    object-fit: cover; 
                    border: 1px solid rgba(255,255,255,0.1); 
                }
                .c-content { 
                    flex: 1; 
                }
                .c-name { 
                    font-weight: 700; 
                    font-size: 13px; 
                    color: #fff; 
                    margin-bottom: 2px; 
                }
                .c-text { 
                    font-size: 14px; 
                    color: #eee; 
                    line-height: 1.4; 
                }
                .c-meta { 
                    display: flex; 
                    align-items: center; 
                    gap: 15px; 
                    font-size: 11px; 
                    color: #888; 
                    margin-top: 6px; 
                    font-weight: 600; 
                }
                .c-reply-btn { 
                    cursor: pointer; 
                    transition: 0.2s; 
                }
                .c-reply-btn:active { 
                    color: #fff; 
                }
                
                /* Interactive Form Area */
                .c-input-area { 
                    padding: 10px 15px calc(15px + env(safe-area-inset-bottom)); 
                    border-top: 1px solid rgba(255,255,255,0.05); 
                    display: flex; 
                    align-items: center; 
                    gap: 10px; 
                    background: #121212; 
                }
                .c-input { 
                    flex: 1; 
                    background: #222; 
                    border: none; 
                    color: #fff; 
                    padding: 12px 15px; 
                    border-radius: 20px; 
                    font-size: 14px; 
                    outline: none; 
                }
                .c-send { 
                    color: var(--accent, #ff007f); 
                    font-weight: 700; 
                    background: none; 
                    border: none; 
                    padding: 8px; 
                    cursor: pointer; 
                }

                /* Quick Emoji Bar */
                .vn-emoji-bar { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 15px; 
                    padding: 0 10px; 
                }
                .vn-quick-emoji { 
                    font-size: 2.2rem; 
                    cursor: pointer; 
                    transition: transform 0.2s; 
                    user-select: none; 
                    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3)); 
                }
                .vn-quick-emoji:active { 
                    transform: scale(1.4); 
                }

                /* Core Loading Spinner */
                .loader-spinner { 
                    text-align: center; 
                    padding: 20px; 
                    color: var(--accent, #ff007f); 
                    display: none; 
                }
                .loader-spinner .material-icons-round { 
                    animation: spin 1s linear infinite; 
                }
                @keyframes spin { 
                    100% { transform: rotate(360deg); } 
                }
            </style>

            <div class="moments-container" id="feed-container"></div>
            <div class="loader-spinner" id="feed-loader"><span class="material-icons-round">refresh</span></div>

            <div class="m-full-modal" id="full-moment-modal">
                <div class="m-progress-container"><div class="m-progress-fill" id="modal-progress"></div></div>
                <div class="m-full-header hide-ui-transition">
                    <span class="material-icons-round" onclick="document.querySelector('view-moments').closeFullModal()" style="cursor:pointer; font-size:28px;">arrow_back</span>
                    <span style="font-weight: 700; font-size: 16px;">Moment Info</span>
                    <span class="material-icons-round" id="modal-more-btn" onclick="" style="cursor:pointer; font-size:24px; display:none;">more_vert</span>
                </div>
                <div id="full-modal-content" class="hide-ui-transition" style="flex:1; overflow-y:auto; overflow-x:hidden; padding-bottom: 40px; position:relative;"></div>
            </div>

            <div class="c-overlay" id="options-sheet" onclick="if(event.target === this) document.querySelector('view-moments').closeOptions()">
                <div class="c-sheet auto-height" onclick="event.stopPropagation()">
                    <div class="c-header" onclick="document.querySelector('view-moments').closeOptions()">
                        <div class="c-drag"></div><div class="c-title">More Options</div>
                    </div>
                    <div style="padding: 20px 15px;">
                        <div style="text-align:center; color:#aaa; font-size:13px; margin-bottom: 20px; font-weight:600;" id="opt-expires-text">
                            Moment expires in --
                        </div>
                        <button class="c-opt-btn" id="opt-unfollow-btn" onclick="document.querySelector('view-moments').actionUnfollow(this)">
                            <span class="material-icons-round">person_remove</span> Unfollow
                        </button>
                        <button class="c-opt-btn danger" id="opt-block-btn" onclick="document.querySelector('view-moments').actionBlock(this)">
                            <span class="material-icons-round">block</span> Block User
                        </button>
                    </div>
                </div>
            </div>

            <div class="c-overlay" id="comment-sheet" onclick="if(event.target === this) document.querySelector('view-moments').closeComments()">
                <div class="c-sheet" onclick="event.stopPropagation()">
                    <div class="c-header" onclick="document.querySelector('view-moments').closeComments()">
                        <div class="c-drag"></div><div class="c-title">Comments</div>
                    </div>
                    <div class="c-list" id="comment-list-container"></div>
                    <div class="c-input-area">
                        <img src="" id="c-my-pfp" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                        <input type="text" class="c-input" id="c-input-field" placeholder="Add a comment..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore>
                        <button class="c-send" onclick="document.querySelector('view-moments').postComment()">Post</button>
                    </div>
                </div>
            </div>

            <div class="c-overlay" id="reply-sheet" onclick="if(event.target === this) document.querySelector('view-moments').closeReplySheet()">
                <div class="c-sheet auto-height" onclick="event.stopPropagation()">
                    <div class="c-header" onclick="document.querySelector('view-moments').closeReplySheet()">
                        <div class="c-drag"></div><div class="c-title">Reply to Moment</div>
                    </div>
                    <div style="padding: 20px 15px 5px;">
                        <div class="vn-emoji-bar">
                            <span class="vn-quick-emoji" onclick="document.querySelector('view-moments').sendReply('😂')">😂</span>
                            <span class="vn-quick-emoji" onclick="document.querySelector('view-moments').sendReply('😮')">😮</span>
                            <span class="vn-quick-emoji" onclick="document.querySelector('view-moments').sendReply('😍')">😍</span>
                            <span class="vn-quick-emoji" onclick="document.querySelector('view-moments').sendReply('😢')">😢</span>
                            <span class="vn-quick-emoji" onclick="document.querySelector('view-moments').sendReply('🔥')">🔥</span>
                            <span class="vn-quick-emoji" onclick="document.querySelector('view-moments').sendReply('👏')">👏</span>
                        </div>
                        <div class="c-input-area" style="border-top:none; background:transparent; padding:0; margin-top:10px;">
                            <input type="text" class="c-input" id="r-input-field" placeholder="Send a message..." style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore>
                            <button class="c-send" onclick="document.querySelector('view-moments').sendReply()">Send</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Engine that turns JSON state data into active DOM nodes
     * for the main scrolling feed view.
     */
    renderFeed() {
        const container = this.querySelector('#feed-container');
        if (!container) return;
        
        container.innerHTML = '';
        const myUid = this.auth.currentUser?.uid;

        this.moments.forEach(moment => {
            // Enhanced with local cached likes list to prevent flicker
            const isLiked = (moment.likes && moment.likes.includes(myUid)) || (this.localLikes && this.localLikes.includes(moment.id));
            const timeAgo = this.getRelativeTime(moment.createdAt);
            const card = document.createElement('div');
            
            card.className = 'm-card';
            card.dataset.id = moment.id;
            
            // Generate Media Markup based on type
            let mediaHtml = '';
            if (moment.type === 'video') {
                mediaHtml = `<video src="${moment.mediaUrl}" class="m-media" loop muted playsinline></video>`;
            } else if (moment.type === 'image') {
                mediaHtml = `<img src="${moment.mediaUrl}" class="m-media">`;
            } else {
                let effectClass = '';
                if (moment.effect === 'glow') effectClass = 'fx-glow';
                else if (moment.effect === 'shadow') effectClass = 'fx-shadow';

                mediaHtml = `<div class="m-media ${effectClass}" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align || 'center'}; color:#fff; padding:30px; font-size:28px; word-break:break-word; white-space:pre-wrap;">${moment.text}</div>`;
            }

            const muteIcon = this.isMuted ? 'volume_off' : 'volume_up';
            const cfBadge = moment.audience === 'close_friends' ? `<div style="display:inline-flex; align-items:center; justify-content:center; background:#00ba7c; border-radius:50%; width:14px; height:14px; margin-left:4px;"><svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>` : '';

            card.innerHTML = `
                <div class="m-header">
                    <img src="${moment.pfp}" class="m-pfp" onclick="event.stopPropagation(); window.location.href='userProfile.html?user=${moment.username}'">
                    <div class="m-user-info">
                        <div class="m-name-row" style="cursor:pointer;" onclick="event.stopPropagation(); window.location.href='userProfile.html?user=${moment.username}'">
                            ${moment.displayName} 
                            ${moment.verified ? '<span class="material-icons-round m-verified">verified</span>' : ''}
                            <span class="m-timestamp">• ${timeAgo}</span>
                            ${cfBadge}
                        </div>
                        <div class="m-song">
                            ${moment.songName ? `
                                <span class="material-icons-round" style="font-size:12px;">music_note</span>
                                ${moment.songName} • ${moment.songArtist}
                            ` : `<span class="m-username">@${moment.username}</span>`}
                        </div>
                    </div>
                    <span class="material-icons-round" style="color:#fff; cursor:pointer;" onclick="document.querySelector('view-moments').openOptions('${moment.id}')">more_vert</span>
                </div>

                <div class="m-canvas" onclick="document.querySelector('view-moments').openFullModal('${moment.id}')">
                    ${moment.mediaUrl || moment.songArt ? `<img src="${moment.mediaUrl || moment.songArt}" class="m-backdrop">` : ''}
                    ${mediaHtml}
                    <span class="material-icons-round double-tap-heart">favorite</span>
                    ${moment.songPreview || moment.type === 'video' ? `
                        <button class="mute-btn" onclick="event.stopPropagation(); document.querySelector('view-moments').toggleMute()">
                            <span class="material-icons-round" style="font-size:18px;">${muteIcon}</span>
                        </button>
                    ` : ''}
                </div>

                <div class="m-actions">
                    <button class="m-btn ${isLiked ? 'liked' : ''}" onclick="document.querySelector('view-moments').toggleLike('${moment.id}')">
                        <span class="material-icons-round">${isLiked ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    ${moment.allowComments !== false ? `
                    <button class="m-btn" onclick="document.querySelector('view-moments').openComments('${moment.id}')">
                        <span class="material-icons-round">chat_bubble_outline</span>
                    </button>
                    ` : ''}
                    <button class="m-btn" onclick="document.querySelector('view-moments').openReplySheet('${moment.id}')">
                        <span class="material-icons-round">send</span>
                    </button>
                </div>
                
                ${moment.caption ? `
                    <div class="m-caption">
                        <span class="m-caption-name">${moment.displayName}</span> ${this.formatCaption(moment.caption)}
                    </div>
                ` : ''}
            `;

            container.appendChild(card);
            
            if(this.observer) this.observer.observe(card);
        });
    }

    /**
     * Parses captions to inject live #hashtags with styling
     */
    formatCaption(text) {
        if (!text) return "";
        return text.replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color:var(--accent, #ff007f); cursor:pointer;">$1</span>');
    }

    /**
     * Shares via Web Share API natively if available.
     * @param {string} momentId - The moment to share
     */
    async nativeShare(momentId) {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Goorac Moment',
                    text: 'Check out this moment on Goorac Quantum!',
                    url: `https://app.goorac.com/moment/${momentId}`
                });
            } else {
                // Fallback copy to clipboard
                navigator.clipboard.writeText(`https://app.goorac.com/moment/${momentId}`);
                this.showToast("Link copied to clipboard!");
            }
        } catch (e) {
            console.log("Share aborted or failed", e);
        }
    }

    /**
     * --- OPTIONS MENU & ACTIONS ---
     */
    openOptions(momentId) {
        this.activeMomentId = momentId;
        const moment = this.moments.find(m => m.id === momentId);
        if(!moment) return;

        const overlay = this.querySelector('#options-sheet');
        const isMe = moment.uid === this.auth.currentUser?.uid;
        
        // Setup text dynamically
        this.querySelector('#opt-expires-text').innerText = `Moment expires in ${this.getTimeLeft(moment.expiresAt)}`;
        
        // Hide unfollow/block for my own moments
        const unfollowBtn = this.querySelector('#opt-unfollow-btn');
        const blockBtn = this.querySelector('#opt-block-btn');
        if(isMe) {
            unfollowBtn.style.display = 'none';
            blockBtn.style.display = 'none';
        } else {
            unfollowBtn.style.display = 'flex';
            blockBtn.style.display = 'flex';
        }

        // Reset button states
        unfollowBtn.disabled = false;
        blockBtn.disabled = false;
        unfollowBtn.innerHTML = `<span class="material-icons-round">person_remove</span> Unfollow`;
        blockBtn.innerHTML = `<span class="material-icons-round">block</span> Block User`;

        window.history.pushState({ modal: 'momentOptions' }, '');
        this.toggleBodyScroll(true);
        overlay.classList.add('open');
    }

    closeOptions(fromHistory = false) {
        this.querySelector('#options-sheet').classList.remove('open');
        
        const modalOpen = this.querySelector('#full-moment-modal').classList.contains('open');
        if (!modalOpen) this.toggleBodyScroll(false);

        if (!fromHistory && window.history.state?.modal === 'momentOptions') {
            window.history.back();
        }
    }

    async actionUnfollow(btnElement) {
        if(!this.activeMomentId) return;
        const moment = this.moments.find(m => m.id === this.activeMomentId);
        if(!moment) return;
        
        const targetUid = moment.uid;
        const myUid = this.auth.currentUser.uid;
        
        // Prevent multiple clicks
        btnElement.disabled = true;
        btnElement.innerHTML = `<div class="btn-spinner"></div> Unfollowing...`;

        try {
            const myRef = this.db.collection('users').doc(myUid);
            const theirRef = this.db.collection('users').doc(targetUid);
            
            await this.db.runTransaction(async t => {
                const myDoc = await t.get(myRef);
                const theirDoc = await t.get(theirRef);
                if(myDoc.exists && theirDoc.exists) {
                    const myFollowing = (myDoc.data().following || []).filter(i => (typeof i === 'string' ? i : i.uid) !== targetUid);
                    const theirFollowers = (theirDoc.data().followers || []).filter(i => (typeof i === 'string' ? i : i.uid) !== myUid);
                    t.update(myRef, { following: myFollowing, followingCount: firebase.firestore.FieldValue.increment(-1) });
                    t.update(theirRef, { followers: theirFollowers, followerCount: firebase.firestore.FieldValue.increment(-1) });
                }
            });
            
            this.showToast("Unfollowed successfully");
            this.closeOptions();
            
            // Remove target's moments from the feed locally
            this.moments = this.moments.filter(m => m.uid !== targetUid);
            this.renderFeed();
            if(this.isModalOpen) this.closeFullModal();
            
        } catch(e) {
            console.error(e);
            this.showToast("Error unfollowing");
            btnElement.disabled = false;
            btnElement.innerHTML = `<span class="material-icons-round">person_remove</span> Unfollow`;
        }
    }

    async actionBlock(btnElement) {
        if(!this.activeMomentId) return;
        const moment = this.moments.find(m => m.id === this.activeMomentId);
        if(!moment) return;
        
        const targetUid = moment.uid;
        const myUid = this.auth.currentUser.uid;
        
        btnElement.disabled = true;
        btnElement.innerHTML = `<div class="btn-spinner" style="border-top-color:#ff3b30;"></div> Blocking...`;

        try {
            const myRef = this.db.collection('users').doc(myUid);
            const theirRef = this.db.collection('users').doc(targetUid);
            
            await this.db.runTransaction(async t => {
                const myDoc = await t.get(myRef);
                const theirDoc = await t.get(theirRef);
                if(myDoc.exists && theirDoc.exists) {
                    const myFollowing = (myDoc.data().following || []).filter(i => (typeof i === 'string' ? i : i.uid) !== targetUid);
                    const myFollowers = (myDoc.data().followers || []).filter(i => (typeof i === 'string' ? i : i.uid) !== targetUid);
                    const theirFollowing = (theirDoc.data().following || []).filter(i => (typeof i === 'string' ? i : i.uid) !== myUid);
                    const theirFollowers = (theirDoc.data().followers || []).filter(i => (typeof i === 'string' ? i : i.uid) !== myUid);
                    
                    t.update(myRef, { blocked: firebase.firestore.FieldValue.arrayUnion(targetUid), following: myFollowing, followers: myFollowers });
                    t.update(theirRef, { following: theirFollowing, followers: theirFollowers });
                }
            });
            
            this.showToast("User blocked");
            this.closeOptions();
            
            this.moments = this.moments.filter(m => m.uid !== targetUid);
            this.renderFeed();
            if(this.isModalOpen) this.closeFullModal();
            
        } catch(e) {
            console.error(e);
            this.showToast("Error blocking user");
            btnElement.disabled = false;
            btnElement.innerHTML = `<span class="material-icons-round">block</span> Block User`;
        }
    }


    /**
     * --- FULL SCREEN MODAL ENGINE ---
     * Opens the detailed view, calculates complex metrics, triggers views,
     * and handles media playback handoffs.
     * @param {string} momentId 
     */
    async openFullModal(momentId) {
        // 🚀 DOUBLE TAP DETECTOR LOGIC
        const now = Date.now();
        if (this.lastClickTime && (now - this.lastClickTime) < 300) {
            this.toggleLike(momentId);
            this.showHeartAnimation(momentId, this.isModalOpen);
            this.lastClickTime = 0; 
            return;
        }
        this.lastClickTime = now;

        // Prevent pushing history state multiple times if the user single-taps the already open modal
        if (this.isModalOpen && this.activeMomentId === momentId) {
            return;
        }

        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;
        
        this.activeMomentId = momentId;
        const modal = this.querySelector('#full-moment-modal');
        const content = this.querySelector('#full-modal-content');
        const moreBtn = this.querySelector('#modal-more-btn');
        
        // Push state for Android Back Button trapping ONLY if it's not already open
        if (!this.isModalOpen) {
            window.history.pushState({ modal: 'momentFull' }, '');
            this.toggleBodyScroll(true);
            modal.classList.add('open');
        }

        // Setup Header Option Button
        moreBtn.style.display = 'block';
        moreBtn.setAttribute('onclick', `document.querySelector('view-moments').openOptions('${moment.id}')`);

        // 🚀 CRITICAL FIX: EXPLICITLY TRIGGER "VIEWED" EVENT IMMEDIATELY ON MODAL OPEN
        this.markAsSeen(momentId, moment);

        // Swap Audio Player Control to Modal Context
        this.isModalOpen = true;
        this.audioPlayer.pause(); // Always pause the background feed audio
        if (moment.songPreview) {
            this.modalAudioPlayer.src = moment.songPreview;
            this.modalAudioPlayer.muted = this.isMuted; // Respect global mute state
            const playPromise = this.modalAudioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    this.handleAutoplayBlock(); // Forcefully trigger visual pulsing cue
                });
            }
        }

        // Setup Meta View Data - using cache state fallback for optimistic rendering
        const isMe = moment.uid === this.auth.currentUser.uid;
        const isLiked = (moment.likes && moment.likes.includes(this.auth.currentUser.uid)) || (this.localLikes && this.localLikes.includes(momentId));
        const viewsCount = moment.viewers ? moment.viewers.length : 0;
        const likesCount = moment.likes ? moment.likes.length : 0;

        let mediaHtml = '';
        if (moment.type === 'video') mediaHtml = `<video src="${moment.mediaUrl}" class="m-media" loop autoplay playsinline ${this.isMuted ? 'muted' : ''}></video>`;
        else if (moment.type === 'image') mediaHtml = `<img src="${moment.mediaUrl}" class="m-media">`;
        else {
            let effectClass = '';
            if (moment.effect === 'glow') effectClass = 'fx-glow';
            else if (moment.effect === 'shadow') effectClass = 'fx-shadow';

            mediaHtml = `<div class="m-media ${effectClass}" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align || 'center'}; color:#fff; padding:30px; font-size:32px; word-break:break-word; white-space:pre-wrap;">${moment.text}</div>`;
        }

        let viewersHtml = '';
        if (isMe) {
            viewersHtml = `<div class="advanced-viewers-list">`;
            
            const likers = moment.likes || [];
            const viewers = moment.viewers || [];
            const allUids = [...new Set([...likers, ...viewers])];
            
            // Prioritize Likers at the top of the list
            allUids.sort((a, b) => {
                const aLiked = likers.includes(a);
                const bLiked = likers.includes(b);
                return aLiked === bLiked ? 0 : aLiked ? -1 : 1;
            });

            if (allUids.length === 0) {
                viewersHtml += `<div style="text-align:center; color:#666; font-size:13px; padding: 20px;">No views yet. Share it around!</div>`;
            } else {
                // Fetch profiles for viewer list
                for (let vid of allUids) {
                    try {
                        const vDoc = await this.db.collection('users').doc(vid).get();
                        if (vDoc.exists) {
                            const vData = vDoc.data();
                            const hasLiked = likers.includes(vid);
                            
                            viewersHtml += `
                                <div class="viewer-row">
                                    <div class="viewer-info">
                                        <img src="${vData.photoURL || 'https://via.placeholder.com/40'}" class="viewer-avatar">
                                        <div class="viewer-name">
                                            ${vData.name || vData.username}
                                            ${vData.verified ? '<span class="material-icons-round" style="color:#0095f6; font-size:14px;">verified</span>' : ''}
                                        </div>
                                    </div>
                                    <div class="viewer-action-icon">
                                        ${hasLiked ? 
                                            `<span class="material-icons-round" style="color:#ff3b30; font-size:20px;">favorite</span>` : 
                                            `<span class="material-icons-round" style="color:#888; font-size:20px;">visibility</span>`
                                        }
                                    </div>
                                </div>
                            `;
                        }
                    } catch(e) { console.warn("Missing viewer data lookup", e); }
                }
            }
            viewersHtml += `</div>`;
        }

        const timerDisplay = moment.isActive !== false ? "Active 24h" : "Archived";
        
        // Hide Archive Button Logic for 24+ hour moments or natively inactive moments
        const nowMs = Date.now();
        const isExpired = moment.expiresAt && (moment.expiresAt.toDate ? moment.expiresAt.toDate().getTime() : (moment.expiresAt.seconds ? moment.expiresAt.seconds * 1000 : new Date(moment.expiresAt).getTime())) < nowMs;
        const showArchiveBtn = moment.isActive !== false && !isExpired;

        // Inject Content
        // -> Modifications Made Inline Below: Applied `display: none !important;` directly to the `span` and `div` elements responsible for rendering likes/views for OTHER users (!isMe branch) to guarantee line-by-line parity.
        content.innerHTML = `
            <div class="m-canvas" style="aspect-ratio: auto; height: 55vh; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                 ${moment.mediaUrl || moment.songArt ? `<img src="${moment.mediaUrl || moment.songArt}" class="m-backdrop">` : ''}
                 ${mediaHtml}
                 <span class="material-icons-round double-tap-heart">favorite</span>
                 
                 ${moment.songPreview || moment.type === 'video' ? `
                     <button class="mute-btn" onclick="event.stopPropagation(); document.querySelector('view-moments').toggleMute()">
                         <span class="material-icons-round" style="font-size:18px;">${this.isMuted ? 'volume_off' : 'volume_up'}</span>
                     </button>
                 ` : ''}

                 <div class="tap-to-enable-audio" id="audio-enable-overlay">
                    <span class="material-icons-round" style="font-size:48px; margin-bottom:10px;">volume_up</span>Tap to enable audio
                 </div>
            </div>
            
            <div style="padding: 20px;" class="hide-ui-transition m-actions-container">
                <div class="m-header" style="padding:0; cursor:pointer;" onclick="event.stopPropagation(); window.location.href='userProfile.html?user=${moment.username}'">
                    <img src="${moment.pfp}" class="m-pfp">
                    <div class="m-user-info">
                        <div class="m-name-row">
                            ${moment.displayName} 
                            ${moment.verified ? '<span class="material-icons-round m-verified">verified</span>' : ''}
                            <span style="font-size:11px; color:#888; font-weight:normal;">• ${this.getRelativeTime(moment.createdAt)}</span>
                        </div>
                        ${moment.songName ? `<div class="m-song"><span class="material-icons-round" style="font-size:12px;">music_note</span>${moment.songName}</div>` : ''}
                    </div>
                </div>

                <div class="m-caption" style="padding: 15px 0 0; font-size:15px;">
                    ${this.formatCaption(moment.caption)}
                </div>

                ${isMe ? `
                    <div class="my-stats-box">
                        <div><div class="stat-num live-likes-count">${likesCount}</div><div class="stat-lbl">Likes</div></div>
                        <div><div class="stat-num live-views-count">${viewsCount}</div><div class="stat-lbl">Views</div></div>
                        <div><div class="stat-num" style="font-size: 14px; margin-top: 4px; color:#00ba7c;">${timerDisplay}</div><div class="stat-lbl">Status</div></div>
                    </div>
                    
                    <div class="m-action-btn-row">
                        <button class="m-action-btn primary" onclick="window.location.href='moments.html'">
                            <span class="material-icons-round">add_circle_outline</span> New
                        </button>
                        ${moment.allowComments !== false ? `
                        <button class="m-action-btn primary" onclick="document.querySelector('view-moments').openComments('${moment.id}')" style="background: rgba(255, 255, 255, 0.15); color: #fff;">
                            <span class="material-icons-round">chat_bubble_outline</span> Comments
                        </button>
                        ` : ''}
                        ${showArchiveBtn ? `
                        <button class="m-action-btn secondary" onclick="document.querySelector('view-moments').archiveMoment('${moment.id}')">
                            <span class="material-icons-round">inventory_2</span> Archive
                        </button>
                        ` : ''}
                        <button class="m-action-btn danger" onclick="document.querySelector('view-moments').deleteMoment('${moment.id}')">
                            <span class="material-icons-round">delete_outline</span> Delete
                        </button>
                    </div>

                    <h3 style="font-size: 14px; margin: 15px 0 5px; border-bottom: 1px solid #222; padding-bottom: 10px;">Activity Viewers</h3>
                    ${viewersHtml}
                ` : `
                    <div class="m-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); justify-content: space-around; align-items: center;">
                        <div style="display:flex; align-items:center; gap: 8px;">
                            <button class="m-btn ${isLiked ? 'liked' : ''}" onclick="const vm = document.querySelector('view-moments'); vm.toggleLike('${moment.id}'); const icon = this.querySelector('span.material-icons-round'); if(this.classList.contains('liked')){this.classList.remove('liked');icon.innerText='favorite_border';}else{this.classList.add('liked');icon.innerText='favorite';}">
                                <span class="material-icons-round">${isLiked ? 'favorite' : 'favorite_border'}</span>
                            </button>
                            <span class="live-likes-count-basic" style="font-weight:600; font-size:14px; color:#fff; display:none !important;">${likesCount}</span>
                        </div>
                        ${moment.allowComments !== false ? `
                        <button class="m-btn" onclick="document.querySelector('view-moments').openComments('${moment.id}')">
                            <span class="material-icons-round">chat_bubble_outline</span>
                        </button>
                        ` : ''}
                        <button class="m-btn" onclick="document.querySelector('view-moments').openReplySheet('${moment.id}')">
                            <span class="material-icons-round">send</span>
                        </button>
                        <div style="display:none !important; align-items:center; gap: 5px; color:#888; font-size:13px; font-weight:600;">
                            <span class="material-icons-round" style="font-size:18px;">visibility</span>
                            <span class="live-views-count-basic">${viewsCount}</span>
                        </div>
                    </div>
                `}
            </div>
        `;

        // Wait a tick for DOM
        setTimeout(() => {
            const vid = content.querySelector('video');
            const canvas = content.querySelector('.m-canvas');
            const pFill = this.querySelector('#modal-progress');
            const hBar = this.querySelector('.m-full-header');
            const actionsBlock = content.querySelector('.m-actions-container');

            // Handle Video Play & Progress Updates
            const handleProgress = (e) => {
                const media = e.target;
                if(!media || !media.duration) return;
                const pct = (media.currentTime / media.duration) * 100;
                if(pFill) pFill.style.width = `${pct}%`;
            };

            if (vid) {
                vid.muted = this.isMuted; // Match global state
                const vp = vid.play(); // Always attempt to play (muted videos auto-play fine)
                if (vp !== undefined) {
                    vp.catch(() => {
                        this.handleAutoplayBlock(); // Forcefully trigger visual pulsing cue
                    });
                }
                vid.addEventListener('timeupdate', handleProgress);
            } else if (moment.songPreview) {
                this.modalAudioPlayer.addEventListener('timeupdate', handleProgress);
            }

            // Instagram Long Press / Tap logic
            const startPress = (e) => {
                this.pressTimer = setTimeout(() => {
                    this.isPressing = true;
                    if(vid) vid.pause();
                    else this.modalAudioPlayer.pause();
                    
                    if(hBar) hBar.classList.add('hide-ui');
                    if(actionsBlock) actionsBlock.classList.add('hide-ui');
                }, 200); // 200ms delay to distinguish from quick tap
            };

            const endPress = (e) => {
                clearTimeout(this.pressTimer);
                if(this.isPressing) {
                    this.isPressing = false;
                    
                    // Resync audio muting in case state drifted during pause
                    if(vid) {
                        vid.muted = this.isMuted;
                        vid.play().catch(()=>{});
                    } else {
                        this.modalAudioPlayer.muted = this.isMuted;
                        this.modalAudioPlayer.play().catch(()=>{});
                    }
                    
                    if(hBar) hBar.classList.remove('hide-ui');
                    if(actionsBlock) actionsBlock.classList.remove('hide-ui');
                } else {
                    // It was a quick tap. Toggle Audio state.
                    this.toggleMute();
                }
            };

            if(canvas) {
                canvas.addEventListener('touchstart', startPress);
                canvas.addEventListener('touchend', endPress);
                canvas.addEventListener('mousedown', startPress);
                canvas.addEventListener('mouseup', endPress);
                canvas.addEventListener('mouseleave', endPress);
            }
        }, 50);

        // Suspend background feed video playback to save memory/processing
        const feedVideo = this.querySelector(`.m-card[data-id="${momentId}"] video`);
        if(feedVideo) feedVideo.pause();
    }

    /**
     * Reverts modal state and returns back to standard feed viewing
     */
    closeFullModal(fromHistory = false) {
        const modal = this.querySelector('#full-moment-modal');

        // ADDED: Kill full screen modal video audio and playback entirely before closing
        const contentContainer = this.querySelector('#full-modal-content');
        if (contentContainer) {
            const modalVideo = contentContainer.querySelector('video');
            if (modalVideo) {
                modalVideo.pause();
                modalVideo.muted = true; // force mute immediately
                modalVideo.removeAttribute('src'); // Fully detach to kill audio
                modalVideo.load();
            }
        }

        const restoringMomentId = this.activeMomentId;

        modal.classList.remove('open');
        this.activeMomentId = null;
        this.toggleBodyScroll(false);
        
        // Reset Progress Bar
        const pFill = this.querySelector('#modal-progress');
        if(pFill) pFill.style.width = '0%';

        if (!fromHistory && window.history.state?.modal === 'momentFull') {
            window.history.back();
        }

        // Revert Audio Context back to Background Feed
        this.isModalOpen = false;
        this.modalAudioPlayer.pause();
        this.modalAudioPlayer.src = '';
        
        if (!this.isMuted && this.audioPlayer.src) {
            this.audioPlayer.play().catch(()=>{});
        }

        // ADDED: Resume feed video gracefully if it is in view
        if (restoringMomentId) {
            const feedVideo = this.querySelector(`.m-card[data-id="${restoringMomentId}"] video.m-media`);
            if(feedVideo) {
                feedVideo.muted = this.isMuted;
                let playPromise = feedVideo.play();
                if (playPromise !== undefined) playPromise.catch(()=>{});
            }
        }
    }

    /**
     * Private Creator Utility: Archives moment prematurely.
     */
    async archiveMoment(momentId) {
        if(confirm("Archive this moment? It will be removed from feeds but remain in your history.")) {
            await this.db.collection('moments').doc(momentId).update({ isActive: false });
            this.moments = this.moments
