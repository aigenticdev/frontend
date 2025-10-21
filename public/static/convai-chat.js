(function() {
    'use strict';

    // Configuration object
    const config = {
        characterId: null,
        serviceName: null,
        appSessionId: null,
        welcomeMessage: 'Welcome! How can I help you today?',
        backendUrl: '',
        apiEndpoint: '/api/convai/proxy',
        enableVoice: true,
        debugMode: true
    };

    // Application state
    const state = {
        sessionId: null,
        isProcessing: false,
        initialized: false
    };

    // DOM elements cache
    const elements = {};

    // Audio system - collect chunks, play when complete
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioChunks = [];
    let currentAudioSource = null;
    let wavHeader = null;

    /**
     * Initialize the chat service
     */
    function initialize() {
        if (state.initialized) return;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
            return;
        }

        log('Initializing Convai Chat Service...');

        if (!loadConfiguration()) {
            console.error('Failed to load configuration from HTML');
            return;
        }

        state.sessionId = config.appSessionId;

        if (!cacheElements()) {
            console.error('Required DOM elements not found');
            return;
        }

        setupEventListeners();
        showStartButton();
        state.initialized = true;
        log(`Convai Chat initialized for service: ${config.serviceName}`);
    }

    /**
     * Load configuration from HTML data attributes
     */
    function loadConfiguration() {
        const chatContainer = document.querySelector('.convai-container');
        if (!chatContainer) {
            console.error('Convai container not found (.convai-container)');
            return false;
        }

        config.characterId = chatContainer.dataset.characterId || null;
        config.serviceName = chatContainer.dataset.serviceName || 'default';
        config.welcomeMessage = chatContainer.dataset.welcomeMessage || config.welcomeMessage;
        config.appSessionId = chatContainer.dataset.appSessionId || null;

        if (!config.characterId || config.characterId.includes('YOUR_')) {
            console.error('Character ID not configured. Please set data-character-id in HTML.');
            return false;
        }
        if (!config.appSessionId) {
            console.error('Application Session ID not configured. Please set data-app-session-id in HTML.');
            return false;
        }

        log('Configuration loaded:', config);
        return true;
    }

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements.chatWindow = document.getElementById('convai-chat-window');
        elements.questionInput = document.getElementById('convai-input');
        elements.submitBtn = document.getElementById('convai-submit');

        if (!elements.chatWindow || !elements.questionInput || !elements.submitBtn) {
            console.error('Missing required elements: convai-chat-window, convai-input, or convai-submit');
            return false;
        }

        return true;
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        elements.submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleSubmit();
        });

        elements.questionInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        });

        elements.questionInput.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
    }

    /**
     * Display welcome/start button
     */
    function showStartButton() {
        const inputArea = document.querySelector('.convai-input-area');
        inputArea.style.display = 'none';

        const startDiv = document.createElement('div');
        startDiv.className = 'start-chat-container';
        startDiv.style.textAlign = 'center';
        startDiv.style.padding = '20px';

        const button = document.createElement('button');
        button.textContent = 'Start Chat';
        button.className = 'start-chat-btn';

        button.addEventListener('click', () => {
            startDiv.remove();
            inputArea.style.display = '';
            sendToConvai("Hi, let's start the conversation from the beginning. Can you introduce yourself?");
        });

        startDiv.appendChild(button);
        elements.chatWindow.appendChild(startDiv);
    }

    /**
     * Handle form submission
     */
    async function handleSubmit() {
        const message = elements.questionInput.value.trim();
        if (!message || state.isProcessing) return;

        elements.questionInput.value = '';
        autoResizeTextarea(elements.questionInput);
        appendMessage(message, 'user');

        await sendToConvai(message);
    }

    /**
     * Parse WAV header to extract audio format information
     */
    function parseWavHeader(bytes) {
        // WAV file structure (simplified):
        // Bytes 0-3: "RIFF"
        // Bytes 4-7: File size
        // Bytes 8-11: "WAVE"
        // Bytes 12-15: "fmt "
        // Bytes 16-19: Format chunk size
        // Bytes 20-21: Audio format (1 = PCM)
        // Bytes 22-23: Number of channels
        // Bytes 24-27: Sample rate
        // Bytes 28-31: Byte rate
        // Bytes 32-33: Block align
        // Bytes 34-35: Bits per sample
        // Bytes 36-39: "data"
        // Bytes 40-43: Data size

        const view = new DataView(bytes.buffer);

        return {
            numChannels: view.getUint16(22, true),
            sampleRate: view.getUint32(24, true),
            bitsPerSample: view.getUint16(34, true),
            dataOffset: 44 // Standard WAV header size
        };
    }

    /**
     * Collect audio chunk (stores for later processing)
     */
    function handleAudioChunk(base64Chunk) {
        try {
            // Convert base64 to Uint8Array
            const binary = atob(base64Chunk);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            // Store chunk
            audioChunks.push(bytes);

            // Parse header from first chunk
            if (!wavHeader && bytes.length > 44) {
                wavHeader = parseWavHeader(bytes);
                log('WAV Header parsed:', wavHeader);
            }

        } catch (err) {
            console.error("Error processing audio chunk:", err);
        }
    }

    /**
     * Process all collected chunks into one gapless audio buffer
     */
    async function processAndPlayAudio() {
        if (audioChunks.length === 0) {
            log('No audio chunks to process');
            return;
        }

        if (!wavHeader) {
            console.error('No WAV header found');
            return;
        }

        try {
            log(`Processing ${audioChunks.length} audio chunks...`);

            // Calculate total PCM data size (excluding headers)
            let totalPcmSize = 0;
            for (const chunk of audioChunks) {
                totalPcmSize += (chunk.length - wavHeader.dataOffset);
            }

            // Create buffer for concatenated PCM data
            const pcmData = new Uint8Array(totalPcmSize);
            let offset = 0;

            // Extract and concatenate PCM data from each chunk
            for (const chunk of audioChunks) {
                const pcmChunk = chunk.slice(wavHeader.dataOffset);
                pcmData.set(pcmChunk, offset);
                offset += pcmChunk.length;
            }

            log(`Concatenated ${totalPcmSize} bytes of PCM data`);

            // Convert PCM bytes to Float32Array for Web Audio API
            const bytesPerSample = wavHeader.bitsPerSample / 8;
            const numSamples = pcmData.length / bytesPerSample / wavHeader.numChannels;

            // Create AudioBuffer
            const audioBuffer = audioContext.createBuffer(
                wavHeader.numChannels,
                numSamples,
                wavHeader.sampleRate
            );

            // Fill the audio buffer with PCM data
            for (let channel = 0; channel < wavHeader.numChannels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);

                for (let i = 0; i < numSamples; i++) {
                    const offset = (i * wavHeader.numChannels + channel) * bytesPerSample;

                    // Convert PCM to float (-1.0 to 1.0)
                    let sample = 0;
                    if (wavHeader.bitsPerSample === 16) {
                        // 16-bit PCM
                        sample = new DataView(pcmData.buffer).getInt16(offset, true) / 32768.0;
                    } else if (wavHeader.bitsPerSample === 8) {
                        // 8-bit PCM (unsigned)
                        sample = (pcmData[offset] - 128) / 128.0;
                    }

                    channelData[i] = sample;
                }
            }

            log(`Created AudioBuffer: ${audioBuffer.duration.toFixed(2)}s duration`);

            // Play the complete buffer
            playAudioBuffer(audioBuffer);

        } catch (err) {
            console.error("Error processing audio:", err);
        }
    }

    /**
     * Play the complete audio buffer (gapless playback)
     */
    function playAudioBuffer(audioBuffer) {
        // Stop any existing playback
        stopAudio();

        // Create source and play
        currentAudioSource = audioContext.createBufferSource();
        currentAudioSource.buffer = audioBuffer;
        currentAudioSource.connect(audioContext.destination);

        currentAudioSource.onended = () => {
            log('Audio playback completed');
            currentAudioSource = null;
        };

        currentAudioSource.start(0);
        log('Started gapless audio playback');
    }

    /**
     * Stop audio playback and clear chunks
     */
    function stopAudio() {
        if (currentAudioSource) {
            try {
                currentAudioSource.stop();
            } catch (e) {
                // Already stopped
            }
            currentAudioSource = null;
        }

        audioChunks = [];
        wavHeader = null;
        log('Audio stopped and chunks cleared');
    }

    /**
     * Send message to Convai backend
     */
    async function sendToConvai(message) {
        setUiState(true);

        // Clear previous audio
        stopAudio();

        const botMessageDiv = appendMessage("", "bot");
        const botParagraph = botMessageDiv.querySelector("p");
        botParagraph.innerHTML = '<span class="typing-cursor"></span>';

        let fullText = "";

        try {
            const queryParams = new URLSearchParams({
                char_id: config.characterId,
                user_text: message,
                session_id: state.sessionId
            });
            const url = `/api/convai/proxy/stream?${queryParams.toString()}`;
            const eventSource = new EventSource(url);

            eventSource.onmessage = function(event) {
                if (!event.data) return;

                try {
                    const data = JSON.parse(event.data);

                    if (data.text) {
                        fullText += data.text;
                        botParagraph.textContent = fullText;
                        scrollToBottom();
                    }
                    if (data.audio) {
                        handleAudioChunk(data.audio);
                    }
                    if (data.end) {
                        log("Received 'end' signal from stream.");
                        eventSource.close();
                        finalizeResponse();
                    }
                } catch (e) {
                    log("Failed to parse stream data chunk:", e, "Chunk:", event.data);
                }
            };

            const finalizeResponse = () => {
                setUiState(false);
                if (!fullText) {
                    botParagraph.textContent = "An error occurred. Please try again.";
                }
                // Process and play all collected audio chunks
                processAndPlayAudio();
            };

            eventSource.onerror = function(err) {
                log("EventSource error:", err);
                eventSource.close();
                finalizeResponse();
            };

        } catch (error) {
            showError(`Error: ${error.message}`);
            console.error('Convai API error:', error);
            setUiState(false);
            botMessageDiv.remove();
        }
    }

    /**
     * Append message to chat window
     */
    function appendMessage(text, sender = 'bot') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const p = document.createElement('p');
        p.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
        messageDiv.appendChild(p);

        elements.chatWindow.appendChild(messageDiv);
        scrollToBottom();

        return messageDiv;
    }

    /**
     * Show error message
     */
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';
        const p = document.createElement('p');
        p.textContent = message;
        errorDiv.appendChild(p);
        elements.chatWindow.appendChild(errorDiv);
        scrollToBottom();

        setTimeout(() => errorDiv.remove(), 5000);
    }

    /** UI helpers */
    function setUiState(isLoading) {
        state.isProcessing = isLoading;
        elements.questionInput.disabled = isLoading;
        elements.submitBtn.disabled = isLoading;
        elements.questionInput.placeholder = isLoading
            ? 'Assistant is typing...'
            : 'Type your message...';
    }

    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    function scrollToBottom() {
        if (elements.chatWindow) {
            elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function log(...args) {
        if (config.debugMode) console.log(`[Convai-${config.serviceName}]`, ...args);
    }

    // Public API
    setTimeout(() => {
        if (config.serviceName) {
            window.ConvaiChat = window.ConvaiChat || {};
            window.ConvaiChat[config.serviceName] = {
                sendMessage: msg => {
                    if (elements.questionInput && msg) {
                        elements.questionInput.value = msg;
                        handleSubmit();
                    }
                },
                clearSession: () => {
                    stopAudio();
                    elements.chatWindow.innerHTML = '';
                    showStartButton();
                },
                getSessionId: () => state.sessionId,
                setDebugMode: enabled => (config.debugMode = enabled),
                stopAudio: stopAudio
            };
        }
    }, 100);

    initialize();

})();