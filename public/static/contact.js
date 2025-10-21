emailjs.init("5z-78OVgFo-g2RPNW");  

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    emailjs.sendForm('service_r2vw4rg', 'template_pw9w007', form)
      .then(() => {
        // Remove old success message if any
        const oldMsg = document.getElementById('success-message');
        if (oldMsg) oldMsg.remove();

        // Create new toast
        const msg = document.createElement('div');
        msg.id = 'success-message';
        msg.textContent = 'Message sent successfully!';
        document.body.appendChild(msg);

        // Fade out after 3 seconds
        setTimeout(() => {
          msg.style.opacity = '0';
          setTimeout(() => msg.remove(), 1000); 
        }, 3000);

        form.reset();
      })
      .catch((error) => {
        const oldMsg = document.getElementById('success-message');
        if (oldMsg) oldMsg.remove();

        // Create error toast
        const msg = document.createElement('div');
        msg.id = 'success-message';
        msg.style.backgroundColor = '#f8d7da'; 
        msg.style.color = '#721c24'; 
        msg.textContent = 'Failed to send message: ' + error.text;

        document.body.appendChild(msg);

        setTimeout(() => {
          msg.style.opacity = '0';
          setTimeout(() => msg.remove(), 1000);
        }, 4000);
      });
  });
});