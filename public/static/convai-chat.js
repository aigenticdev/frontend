/**
 * Convai Chat Service - Shared implementation for multiple chat instances
 * Uses unique IDs to avoid conflicts with other scripts
 */

(function() {
    'use strict';

    // Configuration object - will be populated from HTML data attributes
    const config = {
        characterId: null,
        serviceName: null,
        welcomeMessage: 'Welcome! How can I help you today?',
        backendUrl: '',  // Update this to match your backend
        apiEndpoint: '/api/convai/proxy',
        enableVoice: true,
        debugMode: true  // Set to true to see debug messages
    };

    // Application state
    const state = {
        sessionId: '-1',
        isProcessing: false,
        initialized: false
    };

    // DOM elements cache
    const elements = {};

    // Session storage key will be dynamic based on service name
    let sessionStorageKey = null;

    /**
     * Initialize the chat service
     */
    function initialize() {
        if (state.initialized) return;

        // Wait for DOM if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
            return;
        }

        log('Initializing Convai Chat Service...');

        // Get configuration from HTML
        if (!loadConfiguration()) {
            console.error('Failed to load configuration from HTML');
            return;
        }

        // Cache DOM elements - using unique IDs
        if (!cacheElements()) {
            console.error('Required DOM elements not found');
            return;
        }

        // Set up session storage key
        sessionStorageKey = `convai_session_${config.serviceName}`;

        // Load existing session if any
        loadSession();

        // Set up event listeners
        setupEventListeners();

        // Display welcome message
        displayWelcomeMessage();

        state.initialized = true;
        log(`Convai Chat initialized for service: ${config.serviceName}`);
    }

    /**
     * Load configuration from HTML data attributes
     */
    function loadConfiguration() {
        // Look for element with convai-container class
        const chatContainer = document.querySelector('.convai-container');
        if (!chatContainer) {
            console.error('Convai container not found (.convai-container)');
            return false;
        }

        // Read data attributes
        config.characterId = chatContainer.dataset.characterId || null;
        config.serviceName = chatContainer.dataset.serviceName || 'default';
        config.welcomeMessage = chatContainer.dataset.welcomeMessage || config.welcomeMessage;

        // Validate required configuration
        if (!config.characterId || config.characterId.includes('YOUR_')) {
            console.error('Character ID not configured. Please set data-character-id in HTML.');
            return false;
        }

        log('Configuration loaded:', config);
        return true;
    }

    /**
     * Cache DOM elements - using unique Convai IDs
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
     * Load session from localStorage
     */
    function loadSession() {
        const savedSessionId = localStorage.getItem(sessionStorageKey);
        if (savedSessionId && savedSessionId !== '-1') {
            state.sessionId = savedSessionId;
            log('Loaded existing session:', state.sessionId);
        }
    }

    /**
     * Save session to localStorage
     */
    function saveSession() {
        if (state.sessionId && state.sessionId !== '-1') {
            localStorage.setItem(sessionStorageKey, state.sessionId);
            log('Session saved:', state.sessionId);
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Submit button click
        elements.submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleSubmit();
        });

        // Enter key to submit
        elements.questionInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        });

        // Auto-resize textarea
        elements.questionInput.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
    }

    /**
     * Display welcome message
     */
    function displayWelcomeMessage() {
        appendMessage(config.welcomeMessage, 'bot');
    }

    /**
     * Handle form submission
     */
    async function handleSubmit() {
        const message = elements.questionInput.value.trim();
        if (!message || state.isProcessing) return;

        // Clear input
        elements.questionInput.value = '';
        autoResizeTextarea(elements.questionInput);

        // Add user message
        appendMessage(message, 'user');

        // Send to Convai
        await sendToConvai(message);
    }

    /**
     * Send message to Convai backend
     */
    async function sendToConvai(message) {
        setUiState(true);
        showTypingIndicator();

        try {
            const url = `${config.backendUrl}${config.apiEndpoint}`;
            log('Sending request to:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    char_id: config.characterId,
                    user_text: message,
                    session_id: state.sessionId
                })
            });

            if (!response.ok) {
                let errorMsg = `Server error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.detail || errorMsg;
                } catch (e) {
                    // Ignore JSON parse error
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            log('Received response:', data);

            // Update session ID if this was a new session
            if (state.sessionId === '-1' && data.sessionID) {
                state.sessionId = data.sessionID;
                saveSession();
                log('New session started:', state.sessionId);
            }

            hideTypingIndicator();

            // Display response with audio if available
            if (data.text) {
                appendMessage(data.text, 'bot', data.audio, data.sample_rate);
            } else {
                showError('Received empty response from assistant');
            }

        } catch (error) {
            hideTypingIndicator();
            showError(`Error: ${error.message}`);
            console.error('Convai API error:', error);
        } finally {
            setUiState(false);
            elements.questionInput.focus();
        }
    }

    /**
     * Append message to chat window
     */
    function appendMessage(text, sender = 'bot', audioData = null, sampleRate = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const p = document.createElement('p');
        p.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
        messageDiv.appendChild(p);

        elements.chatWindow.appendChild(messageDiv);
        scrollToBottom();

        // Handle audio if provided (bot messages only)
        if (sender === 'bot' && audioData && config.enableVoice) {
            playBackgroundAudio(audioData, sampleRate);
        }

        return messageDiv;
    }

    /**
     * Play audio in background (no UI controls)
     */
    function playBackgroundAudio(audioData, sampleRate) {
        try {
            // Decode base64 WAV data
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Create blob and audio element
            const blob = new Blob([bytes], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);

            // Configure audio
            audio.volume = 0.8;
            audio.preload = 'auto';

            // Play audio automatically
            audio.play().catch(error => {
                // Silently fail if auto-play is blocked
                log('Auto-play blocked or failed:', error.message);
            });

            // Clean up blob URL after audio ends
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            });

            // Also clean up on error
            audio.addEventListener('error', () => {
                URL.revokeObjectURL(audioUrl);
            });

            log(`Playing audio (${sampleRate}Hz)`);

        } catch (error) {
            // Silently fail - user still sees text response
            log('Audio playback error:', error);
        }
    }

    /**
     * Show typing indicator
     */
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message bot typing-indicator';
        indicator.id = 'convai-typing-indicator';
        indicator.innerHTML = '<p>Assistant is typing...</p>';
        elements.chatWindow.appendChild(indicator);
        scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    function hideTypingIndicator() {
        const indicator = document.getElementById('convai-typing-indicator');
        if (indicator) {
            indicator.remove();
        }
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

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    /**
     * Set UI loading state
     */
    function setUiState(isLoading) {
        state.isProcessing = isLoading;
        elements.questionInput.disabled = isLoading;
        elements.submitBtn.disabled = isLoading;
        elements.questionInput.placeholder = isLoading
            ? 'Assistant is typing...'
            : 'Type your message...';
    }

    /**
     * Auto-resize textarea
     */
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = newHeight + 'px';
    }

    /**
     * Scroll chat window to bottom
     */
    function scrollToBottom() {
        if (elements.chatWindow) {
            elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
        }
    }

    /**
     * Escape HTML to prevent injection
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Debug logging
     */
    function log(...args) {
        if (config.debugMode) {
            console.log(`[Convai-${config.serviceName}]`, ...args);
        }
    }

    // Public API (optional - for external control)
    window.ConvaiChat = window.ConvaiChat || {};

    // Wait for initialization before setting up public API
    setTimeout(() => {
        if (config.serviceName) {
            window.ConvaiChat[config.serviceName] = {
                sendMessage: function(message) {
                    if (elements.questionInput && message) {
                        elements.questionInput.value = message;
                        handleSubmit();
                    }
                },
                clearSession: function() {
                    state.sessionId = '-1';
                    localStorage.removeItem(sessionStorageKey);
                    elements.chatWindow.innerHTML = '';
                    displayWelcomeMessage();
                },
                getSessionId: function() {
                    return state.sessionId;
                },
                setDebugMode: function(enabled) {
                    config.debugMode = enabled;
                }
            };
        }
    }, 100);

    // Initialize when ready
    initialize();

})();