// --- CONFIGURATION (Embedded to prevent import errors) ---
const fallbackConfig = {
    content: {
        pageTitle: "SixStarCruises - Send Free Postcards",
        faviconURL: "ssc_favicon.ico",
        loadingImageURL: "https://i.gifer.com/ZZ5H.gif",
        mainTitle: "Send holiday postcards home now.",
        subtitleText: "Upload pics, add a message and we'll post them for you tomorrow. A free service from",
        subtitleLinkText: "Six Star Cruises",
        subtitleLinkURL: "https://www.sixstarcruises.co.uk/",
        companyLogoURL: "" 
    },
    styles: {
        titleColor: "#b9965b",
        subtitleLinkColor: "#b9965b",
        uploadButtonColor: "#b9965b",
        uploadButtonTextColor: "#FFFFFF",
        findImageButtonColor: "#212529",
        findImageButtonTextColor: "#FFFFFF",
        sendPostcardButtonColor: "#212529",
        sendPostcardButtonTextColor: "#FFFFFF",
    },
    email: {
        senderName: "Six Star Cruises",
        subject: "Your Postcard Proof for {{recipientName}}",
        body: "Hi {{senderName}}, here is the final proof of your postcard. Please click the link to confirm and send."
    },
    confirmationEmail: {
        senderName: "Six Star Cruises Team",
        subject: "Your Postcard to {{recipientName}} has been sent!",
        body: "Hi {{senderName}}, thank you for using our service. Your postcard is on its way.",
        promoText: "Savings Event: Book next year with savings of up to 40% and Free Business Class Flights",
        promoLinkURL: "https://www.sixstarcruises.co.uk/",
        promoImageURL: "sixstars.png"
    },
    successPage: {
        pageTitle: "Postcard Sent!",
        faviconURL: "ssc_favicon.ico",
        heading: "Success!",
        headingColor: "#0E0B3D",
        subheading: "Hope you're having a great holiday.",
        buttonText: "Send again, to someone else?",
        buttonColor: "#212529",
        buttonTextColor: "#FFFFFF",
        promoText: "Savings Event: Book next year with savings of up to 40% and Free Business Class Flights",
        promoLinkURL: "https://www.sixstarcruises.co.uk/",
        promoImageURL: "sixstars.png"
    },
    postcardPromo: {
        imageURL: ""
    },
    limits: {
        postcardLimit: 5,
        limitDays: 30
    },
    print: {
        dpi: 300,
        a5WidthMM: 210,
        a5HeightMM: 148,
        bleedMM: 3,
        handleRadius: 8
    },
    validation: {
        minImageDimension: 800,
        maxFileSizeMB: 4
    }
};

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

// --- MAIN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    populateDomReferences();
    loadConfigAndInitialize();
});

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
        postcardConfig.apiKeys = { recaptchaSiteKey: '', pixabayApiKey: '' }; 
        showGlobalError("Could not load application configuration. Using offline defaults.");
    } finally {
        applyConfiguration();
        setupMobileInteractions(); 
        dom.loadingOverlay.style.display = 'none';
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
    dom.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });

    // 2. Flip Button
    dom.flipBtn.addEventListener('click', () => {
        toggleFlip();
    });

    // 3. Auto-update back preview on input
    const backInputs = [
        dom.textInput, dom.fontSelect, dom.fontSizeSelect, dom.colorPicker,
        ...Object.values(dom.addressInputs)
    ];
    backInputs.forEach(input => {
        input.addEventListener('input', () => {
            if (appState.isFlipped) drawBackPreview();
            if (input === dom.textInput) {
                debouncedProfanityCheck(dom.textInput.value, dom.messageProfanityWarning);
                checkMessageOverflow();
            }
        });
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
    dom.search.closeBtn.addEventListener('click', () => dom.search.modal.style.display = 'none');
    dom.search.searchBtn.addEventListener('click', handleImageSearch);
    dom.search.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleImageSearch(); });

    // Front Text
    dom.frontText.input.addEventListener('input', () => {
        appState.frontText.text = dom.frontText.input.value;
        if (appState.frontText.x === null) {
            appState.frontText.x = dom.previewCanvas.el.width / 2;
            appState.frontText.y = dom.previewCanvas.el.height / 2;
        }
        debouncedProfanityCheck(appState.frontText.text, dom.frontText.profanityWarning);
        drawPreviewCanvas();
    });
    [dom.frontText.fontSelect, dom.frontText.colorPicker].forEach(el => {
        el.addEventListener('input', () => {
             appState.frontText.font = dom.frontText.fontSelect.value;
             appState.frontText.color = dom.frontText.colorPicker.value;
             drawPreviewCanvas();
        });
    });
    dom.frontText.clearBtn.addEventListener('click', () => {
        dom.frontText.input.value = '';
        appState.frontText.text = '';
        drawPreviewCanvas();
    });

    // Message Controls (Sync with preview)
    [dom.fontSelect, dom.fontSizeSelect, dom.colorPicker].forEach(el => {
        el.addEventListener('input', () => {
             if (appState.isFlipped) drawBackPreview();
        });
    });

    // Send Button
    dom.sendPostcardBtn.addEventListener('click', handleSendPostcard);
    
    // Sender Modal
    dom.sender.sendBtn.addEventListener('click', handleFinalSend);
    dom.sender.closeBtn.addEventListener('click', () => {
        dom.sender.modal.style.display = 'none';
        dom.sender.detailsView.style.display = 'flex'; 
        dom.sender.checkEmailView.style.display = 'none';
    });

    // AI Button
    if(dom.aiGenerateBtn) {
        dom.aiGenerateBtn.addEventListener('click', handleAIAssist);
    }

    // Zoom Controls
    dom.deleteImageBtn.addEventListener('click', resetImagePreviews);
    dom.zoomInBtn.addEventListener('click', () => {
        appState.imageZoom += 0.1;
        drawPreviewCanvas();
    });
    dom.zoomOutBtn.addEventListener('click', () => {
        appState.imageZoom = Math.max(1.0, appState.imageZoom - 0.1);
        drawPreviewCanvas();
    });

    // Canvas Interactions
    const canvas = dom.previewCanvas.el;
    canvas.addEventListener('mousedown', handleInteractionStart);
    canvas.addEventListener('mousemove', handleInteractionMove);
    document.addEventListener('mouseup', handleInteractionEnd);
    canvas.addEventListener('touchstart', handleInteractionStart);
    canvas.addEventListener('touchmove', handleInteractionMove);
    canvas.addEventListener('touchend', handleInteractionEnd);
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

function toggleFlip(forceState = null) {
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const lines = text.split('\n');
    let currentY = y;
    lines.forEach(line => {
        const words = line.split(' ');
        let currentLine = '';
        for(let n = 0; n < words.length; n++) {
            const testLine = currentLine + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(currentLine, x, currentY);
                currentLine = words[n] + ' ';
                currentY += lineHeight;
            } else {
                currentLine = testLine;
            }
        }
        ctx.fillText(currentLine, x, currentY);
        currentY += lineHeight;
    });
}

function showGlobalError(message) {
    dom.errorBannerMessage.textContent = message;
    dom.errorBanner.classList.remove('hidden');
    setTimeout(() => dom.errorBanner.classList.add('hidden'), 5000);
}

function applyConfiguration() {
    // This function applies config to the page
    // Note: Favicon and Page Title are handled by the preload script
    
    // --- NEW: Company Logo ---
    if (postcardConfig.content.companyLogoURL) {
        dom.companyLogo.src = postcardConfig.content.companyLogoURL;
        dom.companyLogo.classList.remove('hidden');
    } else {
        dom.companyLogo.classList.add('hidden');
    }
    
    dom.loadingImage.src = postcardConfig.content.loadingImageURL;
    dom.mainTitle.textContent = postcardConfig.content.mainTitle;
    dom.mainTitle.style.color = postcardConfig.styles.titleColor;

    // Apply button styles
    dom.uploadButton.style.backgroundColor = postcardConfig.styles.uploadButtonColor;
    dom.uploadButton.style.color = postcardConfig.styles.uploadButtonTextColor;
    dom.findImageButton.style.backgroundColor = postcardConfig.styles.findImageButtonColor;
    dom.findImageButton.style.color = postcardConfig.styles.findImageButtonTextColor;
    dom.sendPostcardBtn.style.backgroundColor = postcardConfig.styles.sendPostcardButtonColor;
    dom.sendPostcardBtn.style.color = postcardConfig.styles.sendPostcardButtonTextColor;
    
    // --- NEW: AI Assist Button Style ---
    // Make sure aiGenerateBtn exists before styling it
    if (dom.aiGenerateBtn) {
        dom.aiGenerateBtn.style.backgroundColor = postcardConfig.styles.uploadButtonColor;
        dom.aiGenerateBtn.style.color = postcardConfig.styles.uploadButtonTextColor;
    }
}

// --- CORE HELPER FUNCTIONS ---

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
const debouncedUpdateAllPreviews = debounce(() => {}, 300);
const debouncedProfanityCheck = debounce(checkForProfanityAPI, 500);

async function checkForProfanityAPI(text, warningElement) {
    if (!text.trim()) {
        warningElement.classList.add('hidden');
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
            warningElement.textContent = "Be more friendly - consider revising the text";
            warningElement.classList.remove('hidden');
            return true;
        } else {
            warningElement.classList.add('hidden');
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
    const canvas = dom.previewCanvas.el;
    if (!canvas) return;
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
        // --- NEW: Add padding for email shadow/outline ---
        const previewBaseWidth = 1200;
        const padding = 20; // 20px padding for shadow
        finalWidthPx = previewBaseWidth + padding * 2;
        finalHeightPx = Math.round(previewBaseWidth / A5_RATIO) + padding * 2;
        // --- END NEW ---
    } else {
        const coreWidthPx = Math.round((a5WidthMM / MM_TO_INCH) * dpi);
        const coreHeightPx = Math.round((a5HeightMM / MM_TO_INCH) * dpi);
        // Always use landscape dimensions for print
        finalWidthPx = coreWidthPx + (bleedPxForPrint * 2);
        finalHeightPx = coreHeightPx + (bleedPxForPrint * 2);
    }
    
    // --- FRONT CANVAS (Core Drawing) ---
    // Create a temporary canvas at the *actual* postcard size (with bleed if for print)
    const tempFrontCanvas = document.createElement('canvas');
    const tempFrontWidth = forEmail ? finalWidthPx - 40 : finalWidthPx; // Subtract email padding
    const tempFrontHeight = forEmail ? finalHeightPx - 40 : finalHeightPx; // Subtract email padding
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

    // --- BACK CANVAS (Core Drawing) ---
    const tempBackCanvas = document.createElement('canvas');
    const mainContentWidthPx = forEmail ? finalWidthPx - 40 : Math.round((a5WidthMM / MM_TO_INCH) * dpi);
    const mainContentHeightPx = forEmail ? finalHeightPx - 40 : Math.round((a5HeightMM / MM_TO_INCH) * dpi);
    tempBackCanvas.width = mainContentWidthPx;
    tempBackCanvas.height = mainContentHeightPx;
    const tempBackCtx = tempBackCanvas.getContext('2d');
    tempBackCtx.fillStyle = 'white';
    tempBackCtx.fillRect(0, 0, mainContentWidthPx, mainContentHeightPx);
    tempBackCtx.strokeStyle = '#e5e7eb';
    tempBackCtx.lineWidth = 5;
    tempBackCtx.beginPath();
    const dividerX = (mainContentWidthPx / 2) + 170;
    tempBackCtx.moveTo(dividerX, 50);
    tempBackCtx.lineTo(dividerX, mainContentHeightPx - 50);
    tempBackCtx.stroke();
    tempBackCtx.strokeStyle = '#cccccc';
    tempBackCtx.lineWidth = 5;
    tempBackCtx.setLineDash([15, 15]);
    tempBackCtx.strokeRect(mainContentWidthPx - 300, 50, 250, 250);
    tempBackCtx.setLineDash([]);
    
    const fontSize = dom.fontSizeSelect.value;
    const fontWeight = '400';
    const hiResFontSize = fontSize * (mainContentWidthPx / 504) * 1.2;
    const fontFamily = dom.fontSelect.value;
    tempBackCtx.fillStyle = dom.colorPicker.value;
    tempBackCtx.font = `${fontWeight} ${hiResFontSize}px ${fontFamily}`;
    tempBackCtx.textAlign = 'left';
    tempBackCtx.textBaseline = 'top';
    const messageText = dom.textInput.value;
    const lines = messageText.split('\n');
    
    // --- FIX 3: Nudge message left by 25px (total 50px) ---
    const messageX = 50; // Was 75
    
    let messageY = hiResFontSize * 1.2;
    const messageMaxWidth = dividerX - messageX - 20; // This compensates automatically
    const lineHeight = hiResFontSize * 1.2;
    lines.forEach(line => {
        const words = line.split(' ');
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = tempBackCtx.measureText(testLine);
            if (metrics.width > messageMaxWidth && i > 0) {
                tempBackCtx.fillText(currentLine, messageX, messageY);
                messageY += lineHeight;
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        tempBackCtx.fillText(currentLine, messageX, messageY);
        messageY += lineHeight;
    });
    
    if (includeAddressOnBack) {
        const hiResAddressFontSize = 12 * (mainContentWidthPx / 504) * 1.2;
        tempBackCtx.fillStyle = '#333';
        tempBackCtx.font = `400 ${hiResAddressFontSize}px Inter`;
        tempBackCtx.textAlign = 'left';

        // --- NEW: Address Wrapping Logic ---
        const addressLines = [
            dom.addressInputs.name.value, 
            dom.addressInputs.line1.value, 
            dom.addressInputs.line2.value, 
            dom.addressInputs.city.value, 
            dom.addressInputs.postcode.value
        ].filter(Boolean); // Get all non-empty lines
        
        const addressBlockHeight = addressLines.length * hiResAddressFontSize * 1.4; // Initial estimate
        const addressX = dividerX + 20;
        let addressY = (mainContentHeightPx / 2) - (addressBlockHeight / 2); // Start Y
        const addressLineHeight = hiResAddressFontSize * 1.4;
        const addressMaxWidth = mainContentWidthPx - addressX - 20; // Max width for address

        const allWrappedLines = [];
        addressLines.forEach(line => {
            // Wrap each line based on pixel width, not char count, for accuracy
            const wrapped = wrapAddressLine(tempBackCtx, line, addressMaxWidth);
            allWrappedLines.push(...wrapped);
        });

        // Re-calculate vertical centering based on the *actual* number of lines
        const finalAddressBlockHeight = allWrappedLines.length * addressLineHeight;
        addressY = (mainContentHeightPx / 2) - (finalAddressBlockHeight / 2);

        allWrappedLines.forEach(line => {
            tempBackCtx.fillText(line, addressX, addressY);
            addressY += addressLineHeight;
        });
        // --- END NEW: Address Wrapping ---
    }
    
    // --- FINAL CANVAS PREPARATION ---
    
    // If for print, return the raw, unstyled canvases
    if (!forEmail) {
        return { frontCanvas: tempFrontCanvas, backCanvas: tempBackCanvas };
    }

    // --- NEW: If for email, create new canvases and add shadow/outline ---
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = finalWidthPx;
    frontCanvas.height = finalHeightPx;
    const frontCtx = frontCanvas.getContext('2d');
    
    const backCanvas = document.createElement('canvas');
    backCanvas.width = finalWidthPx; // Back canvas for email has same outer dims
    backCanvas.height = finalHeightPx;
    const backCtx = backCanvas.getContext('2d');

    // Apply shadow and outline
    [frontCtx, backCtx].forEach(ctx => {
        // --- FIX 2: Soft shadow only, no outline ---
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'; // Softer shadow color
        ctx.shadowBlur = 6; // Softer blur
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4; // Standard shadow-md offset
        // (Removed strokeStyle and lineWidth)
        // --- END FIX 2 ---
    });

    // Draw the temp canvases onto the final canvases (with padding)
    const padding = 20;
    frontCtx.drawImage(tempFrontCanvas, padding, padding);
    // frontCtx.strokeRect(padding, padding, tempFrontWidth, tempFrontHeight); // <-- FIX 2: Removed outline
    
    // The back canvas for email needs to be drawn relative to the front
    const backRatio = tempBackCanvas.width / tempBackCanvas.height;
    const backHeight = tempFrontHeight;
    const backWidth = backHeight * backRatio;
    const backX = (finalWidthPx - backWidth) / 2;
    const backY = padding;
    
    backCtx.drawImage(tempBackCanvas, backX, backY, backWidth, backHeight);
    // backCtx.strokeRect(backX, backY, backWidth, backHeight); // <-- FIX 2: Removed outline
    
    return { frontCanvas, backCanvas };
}

async function handleSendPostcard() {
     const required = ['name', 'line1', 'city', 'postcode'];
     const valid = required.every(f => dom.addressInputs[f].value.trim());
     if (!valid) {
         // --- FIX: Use custom modal, not alert ---
         showGlobalError('Please fill in all required recipient address fields.');
         const firstEmpty = requiredAddressFields.find(input => input.value.trim() === '');
         if (firstEmpty) {
            //  toggleAccordion(document.getElementById('accordion-header-4'), true); // Open address accordion
             firstEmpty.focus();
         }
         return;
     }
     const frontIsProfane = await checkForProfanityAPI(dom.frontText.input.value, dom.frontText.profanityWarning);
     const backIsProfane = await checkForProfanityAPI(dom.textInput.value, dom.messageProfanityWarning);
     if (frontIsProfane || backIsProfane) {
         // --- FIX: Use custom modal, not alert ---
         showGlobalError("Be more friendly - consider revising the text.");
         return;
     }
     dom.sender.modal.style.display = 'flex';
     if (typeof grecaptcha !== 'undefined' && dom.sender.recaptchaContainer.innerHTML === '') {
         grecaptcha.render(dom.sender.recaptchaContainer, { 'sitekey' : postcardConfig.apiKeys.recaptchaSiteKey });
     }
}

async function handleFinalSend() {
    const senderName = dom.sender.nameInput.value;
    const senderEmail = dom.sender.emailInput.value;
    const recaptchaToken = grecaptcha.getResponse();
    if (!senderName.trim() || !senderEmail.trim()) {
        dom.sender.errorMessage.textContent = 'Please enter your name and email address.';
        dom.sender.errorMessage.classList.remove('hidden');
        return;
    }
    if (!recaptchaToken) {
        dom.sender.errorMessage.textContent = 'Please complete the reCAPTCHA verification.';
        dom.sender.errorMessage.classList.remove('hidden');
        return;
    }
    localStorage.setItem('senderName', senderName);
    localStorage.setItem('senderEmail', senderEmail);
    const btnText = dom.sender.sendBtn.querySelector('.btn-text');
    btnText.style.display = 'none';
    const loader = document.createElement('div');
    loader.className = 'loader';
    dom.sender.sendBtn.prepend(loader);
    dom.sender.sendBtn.disabled = true;
    dom.sender.errorMessage.classList.add('hidden');
    try {
        const { frontCanvas: frontCanvasForPrint, backCanvas: backCanvasForPrintNoAddress } = await generatePostcardImages({ forEmail: false, includeAddressOnBack: false });
        
        // --- START: Create LOW-RESOLUTION versions for email ---
        const createLowResCanvas = (sourceCanvas, maxWidth = 400) => {
            const scale = maxWidth / sourceCanvas.width;
            const newWidth = sourceCanvas.width * scale;
            const newHeight = sourceCanvas.height * scale;
            const lowResCanvas = document.createElement('canvas');
            lowResCanvas.width = newWidth;
            lowResCanvas.height = newHeight;
            const ctx = lowResCanvas.getContext('2d');
            ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
            return lowResCanvas;
        };

        // --- FIX: Generate *email* images (with shadow) and then resize them ---
        const { frontCanvas: highResEmailFrontCanvas, backCanvas: highResEmailBackCanvas } = await generatePostcardImages({ forEmail: true, includeAddressOnBack: true });
        const lowResFrontCanvasForEmail = createLowResCanvas(highResEmailFrontCanvas);
        const lowResBackCanvasForEmail = createLowResCanvas(highResEmailBackCanvas);
        // --- END FIX ---


        const frontBlobForPrint = await new Promise(resolve => frontCanvasForPrint.toBlob(resolve, 'image/jpeg', 0.9));
        const frontBlobForEmail = await new Promise(resolve => lowResFrontCanvasForEmail.toBlob(resolve, 'image/jpeg', 0.8));
        const backBlobForPrint = await new Promise(resolve => backCanvasForPrintNoAddress.toBlob(resolve, 'image/jpeg', 0.9));
        const backBlobForEmail = await new Promise(resolve => lowResBackCanvasForEmail.toBlob(resolve, 'image/jpeg', 0.8));
        
        const sanitizedEmail = senderEmail.replace(/[^a-z0-9]/gi, '-');
        const sanitizedName = senderName.replace(/[^a-z0-9]/gi, '-');
        const sanitizedPostcode = dom.addressInputs.postcode.value.replace(/[^a-z0-9]/gi, '-');
        const timestamp = Date.now();
        const frontPrintFilename = `${sanitizedEmail}-${sanitizedName}-${sanitizedPostcode}-front-print-${timestamp}.jpg`;
        const frontEmailFilename = `${sanitizedEmail}-${sanitizedName}-${sanitizedPostcode}-front-email-${timestamp}.jpg`;
        const backPrintFilename = `${sanitizedEmail}-${sanitizedName}-${sanitizedPostcode}-back-print-${timestamp}.jpg`;
        const backEmailFilename = `${sanitizedEmail}-${sanitizedName}-${sanitizedPostcode}-back-email-${timestamp}.jpg`;
        
        const uploadAndGetData = async (filename, blob) => {
            // --- FIX: Use absolute URL for fetch ---
            const response = await fetch(new URL(`/api/upload?filename=${filename}`, window.location.origin), { method: 'POST', body: blob });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to upload ${filename}. Server responded with ${response.status}: ${errorData.details || errorData.error}`);
            }
            return response.json();
        };
        const [frontEmailBlobData, backEmailBlobData] = await Promise.all([
            uploadAndGetData(frontEmailFilename, frontBlobForEmail),
            uploadAndGetData(backEmailFilename, backBlobForEmail)
        ]);
        const frontPrintBlobData = await uploadAndGetData(frontPrintFilename, frontBlobForPrint);
        const backPrintBlobData = await uploadAndGetData(backPrintFilename, backBlobForPrint);
        const recipient = {};
        for (const key in dom.addressInputs) {
            recipient[key] = dom.addressInputs[key].value.trim();
        }
        const resendData = {
            imageSrc: appState.imageSrcForResend,
            isPortrait: appState.isPortrait,
            frontText: appState.frontText,
            message: {
                text: dom.textInput.value,
                font: dom.fontSelect.value,
                color: dom.colorPicker.value,
                // --- NEW: Use fontSizeSelect and default weight ---
                size: dom.fontSizeSelect.value,
                weight: '400'
            }
        };
        localStorage.setItem('lastPostcardDesign', JSON.stringify(resendData));
        
        const postcardData = {
            sender: { name: senderName, email: senderEmail },
            recipient: recipient,
            frontImageUrl: frontPrintBlobData.url,
            frontImageUrlForEmail: frontEmailBlobData.url,
            backImageUrl: backPrintBlobData.url, 
            backImageUrlWithAddress: backEmailBlobData.url, // This is the low-res one
            emailConfig: {
                subject: postcardConfig.email.subject,
                body: postcardConfig.email.body,
                // --- NEW: Pass button colors for email ---
                buttonColor: postcardConfig.styles.sendPostcardButtonColor,
                buttonTextColor: postcardConfig.styles.sendPostcardButtonTextColor,
                senderName: postcardConfig.email.senderName
            },
            recaptchaToken: recaptchaToken
        };
        
        // --- FIX: Use absolute URL for fetch ---
        const verificationResponse = await fetch(new URL('/api/request-verification', window.location.origin), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postcardData })
        });
        if (!verificationResponse.ok) {
            const errorResult = await verificationResponse.json();
            throw new Error(errorResult.message || 'Failed to send verification email.');
        }
        dom.sender.detailsView.style.display = 'none';
        dom.sender.checkEmailView.style.display = 'flex';
    } catch (error) {
        console.error('An error occurred during the final send process:', error);
        dom.sender.errorMessage.textContent = error.message || 'An unknown error occurred. Please try again.';
        dom.sender.errorMessage.classList.remove('hidden');
        btnText.style.display = 'inline';
        if(loader.parentNode) loader.remove();
        dom.sender.sendBtn.disabled = false;
        grecaptcha.reset();
    }
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedUpdateAllPreviews = debounce(updateFinalPreviews, 300);
const debouncedProfanityCheck = debounce(checkForProfanityAPI, 500);


function initializePostcardCreator() {
    
    // --- FIX 1: Remove faulty client-side API key check ---
    // The server will handle API key checks.
    
    if (!postcardConfig.apiKeys || !postcardConfig.apiKeys.recaptchaSiteKey) {
        console.warn("ReCAPTCHA key not configured, postcard sending will be disabled.");
        if(dom.sendPostcardBtn) dom.sendPostcardBtn.disabled = true;
    }
    
    if (!postcardConfig.apiKeys || !postcardConfig.apiKeys.pixabayApiKey) {
        console.warn("Pixabay API key not configured, image search will be disabled.");
        if(dom.findImageButton) dom.findImageButton.disabled = true;
    }


    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sendAgain') === 'true') {
        const lastDesign = JSON.parse(localStorage.getItem('lastPostcardDesign'));
        if (lastDesign) {
            dom.frontText.input.value = lastDesign.frontText.text;
            dom.textInput.value = lastDesign.message.text;
            dom.fontSelect.value = lastDesign.message.font;
            dom.colorPicker.value = lastDesign.message.color;
            // --- NEW: Use fontSizeSelect and default weight ---
            dom.fontSizeSelect.value = lastDesign.message.size || '16'; // Default to 16 if not set
            // (Weight is now hardcoded to 400)
            appState.frontText = lastDesign.frontText;
            appState.isPortrait = lastDesign.isPortrait || false;
            if (lastDesign.imageSrc) {
                validateAndSetImage(lastDesign.imageSrc);
            }
            // toggleAccordion(document.getElementById('accordion-header-3'), true); // NO LONGER NEEDED
            if(dom.addressInputs.name) dom.addressInputs.name.focus();
        }
    }
    // Accordion logic removed
    // dom.accordionHeaders.forEach...
    
    if(dom.imageUploader) {
        dom.imageUploader.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';
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
    }
    
    if(dom.deleteImageBtn) dom.deleteImageBtn.addEventListener('click', resetImagePreviews);
    if(dom.zoomInBtn) dom.zoomInBtn.addEventListener('click', () => {
        appState.imageZoom += 0.1;
        drawPreviewCanvas();
        debouncedUpdateAllPreviews();
    });
    if(dom.zoomOutBtn) dom.zoomOutBtn.addEventListener('click', () => {
        appState.imageZoom = Math.max(1.0, appState.imageZoom - 0.1);
        drawPreviewCanvas();
        debouncedUpdateAllPreviews();
    });
    Object.values(dom.frontText).forEach(el => {
        if(el && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
            el.addEventListener('input', () => {
                const wasEmpty = !appState.frontText.text;
                appState.frontText.text = dom.frontText.input.value;
                appState.frontText.font = dom.frontText.fontSelect.value;
                appState.frontText.color = dom.frontText.colorPicker.value;
                // No ticks logic needed
                if (wasEmpty && appState.frontText.text && dom.previewCanvas.el.width > 0) {
                    appState.frontText.x = dom.previewCanvas.el.width / 2;
                    appState.frontText.y = dom.previewCanvas.el.height / 2;
                }
                debouncedProfanityCheck(appState.frontText.text, dom.frontText.profanityWarning);
                drawPreviewCanvas();
                debouncedUpdateAllPreviews();
            });
        }
    });
    // No Thanks button removed? Or keep if needed for mobile flow?
    // dom.noThanksTextBtn...

    // Canvas Interaction
    if(dom.previewCanvas.el) {
        // ... (Add interaction listeners here if not added elsewhere)
    }
    
    // NEW: Add listener for AI button
    if(dom.aiGenerateBtn) { // Check if it exists before adding listener
        dom.aiGenerateBtn.addEventListener('click', handleAIAssist);
    }
    
    // toggleAccordion(document.getElementById('accordion-header-5'), true);
    // toggleAccordion(document.getElementById('accordion-header-1'), true);
}