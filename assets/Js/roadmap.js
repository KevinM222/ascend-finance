document.addEventListener('DOMContentLoaded', () => {
    const rocket = document.querySelector('.rocket');
    const timelineItems = document.querySelectorAll('.timeline-item');
    const timeline = document.querySelector('.timeline');
    const timelineHeight = timeline.offsetHeight;
    const windowHeight = window.innerHeight;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Move the rocket based on the scroll position
        rocket.style.transform = `translateY(${scrollY * 0.5}px)`;

        // Highlight timeline items as they appear in the viewport
        timelineItems.forEach((item) => {
            const itemPosition = item.getBoundingClientRect().top;
            if (itemPosition < windowHeight * 0.75) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    });
});
