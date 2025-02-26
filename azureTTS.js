// Function to get an access token
async function getAccessToken(subscriptionKey, region) {
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
        // Get access token
        const accessToken = await getAccessToken(subscriptionKey, region);
        
        // Prepare the TTS request
        const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

        const ssml = `
            <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
                <voice name='${selectedVoice}'>
                    ${text}
                </voice>
            </speak>`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3"
            },
            body: ssml
        });

        if (response.ok) {
            const audioData = await response.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(audioData);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        } else {
            console.error("Error calling Azure TTS API:", response.statusText);
            alert(`Error calling Azure TTS API: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error:", error);
        alert(`Error: ${error.message}`);
    }
}