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
// This is the main entry point, ensuring the DOM is ready first.
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
        sendPostcardBtn: document.getElementById('send-postcard-btn'),
        accordionHeaders: document.querySelectorAll('.accordion-header'),
        imageUploader: document.getElementById('image-uploader'),
        imagePlaceholder: document.getElementById('image-placeholder'),
        previewContainer: document.getElementById('preview-container'),
        imageWarning: document.getElementById('image-warning'),
        imageControls: document.getElementById('image-controls'),
        deleteImageBtn: document.getElementById('delete-image-btn'),
        zoomControls: document.getElementById('zoom-controls'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        previewCanvas: {
            el: document.getElementById('preview-canvas'),
        },
        frontText: {
            input: document.getElementById('front-text-input'),
            fontSelect: document.getElementById('front-font-select'),
            colorPicker: document.getElementById('front-color-picker'),
            profanityWarning: document.getElementById('front-text-profanity-warning'),
        },
        textInput: document.getElementById('text-input'),
        fontSelect: document.getElementById('font-select'),
        colorPicker: document.getElementById('color-picker'),
        fontSizeSlider: document.getElementById('font-size-slider'),
        fontSizeValue: document.getElementById('font-size-value'),
        fontWeightSlider: document.getElementById('font-weight-slider'),
        fontWeightValue: document.getElementById('font-weight-value'),
        messageWarning: document.getElementById('message-warning'),
        messageProfanityWarning: document.getElementById('message-profanity-warning'),
        addressInputs: { name: document.getElementById('address-name'), line1: document.getElementById('address-line1'), line2: document.getElementById('address-line2'), city: document.getElementById('address-city'), postcode: document.getElementById('address-postcode'), country: document.getElementById('address-country') },
        finalPreviewFrontContainer: document.getElementById('final-preview-front-container'),
        finalPreviewFront: document.getElementById('final-preview-front'),
        finalPreviewBack: document.getElementById('final-preview-back'),
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
        search: { modal: document.getElementById('search-modal'), showBtn: document.getElementById('find-image-button'), closeBtn: document.getElementById('close-search-modal-btn'), input: document.getElementById('search-input'), searchBtn: document.getElementById('search-btn'), resultsContainer: document.getElementById('search-results'), loader: document.getElementById('search-loader') },
        zoom: { modal: document.getElementById('zoom-modal'), image: document.getElementById('zoomed-image'), closeBtn: document.getElementById('close-zoom-modal-btn')},
        ticks: { one: document.getElementById('tick-1'), two: document.getElementById('tick-2'), three: document.getElementById('tick-3'), four: document.getElementById('tick-4') },
        noThanksTextBtn: document.getElementById('no-thanks-text-btn'),
        errorBanner: document.getElementById('error-banner'),
        errorBannerMessage: document.getElementById('error-banner-message'),
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingImage: document.getElementById('loading-image'),
        mainContent: document.getElementById('main-content'),
    };
}

async function loadConfigAndInitialize() {
    try {
        const response = await fetch('/api/get-config');
        if (!response.ok) {
             throw new Error('Could not fetch config from API');
        }
        postcardConfig = await response.json();
        console.error("Nomi1");
    } catch (error) {
        console.error("Could not fetch from DB, using local defaults.", error);
        postcardConfig = fallbackConfig;
        postcardConfig.apiKeys = { recaptchaSiteKey: '', pixabayApiKey: '' }; 
        // showGlobalError("Could not load application configuration. Using offline defaults.");
        console.error("Nomi2");
    } finally {
        applyConfiguration();
        initializePostcardCreator();
        dom.loadingOverlay.style.display = 'none';
        dom.mainContent.style.display = 'block';
        console.error("Nomi3");
    }
}


// --- CORE LOGIC ---

function showGlobalError(message) {
    dom.errorBannerMessage.textContent = message;
    dom.errorBanner.classList.remove('hidden');
}

function applyConfiguration() {
    document.title = postcardConfig.content.pageTitle;
    dom.favicon.href = postcardConfig.content.faviconURL;
    dom.loadingImage.src = postcardConfig.content.loadingImageURL;
    dom.mainTitle.textContent = postcardConfig.content.mainTitle;
    dom.mainTitle.style.color = postcardConfig.styles.titleColor;

    const subtitleLink = `<a href="${postcardConfig.content.subtitleLinkURL}" target="_blank" class="font-bold hover:underline" style="color: ${postcardConfig.styles.subtitleLinkColor};">${postcardConfig.content.subtitleLinkText}</a>`;
    dom.subtitle.innerHTML = `${postcardConfig.content.subtitleText} ${subtitleLink}.`;

    dom.uploadButton.style.backgroundColor = postcardConfig.styles.uploadButtonColor;
    dom.uploadButton.style.color = postcardConfig.styles.uploadButtonTextColor;
    dom.findImageButton.style.backgroundColor = postcardConfig.styles.findImageButtonColor;
    dom.findImageButton.style.color = postcardConfig.styles.findImageButtonTextColor;
    dom.sendPostcardBtn.style.backgroundColor = postcardConfig.styles.sendPostcardButtonColor;
    dom.sendPostcardBtn.style.color = postcardConfig.styles.sendPostcardButtonTextColor;
}

// ... rest of the file is the same as the last version of app.js ...
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
        if (!response.ok) {
            console.warn("Profanity check failed, allowing submission.");
            return false; 
        }
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
        console.warn("Could not reach profanity API, allowing submission.", error);
        warningElement.classList.add('hidden');
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
        ctx.translate(bleedPx, bleedPx);
        const effectiveScale = (appState.isPortrait && width > height) ? 
            height / dom.previewCanvas.el.height : 
            width / dom.previewCanvas.el.width;

        const scaledOffsetX = appState.imageOffsetX * effectiveScale;
        const scaledOffsetY = appState.imageOffsetY * effectiveScale;
        drawCoverImage(ctx, appState.uploadedImage, width - (bleedPx * 2), height - (bleedPx * 2), scaledOffsetX, scaledOffsetY, appState.imageZoom);
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
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const safetyMarginX = (postcardConfig.print.bleedMM / postcardConfig.print.a5WidthMM) * canvas.width;
    const safetyMarginY = (postcardConfig.print.bleedMM / postcardConfig.print.a5HeightMM) * canvas.height;
    ctx.strokeRect(safetyMarginX, safetyMarginY, canvas.width - 2 * safetyMarginX, canvas.height - 2 * safetyMarginY);
    ctx.restore();
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
        const metrics = getTextMetrics(ctx);
        if (!metrics) return;
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
        ctx.lineWidth = 1;
        Object.values(handles).forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, postcardConfig.print.handleRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
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
    let currentY = y - (totalHeight / 2) + (lineHeight / 2);
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, currentY);
        currentY += lineHeight;
    }
}

function getTextMetrics(ctx) {
    const { text, font, size, x, y, width: textWidth } = appState.frontText;
    if (!text) return null;
    ctx.font = `${size}px ${font}`;
    const words = text.split(' ');
    let line = '';
    let lines = [];
    for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > textWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    const height = lines.length * size * 1.2;
    const box = {
        x: -textWidth / 2,
        y: -height / 2,
        width: textWidth,
        height: height
    };
    return { x, y, box };
}

function getHandlePositions(metrics) {
    if (!metrics) return {};
    const { x, y, box } = metrics;
    const rotationRad = appState.frontText.rotation * Math.PI / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    const resizeHandleRelX = box.x + box.width;
    const resizeHandleRelY = box.y + box.height;
    const rotateHandleRelX = box.x + box.width / 2;
    const rotateHandleRelY = box.y - 20;
    const widthHandleRelX = box.x + box.width;
    const widthHandleRelY = box.y + box.height / 2;
    return {
        size: {
            x: x + (resizeHandleRelX * cos - resizeHandleRelY * sin),
            y: y + (resizeHandleRelY * sin + resizeHandleRelY * cos)
        },
        rotate: {
            x: x + (rotateHandleRelX * cos - rotateHandleRelY * sin),
            y: y + (rotateHandleRelY * sin + rotateHandleRelY * cos)
        },
            width: {
            x: x + (widthHandleRelX * cos - widthHandleRelY * sin),
            y: y + (widthHandleRelY * sin + widthHandleRelY * cos)
        }
    };
}

function typePlaceholder(element, text) {
    if (appState.messagePlaceholderInterval) clearInterval(appState.messagePlaceholderInterval);
    let i = 0;
    element.placeholder = ""; 
    appState.messagePlaceholderInterval = setInterval(() => {
        if (i < text.length) {
            element.placeholder += text.charAt(i++);
        } else {
            clearInterval(appState.messagePlaceholderInterval);
        }
    }, 80);
}

function toggleAccordion(header, forceOpen = null) {
    const content = header.nextElementSibling;
    const isOpen = content.classList.contains('open');
    if (forceOpen === true && !isOpen) {
        content.classList.add('open');
        header.classList.add('open');
    } else if (forceOpen === false && isOpen) {
        content.classList.remove('open');
        header.classList.remove('open');
    } else if (forceOpen === null) {
        content.classList.toggle('open');
        header.classList.toggle('open');
    }
    const wasOpened = content.classList.contains('open');
    if (wasOpened) {
            if (header.id.startsWith('accordion-header-5')) debouncedUpdateAllPreviews();
            if (header.id.startsWith('accordion-header-3') && dom.textInput.value === '') {
            typePlaceholder(dom.textInput, "Write your message or copy and paste here..");
        }
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
        img.onerror = (error) => {
            console.error("Error loading image for resizing:", error);
            reject(error);
        };
    });
}

function updatePostcardLayout() {
    const canvas = dom.previewCanvas.el;
    const container = dom.previewContainer;
    container.classList.remove('aspect-[210/148]', 'aspect-[148/210]');
    if (appState.isPortrait) {
        container.classList.add('aspect-[148/210]');
    } else {
        container.classList.add('aspect-[210/148]');
    }
    requestAnimationFrame(() => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawPreviewCanvas();
        debouncedUpdateAllPreviews();
    });
}

function resetImagePanAndZoom() {
    appState.imageOffsetX = 0;
    appState.imageOffsetY = 0;
    appState.imageZoom = 1.0;
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
        dom.imageWarning.textContent = `For best quality, please upload an image that is at least ${postcardConfig.validation.minImageDimension}px on its shortest side.`;
        dom.imageWarning.classList.remove('hidden');
        dom.imageUploader.value = '';
        resetImagePreviews();
    } else {
        dom.imageWarning.classList.add('hidden');
        appState.uploadedImage = tempImage;
        appState.imageSrcForResend = src;
        appState.isPortrait = tempImage.height > tempImage.width;
        resetImagePanAndZoom();
        dom.imagePlaceholder.classList.add('hidden');
        dom.previewContainer.classList.remove('hidden');
        dom.imageControls.classList.remove('hidden');
        dom.ticks.one.classList.remove('hidden');
        updatePostcardLayout();
    }
}

function resetImagePreviews() {
    appState.uploadedImage = null;
    appState.imageSrcForResend = null;
    appState.isPortrait = false;
    resetImagePanAndZoom();
    appState.frontText.text = '';
    appState.frontText.x = null;
    appState.frontText.y = null;
    dom.frontText.input.value = '';
    dom.frontText.profanityWarning.classList.add('hidden');
    dom.ticks.two.classList.add('hidden');
    dom.noThanksTextBtn.classList.remove('opacity-0', 'pointer-events-none');
    const container = dom.previewContainer;
    container.classList.add('hidden');
    dom.imagePlaceholder.classList.remove('hidden');
    dom.imageControls.classList.add('hidden');
    dom.ticks.one.classList.add('hidden');
    if (dom.finalPreviewFront.src) { URL.revokeObjectURL(dom.finalPreviewFront.src); dom.finalPreviewFront.src = ''; }
    updatePostcardLayout();
    debouncedUpdateAllPreviews();
}

async function checkMessageOverflow() {
    await document.fonts.ready;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const finalWidthPx = Math.round((postcardConfig.print.a5WidthMM / 25.4) * postcardConfig.print.dpi);
    const fontSize = dom.fontSizeSlider.value;
    const fontWeight = dom.fontWeightSlider.value;
    const hiResFontSize = fontSize * (finalWidthPx / 504) * 1.2;
    const fontFamily = dom.fontSelect.value;
    const lineHeight = hiResFontSize * 1.2;
    tempCtx.font = `${fontWeight} ${hiResFontSize}px ${fontFamily}`;
    const messageText = dom.textInput.value;
    const lines = messageText.split('\n');
    let totalHeight = 0;
    const messageMaxWidth = (finalWidthPx / 2) + 70;
    lines.forEach(line => {
        const words = line.split(' ');
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = tempCtx.measureText(testLine);
            if (metrics.width > messageMaxWidth && i > 0) {
                totalHeight += lineHeight;
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        totalHeight += lineHeight;
    });
    const maxTextHeight = Math.round((postcardConfig.print.a5HeightMM / 25.4) * postcardConfig.print.dpi) - (hiResFontSize * 1.2) - 50;
    if (totalHeight > maxTextHeight) {
        dom.messageWarning.classList.remove('hidden');
    } else {
        dom.messageWarning.classList.add('hidden');
    }
}

async function generatePostcardImages({ forEmail = false } = {}) {
    await document.fonts.ready;
    const MM_TO_INCH = 25.4;
    const { dpi, a5WidthMM, a5HeightMM, bleedMM } = postcardConfig.print;
    const bleedPxForPrint = forEmail ? 0 : Math.round((bleedMM / MM_TO_INCH) * dpi);
    let isFinalPortraitForCanvas = appState.isPortrait;
    
    if (forEmail && appState.isPortrait) {
        isFinalPortraitForCanvas = false;
    }

    const A5_RATIO = a5WidthMM / a5HeightMM;
    let finalWidthPx, finalHeightPx;

    if (forEmail) {
        const previewBaseWidth = 1200;
        finalWidthPx = previewBaseWidth;
        finalHeightPx = Math.round(previewBaseWidth / A5_RATIO);
    } else {
        const coreWidthPx = Math.round((a5WidthMM / MM_TO_INCH) * dpi);
        const coreHeightPx = Math.round((a5HeightMM / MM_TO_INCH) * dpi);
        if (appState.isPortrait) {
            finalHeightPx = coreWidthPx + (bleedPxForPrint * 2);
            finalWidthPx = coreHeightPx + (bleedPxForPrint * 2);
        } else {
            finalWidthPx = coreWidthPx + (bleedPxForPrint * 2);
            finalHeightPx = coreHeightPx + (bleedPxForPrint * 2);
        }
    }
    
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = finalWidthPx;
    frontCanvas.height = finalHeightPx;
    const frontCtx = frontCanvas.getContext('2d');
    
    if (appState.uploadedImage) {
        if (forEmail && appState.isPortrait) {
            frontCtx.save();
            frontCtx.translate(finalWidthPx / 2, finalHeightPx / 2);
            frontCtx.rotate(90 * Math.PI / 180);
            frontCtx.translate(-finalHeightPx / 2, -finalWidthPx / 2);
            
            drawCleanFrontOnContext(frontCtx, finalHeightPx, finalWidthPx, 0);

            frontCtx.restore();
        } else {
            drawCleanFrontOnContext(frontCtx, finalWidthPx, finalHeightPx, bleedPxForPrint);
        }
    } else {
        frontCtx.fillStyle = '#FFFFFF';
        frontCtx.fillRect(0, 0, finalWidthPx, finalHeightPx);
    }

    // --- BACK CANVAS (Same for both preview and print) ---
    const backCanvas = document.createElement('canvas');
    const mainContentWidthPx = Math.round((a5WidthMM / MM_TO_INCH) * dpi);
    const mainContentHeightPx = Math.round((a5HeightMM / MM_TO_INCH) * dpi);
    backCanvas.width = mainContentWidthPx;
    backCanvas.height = mainContentHeightPx;
    const backCtx = backCanvas.getContext('2d');
    backCtx.fillStyle = 'white';
    backCtx.fillRect(0, 0, mainContentWidthPx, mainContentHeightPx);
    backCtx.strokeStyle = '#e5e7eb';
    backCtx.lineWidth = 5;
    backCtx.beginPath();
    const dividerX = (mainContentWidthPx / 2) + 170;
    backCtx.moveTo(dividerX, 50);
    backCtx.lineTo(dividerX, mainContentHeightPx - 50);
    backCtx.stroke();
    backCtx.strokeStyle = '#cccccc';
    backCtx.lineWidth = 5;
    backCtx.setLineDash([15, 15]);
    backCtx.strokeRect(mainContentWidthPx - 300, 50, 250, 250);
    backCtx.setLineDash([]);
    const fontSize = dom.fontSizeSlider.value;
    const fontWeight = dom.fontWeightSlider.value;
    const hiResFontSize = fontSize * (mainContentWidthPx / 504) * 1.2;
    const fontFamily = dom.fontSelect.value;
    backCtx.fillStyle = dom.colorPicker.value;
    backCtx.font = `${fontWeight} ${hiResFontSize}px ${fontFamily}`;
    backCtx.textAlign = 'left';
    backCtx.textBaseline = 'top';
    const messageText = dom.textInput.value;
    const lines = messageText.split('\n');
    const messageX = 70;
    let messageY = hiResFontSize * 1.2;
    const messageMaxWidth = dividerX - messageX - 20;
    const lineHeight = hiResFontSize * 1.2;
    lines.forEach(line => {
        const words = line.split(' ');
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            const metrics = backCtx.measureText(testLine);
            if (metrics.width > messageMaxWidth && i > 0) {
                backCtx.fillText(currentLine, messageX, messageY);
                messageY += lineHeight;
                currentLine = words[i] + ' ';
            } else {
                currentLine = testLine;
            }
        }
        backCtx.fillText(currentLine, messageX, messageY);
        messageY += lineHeight;
    });
    const hiResAddressFontSize = 12 * (mainContentWidthPx / 504) * 1.2;
    backCtx.fillStyle = '#333';
    backCtx.font = `400 ${hiResAddressFontSize}px Inter`;
    backCtx.textAlign = 'left';
    const addressLines = [dom.addressInputs.name.value, dom.addressInputs.line1.value, dom.addressInputs.line2.value, dom.addressInputs.city.value, dom.addressInputs.postcode.value].filter(Boolean);
    const addressBlockHeight = addressLines.length * hiResAddressFontSize * 1.4;
    const addressX = dividerX + 20;
    let addressY = (mainContentHeightPx / 2) - (addressBlockHeight / 2);
    addressLines.forEach(line => {
        backCtx.fillText(line, addressX, addressY);
        addressY += hiResAddressFontSize * 1.4;
    });
    return { frontCanvas, backCanvas };
}


async function updateFinalPreviews() {
    const { frontCanvas, backCanvas } = await generatePostcardImages({ forEmail: true });
    frontCanvas.toBlob(blob => {
        if (dom.finalPreviewFront.src) URL.revokeObjectURL(dom.finalPreviewFront.src);
        dom.finalPreviewFront.src = URL.createObjectURL(blob);
    });
    backCanvas.toBlob(blob => {
        if (dom.finalPreviewBack.src) URL.revokeObjectURL(dom.finalPreviewBack.src);
        dom.finalPreviewBack.src = URL.createObjectURL(blob);
    });
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
        if (!response.ok) {
            throw new Error(`Pixabay API responded with status: ${response.status}`);
        }
        const data = await response.json();
        dom.search.resultsContainer.innerHTML = ''; 
        if (data.hits && data.hits.length > 0) {
            data.hits.forEach(photo => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'grid-item';
                const img = document.createElement('img');
                img.src = photo.webformatURL;
                img.alt = photo.tags;
                img.onload = () => {
                    if (dom.search.resultsContainer.children.length === data.hits.length) {
                        new Masonry(dom.search.resultsContainer, {
                            itemSelector: '.grid-item',
                            percentPosition: true
                        });
                    }
                };
                img.addEventListener('click', async () => {
                    const fullImageResponse = await fetch(photo.largeImageURL);
                    const imageBlob = await fullImageResponse.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result;
                        validateAndSetImage(base64data);
                    };
                    reader.readAsDataURL(imageBlob);
                    dom.search.modal.style.display = 'none';
                });
                imgContainer.appendChild(img);
                dom.search.resultsContainer.appendChild(imgContainer);
            });
        } else {
            dom.search.resultsContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">No images found for "${query}".</p>`;
        }
    } catch (error) {
        console.error("Error fetching images from Pixabay:", error);
        dom.search.resultsContainer.innerHTML = `<p class="text-red-500 col-span-full text-center">Failed to load images. Please try again later.</p>`;
    } finally {
        dom.search.loader.style.display = 'none';
    }
}

async function handleSendPostcard() {
    const requiredAddressFields = [dom.addressInputs.name, dom.addressInputs.line1, dom.addressInputs.city, dom.addressInputs.postcode];
    const allValid = requiredAddressFields.every(input => input.value.trim() !== '');
    if (!allValid) {
        alert('Please fill in all required recipient address fields before sending.');
        const firstEmpty = requiredAddressFields.find(input => input.value.trim() === '');
        if (firstEmpty) {
            toggleAccordion(document.getElementById('accordion-header-3'), true);
            firstEmpty.focus();
        }
        return;
    }
    const frontIsProfane = await checkForProfanityAPI(dom.frontText.input.value, dom.frontText.profanityWarning);
    const backIsProfane = await checkForProfanityAPI(dom.textInput.value, dom.messageProfanityWarning);
    if (frontIsProfane || backIsProfane) {
        alert("Be more friendly - consider revising the text");
        return;
    }
    dom.sender.modal.style.display = 'flex';
    dom.sender.nameInput.value = localStorage.getItem('senderName') || '';
    dom.sender.emailInput.value = localStorage.getItem('senderEmail') || '';
    if (dom.sender.recaptchaContainer.innerHTML.trim() === '') {
         grecaptcha.render(dom.sender.recaptchaContainer, { 'sitekey' : postcardConfig.apiKeys.recaptchaSiteKey });
    } else {
        grecaptcha.reset();
    }
}

async function handleFinalSend() {
    const senderName = dom.sender.nameInput.value;
    const senderEmail = dom.sender.emailInput.value;
    const recaptchaToken = grecaptcha.getResponse();
    if (!senderName.trim() || !senderEmail.trim()) {
        alert('Please enter your name and email address.');
        return;
    }
    if (!recaptchaToken) {
        alert('Please complete the reCAPTCHA verification.');
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
        const { frontCanvas: frontCanvasForPrint, backCanvas: backCanvasForPrint } = await generatePostcardImages({ forEmail: false, includeAddressOnImage: false });
        
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

        const { frontCanvas: highResEmailFrontCanvas, backCanvas: highResEmailBackCanvas } = await generatePostcardImages({ forEmail: true, includeAddressOnImage: true });
        const lowResFrontCanvasForEmail = createLowResCanvas(highResEmailFrontCanvas);
        const lowResBackCanvasForEmail = createLowResCanvas(highResEmailBackCanvas);
        // --- END: Create LOW-RESOLUTION versions for email ---


        const frontBlobForPrint = await new Promise(resolve => frontCanvasForPrint.toBlob(resolve, 'image/jpeg', 0.9));
        const frontBlobForEmail = await new Promise(resolve => lowResFrontCanvasForEmail.toBlob(resolve, 'image/jpeg', 0.8));
        const backBlobForPrint = await new Promise(resolve => backCanvasForPrint.toBlob(resolve, 'image/jpeg', 0.9));
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
            const response = await fetch(`/api/upload?filename=${filename}`, { method: 'POST', body: blob });
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
                size: dom.fontSizeSlider.value,
                weight: dom.fontWeightSlider.value
            }
        };
        localStorage.setItem('lastPostcardDesign', JSON.stringify(resendData));
        
        const postcardData = {
            sender: { name: senderName, email: senderEmail },
            recipient: recipient,
            frontImageUrl: frontPrintBlobData.url,
            frontImageUrlForEmail: frontEmailBlobData.url,
            backImageUrl: backPrintBlobData.url, 
            backImageUrlWithAddress: backEmailBlobData.url,
            emailConfig: {
                subject: postcardConfig.email.subject,
                body: postcardConfig.email.body,
                buttonColor: postcardConfig.email.buttonColor,
                buttonTextColor: postcardConfig.email.buttonTextColor,
                senderName: postcardConfig.email.senderName
            },
            recaptchaToken: recaptchaToken
        };
        
        const verificationResponse = await fetch('/api/request-verification', {
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
    
    if (!postcardConfig.apiKeys || !postcardConfig.apiKeys.recaptchaSiteKey) {
    console.warn("ReCAPTCHA key not configured - form validation may be limited");
        dom.findImageButton.disabled = true;
        dom.sendPostcardBtn.disabled = true;
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sendAgain') === 'true') {
        const lastDesign = JSON.parse(localStorage.getItem('lastPostcardDesign'));
        if (lastDesign) {
            dom.frontText.input.value = lastDesign.frontText.text;
            dom.textInput.value = lastDesign.message.text;
            dom.fontSelect.value = lastDesign.message.font;
            dom.colorPicker.value = lastDesign.message.color;
            dom.fontSizeSlider.value = lastDesign.message.size;
            dom.fontSizeValue.textContent = lastDesign.message.size;
            dom.fontWeightSlider.value = lastDesign.message.weight;
            dom.fontWeightValue.textContent = lastDesign.message.weight;
            appState.frontText = lastDesign.frontText;
            appState.isPortrait = lastDesign.isPortrait || false;
            if (lastDesign.imageSrc) {
                validateAndSetImage(lastDesign.imageSrc);
            }
            toggleAccordion(document.getElementById('accordion-header-3'), true);
            dom.addressInputs.name.focus();
        }
    }
    dom.accordionHeaders.forEach(header => {
        if (header.id !== 'accordion-header-5') {
            header.addEventListener('click', () => toggleAccordion(header, null));
        }
    });
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
    dom.deleteImageBtn.addEventListener('click', resetImagePreviews);
    dom.zoomInBtn.addEventListener('click', () => {
        appState.imageZoom += 0.1;
        drawPreviewCanvas();
        debouncedUpdateAllPreviews();
    });
    dom.zoomOutBtn.addEventListener('click', () => {
        appState.imageZoom = Math.max(1.0, appState.imageZoom - 0.1);
        drawPreviewCanvas();
        debouncedUpdateAllPreviews();
    });
    Object.values(dom.frontText).forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
            el.addEventListener('input', () => {
                const wasEmpty = !appState.frontText.text;
                appState.frontText.text = dom.frontText.input.value;
                appState.frontText.font = dom.frontText.fontSelect.value;
                appState.frontText.color = dom.frontText.colorPicker.value;
                if(dom.frontText.input.value.trim() !== '') {
                    dom.ticks.two.classList.remove('hidden');
                        dom.noThanksTextBtn.classList.add('opacity-0', 'pointer-events-none');
                } else {
                    dom.ticks.two.classList.add('hidden');
                        dom.noThanksTextBtn.classList.remove('opacity-0', 'pointer-events-none');
                }
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
    dom.noThanksTextBtn.addEventListener('click', () => {
        dom.ticks.two.classList.remove('hidden');
        toggleAccordion(document.getElementById('accordion-header-2'), false);
        toggleAccordion(document.getElementById('accordion-header-3'), true);
    });
    let interactionMode = 'none';
    let startState = {};
    const canvas = dom.previewCanvas.el;
    const ctx = canvas.getContext('2d');
    const handleInteractionStart = (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        if (!appState.uploadedImage) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        let isOverText = false;
        if (appState.frontText.text) {
            const metrics = getTextMetrics(ctx);
            if (metrics && metrics.x !== null) {
                const handles = getHandlePositions(metrics);
                const distToResize = Math.hypot(mouseX - handles.size.x, mouseY - handles.size.y);
                const distToRotate = Math.hypot(mouseX - handles.rotate.x, mouseY - handles.rotate.y);
                const distToWidth = Math.hypot(mouseX - handles.width.x, mouseY - handles.width.y);
                const dx = mouseX - metrics.x;
                const dy = mouseY - metrics.y;
                const rotationRad = -appState.frontText.rotation * Math.PI / 180;
                const cos = Math.cos(rotationRad);
                const sin = Math.sin(rotationRad);
                const transformedMouseX = dx * cos - dy * sin;
                const transformedMouseY = dx * sin + dy * cos;
                const box = metrics.box;
                const isOverBody = (
                    transformedMouseX >= box.x && transformedMouseX <= box.x + box.width &&
                    transformedMouseY >= box.y && transformedMouseY <= box.y + box.height
                );
                if (distToResize <= postcardConfig.print.handleRadius) {
                    interactionMode = 'resizing';
                    isOverText = true;
                } else if (distToRotate <= postcardConfig.print.handleRadius) {
                    interactionMode = 'rotating';
                    isOverText = true;
                } else if (distToWidth <= postcardConfig.print.handleRadius) {
                    interactionMode = 'resizingWidth';
                    isOverText = true;
                } else if (isOverBody) {
                    interactionMode = 'draggingText';
                    isOverText = true;
                }
            }
        }
        if (!isOverText) {
            interactionMode = 'draggingImage';
        }
        startState = {
            mouseX, mouseY,
            ...appState.frontText,
            imageOffsetX: appState.imageOffsetX,
            imageOffsetY: appState.imageOffsetY,
            startAngle: Math.atan2(mouseY - appState.frontText.y, mouseX - appState.frontText.x),
            startDist: Math.hypot(mouseX - appState.frontText.x, mouseY - appState.frontText.y),
        };
    };
    const handleInteractionMove = (e) => {
        if (e.type === 'touchmove') e.preventDefault();
        if (interactionMode === 'none') return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        if (interactionMode === 'draggingText') {
            canvas.style.cursor = 'move';
            appState.frontText.x = startState.x + (mouseX - startState.mouseX);
            appState.frontText.y = startState.y + (mouseY - startState.mouseY);
        } else if (interactionMode === 'rotating') {
            canvas.style.cursor = 'grabbing';
            const currentAngle = Math.atan2(mouseY - startState.y, mouseX - startState.x);
            const angleDiff = currentAngle - startState.startAngle;
            appState.frontText.rotation = startState.rotation + (angleDiff * 180 / Math.PI);
        } else if (interactionMode === 'resizing') {
            canvas.style.cursor = 'se-resize';
            const currentDist = Math.hypot(mouseX - startState.x, mouseY - startState.y);
            const scaleFactor = currentDist / startState.startDist;
            appState.frontText.size = Math.max(8, startState.size * scaleFactor);
        } else if (interactionMode === 'resizingWidth') {
            canvas.style.cursor = 'ew-resize';
            const rotationRad = -startState.rotation * Math.PI / 180;
            const cos = Math.cos(rotationRad);
            const sin = Math.sin(rotationRad);
            const dx = mouseX - startState.mouseX;
            const dy = mouseY - startState.mouseY;
            const projectedDx = dx * cos - dy * sin;
            appState.frontText.width = Math.max(20, startState.width + (projectedDx * 2));
        } else if (interactionMode === 'draggingImage') {
            canvas.style.cursor = 'grabbing';
            const dx = mouseX - startState.mouseX;
            const dy = mouseY - startState.mouseY;
            appState.imageOffsetX = startState.imageOffsetX + dx;
            appState.imageOffsetY = startState.imageOffsetY + dy;
        }
        drawPreviewCanvas();
    };
    const handleInteractionEnd = () => {
        if (interactionMode !== 'none') {
            interactionMode = 'none';
            canvas.style.cursor = 'default';
            debouncedUpdateAllPreviews();
        }
    };
    canvas.addEventListener('mousedown', handleInteractionStart);
    canvas.addEventListener('mousemove', handleInteractionMove);
    document.addEventListener('mouseup', handleInteractionEnd);
    canvas.addEventListener('touchstart', handleInteractionStart);
    canvas.addEventListener('touchmove', handleInteractionMove);
    canvas.addEventListener('touchend', handleInteractionEnd);
    let messageTypingTimer;
    dom.textInput.addEventListener('input', () => {
        clearTimeout(messageTypingTimer);
        messageTypingTimer = setTimeout(() => {
            if (dom.textInput.value.trim() !== '') {
                dom.ticks.three.classList.remove('hidden');
            } else {
                dom.ticks.three.classList.add('hidden');
            }
        }, 3000);
    });
    const addressFields = [dom.addressInputs.name, dom.addressInputs.line1, dom.addressInputs.city, dom.addressInputs.postcode];
    addressFields.forEach(field => {
        field.addEventListener('input', () => {
            const allFilled = addressFields.every(f => f.value.trim() !== '');
            if (allFilled) {
                dom.ticks.four.classList.remove('hidden');
            } else {
                dom.ticks.four.classList.add('hidden');
            }
        });
    });
    const messageControls = [dom.textInput, dom.fontSelect, dom.fontSizeSlider, dom.fontWeightSlider, dom.colorPicker];
    messageControls.forEach(el => {
        el.addEventListener('input', () => {
            if (el.id === 'font-size-slider') dom.fontSizeValue.textContent = el.value;
            if (el.id === 'font-weight-slider') dom.fontWeightValue.textContent = el.value;
            checkMessageOverflow();
            debouncedProfanityCheck(dom.textInput.value, dom.messageProfanityWarning);
            debouncedUpdateAllPreviews();
        });
    });
    const otherBackControls = [...Object.values(dom.addressInputs)];
    otherBackControls.forEach(el => {
        el.addEventListener('input', () => {
            debouncedUpdateAllPreviews();
        });
    });
    dom.search.showBtn.addEventListener('click', () => dom.search.modal.style.display = 'flex');
    dom.search.closeBtn.addEventListener('click', () => dom.search.modal.style.display = 'none');
    dom.search.searchBtn.addEventListener('click', handleImageSearch);
    dom.search.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleImageSearch(); });
    dom.sendPostcardBtn.addEventListener('click', handleSendPostcard);
    dom.sender.sendBtn.addEventListener('click', handleFinalSend);
    dom.sender.closeBtn.addEventListener('click', () => {
        dom.sender.modal.style.display = 'none';
        dom.sender.detailsView.style.display = 'flex'; // Use flex for visibility
        dom.sender.checkEmailView.style.display = 'none';
    });
    dom.finalPreviewFront.addEventListener('click', () => { if (dom.finalPreviewFront.src) { dom.zoom.image.src = dom.finalPreviewFront.src; dom.zoom.modal.style.display = 'flex'; } });
    dom.finalPreviewBack.addEventListener('click', () => { if (dom.finalPreviewBack.src) { dom.zoom.image.src = dom.finalPreviewBack.src; dom.zoom.modal.style.display = 'flex'; } });
    dom.zoom.closeBtn.addEventListener('click', () => dom.zoom.modal.style.display = 'none');
    toggleAccordion(document.getElementById('accordion-header-5'), true);
    toggleAccordion(document.getElementById('accordion-header-1'), true);
}
