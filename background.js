chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "speakText",
        title: "Speak Text",
        contexts: ["selection"]
    });
    
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