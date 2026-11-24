import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch, resolveMediaUrl } from '../lib/api';
import type { Category, ListingDetail, ListingPhoto } from '../types';

const CONDITIONS = ['New', 'Like new', 'Good', 'Used'];
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface PendingPhoto {
  file: File;
  previewUrl: string;
}

export default function CreateListing() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category_id: 0,
    condition: 'Good',
    description: '',
    status: 'Active',
  });

  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ListingPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const pendingPhotosRef = useRef<PendingPhoto[]>([]);
  pendingPhotosRef.current = pendingPhotos;

  const [loadingPage, setLoadingPage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Clean up remaining preview blob URLs only when component unmounts
  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingPage(true);
    setError(null);

    const loadInitialData = async () => {
      try {
        const categories = await apiFetch<Category[]>('/api/categories', {
          skipAuth: true,
        });
        if (!active) return;
        setDbCategories(categories);

        if (isEditMode && id) {
          const listing = await apiFetch<ListingDetail>(`/api/listings/${id}`);
          if (!active) return;
          if (user && listing.seller_id !== user.student_id) {
            setForbidden(true);
            return;
          }
          setFormData({
            title: listing.title,
            price: String(listing.price),
            category_id: listing.category_id,
            condition: listing.condition || 'Good',
            description: listing.description || '',
            status: listing.status || 'Active',
          });
          setExistingPhotos(listing.photos || []);
        } else if (categories.length > 0) {
          setFormData((prev) => ({
            ...prev,
            category_id: categories[0].category_id,
          }));
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load listing form data.'
        );
      } finally {
        if (active) setLoadingPage(false);
      }
    };

    loadInitialData();
    return () => {
      active = false;
    };
  }, [id, isEditMode, user]);

  const totalPhotoCount = existingPhotos.length + pendingPhotos.length;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setError(null);
    const remainingSlots = MAX_PHOTOS - totalPhotoCount;
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed per listing.`);
      return;
    }

    const accepted: PendingPhoto[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (JPG, PNG, WEBP, GIF) are allowed.');
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" exceeds the 5 MB image size limit.`);
        continue;
      }
      accepted.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length > 0) {
      setPendingPhotos((prev) => [...prev, ...accepted]);
    }
  };

  const handleRemovePendingPhoto = (index: number) => {
    setPendingPhotos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleDeleteExistingPhoto = async (photoId: number) => {
    if (!id) return;
    try {
      await apiFetch(`/api/listings/${id}/photos/${photoId}`, {
        method: 'DELETE',
      });
      setExistingPhotos((prev) => prev.filter((p) => p.photo_id !== photoId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove photo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.title.trim().length < 2) {
      setError('Title must be at least 2 characters.');
      return;
    }
    const numericPrice = Number(formData.price);
    if (formData.price === '' || Number.isNaN(numericPrice) || numericPrice < 0) {
      setError('Please enter a valid non-negative price.');
      return;
    }
    if (!formData.category_id) {
      setError('Please select a category.');
      return;
    }

    setSubmitting(true);
    try {
      let targetListingId = Number(id);

      if (isEditMode && id) {
        await apiFetch(`/api/listings/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: formData.title.trim(),
            price: numericPrice,
            category_id: Number(formData.category_id),
            condition: formData.condition,
            usage_state: formData.condition,
            description: formData.description.trim(),
            status: formData.status,
          }),
        });
      } else {
        const created = await apiFetch<{ listing_id: number }>('/api/listings', {
          method: 'POST',
          body: JSON.stringify({
            title: formData.title.trim(),
            price: numericPrice,
            category_id: Number(formData.category_id),
            condition: formData.condition,
            usage_state: formData.condition,
            description: formData.description.trim(),
            status: formData.status === 'Draft' ? 'Draft' : 'Active',
          }),
        });
        targetListingId = created.listing_id;
      }

      // Upload queued photos sequentially
      for (const pending of pendingPhotos) {
        const body = new FormData();
        body.append('file', pending.file);
        await apiFetch(`/api/listings/${targetListingId}/photos`, {
          method: 'POST',
          body,
        });
      }

      navigate(isEditMode ? '/my-listings' : `/product/${targetListingId}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to save listing. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-500">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading form...</span>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center flex flex-col items-center gap-4">
        <p className="text-lg font-bold text-gray-900">
          You can only edit your own listings.
        </p>
        <button
          type="button"
          onClick={() => navigate('/my-listings')}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold"
        >
          Go to my listings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        {isEditMode ? 'Edit listing' : 'Create a listing'}
      </h1>
      <p className="text-sm text-gray-500 mb-6 sm:mb-8">
        Add the essential details students need before contacting you.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6"
      >
        {/* Title and Price Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="listing-title" className="text-sm font-bold text-gray-900">
              Title
            </label>
            <input
              id="listing-title"
              required
              type="text"
              value={formData.title}
              placeholder="e.g. Calculus textbook"
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="listing-price" className="text-sm font-bold text-gray-900">
              Price (₸)
            </label>
            <input
              id="listing-price"
              required
              type="number"
              min={0}
              inputMode="numeric"
              value={formData.price}
              placeholder="e.g. 12000"
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none transition-colors text-sm text-gray-900"
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
        </div>

        {/* Category, Condition, Status Row */}
        <div
          className={`grid grid-cols-1 ${
            isEditMode ? 'md:grid-cols-3' : 'md:grid-cols-2'
          } gap-5 sm:gap-6`}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="listing-category" className="text-sm font-bold text-gray-900">
              Category
            </label>
            <select
              id="listing-category"
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none bg-white text-sm text-gray-900"
              value={formData.category_id}
              onChange={(e) =>
                setFormData({ ...formData, category_id: Number(e.target.value) })
              }
            >
              {dbCategories.length === 0 && <option value={0}>No categories available</option>}
              {dbCategories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="listing-condition" className="text-sm font-bold text-gray-900">
              Condition
            </label>
            <select
              id="listing-condition"
              className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none bg-white text-sm text-gray-900"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            >
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>

          {isEditMode && (
            <div className="flex flex-col gap-2">
              <label htmlFor="listing-status" className="text-sm font-bold text-gray-900">
                Status
              </label>
              <select
                id="listing-status"
                className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none bg-white text-sm text-gray-900"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Sold">Sold</option>
              </select>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label htmlFor="listing-desc" className="text-sm font-bold text-gray-900">
            Description
          </label>
          <textarea
            id="listing-desc"
            required
            rows={4}
            value={formData.description}
            placeholder="Describe item details, defects and campus pickup notes"
            className="p-3.5 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none resize-none transition-colors text-sm text-gray-900"
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Photo Upload & Previews */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-900">
              Photos <span className="text-gray-400 font-normal">({totalPhotoCount}/{MAX_PHOTOS})</span>
            </label>
            <span className="text-xs text-gray-500">JPG, PNG, WEBP up to 5 MB each</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />

          {totalPhotoCount < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <ImagePlus className="w-7 h-7 text-blue-600" />
              <span className="font-bold text-gray-900 text-sm">Add product photos</span>
              <span className="text-xs text-gray-500">
                Tap to choose from camera or gallery
              </span>
            </button>
          )}

          {(existingPhotos.length > 0 || pendingPhotos.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-1">
              {existingPhotos.map((photo) => {
                const src = resolveMediaUrl(photo.image_reference);
                return (
                  <div
                    key={photo.photo_id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
                  >
                    {src && (
                      <img
                        src={src}
                        alt="Existing listing"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingPhoto(photo.photo_id)}
                      aria-label="Delete photo"
                      className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {pendingPhotos.map((pending, idx) => (
                <div
                  key={pending.previewUrl}
                  className="relative aspect-square rounded-xl overflow-hidden border border-blue-200 bg-gray-100"
                >
                  <img
                    src={pending.previewUrl}
                    alt={`Upload preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePendingPhoto(idx)}
                    aria-label="Remove queued photo"
                    className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate(isEditMode ? '/my-listings' : '/')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-sm"
          >
            {submitting
              ? isEditMode
                ? 'Saving changes...'
                : 'Publishing...'
              : isEditMode
              ? 'Save changes'
              : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
