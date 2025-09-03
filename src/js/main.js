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
            console.log('Form submitted!'); // ADDED
            fireworksContainer.style.display = 'block';
            fireworksContainer.innerHTML = `<div class="fireworks-message">Thank you! I'll be in touch soon.</div>`;
            console.log('Fireworks displayed'); // ADDED

            // You can add a real form submission here (e.g., using fetch to an endpoint)

            contactForm.reset();
            console.log('Form reset'); // ADDED
            setTimeout(() => {
                fireworksContainer.style.display = 'none';
                fireworksContainer.innerHTML = '';
            }, 4000);
            console.log('Fireworks hidden'); // ADDED
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
                            <div>
                                <span style="font-size:1.13rem;font-weight:700;color:#22223b;">${work.title}</span><br>
                                <span style="font-size:1.05rem;font-style:italic;font-weight:500;color:#444;">
                                    <span style="font-family:'Georgia',serif;font-style:italic;">${work.company}</span>
                                </span>
                            </div>
                            <div style="font-size:1.05rem;font-style:italic;color:#666;margin-left:12px;white-space:nowrap;min-width:120px;">
                                ${work.period || ""}
                            </div>
                        </div>
                        <ul style="margin: 14px 0 0 18px; color:#333; font-size:1.05rem; padding-left: 0;">
                            ${Array.isArray(work.description) ? work.description.map(item => `<li style="margin-bottom:4px;">${item}</li>`).join('') : ""}
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
});