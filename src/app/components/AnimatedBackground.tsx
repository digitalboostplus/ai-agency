'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function AnimatedBackground() {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = [...Array(10)].map(() => {
      const div = document.createElement('div');
      div.className = 'floating-element';
      div.style.position = 'absolute';
      div.style.width = '50px';
      div.style.height = '50px';
      div.style.background = `rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 100}, 255, 0.1)`;
      div.style.borderRadius = '50%';
      elementRef.current?.appendChild(div);
      return div;
    });

    const animation = anime({
      targets: elements,
      translateX: () => anime.random(-500, 500),
      translateY: () => anime.random(-300, 300),
      scale: () => anime.random(0.2, 2),
      borderRadius: () => ['50%', anime.random(10, 50) + '%'],
      rotate: () => anime.random(-360, 360),
      opacity: [0.5, 0.9],
      duration: () => anime.random(3000, 5000),
      delay: () => anime.random(0, 1000),
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutQuad',
    });

    return () => {
      animation.pause();
      elements.forEach(el => el.remove());
    };
  }, []);

  return (
    <div 
      ref={elementRef} 
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ filter: 'blur(3px)' }}
    />
  );
} 