const isDemoChatbot = document.body.classList.contains('office-chatbot') ||
                      document.body.classList.contains('fireside-chatbot');

// Get session ID from URL parameters
function getSessionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session_id');
}

// Demo chatbot initialization
if (isDemoChatbot) {
    // Get session ID from URL or generate a new one
    let sessionId = getSessionIdFromUrl();
    if (!sessionId) {
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

    // Initialize counter from localStorage
    questionCount = parseInt(localStorage.getItem(storageKey) || '0');

    // Initialize demo chatbot functionality
    function initializeDemoChatbot() {
        const counterElement = document.getElementById('question-counter');
        const countDisplay = document.getElementById('question-count');
        const redirectNotice = document.getElementById('redirect-notice');
        const countdownElement = document.getElementById('countdown');

        // Update Counter Display
        function updateQuestionCounter() {
            console.log('Updating counter display:', questionCount);
            if (countDisplay) {
                countDisplay.textContent = questionCount;

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
                appendWarningMessage(`You have only 1 question remaining in this demo!`);
            }
        }

        // Initial counter update
        updateQuestionCounter();

        // Return Button Handler
        const returnButton = document.getElementById('return-main-btn');
        if (returnButton) {
            returnButton.addEventListener('click', (e) => {
                e.preventDefault();
                document.body.classList.add('transitioning-out');
                localStorage.removeItem(storageKey);
                setTimeout(() => {
                    window.location.href = '/chatbot.html';
                }, 300);
            });
        }

        // Monitor for new messages being added to chat
        function monitorChatMessages() {
            const chatWindow = document.getElementById('convai-chat-window');
            if (!chatWindow) {
                console.error('Chat window not found');
                return;
            }

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        // Check if a user message was added
                        if (node.nodeType === 1 && node.classList && node.classList.contains('message')) {
                            if (node.classList.contains('user')) {
                                console.log('User message detected');
                                
                                // Check if we've hit the limit
                                if (questionCount >= MAX_QUESTIONS) {
                                    handleLimitReached();
                                    return;
                                }
                                
                                // Increment counter
                                questionCount++;
                                localStorage.setItem(storageKey, questionCount.toString());
                                updateQuestionCounter();
                                console.log('Question count incremented to:', questionCount);
                                
                                if (questionCount >= MAX_QUESTIONS) {
                                    setTimeout(() => {
                                        handleLimitReached();
                                    }, 3000);
                                }
                            }
                        }
                    });
                });
            });

            // Start observing the chat window
            observer.observe(chatWindow, { 
                childList: true, 
                subtree: true 
            });
            
            console.log('Chat message observer started');
        }

        // Monitor the submit button click
        function monitorSubmitButton() {
            const submitBtn = document.getElementById('convai-submit');
            const inputField = document.getElementById('convai-input');
            
            if (submitBtn && inputField) {
                // Create a new click handler
                submitBtn.addEventListener('click', function(e) {
                    const message = inputField.value.trim();
                    
                    if (message) {
                        // Check limit BEFORE submission
                        if (questionCount >= MAX_QUESTIONS) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLimitReached();
                            return false;
                        }
                        
                        
                    }
                }, true); 
                
                inputField.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        const message = this.value.trim();
                        if (message && questionCount >= MAX_QUESTIONS) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLimitReached();
                        }
                    }
                }, true);
                
                console.log('Submit button monitor added');
            }
        }

        // Handle Limit Reached
        function handleLimitReached() {
            console.log('Limit reached, disabling chat');
            const submitBtn = document.getElementById('convai-submit');
            const questionInput = document.getElementById('convai-input');

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
                        localStorage.removeItem(storageKey);
                        document.body.classList.add('transitioning-out');
                        setTimeout(() => {
                            window.location.href = '/chatbot.html';
                        }, 300);
                    }
                }, 1000);
            } else {
                // Fallback
                setTimeout(() => {
                    localStorage.removeItem(storageKey);
                    window.location.href = '/chatbot.html';
                }, 2000);
            }
        }

        // Warning Message to Chat
        function appendWarningMessage(text) {
            const chatWindow = document.getElementById('convai-chat-window');

            if (chatWindow) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'message system-warning';
                warningDiv.textContent = text;
                chatWindow.appendChild(warningDiv);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }

        // Welcome Message
        if (questionCount === 0) {
            setTimeout(() => {
                const chatWindow = document.getElementById('convai-chat-window');
                              
                if (chatWindow && chatWindow.children.length === 0) {
                    const welcomeMessage = document.createElement('div');
                    welcomeMessage.className = 'message bot';
                    const p = document.createElement('p');

                    if (chatbotType === 'office') {
                        p.innerHTML = "Welcome to the Office Assistant Demo! <br><br>I'm here to help you with workplace queries. You have 10 questions to explore my capabilities. What would you like to know?";
                    } else if (chatbotType === 'fireside') {
                        p.innerHTML = "Welcome to the Fireside Chat Demo! <br><br>Let's have a cozy conversation. You have 10 questions to explore this demo. What's on your mind?";
                    }

                    welcomeMessage.appendChild(p);
                    chatWindow.appendChild(welcomeMessage);
                }
            }, 500);
        }

        // Initialize monitoring
        setTimeout(() => {
            monitorChatMessages();
            monitorSubmitButton();
        }, 1000); 
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDemoChatbot);
    } else {
        setTimeout(initializeDemoChatbot, 100);
    }

} else if (document.body.classList.contains('avatar-page')) {
    // Main chatbot page - clear stored counts
    localStorage.removeItem('office_question_count');
    localStorage.removeItem('fireside_question_count');
}

// Smooth Page Transitions
window.addEventListener('pageshow', (event) => {
    document.body.classList.remove('transitioning-out');
});