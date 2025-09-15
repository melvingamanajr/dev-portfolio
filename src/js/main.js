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

                    // 2. Pause for 3 seconds, then delete
                    setTimeout(() => {
                        jobTitle.style.animation = 'deleting 2s steps(20, end) forwards, blink-caret .75s step-end infinite';
                    }, 5000); // 2s typing + 3s pause

                    // 3. Pause after deleting, then re-type to final state
                    setTimeout(() => {
                        jobTitle.style.animation = 'typing 2s steps(20, end) forwards, blink-caret .75s step-end infinite';
                        // Animation finished, allow it to be re-triggered if the user scrolls away and back
                        setTimeout(() => jobTitle.dataset.animating = 'false', 2000);
                    }, 7500); // 5s from start + 2s deleting + 0.5s pause
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

    // --- 6. Scramble Animation for Name (Removed) ---

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
    function renderExperience() {
        const experienceList = document.querySelector('#experience .experience-list');
        if (!experienceList) return;
        experienceList.innerHTML = '';

        if (window.experienceData && Array.isArray(window.experienceData)) {
            window.experienceData.forEach(exp => {
                const card = document.createElement('div');
                card.className = 'work-item'; // Use the same class as projects for ticket styling
                card.innerHTML = `
                    <div class="work-item-image-part">
                        <img src="${exp.image}" alt="${exp.company} logo">
                    </div>
                    <div class="work-item-details-part">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;">
                            <div class="work-item-header">
                                <span class="work-item-title">${exp.title}</span><br>
                                <span class="work-item-company">
                                    <span style="font-family:'Georgia',serif;font-style:italic;">${exp.company}</span>
                                </span>
                            </div>
                            <div class="work-item-period">
                                ${exp.period || ""}
                            </div>
                        </div>
                        <ul>
                            ${Array.isArray(exp.description) ? exp.description.map(item => `<li>${item}</li>`).join('') : ""}
                        </ul>
                    </div>
                `;
                experienceList.appendChild(card);
            });
        }
    }

    function renderProjects() {
        const projectsList = document.querySelector('#projects .projects-list');
        if (!projectsList) return;
        projectsList.innerHTML = '';

        if (window.projectsData && Array.isArray(window.projectsData)) {
            window.projectsData.forEach(project => {
                const card = document.createElement('div');
                card.className = 'work-item';

                if (project.active) {
                    card.innerHTML = `
                        <div class="work-item-image-part">
                            <img src="${project.image}" alt="${project.title} preview">
                        </div>
                        <div class="work-item-details-part">
                            <div class="work-item-header">
                                <span class="work-item-title">${project.title}</span><br>
                                <span class="work-item-company">${project.company}</span>
                            </div>
                            <ul>
                                ${Array.isArray(project.description) ? project.description.map(item => `<li>${item}</li>`).join('') : ""}
                            </ul>
                        </div>
                    `;
                } else {
                    card.innerHTML = `<div class="work-item-details-part"><h3>${project.title}</h3><p style="color:#aaa;font-style:italic;">Still working on it / Coming soon...</p></div>`;
                }
                projectsList.appendChild(card);
            });
        }
    }
    renderExperience();
    renderProjects();

    function renderCertifications() {
        const certificationsList = document.querySelector('#certifications .certifications-list');
        if (!certificationsList) return;
        certificationsList.innerHTML = '';

        if (window.certificationsData && Array.isArray(window.certificationsData)) {
            window.certificationsData.forEach(cert => {
                const card = document.createElement('div');
                card.className = 'certification-item';

                card.innerHTML = `
                    <div class="certification-icon">
                        <i class="${cert.icon || 'fa-solid fa-award'}"></i>
                    </div>
                    <div class="certification-details">
                        <span class="certification-title">${cert.title}</span>
                        <span class="certification-issuer">${cert.issuer} - ${cert.date}</span>
                    </div>
                `;
                certificationsList.appendChild(card);
            });
        }
    }
    renderCertifications();

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