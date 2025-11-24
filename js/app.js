// --- FIX: Changed path back to current directory (js/config.js) ---
import fallbackConfig from './config.js';

let postcardConfig; // Will be populated from DB or fallback
let dom = {}; // To be populated with DOM references

// --- APPLICATION STATE ---
const appState = {
    uploadedImage: null,
    imageSrcForResend: null,
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageZoom: 1.0,
    messagePlaceholderInterval: null,
    isPortrait: false,
    isFlipped: false, 
    activeTab: 'photo', 
    frontText: {
        text: '',
        x: null,
        y: null,
        font: "'Gochi Hand', cursive",
        size: 32,
        width: 200,
        color: '#FFFFFF',
        rotation: 0
    }
};

// --- HELPER FUNCTIONS (Moved to top scope to ensure availability) ---

function showGlobalError(message) {
    if (dom.errorBannerMessage) {
        dom.errorBannerMessage.textContent = message;
        dom.errorBanner.classList.remove('hidden');
        setTimeout(() => dom.errorBanner.classList.add('hidden'), 5000);
    } else {
        console.error(message);
    }
}

function applyConfiguration() {
    if (!postcardConfig) return;

    document.title = postcardConfig.content.pageTitle;
    if(dom.favicon) dom.favicon.href = postcardConfig.content.faviconURL;
    if(dom.loadingImage) dom.loadingImage.src = postcardConfig.content.loadingImageURL;
    
    if (postcardConfig.content.companyLogoURL && dom.companyLogo) {
        dom.companyLogo.src = postcardConfig.content.companyLogoURL;
        dom.companyLogo.classList.remove('hidden');
    } else if (dom.companyLogo) {
        dom.companyLogo.classList.add('hidden');
    }

    if(dom.mainTitle) {
        dom.mainTitle.textContent = postcardConfig.content.mainTitle;
        dom.mainTitle.style.color = postcardConfig.styles.titleColor;
    }

    // Apply button styles
    if(dom.uploadButton) {
        dom.uploadButton.style.backgroundColor = postcardConfig.styles.uploadButtonColor;
        dom.uploadButton.style.color = postcardConfig.styles.uploadButtonTextColor;
    }
    if(dom.findImageButton) {
        dom.findImageButton.style.backgroundColor = postcardConfig.styles.findImageButtonColor;
        dom.findImageButton.style.color = postcardConfig.styles.findImageButtonTextColor;
    }
    if(dom.sendPostcardBtn) {
        dom.sendPostcardBtn.style.backgroundColor = postcardConfig.styles.sendPostcardButtonColor;
        dom.sendPostcardBtn.style.color = postcardConfig.styles.sendPostcardButtonTextColor;
    }
    
    if(dom.aiGenerateBtn) {
        dom.aiGenerateBtn.style.backgroundColor = postcardConfig.styles.uploadButtonColor;
        dom.aiGenerateBtn.style.color = postcardConfig.styles.uploadButtonTextColor;
    }
}

function resetImagePanAndZoom() {
    appState.imageOffsetX = 0;
    appState.imageOffsetY = 0;
    appState.imageZoom = 1.0;
}

function updatePostcardLayout() {
    if (!dom.postcardStage) return;
    
    const container = dom.postcardStage;
    container.classList.remove('aspect-[210/148]', 'aspect-[148/210]');
    
    if (appState.isPortrait) {
        container.classList.add('aspect-[148/210]');
    } else {
        container.classList.add('aspect-[210/148]');
    }
    
    requestAnimationFrame(() => {
        if (dom.previewCanvas.el) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            dom.previewCanvas.el.width = w;
            dom.previewCanvas.el.height = h;
            if (dom.backPreviewCanvas.el) {
                dom.backPreviewCanvas.el.width = w;
                dom.backPreviewCanvas.el.height = h;
            }
            
            if(appState.isFlipped) drawBackPreview();
            else drawPreviewCanvas();
        }
    });
}

function resetImagePreviews() {
    appState.uploadedImage = null;
    appState.imageSrcForResend = null;
    appState.isPortrait = false;
    resetImagePanAndZoom();
    appState.frontText.text = '';
    appState.frontText.x = null;
    appState.frontText.y = null;
    if(dom.frontText.input) dom.frontText.input.value = '';
    if(dom.frontText.profanityWarning) dom.frontText.profanityWarning.classList.add('hidden');
    
    if (dom.previewCanvas.el) {
        const ctx = dom.previewCanvas.el.getContext('2d');
        ctx.clearRect(0, 0, dom.previewCanvas.el.width, dom.previewCanvas.el.height);
    }
    
    if(dom.imagePlaceholder) dom.imagePlaceholder.classList.remove('hidden');
    if(dom.imageControls) dom.imageControls.classList.add('hidden');
    if(dom.zoomInBtn && dom.zoomInBtn.parentElement) dom.zoomInBtn.parentElement.classList.add('hidden');
    
    updatePostcardLayout();
}

async function validateAndSetImage(src) {
    const tempImage = new Image();
    await new Promise((resolve, reject) => { 
        tempImage.crossOrigin = "Anonymous";
        tempImage.onload = resolve; 
        tempImage.onerror = reject; 
        tempImage.src = src; 
    });

    if (postcardConfig && tempImage.width < postcardConfig.validation.minImageDimension || tempImage.height < postcardConfig.validation.minImageDimension) {
        if(dom.imageWarning) {
            dom.imageWarning.textContent = `For best quality, please upload an image that is at least ${postcardConfig.validation.minImageDimension}px on its shortest side.`;
            dom.imageWarning.classList.remove('hidden');
        }
        if(dom.imageUploader) dom.imageUploader.value = '';
        resetImagePreviews();
    } else {
        if(dom.imageWarning) dom.imageWarning.classList.add('hidden');
        appState.uploadedImage = tempImage;
        appState.imageSrcForResend = src;
        appState.isPortrait = tempImage.height > tempImage.width;
        resetImagePanAndZoom();
        
        if(dom.imagePlaceholder) dom.imagePlaceholder.classList.add('hidden');
        if(dom.previewContainer) dom.previewContainer.classList.remove('hidden');
        if(dom.imageControls) dom.imageControls.classList.remove('hidden');
        if(dom.zoomInBtn && dom.zoomInBtn.parentElement) dom.zoomInBtn.parentElement.classList.remove('hidden');
        
        updatePostcardLayout();
    }
}

async function resizeImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 2400;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                else { w = Math.round(w * maxDim / h); h = maxDim; }
            }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
}

function toggleFlip(forceState = null) {
    if (!dom.postcardStage) return;

    const newState = forceState !== null ? forceState : !appState.isFlipped;
    appState.isFlipped = newState;

    const container = dom.postcardStage;

    if (newState) {
        // BACK
        container.classList.remove('aspect-[148/210]');
        container.classList.add('aspect-[210/148]');
        
        dom.frontLayer.classList.remove('active-layer');
        dom.frontLayer.classList.add('hidden-layer');
        dom.backLayer.classList.remove('hidden-layer');
        dom.backLayer.classList.add('active-layer');
        
        requestAnimationFrame(drawBackPreview); 
    } else {
        // FRONT
        if (appState.isPortrait) {
            container.classList.remove('aspect-[210/148]');
            container.classList.add('aspect-[148/210]');
        } else {
            container.classList.remove('aspect-[148/210]');
            container.classList.add('aspect-[210/148]');
        }

        dom.backLayer.classList.remove('active-layer');
        dom.backLayer.classList.add('hidden-layer');
        dom.frontLayer.classList.remove('hidden-layer');
        dom.frontLayer.classList.add('active-layer');
        
        requestAnimationFrame(drawPreviewCanvas);
    }
    
    requestAnimationFrame(() => {
         const w = container.clientWidth;
         const h = container.clientHeight;
         dom.previewCanvas.el.width = w;
         dom.previewCanvas.el.height = h;
         dom.backPreviewCanvas.el.width = w;
         dom.backPreviewCanvas.el.height = h;
         
         if (newState) drawBackPreview();
         else drawPreviewCanvas();
    });
}

function switchTab(tabName) {
    appState.activeTab = tabName;

    dom.navItems.forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('text-blue-600');
            item.classList.remove('text-gray-400');
        } else {
            item.classList.remove('text-blue-600');
            item.classList.add('text-gray-400');
        }
    });

    Object.values(dom.panels).forEach(panel => {
        if(panel) panel.classList.remove('active');
    });
    if (dom.panels[tabName]) dom.panels[tabName].classList.add('active');

    if (['message', 'address', 'send'].includes(tabName)) {
        if (!appState.isFlipped) toggleFlip(true); 
    } else {
        if (appState.isFlipped) toggleFlip(false); 
    }
}

function loadLastDesign() {
    const lastDesign = JSON.parse(localStorage.getItem('lastPostcardDesign'));
    if (lastDesign) {
        if(dom.frontText.input) dom.frontText.input.value = lastDesign.frontText.text;
        if(dom.textInput) dom.textInput.value = lastDesign.message.text;
        if(dom.fontSelect) dom.fontSelect.value = lastDesign.message.font;
        if(dom.colorPicker) dom.colorPicker.value = lastDesign.message.color;
        if(dom.fontSizeSelect) dom.fontSizeSelect.value = lastDesign.message.size || '16';
        
        appState.frontText = lastDesign.frontText;
        appState.isPortrait = lastDesign.isPortrait || false;
        
        if (lastDesign.imageSrc) {
            validateAndSetImage(lastDesign.imageSrc);
        }
        switchTab('message'); 
    }
}

// --- MAIN INITIALIZATION LOGIC ---

function populateDomReferences() {
    dom = {
        // Header
        favicon: document.getElementById('favicon'),
        mainTitle: document.getElementById('main-title'),
        companyLogo: document.getElementById('company-logo'),
        
        // Stage & Canvas
        postcardStage: document.getElementById('postcard-stage'),
        frontLayer: document.getElementById('front-layer'),
        backLayer: document.getElementById('back-layer'),
        previewCanvas: { el: document.getElementById('preview-canvas') },
        backPreviewCanvas: { el: document.getElementById('back-preview-canvas') },
        flipBtn: document.getElementById('flip-card-btn'),
        
        // Front Image Controls
        imagePlaceholder: document.getElementById('image-placeholder'),
        uploadButton: document.getElementById('upload-button'), 
        findImageButton: document.getElementById('find-image-button'), 
        toolSearchBtn: document.getElementById('tool-search-btn'), 
        imageUploader: document.getElementById('image-uploader'),
        imageControls: document.getElementById('image-controls'), 
        deleteImageBtn: document.getElementById('delete-image-btn'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        imageWarning: document.getElementById('image-warning'),

        // Tools Panels
        panels: {
            photo: document.getElementById('tool-panel-photo'),
            text: document.getElementById('tool-panel-text'),
            message: document.getElementById('tool-panel-message'),
            address: document.getElementById('tool-panel-address'),
            send: document.getElementById('tool-panel-send')
        },
        
        // Navigation
        navItems: document.querySelectorAll('.nav-item'),

        // Front Text Inputs
        frontText: {
            input: document.getElementById('front-text-input'),
            fontSelect: document.getElementById('front-font-select'),
            colorPicker: document.getElementById('front-color-picker'),
            clearBtn: document.getElementById('clear-front-text-btn'),
            profanityWarning: document.getElementById('front-text-profanity-warning'),
        },

        // Message Inputs
        textInput: document.getElementById('text-input'),
        fontSelect: document.getElementById('font-select'),
        colorPicker: document.getElementById('color-picker'),
        fontSizeSelect: document.getElementById('font-size-select'),
        messageWarning: document.getElementById('message-warning'),
        messageProfanityWarning: document.getElementById('message-profanity-warning'),
        
        // AI Assistant
        aiAssistantContainer: document.getElementById('ai-assistant-container'),
        aiRecipient: document.getElementById('ai-recipient'),
        aiTopic: document.getElementById('ai-topic'),
        aiTone: document.getElementById('ai-tone'),
        aiGenerateBtn: document.getElementById('ai-generate-btn'),

        // Address Inputs
        addressInputs: { 
            name: document.getElementById('address-name'), 
            line1: document.getElementById('address-line1'), 
            line2: document.getElementById('address-line2'), 
            city: document.getElementById('address-city'), 
            postcode: document.getElementById('address-postcode'), 
            country: document.getElementById('address-country') 
        },

        // Sending
        sendPostcardBtn: document.getElementById('send-postcard-btn'),
        sender: {
            modal: document.getElementById('sender-modal'),
            detailsView: document.getElementById('sender-details-view'),
            checkEmailView: document.getElementById('check-email-view'),
            nameInput: document.getElementById('sender-name'),
            emailInput: document.getElementById('sender-email'),
            sendBtn: document.getElementById('final-send-btn'),
            closeBtn: document.getElementById('close-sender-modal-btn'),
            recaptchaContainer: document.getElementById('recaptcha-container'),
            errorMessage: document.getElementById('sender-error-message')
        },
        search: { 
            modal: document.getElementById('search-modal'), 
            closeBtn: document.getElementById('close-search-modal-btn'), 
            input: document.getElementById('search-input'), 
            searchBtn: document.getElementById('search-btn'), 
            resultsContainer: document.getElementById('search-results'), 
            loader: document.getElementById('search-loader') 
        },
        
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingImage: document.getElementById('loading-image'),
        errorBanner: document.getElementById('error-banner'),
        errorBannerMessage: document.getElementById('error-banner-message'),
    };
}

async function loadConfigAndInitialize() {
    try {
        // --- FIX: Use absolute URL for fetch ---
        const response = await fetch(new URL('/api/get-config', window.location.origin));
        if (!response.ok) {
             throw new Error('Could not fetch config from API');
        }
        postcardConfig = await response.json();
    } catch (error) {
        console.error("Could not fetch from DB, using local defaults.", error);
        postcardConfig = fallbackConfig;
        if(postcardConfig) postcardConfig.apiKeys = { recaptchaSiteKey: '', pixabayApiKey: '' }; 
        showGlobalError("Could not load application configuration. Using offline defaults.");
    } finally {
        applyConfiguration();
        setupMobileInteractions(); 
        if(dom.loadingOverlay) dom.loadingOverlay.style.display = 'none';
        // Ensure main content is available 
        switchTab('photo'); 
        updatePostcardLayout();
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('sendAgain') === 'true') {
            loadLastDesign();
        }
    }
}

function setupMobileInteractions() {
    // 1. Tab Switching
    if (dom.navItems) {
        dom.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                switchTab(tab);
            });
        });
    }

    // 2. Flip Button
    if (dom.flipBtn) {
        dom.flipBtn.addEventListener('click', () => {
            toggleFlip();
        });
    }

    // 3. Auto-update back preview on input
    const backInputs = [
        dom.textInput, dom.fontSelect, dom.fontSizeSelect, dom.colorPicker,
        ...Object.values(dom.addressInputs)
    ];
    backInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                if (appState.isFlipped) drawBackPreview();
                if (input === dom.textInput) {
                    debouncedProfanityCheck(dom.textInput.value, dom.messageProfanityWarning);
                    checkMessageOverflow();
                }
            });
        }
    });

    // 4. Core Listeners
    
    // Image Uploader - ensure element exists
    if(dom.imageUploader) {
        dom.imageUploader.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                let imageDataUrl = e.target.result;
                if (postcardConfig && file.size > postcardConfig.validation.maxFileSizeMB * 1024 * 1024) {
                    imageDataUrl = await resizeImage(imageDataUrl);
                }
                validateAndSetImage(imageDataUrl);
            };
            reader.readAsDataURL(file);
            // Clear value to allow re-upload of same file
            event.target.value = '';
        });
    }

    // Search Buttons
    if(dom.toolSearchBtn) dom.toolSearchBtn.addEventListener('click', () => dom.search.modal.style.display = 'flex');
    if(dom.findImageButton) dom.findImageButton.addEventListener('click', () => dom.search.modal.style.display = 'flex');
    if(dom.search.closeBtn) dom.search.closeBtn.addEventListener('click', () => dom.search.modal.style.display = 'none');
    if(dom.search.searchBtn) dom.search.searchBtn.addEventListener('click', handleImageSearch);
    if(dom.search.input) dom.search.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleImageSearch(); });

    // Front Text
    if(dom.frontText.input) {
        dom.frontText.input.addEventListener('input', () => {
            appState.frontText.text = dom.frontText.input.value;
            if (appState.frontText.x === null && dom.previewCanvas.el) {
                appState.frontText.x = dom.previewCanvas.el.width / 2;
                appState.frontText.y = dom.previewCanvas.el.height / 2;
            }
            debouncedProfanityCheck(appState.frontText.text, dom.frontText.profanityWarning);
            drawPreviewCanvas();
        });
    }
    [dom.frontText.fontSelect, dom.frontText.colorPicker].forEach(el => {
        if(el) {
            el.addEventListener('input', () => {
                 appState.frontText.font = dom.frontText.fontSelect.value;
                 appState.frontText.color = dom.frontText.colorPicker.value;
                 drawPreviewCanvas();
            });
        }
    });
    if(dom.frontText.clearBtn) {
        dom.frontText.clearBtn.addEventListener('click', () => {
            dom.frontText.input.value = '';
            appState.frontText.text = '';
            drawPreviewCanvas();
        });
    }

    // Message Controls (Sync with preview)
    [dom.fontSelect, dom.fontSizeSelect, dom.colorPicker].forEach(el => {
        if(el) {
            el.addEventListener('input', () => {
                 if (appState.isFlipped) drawBackPreview();
            });
        }
    });

    // Send Button
    if(dom.sendPostcardBtn) dom.sendPostcardBtn.addEventListener('click', handleSendPostcard);
    
    // Sender Modal
    if(dom.sender.sendBtn) dom.sender.sendBtn.addEventListener('click', handleFinalSend);
    if(dom.sender.closeBtn) {
        dom.sender.closeBtn.addEventListener('click', () => {
            dom.sender.modal.style.display = 'none';
            dom.sender.detailsView.style.display = 'flex'; 
            dom.sender.checkEmailView.style.display = 'none';
        });
    }

    // AI Button
    if(dom.aiGenerateBtn) {
        dom.aiGenerateBtn.addEventListener('click', handleAIAssist);
    }

    // Zoom Controls
    if(dom.deleteImageBtn) dom.deleteImageBtn.addEventListener('click', resetImagePreviews);
    if(dom.zoomInBtn) {
        dom.zoomInBtn.addEventListener('click', () => {
            appState.imageZoom += 0.1;
            drawPreviewCanvas();
        });
    }
    if(dom.zoomOutBtn) {
        dom.zoomOutBtn.addEventListener('click', () => {
            appState.imageZoom = Math.max(1.0, appState.imageZoom - 0.1);
            drawPreviewCanvas();
        });
    }

    // Canvas Interactions
    if(dom.previewCanvas.el) {
        const canvas = dom.previewCanvas.el;
        canvas.addEventListener('mousedown', handleInteractionStart);
        canvas.addEventListener('mousemove', handleInteractionMove);
        document.addEventListener('mouseup', handleInteractionEnd);
        canvas.addEventListener('touchstart', handleInteractionStart);
        canvas.addEventListener('touchmove', handleInteractionMove);
        canvas.addEventListener('touchend', handleInteractionEnd);
    }
}

// --- HELPER FUNCTIONS (Moved to top level or defined before use) ---

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedProfanityCheck = debounce(checkForProfanityAPI, 500);

async function checkForProfanityAPI(text, warningElement) {
    if (!text || !text.trim()) {
        if(warningElement) warningElement.classList.add('hidden');
        return false;
    }
    try {
        const response = await fetch('https://vector.profanity.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });
        if (!response.ok) return false; 
        const result = await response.json();
        if (result.isProfanity) {
            if(warningElement) warningElement.textContent = "Be more friendly - consider revising the text";
            if(warningElement) warningElement.classList.remove('hidden');
            return true;
        } else {
            if(warningElement) warningElement.classList.add('hidden');
            return false;
        }
    } catch (error) {
        return false; 
    }
}

function drawCoverImage(ctx, img, canvasWidth, canvasHeight, offsetX, offsetY, zoom) {
    const canvasAspect = canvasWidth / canvasHeight;
    const imgAspect = img.width / img.height;
    let sWidth, sHeight;
    if (imgAspect > canvasAspect) {
        sHeight = img.height;
        sWidth = sHeight * canvasAspect;
    } else {
        sWidth = img.width;
        sHeight = sWidth / canvasAspect;
    }
    sWidth /= zoom;
    sHeight /= zoom;
    let sx = (img.width - sWidth) / 2;
    let sy = (img.height - sHeight) / 2;
    const panScaleFactor = sWidth / canvasWidth;
    sx -= offsetX * panScaleFactor;
    sy -= offsetY * panScaleFactor;
    const maxSx = img.width - sWidth;
    const maxSy = img.height - sHeight;
    sx = Math.max(0, Math.min(sx, maxSx));
    sy = Math.max(0, Math.min(sy, maxSy));
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);
}

function drawCleanFrontOnContext(ctx, width, height, bleedPx = 0) {
     if (appState.uploadedImage) {
        ctx.save();
        const effectiveScale = (appState.isPortrait && width > height) ? 
            height / dom.previewCanvas.el.height : 
            width / dom.previewCanvas.el.width; 
        const scaledOffsetX = appState.imageOffsetX * effectiveScale;
        const scaledOffsetY = appState.imageOffsetY * effectiveScale;
        drawCoverImage(ctx, appState.uploadedImage, width, height, scaledOffsetX, scaledOffsetY, appState.imageZoom);
        ctx.restore();
    }
    if (appState.frontText.text) {
        const { text, font, size, color, x, y, rotation, width: textWidth } = appState.frontText;
        const effectiveScale = (appState.isPortrait && width > height) ? 
            height / dom.previewCanvas.el.height : 
            width / dom.previewCanvas.el.width;   
        ctx.save();
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textX = (x * effectiveScale) + bleedPx;
        const textY = (y * effectiveScale) + bleedPx;
        ctx.translate(textX, textY);
        ctx.rotate(rotation * Math.PI / 180);
        drawWrappedText(ctx, text, 0, 0, textWidth * effectiveScale, size * effectiveScale * 1.2, `${size * effectiveScale}px ${font}`);
        ctx.restore();
    }
}

function drawPreviewCanvas() {
    if (!dom.previewCanvas || !dom.previewCanvas.el) return;
    const canvas = dom.previewCanvas.el;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (appState.uploadedImage) {
        drawCoverImage(ctx, appState.uploadedImage, canvas.width, canvas.height, appState.imageOffsetX, appState.imageOffsetY, appState.imageZoom);
    }
    if (appState.frontText.text) {
        const { text, font, size, color, x, y, rotation, width: textWidth } = appState.frontText;
        ctx.save();
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        drawWrappedText(ctx, text, 0, 0, textWidth, size * 1.2, `${size}px ${font}`);
        ctx.restore();
        
        const metrics = getTextMetrics(ctx);
        if (metrics) {
             const handles = getHandlePositions(metrics);
             ctx.save();
             ctx.translate(metrics.x, metrics.y);
             ctx.rotate(appState.frontText.rotation * Math.PI / 180);
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
             ctx.lineWidth = 1;
             ctx.setLineDash([5, 5]);
             ctx.strokeRect(metrics.box.x, metrics.box.y, metrics.box.width, metrics.box.height);
             ctx.restore();
             ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
             ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
             Object.values(handles).forEach(handle => {
                ctx.beginPath();
                ctx.arc(handle.x, handle.y, 8, 0, 2 * Math.PI);
                ctx.fill(); ctx.stroke();
             });
        }
    }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, font) {
    ctx.font = font;
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    let currentY = y - (lines.length * lineHeight / 2) + (lineHeight / 2);
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, currentY);
        currentY += lineHeight;
    }
}

function getTextMetrics(ctx) {
    const { text, font, size, width: textWidth } = appState.frontText;
    if (!text) return null;
    ctx.font = `${size}px ${font}`;
    const height = size * 1.2; 
    const box = { x: -textWidth / 2, y: -height / 2, width: textWidth, height: height }; 
    return { x: appState.frontText.x, y: appState.frontText.y, box }; 
}

function getHandlePositions(metrics) {
    const { x, y, box } = metrics;
    return {
        rotate: { x: x, y: y - 50 }, 
        size: { x: x + box.width/2 + 20, y: y } 
    };
}

// Text Interaction
let interactionMode = 'none';
let startState = {};
const handleInteractionStart = (e) => {
    if (e.type === 'touchstart') { }
    const rect = dom.previewCanvas.el.getBoundingClientRect();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    interactionMode = 'draggingImage';
    startState = {
        mouseX, mouseY,
        imageOffsetX: appState.imageOffsetX,
        imageOffsetY: appState.imageOffsetY
    };
};

const handleInteractionMove = (e) => {
     if (interactionMode === 'none') return;
     e.preventDefault();
     const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
     const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
     const rect = dom.previewCanvas.el.getBoundingClientRect();
     const mouseX = clientX - rect.left;
     const mouseY = clientY - rect.top;

     if (interactionMode === 'draggingImage') {
         const dx = mouseX - startState.mouseX;
         const dy = mouseY - startState.mouseY;
         appState.imageOffsetX = startState.imageOffsetX + dx;
         appState.imageOffsetY = startState.imageOffsetY + dy;
         requestAnimationFrame(drawPreviewCanvas);
     }
};
const handleInteractionEnd = () => { interactionMode = 'none'; };


// --- FINAL GENERATION LOGIC ---

async function generatePostcardImages({ forEmail = false, includeAddressOnBack = true } = {}) {
    await document.fonts.ready;
    const MM_TO_INCH = 25.4;
    const { dpi, a5WidthMM, a5HeightMM, bleedMM } = postcardConfig.print;
    const bleedPxForPrint = forEmail ? 0 : Math.round((bleedMM / MM_TO_INCH) * dpi);
    
    const A5_RATIO = a5WidthMM / a5HeightMM;
    let finalWidthPx, finalHeightPx;

    if (forEmail) {
        const previewBaseWidth = 1200;
        const padding = 20; 
        finalWidthPx = previewBaseWidth + padding * 2;
        finalHeightPx = Math.round(previewBaseWidth / A5_RATIO) + padding * 2;
    } else {
        const coreWidthPx = Math.round((a5WidthMM / MM_TO_INCH) * dpi);
        const coreHeightPx = Math.round((a5HeightMM / MM_TO_INCH) * dpi);
        finalWidthPx = coreWidthPx + (bleedPxForPrint * 2);
        finalHeightPx = coreHeightPx + (bleedPxForPrint * 2);
    }
    
    // Front
    const tempFrontCanvas = document.createElement('canvas');
    const tempFrontWidth = forEmail ? finalWidthPx - 40 : finalWidthPx; 
    const tempFrontHeight = forEmail ? finalHeightPx - 40 : finalHeightPx; 
    tempFrontCanvas.width = tempFrontWidth;
    tempFrontCanvas.height = tempFrontHeight;
    const tempFrontCtx = tempFrontCanvas.getContext('2d');
    
    if (appState.uploadedImage) {
        if (appState.isPortrait) {
            tempFrontCtx.save();
            tempFrontCtx.translate(tempFrontWidth / 2, tempFrontHeight / 2);
            tempFrontCtx.rotate(90 * Math.PI / 180);
            tempFrontCtx.translate(-tempFrontHeight / 2, -tempFrontWidth / 2);
            drawCleanFrontOnContext(tempFrontCtx, tempFrontHeight, tempFrontWidth, forEmail ? 0 : bleedPxForPrint);
            tempFrontCtx.restore();
        } else {
            drawCleanFrontOnContext(tempFrontCtx, tempFrontWidth, tempFrontHeight, bleedPxForPrint);
        }
    } else {
        tempFrontCtx.fillStyle = '#FFFFFF';
        tempFrontCtx.fillRect(0, 0, tempFrontWidth, tempFrontHeight);
    }

    // Back
    const tempBackCanvas = document.createElement('canvas');
    const mainContentWidthPx = forEmail ? finalWidthPx - 40 : Math.round((a5WidthMM / MM_TO_INCH) * dpi);
    const mainContentHeightPx = forEmail ? finalHeightPx - 40 : Math.round((a5HeightMM / MM_TO_INCH) * dpi);
    tempBackCanvas.width = mainContentWidthPx;
    tempBackCanvas.height = mainContentHeightPx;
    const tempBackCtx = tempBackCanvas.getContext('2d');
    
    // Draw Back Content
    tempBackCtx.fillStyle = 'white';
    tempBackCtx.fillRect(0, 0, mainContentWidthPx, mainContentHeightPx);
    
    // Divider
    tempBackCtx.strokeStyle = '#e5e7eb';
    tempBackCtx.lineWidth = 5;
    tempBackCtx.beginPath();
    const dividerX = mainContentWidthPx * 0.58;
    tempBackCtx.moveTo(dividerX, 50);
    tempBackCtx.lineTo(dividerX, mainContentHeightPx - 50);
    tempBackCtx.stroke();
    
    // Text
    const fontSize = dom.fontSizeSelect.value;
    const fontWeight = '400';
    const hiResFontSize = fontSize * (mainContentWidthPx / 504) * 1.2; // scaling factor
    const fontFamily = dom.fontSelect.value;
    tempBackCtx.fillStyle = dom.colorPicker.value;
    tempBackCtx.font = `${fontWeight} ${hiResFontSize}px ${fontFamily}`;
    tempBackCtx.textAlign = 'left';
    tempBackCtx.textBaseline = 'top';
    
    // Message Nudge 50px
    const resolutionScale = mainContentWidthPx / 1200; 
    const messageX = 50 * resolutionScale * 2; 
    const lineHeight = hiResFontSize * 1.2;
    const messageMaxWidth = dividerX - messageX - 20;
    
    wrapText(tempBackCtx, dom.textInput.value, messageX, hiResFontSize, messageMaxWidth, lineHeight);

    if (includeAddressOnBack) {
         const hiResAddressFontSize = 12 * (mainContentWidthPx / 504) * 1.2;
         tempBackCtx.fillStyle = '#333';
         tempBackCtx.font = `400 ${hiResAddressFontSize}px Inter`;
         const addressLines = [dom.addressInputs.name.value, dom.addressInputs.line1.value, dom.addressInputs.line2.value, dom.addressInputs.city.value, dom.addressInputs.postcode.value].filter(Boolean);
         const addrX = dividerX + 20;
         const addrLineHeight = hiResAddressFontSize * 1.4;
         let addrY = (mainContentHeightPx / 2) - ((addressLines.length * addrLineHeight) / 2);
         
         addressLines.forEach(line => {
             tempBackCtx.fillText(line, addrX, addrY);
             addrY += addrLineHeight;
         });
    }

    if (!forEmail) {
        return { frontCanvas: tempFrontCanvas, backCanvas: tempBackCanvas };
    }

    // Email Composition
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = finalWidthPx;
    frontCanvas.height = finalHeightPx;
    const frontCtx = frontCanvas.getContext('2d');
    
    const backCanvas = document.createElement('canvas');
    backCanvas.width = finalWidthPx; 
    backCanvas.height = finalHeightPx;
    const backCtx = backCanvas.getContext('2d');

    [frontCtx, backCtx].forEach(ctx => {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
    });

    const padding = 20;
    frontCtx.drawImage(tempFrontCanvas, padding, padding);
    
    const backRatio = tempBackCanvas.width / tempBackCanvas.height;
    const backHeight = tempFrontHeight;
    const backWidth = backHeight * backRatio;
    const backX = (finalWidthPx - backWidth) / 2;
    const backY = padding;
    backCtx.drawImage(tempBackCanvas, backX, backY, backWidth, backHeight);
    
    return { frontCanvas, backCanvas };
}

function checkMessageOverflow() {
    // Placeholder for overflow check logic if needed
}

async function handleImageSearch() {
    const query = dom.search.input.value;
    if (!query) return;
    if (!postcardConfig.apiKeys.pixabayApiKey) {
        console.error("Pixabay API Key not available.");
        return;
    }
    dom.search.loader.style.display = 'flex';
    dom.search.resultsContainer.innerHTML = '';
    try {
        const response = await fetch(`https://pixabay.com/api/?key=${postcardConfig.apiKeys.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=21`);
        const data = await response.json();
        dom.search.resultsContainer.innerHTML = '';
        if (data.hits) {
            data.hits.forEach(photo => {
                const img = document.createElement('img');
                img.src = photo.webformatURL;
                img.className = 'grid-item';
                img.onclick = () => {
                     // fetch large image
                     fetch(photo.largeImageURL).then(r => r.blob()).then(blob => {
                         const reader = new FileReader();
                         reader.onload = (e) => {
                             validateAndSetImage(e.target.result);
                             dom.search.modal.style.display = 'none';
                         };
                         reader.readAsDataURL(blob);
                     });
                };
                dom.search.resultsContainer.appendChild(img);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        dom.search.loader.style.display = 'none';
    }
}

function wrapAddressLine(ctx, text, maxWidthPx) {
    if (!text) return [];
    
    let lines = [];
    let currentLine = '';
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + word + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidthPx && i > 0) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());
    return lines;
}

function drawBackPreview() {
    const canvas = dom.backPreviewCanvas.el;
    if (!canvas) return;

    if (canvas.width !== dom.previewCanvas.el.width || canvas.height !== dom.previewCanvas.el.height) {
        canvas.width = dom.previewCanvas.el.width;
        canvas.height = dom.previewCanvas.el.height;
    }
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Divider
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const dividerX = width * 0.58; 
    ctx.moveTo(dividerX, 20);
    ctx.lineTo(dividerX, height - 20);
    ctx.stroke();

    // Stamp Box
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const stampSize = width * 0.15;
    ctx.strokeRect(width - stampSize - 20, 20, stampSize, stampSize);
    ctx.setLineDash([]);

    // Message
    const fontSizeVal = parseInt(dom.fontSizeSelect.value) || 16;
    // Scale font size relative to canvas width
    const scaleFactor = width / 1200; 
    const fontSize = fontSizeVal * 2.5 * scaleFactor + 10; 

    const fontFamily = dom.fontSelect.value;
    const color = dom.colorPicker.value;

    ctx.fillStyle = color;
    ctx.font = `400 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Use relative positioning based on canvas size
    const messageX = width * 0.08; 
    const messageY = height * 0.08;
    const messageWidth = dividerX - messageX - (20 * scaleFactor);
    const lineHeight = fontSize * 1.2;

    wrapText(ctx, dom.textInput.value, messageX, messageY, messageWidth, lineHeight);

    // Address
    const addressLines = [
        dom.addressInputs.name.value,
        dom.addressInputs.line1.value,
        dom.addressInputs.line2.value,
        dom.addressInputs.city.value,
        dom.addressInputs.postcode.value,
        "United Kingdom"
    ].filter(Boolean);

    ctx.fillStyle = '#333333';
    ctx.font = `400 ${14 * 2 * scaleFactor + 8}px 'Inter', sans-serif`; 
    
    let addrY = height * 0.5; 
    const addrX = dividerX + (30 * scaleFactor);
    const addrLineHeight = (14 * 2 * scaleFactor + 8) * 1.4;
    const addrMaxWidth = width - addrX - 10;

    addressLines.forEach(line => {
         const lines = wrapAddressLine(ctx, line, addrMaxWidth);
         lines.forEach(subLine => {
             ctx.fillText(subLine, addrX, addrY);
             addrY += addrLineHeight;
         });
    });
}