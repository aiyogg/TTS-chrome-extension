chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "speakText",
        title: "Speak Text",
        contexts: ["selection"]
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

// Set default values for Azure credentials if not already set
chrome.runtime.onInstalled.addListener(() => {
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
    });
});