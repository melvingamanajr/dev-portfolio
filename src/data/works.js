// src/data/works.js

export const experienceData = [
    {
        title: "Technical Specialist I",
        company: "Alliance Software Inc. – Cebu City, Philippines",
        description: [
            "Improved software efficiency by troubleshooting and resolving coding issues.",
            "Saved time and resources by identifying and fixing bugs before product deployment.",
            "Updated old code bases to modern development standards, improving functionality.",
            "Migrated parts of the system from Vue 2 to Vue 3 (Options API).",
            "Performed Unit, Integration, System and Mobile Testing to ensure cross-platform stability and reliability."
        ],
        period: "July 2024 – Current",
        image: [
            "assets/project_placeholder.png",
        ],
        active: true
    }
];

export const projectsData = [
    {
        title: "Real-Time Employee Monitoring System with Face Recognition",
        company: "Capstone Project",
        description: [
            "Developed a real-time employee monitoring system as a capstone project.",
            "Utilized an AI model for face recognition to automate attendance and monitoring.",
            "Managed data persistence and retrieval using a MySQL database.",
            "Collaborated on the project using SVN for version control."
        ],
        image: [
            "assets/project_placeholder.png"
        ],
        period: "2023",
        liveUrl: "", // Add live URL here
        sourceUrl: "", // Add source code URL here
        active: true,
        sharerable: false // This project's links will be disabled
    },
    {
        title: "Personal Portfolio Website",
        company: "Personal Project",
        description: [
            "Developed a responsive personal portfolio using HTML, CSS, and vanilla JavaScript.",
            "Implemented interactive features like a theme switcher, accent color picker, and animations.",
            "Designed with a mobile-first approach to ensure a seamless experience across all devices.",
            "Structured the project with separate data files for easy updates to skills and work history."
        ],
        image: [
            "assets/project_placeholder.png"
        ],
        period: "Auguest 2025 – Current",
        liveUrl: "https://melvingamanajr.github.io/dev-portfolio/src/index.html",
        sourceUrl: "https://github.com/melvingamanajr/dev-portfolio",
        active: true,
        sharerable: true // This project's links will be enabled
    },
    {
        title: "Expenses Tracker Application",
        company: "Personal Project",
        description: [
            "Built a comprehensive, client-side Expenses Tracker using vanilla HTML, CSS, and JavaScript.",
            "Implemented data persistence using localStorage to save user data across sessions.",
            "Integrated interactive charts to provide visual feedback on spending habits.",
            "Designed a fully responsive and themeable interface for an excellent user experience."
        ],
        image: [
            "assets/expenses-tracker_light.png",
            "assets/expenses-tracker_dark.png"
        ],
        period: "2024",
        liveUrl: "https://melvingamanajr.github.io/expenses-tracker/src/index.html", // Add live URL here
        sourceUrl: "https://github.com/melvingamanajr/expenses-tracker", // Add source code URL here
        active: true,
        sharerable: true
    },
    {
        title: "Hangman Game",
        company: "Personal Project",
        description: [
            "A modern, feature-rich implementation of the classic Hangman game.",
            "Built with vanilla JavaScript, HTML, and CSS.",
            "Designed to be a clean, responsive, and engaging experience for players on any device."
        ],
        image: [
            "assets/hangman_game_light.png",
            "assets/hangman_game_dark.png"
        ],
        period: "2024",
        liveUrl: "https://melvingamanajr.github.io/hangman-game/src/index.html",
        sourceUrl: "https://github.com/melvingamanajr/hangman-game",
        active: true,
        sharerable: true
    }
];