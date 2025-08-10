// chatbot/static/main.js

document.addEventListener("DOMContentLoaded", () => {
    const chatWindow = document.getElementById("chat-window");
    const questionInput = document.getElementById("question");
    const submitBtn = document.getElementById("submit-btn");

    let currentSessionId = null;
    let currentStepId = null; // Tracks our place in the screening flow
    let isQnAMode = false;   // Controls which API endpoint to call

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
        // Use a regex to safely handle HTML and convert newlines
        p.innerHTML = text
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, '<br>');
        messageDiv.appendChild(p);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return messageDiv;
    }

    // --- Core Application Logic ---

    function renderStep(step) {
        const { step_id, message, options } = step;
        currentStepId = step_id;
        const messageDiv = appendMessage(message, "bot");

        if (options) {
            const optionsContainer = document.createElement("div");
            optionsContainer.className = "message-options";

            for (const [key, value] of Object.entries(options)) {
                const button = document.createElement("button");
                button.className = "option-btn";
                button.textContent = value;
                button.addEventListener("click", () => {
                    handleScreeningResponse(key);
                    optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
                        btn.disabled = true;
                        if (btn === button) btn.classList.add('selected');
                    });
                });
                optionsContainer.appendChild(button);
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

    async function handleScreeningResponse(response) {
        // Add the user's response to the chat window if it's text input
        if (typeof response === 'string') {
            appendMessage(response, "user");
        }
        setUiLoading(true);
        try {
            const res = await fetch('/api/screening/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: currentSessionId,
                    step_id: currentStepId,
                    response: response,
                }),
            });
            const data = await res.json();

            if (data.transition_to === 'qna') {
                enterQnAMode(data.message);
            } else if (data.next_step) {
                renderStep(data.next_step);
            }
        } catch (error) {
            console.error("Screening flow error:", error);
            appendMessage("I'm sorry, I encountered an error. Please try refreshing.", "bot");
        }
    }

    function enterQnAMode(confirmationMessage) {
        isQnAMode = true;
        appendMessage(confirmationMessage, "bot");
        questionInput.style.display = 'block';
        submitBtn.style.display = 'block';
        setUiLoading(false);
        questionInput.focus();
    }

    function handleQnAResponse(question) {
        appendMessage(question, "user");
        setUiLoading(true);
        const botMessageDiv = appendMessage("...", "bot");
        const botParagraph = botMessageDiv.querySelector("p");
        botParagraph.textContent = "";

        const eventSource = new EventSource(`/api/qna/query?question=${encodeURIComponent(question)}&session_id=${currentSessionId}`);

        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'token':
                    // If this is the first token, clear the "..."
                    if (botParagraph.textContent === "...") {
                        botParagraph.textContent = "";
                    }
                    botParagraph.innerHTML += data.content.replace(/\n/g, '<br>');
                    break;

                case 'answer':
                    // This handles pre-canned responses, like from guardrails
                    botParagraph.innerHTML = data.content.replace(/\n/g, '<br>');
                    break;

                case 'sources':
                    // This can be expanded later to show formatted source documents
                    console.log("Received sources:", data.content);
                    break;

                case 'end':
                    eventSource.close();
                    setUiLoading(false);
                    questionInput.focus();
                    break;

                case 'error':
                    botParagraph.textContent = data.content;
                    botParagraph.classList.add('error-message');
                    eventSource.close();
                    setUiLoading(false);
                    break;
            }
        };

        eventSource.onerror = function(err) {
            console.error("EventSource failed:", err);
            botParagraph.textContent = "Sorry, I encountered an error. Please check the server connection and try again.";
            eventSource.close();
            setUiLoading(false);
        };
    }

    async function initializeChat() {
        setUiLoading(true);
        try {
            const response = await fetch('/api/init');
            const data = await response.json();
            currentSessionId = data.session_id;
            if (data.next_step) {
                renderStep(data.next_step);
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            appendMessage("Sorry, I couldn't start our conversation. Please refresh the page.", "bot");
        }
    }

    // --- Event Listeners ---
    submitBtn.addEventListener("click", () => {
        const question = questionInput.value.trim();
        if (!question) return;

        if (isQnAMode) {
            handleQnAResponse(question);
        } else {
            // This is a text response in the screening flow
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
