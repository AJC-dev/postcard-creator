import fallbackConfig from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    let config;

    try {
        // Check if config was preloaded
        if (window.__successPageConfig) {
            config = { successPage: window.__successPageConfig };
        } else {
            // Fallback: fetch if preload failed
            const response = await fetch('/api/get-config');
            if (response.ok) {
                config = await response.json();
            } else {
                console.warn('Could not fetch live config, using fallback.');
                config = fallbackConfig;
            }
        }
    } catch (error) {
        console.error('Error fetching live config, using fallback.', error);
        config = fallbackConfig;
    }

    if (config && config.successPage) {
        applySuccessPageConfig(config.successPage);
    } else {
        console.error('Success page configuration is missing.');
    }

    // Hide the loading overlay and show the content
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
});

function applySuccessPageConfig(successConfig) {
    // Title and favicon already set by preload, but ensure they're updated
    if (!document.title || document.title === 'Loading...') {
        document.title = successConfig.pageTitle;
    }
    
    const favicon = document.getElementById('success-favicon');
    if (!favicon.href || favicon.href === window.location.href) {
        favicon.href = successConfig.faviconURL + '?t=' + Date.now();
    }
    
    document.getElementById('success-heading').textContent = successConfig.heading;
    document.getElementById('success-heading').style.color = successConfig.headingColor;
    
    document.getElementById('success-subheading').textContent = successConfig.subheading;

    const button = document.getElementById('success-button');
    button.textContent = successConfig.buttonText;
    button.style.backgroundColor = successConfig.buttonColor;
    button.style.color = successConfig.buttonTextColor;

    document.getElementById('success-promo-text').textContent = successConfig.promoText;

    const promoLink = document.getElementById('success-promo-link');
    promoLink.href = successConfig.promoLinkURL;

    const promoImage = document.getElementById('success-promo-image');
    // Cache-busting for promo image
    promoImage.src = successConfig.promoImageURL + '?t=' + Date.now();
    promoImage.alt = "Promo Image";
}