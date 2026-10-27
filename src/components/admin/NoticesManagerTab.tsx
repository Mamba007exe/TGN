import React, { useState } from 'react';
import { Notice } from '../../types';

interface NoticesManagerTabProps {
  notices: Notice[];
  onCreateNotice: (title: string, content: string) => void;
  onDeleteNotice: (id: string) => void;
}

export const NoticesManagerTab: React.FC<NoticesManagerTabProps> = ({
  notices,
  onCreateNotice,
  onDeleteNotice,
}) => {
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [noticeError, setNoticeError] = useState<string | null>(null);

  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeError(null);
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) {
      setNoticeError('Notice headline and content cannot be blank.');
      return;
    }
    onCreateNotice(newNoticeTitle.trim(), newNoticeContent.trim());
    setNewNoticeTitle('');
    setNewNoticeContent('');
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-extrabold text-sm uppercase text-[#004182]">
          Platform Notices & Announcements Manager
        </h3>
        <p className="text-xs text-[#6C757D]">
          Notices authored here are published instantly to the public Notices tab with administrative authority.
        </p>
      </div>

      {/* Creation Form */}
      <form onSubmit={handlePublishNotice} className="p-4 bg-[#E9ECEF] border border-[#CED4DA] space-y-3">
        {noticeError && (
          <div className="bg-[#f8d7da] border border-[#dc3545] text-[#842029] p-3 text-xs font-bold">
            {noticeError}
          </div>
        )}
        <div className="text-xs font-bold uppercase text-[#212529]">
          Draft New Administrative Notice:
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#6C757D] mb-1">
            Notice Headline / Title
          </label>
          <input
            type="text"
            value={newNoticeTitle}
            onChange={(e) => setNewNoticeTitle(e.target.value)}
            placeholder="e.g. Schedule of Annual MFS Regulatory Audit 2026"
            className="w-full p-2 bg-white border border-[#CED4DA] text-xs font-bold text-[#212529] focus:outline-none focus:border-[#004182]"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-[#6C757D] mb-1">
            Official Notice Body
          </label>
          <textarea
            rows={3}
            value={newNoticeContent}
            onChange={(e) => setNewNoticeContent(e.target.value)}
            placeholder="Enter policy details, fee schedules, or donor advisory statements..."
            className="w-full p-2 bg-white border border-[#CED4DA] text-xs text-[#212529] focus:outline-none focus:border-[#004182]"
            required
          />
        </div>
        <button
          type="submit"
          className="py-2 px-4 bg-[#004182] text-white text-xs font-bold uppercase hover:bg-[#003366] cursor-pointer"
        >
          Publish Notice to Network
        </button>
      </form>

      {/* Notices List */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase text-[#6C757D]">
          Existing Active Notices ({notices.length}):
        </div>
        <div className="divide-y divide-[#CED4DA] border border-[#CED4DA]">
          {notices.map((n) => (
            <div key={n.id} className="p-3 bg-white flex items-start justify-between gap-4">
              <div>
                <div className="font-bold text-xs text-[#212529]">{n.title}</div>
                <div className="text-[10px] text-[#6C757D] mb-1">
                  {new Date(n.created_at).toLocaleDateString()}
                </div>
                <p className="text-xs text-[#6C757D]">{n.content}</p>
              </div>
              <button
                onClick={() => onDeleteNotice(n.id)}
                className="px-2 py-1 bg-[#dc3545] text-white text-[10px] font-bold uppercase hover:bg-[#b02a37] cursor-pointer shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
