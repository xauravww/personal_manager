import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/landing/HeroSection';
import ProblemSolution from '../components/landing/ProblemSolution';
import FeatureGrid from '../components/landing/FeatureGrid';
import DeepDives from '../components/landing/DeepDives';
import Testimonials from '../components/landing/Testimonials';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';
import { Github, Twitter, Linkedin } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-void-950 text-starlight-100 selection:bg-neon-blue selection:text-white overflow-x-hidden font-sans">
      <Navbar showNavigation={false} />

      <main>
        <HeroSection />
        <ProblemSolution />
        <FeatureGrid />
        <DeepDives />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>

      {/* Footer */}
      <footer className="bg-void-950 border-t border-starlight-100/5 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded bg-neon-blue flex items-center justify-center text-white font-bold">N</div>
                <span className="font-display font-bold text-xl text-starlight-100">NexusBrain</span>
              </div>
              <p className="text-starlight-400 text-sm leading-relaxed mb-6">
                Your AI-powered second brain for managing digital resources. Capture, organize, and retrieve anything instantly.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-starlight-500 hover:text-starlight-100 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-starlight-500 hover:text-starlight-100 transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-starlight-500 hover:text-starlight-100 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-starlight-100 mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-starlight-400">
                <li><a href="#features" className="hover:text-neon-blue transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-neon-blue transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">API</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">Extensions</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-starlight-100 mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-starlight-400">
                <li><a href="#" className="hover:text-neon-blue transition-colors">About</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">Legal</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-starlight-100 mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-starlight-400">
                <li><a href="#" className="hover:text-neon-blue transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-neon-blue transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-starlight-100/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-starlight-600">
              © 2023 NexusBrain. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-xs font-mono text-starlight-500">ALL SYSTEMS OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;