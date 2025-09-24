'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function AnimatedText({ text, className = '', delay = 0 }: AnimatedTextProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    // Clear any existing content
    elementRef.current.innerHTML = '';

    // Split text into characters, preserving spaces
    const characters = text.split('').map((char) => {
      const span = document.createElement('span');
      if (char === ' ') {
        span.innerHTML = '&nbsp;';
        span.style.display = 'inline-block';
        span.style.width = '0.3em'; // Add explicit width for spaces
      } else {
        span.innerText = char;
        span.style.display = 'inline-block';
        // Apply gradient styles to each character
        span.style.background = 'linear-gradient(to right, #2563eb, #9333ea)';
        span.style.webkitBackgroundClip = 'text';
        span.style.backgroundClip = 'text';
        span.style.webkitTextFillColor = 'transparent';
        span.style.color = 'transparent';
      }
      span.style.opacity = '0';
      elementRef.current?.appendChild(span);
      return span;
    });

    anime.timeline({
      delay: delay
    })
    .add({
      targets: characters,
      opacity: [0, 1],
      translateY: [-50, 0],
      translateX: [-20, 0],
      rotate: [-30, 0],
      duration: 1500,
      delay: anime.stagger(100),
      easing: 'easeOutElastic(1, .6)'
    })
    .add({
      targets: characters,
      translateY: [-2, 0],
      duration: 250,
      delay: anime.stagger(20),
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine'
    }, '-=1000');

    return () => {
      characters.forEach(el => el.remove());
    };
  }, [text, delay]);

  return (
    <div 
      ref={elementRef}
      className={`inline-block ${className}`}
      aria-label={text}
    />
  );
} 