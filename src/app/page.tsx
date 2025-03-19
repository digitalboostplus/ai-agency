import Navbar from './components/Navbar';
import Hero from './sections/Hero';
import AIAgents from './sections/AIAgents';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <AIAgents />
    </main>
  );
}
