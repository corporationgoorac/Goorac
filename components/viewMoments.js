/*
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
 * - Bottom Sheet Modals (Comments & Replies)
 * - Toast Notification System
 * - Advanced CSS Architecture & Animations
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
                    localStorage.setItem('goorac_moments_last_uid', user.uid);
                    this.moments = [];
                    this.renderFeed(); // clear UI
                }

                try {
                    // Fetch full user profile for relations and meta
                    const doc = await this.db.collection('users').doc(user.uid).get();
                    if (doc.exists) {
                        this.currentUserData = { uid: user.uid, ...doc.data() };
                        this.initFeed(user.uid);
                    }
                } catch (error) {
                    console.error("Failed to fetch user data on auth state change:", error);
                    this.showToast("Network error while loading profile.");
                }
            } else {
                // User logged out, clear sensitive cache
                localStorage.removeItem('goorac_moments_cache');
                localStorage.removeItem('goorac_moments_last_uid');
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
            
            if (fullModal && fullModal.classList.contains('open') && (!e.state || e.state.modal !== 'momentFull')) {
                this.closeFullModal(true);
            }
            if (commentSheet && commentSheet.classList.contains('open') && (!e.state || e.state.modal !== 'momentComments')) {
                this.closeComments(true);
            }
            if (replySheet && replySheet.classList.contains('open') && (!e.state || e.state.modal !== 'momentReply')) {
                this.closeReplySheet(true);
            }
        });

        // 🚀 CRITICAL BUG FIX: Smart Keyboard Handling using Visual Viewport
        // Instead of margin-bottom which pushes things off screen, we tightly bind the height
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const activeOverlay = this.querySelector('.c-overlay.open');
                if (activeOverlay) {
                    // Match overlay exactly to visual viewport height.
                    // This prevents the OS from shoving the entire container upwards into oblivion.
                    activeOverlay.style.height = `${window.visualViewport.height}px`;
                    window.scrollTo(0, 0); // Lock body scroll to prevent native browser jump
                }
            });
        }

        // Keep input fields visually centered on focus
        const inputs = this.querySelectorAll('.c-input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 300);
            });
            
            // Reset overlay height when keyboard closes
            input.addEventListener('blur', () => {
                const activeOverlay = this.querySelector('.c-overlay.open');
                if (activeOverlay) {
                    activeOverlay.style.height = '100dvh'; // Reset to default
                }
            });
        });
    }

    /**
     * UTILS: Toggles the background body scroll to prevent 
     * double-scrolling when modals are open.
     * @param {boolean} lock - True to lock, false to unlock
     */
    toggleBodyScroll(lock) {
        if (lock) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed'; // Hard lock for iOS
            document.body.style.width = '100%';
        } else {
            const modalOpen = this.querySelector('#full-moment-modal').classList.contains('open');
            const sheetOpen = this.querySelector('#comment-sheet').classList.contains('open');
            const replyOpen = this.querySelector('#reply-sheet').classList.contains('open');
            
            if (!modalOpen && !sheetOpen && !replyOpen) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
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
     * UTILS: Displays a non-intrusive notification toast on the screen.
     * Useful for feedback on actions like replying or saving.
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
        } catch(e) { 
            console.error("Relations compilation error:", e); 
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
                // Cache latest 6 for immediate launch rendering next time
                localStorage.setItem('goorac_moments_cache', JSON.stringify(this.moments.slice(0, 6))); 
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
                    const expireTime = m.expiresAt.seconds ? m.expiresAt.seconds * 1000 : m.expiresAt;
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
                
                if (entry.isIntersecting) {
                    // Prevent background music playing if the Full Modal is actively open
                    if (moment && moment.songPreview && !this.isModalOpen) {
                        this.playMomentMusic(moment.songPreview);
                    }
                    
                    // Mark as viewed after 1.5 seconds of intersection focus
                    this.seenTimers[momentId] = setTimeout(() => {
                        this.markAsSeen(momentId, moment);
                    }, 1500);
                    
                } else {
                    // Clear timer if user scrolls past too quickly
                    clearTimeout(this.seenTimers[momentId]);
                }
            });
        }, options);
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
        
        // Catch DOM exceptions (like auto-play policy blocks) silently
        const playPromise = this.audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Auto-play was prevented. This is normal on first load.
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
            if (this.isModalOpen) {
                this.modalAudioPlayer.play().catch(()=>{});
            } else {
                this.audioPlayer.play().catch(()=>{});
            }
        } else {
            this.audioPlayer.pause();
            this.modalAudioPlayer.pause();
        }
        
        // Update live modal UI mute icon instantly
        const modalMute = this.querySelector('#full-moment-modal .mute-btn span');
        if (modalMute) modalMute.innerText = this.isMuted ? 'volume_off' : 'volume_up';
        
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

        const isLiked = moment.likes && moment.likes.includes(myUid);
        const ref = this.db.collection('moments').doc(momentId);

        if (isLiked) {
            // Unlike Sequence
            moment.likes = moment.likes.filter(id => id !== myUid);
            this.renderFeed(); // Re-render feed card icons
            
            // Re-render modal stats dynamically if open
            if (this.isModalOpen && this.activeMomentId === momentId) {
                const likesStatNode = this.querySelector('.live-likes-count');
                if (likesStatNode) likesStatNode.innerText = moment.likes.length;
            }
            
            await ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) }).catch(e=>console.warn(e));
        } else {
            // Like Sequence
            if(!moment.likes) moment.likes = [];
            moment.likes.push(myUid);
            this.renderFeed(); 
            
            if (this.isModalOpen && this.activeMomentId === momentId) {
                const likesStatNode = this.querySelector('.live-likes-count');
                if (likesStatNode) likesStatNode.innerText = moment.likes.length;
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
                <div class="m-full-header">
                    <span class="material-icons-round" onclick="document.querySelector('view-moments').closeFullModal()" style="cursor:pointer; font-size:28px;">arrow_back</span>
                    <span style="font-weight: 700; font-size: 16px;">Moment Info</span>
                    <span style="width:28px;"></span> 
                </div>
                <div id="full-modal-content" style="flex:1; overflow-y:auto; overflow-x:hidden; padding-bottom: 40px;"></div>
            </div>

            <div class="c-overlay" id="comment-sheet" onclick="if(event.target === this) document.querySelector('view-moments').closeComments()">
                <div class="c-sheet" onclick="event.stopPropagation()">
                    <div class="c-header" onclick="document.querySelector('view-moments').closeComments()">
                        <div class="c-drag"></div><div class="c-title">Comments</div>
                    </div>
                    <div class="c-list" id="comment-list-container"></div>
                    <div class="c-input-area">
                        <img src="" id="c-my-pfp" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                        <input type="text" class="c-input" id="c-input-field" placeholder="Add a comment...">
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
                            <input type="text" class="c-input" id="r-input-field" placeholder="Send a message..." style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);">
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
            const isLiked = moment.likes && moment.likes.includes(myUid);
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
                mediaHtml = `<div class="m-media" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align}; color:#fff; padding:30px; font-size:28px; word-break:break-word;">${moment.text}</div>`;
            }

            const muteIcon = this.isMuted ? 'volume_off' : 'volume_up';
            const cfBadge = moment.audience === 'close_friends' ? `<div style="display:inline-flex; align-items:center; justify-content:center; background:#00ba7c; border-radius:50%; width:14px; height:14px; margin-left:4px;"><svg width="8" height="8" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>` : '';

            card.innerHTML = `
                <div class="m-header">
                    <img src="${moment.pfp}" class="m-pfp">
                    <div class="m-user-info">
                        <div class="m-name-row">
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
                    <span class="material-icons-round" style="color:#fff; cursor:pointer;" onclick="document.querySelector('view-moments').nativeShare('${moment.id}')">share</span>
                </div>

                <div class="m-canvas" onclick="document.querySelector('view-moments').openFullModal('${moment.id}')">
                    ${moment.mediaUrl || moment.songArt ? `<img src="${moment.mediaUrl || moment.songArt}" class="m-backdrop">` : ''}
                    ${mediaHtml}
                    <span class="material-icons-round double-tap-heart">favorite</span>
                    ${moment.songPreview ? `
                        <button class="mute-btn" onclick="event.stopPropagation(); document.querySelector('view-moments').toggleMute()">
                            <span class="material-icons-round" style="font-size:18px;">${muteIcon}</span>
                        </button>
                    ` : ''}
                </div>

                <div class="m-actions">
                    <button class="m-btn ${isLiked ? 'liked' : ''}" onclick="document.querySelector('view-moments').toggleLike('${moment.id}')">
                        <span class="material-icons-round">${isLiked ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button class="m-btn" onclick="document.querySelector('view-moments').openComments('${moment.id}')">
                        <span class="material-icons-round">chat_bubble_outline</span>
                    </button>
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
     * --- FULL SCREEN MODAL ENGINE ---
     * Opens the detailed view, calculates complex metrics, triggers views,
     * and handles media playback handoffs.
     * @param {string} momentId 
     */
    async openFullModal(momentId) {
        // 🚀 DOUBLE TAP DETECTOR LOGIC
        const now = Date.now();
        if (this.lastClickTime && (now - this.lastClickTime) < 300 && this.activeMomentId === momentId) {
            this.toggleLike(momentId);
            this.showHeartAnimation(momentId, true);
            this.lastClickTime = 0; 
            return;
        }
        this.lastClickTime = now;

        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;
        
        this.activeMomentId = momentId;
        const modal = this.querySelector('#full-moment-modal');
        const content = this.querySelector('#full-modal-content');
        
        // Push state for Android Back Button trapping
        window.history.pushState({ modal: 'momentFull' }, '');
        this.toggleBodyScroll(true);
        modal.classList.add('open');

        // 🚀 CRITICAL FIX: EXPLICITLY TRIGGER "VIEWED" EVENT IMMEDIATELY ON MODAL OPEN
        this.markAsSeen(momentId, moment);

        // Swap Audio Player Control to Modal Context
        this.isModalOpen = true;
        if (!this.isMuted) {
            this.audioPlayer.pause();
            if (moment.songPreview) {
                this.modalAudioPlayer.src = moment.songPreview;
                this.modalAudioPlayer.muted = false;
                this.modalAudioPlayer.play().catch(()=>{});
            }
        }

        // Setup Meta View Data
        const isMe = moment.uid === this.auth.currentUser.uid;
        const isLiked = moment.likes && moment.likes.includes(this.auth.currentUser.uid);
        const viewsCount = moment.viewers ? moment.viewers.length : 0;
        const likesCount = moment.likes ? moment.likes.length : 0;

        let mediaHtml = '';
        if (moment.type === 'video') mediaHtml = `<video src="${moment.mediaUrl}" class="m-media" loop autoplay playsinline ${this.isMuted ? 'muted' : ''}></video>`;
        else if (moment.type === 'image') mediaHtml = `<img src="${moment.mediaUrl}" class="m-media">`;
        else mediaHtml = `<div class="m-media" style="background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; font-family:${moment.font}; text-align:${moment.align}; color:#fff; padding:30px; font-size:32px; word-break:break-word;">${moment.text}</div>`;

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

        // Inject Content
        content.innerHTML = `
            <div class="m-canvas" style="aspect-ratio: auto; height: 55vh; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" onclick="document.querySelector('view-moments').openFullModal('${moment.id}')">
                 ${moment.mediaUrl || moment.songArt ? `<img src="${moment.mediaUrl || moment.songArt}" class="m-backdrop">` : ''}
                 ${mediaHtml}
                 <span class="material-icons-round double-tap-heart">favorite</span>
                 ${moment.songPreview ? `
                    <button class="mute-btn" onclick="event.stopPropagation(); document.querySelector('view-moments').toggleMute()">
                        <span class="material-icons-round" style="font-size:18px;">${this.isMuted ? 'volume_off' : 'volume_up'}</span>
                    </button>
                ` : ''}
            </div>
            
            <div style="padding: 20px;">
                <div class="m-header" style="padding:0;">
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
                        <button class="m-action-btn secondary" onclick="document.querySelector('view-moments').archiveMoment('${moment.id}')">
                            <span class="material-icons-round">inventory_2</span> Archive
                        </button>
                        <button class="m-action-btn danger" onclick="document.querySelector('view-moments').deleteMoment('${moment.id}')">
                            <span class="material-icons-round">delete_outline</span> Delete
                        </button>
                    </div>

                    <h3 style="font-size: 14px; margin: 15px 0 5px; border-bottom: 1px solid #222; padding-bottom: 10px;">Activity Viewers</h3>
                    ${viewersHtml}
                ` : `
                    <div class="m-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); justify-content: space-around;">
                        <button class="m-btn ${isLiked ? 'liked' : ''}" onclick="const vm = document.querySelector('view-moments'); vm.toggleLike('${moment.id}'); const icon = this.querySelector('span'); if(this.classList.contains('liked')){this.classList.remove('liked');icon.innerText='favorite_border';}else{this.classList.add('liked');icon.innerText='favorite';}">
                            <span class="material-icons-round">${isLiked ? 'favorite' : 'favorite_border'}</span>
                        </button>
                        <button class="m-btn" onclick="document.querySelector('view-moments').openComments('${moment.id}')">
                            <span class="material-icons-round">chat_bubble_outline</span>
                        </button>
                        <button class="m-btn" onclick="document.querySelector('view-moments').openReplySheet('${moment.id}')">
                            <span class="material-icons-round">send</span>
                        </button>
                        <button class="m-btn" onclick="document.querySelector('view-moments').nativeShare('${moment.id}')">
                            <span class="material-icons-round">share</span>
                        </button>
                    </div>
                `}
            </div>
        `;

        // Suspend background feed video playback to save memory/processing
        const feedVideo = this.querySelector(`.m-card[data-id="${momentId}"] video`);
        if(feedVideo) feedVideo.pause();
    }

    /**
     * Reverts modal state and returns back to standard feed viewing
     */
    closeFullModal(fromHistory = false) {
        const modal = this.querySelector('#full-moment-modal');
        modal.classList.remove('open');
        this.activeMomentId = null;
        this.toggleBodyScroll(false);
        
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
    }

    /**
     * Private Creator Utility: Archives moment prematurely.
     */
    async archiveMoment(momentId) {
        if(confirm("Archive this moment? It will be removed from feeds but remain in your history.")) {
            await this.db.collection('moments').doc(momentId).update({ isActive: false });
            this.moments = this.moments.filter(m => m.id !== momentId);
            this.closeFullModal();
            this.renderFeed();
            this.showToast("Moment Archived Successfully");
        }
    }

    /**
     * Private Creator Utility: Deletes moment entirely.
     */
    async deleteMoment(momentId) {
        if(confirm("Permanently delete this moment? This cannot be undone.")) {
            await this.db.collection('moments').doc(momentId).delete();
            this.moments = this.moments.filter(m => m.id !== momentId);
            this.closeFullModal();
            this.renderFeed();
            this.showToast("Moment Deleted Permanently");
        }
    }

    /**
     * --- QUICK REPLY MODAL (HTML CHAT PAYLOAD) ---
     * Opens the text input area specifically for sending DMs to the creator.
     */
    openReplySheet(momentId) {
        this.activeMomentId = momentId;
        const overlay = this.querySelector('#reply-sheet');
        
        window.history.pushState({ modal: 'momentReply' }, '');
        this.toggleBodyScroll(true);
        overlay.classList.add('open');
        
        // Auto-focus logic for better UX
        setTimeout(() => this.querySelector('#r-input-field').focus(), 300);
    }

    /**
     * Closes the text input drawer cleanly.
     */
    closeReplySheet(fromHistory = false) {
        this.querySelector('#reply-sheet').classList.remove('open');
        this.querySelector('#r-input-field').value = ''; // Reset input
        
        // Restore body scroll IF no other modals are still layered underneath
        const modalOpen = this.querySelector('#full-moment-modal').classList.contains('open');
        if (!modalOpen) this.toggleBodyScroll(false);

        if (!fromHistory && window.history.state?.modal === 'momentReply') {
            window.history.back();
        }
    }

    /**
     * Dispatches the formatted HTML payload directly into the user's chat pipeline.
     */
    async sendReply(quickEmoji = null) {
        const input = this.querySelector('#r-input-field');
        const text = quickEmoji || input.value.trim();
        
        if (!text || !this.activeMomentId || !this.currentUserData) return;

        const momentId = this.activeMomentId;
        const moment = this.moments.find(m => m.id === momentId);
        if (!moment) return;

        const myUid = this.currentUserData.uid;
        const targetUid = moment.uid;
        if (myUid === targetUid) return; 

        input.value = '';
        this.closeReplySheet();
        if(navigator.vibrate) navigator.vibrate(10);
        
        this.showToast("Reply Sending...", "send");

        const chatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;
        
        // Generating Mini HTML Box Payload matching Goorac Chat specifications
        let mediaThumb = '';
        if (moment.type === 'image' || moment.type === 'video') {
            mediaThumb = `<img src="${moment.mediaUrl}" style="width:45px; height:45px; object-fit:cover; border-radius:8px; flex-shrink:0;">`;
        } else if (moment.type === 'text') {
            mediaThumb = `<div style="width:45px; height:45px; border-radius:8px; background:${moment.bgColor}; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:bold; overflow:hidden; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">Aa</div>`;
        }

        const snippet = moment.caption || (moment.type === 'text' ? moment.text : 'A moment');

        const htmlPayload = `
            <div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:14px; border-left:4px solid #ff007f; margin-bottom:8px; display:flex; gap:12px; align-items:center;">
                ${mediaThumb}
                <div style="display:flex; flex-direction:column; overflow:hidden; flex:1;">
                    <span style="font-size:11px; color:#aaa; margin-bottom:3px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Replied to your moment</span>
                    <span style="font-size:13px; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">"${snippet}"</span>
                </div>
            </div>
            <div style="font-size:15px; color:#fff; word-break:break-word;">${text}</div>
        `;

        try {
            const chatRef = this.db.collection("chats").doc(chatId);
            
            // Add Message Doc
            await chatRef.collection("messages").add({
                text: htmlPayload,
                sender: myUid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                seen: false,
                isHtml: true 
            });

            // Update Chat Meta
            await chatRef.set({
                lastMessage: "Replied to a moment", 
                lastSender: myUid,
                lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                participants: [myUid, targetUid],
                seen: false, 
                [`unreadCount.${targetUid}`]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            this.sendNotification(targetUid, 'reply_moment', momentId, `replied to your moment: "${text}"`);
            this.showToast("Reply Sent!", "check_circle");
            
        } catch(e) {
            console.error("Failed to send reply payload", e);
            this.showToast("Failed to send reply. Check connection.", "error");
        }
    }

    /**
     * --- PUBLIC COMMENTS MODAL ENGINE ---
     * Opens public comments thread tied to a specific moment.
     */
    async openComments(momentId) {
        this.activeMomentId = momentId;
        const overlay = this.querySelector('#comment-sheet');
        
        if(this.currentUserData) {
            this.querySelector('#c-my-pfp').src = this.currentUserData.photoURL;
        }

        window.history.pushState({ modal: 'momentComments' }, '');
        this.toggleBodyScroll(true);
        overlay.classList.add('open');
        
        this.commentsLastDoc = null;
        this.querySelector('#comment-list-container').innerHTML = '<div class="loader-spinner" style="display:block;"><span class="material-icons-round">refresh</span></div>';
        await this.loadComments(momentId, false);
    }

    /**
     * Shuts the comment overlay and resets state.
     */
    closeComments(fromHistory = false) {
        this.querySelector('#comment-sheet').classList.remove('open');
        
        const modalOpen = this.querySelector('#full-moment-modal').classList.contains('open');
        if (!modalOpen) {
            this.activeMomentId = null;
            this.toggleBodyScroll(false);
        }
        
        if (!fromHistory && window.history.state?.modal === 'momentComments') {
            window.history.back();
        }
    }

    /**
     * Fetches paginated subcollection comments.
     */
    async loadComments(momentId, isNextPage = false) {
        if (this.loadingComments) return;
        this.loadingComments = true;
        const myUid = this.auth.currentUser?.uid;

        let query = this.db.collection('moments').doc(momentId).collection('comments')
            .orderBy('timestamp', 'desc')
            .limit(10);

        if (isNextPage && this.commentsLastDoc) {
            query = query.startAfter(this.commentsLastDoc);
        }

        try {
            const snap = await query.get();
            const cList = this.querySelector('#comment-list-container');
            
            if (!isNextPage) cList.innerHTML = '';
            
            if (snap.empty && !isNextPage) {
                cList.innerHTML = '<div style="text-align:center; color:#666; padding:30px;">No comments yet. Start the conversation!</div>';
                this.loadingComments = false;
                return;
            }

            if(!snap.empty) this.commentsLastDoc = snap.docs[snap.docs.length - 1];

            snap.forEach(doc => {
                const c = doc.data();
                const timeStr = this.getRelativeTime(c.timestamp);
                const isCommentLiked = c.likes && c.likes.includes(myUid);
                
                const div = document.createElement('div');
                div.className = 'c-item';
                div.innerHTML = `
                    <img src="${c.pfp}" class="c-pfp">
                    <div class="c-content">
                        <div class="c-name">${c.name}</div>
                        <div class="c-text">${c.text}</div>
                        <div class="c-meta">
                            <span>${timeStr}</span>
                            <span class="c-reply-btn" onclick="document.querySelector('view-moments').replyTo('${c.name || c.username}')">Reply</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span class="material-icons-round c-like-btn" 
                              onclick="document.querySelector('view-moments').toggleCommentLike('${momentId}', '${doc.id}', this)"
                              style="font-size:16px; cursor:pointer; transition:0.2s; color: ${isCommentLiked ? '#ff3b30' : '#666'};">
                              ${isCommentLiked ? 'favorite' : 'favorite_border'}
                        </span>
                    </div>
                `;
                cList.appendChild(div);
            });
        } catch(e) {
            console.error("Comments pagination error", e);
        }

        this.loadingComments = false;
    }

    /**
     * Tags a user in the comment text box
     */
    replyTo(username) {
        const input = this.querySelector('#c-input-field');
        input.value = `@${username} `;
        input.focus();
    }

    /**
     * Handles liking specific comments within the thread.
     */
    async toggleCommentLike(momentId, commentId, iconElement) {
        const myUid = this.auth.currentUser?.uid;
        if (!myUid) return;
        
        if(navigator.vibrate) navigator.vibrate(10);
        
        const isCurrentlyLiked = iconElement.innerHTML.trim() === 'favorite';
        const ref = this.db.collection('moments').doc(momentId).collection('comments').doc(commentId);
        
        // Optimistic UI toggle logic
        if (isCurrentlyLiked) {
            iconElement.innerHTML = 'favorite_border';
            iconElement.style.color = '#666';
            iconElement.style.transform = 'scale(0.9)';
            setTimeout(() => iconElement.style.transform = 'scale(1)', 150);
            
            await ref.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) }).catch(()=>{});
        } else {
            iconElement.innerHTML = 'favorite';
            iconElement.style.color = '#ff3b30';
            iconElement.style.transform = 'scale(1.2)';
            setTimeout(() => iconElement.style.transform = 'scale(1)', 150);
            
            await ref.update({ likes: firebase.firestore.FieldValue.arrayUnion(myUid) }).catch(()=>{});
        }
    }

    /**
     * Commits a new string comment to the moment's subcollection.
     */
    async postComment() {
        const input = this.querySelector('#c-input-field');
        const text = input.value.trim();
        
        if (!text || !this.activeMomentId || !this.currentUserData) return;

        input.value = ''; 
        const momentId = this.activeMomentId;
        const moment = this.moments.find(m => m.id === momentId);

        try {
            await this.db.collection('moments').doc(momentId).collection('comments').add({
                uid: this.currentUserData.uid,
                name: this.currentUserData.name || this.currentUserData.username,
                pfp: this.currentUserData.photoURL,
                text: text,
                likes: [],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Reset pagination state and reload fresh
            this.commentsLastDoc = null;
            this.loadComments(momentId, false);

            if (moment && moment.uid !== this.currentUserData.uid) {
                this.sendNotification(moment.uid, 'comment_moment', momentId, `commented: "${text}"`);
            }
        } catch(e) { 
            console.error("Comment dispatch error", e); 
            this.showToast("Failed to post comment");
        }
    }
}

// Define HTML Web Component Element Registration
customElements.define('view-moments', ViewMoments); 
