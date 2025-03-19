'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { motion } from 'framer-motion';
import AnimatedText from '../components/AnimatedText';
import AnimatedBackground from '../components/AnimatedBackground';

export default function Hero() {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Animate the AI agents illustration
    anime({
      targets: '.ai-agent-icon',
      scale: [0, 1],
      opacity: [0, 1],
      delay: anime.stagger(200),
      easing: 'easeOutElastic(1, .8)',
      duration: 1500
    });

    // Animate the decorative path
    if (pathRef.current) {
      anime({
        targets: pathRef.current,
        strokeDashoffset: [anime.setDashoffset, 0],
        easing: 'easeInOutSine',
        duration: 3000,
        delay: 1000,
        direction: 'alternate',
        loop: true
      });
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <AnimatedBackground />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 relative">
        <div className="text-center">
          <div className="mb-6">
            <AnimatedText
              text="Transform Your Business"
              className="text-5xl md:text-7xl font-bold text-gray-900 block"
            />
            <AnimatedText
              text="with AI Automation"
              className="text-3xl md:text-5xl font-bold mt-4"
              delay={800}
            />
            <div className="mt-6">
              <motion.div
                className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-xl md:text-2xl font-semibold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                Intelligent Solutions for Modern Business
              </motion.div>
            </div>
          </div>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Our AI agents handle your calls, emails, and tasks with human-like intelligence,
            letting you focus on what matters most.
          </motion.p>

          <div className="flex justify-center space-x-4 mb-16">
            <motion.button
              className="relative px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold group overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover="hover"
            >
              <motion.span
                className="relative z-10"
                variants={{
                  hover: {
                    scale: 1.05,
                  }
                }}
              >
                Get Started
              </motion.span>
              <motion.div
                className="absolute inset-0 bg-purple-600"
                variants={{
                  hover: {
                    scale: 1.5,
                    rotate: 45,
                    opacity: 0,
                    transition: {
                      duration: 0.5
                    }
                  }
                }}
              />
            </motion.button>
            
            <motion.button
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors relative overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              whileHover="hover"
            >
              <motion.span
                className="relative z-10"
                variants={{
                  hover: {
                    scale: 1.05,
                  }
                }}
              >
                Watch Demo
              </motion.span>
              <motion.div
                className="absolute inset-0 bg-gray-100"
                variants={{
                  hover: {
                    scale: [1, 2],
                    opacity: [0, 0.5, 0],
                    transition: {
                      duration: 0.5
                    }
                  }
                }}
              />
            </motion.button>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { icon: '📞', title: 'Call Handling' },
              { icon: '📧', title: 'Email Response' },
              { icon: '⚡', title: 'Task Automation' }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                className="ai-agent-icon p-6 bg-white rounded-xl shadow-lg relative overflow-hidden group"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative SVG path */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
        <path
          ref={pathRef}
          d="M0,0 C300,100 400,300 500,200 C600,100 700,300 1000,200"
          fill="none"
          stroke="rgba(96, 165, 250, 0.2)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
} 