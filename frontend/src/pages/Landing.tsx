import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Prevent body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Show navbar for authenticated users */}
      {isAuthenticated && <Navbar showNavigation={true} />}

      {/* Marketing Header - only show for non-authenticated users */}
      {!isAuthenticated && (
        <>
          {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="text-xl md:text-2xl font-bold text-blue-600">
                Personal Resource Manager
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8 items-center">
              <a
                href="#features"
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                Pricing
              </a>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex space-x-4 items-center">
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
              aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" strokeWidth={2} />
              ) : (
                <Menu className="h-6 w-6" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          className={`md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
          }`}
          role="menu"
          aria-labelledby="mobile-menu-button"
        >
          <div className="px-4 py-6 space-y-4">
            {/* Mobile Navigation Links */}
            <nav className="space-y-4">
              <a
                href="#features"
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Testimonials
              </a>
              <a
                href="#pricing"
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Pricing
              </a>
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <Link
                to="/login"
                className="block w-full text-center px-4 py-3 text-base font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="block w-full text-center px-4 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors duration-200"
                onClick={closeMobileMenu}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>
        </>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-teal-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-semibold text-gray-900 mb-6 tracking-tight">
            Your AI-Powered Second Brain
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Store, organize, and retrieve your resources—like Instagram reels, notes, and tricks—with natural language search powered by AI.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/signup" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors text-center">
              Start Free Trial
            </Link>
            <button className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors">
              Watch Demo
            </button>
          </div>
          <div className="mt-12">
            <img src="https://via.placeholder.com/800x400?text=Dashboard+Preview" alt="App Dashboard Preview" className="mx-auto rounded-lg shadow-lg" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to manage your digital resources effortlessly.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">AI-Powered Search</h3>
              <p className="text-gray-600">Find any resource instantly with natural language queries. No more digging through folders.</p>
            </div>
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Smart Capture</h3>
              <p className="text-gray-600">Automatically capture and categorize resources from various sources with intelligent tagging.</p>
            </div>
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Seamless Organization</h3>
              <p className="text-gray-600">Organize resources with customizable folders, tags, and automatic categorization.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in three simple steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Capture Resources</h3>
              <p className="text-gray-600">Add notes, save reels, or upload files from anywhere.</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">AI Processes</h3>
              <p className="text-gray-600">Our AI analyzes and tags your resources automatically.</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Search & Retrieve</h3>
              <p className="text-gray-600">Find anything with natural language search instantly.</p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-4 bg-white p-4 rounded-lg shadow">
              <div className="w-8 h-8 bg-blue-600 rounded"></div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="w-8 h-8 bg-teal-600 rounded"></div>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="w-8 h-8 bg-orange-600 rounded"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Join thousands of satisfied users.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">JD</div>
                <div className="ml-4">
                  <h4 className="font-semibold">Jane Doe</h4>
                  <p className="text-gray-600">Content Creator</p>
                </div>
              </div>
              <p className="text-gray-700">"This app has revolutionized how I organize my Instagram content. The AI search is a game-changer!"</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">MS</div>
                <div className="ml-4">
                  <h4 className="font-semibold">Mike Smith</h4>
                  <p className="text-gray-600">Student</p>
                </div>
              </div>
              <p className="text-gray-700">"Perfect for keeping track of all my study notes and resources. Natural language search saves me so much time."</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">AL</div>
                <div className="ml-4">
                  <h4 className="font-semibold">Alice Lee</h4>
                  <p className="text-gray-600">Entrepreneur</p>
                </div>
              </div>
              <p className="text-gray-700">"The smart capture feature automatically organizes my business ideas and market research. Highly recommend!"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">Simple Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your needs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
              <p className="text-gray-600 mb-6">Perfect for getting started</p>
              <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Up to 100 resources</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Basic search</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Manual organization</li>
              </ul>
              <button className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Get Started</button>
            </div>
            <div className="bg-blue-600 text-white p-8 rounded-lg shadow-lg text-center transform scale-105">
              <h3 className="text-2xl font-semibold mb-4">Pro</h3>
              <div className="text-4xl font-bold mb-2">$9.99<span className="text-lg font-normal">/month</span></div>
              <p className="mb-6">For power users</p>
              <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center"><svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Unlimited resources</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>AI-powered search</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Smart capture</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Advanced organization</li>
              </ul>
              <Link to="/signup" className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-center block">Start Free Trial</Link>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Enterprise</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">Custom</div>
              <p className="text-gray-600 mb-6">For teams and organizations</p>
              <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Everything in Pro</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Team collaboration</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Priority support</li>
              </ul>
              <button className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Personal Resource Manager</h3>
              <p className="text-gray-400">Your AI-powered second brain for managing digital resources.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2023 Personal Resource Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;