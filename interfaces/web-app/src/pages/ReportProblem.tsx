import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { problemsApi, mediaApi, PROBLEM_CATEGORIES, type UploadedMedia } from '../lib/api';
import { useAuth } from '../store/auth';

function ReportProblem() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('roads');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      problemsApi.create({
        userId: user!.id,
        title: title.trim(),
        description: description.trim(),
        category,
        address: address.trim() || undefined,
        latitude: Number(lat),
        longitude: Number(lng),
        mediaUrls: photos.map((p) => p.url),
      }),
    onSuccess: (problem) => navigate(`/problem/${problem.id}`),
  });

  const handlePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      // Upload sequentially so one failure doesn't lose the others.
      for (const file of Array.from(files)) {
        const media = await mediaApi.upload(file);
        setPhotos((prev) => [...prev, media]);
      }
    } catch {
      setUploadError('One or more photos failed to upload. You can still submit without them.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (id: string) =>
    setPhotos((prev) => prev.filter((p) => p.id !== id));

  const useMyLocation = () => {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not available in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => {
        setGeoError(err.message || 'Could not get your location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!user) {
    return (
      <div className="detail-page">
        <h1>Report a Problem</h1>
        <p className="muted">Sign in to report a problem in your community.</p>
      </div>
    );
  }

  const hasLocation = lat !== '' && lng !== '';
  const canSubmit =
    title.trim().length >= 3 && description.trim().length >= 3 && hasLocation;

  return (
    <div className="detail-page">
      <h1>📢 Report a Problem</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Spotted something that needs fixing? Report it in seconds.
      </p>

      <form
        className="report-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) mutation.mutate();
        }}
      >
        <label className="field">
          <span>Title</span>
          <input
            
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Large pothole on Main St"
            maxLength={120}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem, its severity, and any risk it poses."
            rows={4}
          />
        </label>

        <label className="field">
          <span>Category</span>
          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {PROBLEM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Location</span>
          <div className="location-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={useMyLocation}
              disabled={locating}
            >
              {locating ? 'Locating…' : '📍 Use my location'}
            </button>
            {hasLocation && (
              <span className="location-coords">
                {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
              </span>
            )}
          </div>
          <div className="latlng-row">
            <input
              
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              inputMode="decimal"
            />
            <input
              
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              inputMode="decimal"
            />
          </div>
          {geoError && <div className="form-error">{geoError}</div>}
        </div>

        <label className="field">
          <span>Address (optional)</span>
          <input
            
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Nearest street address or landmark"
          />
        </label>

        <div className="field">
          <span>Photos (optional)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="file-input"
            disabled={uploading}
            onChange={(e) => {
              handlePhotos(e.target.files);
              e.target.value = ''; // allow re-selecting the same file
            }}
          />
          {uploading && <div className="muted">Uploading…</div>}
          {uploadError && <div className="form-error">{uploadError}</div>}
          {photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((p) => (
                <div key={p.id} className="photo-thumb">
                  <img src={p.thumbnailUrl || p.url} alt="attached" />
                  <button
                    type="button"
                    className="photo-remove"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(p.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {mutation.isError && (
          <div className="form-error">
            Could not submit the report. Please try again.
          </div>
        )}

        <button
          type="submit"
          className="button"
          disabled={!canSubmit || mutation.isPending || uploading}
        >
          {mutation.isPending ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  );
}

export default ReportProblem;
