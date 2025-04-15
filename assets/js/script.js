document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;
    const sunIcon = 'fa-sun';
    const moonIcon = 'fa-moon';
    const toggleIcon = themeToggleButton.querySelector('i');

    // --- Theme Toggling ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.remove('light-mode'); // Remove light mode class
            body.classList.add('dark-mode');    // Add dark mode class
            toggleIcon.classList.remove(sunIcon);
            toggleIcon.classList.add(moonIcon);
            localStorage.setItem('theme', 'dark');
        } else { // Light theme
            body.classList.remove('dark-mode'); // Remove dark mode class
            body.classList.add('light-mode');   // Add light mode class
            toggleIcon.classList.remove(moonIcon);
            toggleIcon.classList.add(sunIcon);
            localStorage.setItem('theme', 'light');
        }
    };

    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) { applyTheme(savedTheme); }
    else { applyTheme('dark'); } // Default to dark

    // Theme toggle button event listener
    themeToggleButton.addEventListener('click', () => {
        const isCurrentlyDark = body.classList.contains('dark-mode') || !body.classList.contains('light-mode');
        applyTheme(isCurrentlyDark ? 'light' : 'dark');
    });
    // Update theme if system preference changes (Only if no manual choice made)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        if (!localStorage.getItem('theme')) { applyTheme(event.matches ? 'dark' : 'light'); }
    });

    // --- Timeline Scroll Reveal Animation ---
    const timelineEvents = document.querySelectorAll('.timeline-event');
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observerCallback = (entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('observed'); } }); };
    const timelineObserver = new IntersectionObserver(observerCallback, observerOptions);
    timelineEvents.forEach(event => { timelineObserver.observe(event); });
    if (timelineEvents.length > 0) { requestAnimationFrame(() => { const firstEventRect = timelineEvents[0].getBoundingClientRect(); if (firstEventRect.top < window.innerHeight && firstEventRect.bottom >= 0) { timelineEvents[0].classList.add('observed'); } }); }

    // --- Timeline Glow Line Animation ---
    const timelineLine = document.querySelector('.timeline-line');
    const timelineSection = document.getElementById('timeline');
    let isTicking = false;
    const updateTimelineGlow = () => {
        if (!timelineLine || !timelineSection) return;
        const sectionRect = timelineSection.getBoundingClientRect(); const viewportHeight = window.innerHeight; const sectionTop = sectionRect.top; const sectionHeight = sectionRect.height;
        let scrollDistance = viewportHeight - sectionTop; let progress = scrollDistance / sectionHeight;
        progress = Math.max(0, Math.min(1, progress));
        timelineLine.style.setProperty('--glow-height', `${progress * 100}%`);
        isTicking = false;
    };
    const onScroll = () => { if (!isTicking) { window.requestAnimationFrame(updateTimelineGlow); isTicking = true; } };
    window.addEventListener('scroll', onScroll);
    requestAnimationFrame(updateTimelineGlow);

    // --- Footer Year ---
    const yearSpan = document.getElementById('year');
    if (yearSpan) { yearSpan.textContent = new Date().getFullYear(); }
});