// Token cache
let tokenCache = {
    token: null,
    region: null,
    expirationTime: null
};

// Function to get an access token with caching
async function getAccessToken(subscriptionKey, region) {
    const currentTime = Date.now();
    
    // Check if we have a valid cached token for the same region
    if (tokenCache.token && 
        tokenCache.region === region && 
        tokenCache.expirationTime > currentTime) {
        console.log("Using cached token");
        return tokenCache.token;
    }
    
    // If no valid token in cache, request a new one
    console.log("Requesting new token");
    const tokenEndpoint = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    
    try {
        const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
                "Ocp-Apim-Subscription-Key": subscriptionKey,
                "Content-Length": "0"
            }
        });
        
        if (!response.ok) {
            throw new Error(`Token request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const token = await response.text();
        
        // Cache the token with expiration time (9 minutes to be safe, tokens are valid for 10 minutes)
        tokenCache = {
            token: token,
            region: region,
            expirationTime: currentTime + (9 * 60 * 1000) // 9 minutes in milliseconds
        };
        
        return token;
    } catch (error) {
        console.error("Error getting access token:", error);
        throw error;
    }
}

// Function to get list of available voices
async function getVoicesList(accessToken, region) {
    const voicesEndpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
    
    try {
        const response = await fetch(voicesEndpoint, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Voices request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const voices = await response.json();
        return voices;
    } catch (error) {
        console.error("Error getting voices list:", error);
        throw error;
    }
}

// Add a new function for streaming audio playback
async function streamAudio(url, accessToken, ssml) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Update extension icon to show processing
            if (chrome.action) {
                chrome.action.setBadgeText({ text: '...' });
                chrome.action.setBadgeBackgroundColor({ color: '#FFA000' });
            }
            
            // Create a status indicator
            const statusIndicator = document.createElement('div');
            statusIndicator.textContent = 'Preparing audio...';
            statusIndicator.style.position = 'fixed';
            statusIndicator.style.bottom = '20px';
            statusIndicator.style.right = '20px';
            statusIndicator.style.backgroundColor = 'rgba(66, 133, 244, 0.9)';
            statusIndicator.style.color = 'white';
            statusIndicator.style.padding = '8px 12px';
            statusIndicator.style.borderRadius = '4px';
            statusIndicator.style.zIndex = '10000';
            document.body.appendChild(statusIndicator);
            
            // Make the request
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/ssml+xml",
                    "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3"
                },
                body: ssml
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            // Get the audio data
            const audioData = await response.arrayBuffer();
            
            // Update status
            statusIndicator.textContent = 'Playing...';
            
            // Update extension icon to show playing
            if (chrome.action) {
                chrome.action.setBadgeText({ text: '▶' });
                chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
            }
            
            // Decode the audio data
            audioContext.decodeAudioData(audioData, (buffer) => {
                // Create a source node
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                
                // Connect to the audio context destination
                source.connect(audioContext.destination);
                
                // Play the audio
                source.start(0);
                
                // Remove the status indicator when playback ends
                source.onended = () => {
                    document.body.removeChild(statusIndicator);
                    
                    // Reset extension icon
                    if (chrome.action) {
                        chrome.action.setBadgeText({ text: '' });
                    }
                    
                    resolve();
                };
            }, (error) => {
                console.error('Error decoding audio data:', error);
                document.body.removeChild(statusIndicator);
                
                // Reset extension icon
                if (chrome.action) {
                    chrome.action.setBadgeText({ text: '' });
                }
                
                reject(error);
            });
        } catch (error) {
            // Clean up the status indicator
            try {
                const existingIndicator = document.querySelector('div[style*="Preparing audio"]');
                if (existingIndicator) {
                    document.body.removeChild(existingIndicator);
                }
            } catch (e) {
                // Ignore errors when trying to remove the indicator
            }
            
            // Reset extension icon
            if (chrome.action) {
                chrome.action.setBadgeText({ text: '' });
            }
            
            reject(error);
        }
    });
}

async function azureSpeakText(text) {
    // Get the subscription key, endpoint, and voice from Chrome storage
    const { subscriptionKey, region, selectedVoice } = await new Promise(resolve => {
        chrome.storage.sync.get(['subscriptionKey', 'region', 'selectedVoice'], (result) => {
            resolve({
                subscriptionKey: result.subscriptionKey || "",
                region: result.region || "",
                selectedVoice: result.selectedVoice || "en-US-JennyNeural"
            });
        });
    });

    if (!subscriptionKey || !region) {
        alert("Please set your Azure subscription key and region in the extension options.");
        return;
    }

    try {
        // Get access token (now with caching)
        const accessToken = await getAccessToken(subscriptionKey, region);
        
        // Prepare the TTS request
        const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

        const ssml = `
            <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
                <voice name='${selectedVoice}'>
                    ${text}
                </voice>
            </speak>`;

        // Stream the audio
        await streamAudio(url, accessToken, ssml);
        
    } catch (error) {
        console.error("Error:", error);
        alert(`Error: ${error.message}`);
    }
}

// Add a function to preload voices
async function preloadVoices(region) {
    // Check if we already have voices cached
    if (window.cachedVoices) {
        return window.cachedVoices;
    }
    
    try {
        // Get the subscription key from Chrome storage
        const { subscriptionKey } = await new Promise(resolve => {
            chrome.storage.sync.get(['subscriptionKey'], (result) => {
                resolve({
                    subscriptionKey: result.subscriptionKey || ""
                });
            });
        });
        
        if (!subscriptionKey || !region) {
            return null;
        }
        
        // Get access token (using the cached token if available)
        const accessToken = await getAccessToken(subscriptionKey, region);
        
        // Get voices list
        const voices = await getVoicesList(accessToken, region);
        
        // Cache the voices
        window.cachedVoices = voices;
        
        return voices;
    } catch (error) {
        console.error("Error preloading voices:", error);
        return null;
    }
}