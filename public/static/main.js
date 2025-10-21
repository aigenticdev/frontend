document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const chatWindow = document.getElementById("chat-window");
    const questionInput = document.getElementById("question");
    const submitBtn = document.getElementById("submit-btn");
    const gameModal = document.getElementById('game-modal');
    const gameIframe = document.getElementById('game-iframe');
    const closeGameBtn = document.getElementById('close-game-btn');

    // --- Application State ---
    let currentSessionId = null;
    let currentStepId = null;
    let isQnAMode = false;
    let qnaServiceUrl = null;

    // --- UI Helper Functions ---
    function setUiLoading(isLoading) {
        questionInput.disabled = isLoading;
        submitBtn.disabled = isLoading;
        questionInput.placeholder = isLoading ? "Claudia is typing..." : "Type your message...";
    }

    function appendMessage(text, sender = "bot") {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", sender);
        const p = document.createElement("p");
        p.innerHTML = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
        messageDiv.appendChild(p);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return messageDiv;
    }

    // --- Core Application Logic ---

    function renderStep(step) {
        currentStepId = step.step_id;
        const messageDiv = appendMessage(step.message || "", "bot");

        // Render special action buttons (e.g., for scheduling links)
        if (step.action && step.action.type === 'DISPLAY_LINK_BUTTON') {
            const actionButton = document.createElement("button");
            actionButton.className = "option-btn action-btn"; 
            actionButton.textContent = step.action.button_text;
            actionButton.onclick = () => {
                window.open(step.action.url, '_blank');
            };
            messageDiv.appendChild(actionButton);
        }

        if (step.options) {
            const optionsContainer = document.createElement("div");
            optionsContainer.className = "message-options";

            // Check if this is a multiple-choice question
            if (step.multiple_choice) {
                // Render checkboxes
                for (const [key, value] of Object.entries(step.options)) {
                    const checkboxWrapper = document.createElement("div");
                    checkboxWrapper.className = "checkbox-wrapper";
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.id = key;
                    checkbox.value = key;
                    checkbox.className = "option-checkbox";

                    const label = document.createElement("label");
                    label.htmlFor = key;
                    label.textContent = value;

                    checkboxWrapper.appendChild(checkbox);
                    checkboxWrapper.appendChild(label);
                    optionsContainer.appendChild(checkboxWrapper);
                }

                // Add a single continue button
                const continueBtn = document.createElement("button");
                continueBtn.className = "option-btn";
                continueBtn.textContent = "Continue";
                continueBtn.onclick = () => {
                    const selectedKeys = [];
                    optionsContainer.querySelectorAll('.option-checkbox:checked').forEach(checkbox => {
                        selectedKeys.push(checkbox.value);
                    });
                    // Ensure at least one option is selected if needed, or handle empty selection
                    if (selectedKeys.length > 0) {
                        handleScreeningResponse(selectedKeys);
                        continueBtn.disabled = true;
                    }
                };
                optionsContainer.appendChild(continueBtn);

            } else {
                // Render standard single-choice buttons
                for (const [key, value] of Object.entries(step.options)) {
                    const button = document.createElement("button");
                    button.className = "option-btn";
                    button.textContent = value;
                    button.onclick = () => {
                        handleScreeningResponse(key);
                        optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
                            btn.disabled = true;
                            if (btn === button) btn.classList.add('selected');
                        });
                    };
                    optionsContainer.appendChild(button);
                }
            }

            messageDiv.appendChild(optionsContainer);
            questionInput.style.display = 'none';
            submitBtn.style.display = 'none';
        } else {
            questionInput.style.display = 'block';
            submitBtn.style.display = 'block';
            setUiLoading(false);
            questionInput.focus();
        }
    }

    function handleOpenGameModal() {
        console.log("Opening game modal...");
        gameIframe.src = "static/game/index.html"; 
        gameModal.style.display = 'flex';

        function closeGame() {
            console.log("Game finished. Closing modal and continuing conversation.");
            gameModal.style.display = 'none';
            gameIframe.src = ""; 
            window.removeEventListener("message", messageHandler);
        }

        closeGameBtn.onclick = closeGame;

        function messageHandler(event) {
            if (event.data === "game_completed") {
                closeGame();
            }
        }
        window.addEventListener("message", messageHandler);
    }

    async function handleScreeningResponse(responseKey) {
        if (typeof responseKey === 'string') {
            appendMessage(responseKey, "user"); 
        }
        setUiLoading(true);

        try {
            const res = await fetch('/api/screening/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: currentSessionId,
                    step_id: currentStepId,
                    response: responseKey,
                }),
            });
            const data = await res.json();

            if (data.session_id) {
                currentSessionId = data.session_id;
                localStorage.setItem('aigentic_session_id', currentSessionId);
            }

            if (data.action && data.action.type === 'REDIRECT') {
                window.location.href = data.action.url;
                return; 
            }

            if (data.transition_to === 'qna') {
                enterQnAMode(data);
            } else if (data.next_step) {
                renderStep(data.next_step);
            }
        } catch (error) {
            console.error("Screening flow error:", error);
            appendMessage("I'm sorry, I encountered an error. Please try refreshing.", "bot");
        }
    }

    function enterQnAMode(data) {
        isQnAMode = true;
        qnaServiceUrl = data.qna_service_url;
        appendMessage(data.message, "bot");
        questionInput.style.display = 'block';
        submitBtn.style.display = 'block';
        setUiLoading(false);
        questionInput.focus();
    }

    function handleQnAResponse(question) {
        if (!qnaServiceUrl) {
            console.error("Q&A service URL is not set.");
            appendMessage("I'm sorry, there is a configuration error. Please contact support.", "bot");
            return;
        }

        appendMessage(question, "user");
        setUiLoading(true);
        const botMessageDiv = appendMessage("", "bot");
        const botParagraph = botMessageDiv.querySelector("p");

        const eventSource = new EventSource(`${qnaServiceUrl}/api/qna/query?question=${encodeURIComponent(question)}&session_id=${currentSessionId}`);

        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'token':
                    botParagraph.innerHTML += data.content.replace(/\n/g, '<br>');
                    break;
                case 'end':
                    eventSource.close();
                    setUiLoading(false);
                    questionInput.focus();
                    break;
                case 'error':
                    botParagraph.textContent = data.content;
                    eventSource.close();
                    setUiLoading(false);
                    break;
            }
        };

        eventSource.onerror = function(err) {
            console.error("EventSource failed:", err);
            botParagraph.textContent = "Sorry, an error occurred. Please try again.";
            eventSource.close();
            setUiLoading(false);
        };
    }

    async function initializeChat() {
        setUiLoading(true);
        let savedSessionId = localStorage.getItem('aigentic_session_id');
        let response;

        try {
            response = await fetch('/api/session/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: savedSessionId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            currentSessionId = data.session_id;
            localStorage.setItem('aigentic_session_id', currentSessionId);

            if (data.transition_to === 'qna') {
                enterQnAMode(data);
            } else if (data.next_step) {
                renderStep(data.next_step);
            }
        } catch (error) {
            console.error("Backend initialization failed:", error);
            if (response) {
                response.text().then(text => {
                    console.error("Raw response from server that caused error:", text);
                });
            }
        }
    }

    // --- Event Listeners ---
    submitBtn.addEventListener("click", () => {
        const question = questionInput.value.trim();
        if (!question) return;

        if (isQnAMode) {
            handleQnAResponse(question);
        } else {
            handleScreeningResponse(question);
        }
        questionInput.value = "";
    });

    questionInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitBtn.click();
        }
    });

    // --- Start the application ---
    initializeChat();
});