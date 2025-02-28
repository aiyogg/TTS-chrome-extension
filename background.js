chrome.runtime.onInstalled.addListener(() => {
    // Create context menu item
    chrome.contextMenus.create({
        id: "speakText",
        title: "Speak Text",
        contexts: ["selection"]
    });
    
    // Set the extension icon badge to indicate it's ready
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    chrome.action.setBadgeText({ text: '' });
    
    // Set default values for Azure credentials if not already set
    chrome.storage.sync.get(['subscriptionKey', 'region', 'selectedVoice'], (result) => {
        if (!result.subscriptionKey) {
            chrome.storage.sync.set({ subscriptionKey: "" });
        }
        if (!result.region) {
            chrome.storage.sync.set({ region: "" });
        }
        if (!result.selectedVoice) {
            chrome.storage.sync.set({ selectedVoice: "en-US-JennyNeural" });
        }
        
        // Update icon based on whether credentials are set
        if (result.subscriptionKey && result.region) {
            // Credentials are set, show normal icon
            chrome.action.setIcon({
                path: {
                    "16": "icons/icon16.png",
                    "32": "icons/icon32.png",
                    "48": "icons/icon48.png",
                    "128": "icons/icon128.png"
                }
            });
        } else {
            // Credentials not set, show a badge to indicate setup needed
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        }
        
        // Preload voices if credentials are set
        if (result.subscriptionKey && result.region) {
            // Load the azureTTS.js script
            chrome.scripting.executeScript({
                target: { tabId: -1 }, // Background script context
                files: ['azureTTS.js']
            }).then(() => {
                // Preload voices
                chrome.scripting.executeScript({
                    target: { tabId: -1 }, // Background script context
                    function: (region) => {
                        if (typeof preloadVoices === 'function') {
                            preloadVoices(region);
                        }
                    },
                    args: [result.region]
                });
            }).catch(err => {
                console.error("Error preloading voices:", err);
            });
        }
    });
});

// Listen for changes to the storage and update the icon accordingly
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && (changes.subscriptionKey || changes.region)) {
        chrome.storage.sync.get(['subscriptionKey', 'region'], (result) => {
            if (result.subscriptionKey && result.region) {
                // Credentials are set, clear the badge
                chrome.action.setBadgeText({ text: '' });
            } else {
                // Credentials not set, show a badge
                chrome.action.setBadgeText({ text: '!' });
                chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
            }
        });
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "speakText") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['azureTTS.js'],
        }).then(() => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: speakSelectedText,
                args: [info.selectionText]
            });
        }).catch(err => {
            console.error("Error injecting script:", err);
        });
    }
});

function speakSelectedText(selectedText) {
    if (typeof azureSpeakText === 'function') {
        azureSpeakText(selectedText);
    } else {
        console.error("Azure TTS function not found");
        alert("Error: Azure TTS function not found");
    }
}