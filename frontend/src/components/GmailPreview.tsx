'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Archive,
  AlertOctagon,
  Trash2,
  Mail,
  Clock,
  CheckSquare,
  FolderInput,
  Tag,
  MoreVertical,
  Printer,
  ExternalLink,
  Star,
  CornerUpLeft,
  CornerUpRight,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Download,
  Smartphone,
  Monitor,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export interface GmailPreviewProps {
  sender?: string;
  senderName?: string;
  recipient?: string;
  replyTo?: string;
  cc?: string[] | string;
  bcc?: string[] | string;
  subject?: string;
  htmlBody?: string;
  date?: string;
  attachments?: Array<{ filename: string; url?: string; size?: string }>;
  isCoBranded?: boolean;
  className?: string;
  onClose?: () => void;
}

export function GmailPreview({
  sender = 'dispatch@mail1.postal.test.sudhi.online',
  senderName = 'DispatchHub Mailer',
  recipient = 'sudhiselampa19@gmail.com',
  replyTo,
  cc,
  bcc,
  subject = '(No Subject)',
  htmlBody = '<p>No content provided</p>',
  date,
  attachments = [],
  isCoBranded = false,
  className = '',
  onClose,
}: GmailPreviewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const ccString = Array.isArray(cc) ? cc.join(', ') : cc;
  const bccString = Array.isArray(bcc) ? bcc.join(', ') : bcc;
  const displayDate = date || new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  // Extract avatar letter and color
  const initial = (senderName || sender || 'D').charAt(0).toUpperCase();
  const avatarColors = [
    'bg-red-500',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-teal-600',
  ];
  const colorIndex = (sender.charCodeAt(0) || 0) % avatarColors.length;
  const avatarBg = avatarColors[colorIndex];

  return (
    <div className={`bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Top Device & View Toolbar */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
            Gmail UI Live Preview
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono text-[11px] truncate max-w-xs">{recipient}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'desktop'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'mobile'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Preview"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Gmail Window Frame */}
      <div className="bg-[#f6f8fc] text-[#202124] flex-1 overflow-y-auto flex justify-center py-4 px-2 sm:px-6">
        <div
          className={`bg-white rounded-xl shadow-md border border-[#e0e3e7] overflow-hidden transition-all duration-200 flex flex-col ${
            viewMode === 'mobile' ? 'w-full max-w-[400px]' : 'w-full max-w-4xl'
          }`}
        >
          {/* Gmail Action Bar (Chrome style) */}
          <div className="bg-[#f6f8fc] px-4 py-2 border-b border-[#e5e7eb] flex items-center justify-between text-[#5f6368]">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition"
                title="Back to Inbox"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition"
                title="Report spam"
              >
                <AlertOctagon className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <span className="h-4 w-px bg-[#dadce0] mx-1"></span>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition"
                title="Mark as unread"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition hidden sm:inline-flex"
                title="Snooze"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition hidden sm:inline-flex"
                title="Add to tasks"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition hidden sm:inline-flex"
                title="Move to"
              >
                <FolderInput className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition hidden sm:inline-flex"
                title="Labels"
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition hidden sm:inline-flex"
                title="Print all"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-[#e8eaed] rounded-full text-[#5f6368] hover:text-[#202124] transition"
                title="In new window"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Email Subject Header */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-normal text-[#202124] leading-snug tracking-tight">
                  {subject}
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#e8eaed] text-[#444746]">
                  Inbox
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                  Important
                </span>
              </div>
            </div>
          </div>

          {/* Sender & Recipient Bar */}
          <div className="px-6 py-3 border-b border-[#f1f3f4]">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Avatar + Names */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${avatarBg} text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0`}
                >
                  {initial}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-semibold text-sm text-[#202124]">{senderName}</span>
                    <span className="text-xs text-[#5f6368] font-normal truncate max-w-xs">&lt;{sender}&gt;</span>
                  </div>

                  {/* "to me" button */}
                  <div className="relative mt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowDetails(!showDetails)}
                      className="inline-flex items-center gap-1 text-xs text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] px-1.5 py-0.5 rounded transition"
                    >
                      <span>to {recipient.split('@')[0]}</span>
                      {showDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Expandable RFC Details Popover */}
                    {showDetails && (
                      <div className="mt-2 p-3 bg-white border border-[#dadce0] rounded-lg shadow-lg text-xs space-y-1.5 w-80 text-[#3c4043] z-20">
                        <div className="grid grid-cols-[70px_1fr] gap-1">
                          <span className="text-[#5f6368]">from:</span>
                          <span className="font-medium text-[#202124]">{senderName} &lt;{sender}&gt;</span>
                        </div>
                        {replyTo && (
                          <div className="grid grid-cols-[70px_1fr] gap-1">
                            <span className="text-[#5f6368]">reply-to:</span>
                            <span className="font-mono text-[#202124]">{replyTo}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-[70px_1fr] gap-1">
                          <span className="text-[#5f6368]">to:</span>
                          <span className="text-[#202124]">{recipient}</span>
                        </div>
                        {ccString && (
                          <div className="grid grid-cols-[70px_1fr] gap-1">
                            <span className="text-[#5f6368]">cc:</span>
                            <span className="text-[#202124]">{ccString}</span>
                          </div>
                        )}
                        {bccString && (
                          <div className="grid grid-cols-[70px_1fr] gap-1">
                            <span className="text-[#5f6368]">bcc:</span>
                            <span className="text-[#202124]">{bccString}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-[70px_1fr] gap-1">
                          <span className="text-[#5f6368]">date:</span>
                          <span className="text-[#202124]">{displayDate}</span>
                        </div>
                        <div className="grid grid-cols-[70px_1fr] gap-1">
                          <span className="text-[#5f6368]">subject:</span>
                          <span className="text-[#202124]">{subject}</span>
                        </div>
                        <div className="grid grid-cols-[70px_1fr] gap-1">
                          <span className="text-[#5f6368]">security:</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Standard encryption (TLS)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Date, Star, Reply */}
              <div className="flex items-center space-x-1 text-[#5f6368]">
                <span className="text-xs text-[#5f6368] hidden sm:inline-block mr-2">{displayDate}</span>
                <button
                  type="button"
                  onClick={() => setIsStarred(!isStarred)}
                  className={`p-1.5 rounded-full hover:bg-[#e8eaed] transition ${
                    isStarred ? 'text-amber-500 fill-amber-500' : 'text-[#5f6368]'
                  }`}
                  title={isStarred ? 'Starred' : 'Not starred'}
                >
                  <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-[#e8eaed] transition text-[#5f6368]"
                  title="Reply"
                >
                  <CornerUpLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-[#e8eaed] transition text-[#5f6368]"
                  title="More"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Email Body Rendering Area */}
          <div className="px-6 py-6 min-h-[220px] text-[#202124] leading-relaxed text-sm bg-white overflow-x-auto">
            <div
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: htmlBody }}
            />

            {/* Co-branded footer watermark */}
            {isCoBranded && (
              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                <span>⚡ Delivered via </span>
                <span className="font-semibold text-indigo-600">DispatchHub</span>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="px-6 py-4 border-t border-[#f1f3f4] bg-[#f8f9fa]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5f6368] mb-2.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{attachments.length} Attachment{attachments.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[#dadce0] bg-white hover:border-[#1a73e8] hover:shadow-sm transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded bg-indigo-50 text-indigo-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#202124] truncate">{att.filename}</p>
                        <p className="text-[11px] text-[#5f6368]">{att.size || 'Remote File'}</p>
                      </div>
                    </div>
                    {att.url && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] rounded-full hover:bg-[#f1f3f4] transition"
                        title="Download attachment"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Gmail Action Buttons */}
          <div className="px-6 py-5 border-t border-[#f1f3f4] bg-white flex items-center space-x-3">
            <button
              type="button"
              className="inline-flex items-center space-x-2 px-6 py-2 rounded-full border border-[#dadce0] hover:bg-[#f1f3f4] text-[#444746] text-xs font-semibold transition"
            >
              <CornerUpLeft className="w-4 h-4 text-[#5f6368]" />
              <span>Reply</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center space-x-2 px-6 py-2 rounded-full border border-[#dadce0] hover:bg-[#f1f3f4] text-[#444746] text-xs font-semibold transition"
            >
              <CornerUpRight className="w-4 h-4 text-[#5f6368]" />
              <span>Forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default GmailPreview;
