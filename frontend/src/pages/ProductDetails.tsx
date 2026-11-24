import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Flag,
  Heart,
  Image as ImageIcon,
  Lock,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch, resolveMediaUrl } from '../lib/api';
import type { ListingDetail } from '../types';

const pastelColors = ['bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-purple-100'];
const REPORT_REASONS = [
  'Misleading details',
  'Prohibited item',
  'Suspected scam',
  'Spam or duplicate',
  'Other',
];

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [product, setProduct] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);

  const [showContact, setShowContact] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportStatus, setReportStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSelectedPhotoIdx(0);
    apiFetch<ListingDetail>(`/api/listings/${id}`)
      .then((data) => setProduct(data))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Listing not found or no longer available.');
        } else {
          setError('Unable to load listing details.');
        }
      })
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading listing...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-16 text-center flex flex-col items-center gap-4">
        <p className="text-xl font-bold text-gray-700">{error || 'Product not found'}</p>
        <Link to="/" className="text-sm font-bold text-blue-600 hover:underline">
          ← Back to marketplace
        </Link>
      </div>
    );
  }

  const fallbackColor = pastelColors[product.listing_id % pastelColors.length];
  const photos = product.photos || [];
  const activePhotoUrl =
    photos.length > 0
      ? resolveMediaUrl(photos[selectedPhotoIdx]?.image_reference || photos[0].image_reference)
      : null;
  const isOwner = user?.student_id === product.seller_id;

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    try {
      const res = await apiFetch<{ is_favorited: boolean }>(
        `/api/favorites/${product.listing_id}`,
        { method: product.is_favorited ? 'DELETE' : 'POST' }
      );
      setProduct({ ...product, is_favorited: res.is_favorited });
    } catch {
      // Ignore transient error
    }
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Clipboard might be blocked on insecure origins
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setSubmittingReport(true);
    setReportStatus(null);
    try {
      await apiFetch(`/api/listings/${product.listing_id}/reports`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      setReportStatus({
        type: 'success',
        text: 'Report submitted. Thank you for helping keep Student Market safe.',
      });
      setReportDetails('');
      setReportOpen(false);
    } catch (err) {
      setReportStatus({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Failed to submit report.',
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="py-6">
      <Link
        to="/"
        className="text-sm font-medium text-blue-600 hover:underline mb-6 inline-block"
      >
        ← Back to results
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-2">
        {/* Left: Images */}
        <div className="flex flex-col gap-4">
          <div
            className={`w-full aspect-square rounded-2xl ${fallbackColor} flex items-center justify-center overflow-hidden border border-gray-100`}
          >
            {activePhotoUrl ? (
              <img
                src={activePhotoUrl}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-500/60">
                <ImageIcon className="w-14 h-14" />
                <span className="text-xs font-medium">No photos uploaded</span>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {photos.map((photo, idx) => {
                const thumbUrl = resolveMediaUrl(photo.image_reference);
                return (
                  <button
                    type="button"
                    key={photo.photo_id}
                    onClick={() => setSelectedPhotoIdx(idx)}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedPhotoIdx === idx
                        ? 'border-blue-600 shadow-sm'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    {thumbUrl && (
                      <img
                        src={thumbUrl}
                        alt={`${product.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
              {product.category_name}
            </span>
            {product.status !== 'Active' && (
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                {product.status}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
            {product.title}
          </h1>
          <span className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
            {Number(product.price).toLocaleString('ru-RU')} ₸
          </span>
          <p className="text-sm text-gray-500 mb-6">
            Condition: <span className="font-medium text-gray-700">{product.condition || 'Not specified'}</span>
          </p>

          <h3 className="font-bold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-8 whitespace-pre-line">
            {product.description || 'No description provided.'}
          </p>

          {/* Seller Box */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
              Seller
            </span>
            <span className="font-bold text-gray-900 text-base">
              {product.seller.full_name}
            </span>
            <span className="text-sm text-gray-500">{product.seller.university}</span>

            {/* Revealed Contact Info for Authenticated Users */}
            {showContact && product.seller_contact && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${product.seller_contact.university_email}?subject=${encodeURIComponent(
                      `Student Market: ${product.title}`
                    )}`}
                    className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline break-all"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    {product.seller_contact.university_email}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(product.seller_contact!.university_email)}
                    className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shrink-0"
                  >
                    {copiedEmail ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>

                {product.seller_contact.telegram_handle && (
                  <a
                    href={`https://t.me/${product.seller_contact.telegram_handle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    Telegram: {product.seller_contact.telegram_handle}
                  </a>
                )}

                {product.seller_contact.phone_number && (
                  <a
                    href={`tel:${product.seller_contact.phone_number}`}
                    className="inline-flex items-center gap-2 text-gray-700 font-medium hover:underline"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    {product.seller_contact.phone_number}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isOwner ? (
              <Link
                to={`/edit/${product.listing_id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl text-center transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit my listing
              </Link>
            ) : product.contact_requires_auth ? (
              <button
                type="button"
                onClick={() =>
                  navigate('/login', { state: { from: location.pathname } })
                }
                className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl text-center transition-colors"
              >
                <Lock className="w-4 h-4" />
                Sign in to contact seller
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowContact((prev) => !prev)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl text-center transition-colors"
              >
                {showContact ? 'Hide seller contact' : 'Contact seller'}
              </button>
            )}

            <button
              type="button"
              onClick={handleFavoriteToggle}
              className={`inline-flex items-center justify-center gap-2 border font-bold py-3.5 px-5 rounded-xl transition-colors ${
                product.is_favorited
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${product.is_favorited ? 'fill-current' : ''}`} />
              <span>{product.is_favorited ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          {/* Report Button & Form (non-owners only) */}
          {!isOwner && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { from: location.pathname } });
                    return;
                  }
                  setReportOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                Report this listing
              </button>

              {reportStatus && (
                <div
                  className={`mt-3 p-3.5 rounded-xl text-sm flex items-start gap-2 ${
                    reportStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{reportStatus.text}</span>
                </div>
              )}

              {reportOpen && (
                <form
                  onSubmit={handleReportSubmit}
                  className="mt-3 p-4 bg-white border border-gray-200 rounded-2xl flex flex-col gap-3"
                >
                  <label className="text-xs font-bold text-gray-900">
                    Reason for report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="p-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-blue-600"
                  >
                    {REPORT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Additional details (optional)"
                    className="p-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-blue-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReport}
                      className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg"
                    >
                      {submittingReport ? 'Submitting...' : 'Submit report'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
