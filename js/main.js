document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const tiltCards = document.querySelectorAll('.tilt-card');

    if (window.VanillaTilt && canHover && !prefersReducedMotion) {
        VanillaTilt.init(tiltCards, {
            max: 5,
            speed: 400,
            glare: true,
            'max-glare': 0.1,
            scale: 1.01
        });
    }

    const revealItems = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12 });

        revealItems.forEach((item, index) => {
            item.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
            revealObserver.observe(item);
        });
    } else {
        revealItems.forEach((item) => item.classList.add('is-visible'));
    }

    const menuButton = document.querySelector('.menu-btn');
    const navigation = document.querySelector('.nav-links');

    if (menuButton && navigation) {
        menuButton.addEventListener('click', () => {
            const isOpen = navigation.classList.toggle('is-open');
            menuButton.setAttribute('aria-expanded', String(isOpen));
            menuButton.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
        });

        navigation.addEventListener('click', () => {
            navigation.classList.remove('is-open');
            menuButton.setAttribute('aria-expanded', 'false');
            menuButton.setAttribute('aria-label', '메뉴 열기');
        });
    }
});
