document.addEventListener('DOMContentLoaded', () => {
    const plane = document.querySelector('.paper-plane-container');

    if (!plane) return;

    function randomizeAndFly() {
        // Reset animation to be able to restart it
        plane.style.animation = 'none';
        // This is a trick to force a browser reflow, which is necessary for the animation to restart correctly.
        void plane.offsetWidth;

        // --- Generate Random Values ---
        // Random vertical start position (from 15% to 75% of the screen height)
        const randomTop = Math.random() * 60 + 15;
        // Random flight duration (from 10 to 20 seconds)
        const randomDuration = Math.random() * 10 + 10;
        // Random scale (from 0.8 to 1.4) to give a sense of depth
        const randomScale = Math.random() * 0.6 + 0.8;

        // --- Apply Random Styles ---
        plane.style.top = `${randomTop}vh`;
        plane.style.transform = `scale(${randomScale})`;
        
        // Apply the animation with the random duration. 'forwards' ensures it stays at the end until reset.
        plane.style.animation = `fly-plane ${randomDuration}s linear forwards`;
    }

    // Listen for when the animation finishes, then wait a random time before the next flight
    plane.addEventListener('animationend', () => {
        setTimeout(randomizeAndFly, Math.random() * 5000 + 3000); // 3 to 8 seconds delay
    });

    // Start the first flight after an initial 2-second delay
    setTimeout(randomizeAndFly, 2000);
});

