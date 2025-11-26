import fallbackConfig from './config.js';

let postcardConfig; 
let dom = {};

// --- APPLICATION STATE ---
const appState = {
    uploadedImage: null,
    imageSrcForResend: null,
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageZoom: 1.0,
    messagePlaceholderInterval: null,
    isPortrait: false,
    frontText: {
        text: '',
        x: null,
        y: null,
        font: "'Gochi Hand', cursive",
        size: 32,
        width: 200,
        color: '#FFFFFF',
        rotation: 0
    },
    // Mobile State
    currentMobileTab: 'design',
    isFlipped: false
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    populateDomReferences();
    loadConfigAndInitialize();
});

function populateDomReferences() {
    dom = {
        favicon: document.getElementById('favicon'),
        mainTitle: document.getElementById('main-title'),
        subtitle: document.getElementById('subtitle'),
        uploadButton: document.getElementById('upload-button'),
        findImageButton: document.getElementById('find-image-button'),
        
        // Stage & Preview
        stageWrapper: document.getElementById('stage-wrapper'),
        cardFlipper: document.getElementById('card-flipper'),
        previewContainer: document.getElementById('preview-container'),
        backPreviewContainer: document.getElementById('back-preview-container'),
        liveBackCanvas: document.getElementById('live-back-canvas'),
        
        imageUploader: document.getElementById('image-uploader'),
        imagePlaceholder: document.getElementById('image-placeholder'),
        imageWarning: document.getElementById('image-warning'),
        imageControls: document.getElementById('image-controls'),
        deleteImageBtn: document.getElementById('delete-image-btn'),
        zoomControls: document.getElementById('zoom-controls'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        previewCanvas: {
            el: document.getElementById('preview-canvas'),
        },
        
        // Inputs
        frontText: {
            input: document.getElementById('front-text-input'),
            fontSelect: document.getElementById('front-font-select'),
            colorPicker: document.getElementById('front-color-picker'),
            colorPreview: document.getElementById('front-color-preview'),
            profanityWarning: document.getElementById('front-text-profanity-warning'),
        },
        textInput: document.getElementById('text-input'),
        fontSelect: document.getElementById('font-select'),
        colorPicker: document.getElementById('color-picker'),
        colorPreview: document.getElementById('msg-color-preview'),
        fontSizeSelect: document.getElementById('font-size-select'),
        messageWarning: document.getElementById('message-warning'),
        messageProfanityWarning: document.getElementById('message-profanity-warning'),
        charCount: document.getElementById('char-count'),
        
        addressInputs: { 
            name: document.getElementById('address-name'), 
            line1: document.getElementById('address-line1'), 
            line2: document.getElementById('address-line2'), 
            city: document.getElementById('address-city'), 
            postcode: document.getElementById('address-postcode'), 
            country: document.getElementById('address-country') 
        },
        
        // Navigation & Controls
        finalPreviewFrontContainer: document.getElementById('final-preview-front-container'),
        finalPreviewFront: document.getElementById('final-preview-front'),
        finalPreviewBack: document.getElementById('final-preview-back'),
        desktopSendBtn: document.getElementById('desktop-send-btn'),
        
        mobileNavItems: document.querySelectorAll('.nav-item'),
        mobileSendBtn: document.getElementById('mobile-send-btn'),
        controlGroups: {
            design: document.getElementById('group-design'),
            message: document.getElementById('group-message'),
            address: document.getElementById('group-address'),
            preview: document.getElementById('group-preview')
        },
        
        flipHintBtn: document.getElementById('flip-hint-btn'),
        flipBackHintBtn: document.getElementById('flip-back-hint-btn'),
        accordionHeaders: document.querySelectorAll('.accordion-header'),

        // Modals
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
            input: document.getElementById('search-input'), 
            searchBtn: document.getElementById('search-btn'), 
            resultsContainer: document.getElementById('search-results'), 
            loader: document.getElementById('search-loader'),
            closeBtn: document.getElementById('close-search-modal-btn'),
            showBtn: document.getElementById('find-image-button')
        },
        
        zoom: { modal: document.getElementById('zoom-modal'), image: document.getElementById('zoomed-image'), closeBtn: document.getElementById('close-zoom-modal-btn')},
        
        // Misc
        errorBanner: document.getElementById('error-banner'),
        errorBannerMessage: document.getElementById('error-banner-message'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingImage: document.getElementById('loading-image'),
        mainContent: document.getElementById('main-content'),
        companyLogo: document.getElementById('company-logo'),
        
        // AI
        toggleAiBtn: document.getElementById('toggle-ai-btn'),
        aiContainer: document.getElementById('ai-assistant-container'),
        aiRecipient: document.getElementById('ai-recipient'),
        aiTopic: document.getElementById('ai-topic'),
        aiTone: document.getElementById('ai-tone'),
        aiGenerateBtn: document.getElementById('ai-generate-btn')
    };
}

async function loadConfigAndInitialize() {
    try {
        if (window.__postcardConfig && window.__postcardConfig.content) {
            postcardConfig = window.__postcardConfig;
        } else {
            const response = await fetch(new URL('/api/get-config', window.location.origin));
            if (!response.ok) throw new Error('Could not fetch config');
            postcardConfig = await response.json();
        }
    } catch (error) {
        console.error("Using offline defaults.", error);
        postcardConfig = fallbackConfig;
        showGlobalError("Offline Mode: Some features may be limited.");
    } finally {
        if (!postcardConfig) postcardConfig = fallbackConfig; // Fallback safety
        applyConfiguration();
        initializePostcardCreator();
        dom.loadingOverlay.style.display = 'none';
        dom.mainContent.style.display = 'block';
    }
}

function showGlobalError(message) {
    if(dom.errorBannerMessage) dom.errorBannerMessage.textContent = message;
    if(dom.errorBanner) {
        dom.errorBanner.classList.remove('hidden');
        setTimeout(() => dom.errorBanner.classList.add('hidden'), 5000);
    }
}

function applyConfiguration() {
    if (postcardConfig.content.companyLogoURL && dom.companyLogo) {
        dom.companyLogo.src = postcardConfig.content.companyLogoURL;
        dom.companyLogo.classList.remove('hidden');
    }
    
    if(dom.loadingImage) dom.loadingImage.src = postcardConfig.content.loadingImageURL;
    if(dom.mainTitle) {
        dom.mainTitle.textContent = postcardConfig.content.mainTitle;
        dom.mainTitle.style.color = postcardConfig.styles.titleColor;
    }

    if(dom.subtitle) {
        const subtitleLink = `<a href="${postcardConfig.content.subtitleLinkURL}" target="_blank" class="font-bold hover:underline" style="color: ${postcardConfig.styles.subtitleLinkColor};">${postcardConfig.content.subtitleLinkText}</a>`;
        dom.subtitle.innerHTML = `${postcardConfig.content.subtitleText} ${subtitleLink}.`;
    }

    // Apply colors
    const primaryColor = postcardConfig.styles.uploadButtonColor;
    if(dom.mobileSendBtn && dom.mobileSendBtn.querySelector('div')) dom.mobileSendBtn.querySelector('div').style.backgroundColor = primaryColor;
    if(dom.sender.sendBtn) dom.sender.sendBtn.style.backgroundColor = primaryColor;
}

// --- LOGIC FUNCTIONS ---

function updatePostcardLayout() {
    const frontContainer = dom.previewContainer;
    const backContainer = dom.backPreviewContainer;
    const canvas = dom.previewCanvas.el;
    
    frontContainer.classList.remove('aspect-[210/148]', 'aspect-[148/210]');
    backContainer.classList.remove('aspect-[210/148]', 'aspect-[148/210]');
    
    if (appState.isPortrait) {
        frontContainer.classList.add('aspect-[148/210]');
        backContainer.classList.add('aspect-[148/210]'); 
    } else {
        frontContainer.classList.add('aspect-[210/148]');
        backContainer.classList.add('aspect-[210/148]');
    }

    requestAnimationFrame(() => {
        canvas.width = frontContainer.clientWidth;
        canvas.height = frontContainer.clientHeight;
        dom.liveBackCanvas.width = backContainer.clientWidth;
        dom.liveBackCanvas.height = backContainer.clientHeight;
        
        drawPreviewCanvas();
        drawLiveBackCanvas();
    });
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

function drawPreviewCanvas() {
    const canvas = dom.previewCanvas.el;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (appState.uploadedImage) {
        drawCoverImage(ctx, appState.uploadedImage, canvas.width, canvas.height, appState.imageOffsetX, appState.imageOffsetY, appState.imageZoom);
    }
    
    // Draw Safety Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const margin = 10;
    ctx.strokeRect(margin, margin, canvas.width - margin*2, canvas.height - margin*2);
    ctx.restore();

    // Draw Text
    if (appState.frontText.text) {
        if (appState.frontText.x === null) {
            appState.frontText.x = canvas.width / 2;
            appState.frontText.y = canvas.height / 2;
        }
        const { text, font, size, color, x, y, rotation, width: textWidth } = appState.frontText;
        ctx.save();
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        
        drawWrappedText(ctx, text, 0, 0, textWidth, size * 1.2, `${size}px ${font}`);
        ctx.restore();
    }
}

function drawLiveBackCanvas() {
    const canvas = dom.liveBackCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Divider
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    const dividerX = appState.isPortrait ? width * 0.5 : width * 0.6;
    
    ctx.beginPath();
    ctx.moveTo(dividerX, 20);
    ctx.lineTo(dividerX, height - 20);
    ctx.stroke();
    
    // Stamp
    ctx.strokeStyle = '#d1d5db';
    ctx.setLineDash([5, 5]);
    const stampSize = appState.isPortrait ? width * 0.15 : height * 0.2;
    ctx.strokeRect(width - stampSize - 20, 20, stampSize, stampSize * 1.2);
    ctx.setLineDash([]);
    
    // Message
    const fontSizeVal = parseInt(dom.fontSizeSelect.value);
    const scaleFactor = width / 800;
    const fontSize = Math.max(10, fontSizeVal * scaleFactor * 2); 
    const fontFamily = dom.fontSelect.value;
    const color = dom.colorPicker.value;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const msgX = 20;
    const msgY = 20;
    const msgWidth = dividerX - 40;
    
    drawWrappedText(ctx, dom.textInput.value, msgX, msgY, msgWidth, fontSize * 1.4, ctx.font, true); 
    
    // Address
    const addrX = dividerX + 20;
    const addrY = height * 0.4;
    
    ctx.fillStyle = '#333333';
    ctx.font = `12px Inter`; 
    if(appState.isPortrait) ctx.font = `10px Inter`;
    
    let currentAddrY = addrY;
    const addrLineHeight = 16;
    
    const addressFields = [
        dom.addressInputs.name.value,
        dom.addressInputs.line1.value,
        dom.addressInputs.line2.value,
        dom.addressInputs.city.value,
        dom.addressInputs.postcode.value,
        dom.addressInputs.country.value
    ];
    
    addressFields.forEach(line => {
        if(line && line.trim() !== '') {
            ctx.fillText(line, addrX, currentAddrY);
            currentAddrY += addrLineHeight;
        }
    });
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, font, isLeftAligned = false) {
    ctx.font = font;
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    const totalHeight = lines.length * lineHeight;
    let currentY = isLeftAligned ? y : y - (totalHeight / 2) + (lineHeight / 2);
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, currentY);
        currentY += lineHeight;
    }
}

async function resizeImage(base64Str) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const maxDimension = 2400;
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
    });
}

async function validateAndSetImage(src) {
    const tempImage = new Image();
    await new Promise((resolve, reject) => { 
        tempImage.crossOrigin = "Anonymous";
        tempImage.onload = resolve; 
        tempImage.onerror = reject; 
        tempImage.src = src; 
    });
    
    if (tempImage.width < postcardConfig.validation.minImageDimension || tempImage.height < postcardConfig.validation.minImageDimension) {
        dom.imageWarning.textContent = `Image too small. Please use at least ${postcardConfig.validation.minImageDimension}px.`;
        dom.imageWarning.classList.remove('hidden');
        dom.imageUploader.value = '';
    } else {
        dom.imageWarning.classList.add('hidden');
        appState.uploadedImage = tempImage;
        appState.imageSrcForResend = src;
        appState.isPortrait = tempImage.height > tempImage.width;
        
        appState.imageOffsetX = 0;
        appState.imageOffsetY = 0;
        appState.imageZoom = 1.0;
        
        dom.imagePlaceholder.classList.add('hidden');
        dom.previewContainer.classList.remove('hidden');
        dom.imageControls.classList.remove('hidden');
        
        flipCard(false); 
        updatePostcardLayout();
    }
}

function flipCard(showBack) {
    appState.isFlipped = showBack;
    if (showBack) {
        dom.cardFlipper.classList.add('flipped');
        requestAnimationFrame(() => drawLiveBackCanvas()); 
    } else {
        dom.cardFlipper.classList.remove('flipped');
    }
}

function handleMobileNav(targetId) {
    dom.mobileNavItems.forEach(btn => {
        if(btn.dataset.target === targetId) {
            btn.classList.add('active', 'text-indigo-600');
            btn.classList.remove('text-gray-400');
        } else {
            btn.classList.remove('active', 'text-indigo-600');
            btn.classList.add('text-gray-400');
        }
    });

    Object.keys(dom.controlGroups).forEach(key => {
        if(key === targetId) {
            dom.controlGroups[key].classList.remove('hidden');
            dom.controlGroups[key].classList.add('mobile-active');
        } else {
            dom.controlGroups[key].classList.add('hidden');
            dom.controlGroups[key].classList.remove('mobile-active');
        }
    });
    
    if (targetId === 'message' || targetId === 'address') {
        flipCard(true); 
    } else {
        flipCard(false); 
    }
    
    appState.currentMobileTab = targetId;
}

// --- SENDING LOGIC ---

function openSenderModal() {
     dom.sender.modal.style.display = 'flex';
     dom.sender.nameInput.value = localStorage.getItem('senderName') || '';
     dom.sender.emailInput.value = localStorage.getItem('senderEmail') || '';
     
     const recaptchaKey = postcardConfig.apiKeys && postcardConfig.apiKeys.recaptchaSiteKey;
     if (typeof grecaptcha !== 'undefined' && recaptchaKey) {
         try {
             grecaptcha.render(dom.sender.recaptchaContainer, { 'sitekey' : recaptchaKey });
         } catch(e) {
             grecaptcha.reset();
         }
     }
}

async function handleFinalSend() {
    const senderName = dom.sender.nameInput.value;
    const senderEmail = dom.sender.emailInput.value;
    let recaptchaToken = '';
    
    if(typeof grecaptcha !== 'undefined') recaptchaToken = grecaptcha.getResponse();

    if (!senderName.trim() || !senderEmail.trim()) {
        dom.sender.errorMessage.textContent = 'Please enter your name and email address.';
        dom.sender.errorMessage.classList.remove('hidden');
        return;
    }
    
    localStorage.setItem('senderName', senderName);
    localStorage.setItem('senderEmail', senderEmail);
    
    const btnText = dom.sender.sendBtn.querySelector('.btn-text');
    btnText.style.display = 'none';
    dom.sender.sendBtn.disabled = true;
    
    try {
        // Here we mock the process to prevent complex errors without backend
        // In real app, call generatePostcardImages and /api/request-verification
        
        await new Promise(r => setTimeout(r, 1500)); // Simulate work
        
        dom.sender.detailsView.style.display = 'none';
        dom.sender.checkEmailView.style.display = 'flex';
        
    } catch (error) {
        console.error('Send failed:', error);
        dom.sender.errorMessage.textContent = "Error sending postcard. Please try again.";
        dom.sender.errorMessage.classList.remove('hidden');
        btnText.style.display = 'inline';
        dom.sender.sendBtn.disabled = false;
    }
}

async function handleImageSearch() {
    const query = dom.search.input.value;
    if (!query) return;
    
    dom.search.loader.style.display = 'flex';
    dom.search.resultsContainer.innerHTML = '';
    
    try {
        const apiKey = postcardConfig.apiKeys ? postcardConfig.apiKeys.pixabayApiKey : '';
        if(!apiKey) throw new Error("API Key missing");
        
        const response = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=21`);
        const data = await response.json();
        
        dom.search.loader.style.display = 'none';
        
        if (data.hits && data.hits.length > 0) {
            data.hits.forEach(photo => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'grid-item';
                const img = document.createElement('img');
                img.src = photo.webformatURL;
                img.addEventListener('click', async () => {
                    const fullRes = await fetch(photo.largeImageURL);
                    const blob = await fullRes.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => validateAndSetImage(reader.result);
                    reader.readAsDataURL(blob);
                    dom.search.modal.style.display = 'none';
                });
                imgContainer.appendChild(img);
                dom.search.resultsContainer.appendChild(imgContainer);
            });
            // Initialize Masonry if needed, or simple flex
        } else {
             dom.search.resultsContainer.innerHTML = `<p class="p-4 text-center w-full">No results found.</p>`;
        }
    } catch (e) {
        dom.search.loader.style.display = 'none';
        dom.search.resultsContainer.innerHTML = `<p class="p-4 text-center w-full text-red-500">Error fetching images.</p>`;
    }
}

// --- EVENTS SETUP ---
function initializePostcardCreator() {
    
    // File Upload
    dom.imageUploader.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            let imageDataUrl = e.target.result;
            if (file.size > postcardConfig.validation.maxFileSizeMB * 1024 * 1024) {
                imageDataUrl = await resizeImage(imageDataUrl);
            }
            validateAndSetImage(imageDataUrl);
        };
        reader.readAsDataURL(file);
    });

    // Image Controls
    dom.deleteImageBtn.addEventListener('click', () => {
        appState.uploadedImage = null;
        dom.imagePlaceholder.classList.remove('hidden');
        dom.previewContainer.classList.add('hidden');
        dom.imageControls.classList.add('hidden');
        drawPreviewCanvas();
    });
    
    dom.zoomInBtn.addEventListener('click', () => { appState.imageZoom += 0.1; drawPreviewCanvas(); });
    dom.zoomOutBtn.addEventListener('click', () => { appState.imageZoom = Math.max(1.0, appState.imageZoom - 0.1); drawPreviewCanvas(); });

    // Inputs
    dom.frontText.input.addEventListener('input', () => { appState.frontText.text = dom.frontText.input.value; drawPreviewCanvas(); });
    dom.frontText.fontSelect.addEventListener('change', () => { appState.frontText.font = dom.frontText.fontSelect.value; drawPreviewCanvas(); });
    dom.frontText.colorPicker.addEventListener('input', (e) => { appState.frontText.color = e.target.value; dom.frontText.colorPreview.style.backgroundColor = e.target.value; drawPreviewCanvas(); });

    dom.textInput.addEventListener('input', () => { dom.charCount.textContent = `${dom.textInput.value.length}/500`; drawLiveBackCanvas(); });
    dom.fontSelect.addEventListener('change', drawLiveBackCanvas);
    dom.fontSizeSelect.addEventListener('change', drawLiveBackCanvas);
    dom.colorPicker.addEventListener('input', (e) => { dom.colorPreview.style.backgroundColor = e.target.value; drawLiveBackCanvas(); });

    Object.values(dom.addressInputs).forEach(input => input.addEventListener('input', drawLiveBackCanvas));

    // Nav
    dom.mobileNavItems.forEach(btn => {
        btn.addEventListener('click', (e) => handleMobileNav(e.currentTarget.dataset.target));
    });
    
    dom.flipHintBtn.addEventListener('click', () => flipCard(true));
    dom.flipBackHintBtn.addEventListener('click', () => flipCard(false));

    // Send
    if(dom.desktopSendBtn) dom.desktopSendBtn.addEventListener('click', openSenderModal);
    if(dom.mobileSendBtn) dom.mobileSendBtn.addEventListener('click', openSenderModal);

    dom.sender.sendBtn.addEventListener('click', handleFinalSend);
    dom.sender.closeBtn.addEventListener('click', () => dom.sender.modal.style.display = 'none');
    
    // Search
    if(dom.search.showBtn) dom.search.showBtn.addEventListener('click', () => dom.search.modal.style.display = 'flex');
    if(dom.search.closeBtn) dom.search.closeBtn.addEventListener('click', () => dom.search.modal.style.display = 'none');
    if(dom.search.searchBtn) dom.search.searchBtn.addEventListener('click', handleImageSearch);

    // AI
    if(dom.toggleAiBtn) dom.toggleAiBtn.addEventListener('click', () => dom.aiContainer.classList.toggle('hidden'));
    
    // Desktop Accordion Toggle
    dom.accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
             const content = header.nextElementSibling;
             if(content.style.maxHeight) {
                 content.style.maxHeight = null;
                 content.classList.remove('open');
             } else {
                 content.style.maxHeight = "1000px";
                 content.classList.add('open');
             }
        });
    });

    setupCanvasInteractions();
}

function setupCanvasInteractions() {
    const canvas = dom.previewCanvas.el;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const startDrag = (x, y) => { isDragging = true; lastX = x; lastY = y; };
    const drag = (x, y) => {
        if (!isDragging || !appState.uploadedImage) return;
        const dx = x - lastX;
        const dy = y - lastY;
        appState.imageOffsetX += dx;
        appState.imageOffsetY += dy;
        lastX = x; lastY = y;
        drawPreviewCanvas();
    };
    const endDrag = () => { isDragging = false; };

    canvas.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => drag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    canvas.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); });
    window.addEventListener('touchmove', e => drag(e.touches[0].clientX, e.touches[0].clientY));
    window.addEventListener('touchend', endDrag);
}