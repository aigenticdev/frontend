(async function() {
    const sessionKey = 'aigentic_session_id';
    const chatContainer = document.querySelector('.convai-container');
    let appSessionId = localStorage.getItem(sessionKey);

    // If no session ID is found, create a new one
    if (!appSessionId) {
        console.log('No session ID found in localStorage. Initializing a new one.');
        try {
            const response = await fetch('/api/session/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: null })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            appSessionId = data.session_id;
            localStorage.setItem(sessionKey, appSessionId);
            console.log('New session created and saved:', appSessionId);
        } catch (error) {
            console.error('Failed to initialize a new session:', error);
            if (chatContainer) chatContainer.style.display = 'none';
            return; // Stop execution if session creation fails
        }
    }

    // Set the data attribute for the chat script to use
    if (appSessionId && chatContainer) {
        chatContainer.setAttribute('data-app-session-id', appSessionId);
    } else {
        console.error('Could not find session ID or chat container.');
        if (chatContainer) chatContainer.style.display = 'none';
    }
})();