import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, RefreshCw, Mail, Lock, ArrowRight, Github } from 'lucide-react';
import Toast from '../components/Toast';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [retryCount, setRetryCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorMessage = (error: string): string => {
    switch (error.toLowerCase()) {
      case 'invalid credentials':
        return 'The email or password you entered is incorrect.';
      case 'validation failed':
        return 'Please check your input and try again.';
      case 'network error':
        return 'Unable to connect to the server.';
      case 'user not found':
        return 'No account found with this email address.';
      default:
        return error || 'An unexpected error occurred.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        setShowSuccessToast(true);
        setTimeout(() => {
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }, 1500);
      } else {
        const errorMessage = getErrorMessage(result.error || 'Login failed');
        setErrors({ general: errorMessage });
        setRetryCount(prev => prev + 1);
      }
    } catch (err) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setErrors({});
    handleSubmit({ preventDefault: () => { } } as React.FormEvent);
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Logging in with ${provider}`);
    navigate('/dashboard');
  };

  return (
    <>
      {showSuccessToast && (
        <Toast
          message="Login successful! Redirecting..."
          type="success"
          onClose={() => setShowSuccessToast(false)}
          duration={1500}
        />
      )}
      <div className="min-h-screen bg-void-950 flex font-sans text-starlight-100 selection:bg-neon-blue selection:text-white">
        {/* Left Side - Abstract Visual */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-void-900 items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-neon-blue/10 via-transparent to-neon-purple/10" />

          <div className="relative z-10 max-w-lg text-center p-12">
            <div className="mb-12 relative">
              <div className="absolute inset-0 bg-neon-blue/20 blur-[100px] rounded-full animate-pulse-soft" />
              <div className="relative w-64 h-64 mx-auto border border-starlight-100/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <div className="w-48 h-48 border border-starlight-100/20 rounded-full flex items-center justify-center animate-spin-slow">
                  <div className="w-32 h-32 border border-starlight-100/30 rounded-full" />
                </div>
              </div>
            </div>

            <h2 className="text-4xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-starlight-100 to-starlight-400">
              Welcome Back
            </h2>
            <p className="text-lg text-starlight-400 leading-relaxed">
              "The mind is not a vessel to be filled, but a fire to be kindled."
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
          <div className="absolute top-8 left-8">
            <Link to="/" className="text-starlight-400 hover:text-starlight-100 transition-colors flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-neon-blue flex items-center justify-center text-white font-bold shadow-lg shadow-neon-blue/20 group-hover:shadow-neon-blue/40 transition-all">N</div>
              <span className="font-medium hidden sm:block">Back to Home</span>
            </Link>
          </div>

          <div className="max-w-md w-full space-y-10">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-display font-bold text-starlight-100 mb-2">
                Sign in to NexusBrain
              </h1>
              <p className="text-starlight-400">
                Enter your details below to access your second brain.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {errors.general && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start animate-fade-in">
                  <AlertCircle className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">{errors.general}</p>
                    {retryCount > 0 && retryCount < 3 && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="mt-2 text-sm text-red-300 hover:text-red-200 font-medium flex items-center transition-colors"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  error={errors.email}
                  icon={<Mail className="w-5 h-5" />}
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-starlight-400 uppercase tracking-wider ml-1">
                      Password
                    </label>
                    <a href="#" className="text-xs font-medium text-neon-blue hover:text-neon-purple transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-starlight-500 group-focus-within:text-starlight-100 transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      className={`
                        w-full bg-void-950/50 border border-void-800 rounded-xl px-4 py-3 pl-10 pr-10
                        text-starlight-100 placeholder-starlight-500
                        focus:outline-none focus:border-starlight-100/30 focus:bg-void-900 focus:ring-1 focus:ring-starlight-100/30
                        transition-all duration-200
                        ${errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''}
                      `}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-starlight-500 hover:text-starlight-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400 ml-1 animate-fade-in">{errors.password}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-neon-blue focus:ring-neon-blue border-void-700 bg-void-900 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-starlight-400 cursor-pointer select-none">
                  Remember me for 30 days
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={loading}
                rightIcon={!loading && <ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-void-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-void-950 text-starlight-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSocialLogin('GitHub')}
                  leftIcon={<Github className="w-5 h-5" />}
                >
                  GitHub
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSocialLogin('Google')}
                  leftIcon={
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  }
                >
                  Google
                </Button>
              </div>
            </form>

            <p className="text-center text-sm text-starlight-400">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-neon-blue hover:text-neon-purple transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;