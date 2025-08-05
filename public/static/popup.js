document.addEventListener('DOMContentLoaded', () => {
  // Create popup element
  const popup = document.createElement('div');
  popup.id = 'chatbot-popup';
  popup.className = 'popup-overlay';
  popup.innerHTML = `
    <div class="popup-content" role="dialog" aria-modal="true" aria-labelledby="popup-title">
      <h2 id="popup-title">Try Our AI Chatbot!</h2>
      <p>Need help? Chat instantly with our AI assistant.</p>
      <button id="popup-try-btn" aria-label="Go to Chatbot page">Try Now</button>
      <button id="popup-close-btn" aria-label="Close popup" style="margin-left: 10px; background: #ccc; color:#333;">No Thanks</button>
    </div>
  `;

  document.body.appendChild(popup);

  // Button to go to chatbot page
  document.getElementById('popup-try-btn').addEventListener('click', () => {
    window.location.href = '/chatbot.html'; // Change this if your chatbot URL is different
  });

  // Button to close popup
  document.getElementById('popup-close-btn').addEventListener('click', () => {
    popup.style.display = 'none';
  });

  // Show popup after 3 seconds
  setTimeout(() => {
    popup.style.display = 'flex';
  }, 3000);
});
