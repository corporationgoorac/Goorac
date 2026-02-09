/**
 * ProfileNotes Component
 * Integrated Viewer + Deep Linking + Sharing + Mutual Privacy
 * Encapsulates all logic from viewNotes.js into a single profile-specific component.
 */
class ProfileNotes extends HTMLElement {
    constructor() {
        super();
        this.notes = [];
        this.targetUid = null;
        this.isMutual = false;
        this.isOwnProfile = false;
        this.selectedNote = null;
        this.db = firebase.firestore();
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
    }

    connectedCallback() {
        this.renderBase();
        this.setupOverlayClose();
    }

    /**
     * Initializes the component for a specific profile.
     * @param {string} targetUid - The UID of the profile being viewed.
     */
    async init(targetUid) {
        this.targetUid = targetUid;
        const user = firebase.auth().currentUser;
        if (!user) return;

        this.isOwnProfile = user.uid === targetUid;
        
        // Privacy Check: Only mutual friends can see notes
        if (!this.isOwnProfile) {
            try {
                const myDoc = await this.db.collection('users').doc(user.uid).get();
                const theirDoc = await this.db.collection('users').doc(targetUid).get();
                
                const myFollowing = (myDoc.data()?.following || []).map(i => typeof i === 'string' ? i : i.uid);
                const theirFollowing = (theirDoc.data()?.following || []).map(i => typeof i === 'string' ? i : i.uid);
                
                // Mutual means I follow them AND they follow me
                this.isMutual = myFollowing.includes(targetUid) && theirFollowing.includes(user.uid);
            } catch (e) {
                console.error("Mutual check failed", e);
                this.isMutual = false;
            }
        } else {
            this.isMutual = true; // Owner always sees their notes
        }

        this.fetchNotes();
    }

    fetchNotes() {
        if (!this.targetUid) return;

        this.db.collection("notes")
            .where("uid", "==", this.targetUid)
            .where("isActive", "==", true)
            .orderBy("createdAt", "desc")
            .onSnapshot(snap => {
                this.notes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.renderFeed();
                
                // Deep Link Logic: Auto-open if #note-[ID] is in URL
                const hash = window.location.hash;
                if (hash.startsWith('#note-')) {
                    const noteId = hash.replace('#note-', '');
                    if (!this.selectedNote) {
                        this.openViewer(noteId);
                    }
                }
            });
    }

    renderBase() {
        this.innerHTML = `
        <style>
            .pn-feed { display: grid; grid-template-columns: 1fr; gap: 12px; width: 100%; margin-top: 20px; }
            .pn-card { 
                padding: 18px; border-radius: 20px; border: 1px solid #1f1f1f; 
                cursor: pointer; transition: 0.2s; position: relative;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .pn-card:active { transform: scale(0.98); }
            .pn-text { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; }
            .pn-private { 
                background: #0a0a0a; border: 1px dashed #333; padding: 40px; 
                text-align: center; color: #666; border-radius: 20px;
                font-size: 14px; font-weight: 600;
            }

            /* Viewer Overlay - Matches viewNotes UI */
            .pn-overlay { 
                position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 3000; 
                display: none; align-items: flex-end; justify-content: center; backdrop-filter: blur(12px);
                opacity: 0; transition: opacity 0.3s ease;
            }
            .pn-overlay.show { display: flex; opacity: 1; }
            
            .pn-sheet { 
                background: #121212; width: 100%; max-width: 500px; padding: 24px;
                border-radius: 32px 32px 0 0; border-top: 1px solid #333;
                transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
                padding-bottom: max(30px, env(safe-area-inset-bottom));
                color: white; font-family: -apple-system, sans-serif;
            }
            .pn-overlay.show .pn-sheet { transform: translateY(0); }

            .pn-btn { 
                background: rgba(255,255,255,0.05); color: #fff; border: 1px solid #333;
                width: 100%; padding: 16px; border-radius: 18px; margin-top: 12px;
                display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700;
                cursor: pointer;
            }
            .pn-btn-primary { background: #fff; color: #000; border: none; }
            
            .pn-song-pill {
                display: inline-flex; align-items: center; gap: 6px; 
                background: rgba(255,255,255,0.15); padding: 8px 16px; 
                border-radius: 100px; margin-top: 20px; font-size: 12px; 
                font-weight: 700; backdrop-filter: blur(10px);
            }
        </style>
        <div id="pn-feed" class="pn-feed"></div>
        
        <div class="pn-overlay" id="pn-overlay">
            <div class="pn-sheet" id="pn-sheet">
                <div id="pn-viewer-content"></div>
                <div class="pn-actions" style="margin-top:20px;">
                    <button class="pn-btn pn-btn-primary" onclick="this.getRootNode().host.shareNote()">
                        <span class="material-icons-round">share</span> Share Note
                    </button>
                    <button class="pn-btn" style="background:transparent; border:none; color:#888;" onclick="this.getRootNode().host.closeViewer()">Dismiss</button>
                </div>
            </div>
        </div>
        `;
    }

    renderFeed() {
        const container = this.querySelector('#pn-feed');
        if (!this.isMutual && !this.isOwnProfile) {
            container.innerHTML = `<div class="pn-private">Thought Bubbles are Private</div>`;
            return;
        }

        if (this.notes.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#444; padding:20px; font-size:14px;">No active notes</div>`;
            return;
        }

        container.innerHTML = this.notes.map(n => `
            <div class="pn-card" style="background:${n.bgColor || '#262626'}; color:${n.textColor || '#fff'};" onclick="this.getRootNode().host.openViewer('${n.id}')">
                <div class="pn-text" style="text-align:${n.textAlign || 'center'}; font-family:${n.font || 'system-ui'}">${n.text}</div>
            </div>
        `).join('');
    }

    openViewer(noteId) {
        this.selectedNote = this.notes.find(n => n.id === noteId);
        if (!this.selectedNote) return;

        const content = this.querySelector('#pn-viewer-content');
        const n = this.selectedNote;

        // Update URL hash for deep linking support
        window.history.replaceState(null, null, `#note-${noteId}`);

        // Music Playback Logic
        if (n.songPreview) {
            this.audioPlayer.src = n.songPreview;
            this.audioPlayer.play().catch(() => console.log("Audio play deferred"));
        }

        content.innerHTML = `
            <div style="background:${n.bgColor || '#262626'}; color:${n.textColor || '#fff'}; padding:50px 24px; border-radius:24px; text-align:${n.textAlign || 'center'}; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="font-size:1.6rem; font-weight:800; line-height:1.3; font-family:${n.font || 'system-ui'}">${n.text}</div>
                ${n.songName ? `
                    <div class="pn-song-pill">
                        <span class="material-icons-round" style="font-size:14px;">music_note</span>
                        ${n.songName}
                    </div>
                ` : ''}
            </div>
            ${this.isOwnProfile ? `
                <button class="pn-btn" style="color:#ff4444; margin-top:20px; border-color:rgba(255,68,68,0.2);" onclick="this.getRootNode().host.deleteNote('${n.id}')">
                    <span class="material-icons-round">delete_outline</span> Delete Note
                </button>
            ` : ''}
        `;

        this.querySelector('#pn-overlay').classList.add('show');
        if (navigator.vibrate) navigator.vibrate(15);
    }

    closeViewer() {
        this.audioPlayer.pause();
        this.querySelector('#pn-overlay').classList.remove('show');
        this.selectedNote = null;
        // Clean up hash from URL
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }

    async shareNote() {
        if (!this.selectedNote) return;
        
        // Dynamic link generation pointing to the specific note hash
        const shareUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#note-${this.selectedNote.id}`;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Goorac Note`,
                    text: `"${this.selectedNote.text}" - View my thought bubble on Goorac!`,
                    url: shareUrl
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                alert("Note link copied to clipboard!");
            }
        } catch (err) { console.error("Share failed", err); }
    }

    async deleteNote(id) {
        if (confirm("Delete this thought bubble?")) {
            try {
                await this.db.collection("notes").doc(id).update({ isActive: false });
                this.closeViewer();
                if (navigator.vibrate) navigator.vibrate(10);
            } catch (e) { console.error("Delete failed", e); }
        }
    }

    setupOverlayClose() {
        this.querySelector('#pn-overlay').onclick = (e) => {
            if(e.target.id === 'pn-overlay') this.closeViewer();
        };
    }
}

customElements.define('profile-notes', ProfileNotes);
