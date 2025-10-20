import fallbackConfig from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    let config;

    try {
        const response = await fetch('/api/get-config');
        if (response.ok) {
            config = await response.json();
        } else {
            console.warn('Could not fetch live config, using fallback.');
            config = fallbackConfig;
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
    document.title = successConfig.pageTitle;
    document.getElementById('success-favicon').href = successConfig.faviconURL;
    
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
    promoImage.src = successConfig.promoImageURL;
    promoImage.alt = "Promo Image";
}

