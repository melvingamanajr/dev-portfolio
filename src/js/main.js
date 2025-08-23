document.addEventListener('DOMContentLoaded', function () {
    const navToggle = document.querySelector('.nav-toggle');
    const navUl = document.querySelector('nav ul');
    if (navToggle && navUl) {
        navToggle.addEventListener('click', function () {
            navUl.classList.toggle('open');
        });
    }

    // SPA-like navigation
    const navLinks = document.querySelectorAll('div a');
    const sections = document.querySelectorAll('.main-section');

    function showSection(id) {
        sections.forEach(section => {
            if (section.id === id) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
        // Close nav on mobile after click
        if (navUl) navUl.classList.remove('open');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').replace('#', '');
            if (document.getElementById(targetId)) {
                e.preventDefault();
                showSection(targetId);
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Show home by default
    showSection('home');

    // Scramble animation for .highlight
    const highlight = document.querySelector('.highlight');
    if (highlight) {
        const originalText = highlight.textContent;
        let scrambleInterval = null;
        let frame = 0;
        const totalFrames = 36; // More frames for slower effect
        const chars = 'MELVINmelvin';

        function scrambleStep() {
            let displayed = '';
            for (let i = 0; i < originalText.length; i++) {
                if (originalText[i] === ' ') {
                    displayed += ' ';
                } else if (frame < totalFrames - 8 && Math.random() > frame / totalFrames) {
                    displayed += chars[Math.floor(Math.random() * chars.length)];
                } else {
                    displayed += originalText[i];
                }
            }
            highlight.textContent = displayed;
            frame++;
            if (frame > totalFrames) {
                clearInterval(scrambleInterval);
                highlight.textContent = originalText;
            }
        }

        function startScramble() {
            clearInterval(scrambleInterval);
            frame = 0;
            scrambleInterval = setInterval(scrambleStep, 38); // Slower interval
        }

        highlight.addEventListener('mouseenter', startScramble);
        highlight.addEventListener('focus', startScramble);
        highlight.addEventListener('mouseleave', () => {
            clearInterval(scrambleInterval);
            highlight.textContent = originalText;
        });
        highlight.addEventListener('blur', () => {
            clearInterval(scrambleInterval);
            highlight.textContent = originalText;
        });
    }

    // Fireworks animation on contact form submit
    const contactForm = document.querySelector('.contact-form');
    const fireworksContainer = document.getElementById('fireworks-container');

    if (contactForm && fireworksContainer) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Show fireworks container
            fireworksContainer.style.display = 'block';

            // Function to launch a sequence of fireworks
            function launchFireworksSequence(sequenceCount = 3, delay = 700) {
                let current = 0;
                function launch() {
                    // Simple canvas fireworks
                    fireworksContainer.innerHTML = `
                        <canvas id="fireworks-canvas" style="width:100vw;height:100vh;"></canvas>
                        <div id="fireworks-message" style="
                            position:fixed;
                            top:40%;
                            left:50%;
                            transform:translate(-50%,-50%);
                            color:#39FF14;
                            font-size:2rem;
                            font-weight:700;
                            z-index:10000;
                            text-align:center;
                            pointer-events:none;
                        ">
                            🎉 Thank you for reaching out! 🎉
                        </div>
                    `;
                    const canvas = document.getElementById('fireworks-canvas');
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    const ctx = canvas.getContext('2d');

                    // Firework particle system
                    const particles = [];
                    const colors = ['#39FF14', '#4f5dff', '#FFD700', '#FF69B4', '#00FFFF', '#FF6347'];

                    function createFirework(x, y) {
                        for (let i = 0; i < 36; i++) {
                            const angle = (i / 36) * 2 * Math.PI;
                            const speed = Math.random() * 4 + 3;
                            particles.push({
                                x, y,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed,
                                alpha: 1,
                                color: colors[Math.floor(Math.random() * colors.length)]
                            });
                        }
                    }

                    // Launch a few fireworks at random positions
                    for (let i = 0; i < 5; i++) {
                        createFirework(
                            Math.random() * canvas.width * 0.6 + canvas.width * 0.2,
                            Math.random() * canvas.height * 0.5 + canvas.height * 0.2
                        );
                    }

                    function animate() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        particles.forEach(p => {
                            ctx.globalAlpha = p.alpha;
                            ctx.beginPath();
                            ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
                            ctx.fillStyle = p.color;
                            ctx.fill();
                            p.x += p.vx;
                            p.y += p.vy;
                            p.vx *= 0.96;
                            p.vy *= 0.96;
                            p.vy += 0.06; // gravity
                            p.alpha -= 0.018;
                        });
                        // Remove faded particles
                        for (let i = particles.length - 1; i >= 0; i--) {
                            if (particles[i].alpha <= 0) particles.splice(i, 1);
                        }
                        if (particles.length > 0) {
                            requestAnimationFrame(animate);
                        }
                    }
                    animate();

                    // Next sequence or hide after last
                    current++;
                    if (current < sequenceCount) {
                        setTimeout(launch, delay);
                        contactForm.reset();
                    } else {
                        setTimeout(() => {
                            fireworksContainer.style.display = 'none';
                        }, delay + 400);
                    }
                }
                launch();
            }

            launchFireworksSequence(3, 700);

            // Do not Delete this part - original form submission feedback
            // Show confirmation message below the form
            // let resultMsg = document.querySelector('.contact-result-message');
            // if (!resultMsg) {
            //     resultMsg = document.createElement('div');
            //     resultMsg.className = 'contact-result-message';
            //     contactForm.parentNode.appendChild(resultMsg);
            // }
            // resultMsg.textContent = "Thank you for reaching out! Your message has been sent 🎉";
            // resultMsg.style.marginTop = "18px";
            // resultMsg.style.fontWeight = "600";
            // resultMsg.style.color = "#39FF14";
            // resultMsg.style.textAlign = "center";
            // resultMsg.style.fontSize = "1.1rem";

            // // Optionally clear the form
            // contactForm.reset();

            // // Hide the message after a few seconds
            // setTimeout(() => {
            //     if (resultMsg) resultMsg.textContent = "";
            // }, 4000);
        });
    }

    // Dynamically render works data
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

    // Green/lime green cursor dot
    // Custom cursor dot
    let cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    document.body.appendChild(cursorDot);

    document.addEventListener('mousemove', function(e) {
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
    });
});

// Lime green loading bar
function showLoadingBar() {
    const bar = document.getElementById('loading-bar');
    const container = document.getElementById('loading-bar-container');
    if (bar && container) {
        container.style.opacity = '1';
        bar.style.width = '0';
        setTimeout(() => { bar.style.width = '80%'; }, 50);
    }
}
function finishLoadingBar() {
    const bar = document.getElementById('loading-bar');
    const container = document.getElementById('loading-bar-container');
    if (bar && container) {
        bar.style.width = '100%';
        setTimeout(() => {
            container.style.opacity = '0';
            bar.style.width = '0';
        }, 400);
    }
}

// Show loading bar on navigation and initial load
document.addEventListener('DOMContentLoaded', function () {
    // Show loading bar on SPA navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').replace('#', '');
            if (document.getElementById(targetId)) {
                showLoadingBar();
                setTimeout(finishLoadingBar, 700); // Simulate loading delay
            }
        });
    });

    // Show loading bar on initial load
    showLoadingBar();
    window.addEventListener('load', () => {
        setTimeout(finishLoadingBar, 600);
    });
});

// Accent color selector
const colorPicker = document.getElementById('accent-color-picker');
if (colorPicker) {
    // Set picker to current accent color
    const currentAccent = getComputedStyle(document.documentElement).getPropertyValue('--main-accent').trim();
    if (currentAccent) colorPicker.value = currentAccent;

    colorPicker.addEventListener('input', function () {
        document.documentElement.style.setProperty('--main-accent', this.value);
        // Optionally, persist the color in localStorage
        localStorage.setItem('mainAccent', this.value);
    });

    // On load, restore accent color if saved
    const savedAccent = localStorage.getItem('mainAccent');
    if (savedAccent) {
        document.documentElement.style.setProperty('--main-accent', savedAccent);
        colorPicker.value = savedAccent;
    }
}