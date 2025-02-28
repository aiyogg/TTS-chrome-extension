document.addEventListener('DOMContentLoaded', function() {
    // Load saved values
    chrome.storage.sync.get(['subscriptionKey', 'region', 'selectedVoice'], function(result) {
        document.getElementById('subscriptionKey').value = result.subscriptionKey || '';
        document.getElementById('region').value = result.region || '';
    });

    // Save button click handler
    document.getElementById('saveButton').addEventListener('click', function() {
        const subscriptionKey = document.getElementById('subscriptionKey').value.trim();
        const region = document.getElementById('region').value.trim();
        
        // Validate inputs
        if (!subscriptionKey || !region) {
            showStatus('Please enter both subscription key and region.', 'error');
            return;
        }
        
        // Save to Chrome storage
        chrome.storage.sync.set({
            subscriptionKey: subscriptionKey,
            region: region
        }, function() {
            showStatus('Settings saved successfully!', 'success');
        });
    });

    // Load voices button click handler
    document.getElementById('loadVoicesButton').addEventListener('click', async function() {
        const subscriptionKey = document.getElementById('subscriptionKey').value.trim();
        const region = document.getElementById('region').value.trim();
        
        if (!subscriptionKey || !region) {
            showStatus('Please enter both subscription key and region.', 'error');
            return;
        }
        
        try {
            // Show loading indicator
            document.getElementById('loading').style.display = 'block';
            
            // Get access token
            const token = await getAccessToken(subscriptionKey, region);
            
            // Get voices list
            const voices = await getVoicesList(token, region);
            
            // Populate voice selection
            populateVoiceSelection(voices);
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Show voice selection container
            document.getElementById('voiceSelectionContainer').style.display = 'block';
        } catch (error) {
            document.getElementById('loading').style.display = 'none';
            showStatus(`Error loading voices: ${error.message}`, 'error');
        }
    });

    // Save voice button click handler
    document.getElementById('saveVoiceButton').addEventListener('click', function() {
        const voiceSelect = document.getElementById('voiceSelect');
        const selectedVoice = voiceSelect.value;
        
        if (!selectedVoice) {
            showStatus('Please select a voice.', 'error');
            return;
        }
        
        // Save selected voice to Chrome storage
        chrome.storage.sync.set({
            selectedVoice: selectedVoice
        }, function() {
            showStatus('Voice saved successfully!', 'success');
        });
    });

    // Language filter change handler
    document.getElementById('languageFilter').addEventListener('change', function() {
        applyFilters();
    });
    
    // Multilingual filter change handler
    document.getElementById('multilingualFilter').addEventListener('change', function() {
        applyFilters();
    });
    
    // Function to apply all filters
    function applyFilters() {
        const selectedLanguage = document.getElementById('languageFilter').value;
        const multilingualOnly = document.getElementById('multilingualFilter').checked;
        const voiceSelect = document.getElementById('voiceSelect');
        
        // Show all options first
        Array.from(voiceSelect.options).forEach(option => {
            option.style.display = '';
        });
        
        // Apply filters
        Array.from(voiceSelect.options).forEach(option => {
            let shouldShow = true;
            
            // Apply language filter
            if (selectedLanguage !== 'all' && !option.dataset.locale.startsWith(selectedLanguage)) {
                shouldShow = false;
            }
            
            // Apply multilingual filter
            if (multilingualOnly && option.dataset.multilingual !== 'true') {
                shouldShow = false;
            }
            
            option.style.display = shouldShow ? '' : 'none';
        });
    }

    // Helper function to show status messages
    function showStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = 'status ' + type;
        statusElement.style.display = 'block';
        
        // Hide the status message after 3 seconds
        setTimeout(function() {
            statusElement.style.display = 'none';
        }, 3000);
    }

    // Function to get access token
    async function getAccessToken(subscriptionKey, region) {
        const tokenEndpoint = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
        
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
    }

    // Function to get list of available voices
    async function getVoicesList(accessToken, region) {
        const voicesEndpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
        
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
    }

    // Function to populate voice selection
    function populateVoiceSelection(voices) {
        const voiceSelect = document.getElementById('voiceSelect');
        const languageFilter = document.getElementById('languageFilter');
        
        // Clear existing options
        voiceSelect.innerHTML = '';
        
        // Sort voices by locale and then by voice name
        voices.sort((a, b) => {
            if (a.Locale !== b.Locale) {
                return a.Locale.localeCompare(b.Locale);
            }
            return a.ShortName.localeCompare(b.ShortName);
        });
        
        // Track unique languages for the filter
        const languages = new Set();
        
        // Count multilingual voices
        let multilingualCount = 0;
        
        // Add voice options
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.ShortName;
            option.textContent = `${voice.LocaleName} - ${voice.DisplayName} (${voice.Gender})`;
            option.dataset.locale = voice.Locale;
            
            // Add multilingual attribute if the voice has secondary locales
            const isMultilingual = voice.SecondaryLocaleList && voice.SecondaryLocaleList.length > 0;
            option.dataset.multilingual = isMultilingual;
            
            // Count multilingual voices
            if (isMultilingual) {
                multilingualCount++;
                option.textContent += ' [Multilingual]';
                
                // Add tooltip with supported languages
                const supportedLocales = [voice.Locale, ...voice.SecondaryLocaleList];
                const supportedLanguages = supportedLocales.map(locale => {
                    const langCode = locale.split('-')[0];
                    return getLanguageName(langCode);
                });
                option.title = `Supports: ${supportedLanguages.join(', ')}`;
            }
            
            voiceSelect.appendChild(option);
            
            // Add language to filter if not already added
            const langCode = voice.Locale.split('-')[0];
            languages.add(langCode);
        });
        
        // Update multilingual filter label with count
        const multilingualLabel = document.querySelector('label[for="multilingualFilter"]');
        multilingualLabel.textContent = `Show only multilingual voices (${multilingualCount})`;
        
        // Clear existing language filter options (except "All Languages")
        while (languageFilter.options.length > 1) {
            languageFilter.remove(1);
        }
        
        // Add language options to filter
        const sortedLanguages = Array.from(languages).sort();
        sortedLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = getLanguageName(lang);
            languageFilter.appendChild(option);
        });
        
        // Load previously selected voice if available
        chrome.storage.sync.get(['selectedVoice'], function(result) {
            if (result.selectedVoice) {
                // Find the option with the matching value
                for (let i = 0; i < voiceSelect.options.length; i++) {
                    if (voiceSelect.options[i].value === result.selectedVoice) {
                        voiceSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        });
    }

    // Helper function to get language name from code
    function getLanguageName(langCode) {
        const languages = {
            'ar': 'Arabic',
            'zh': 'Chinese',
            'cs': 'Czech',
            'da': 'Danish',
            'nl': 'Dutch',
            'en': 'English',
            'fi': 'Finnish',
            'fr': 'French',
            'de': 'German',
            'el': 'Greek',
            'he': 'Hebrew',
            'hi': 'Hindi',
            'hu': 'Hungarian',
            'id': 'Indonesian',
            'it': 'Italian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'no': 'Norwegian',
            'pl': 'Polish',
            'pt': 'Portuguese',
            'ro': 'Romanian',
            'ru': 'Russian',
            'sk': 'Slovak',
            'es': 'Spanish',
            'sv': 'Swedish',
            'th': 'Thai',
            'tr': 'Turkish',
            'vi': 'Vietnamese'
        };
        
        return languages[langCode] || langCode;
    }
}); 