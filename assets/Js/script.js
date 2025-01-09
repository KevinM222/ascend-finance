document.addEventListener('DOMContentLoaded', () => {
    const rocket = document.querySelector('.rocket');
    const sections = document.querySelectorAll('.timeline-section');

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        rocket.style.transform = `translateY(-${scrollPosition}px)`;
    });
});
