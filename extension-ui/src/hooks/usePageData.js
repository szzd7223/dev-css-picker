import { useState, useEffect, useCallback } from 'react';
import { isRestrictedUrl } from '../utils/browserUtils';

export function usePageData() {
    const [data, setData] = useState({
        fonts: [],
        bgColors: [],
        textColors: [],
        meta: { title: '', description: '' },
        loading: true,
        error: null
    });

    const scanPage = useCallback(() => {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Development Fallback
        if (typeof chrome === 'undefined' || !chrome.tabs) {
            setTimeout(() => {
                setData({
                    fonts: [{ value: 'Inter', count: 120 }, { value: 'Roboto', count: 40 }],
                    bgColors: [{ value: '#FFFFFF', count: 50 }, { value: '#11001F', count: 102 }],
                    textColors: [{ value: '#000000', count: 100 }, { value: '#646CFF', count: 20 }],
                    meta: { title: 'Mock Page Title', description: 'Mock description for dev mode.' },
                    loading: false,
                    error: null
                });
            }, 800);
            return;
        }

        // Real Logic
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab?.id) {
                setData(prev => ({ ...prev, loading: false, error: "No active tab." }));
                return;
            }

            if (isRestrictedUrl(activeTab.url)) {
                setData(prev => ({
                    ...prev,
                    loading: false,
                    error: "RESTRICTED_PAGE"
                }));
                return;
            }

            // Helper to perform the actual message send
            const sendMessage = () => {
                chrome.tabs.sendMessage(activeTab.id, { type: 'SCAN_PAGE' }, (response) => {
                    if (chrome.runtime.lastError) {
                        const msg = chrome.runtime.lastError.message;
                        // Auto-Injection Logic: If receiver doesn't exist, inject script
                        if (msg.includes("Receiving end does not exist")) {
                            console.log("Injecting content script...");
                            chrome.scripting.executeScript({
                                target: { tabId: activeTab.id },
                                files: [
                                    'content-script/tracker.js',
                                    'content-script/messaging.js',
                                    'content-script/utils.js',
                                    'content-script/inspector.js',
                                    'content-script/overlay.js',
                                    'content-script/picking.js',
                                    'content-script/scanner.js',
                                    'content-script/init.js'
                                ]
                            }, () => {
                                if (chrome.runtime.lastError) {
                                    setData(prev => ({ ...prev, loading: false, error: "Failed to inject script." }));
                                } else {
                                    // Retry message after injection
                                    setTimeout(sendMessage, 500);
                                }
                            });
                        } else {
                            setData(prev => ({ ...prev, loading: false, error: "Connection error. Refresh page." }));
                        }
                        return;
                    }

                    if (response) {
                        setData({ ...response, loading: false, error: null });
                    } else {
                        setData(prev => ({ ...prev, loading: false, error: "Empty response." }));
                    }
                });
            };

            sendMessage();
        });
    }, []);

    useEffect(() => {
        scanPage();

        // Event Listeners for Realtime Updates
        const handleTabUpdated = (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                scanPage();
            }
        };

        const handleTabActivated = () => {
            scanPage();
        };

        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.onUpdated.addListener(handleTabUpdated);
            chrome.tabs.onActivated.addListener(handleTabActivated);
        }

        return () => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.onUpdated.removeListener(handleTabUpdated);
                chrome.tabs.onActivated.removeListener(handleTabActivated);
            }
        };
    }, [scanPage]);

    return { ...data, rescan: scanPage };
}
