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

       {/* Hero Banner - Right below navbar */}
       <section className="relative bg-white py-16 overflow-hidden">
         <div className="absolute inset-0">
           <img
             src="/assets/hero-illustration-2.png"
             alt="Personal Resource Manager - Hero Banner"
             className="w-full h-full object-cover"
           />
           {/* Dark overlay for better text readability */}
           <div className="absolute inset-0 bg-black bg-opacity-70"></div>
         </div>

         <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center text-white">
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
               Stop Losing Your Best Ideas Forever
             </h1>
             <p className="text-xl md:text-2xl text-gray-100 mb-12 max-w-4xl mx-auto leading-relaxed">
               You're scrolling through Instagram, watching a life-changing productivity hack, taking notes on your phone, bookmarking articles, and saving voice memos. But when you need that information later... it's gone. Buried in a mess of apps, forgotten folders, and broken links.
             </p>

             <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
               <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
                 <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                   <img
                     src="/assets/icon-scattered-knowledge.svg"
                     alt="Scattered Knowledge Icon"
                     className="w-14 h-14"
                   />
                 </div>
                 <h3 className="text-xl font-semibold mb-2">Scattered Knowledge</h3>
                 <p className="text-gray-100">Your best insights are spread across 10+ apps, devices, and forgotten notebooks</p>
               </div>

               <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
                 <div className="w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                   <img
                     src="/assets/icon-wasted-search-time.svg"
                     alt="Hours Wasted Searching Icon"
                     className="w-14 h-14"
                   />
                 </div>
                 <h3 className="text-xl font-semibold mb-2">Hours Wasted Searching</h3>
                 <p className="text-gray-100">You spend more time looking for information than actually using it</p>
               </div>

               <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
                 <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                   <img
                     src="/assets/icon-missed-opportunities.svg"
                     alt="Missed Opportunities Icon"
                     className="w-14 h-14"
                   />
                 </div>
                 <h3 className="text-xl font-semibold mb-2">Missed Opportunities</h3>
                 <p className="text-gray-100">Great ideas and insights disappear because you can't find them when you need them</p>
               </div>
             </div>
           </div>
         </div>
       </section>

       {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-teal-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              🎯 The Solution You've Been Waiting For
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold text-gray-900 mb-6 tracking-tight">
            Never Lose Another Great Idea
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto">
            Transform your scattered knowledge into a powerful, searchable second brain. Capture everything—from Instagram tips to research notes—with AI that understands what you mean, not just what you type.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Capture</h3>
              <p className="text-sm text-gray-600">Save anything with one click - articles, videos, notes, voice memos</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Search</h3>
              <p className="text-sm text-gray-600">Find anything by describing it in plain English</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Organization</h3>
              <p className="text-sm text-gray-600">Automatic tagging and categorization</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
            <Link to="/signup" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Start Saving Ideas Today
            </Link>
            <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all duration-200">
              Watch 2-Minute Demo
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">Join 10,000+ knowledge workers who never lose their best ideas</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>✓ Free 14-day trial</span>
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
            </div>
           </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">10,000+</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">2.5M+</div>
              <div className="text-gray-600">Resources Saved</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">85%</div>
              <div className="text-gray-600">Time Saved</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">4.9/5</div>
              <div className="text-gray-600">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Solves Your Problems */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">How We Solve Your Biggest Knowledge Problems</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Stop wasting time searching and start actually using your knowledge.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">The "I Know I Saved This Somewhere" Problem</h3>
              <p className="text-gray-600 mb-6">You remember seeing that perfect article 3 months ago, but now it's lost in your browser bookmarks, email archives, or that "misc" folder on your desktop. With traditional tools, finding it means hours of frustrated searching.</p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-blue-800 font-medium">Our Solution: Ask "that productivity article about time blocking" and get instant results.</p>
              </div>
            </div>
             <div className="bg-white p-8 rounded-xl shadow-lg">
               <img
                 src="/assets/problem1-scattering.png"
                 alt="The Scattering Problem - Knowledge Lost Across Multiple Apps"
                 className="w-full h-auto rounded-lg"
               />
             </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="order-2 lg:order-1">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">The "Too Many Apps" Chaos</h3>
              <p className="text-gray-600 mb-6">Your knowledge is scattered across Evernote, Notion, Google Keep, browser bookmarks, voice memos, and who-knows-what-else. Switching between apps wastes time and breaks your flow.</p>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="text-green-800 font-medium">Our Solution: One place for everything, accessible from anywhere.</p>
              </div>
            </div>
             <div className="order-1 lg:order-2 bg-white p-8 rounded-xl shadow-lg">
               <img
                 src="/assets/problem2-unifiedhub.png"
                 alt="The Unified Solution - All Knowledge in One Place"
                 className="w-full h-auto rounded-lg"
               />
             </div>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Ready to End Knowledge Chaos?</h3>
            <p className="text-gray-600 mb-8">Join thousands who've transformed their productivity by consolidating their digital knowledge.</p>
            <Link to="/signup" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              Start Your Free Trial
            </Link>
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

      {/* Real User Stories */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">Real Stories from Real Users</h2>
            <p className="text-xl text-gray-600">See how people just like you transformed their knowledge management.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl border border-blue-200">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">SJ</div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Sarah Johnson</h4>
                  <p className="text-gray-600 text-sm">Content Creator & Entrepreneur</p>
                </div>
              </div>
              <blockquote className="text-gray-700 mb-4 italic">
                "I used to spend 2 hours every week searching for content I knew I had saved. Now I find anything in 30 seconds. This app paid for itself in the first month."
              </blockquote>
              <div className="flex text-yellow-400">
                ★★★★★
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl border border-green-200">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">MR</div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Marcus Rodriguez</h4>
                  <p className="text-gray-600 text-sm">Graduate Student</p>
                </div>
              </div>
              <blockquote className="text-gray-700 mb-4 italic">
                "As a PhD student, I collect hundreds of research papers and articles. Before this, organization was impossible. Now I can ask 'papers about machine learning ethics' and get exactly what I need."
              </blockquote>
              <div className="flex text-yellow-400">
                ★★★★★
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl border border-purple-200">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">LK</div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Lisa Kim</h4>
                  <p className="text-gray-600 text-sm">Product Manager</p>
                </div>
              </div>
              <blockquote className="text-gray-700 mb-4 italic">
                "I save everything - meeting notes, competitor research, user feedback, design inspiration. This app turned my scattered knowledge into a superpower. My work quality improved dramatically."
              </blockquote>
              <div className="flex text-yellow-400">
                ★★★★★
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-gray-600 mb-8">Trusted by professionals at</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="text-gray-400 font-semibold">Google</div>
              <div className="text-gray-400 font-semibold">Microsoft</div>
              <div className="text-gray-400 font-semibold">Adobe</div>
              <div className="text-gray-400 font-semibold">Shopify</div>
              <div className="text-gray-400 font-semibold">Notion</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Everything you need to know before getting started.</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <button className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="text-lg font-medium text-gray-900">How does the AI search actually work?</span>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="px-6 pb-4">
                <p className="text-gray-600">Our AI understands context and meaning, not just keywords. When you search for "that productivity technique from the YouTube video," it finds relevant content even if those exact words aren't in your saved notes. It's like having a personal research assistant who knows your knowledge base intimately.</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <button className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="text-lg font-medium text-gray-900">Can I import my existing notes and bookmarks?</span>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="px-6 pb-4">
                <p className="text-gray-600">Absolutely! We support importing from Evernote, Notion, Google Keep, browser bookmarks, and most major note-taking apps. Our migration tools make it easy to consolidate all your scattered knowledge into one powerful system.</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <button className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="text-lg font-medium text-gray-900">Is my data secure and private?</span>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="px-6 pb-4">
                <p className="text-gray-600">Your privacy is our top priority. All data is encrypted end-to-end, and we never share your personal information. Your knowledge stays yours - we only use it to provide better search results within your own content. SOC 2 compliant and GDPR ready.</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <button className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="text-lg font-medium text-gray-900">What happens after my free trial ends?</span>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="px-6 pb-4">
                <p className="text-gray-600">You'll get a friendly reminder 3 days before your trial ends. If you decide to continue, we'll seamlessly transition you to a paid plan. If not, your data remains accessible in read-only mode for 30 days to export your content. No surprises, no automatic charges.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-semibold text-gray-900 mb-4 tracking-tight">Choose Your Knowledge Freedom</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Start free, upgrade when you're ready. No tricks, no hidden fees, no vendor lock-in.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white border-2 border-gray-200 p-8 rounded-xl text-center hover:border-gray-300 transition-all duration-200">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Starter</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
                <p className="text-gray-600 text-sm">Free forever</p>
              </div>

              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Up to 100 resources
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Basic search
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Web app access
                </li>
              </ul>

              <button className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                Get Started Free
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-xl text-center transform scale-105 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Professional</h3>
                <div className="text-4xl font-bold mb-1">$12<span className="text-lg font-normal">/month</span></div>
                <p className="text-blue-100 text-sm">or $99/year (save 25%)</p>
              </div>

              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-white mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited resources
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-white mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  AI-powered search
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-white mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Smart capture & tagging
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-white mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Priority support
                </li>
              </ul>

              <Link to="/signup" className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-center block shadow-lg">
                Start Free 14-Day Trial
              </Link>
            </div>

            <div className="bg-white border-2 border-gray-200 p-8 rounded-xl text-center hover:border-gray-300 transition-all duration-200">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">Custom</div>
                <p className="text-gray-600 text-sm">For teams & organizations</p>
              </div>

              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Everything in Professional
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Team collaboration
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Advanced analytics
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Dedicated success manager
                </li>
              </ul>

              <button className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                Contact Sales
              </button>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">All plans include 14-day free trial • No setup fees • Cancel anytime</p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <span>🔒 Enterprise-grade security</span>
              <span>📊 SOC 2 compliant</span>
              <span>🔄 Easy data export</span>
            </div>
          </div>
        </div>
      </section>

       {/* Final CTA Section */}
       <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
             <div className="text-center lg:text-left">
               <h2 className="text-4xl font-bold mb-6">Ready to Never Lose Another Great Idea?</h2>
               <p className="text-xl mb-8 text-blue-100">
                 Join 10,000+ knowledge workers who've transformed how they capture, organize, and retrieve information.
               </p>

               <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 mb-8">
                 <div className="grid md:grid-cols-3 gap-6 text-center">
                   <div>
                     <div className="text-3xl font-bold mb-2">5 min</div>
                     <div className="text-blue-100">Setup time</div>
                   </div>
                   <div>
                     <div className="text-3xl font-bold mb-2">85%</div>
                     <div className="text-blue-100">Time saved searching</div>
                   </div>
                   <div>
                     <div className="text-3xl font-bold mb-2">$0</div>
                     <div className="text-blue-100">To get started</div>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                 <Link to="/signup" className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                   Start Your Free Trial Now
                 </Link>
                 <button className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200">
                   Schedule a Demo
                 </button>
               </div>

               <p className="text-sm text-blue-100 mt-6">
                 No credit card required • 14-day free trial • Upgrade or cancel anytime
               </p>
             </div>

             <div className="text-center">
               <img
                 src="/assets/cta-knowledge-freedom.svg"
                 alt="Knowledge Freedom Illustration"
                 className="mx-auto rounded-xl shadow-2xl max-w-full h-auto"
               />
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