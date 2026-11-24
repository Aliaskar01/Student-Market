import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

const UNIVERSITY_SUGGESTIONS = [
  'Kazakh-British Technical University (KBTU)',
  'Nazarbayev University (NU)',
  'Suleyman Demirel University (SDU)',
  'Al-Farabi KazNU',
  'IITU',
  'Satbayev University',
  'Astana IT University',
  'KIMEP University',
];

export default function AuthPage({
  initialMode = 'login',
}: {
  initialMode?: 'login' | 'register';
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authBooting, authConfig, login, register } = useAuth();

  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [email, setEmail] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLogin(initialMode === 'login');
    setError(null);
  }, [initialMode]);

  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/';

  if (!authBooting && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const minPwdLen = authConfig?.password_min_length ?? 8;
  const hasMinLen = password.length >= minPwdLen;
  const hasLetterAndDigit = /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const toggleMode = () => {
    const nextMode = !isLogin;
    setIsLogin(nextMode);
    setError(null);
    navigate(nextMode ? '/login' : '/register', {
      replace: true,
      state: location.state,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!isLogin) {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (university.trim().length < 2) {
        setError('Please enter your university name.');
        return;
      }
      if (!hasMinLen || !hasLetterAndDigit) {
        setError(
          `Password must be at least ${minPwdLen} characters and include at least one letter and one number.`
        );
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!acceptedTerms) {
        setError('Please accept the terms of use to create an account.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login({
          university_email: trimmedEmail,
          password,
          remember_me: rememberMe,
        });
      } else {
        await register({
          full_name: fullName.trim(),
          university_email: trimmedEmail,
          university: university.trim(),
          password,
          telegram_handle: telegramHandle.trim() || undefined,
          remember_me: rememberMe,
        });
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to reach the server. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isKeycloak = authConfig?.provider === 'keycloak';

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row md:min-h-[600px]">
        {/* Left Blue Panel */}
        <div className="w-full md:w-5/12 bg-blue-600 p-7 sm:p-10 md:p-14 flex flex-col justify-center text-white">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Student Market</h2>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mt-4 md:mt-10 leading-tight">
            Buy and sell within your student community.
          </h1>
          <p className="text-blue-100 mt-4 md:mt-6 text-sm md:text-base leading-relaxed">
            Focused listings, simple search and student-to-student contact — without losing offers in group chats.
          </p>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 md:p-14 flex flex-col justify-center">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {isLogin ? 'Welcome back' : 'Student-only marketplace'}
          </span>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            {isLogin ? 'Sign in to Student Market' : 'Create your student account'}
          </h2>

          <p className="text-sm text-gray-500 mt-2 mb-6">
            {isLogin
              ? 'Use your email and password to access selling, saved items, and seller contacts.'
              : 'Create your student account to publish items and contact campus sellers.'}
          </p>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isKeycloak ? (
            <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                University Single Sign-On (Keycloak)
              </div>
              <p className="text-sm text-blue-700">
                Authentication is managed by your university identity provider.
              </p>
              <a
                href={`${authConfig?.keycloak?.issuer}/protocol/openid-connect/auth?client_id=${encodeURIComponent(authConfig?.keycloak?.client_id || '')}&response_type=code&scope=openid%20profile%20email&redirect_uri=${encodeURIComponent(window.location.origin)}`}
                className="w-full py-3.5 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                Continue with Keycloak SSO
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {!isLogin && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="full-name" className="text-sm font-bold text-gray-900">
                        Full name
                      </label>
                      <input
                        id="full-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Aibar Khamitov"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-base sm:text-sm text-gray-900"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="university" className="text-sm font-bold text-gray-900">
                        University
                      </label>
                      <input
                        id="university"
                        type="text"
                        list="university-list"
                        placeholder="e.g. KBTU"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        required
                        className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-base sm:text-sm text-gray-900"
                      />
                      <datalist id="university-list">
                        {UNIVERSITY_SUGGESTIONS.map((u) => (
                          <option key={u} value={u} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-email" className="text-sm font-bold text-gray-900">
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-base sm:text-sm text-gray-900"
                />
              </div>

              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="telegram-handle" className="text-sm font-bold text-gray-900">
                    Telegram username <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="telegram-handle"
                    type="text"
                    placeholder="@username (for faster buyer contact)"
                    value={telegramHandle}
                    onChange={(e) => setTelegramHandle(e.target.value)}
                    className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-base sm:text-sm text-gray-900"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="auth-password" className="text-sm font-bold text-gray-900">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full p-3.5 pr-11 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-base sm:text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {!isLogin && password.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-1 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        hasMinLen ? 'text-green-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> {minPwdLen}+ characters
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        hasLetterAndDigit ? 'text-green-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Letter & number
                    </span>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className="text-sm font-bold text-gray-900">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full p-3.5 pr-11 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-base sm:text-sm text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <span className="text-xs text-red-600">Passwords do not match.</span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2.5 mt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-gray-600">Keep me signed in on this device</span>
                </label>

                {!isLogin && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      required
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-600">
                      I agree to the marketplace rules and terms of use
                    </span>
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                {submitting
                  ? isLogin
                    ? 'Signing in...'
                    : 'Creating account...'
                  : isLogin
                  ? 'Sign in'
                  : 'Create account'}
              </button>
            </form>
          )}

          {!isKeycloak && (
            <div className="mt-6 text-sm text-gray-500">
              {isLogin ? 'New here? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-bold text-blue-600 hover:underline"
              >
                {isLogin ? 'Create student account' : 'Sign in'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
