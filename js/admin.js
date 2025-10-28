import fallbackConfig from './config.js';

// --- GLOBALS ---
let currentConfig = {};

// --- INITIALIZATION ---
initializeAdminPanel();


// --- FUNCTIONS ---

async function initializeAdminPanel() {
    // 1. Load the local fallback config first to ensure a stable state.
    currentConfig = fallbackConfig;
    populateForm(currentConfig);
    setupEventListeners();

    // 2. Then, try to fetch the live config from the database.
    try {
        const response = await fetch('/api/get-config');
        if (response.ok) {
            const dbConfig = await response.json();
            currentConfig = dbConfig;
            // 3. If successful, re-populate the form with the live data.
            populateForm(currentConfig);
        } else {
             console.warn('No configuration found in database. Using local defaults.');
        }
    } catch (error) {
        console.error("Could not fetch from DB, using local defaults.", error);
    }
}

function setupEventListeners() {
    document.getElementById('config-form').addEventListener('submit', handleFormSubmit);

    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', (event) => {
            const clickedHeader = event.currentTarget;
            const content = clickedHeader.nextElementSibling;
            const isCurrentlyOpen = content.classList.contains('open');

            // First, close all open sections
            document.querySelectorAll('.accordion-content.open').forEach(openContent => {
                openContent.classList.remove('open');
                openContent.previousElementSibling.classList.remove('open');
            });

            // If the clicked section was not already the one that was open, open it.
            if (!isCurrentlyOpen) {
                content.classList.add('open');
                clickedHeader.classList.add('open');
            }
        });
    });
    
    // Open the first section by default
    const firstHeader = document.querySelector('.accordion-header');
    if (firstHeader) {
        firstHeader.classList.add('open');
        firstHeader.nextElementSibling.classList.add('open');
    }

    setupImageUploader('favicon-uploader', 'faviconURL', 'favicon-preview');
    setupImageUploader('loading-image-uploader', 'loadingImageURL', 'loading-image-preview');
    setupImageUploader('success-favicon-uploader', 'successFaviconURL', 'success-favicon-preview');
    setupImageUploader('promo-image-uploader', 'successPromoImageURL', 'promo-image-preview');
    setupImageUploader('confirmation-promo-image-uploader', 'confirmationPromoImageURL', 'confirmation-promo-image-preview');
    setupImageUploader('postcard-promo-image-uploader', 'postcardPromoImageURL', 'postcard-promo-image-preview');


    document.getElementById('faviconURL').addEventListener('input', (e) => updatePreviewFromInput(e.target.value, 'favicon-preview'));
    document.getElementById('loadingImageURL').addEventListener('input', (e) => updatePreviewFromInput(e.target.value, 'loading-image-preview'));
    document.getElementById('successFaviconURL').addEventListener('input', (e) => updatePreviewFromInput(e.target.value, 'success-favicon-preview'));
    document.getElementById('successPromoImageURL').addEventListener('input', (e) => updatePreviewFromInput(e.target.value, 'promo-image-preview'));
    document.getElementById('confirmationPromoImageURL').addEventListener('input', (e) => updatePreviewFromInput(e.target.value, 'confirmation-promo-image-preview'));
    document.getElementById('postcardPromoImageURL').addEventListener('input', (e) => updatePreviewFromInput(e.target.value, 'postcard-promo-image-preview'));


    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const textToCopy = e.target.dataset.clipboardText;
            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = textToCopy;
            document.body.appendChild(tempTextarea);
            tempTextarea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextarea);
            
            e.target.textContent = 'Copied!';
            setTimeout(() => {
                 e.target.textContent = `Copy ${textToCopy}`;
            }, 1500);
        });
    });
}

function populateForm(config) {
    // Main Page Settings
    document.getElementById('pageTitle').value = config.content.pageTitle;
    updatePreviewFromInput(config.content.faviconURL, 'favicon-preview');
    document.getElementById('faviconURL').value = config.content.faviconURL;
    updatePreviewFromInput(config.content.loadingImageURL, 'loading-image-preview');
    document.getElementById('loadingImageURL').value = config.content.loadingImageURL;
    document.getElementById('mainTitle').value = config.content.mainTitle;
    document.getElementById('titleColor').value = config.styles.titleColor;
    document.getElementById('subtitleText').value = config.content.subtitleText;
    document.getElementById('subtitleLinkText').value = config.content.subtitleLinkText;
    document.getElementById('subtitleLinkURL').value = config.content.subtitleLinkURL;
    document.getElementById('subtitleLinkColor').value = config.styles.subtitleLinkColor;
    
    // Button Colours
    document.getElementById('uploadButtonColor').value = config.styles.uploadButtonColor;
    document.getElementById('uploadButtonTextColor').value = config.styles.uploadButtonTextColor;
    document.getElementById('findImageButtonColor').value = config.styles.findImageButtonColor;
    document.getElementById('findImageButtonTextColor').value = config.styles.findImageButtonTextColor;
    document.getElementById('sendPostcardButtonColor').value = config.styles.sendPostcardButtonColor;
    document.getElementById('sendPostcardButtonTextColor').value = config.styles.sendPostcardButtonTextColor;

    // Verification Email Settings
    document.getElementById('emailSenderName').value = config.email.senderName;
    document.getElementById('emailSubject').value = config.email.subject;
    document.getElementById('emailBody').value = config.email.body;

    // Confirmation Email Settings
    document.getElementById('confirmationSenderName').value = config.confirmationEmail.senderName;
    document.getElementById('confirmationSubject').value = config.confirmationEmail.subject;
    document.getElementById('confirmationBody').value = config.confirmationEmail.body;
    document.getElementById('confirmationPromoText').value = config.confirmationEmail.promoText;
    document.getElementById('confirmationPromoLinkURL').value = config.confirmationEmail.promoLinkURL;
    updatePreviewFromInput(config.confirmationEmail.promoImageURL, 'confirmation-promo-image-preview');
    document.getElementById('confirmationPromoImageURL').value = config.confirmationEmail.promoImageURL;


    // Success Page Settings
    document.getElementById('successTitle').value = config.successPage.pageTitle;
    updatePreviewFromInput(config.successPage.faviconURL, 'success-favicon-preview');
    document.getElementById('successFaviconURL').value = config.successPage.faviconURL;
    document.getElementById('successHeading').value = config.successPage.heading;
    document.getElementById('successHeadingColor').value = config.successPage.headingColor;
    document.getElementById('successSubheading').value = config.successPage.subheading;
    document.getElementById('successButtonText').value = config.successPage.buttonText;
    document.getElementById('successButtonColor').value = config.successPage.buttonColor;
    document.getElementById('successButtonTextColor').value = config.successPage.buttonTextColor;
    document.getElementById('successPromoText').value = config.successPage.promoText;
    document.getElementById('successPromoLinkURL').value = config.successPage.promoLinkURL;
    updatePreviewFromInput(config.successPage.promoImageURL, 'promo-image-preview');
    document.getElementById('successPromoImageURL').value = config.successPage.promoImageURL;
    
    // Usage Limits
    document.getElementById('postcardLimit').value = config.limits.postcardLimit;
    document.getElementById('limitDays').value = config.limits.limitDays;
    
    // Postcard Promo Settings
    if (config.postcardPromo) {
        updatePreviewFromInput(config.postcardPromo.imageURL, 'postcard-promo-image-preview');
        document.getElementById('postcardPromoImageURL').value = config.postcardPromo.imageURL;
    } else {
        document.getElementById('postcardPromoImageURL').value = '';
        document.getElementById('postcard-promo-image-preview').src = '';
    }
}


async function handleFormSubmit(event) {
    event.preventDefault();
    const saveButton = document.getElementById('save-changes-btn');
    
    // Client-side validation
    const form = document.getElementById('config-form');
    const inputs = form.querySelectorAll('input, textarea');
    let allValid = true;
    for (const input of inputs) {
        if (input.type !== 'file' && !input.value.trim()) {
            allValid = false;
            input.classList.add('border-red-500');
        } else {
             input.classList.remove('border-red-500');
        }
    }

    if (!allValid) {
        alert('Please fill out all mandatory fields.');
        return;
    }


    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;

    const newConfigData = {
        content: {
            pageTitle: document.getElementById('pageTitle').value,
            faviconURL: document.getElementById('faviconURL').value,
            loadingImageURL: document.getElementById('loadingImageURL').value,
            mainTitle: document.getElementById('mainTitle').value,
            subtitleText: document.getElementById('subtitleText').value,
            subtitleLinkText: document.getElementById('subtitleLinkText').value,
            subtitleLinkURL: document.getElementById('subtitleLinkURL').value,
        },
        styles: {
            titleColor: document.getElementById('titleColor').value,
            subtitleLinkColor: document.getElementById('subtitleLinkColor').value,
            uploadButtonColor: document.getElementById('uploadButtonColor').value,
            uploadButtonTextColor: document.getElementById('uploadButtonTextColor').value,
            findImageButtonColor: document.getElementById('findImageButtonColor').value,
            findImageButtonTextColor: document.getElementById('findImageButtonTextColor').value,
            sendPostcardButtonColor: document.getElementById('sendPostcardButtonColor').value,
            sendPostcardButtonTextColor: document.getElementById('sendPostcardButtonTextColor').value,
        },
        email: {
            senderName: document.getElementById('emailSenderName').value,
            subject: document.getElementById('emailSubject').value,
            body: document.getElementById('emailBody').value,
        },
        confirmationEmail: {
            senderName: document.getElementById('confirmationSenderName').value,
            subject: document.getElementById('confirmationSubject').value,
            body: document.getElementById('confirmationBody').value,
            promoText: document.getElementById('confirmationPromoText').value,
            promoLinkURL: document.getElementById('confirmationPromoLinkURL').value,
            promoImageURL: document.getElementById('confirmationPromoImageURL').value,
        },
        successPage: {
            pageTitle: document.getElementById('successTitle').value,
            faviconURL: document.getElementById('successFaviconURL').value,
            heading: document.getElementById('successHeading').value,
            headingColor: document.getElementById('successHeadingColor').value,
            subheading: document.getElementById('successSubheading').value,
            buttonText: document.getElementById('successButtonText').value,
            buttonColor: document.getElementById('successButtonColor').value,
            buttonTextColor: document.getElementById('successButtonTextColor').value,
            promoText: document.getElementById('successPromoText').value,
            promoLinkURL: document.getElementById('successPromoLinkURL').value,
            promoImageURL: document.getElementById('successPromoImageURL').value,
        },
        limits: {
            postcardLimit: parseInt(document.getElementById('postcardLimit').value, 10),
            limitDays: parseInt(document.getElementById('limitDays').value, 10)
        },
        postcardPromo: {
            imageURL: document.getElementById('postcardPromoImageURL').value
        },
        print: currentConfig.print,
        validation: currentConfig.validation,
    };

    try {
        const response = await fetch('/api/update-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfigData),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Server responded with an error.');
        }

        currentConfig = newConfigData;
        saveButton.textContent = 'Saved!';
        saveButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        saveButton.classList.add('bg-green-500');

    } catch (error) {
        console.error('Failed to save configuration:', error);
        saveButton.textContent = 'Error!';
        saveButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        saveButton.classList.add('bg-red-500');
        alert(`Failed to save: ${error.message}`);
    } finally {
        setTimeout(() => {
            saveButton.textContent = 'Save Changes';
            saveButton.disabled = false;
            saveButton.classList.remove('bg-green-500', 'bg-red-500');
            saveButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }, 2000);
    }
}

function setupImageUploader(uploaderId, targetInputId, previewId) {
    const uploader = document.getElementById(uploaderId);
    const targetInput = document.getElementById(targetInputId);
    const preview = document.getElementById(previewId);

    uploader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result;
            preview.src = base64String;
            targetInput.value = base64String;
        };
        reader.readAsDataURL(file);
    });
}

function updatePreviewFromInput(url, previewId) {
    const preview = document.getElementById(previewId);
    if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        preview.src = url;
    } else if (!url) {
        preview.src = "";
    }
}
