document.addEventListener('DOMContentLoaded', function () {
    // --- 1. Cache DOM Elements ---
    const navToggle = document.querySelector('.nav-toggle');
    const navUl = document.querySelector('nav ul');
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('.main-section');
    const loadingSpinnerContainer = document.getElementById('loading-spinner-container');
    const highlight = document.querySelector('.highlight');
    const contactForm = document.querySelector('.contact-form');
    const fireworksContainer = document.getElementById('fireworks-container');
    const worksList = document.querySelector('#projects .works-list');
    const colorPicker = document.getElementById('accent-color-picker');

    // --- 2. Loading Spinner ---
    if (loadingSpinnerContainer) {
        window.addEventListener('load', () => {
            loadingSpinnerContainer.style.opacity = '0';
            // After the transition, hide the spinner so it doesn't block the page.
            setTimeout(() => {
                loadingSpinnerContainer.style.display = 'none';
            }, 500); // This duration should match the CSS transition time.
        });
    }

    // --- 3. Mobile Navigation ---
    if (navToggle && navUl) {
        navToggle.addEventListener('click', function () {
            navUl.classList.toggle('open');
        });
    }

    // --- 4. Smooth Scrolling Navigation ---
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 70, // Offset for fixed header
                    behavior: 'smooth'
                });
            }

            // Close mobile nav after click
            if (navUl && navUl.classList.contains('open')) {
                navUl.classList.remove('open');
            }
        });
    });

    // --- 5. Active Link Highlighting on Scroll ---
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = `#${entry.target.id}`;
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === activeId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(section => navObserver.observe(section));

    // --- NEW: Fade-in & Fade-out Animation on Scroll ---
    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, {
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the section is visible
    });

    sections.forEach(section => fadeObserver.observe(section));

    // --- 6. Scramble Animation for Name ---
    if (highlight) {
        const originalText = highlight.textContent;
        const chars = 'MELVINmelvin';

        const scramble = () => {
            let frame = 0;
            const totalFrames = 30;
            const interval = setInterval(() => {
                highlight.textContent = originalText
                    .split('')
                    .map((char, index) => {
                        if (frame / totalFrames > Math.random() || char === ' ') {
                            return originalText[index];
                        }
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('');

                if (frame >= totalFrames) {
                    clearInterval(interval);
                    highlight.textContent = originalText;
                }
                frame++;
            }, 50);
        };

        highlight.addEventListener('mouseenter', scramble);
        highlight.addEventListener('focus', scramble);
    }

    // --- 7. Fireworks on Contact Form Submit ---
    if (contactForm && fireworksContainer) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            fireworksContainer.style.display = 'block';
            fireworksContainer.innerHTML = `<div class="fireworks-message">🎉 Thank you! I'll be in touch soon. 🎉</div>`;
            
            // You can add a real form submission here (e.g., using fetch to an endpoint)
            
            contactForm.reset();
            setTimeout(() => {
                fireworksContainer.style.display = 'none';
                fireworksContainer.innerHTML = '';
            }, 4000);
        });
    }

    // --- 8. Dynamic Project Loading ---
    if (worksList && typeof worksData !== 'undefined') {
        worksList.innerHTML = ''; // Clear static content
        worksData.forEach(work => {
            const workItem = document.createElement('div');
            workItem.className = 'work-item';

            let techList = '';
            if (work.technologies && work.technologies.length > 0) {
                techList = `<ul>${work.technologies.map(tech => `<li>${tech}</li>`).join('')}</ul>`;
            }

            workItem.innerHTML = `
                <h3>${work.title}</h3>
                <p>${work.description}</p>
                ${techList}
            `;
            worksList.appendChild(workItem);
        });
    }

    // --- 9. Custom Cursor ---
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
        const cursorDot = document.createElement('div');
        cursorDot.className = 'cursor-dot';
        document.body.appendChild(cursorDot);

        window.addEventListener('mousemove', (e) => {
            requestAnimationFrame(() => {
                cursorDot.style.left = `${e.clientX}px`;
                cursorDot.style.top = `${e.clientY}px`;
            });
        });
    }

    // --- 10. Accent Color Picker ---
    if (colorPicker) {
        const savedAccent = localStorage.getItem('mainAccent');
        if (savedAccent) {
            document.documentElement.style.setProperty('--main-accent', savedAccent);
            colorPicker.value = savedAccent;
        }

        colorPicker.addEventListener('input', function () {
            document.documentElement.style.setProperty('--main-accent', this.value);
            localStorage.setItem('mainAccent', this.value);
        });
    }
});