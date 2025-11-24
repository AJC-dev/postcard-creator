// --- CONFIGURATION (Embedded) ---
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

// --- HELPER FUNCTIONS (Defined first to avoid ReferenceErrors) ---

function showGlobalError(message) {
    if(dom.errorBannerMessage) {
        dom.errorBannerMessage.textContent = message;
        dom.errorBanner.classList.remove('hidden');
        setTimeout(() => dom.errorBanner.classList.add('hidden'), 5000);
    } else {
        console.error(message);
    }
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

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
            if(warningElement) {
                warningElement.textContent = "Be more friendly - consider revising the text";
                warningElement.classList.remove('hidden');
            }
            return true;
        } else {
            if(warningElement) warningElement.classList.add('hidden');
            return false;
        }
    } catch (error) {
        return false; 
    }
}

const debouncedProfanityCheck = debounce(checkForProfanityAPI, 500);

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
        
        // Helper for front text drawing
        ctx.font = `${size * effectiveScale}px ${font}`;
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > (textWidth * effectiveScale) && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        const lineHeight = size * effectiveScale * 1.2;
        let currentY = -(lines.length * lineHeight / 2) + (lineHeight / 2);
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i].trim(), 0, currentY);
            currentY += lineHeight;
        }

        ctx.restore();
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
        
        // Draw text wrapped
        ctx.font = `${size}px ${font}`;
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > textWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        const lineHeight = size * 1.2;
        let currentY = -(lines.length * lineHeight / 2) + (lineHeight / 2);
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i].trim(), 0, currentY);
            currentY += lineHeight;
        }

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
    const scaleFactor = width / 1200; 
    const fontSize = fontSizeVal * 2.5 * scaleFactor + 10; 

    const fontFamily = dom.fontSelect.value;
    const color = dom.colorPicker.value;

    ctx.fillStyle = color;
    ctx.font = `400 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

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

function updatePostcardLayout() {
    const container = dom.postcardStage;
    if(!container) return;

    container.classList.remove('aspect-[210/148]', 'aspect-[148/210]');
    
    if (appState.isPortrait) {
        container.classList.add('aspect-[148/210]');
    } else {
        container.classList.add('aspect-[210/148]');
    }
    
    requestAnimationFrame(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if(dom.previewCanvas.el) {
            dom.previewCanvas.el.width = w;
            dom.previewCanvas.el.height = h;
        }
        if(dom.backPreviewCanvas.el) {
            dom.backPreviewCanvas.el.width = w;
            dom.backPreviewCanvas.el.height = h;
        }
        
        if(appState.isFlipped) drawBackPreview();
        else drawPreviewCanvas();
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
    
    if(dom.previewCanvas.el) {
        const ctx = dom.previewCanvas.el.getContext('2d');
        ctx.clearRect(0, 0, dom.previewCanvas.el.width, dom.previewCanvas.el.height);
    }
    
    dom.imagePlaceholder.classList.remove('hidden');
    dom.imageControls.classList.add('hidden');
    if(dom.zoomInBtn && dom.zoomInBtn.parentElement) dom.zoomInBtn.parentElement.classList.add('hidden');
    
    updatePostcardLayout();
}

function resizeImage(base64Str) {
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

function checkMessageOverflow() {
    // Placeholder
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

// --- ACTION FUNCTIONS (Moved up) ---

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
    
    tempBackCtx.fillStyle = 'white';
    tempBackCtx.fillRect(0, 0, mainContentWidthPx, mainContentHeightPx);
    
    tempBackCtx.strokeStyle = '#e5e7eb';
    tempBackCtx.lineWidth = 5;
    tempBackCtx.beginPath();
    const dividerX = mainContentWidthPx * 0.58;
    tempBackCtx.moveTo(dividerX, 50);
    tempBackCtx.lineTo(dividerX, mainContentHeightPx - 50);
    tempBackCtx.stroke();
    
    const fontSize = dom.fontSizeSelect.value;
    const fontWeight = '400';
    const hiResFontSize = fontSize * (mainContentWidthPx / 504) * 1.2;
    const fontFamily = dom.fontSelect.value;
    tempBackCtx.fillStyle = dom.colorPicker.value;
    tempBackCtx.font = `${fontWeight} ${hiResFontSize}px ${fontFamily}`;
    tempBackCtx.textAlign = 'left';
    tempBackCtx.textBaseline = 'top';
    
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

async function handleSendPostcard() {
     const required = ['name', 'line1', 'city', 'postcode'];
     const valid = required.every(f => dom.addressInputs[f].value.trim());
     if (!valid) {
         showGlobalError("Please fill in address fields");
         switchTab('address');
         return;
     }
     const frontIsProfane = await checkForProfanityAPI(dom.frontText.input.value, dom.frontText.profanityWarning);
     const backIsProfane = await checkForProfanityAPI(dom.textInput.value, dom.messageProfanityWarning);
     if (frontIsProfane || backIsProfane) {
         showGlobalError("Be more friendly - consider revising the text");
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
        const { frontCanvas: printFront, backCanvas: printBack } = await generatePostcardImages({ forEmail: false, includeAddressOnBack: false });
        const { frontCanvas: emailFront, backCanvas: emailBack } = await generatePostcardImages({ forEmail: true, includeAddressOnBack: true });

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
        
        const lowResFront = createLowResCanvas(emailFront);
        const lowResBack = createLowResCanvas(emailBack);

        const frontPrintBlob = await new Promise(r => printFront.toBlob(r, 'image/jpeg', 0.9));
        const backPrintBlob = await new Promise(r => printBack.toBlob(r, 'image/jpeg', 0.9));
        const frontEmailBlob = await new Promise(r => lowResFront.toBlob(r, 'image/jpeg', 0.8));
        const backEmailBlob = await new Promise(r => lowResBack.toBlob(r, 'image/jpeg', 0.8));

        const sanitize = (s) => s.replace(/[^a-z0-9]/gi, '-');
        const baseName = `${sanitize(senderEmail)}-${sanitize(senderName)}-${sanitize(dom.addressInputs.postcode.value)}-${Date.now()}`;
        
        const uploadAndGetData = async (filename, blob) => {
            const response = await fetch(new URL(`/api/upload?filename=${filename}`, window.location.origin), { method: 'POST', body: blob });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to upload ${filename}. Server responded with ${response.status}: ${errorData.details || errorData.error}`);
            }
            return response.json();
        };

        const [frontEmailData, backEmailData] = await Promise.all([
            uploadAndGetData(`${baseName}-front-email.jpg`, frontEmailBlob),
            uploadAndGetData(`${baseName}-back-email.jpg`, backEmailBlob)
        ]);
        const frontPrintData = await uploadAndGetData(`${baseName}-front-print.jpg`, frontPrintBlob);
        const backPrintData = await uploadAndGetData(`${baseName}-back-print.jpg`, backPrintBlob);

        const recipient = {};
        for (const key in dom.addressInputs) recipient[key] = dom.addressInputs[key].value.trim();

        const resendData = {
            imageSrc: appState.imageSrcForResend,
            isPortrait: appState.isPortrait,
            frontText: appState.frontText,
            message: {
                text: dom.textInput.value,
                font: dom.fontSelect.value,
                color: dom.colorPicker.value,
                size: dom.fontSizeSelect.value,
                weight: '400'
            }
        };
        localStorage.setItem('lastPostcardDesign', JSON.stringify(resendData));
        
        const postcardData = {
            sender: { name: senderName, email: senderEmail },
            recipient: recipient,
            frontImageUrl: frontPrintData.url,
            frontImageUrlForEmail: frontEmailData.url,
            backImageUrl: backPrintData.url, 
            backImageUrlWithAddress: backEmailData.url,
            emailConfig: {
                subject: postcardConfig.email.subject,
                body: postcardConfig.email.body,
                buttonColor: postcardConfig.styles.sendPostcardButtonColor,
                buttonTextColor: postcardConfig.styles.sendPostcardButtonTextColor,
                senderName: postcardConfig.email.senderName
            },
            recaptchaToken: recaptchaToken
        };
        
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
                img.className = 'grid-item w-full h-auto object-cover rounded-lg cursor-pointer';
                img.onclick = () => {
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

function loadLastDesign() {
    const lastDesign = JSON.parse(localStorage.getItem('lastPostcardDesign'));
    if (lastDesign) {
        dom.frontText.input.value = lastDesign.frontText.text;
        dom.textInput.value = lastDesign.message.text;
        dom.fontSelect.value = lastDesign.message.font;
        dom.colorPicker.value = lastDesign.message.color;
        dom.fontSizeSelect.value = lastDesign.message.size || '16';
        
        appState.frontText = lastDesign.frontText;
        appState.isPortrait = lastDesign.isPortrait || false;
        
        if (lastDesign.imageSrc) {
            validateAndSetImage(lastDesign.imageSrc);
        }
        switchTab('message'); 
    }
}

// --- MAIN INITIALIZATION (Moved here) ---

document.addEventListener('DOMContentLoaded', () => {
    populateDomReferences();
    loadConfigAndInitialize();
});