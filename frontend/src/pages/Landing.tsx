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

       {/* Hero Banner - Clean & Engaging */}
       <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 py-20 overflow-hidden">
         {/* Background Pattern */}
         <div className="absolute inset-0 bg-black bg-opacity-20"></div>
         <div className="absolute inset-0" style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
         }}></div>

         <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center text-white">
             {/* Subtle Badge - Secondary importance */}
             <div className="mb-4">
               <span className="inline-block px-4 py-2 text-xs font-medium text-blue-200 bg-white/5 rounded-full border border-white/10">
                 Never Lose Another Great Idea
               </span>
             </div>

              {/* Primary Headline - Most important */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 md:mb-8 tracking-tight leading-tight">
                Never Lose Another
                <span className="block text-blue-200 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl mt-1 md:mt-2">Great Idea Again</span>
              </h1>

              {/* Secondary Subheadline */}
              <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                Stop wasting hours searching for that article you saved 6 months ago. Our AI understands your thoughts and finds exactly what you need in seconds.
              </p>

              {/* Primary CTA - High importance */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-12 md:mb-16 px-4 sm:px-0">
                <Link
                  to="/signup"
                  className="bg-white text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105"
                >
                  Start Your Free Trial
                </Link>
                <button className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200 hover:scale-105">
                  Watch 2-Minute Demo
                </button>
              </div>

              {/* Tertiary Visual Element - Supporting */}
              <div className="mb-8 md:mb-12 relative px-4 sm:px-0">
                {/* Main large image with creative positioning */}
                <div className="flex justify-center">
                  <div className="relative max-w-sm sm:max-w-md md:max-w-lg">
                    {/* Primary large image */}
                    <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white border-opacity-40 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 motion-reduce:transform-none mx-auto">
                      <img
                        src="/assets/hero-illustration-2.png"
                        alt="Personal Resource Manager - Smart Knowledge Organization"
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>

                    {/* Secondary image as floating card - Hidden on small screens */}
                    <div className="hidden sm:block absolute -bottom-6 -right-6 md:-bottom-8 md:-right-8 w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-3 border-white border-opacity-60 shadow-xl transform -rotate-12 hover:-rotate-6 transition-transform duration-500 motion-reduce:transform-none">
                      <img
                        src="/assets/hero-illustration.png"
                        alt="Knowledge Organization"
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                      {/* Small indicator */}
                      <div className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">2</span>
                      </div>
                    </div>

                    {/* Floating geometric elements - Hidden on small screens */}
                    <div className="hidden sm:block absolute -top-4 -left-4 md:-top-6 md:-left-6 w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg transform rotate-45 opacity-80 shadow-lg"></div>
                    <div className="hidden sm:block absolute -bottom-3 left-6 md:-bottom-4 md:left-8 w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-60 shadow-lg"></div>
                    <div className="hidden sm:block absolute top-6 -right-8 md:top-8 md:-right-12 w-7 h-7 md:w-10 md:h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg transform -rotate-12 opacity-70 shadow-lg"></div>
                  </div>
                </div>
              </div>

              {/* Trust signals - Least important */}
              <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-2 sm:gap-6 text-xs sm:text-sm text-blue-200 px-4 sm:px-0">
                <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                  <span className="flex items-center">
                    <span className="text-green-400 mr-1 sm:mr-2 text-sm sm:text-base">✓</span>
                    Free 14-day trial
                  </span>
                  <span className="flex items-center">
                    <span className="text-green-400 mr-1 sm:mr-2 text-sm sm:text-base">✓</span>
                    No credit card required
                  </span>
                  <span className="flex items-center">
                    <span className="text-green-400 mr-1 sm:mr-2 text-sm sm:text-base">✓</span>
                    Cancel anytime
                  </span>
                </div>
                <div className="text-center mt-2 sm:mt-0">
                  <span className="text-blue-100 text-xs sm:text-sm">Join 10,000+ knowledge workers</span>
                </div>
              </div>

            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-white bg-opacity-10 rounded-full blur-xl animate-pulse motion-reduce:animate-none"></div>
          <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-300 bg-opacity-20 rounded-full blur-2xl animate-pulse motion-reduce:animate-none" style={{animationDelay: '1s'}}></div>
        </section>

       {/* Social Proof Stats */}
       <section className="py-16 bg-white border-t border-gray-100">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid md:grid-cols-4 gap-8 text-center">
             <div>
               <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">10,000+</div>
               <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Users</div>
             </div>
             <div>
               <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">2.5M+</div>
               <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Resources Saved</div>
             </div>
             <div>
               <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">85%</div>
               <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Time Saved</div>
             </div>
             <div>
               <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">4.9/5</div>
               <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">User Rating</div>
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
             <div className="transform hover:scale-105 transition-transform duration-300">
               <h3 className="text-2xl font-semibold text-gray-900 mb-4">The "I Know I Saved This Somewhere" Problem</h3>
               <p className="text-gray-600 mb-6">You remember seeing that perfect article 3 months ago, but now it's lost in your browser bookmarks, email archives, or that "misc" folder on your desktop. With traditional tools, finding it means hours of frustrated searching.</p>
               <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded hover:bg-blue-100 transition-colors duration-200">
                 <p className="text-blue-800 font-medium">Our Solution: Ask "that productivity article about time blocking" and get instant results.</p>
               </div>
             </div>
              <div className="bg-white p-8 rounded-xl shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300">
                <img
                  src="/assets/problem1-scattering.png"
                  alt="The Scattering Problem - Knowledge Lost Across Multiple Apps"
                  className="w-full h-auto rounded-lg"
                  loading="lazy"
                />
              </div>
           </div>

           <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
             <div className="order-2 lg:order-1 transform hover:scale-105 transition-transform duration-300">
               <h3 className="text-2xl font-semibold text-gray-900 mb-4">The "Too Many Apps" Chaos</h3>
               <p className="text-gray-600 mb-6">Your knowledge is scattered across Evernote, Notion, Google Keep, browser bookmarks, voice memos, and who-knows-what-else. Switching between apps wastes time and breaks your flow.</p>
               <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded hover:bg-green-100 transition-colors duration-200">
                 <p className="text-green-800 font-medium">Our Solution: One place for everything, accessible from anywhere.</p>
               </div>
             </div>
              <div className="order-1 lg:order-2 bg-white p-8 rounded-xl shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300">
                <img
                  src="/assets/problem2-unifiedhub.png"
                  alt="The Unified Solution - All Knowledge in One Place"
                  className="w-full h-auto rounded-lg"
                  loading="lazy"
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
               <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl md:text-2xl font-bold shadow-lg">1</div>
               <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 tracking-tight">Capture Resources</h3>
               <p className="text-base text-gray-600 leading-relaxed">Add notes, save reels, or upload files from anywhere.</p>
             </div>
             <div className="text-center">
               <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl md:text-2xl font-bold shadow-lg">2</div>
               <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 tracking-tight">AI Processes</h3>
               <p className="text-base text-gray-600 leading-relaxed">Our AI analyzes and tags your resources automatically.</p>
             </div>
             <div className="text-center">
               <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl md:text-2xl font-bold shadow-lg">3</div>
               <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 tracking-tight">Search & Retrieve</h3>
               <p className="text-base text-gray-600 leading-relaxed">Find anything with natural language search instantly.</p>
             </div>
           </div>
           <div className="mt-16 text-center">
             <div className="inline-flex items-center space-x-6 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
               <div className="w-10 h-10 bg-blue-600 rounded-lg shadow-md"></div>
               <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
               <div className="w-10 h-10 bg-teal-600 rounded-lg shadow-md"></div>
               <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
               <div className="w-10 h-10 bg-orange-600 rounded-lg shadow-md"></div>
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
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl border border-blue-200 transform hover:scale-105 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md">SJ</div>
                  <div className="ml-4">
                    <h4 className="font-bold text-gray-900 text-lg">Sarah Johnson</h4>
                    <p className="text-gray-600 text-sm font-medium">Content Creator & Entrepreneur</p>
                  </div>
                </div>
                <blockquote className="text-gray-800 mb-6 text-base leading-relaxed font-medium">
                  "I used to spend 2 hours every week searching for content I knew I had saved. Now I find anything in 30 seconds. This app paid for itself in the first month."
                </blockquote>
                <div className="flex text-yellow-500 text-lg">
                  ★★★★★
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl border border-green-200 transform hover:scale-105 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md">MR</div>
                  <div className="ml-4">
                    <h4 className="font-bold text-gray-900 text-lg">Marcus Rodriguez</h4>
                    <p className="text-gray-600 text-sm font-medium">Graduate Student</p>
                  </div>
                </div>
                <blockquote className="text-gray-800 mb-6 text-base leading-relaxed font-medium">
                  "As a PhD student, I collect hundreds of research papers and articles. Before this, organization was impossible. Now I can ask 'papers about machine learning ethics' and get exactly what I need."
                </blockquote>
                <div className="flex text-yellow-500 text-lg">
                  ★★★★★
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl border border-purple-200 transform hover:scale-105 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md">LK</div>
                  <div className="ml-4">
                    <h4 className="font-bold text-gray-900 text-lg">Lisa Kim</h4>
                    <p className="text-gray-600 text-sm font-medium">Product Manager</p>
                  </div>
                </div>
                <blockquote className="text-gray-800 mb-6 text-base leading-relaxed font-medium">
                  "I save everything - meeting notes, competitor research, user feedback, design inspiration. This app turned my scattered knowledge into a superpower. My work quality improved dramatically."
                </blockquote>
                <div className="flex text-yellow-500 text-lg">
                  ★★★★★
                </div>
              </div>
          </div>

           {/* Trust Indicators */}
           <div className="text-center mt-16">
             <p className="text-gray-700 mb-8 text-lg font-medium">Trusted by professionals at</p>
             <div className="flex flex-wrap justify-center items-center gap-8 opacity-80">
               <div className="text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors">Google</div>
               <div className="text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors">Microsoft</div>
               <div className="text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors">Adobe</div>
               <div className="text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors">Shopify</div>
               <div className="text-gray-600 font-bold text-lg hover:text-gray-900 transition-colors">Notion</div>
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
               <div className="mb-8">
                 <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">Starter</h3>
                 <div className="text-3xl font-bold text-gray-900 mb-2">$0</div>
                 <p className="text-gray-600 text-sm font-medium">Free forever</p>
               </div>

               <ul className="text-left space-y-4 mb-8">
                 <li className="flex items-start text-sm text-gray-700">
                   <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Up to 100 resources</span>
                 </li>
                 <li className="flex items-start text-sm text-gray-700">
                   <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Basic search</span>
                 </li>
                 <li className="flex items-start text-sm text-gray-700">
                   <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Web app access</span>
                 </li>
               </ul>

               <button className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-semibold">
                 Get Started Free
               </button>
             </div>

             <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-xl text-center transform scale-105 shadow-xl relative">
               <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                 <span className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
               </div>

               <div className="mb-8">
                 <h3 className="text-xl font-bold mb-3 tracking-tight">Professional</h3>
                 <div className="text-3xl font-bold mb-2">$12<span className="text-lg font-normal">/month</span></div>
                 <p className="text-blue-100 text-sm font-medium">or $99/year (save 25%)</p>
               </div>

               <ul className="text-left space-y-4 mb-8">
                 <li className="flex items-start text-sm">
                   <svg className="w-5 h-5 text-white mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Unlimited resources</span>
                 </li>
                 <li className="flex items-start text-sm">
                   <svg className="w-5 h-5 text-white mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>AI-powered search</span>
                 </li>
                 <li className="flex items-start text-sm">
                   <svg className="w-5 h-5 text-white mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Smart capture & tagging</span>
                 </li>
                 <li className="flex items-start text-sm">
                   <svg className="w-5 h-5 text-white mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Priority support</span>
                 </li>
               </ul>

               <Link to="/signup" className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-center block shadow-lg">
                 Start Free 14-Day Trial
               </Link>
             </div>

             <div className="bg-white border-2 border-gray-200 p-8 rounded-xl text-center hover:border-gray-300 transition-all duration-200">
               <div className="mb-8">
                 <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">Enterprise</h3>
                 <div className="text-3xl font-bold text-gray-900 mb-2">Custom</div>
                 <p className="text-gray-600 text-sm font-medium">For teams & organizations</p>
               </div>

               <ul className="text-left space-y-4 mb-8">
                 <li className="flex items-start text-sm text-gray-700">
                   <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Everything in Professional</span>
                 </li>
                 <li className="flex items-start text-sm text-gray-700">
                   <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Team collaboration</span>
                 </li>
                 <li className="flex items-start text-sm text-gray-700">
                   <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Advanced analytics</span>
                 </li>
                 <li className="flex items-start text-sm text-gray-700">
                   <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                   <span>Dedicated success manager</span>
                 </li>
               </ul>

               <button className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-semibold">
                 Contact Sales
               </button>
             </div>
          </div>

           <div className="text-center mt-16">
             <p className="text-gray-700 mb-6 text-base font-medium">All plans include 14-day free trial • No setup fees • Cancel anytime</p>
             <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
               <span className="flex items-center">
                 <span className="text-lg mr-2">🔒</span>
                 Enterprise-grade security
               </span>
               <span className="flex items-center">
                 <span className="text-lg mr-2">📊</span>
                 SOC 2 compliant
               </span>
               <span className="flex items-center">
                 <span className="text-lg mr-2">🔄</span>
                 Easy data export
               </span>
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

                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white border-opacity-20">
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-4xl font-bold mb-3 tracking-tight">5 min</div>
                      <div className="text-blue-100 text-sm font-medium uppercase tracking-wide">Setup time</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold mb-3 tracking-tight">85%</div>
                      <div className="text-blue-100 text-sm font-medium uppercase tracking-wide">Time saved searching</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold mb-3 tracking-tight">$0</div>
                      <div className="text-blue-100 text-sm font-medium uppercase tracking-wide">To get started</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <Link to="/signup" className="bg-white text-blue-600 px-10 py-4 rounded-lg text-lg font-bold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105">
                    Start Your Free Trial Now
                  </Link>
                  <button className="border-2 border-white text-white px-10 py-4 rounded-lg text-lg font-bold hover:bg-white hover:text-blue-600 transition-all duration-200 hover:scale-105">
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
                  loading="lazy"
                />
             </div>
           </div>
         </div>
       </section>

       {/* Footer */}
       <footer className="bg-gray-900 text-white py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="grid md:grid-cols-4 gap-8">
             <div>
               <h3 className="text-2xl font-bold mb-4 tracking-tight">Personal Resource Manager</h3>
               <p className="text-gray-300 text-base leading-relaxed">Your AI-powered second brain for managing digital resources.</p>
             </div>
             <div>
               <h4 className="text-lg font-bold mb-6 text-white">Product</h4>
               <ul className="space-y-3">
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">Features</a></li>
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">Pricing</a></li>
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">API</a></li>
               </ul>
             </div>
             <div>
               <h4 className="text-lg font-bold mb-6 text-white">Company</h4>
               <ul className="space-y-3">
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">About</a></li>
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">Blog</a></li>
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">Careers</a></li>
               </ul>
             </div>
             <div>
               <h4 className="text-lg font-bold mb-6 text-white">Support</h4>
               <ul className="space-y-3">
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">Help Center</a></li>
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">Contact</a></li>
                 <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-base">Privacy</a></li>
               </ul>
             </div>
           </div>
           <div className="border-t border-gray-800 mt-12 pt-8 text-center">
             <p className="text-gray-400 text-sm">&copy; 2023 Personal Resource Manager. All rights reserved.</p>
           </div>
         </div>
       </footer>
    </div>
  );
};

export default Landing;