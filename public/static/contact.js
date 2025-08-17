document.addEventListener('DOMContentLoaded', () => {
  // Check if Firebase is initialized
  if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Ensure you have included the Firebase scripts in your HTML.");
    return;
  }

  // Initialize Firebase Functions
  const functions = firebase.functions();
  const form = document.getElementById('contact-form');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent default form submission

    // Disable button to prevent multiple submissions
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    // Get a reference to our Cloud Function
    const sendContactEmail = functions.httpsCallable('sendContactEmail');

    // Create a data object from the form fields
    const formData = {
      first_name: form.first_name.value,
      last_name: form.last_name.value,
      email: form.email.value,
      message: form.message.value,
    };

    // Call the function with the form data
    sendContactEmail(formData)
      .then((result) => {
        console.log(result.data.message);
        displayToast('Message sent successfully!', 'success');
        form.reset();
      })
      .catch((error) => {
        console.error('Error sending message:', error);
        displayToast(`Error: ${error.message}`, 'error');
      })
      .finally(() => {
        // Re-enable the button after the process is complete
        submitButton.disabled = false;
        submitButton.textContent = 'Send';
      });
  });

  /**
   * Helper function to display a toast message for user feedback.
   * @param {string} message The message to display.
   * @param {string} type 'success' or 'error' for styling.
   */
  function displayToast(message, type = 'success') {
    // Remove any existing toast
    const oldToast = document.getElementById('toast-message');
    if (oldToast) oldToast.remove();

    // Create the toast element
    const toast = document.createElement('div');
    toast.id = 'toast-message';
    toast.textContent = message;

    // Style for error messages
    if (type === 'error') {
      toast.style.backgroundColor = '#f8d7da'; // Light red
      toast.style.color = '#721c24'; // Dark red
    }

    document.body.appendChild(toast);

    // Animate fade out and remove after a few seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      // Remove the element from the DOM after the transition ends
      setTimeout(() => toast.remove(), 1000);
    }, 4000);
  }
});
