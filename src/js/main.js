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
    const themeLightBtn = document.getElementById('theme-light');
    const themeDarkBtn = document.getElementById('theme-dark');
    const body = document.body;
    const jobTitle = document.querySelector('.job-title');

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

    // Function to populate about section
    function populateAboutSection() {
        const aboutSection = document.querySelector('.about-section .section-content');
        if (aboutSection && window.aboutData) {
            aboutSection.innerHTML = `<h2>${window.aboutData.title}</h2><p>${window.aboutData.content}</p>`;
        }
    }

    // Function to populate skills section
    function populateSkillsSection() {
        const skillsList = document.querySelector('.skills-list');
        if (skillsList && window.skillsData) {
            skillsList.innerHTML = window.skillsData.map(skill => `<li>${skill.name}</li>`).join('');
        }
    }
    populateAboutSection();
    populateSkillsSection();

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
                // If the home section is visible, start the full typing animation sequence
                if (entry.target.id === 'home' && jobTitle) {
                    // Prevent re-triggering if animation is already running
                    if (jobTitle.dataset.animating === 'true') return;
                    jobTitle.dataset.animating = 'true';

                    // 1. Initial typing
                    jobTitle.style.animation = 'typing 2s steps(20, end) forwards, blink-caret .75s step-end infinite';

                    // 2. Pause for 5 seconds, then delete
                    setTimeout(() => {
                        jobTitle.style.animation = 'deleting 2s steps(20, end) forwards, blink-caret .75s step-end infinite';
                    }, 7000); // 2s typing + 5s pause

                    // 3. Pause after deleting, then re-type to final state
                    setTimeout(() => {
                        jobTitle.style.animation = 'typing 2s steps(20, end) forwards, blink-caret .75s step-end infinite';
                        // Animation finished, allow it to be re-triggered if the user scrolls away and back
                        setTimeout(() => jobTitle.dataset.animating = 'false', 2000);
                    }, 9500); // 7s from start + 2s deleting + 0.5s pause
                }
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
            }, 100);
        };

        highlight.addEventListener('mouseenter', scramble);
        highlight.addEventListener('focus', scramble);
    }

    // --- 7. Fireworks on Contact Form Submit ---
    if (contactForm && fireworksContainer) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const submitButton = contactForm.querySelector('button[type="submit"]');

            // Change button state to "subscribed"
            submitButton.classList.add('subscribed');
            submitButton.textContent = 'Message Sent!';
            submitButton.disabled = true;

            // Show fireworks and message
            fireworksContainer.style.display = 'block';
            fireworksContainer.innerHTML = `<div class="fireworks-message">Thank you! I'll be in touch soon.</div>`;

            // You can add a real form submission here (e.g., using fetch to an endpoint)

            // Hide fireworks and reset form after a delay
            setTimeout(() => {
                fireworksContainer.style.display = 'none';
                fireworksContainer.innerHTML = '';
                contactForm.reset();
                submitButton.classList.remove('subscribed');
                submitButton.textContent = 'Send Message';
                submitButton.disabled = false;
            }, 4000);
        });
    }

    // --- 8. Dynamic Project Loading ---
    function renderWorks() {
        const worksSection = document.querySelector('#projects .works-list');
        if (!worksSection && document.querySelector('#projects')) {
            const sectionContent = document.querySelector('#projects .section-content') || document.querySelector('#projects');
            const worksList = document.createElement('div');
            worksList.className = 'works-list';
            sectionContent.appendChild(worksList);
        }
        const worksList = document.querySelector('#projects .works-list');
        if (!worksList) return;
        worksList.innerHTML = '';

        if (window.worksUnderMaintenance) {
            const card = document.createElement('div');
            card.className = 'work-item';
            card.innerHTML = `<h3>Works</h3><p style="color:#aaa;font-style:italic;">Still working on it / Coming soon...</p>`;
            worksList.appendChild(card);
            return;
        }

        if (window.worksData && Array.isArray(window.worksData)) {
            window.worksData.forEach(work => {
                const card = document.createElement('div');
                card.className = 'work-item';

                // Experience card design
                if (work.experience) {
                    card.innerHTML = `
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;">
                            <div class="work-item-header">
                                <span class="work-item-title">${work.title}</span><br>
                                <span class="work-item-company">
                                    <span style="font-family:'Georgia',serif;font-style:italic;">${work.company}</span>
                                </span>
                            </div>
                            <div class="work-item-period">
                                ${work.period || ""}
                            </div>
                        </div>
                        <ul>
                            ${Array.isArray(work.description) ? work.description.map(item => `<li>${item}</li>`).join('') : ""}
                        </ul>
                    `;
                } else if (work.active) {
                    card.innerHTML = `<h3>${work.title}</h3><p>${work.description}</p>`;
                } else {
                    card.innerHTML = `<h3>${work.title}</h3><p style="color:#aaa;font-style:italic;">Still working on it / Coming soon...</p>`;
                }
                worksList.appendChild(card);
            });
        }
    }
    renderWorks();

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

    // --- Initial setup for typing animation ---
    if (jobTitle) {
        // Set initial animation to just the blinking cursor
        jobTitle.style.animation = 'blink-caret .75s step-end infinite';
    }

    // --- 11. Manual Theme Toggle ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-theme');
            body.classList.remove('light-theme');
        } else {
            body.classList.add('light-theme');
            body.classList.remove('dark-theme');
        }
        themeDarkBtn.classList.toggle('active', theme === 'dark');
        themeLightBtn.classList.toggle('active', theme === 'light');
        localStorage.setItem('theme', theme);
    }

    if (themeLightBtn && themeDarkBtn) {
        themeLightBtn.addEventListener('click', () => applyTheme('light'));
        themeDarkBtn.addEventListener('click', () => applyTheme('dark'));

        // Check for saved theme in localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            // If no saved theme, check system preference
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                applyTheme('dark');
            } else {
                applyTheme('light');
            }
        }
    }


});