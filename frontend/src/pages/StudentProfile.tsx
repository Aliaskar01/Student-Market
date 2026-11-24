import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Laptop, LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch, getInitials, getStoredRefreshToken } from '../lib/api';
import type { User, UserSession } from '../types';

export default function StudentProfile() {
  const navigate = useNavigate();
  const { user, setUser, logout, logoutAll } = useAuth();

  const [personalInfo, setPersonalInfo] = useState({
    full_name: user?.full_name || '',
    university: user?.university || '',
    university_email: user?.university_email || '',
    telegram_handle: user?.telegram_handle || '',
    phone_number: user?.phone_number || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (user) {
      setPersonalInfo({
        full_name: user.full_name,
        university: user.university,
        university_email: user.university_email,
        telegram_handle: user.telegram_handle || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const refresh = getStoredRefreshToken();
      const qs = refresh ? `?refresh_token=${encodeURIComponent(refresh)}` : '';
      const list = await apiFetch<UserSession[]>(`/api/auth/sessions${qs}`);
      setSessions(list);
    } catch {
      // Ignore if session lookup fails
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (!user) return null;

  const initials = getInitials(user.full_name);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setProfileSaving(true);
    try {
      const updated = await apiFetch<User>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: personalInfo.full_name.trim(),
          university: personalInfo.university.trim(),
          university_email: personalInfo.university_email.trim(),
          telegram_handle: personalInfo.telegram_handle.trim(),
          phone_number: personalInfo.phone_number.trim(),
        }),
      });
      setUser(updated);
      setProfileFeedback({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Unable to save profile changes.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleResetProfileForm = () => {
    setPersonalInfo({
      full_name: user.full_name,
      university: user.university,
      university_email: user.university_email,
      telegram_handle: user.telegram_handle || '',
      phone_number: user.phone_number || '',
    });
    setProfileFeedback(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);

    if (passwords.new_password !== passwords.confirm_password) {
      setPwdFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwdSaving(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      setPwdFeedback({ type: 'success', text: 'Password updated successfully.' });
    } catch (err) {
      setPwdFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to update password.',
      });
    } finally {
      setPwdSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    try {
      await apiFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch {
      // Ignore transient error
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const handleSignOutAll = async () => {
    await logoutAll();
    navigate('/login');
  };

  const isMobileUa = (ua: string | null) =>
    Boolean(ua && /mobile|android|iphone|ipad/i.test(ua));

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-10 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My profile</h1>
        <p className="text-sm text-gray-500">
          Manage your personal information, contact methods, and active sessions.
        </p>
      </div>

      {/* Card 1: Personal Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold text-gray-900 truncate">
                {user.full_name}
              </span>
              <span className="text-sm text-gray-500 font-medium truncate">
                {user.university} · {user.auth_provider === 'keycloak' ? 'Keycloak SSO' : 'Student account'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        <hr className="my-6 sm:my-8 border-gray-100" />

        <h2 className="text-lg font-bold text-gray-900 mb-5">Personal information</h2>

        {profileFeedback && (
          <div
            className={`mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
              profileFeedback.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {profileFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{profileFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-name" className="text-sm font-bold text-gray-900">
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={personalInfo.full_name}
                onChange={(e) =>
                  setPersonalInfo({ ...personalInfo, full_name: e.target.value })
                }
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-uni" className="text-sm font-bold text-gray-900">
                University
              </label>
              <input
                id="profile-uni"
                type="text"
                required
                placeholder="Enter your university"
                value={personalInfo.university}
                onChange={(e) =>
                  setPersonalInfo({ ...personalInfo, university: e.target.value })
                }
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-email" className="text-sm font-bold text-gray-900">
              Email address
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={personalInfo.university_email}
              onChange={(e) =>
                setPersonalInfo({ ...personalInfo, university_email: e.target.value })
              }
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-tg" className="text-sm font-bold text-gray-900">
                Telegram handle <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="profile-tg"
                type="text"
                placeholder="@username"
                value={personalInfo.telegram_handle}
                onChange={(e) =>
                  setPersonalInfo({ ...personalInfo, telegram_handle: e.target.value })
                }
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-phone" className="text-sm font-bold text-gray-900">
                Phone / WhatsApp <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                placeholder="+7 700 000 00 00"
                value={personalInfo.phone_number}
                onChange={(e) =>
                  setPersonalInfo({ ...personalInfo, phone_number: e.target.value })
                }
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={handleResetProfileForm}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={profileSaving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm"
            >
              {profileSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Account Security */}
      {user.auth_provider === 'local' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Account security</h2>
          <p className="text-sm text-gray-500 mb-6">
            Keep your account secure with a strong, unique password.
          </p>

          {pwdFeedback && (
            <div
              className={`mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
                pwdFeedback.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {pwdFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{pwdFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="cur-pwd" className="text-sm font-bold text-gray-900">
                  Current password
                </label>
                <input
                  id="cur-pwd"
                  type="password"
                  required
                  placeholder="Current password"
                  value={passwords.current_password}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current_password: e.target.value })
                  }
                  className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="new-pwd" className="text-sm font-bold text-gray-900">
                  New password
                </label>
                <input
                  id="new-pwd"
                  type="password"
                  required
                  placeholder="8+ chars, letter & number"
                  value={passwords.new_password}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new_password: e.target.value })
                  }
                  className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="conf-pwd" className="text-sm font-bold text-gray-900">
                  Confirm new password
                </label>
                <input
                  id="conf-pwd"
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={passwords.confirm_password}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm_password: e.target.value })
                  }
                  className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <div className="mt-1">
              <button
                type="submit"
                disabled={pwdSaving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm"
              >
                {pwdSaving ? 'Updating...' : 'Change password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Card 3: Active Sessions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Active sessions</h2>
            <p className="text-sm text-gray-500">
              Devices currently signed into your Student Market account.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOutAll}
            className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors self-start sm:self-auto"
          >
            Sign out all devices
          </button>
        </div>

        {loadingSessions ? (
          <p className="text-sm text-gray-500">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No active sessions recorded.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {sessions.map((sess) => {
              const mobile = isMobileUa(sess.user_agent);
              return (
                <div
                  key={sess.session_id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600 shrink-0">
                      {mobile ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 truncate max-w-xs sm:max-w-md">
                          {mobile ? 'Mobile browser' : 'Desktop browser'}
                        </span>
                        {sess.is_current && (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[11px] font-bold">
                            This device
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate max-w-xs sm:max-w-lg">
                        {sess.user_agent || 'Browser session'}
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        Last active {new Date(sess.last_used_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {!sess.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(sess.session_id)}
                      className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 self-start sm:self-center"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
