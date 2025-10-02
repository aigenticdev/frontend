// ============================================
// DEMO CHATBOT ENHANCEMENTS
// Complete demo-chatbot.js file with all fixes
// ============================================

// Check if we're on a demo chatbot page
const isDemoChatbot = document.body.classList.contains('office-chatbot') ||
                      document.body.classList.contains('fireside-chatbot');

// Get session ID from URL parameters
function getSessionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session_id');
}

// Set session ID IMMEDIATELY for demo chatbots (before convai-chat.js loads)
if (isDemoChatbot) {
    // Get session ID from URL or generate a new one
    let sessionId = getSessionIdFromUrl();
    if (!sessionId) {
        // Generate a new session ID if not provided
        sessionId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Set the session ID in the HTML before convai-chat.js initializes
    const convaiContainer = document.querySelector('.convai-container');
    if (convaiContainer) {
        convaiContainer.dataset.appSessionId = sessionId;
        console.log('Session ID set for demo chatbot:', sessionId);
    }

    // --- Question Counter Management ---
    let questionCount = 0;
    const MAX_QUESTIONS = 10;
    const WARNING_THRESHOLD = 7;
    const CRITICAL_THRESHOLD = 9;

    // Determine which chatbot we're on and set storage key
    const chatbotType = document.body.classList.contains('office-chatbot') ? 'office' : 'fireside';
    const storageKey = chatbotType + '_question_count';

    // Initialize counter from localStorage (to persist across refreshes)
    questionCount = parseInt(localStorage.getItem(storageKey) || '0');

    // Wait for DOM to be ready before initializing
    function initializeDemoChatbot() {
        // Get counter elements
        const counterElement = document.getElementById('question-counter');
        const countDisplay = document.getElementById('question-count');
        const redirectNotice = document.getElementById('redirect-notice');
        const countdownElement = document.getElementById('countdown');

        // Check which chat system is being used
        const isConvaiSystem = document.getElementById('convai-submit') !== null;

        // --- Update Counter Display ---
        function updateQuestionCounter() {
            if (countDisplay) {
                countDisplay.textContent = questionCount;

                // Update counter styling based on count
                if (counterElement) {
                    counterElement.classList.remove('warning', 'critical');

                    if (questionCount >= CRITICAL_THRESHOLD) {
                        counterElement.classList.add('critical');
                    } else if (questionCount >= WARNING_THRESHOLD) {
                        counterElement.classList.add('warning');
                    }
                }
            }

            // Add warning message in chat when approaching limit
            if (questionCount === WARNING_THRESHOLD) {
                appendWarningMessage(`You have ${MAX_QUESTIONS - questionCount} questions remaining in this demo.`);
            } else if (questionCount === CRITICAL_THRESHOLD) {
                appendWarningMessage(`⚠️ You have only 1 question remaining in this demo!`);
            }
        }

        // Initial counter update
        updateQuestionCounter();

        // --- Return Button Handler ---
        const returnButton = document.getElementById('return-main-btn');
        if (returnButton) {
            returnButton.addEventListener('click', (e) => {
                e.preventDefault();
                // Add transition effect
                document.body.classList.add('transitioning-out');
                // Reset question count for this demo
                localStorage.removeItem(storageKey);
                // Navigate after animation
                setTimeout(() => {
                    window.location.href = '/chatbot.html';
                }, 300);
            });
        }

        // --- Setup Submit Handler for Question Counting ---
        function setupSubmitHandler() {
            const submitBtn = isConvaiSystem ?
                              document.getElementById('convai-submit') :
                              document.getElementById('submit-btn');
            const questionInput = isConvaiSystem ?
                                  document.getElementById('convai-input') :
                                  document.getElementById('question');

            if (submitBtn && questionInput) {
                // Clone button to remove any existing handlers
                const newSubmitBtn = submitBtn.cloneNode(true);
                submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

                // Add click handler
                newSubmitBtn.addEventListener('click', function(e) {
                    const question = questionInput.value.trim();
                    if (!question) return;

                    // Check if we've reached the limit BEFORE processing
                    if (questionCount >= MAX_QUESTIONS) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        handleLimitReached();
                        return;
                    }

                    // Increment question count immediately
                    questionCount++;
                    localStorage.setItem(storageKey, questionCount.toString());
                    updateQuestionCounter();
                    console.log('Question submitted. New count:', questionCount);
                }, true);

                // Also handle Enter key
                questionInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        newSubmitBtn.click();
                    }
                });
            }
        }

        // --- Handle Limit Reached ---
        function handleLimitReached() {
            // Disable input based on which system is being used
            const submitBtn = isConvaiSystem ?
                              document.getElementById('convai-submit') :
                              document.getElementById('submit-btn');
            const questionInput = isConvaiSystem ?
                                  document.getElementById('convai-input') :
                                  document.getElementById('question');

            if (questionInput) {
                questionInput.disabled = true;
                questionInput.placeholder = "Demo limit reached - redirecting...";
            }
            if (submitBtn) {
                submitBtn.disabled = true;
            }

            // Show redirect notice
            if (redirectNotice) {
                redirectNotice.classList.add('show');

                // Start countdown
                let countdown = 3;
                if (countdownElement) {
                    countdownElement.textContent = countdown;
                }

                const countdownInterval = setInterval(() => {
                    countdown--;
                    if (countdownElement) {
                        countdownElement.textContent = countdown;
                    }

                    if (countdown <= 0) {
                        clearInterval(countdownInterval);
                        // Reset question count
                        localStorage.removeItem(storageKey);
                        // Add transition
                        document.body.classList.add('transitioning-out');
                        // Redirect to main chatbot
                        setTimeout(() => {
                            window.location.href = '/chatbot.html';
                        }, 300);
                    }
                }, 1000);
            } else {
                // Fallback if modal doesn't exist
                setTimeout(() => {
                    localStorage.removeItem(storageKey);
                    window.location.href = '/chatbot.html';
                }, 2000);
            }
        }

        // --- Helper: Add Warning Message to Chat ---
        function appendWarningMessage(text) {
            // Handle both Convai and main.js chat windows
            const chatWindow = isConvaiSystem ?
                              document.getElementById('convai-chat-window') :
                              document.getElementById('chat-window');

            if (chatWindow) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'message system-warning';
                warningDiv.style.cssText = `
                    background: linear-gradient(135deg, rgba(212, 165, 116, 0.15) 0%, rgba(198, 123, 78, 0.1) 100%);
                    border: 1px solid rgba(212, 165, 116, 0.4);
                    color: #8b7765;
                    align-self: center;
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.9rem;
                    max-width: 70%;
                    margin: 10px 0;
                    padding: 12px 16px;
                    border-radius: 18px;
                `;

                warningDiv.textContent = text;
                chatWindow.appendChild(warningDiv);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }

        // --- Add Welcome Message for Demo Chatbots ---
        if (questionCount === 0) {
            const chatWindow = isConvaiSystem ?
                              document.getElementById('convai-chat-window') :
                              document.getElementById('chat-window');
                              
            if (chatWindow && chatWindow.children.length === 0) {
                const welcomeMessage = document.createElement('div');
                welcomeMessage.className = 'message bot';
                const p = document.createElement('p');

                if (chatbotType === 'office') {
                    p.innerHTML = "Welcome to the Office Assistant Demo! 🏢<br><br>I'm here to help you with workplace queries. You have 10 questions to explore my capabilities. What would you like to know?";
                } else if (chatbotType === 'fireside') {
                    p.innerHTML = "Welcome to the Fireside Chat Demo! 🔥<br><br>Let's have a cozy conversation. You have 10 questions to explore this demo. What's on your mind?";
                }

                welcomeMessage.appendChild(p);
                chatWindow.appendChild(welcomeMessage);
            }
        }

        // Setup submit handler
        setupSubmitHandler();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDemoChatbot);
    } else {
        // DOM is already loaded, wait a bit for elements to render
        setTimeout(initializeDemoChatbot, 100);
    }

    // --- Add "Try Demo" Links Handler for Main Chatbot ---
} else if (document.body.classList.contains('avatar-page')) {
    // We're on the main chatbot page

    // Monitor chat for demo recommendations
    const chatObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.classList && node.classList.contains('message')) {
                    // Check for links in bot messages
                    const links = node.querySelectorAll('a[href*="office_chatbot"], a[href*="fireside_chatbot"]');
                    links.forEach(link => {
                        link.classList.add('demo-link');
                        // Add smooth transition
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            document.body.classList.add('transitioning-out');
                            setTimeout(() => {
                                window.location.href = link.href;
                            }, 300);
                        });
                    });
                }
            });
        });
    });

    // Start observing chat window
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatObserver.observe(chatWindow, { childList: true, subtree: true });
    }

    // Clear any stored question counts when on main chatbot
    localStorage.removeItem('office_question_count');
    localStorage.removeItem('fireside_question_count');
}

// --- Smooth Page Transitions ---
window.addEventListener('pageshow', (event) => {
    // Remove transition class if user navigates back
    document.body.classList.remove('transitioning-out');
});