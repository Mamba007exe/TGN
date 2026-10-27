import React, { useState } from 'react';
import { X, Image as ImageIcon, Send, UploadCloud, Loader2 } from 'lucide-react';
import { Profile } from '../types';
import { compressImageFile } from '../lib/imageCompressor.ts';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile;
  onCreatePost: (data: { ngo_id: string; caption: string; media_url: string }) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreatePost,
}) => {
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState(
    'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=80'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);
    if (!caption.trim()) {
      setPostError('Please enter a caption for your impact update.');
      return;
    }

    setIsSubmitting(true);
    onCreatePost({
      ngo_id: currentUser.id,
      caption: caption.trim(),
      media_url: mediaUrl.trim() || 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=80',
    });

    setCaption('');
    setIsSubmitting(false);
    onClose();
  };

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        try {
          setIsCompressing(true);
          const { dataUrl } = await compressImageFile(file, { maxWidth: 1200, quality: 0.82 });
          setMediaUrl(dataUrl);
        } catch {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setMediaUrl(reader.result);
            }
          };
          reader.readAsDataURL(file);
        } finally {
          setIsCompressing(false);
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setMediaUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-2 border-[#CED4DA] p-0 text-[#212529] max-h-[94vh] overflow-y-auto my-auto shadow-xl">
        {/* Header */}
        <div className="bg-[#004182] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-[#002f5e] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#FFC107]" />
            <h3 className="font-extrabold text-xs sm:text-base tracking-wide uppercase truncate">
              Publish NGO Field Impact Update
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {postError && (
            <div className="bg-[#f8d7da] border border-[#dc3545] text-[#842029] p-3 text-xs font-bold">
              {postError}
            </div>
          )}
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#CED4DA]">
            <div className="w-9 h-9 bg-[#004182] text-white font-black text-sm flex items-center justify-center">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-[#004182]">{currentUser.name}</div>
              <div className="text-[10px] text-[#6C757D] uppercase">
                Verified NGO Author • Feed Visibility: Approved Public
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
              Field Update Caption & Transparency Report *
            </label>
            <textarea
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Detail your recent relief activity, medical supplies distribution, or school development program. Include verified progress metrics for benefactors..."
              className="w-full p-2.5 bg-white border border-[#CED4DA] text-base sm:text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#6C757D] mb-1">
              Field Visual Evidence (Photo / Video Documentation)
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaFileChange}
                className="w-full text-xs text-[#6C757D] file:mr-2 file:py-2 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-[#004182] file:text-white hover:file:bg-[#003366] cursor-pointer min-h-[44px]"
              />
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Or paste direct image URL (https://...)"
                className="w-full p-2.5 bg-white border border-[#CED4DA] text-base sm:text-xs text-[#212529] focus:outline-none focus:border-[#004182] min-h-[44px]"
              />
            </div>

            {isCompressing && (
              <div className="flex items-center gap-1.5 text-xs text-[#004182] font-semibold mt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Optimizing high-res photo for fast mobile loading...
              </div>
            )}

            {mediaUrl && (
              <div className="mt-2 border border-[#CED4DA] aspect-[16/9] bg-[#E9ECEF] overflow-hidden flex items-center justify-center relative">
                <img
                  src={mediaUrl}
                  alt="Post preview"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#CED4DA] flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold uppercase text-[#6C757D] border border-[#CED4DA] hover:bg-[#E9ECEF] cursor-pointer min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-[#198754] text-white text-xs font-extrabold uppercase tracking-wider hover:bg-[#146c43] cursor-pointer min-h-[44px] touch-manipulation"
            >
              Broadcast to Impact Feed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
