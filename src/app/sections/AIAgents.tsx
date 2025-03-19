'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import anime from 'animejs';
import AnimatedText from '../components/AnimatedText';

const agentFeatures = [
  {
    title: 'Intelligent Call Handling',
    description: 'Our AI agents answer calls 24/7, understand context, and handle customer inquiries with natural conversation.',
    icon: '🎯',
    demo: 'Customer: "I need to reschedule my appointment"\nAI: "I can help you with that. Let me check the available slots..."'
  },
  {
    title: 'Smart Email Response',
    description: 'AI-powered email management that understands, categorizes, and responds to emails with human-like precision.',
    icon: '✉️',
    demo: 'Subject: Order Status Update\nAI: "Your order #12345 is currently in transit and will arrive by..."'
  },
  {
    title: 'Task Automation',
    description: 'Automate repetitive tasks, data entry, and workflow processes with intelligent AI agents.',
    icon: '⚙️',
    demo: 'Task: Invoice Processing\nAI: "Extracting data... Categorizing... Updating accounting system..."'
  }
];

export default function AIAgents() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      // Morph animation for cards
      anime({
        targets: '.agent-card',
        translateY: [100, 0],
        opacity: [0, 1],
        scale: [0.8, 1],
        delay: anime.stagger(200),
        easing: 'easeOutExpo',
        duration: 1500,
        begin: (anim) => {
          document.querySelectorAll('.agent-card').forEach(el => {
            (el as HTMLElement).style.opacity = '0';
          });
        }
      });

      // Typing animation for demo text
      anime({
        targets: '.demo-text',
        width: ['0%', '100%'],
        delay: anime.stagger(1000, {start: 1000}),
        easing: 'easeInOutQuad',
        duration: 1000
      });
    }
  }, [isInView]);

  return (
    <section ref={sectionRef} className="py-20 bg-gray-50 relative overflow-hidden">
      {/* Animated background lines */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-blue-600"
            style={{
              left: 0,
              right: 0,
              top: `${i * 5}%`,
            }}
            animate={{
              translateX: ['-100%', '100%'],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <AnimatedText
            text="Meet Our AI Agents"
            className="text-4xl font-bold text-gray-900 mb-4"
          />
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Experience the future of business automation with our intelligent AI agents
            that handle your communications and tasks with unprecedented efficiency.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {agentFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="agent-card bg-white rounded-xl shadow-lg overflow-hidden"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div className="p-8">
                <motion.div 
                  className="text-4xl mb-4"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <div className="bg-gray-50 rounded-lg p-4 overflow-hidden">
                  <div className="demo-text overflow-hidden whitespace-pre-wrap font-mono text-sm text-gray-700">
                    {feature.demo}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.button 
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold relative overflow-hidden group"
            whileHover="hover"
          >
            <motion.span className="relative z-10">
              Start Automating Today
            </motion.span>
            <motion.div
              className="absolute inset-0 bg-purple-600"
              variants={{
                hover: {
                  scale: [1, 2],
                  opacity: [1, 0],
                  transition: {
                    duration: 0.5
                  }
                }
              }}
            />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
} 