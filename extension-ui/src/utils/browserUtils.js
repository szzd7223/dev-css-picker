/**
 * Checks if a URL is restricted by Chrome for script injection
 * @param {string} url 
 * @returns {boolean}
 */
export const isRestrictedUrl = (url) => {
    if (!url) return false;
    return (
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('brave://') ||
        url.startsWith('about:') ||
        url.includes('chrome.google.com/webstore') ||
        url.includes('addons.mozilla.org')
    );
};
