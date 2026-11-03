'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const revealTargets = [
  '.hero-photo',
  '.hero-copy-block > *',
  '.provision-hero-grid > div > *',
  '.referral-hero-grid > div > *',
  '.contact-page-copy > *',
  '.contact-card > *',
  '.home-detail-copy > *',
  '.home-detail-media',
  '.section-heading > *',
  '.about-intro > *',
  '.service-card',
  '.pillar-grid > *',
  '.training-grid > *',
  '.steps-grid > *',
  '.home-card',
  '.home-detail-facts > *',
  '.home-detail-content > h2',
  '.home-support-grid > *',
  '.referral-details-grid > *',
  '.home-detail-contact > *',
  '.contact-guide > *',
  '.approach-link',
  '.footer-grid > *',
  '.footer-bottom > *',
].join(', ');

export default function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );
    if (motionPreference.matches || !('IntersectionObserver' in window)) return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(revealTargets),
    );
    const entranceAnimations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.reveal = 'visible';
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08 },
    );

    elements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom <= 0) return;
      const siblings = Array.from(element.parentElement?.children ?? []);
      const delay = Math.min(siblings.indexOf(element) * 70, 210);
      element.style.setProperty('--reveal-delay', `${delay}ms`);
      if (bounds.top < window.innerHeight) {
        // Animate the rendered content without hiding the server's first paint.
        entranceAnimations.push(
          element.animate(
            [
              {
                opacity: 0,
                transform: element.matches('.hero-photo')
                  ? 'none'
                  : 'translateY(18px)',
              },
              { opacity: 1, transform: 'none' },
            ],
            {
              duration: 600,
              delay,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'backwards',
            },
          ),
        );
        return;
      }
      element.dataset.reveal = 'pending';
      observer.observe(element);
    });

    function clearReveals() {
      observer.disconnect();
      entranceAnimations.forEach((animation) => animation.cancel());
      elements.forEach((element) => {
        delete element.dataset.reveal;
        element.style.removeProperty('--reveal-delay');
      });
    }

    motionPreference.addEventListener('change', clearReveals);
    return () => {
      clearReveals();
      motionPreference.removeEventListener('change', clearReveals);
    };
  }, [pathname]);

  return null;
}
