document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');

  // Toggle menu on click
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('active');

    // Set ARIA attribute for accessibility
    const isActive = nav.classList.contains('active');
    menuToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });

  // Close nav when any nav link is clicked
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (nav.classList.contains('active')) {
        nav.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Optional: Close nav if window is resized above mobile width
  window.addEventListener('resize', () => {
    if (window.innerWidth > 600 && nav.classList.contains('active')) {
      nav.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
});


window.addEventListener("scroll", function () {
  const navbar = document.querySelector("nav");
  if (window.scrollY > 50) {
    navbar.classList.add("shrink");
  } else {
    navbar.classList.remove("shrink");
  }
});


window.addEventListener("scroll", () => {
  const hero = document.querySelector(".hero");
  const scrollThreshold = 100;

  if (window.scrollY > scrollThreshold) {
    hero.classList.add("shrink");
  } else {
    hero.classList.remove("shrink");
  }
});


window.addEventListener('DOMContentLoaded', () => {
  const successMessage = document.getElementById('success-message');
  if (successMessage) {
    setTimeout(() => {
      successMessage.style.transition = 'opacity 1s ease';
      successMessage.style.opacity = '0';
      setTimeout(() => {
        successMessage.remove();
      }, 1000); // remove after fade out
    }, 3000); // wait 3 seconds before fading out
  }
});