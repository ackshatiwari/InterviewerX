// Intersection Observer to detect when section is visible
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
      animateCounters();
      entry.target.classList.add('animated');
    }
  });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
observer.observe(statsSection);

function animateCounters() {
  const numbers = document.querySelectorAll('.stat-number');
  
  numbers.forEach((element) => {
    const target = parseInt(element.dataset.target);
    let current = 0;
    const increment = target / 50;  // animate over ~50 steps
    
    const counter = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target;
        clearInterval(counter);
      } else {
        element.textContent = Math.floor(current);
      }
    }, 30);  // 30ms per step = ~1.5 second animation
  });
}
// Animate .not-button elements on scroll
const buttonObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.not-button').forEach((button) => {
  buttonObserver.observe(button);
});

