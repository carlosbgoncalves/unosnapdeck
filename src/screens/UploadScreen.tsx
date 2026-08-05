import React, { useState, useRef } from 'react';
import { Logo } from '../components/Logo.tsx';

interface UploadScreenProps {
  roomId: string;
  playerId: string;
  quota: number;
  uploadedPhotos: string[]; // file paths or URLs
  onUploadDone: () => void;
  onRefreshState?: () => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  roomId,
  playerId,
  quota,
  uploadedPhotos,
  onUploadDone,
  onRefreshState,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadedCount = uploadedPhotos.length;
  const progressPercent = Math.min(100, Math.round((uploadedCount / Math.max(1, quota)) * 100));
  const remainingNeeded = quota - uploadedCount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    uploadFile(file);
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const uploadFile = (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('playerId', playerId);

    fetch(`/api/rooms/${roomId}/photos?playerId=${playerId}`, {
      method: 'POST',
      body: formData,
    })
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
          return data;
        }
        throw new Error(`Upload failed (HTTP ${res.status}). Please try again.`);
      })
      .then(() => {
        setIsUploading(false);
        if (onRefreshState) onRefreshState();
      })
      .catch((err) => {
        setError(err.message);
        setIsUploading(false);
      });
  };

  const handleDeletePhoto = (filename: string) => {
    fetch(`/api/rooms/${roomId}/photos/${encodeURIComponent(filename)}?playerId=${playerId}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete photo');
          return data;
        }
        throw new Error('Failed to delete photo.');
      })
      .then(() => {
        if (onRefreshState) onRefreshState();
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  return (
    <div className="min-h-screen bg-[#f8f6fb] text-[#20313f] flex flex-col items-center pt-6 px-5 pb-16">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col items-center text-center mb-6">
        <Logo size="md" showText={false} className="mb-2" />
        <h1 className="text-3xl sm:text-4xl font-black text-[#20313f] mb-1 tracking-tight">
          Upload Your Photos
        </h1>
        <p className="text-sm font-semibold text-[#484554] max-w-2xl mx-auto">
          Add your personal photos to the deck. Each photo will be mapped to a card rank.
        </p>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl flex flex-col items-center">

        {/* Progress Indicator */}
        <div className="w-full max-w-2xl bg-white rounded-2xl p-4 mb-6 shadow-xs border border-[#e4dfec]">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-sm font-black text-[#20313f]">
              Uploaded: {uploadedCount} / {quota}
            </span>
            <div className="flex-1 ml-4 bg-[#f1ecf8] rounded-full h-3 overflow-hidden border border-[#ddd8e4]">
              <div
                className="bg-[#38a34a] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-[#484554] px-2">
            <span>📷 Upload {quota} custom photos</span>
            {uploadedCount > 0 && (
              <button
                onClick={() => {
                  // Clear all photos
                  fetch(`/api/rooms/${roomId}/clear-photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerId }),
                  })
                    .then(async (res) => {
                      const ct = res.headers.get('content-type');
                      if (ct && ct.includes('application/json')) {
                        return res.json();
                      }
                    })
                    .then(() => {
                      if (onRefreshState) onRefreshState();
                    })
                    .catch(() => {});
                }}
                className="text-[#e52b2b] hover:underline font-bold"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="w-full max-w-2xl mb-4 p-3 bg-[#fee2e2] text-[#e52b2b] rounded-xl text-xs font-bold text-center border border-[#fca5a5]">
            {error}
          </div>
        )}

        {/* Upload Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full mb-8">
          {/* Render uploaded photos */}
          {uploadedPhotos.map((photoPath, idx) => {
            const filename = photoPath.split('/').pop() || photoPath.split('\\').pop() || '';
            const previewUrl = `/api/rooms/${roomId}/photos/${encodeURIComponent(filename)}`;

            return (
              <div
                key={idx}
                className="relative aspect-[3/4] bg-white rounded-2xl shadow-xs overflow-hidden group border border-[#ddd8e4]"
              >
                <img
                  src={previewUrl}
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDeletePhoto(filename)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-[#e52b2b] rounded-full p-2 shadow-sm transition-transform hover:scale-110"
                  title="Remove photo"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            );
          })}

          {/* Empty slot triggers for adding remaining photos */}
          {Array.from({ length: Math.max(0, quota - uploadedCount) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="relative aspect-[3/4] bg-white rounded-2xl border-2 border-dashed border-[#ddd8e4] hover:border-[#20313f] hover:bg-[#f8f6fb] transition-all flex flex-col items-center justify-center group cursor-pointer shadow-xs disabled:opacity-50"
            >
              <div className="bg-[#20313f] text-white rounded-full p-3.5 mb-2 group-hover:scale-110 transition-transform shadow-xs">
                <span className="material-symbols-outlined text-2xl">add_a_photo</span>
              </div>
              <span className="text-xs font-extrabold text-[#484554] group-hover:text-[#20313f]">
                {isUploading ? 'Uploading...' : 'Add Photo'}
              </span>
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div className="w-full max-w-sm mt-2 flex flex-col items-center gap-2">
          <button
            onClick={onUploadDone}
            className={`w-full py-4 px-8 rounded-full font-black text-lg shadow-sm transition-all ${
              uploadedCount >= quota
                ? 'bg-[#20313f] text-white hover:bg-[#2b70c9]'
                : 'bg-[#f1ecf8] text-[#797586] hover:bg-[#e4dfec] border border-[#ddd8e4]'
            }`}
          >
            Done — Back to Lobby
          </button>
          {remainingNeeded > 0 && (
            <p className="text-xs font-bold text-[#484554]">
              Upload {remainingNeeded} more photo{remainingNeeded > 1 ? 's' : ''} to complete your quota
            </p>
          )}
        </div>
      </main>
    </div>
  );
};
