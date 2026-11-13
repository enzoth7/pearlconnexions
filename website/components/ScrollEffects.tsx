'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const revealTargets = [
  '.pc-photo-hero-content > *',
  '.pc-fact',
  '.pc-section > .shell > h2',
  '.pc-split-text > *',
  '.pc-offset-photo',
  '.pc-service-card',
  '.pc-col-item',
  '.pc-statement-inner > *',
  '.pc-values > .shell > h2',
  '.pc-value',
  '.pc-headed-columns > .shell > h2',
  '.pc-headed-subtitle',
  '.pc-ruled-item',
  '.pc-tint-hero-text > *',
  '.pc-page-hero-grid > *',
  '.pc-two-col-statement .pc-two-col > *',
  '.pc-team .shell > h2',
  '.pc-team-intro',
  '.pc-team-photo',
  '.pc-progress-intro > *',
  '.pc-progress-gallery > *',
  '.pc-journey-steps li',
  '.pc-progress-steps li',
  '.pc-progress-footer',
  '.pc-workforce > .shell > h2',
  '.pc-workforce-grid > img',
  '.pc-testimonials > .shell > h2',
  '.pc-quote',
  '.pc-practice > div',
  '.pc-roles > li',
  '.pc-rounded-card',
  '.pc-cqc-card',
  '.pc-referral-hero-grid > *',
  '.pc-journey-intro > *',
  '.pc-send-first .pc-two-col > *',
  '.pc-contact-grid > *',
  '.pc-home-intro .shell > h1',
  '.pc-gallery',
  '.pc-homes > .shell > h2',
  '.pc-home-card',
  '.pc-home-details > section',
  '.pc-other-grid article',
].join(', ');
const accentTargets = '.pc-underline, .pc-circled';

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
    const accents = Array.from(
      document.querySelectorAll<HTMLElement>(accentTargets),
    );
    const entranceAnimations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          if (element.matches(accentTargets)) {
            element.dataset.accent = 'visible';
          } else {
            element.dataset.reveal = 'visible';
          }
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

    accents.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom <= 0) return;
      if (bounds.top < window.innerHeight) {
        const path = element.querySelector('path');
        if (path) {
          entranceAnimations.push(path.animate(
            [
              { strokeDasharray: '1', strokeDashoffset: '1' },
              { strokeDasharray: '1', strokeDashoffset: '0' },
            ],
            { duration: 900, delay: 200, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'backwards' },
          ));
        }
        return;
      }
      element.dataset.accent = 'pending';
      observer.observe(element);
    });

    function clearReveals() {
      observer.disconnect();
      entranceAnimations.forEach((animation) => animation.cancel());
      elements.forEach((element) => {
        delete element.dataset.reveal;
        element.style.removeProperty('--reveal-delay');
      });
      accents.forEach((element) => { delete element.dataset.accent; });
    }

    motionPreference.addEventListener('change', clearReveals);
    return () => {
      clearReveals();
      motionPreference.removeEventListener('change', clearReveals);
    };
  }, [pathname]);

  return null;
}
