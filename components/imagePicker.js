class ImagePicker extends HTMLElement {
    constructor() {
        super();
        
        // Load credentials from global CONFIG object
        // We check global scope and window explicitly
        this.apiKey = "";
        
        if (typeof CONFIG !== 'undefined') {
            this.apiKey = CONFIG.imgbbApiKey;
        } else if (window.CONFIG) {
            this.apiKey = window.CONFIG.imgbbApiKey;
        }

        this.selectedFile = null;
        this.previewUrl = null;
        this.isUploading = false;
        
        // Editor State
        this.currentRotation = 0;
        this.isGrayscale = false;
        this.cropper = null; // CropperJS instance
    }

    connectedCallback() {
        this.loadCropperResources();
        this.render();
        this.setupEvents();
    }

    // Dynamically load CropperJS so you don't need to add it to <head> manually
    loadCropperResources() {
        if (!document.getElementById('cropper-css')) {
            const link = document.createElement('link');
            link.id = 'cropper-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
            document.head.appendChild(link);
        }
        if (!window.Cropper) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
            document.head.appendChild(script);
        }
    }

    render() {
        this.innerHTML = `
        <style>
            :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            
            /* --- OVERLAY & ANIMATION --- */
            .ip-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #000; z-index: 10000;
                display: none; flex-direction: column;
                opacity: 0; transition: opacity 0.25s ease-in-out;
            }
            .ip-overlay.open { display: flex; opacity: 1; }

            /* --- HEADER --- */
            .ip-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 15px 20px; 
                background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
                position: absolute; top: 0; left: 0; width: 100%; z-index: 20;
                box-sizing: border-box; pointer-events: none; /* Let clicks pass to cropper if needed */
            }
            .ip-header > * { pointer-events: auto; } /* Re-enable pointer events for buttons */
            
            .ip-btn-icon {
                background: rgba(255,255,255,0.15); border: none; color: white; 
                width: 40px; height: 40px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; backdrop-filter: blur(10px);
                transition: transform 0.1s, background 0.2s;
            }
            .ip-btn-icon:active { transform: scale(0.9); background: rgba(255,255,255,0.3); }
            .ip-btn-icon svg { width: 24px; height: 24px; fill: white; }

            .ip-title { 
                color: white; font-weight: 600; font-size: 1rem; 
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }

            .ip-send-btn { 
                background: #3b82f6; color: white; border: none; 
                padding: 8px 24px; border-radius: 20px; font-weight: 600; cursor: pointer; 
                box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                transition: transform 0.1s, background 0.2s;
            }
            .ip-send-btn:active { transform: scale(0.95); background: #2563eb; }

            /* --- PREVIEW AREA --- */
            .ip-preview-container {
                flex: 1; display: flex; justify-content: center; align-items: center;
                overflow: hidden; position: relative; background: #000;
                width: 100%; height: 100%;
            }
            
            .ip-image {
                max-width: 100%; max-height: 80vh; 
                object-fit: contain;
                display: block; /* Important for CropperJS */
                transition: filter 0.3s ease; /* Remove transform transition to avoid conflict with cropper */
            }

            /* --- TOOLBAR --- */
            .ip-toolbar {
                padding: 30px 20px; background: #121212; 
                display: flex; justify-content: space-around; align-items: center;
                border-top: 1px solid #333;
                padding-bottom: max(30px, env(safe-area-inset-bottom));
                z-index: 20;
            }

            .ip-tool {
                display: flex; flex-direction: column; align-items: center; gap: 8px;
                color: #888; background: none; border: none; font-size: 0.75rem; cursor: pointer;
                transition: color 0.2s; width: 60px;
            }
            .ip-tool svg { width: 28px; height: 28px; fill: currentColor; transition: transform 0.2s; }
            .ip-tool.active { color: #3b82f6; }
            .ip-tool:active svg { transform: scale(0.8); }
            
            /* --- CROP ACTIONS (Hidden by default) --- */
            .ip-crop-actions {
                position: absolute; bottom: 100px; left: 0; width: 100%;
                display: flex; justify-content: center; gap: 20px;
                z-index: 30; pointer-events: none; opacity: 0; transition: opacity 0.2s;
            }
            .ip-crop-actions.visible { opacity: 1; pointer-events: auto; }
            
            .ip-pill-btn {
                background: rgba(0,0,0,0.8); color: white; border: 1px solid #333;
                padding: 8px 20px; border-radius: 30px; font-weight: 600; cursor: pointer;
                backdrop-filter: blur(5px); display: flex; align-items: center; gap: 6px;
            }
            .ip-pill-btn.confirm { background: #3b82f6; border-color: #3b82f6; }
            
            /* --- LOADING OVERLAY --- */
            .ip-loading {
                position: absolute; top:0; left:0; width:100%; height:100%;
                background: rgba(0,0,0,0.85); display: none; z-index: 50;
                justify-content: center; align-items: center; flex-direction: column; color: white;
                backdrop-filter: blur(5px);
            }
            .ip-spinner {
                width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1);
                border-top: 4px solid #3b82f6; border-radius: 50%;
                animation: spin 0.8s linear infinite; margin-bottom: 15px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

            #ip-file-input { display: none; }
            
            /* CropperJS Override */
            .cropper-view-box, .cropper-face { border-radius: 0; }
            .cropper-modal { background-color: rgba(0, 0, 0, 0.8); }
        </style>

        <div class="ip-overlay" id="ip-overlay">
            <div class="ip-header">
                <button class="ip-btn-icon" id="ip-back">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <span class="ip-title">Edit Photo</span>
                <button class="ip-send-btn" id="ip-upload-btn">Send</button>
            </div>

            <div class="ip-preview-container">
                <img id="ip-preview-img" class="ip-image" src="" alt="Preview">
                
                <div class="ip-crop-actions" id="ip-crop-actions">
                    <button class="ip-pill-btn" id="ip-cancel-crop">Cancel</button>
                    <button class="ip-pill-btn confirm" id="ip-apply-crop">Done</button>
                </div>

                <div class="ip-loading" id="ip-loading">
                    <div class="ip-spinner"></div>
                    <span style="font-weight:500; letter-spacing:0.5px;">Processing & Uploading...</span>
                </div>
            </div>

            <div class="ip-toolbar" id="ip-main-toolbar">
                <button class="ip-tool" id="btn-rotate">
                    <svg viewBox="0 0 24 24"><path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>
                    <span>Rotate</span>
                </button>
                
                <button class="ip-tool" id="btn-filter">
                   <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>B&W</span>
                </button>

                 <button class="ip-tool" id="btn-crop">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 7l-5 5-5-5-1.41 1.41L10.59 12 5.59 17 7 18.41 12 13.41 17 18.41 18.41 17 13.41 12 18.41 7z"/></svg>
                    <span>Crop</span>
                </button>
            </div>
        </div>

        <input type="file" id="ip-file-input" accept="image/*">
        `;
    }

    setupEvents() {
        const overlay = this.querySelector('#ip-overlay');
        const fileInput = this.querySelector('#ip-file-input');
        const backBtn = this.querySelector('#ip-back');
        const uploadBtn = this.querySelector('#ip-upload-btn');
        const rotateBtn = this.querySelector('#btn-rotate');
        const filterBtn = this.querySelector('#btn-filter');
        const cropBtn = this.querySelector('#btn-crop');
        const applyCropBtn = this.querySelector('#ip-apply-crop');
        const cancelCropBtn = this.querySelector('#ip-cancel-crop');

        // --- Back / Close Logic ---
        backBtn.onclick = () => {
            if (this.cropper) {
                // If in cropping mode, back just cancels crop
                this.destroyCropper();
            } else {
                this.close();
            }
        };

        // --- Mobile Back Button Handling ---
        window.addEventListener('popstate', (event) => {
            if (overlay.classList.contains('open')) {
                // Stop the browser from actually going back in history
                // We just want to close the modal
                this.close(true); 
            }
        });

        // --- File Selection ---
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.selectedFile = file;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.previewUrl = evt.target.result;
                    const img = this.querySelector('#ip-preview-img');
                    img.src = this.previewUrl;
                    
                    // Reset State
                    this.currentRotation = 0;
                    this.isGrayscale = false;
                    this.destroyCropper(); // Cleanup any old instances
                    this.updateImageVisuals();
                    
                    // Open Overlay & Push State for Back Button Safety
                    overlay.classList.add('open');
                    window.history.pushState({ imagePickerOpen: true }, document.title);
                };
                reader.readAsDataURL(file);
            }
        };

        // --- Editor Tools ---
        
        rotateBtn.onclick = () => {
            if (this.cropper) {
                this.cropper.rotate(90);
            } else {
                this.currentRotation = (this.currentRotation + 90) % 360;
                this.updateImageVisuals();
            }
            if(navigator.vibrate) navigator.vibrate(10);
        };

        filterBtn.onclick = () => {
            // Filter is visual only until upload
            this.isGrayscale = !this.isGrayscale;
            this.updateImageVisuals();
            filterBtn.classList.toggle('active', this.isGrayscale);
            if(navigator.vibrate) navigator.vibrate(10);
        };

        cropBtn.onclick = () => {
            if (!this.cropper && window.Cropper) {
                this.initCropper();
            }
        };

        applyCropBtn.onclick = () => {
            if (!this.cropper) return;
            const canvas = this.cropper.getCroppedCanvas();
            this.previewUrl = canvas.toDataURL('image/jpeg');
            this.querySelector('#ip-preview-img').src = this.previewUrl;
            
            // Cropping essentially resets rotation to 0 because the new image is already "baked"
            this.currentRotation = 0; 
            
            this.destroyCropper();
            this.updateImageVisuals(); // Re-apply grayscale if needed
        };

        cancelCropBtn.onclick = () => {
            this.destroyCropper();
            this.updateImageVisuals();
        };

        // Handle Upload
        uploadBtn.onclick = () => this.processAndUpload();
    }

    initCropper() {
        const img = this.querySelector('#ip-preview-img');
        
        // Hide Main Toolbar, Show Crop Actions
        this.querySelector('#ip-main-toolbar').style.display = 'none';
        this.querySelector('#ip-crop-actions').classList.add('visible');
        this.querySelector('#ip-upload-btn').style.display = 'none';

        // Apply current rotation visually before initializing cropper to sync state
        img.style.transform = 'none'; 
        
        this.cropper = new Cropper(img, {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.9,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            initialAspectRatio: NaN, // Free crop
            rotatable: true,
            data: { rotate: this.currentRotation } // Sync rotation
        });
    }

    destroyCropper() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        // Restore UI
        this.querySelector('#ip-main-toolbar').style.display = 'flex';
        this.querySelector('#ip-crop-actions').classList.remove('visible');
        this.querySelector('#ip-upload-btn').style.display = 'block';
        this.updateImageVisuals(); // Restore CSS transforms
    }

    updateImageVisuals() {
        const img = this.querySelector('#ip-preview-img');
        const filterVal = this.isGrayscale ? 'grayscale(100%)' : 'none';
        // Only apply CSS transform if Cropper is NOT active
        if (!this.cropper) {
            img.style.transform = `rotate(${this.currentRotation}deg)`;
        }
        img.style.filter = filterVal;
    }

    // --- MAIN FUNCTION: Process Canvas & Upload ---
    async processAndUpload() {
        if (!this.previewUrl || this.isUploading) return;
        
        // If user hits send while cropping, apply crop first automatically
        if (this.cropper) {
             const canvas = this.cropper.getCroppedCanvas();
             this.previewUrl = canvas.toDataURL('image/jpeg');
             this.currentRotation = 0; // Reset as it's baked in
             this.destroyCropper();
        }

        // RETRY LOADING API KEY FROM WINDOW.CONFIG IF MISSING
        // This is the critical fix for the race condition
        if (!this.apiKey) {
            if (window.CONFIG && window.CONFIG.imgbbApiKey) {
                this.apiKey = window.CONFIG.imgbbApiKey;
            }
        }

        if (!this.apiKey) {
            alert("API Key missing. Please check config.js and ensure window.CONFIG is set.");
            return;
        }

        this.isUploading = true;
        this.querySelector('#ip-loading').style.display = 'flex';

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.src = this.previewUrl;
            await new Promise(r => img.onload = r);

            // Handle Rotation Dimension Swaps (Only if rotation exists post-crop)
            if (this.currentRotation === 90 || this.currentRotation === 270) {
                canvas.width = img.height;
                canvas.height = img.width;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            // Apply Transformations
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(this.currentRotation * Math.PI / 180);
            if (this.isGrayscale) {
                ctx.filter = 'grayscale(100%)';
            }
            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            const processedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

            const formData = new FormData();
            formData.append('image', processedBlob);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${this.apiKey}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.dispatchEvent(new CustomEvent('image-uploaded', { 
                    detail: { url: result.data.url },
                    bubbles: true, 
                    composed: true 
                }));
                this.close();
            } else {
                throw new Error(result.error.message);
            }

        } catch (error) {
            console.error(error);
            alert('Upload failed: ' + error.message);
        } finally {
            this.isUploading = false;
            this.querySelector('#ip-loading').style.display = 'none';
        }
    }

    // Public API
    openPicker() {
        this.querySelector('#ip-file-input').click();
    }

    close(fromHistory = false) {
        this.querySelector('#ip-overlay').classList.remove('open');
        this.querySelector('#ip-file-input').value = ''; 
        this.selectedFile = null;
        this.isUploading = false;
        this.querySelector('#ip-loading').style.display = 'none';
        this.destroyCropper();
        
        // Handle History Cleanliness
        if (!fromHistory) {
             // If closed manually (button), we should go back to remove the pushed state
             // But checking state is hard in vanilla JS, so usually history.back() is called
             // ONLY if we are sure we pushed a state.
             if (history.state && history.state.imagePickerOpen) {
                 history.back();
             }
        }
        
        // Reset Visuals
        const filterBtn = this.querySelector('#btn-filter');
        if(filterBtn) filterBtn.classList.remove('active');
    }
}

customElements.define('image-picker', ImagePicker);
