'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { messagesApi, templatesApi } from '@/lib/api';
import { GmailPreview } from '@/components/GmailPreview';
import { useToast, ErrorBoundary } from '@/components/ui';
import {
  Send,
  Zap,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  Code2,
  Info,
  DollarSign,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  PenTool,
} from 'lucide-react';

export default function ComposePage() {
  const router = useRouter();
  const { user, refreshAccount } = useAuth();
  const toast = useToast();

  // View Tab: Editor vs Live Gmail Preview
  const [composeViewTab, setComposeViewTab] = useState<'editor' | 'preview'>('editor');

  // Mode: single 1-to-1 or campaign
  const [mode, setMode] = useState<'single' | 'campaign'>('single');
  const [category, setCategory] = useState<'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'TEST'>('TRANSACTIONAL');
  const [isCoBranded, setIsCoBranded] = useState(false);

  // Sender & RFC Headers
  const [sender, setSender] = useState('dispatch@mail1.postal.test.sudhi.online');
  const [replyTo, setReplyTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showAdvancedHeaders, setShowAdvancedHeaders] = useState(false);

  // Single dispatch fields
  const [to, setTo] = useState('sudhiselampa19@gmail.com');
  const [subject, setSubject] = useState('Your DispatchHub Security Verification Code');
  const [htmlBody, setHtmlBody] = useState(
    '<div style="font-family:sans-serif;padding:20px;color:#333;"><h2 style="color:#4f46e5;">Welcome to DispatchHub</h2><p>Hello <b>{{recipient.name}}</b>,</p><p>Your verification code is: <span style="font-size:24px;font-weight:bold;color:#4f46e5;letter-spacing:4px;">{{body.code}}</span></p><p>This code expires in 10 minutes.</p></div>'
  );
  const [variablesJson, setVariablesJson] = useState('{\n  "recipient": { "name": "Sudhi" },\n  "body": { "code": "849201" }\n}');

  // Campaign fields
  const [campaignName, setCampaignName] = useState('November Product Announcement');
  const [campaignRecipientsText, setCampaignRecipientsText] = useState(
    'sudhiselampa19@gmail.com, Sudhi\nalex@acme.com, Alex Smith\nsupport@acme.com, Support Team'
  );

  // Remote attachments
  const [attachments, setAttachments] = useState<Array<{ url: string; filename: string }>>([]);
  const [newAttUrl, setNewAttUrl] = useState('');
  const [newAttName, setNewAttName] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string; details?: any } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Rates
  const rateCard: Record<string, { whiteLabel: number; coBranded: number }> = {
    TRANSACTIONAL: { whiteLabel: 0.050, coBranded: 0.025 },
    MARKETING: { whiteLabel: 0.035, coBranded: 0.015 },
    NOTIFICATION: { whiteLabel: 0.025, coBranded: 0.010 },
    TEST: { whiteLabel: 0.010, coBranded: 0.010 },
  };

  const currentUnitRate = isCoBranded ? rateCard[category].coBranded : rateCard[category].whiteLabel;
  const estimatedCost = mode === 'single' ? currentUnitRate : currentUnitRate * campaignRecipientsText.split('\n').filter(Boolean).length;

  const handleAddAttachment = () => {
    if (!newAttUrl) return;
    setAttachments([
      ...attachments,
      { url: newAttUrl, filename: newAttName || newAttUrl.split('/').pop() || 'attachment.pdf' },
    ]);
    setNewAttUrl('');
    setNewAttName('');
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setResultMessage(null);
    const errors: Record<string, string> = {};

    if (!subject.trim()) {
      errors.subject = 'Subject is required.';
    }

    if (mode === 'single') {
      if (!to.trim()) {
        errors.to = 'Recipient email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
        errors.to = 'Invalid email address format.';
      }
    } else {
      if (!campaignName.trim()) {
        errors.campaignName = 'Campaign name is required.';
      }
      if (!campaignRecipientsText.trim()) {
        errors.campaignRecipients = 'At least one recipient is required.';
      }
    }

    let parsedVariables = {};
    if (mode === 'single' && variablesJson.trim()) {
      try {
        parsedVariables = JSON.parse(variablesJson);
      } catch {
        errors.variablesJson = 'Variables must be valid JSON format.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please resolve the highlighted validation errors.');
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (mode === 'single') {
        const res = await messagesApi.sendSingle({
          to,
          sender: sender || undefined,
          subject,
          category,
          isCoBranded,
          htmlBody,
          replyTo: replyTo || undefined,
          cc: cc ? cc.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          bcc: bcc ? bcc.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          variables: parsedVariables,
          remoteAttachments: attachments.length > 0 ? attachments : undefined,
        });

        toast.success(`Message dispatched successfully to ${to}! Status: ${res.data?.status || 'SENT'}`);
        setResultMessage({
          success: true,
          text: `Message dispatched successfully to ${to}! Status: ${res.data?.status || 'SENT'}. Atomically debited $${Number(res.data?.cost).toFixed(3)}.`,
          details: res.data,
        });
      } else {
        // Parse campaign recipients (format: email, name)
        const lines = campaignRecipientsText.split('\n').filter((l) => l.trim().length > 0);
        const recipients = lines.map((line) => {
          const parts = line.split(',');
          const recipientEmail = parts[0].trim();
          const recipientName = parts[1] ? parts[1].trim() : 'Valued Customer';
          return {
            to: recipientEmail,
            variables: { recipient: { name: recipientName } },
          };
        });

        const res = await messagesApi.sendCampaign({
          name: campaignName,
          sender: sender || undefined,
          category,
          isCoBranded,
          subject,
          htmlBody,
          replyTo: replyTo || undefined,
          cc: cc ? cc.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          bcc: bcc ? bcc.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          recipients,
          remoteAttachments: attachments.length > 0 ? attachments : undefined,
        });

        toast.success(`Campaign "${campaignName}" launched with ${recipients.length} messages!`);
        setResultMessage({
          success: true,
          text: `Campaign "${campaignName}" created with ${recipients.length} messages! Status: ${res.data?.status || 'APPROVED'}. Total Debited: $${Number(res.data?.totalCost).toFixed(3)}.`,
          details: res.data,
        });
      }

      await refreshAccount();
    } catch (err: any) {
      const errorText = err.userMessage || err.message || 'Dispatch failed. Check wallet balance or DNS configuration.';
      toast.error(errorText);
      setResultMessage({
        success: false,
        text: errorText,
      });
      if (err.fieldErrors) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fieldErrors)) {
          if (Array.isArray(v) && v[0]) mapped[k] = v[0] as string;
        }
        setFieldErrors(mapped);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Send Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch individual transactional OTPs or large-scale sharded marketing campaigns.
          </p>
        </div>

        {/* Mode Selector & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Editor vs Gmail Preview Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setComposeViewTab('editor')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                composeViewTab === 'editor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Composer</span>
            </button>
            <button
              type="button"
              onClick={() => setComposeViewTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition ${
                composeViewTab === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Gmail UI Preview</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                mode === 'single' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1-to-1 Single
            </button>
            <button
              type="button"
              onClick={() => setMode('campaign')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                mode === 'campaign' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Result Alert */}
      {resultMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-sm ${
            resultMessage.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {resultMessage.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{resultMessage.success ? 'Dispatch Successful' : 'Dispatch Error'}</p>
            <p className="mt-0.5 text-xs opacity-90">{resultMessage.text}</p>
            {resultMessage.details?.shardKey && (
              <p className="mt-1 font-mono text-[11px] text-emerald-400">
                Routed to: {resultMessage.details.shardKey}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form Card or Live Gmail Preview */}
      {composeViewTab === 'preview' ? (
        <div className="space-y-6">
          <ErrorBoundary name="GmailPreviewBoundary">
            <GmailPreview
              sender={sender || 'dispatch@mail1.postal.test.sudhi.online'}
              senderName="DispatchHub Live Mailer"
              recipient={mode === 'single' ? to : 'campaign-recipients@list'}
              replyTo={replyTo || undefined}
              cc={cc || undefined}
              bcc={bcc || undefined}
              subject={subject || '(No Subject)'}
              htmlBody={htmlBody}
              isCoBranded={isCoBranded}
              attachments={attachments}
            />
          </ErrorBoundary>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span>All changes and styles render synchronously inside the Gmail environment.</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setComposeViewTab('editor')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
              >
                Back to Composer
              </button>
              <button
                type="button"
                onClick={handleDispatch}
                disabled={isSubmitting}
                className="inline-flex items-center space-x-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Dispatch Email (${estimatedCost.toFixed(3)})</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleDispatch} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
        {/* Economics & Configuration Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TRANSACTIONAL">TRANSACTIONAL (OTP / SLA Bypass)</option>
              <option value="MARKETING">MARKETING (Bulk Queued)</option>
              <option value="NOTIFICATION">NOTIFICATION (System alerts)</option>
              <option value="TEST">TEST (Mock MTA)</option>
            </select>
          </div>

          {/* Branding Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Branding Mode
            </label>
            <div className="mt-1.5 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsCoBranded(false)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
                  !isCoBranded
                    ? 'bg-slate-800 text-white border-slate-600 font-semibold'
                    : 'text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                White-Label
              </button>
              <button
                type="button"
                onClick={() => setIsCoBranded(true)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition ${
                  isCoBranded
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 font-semibold'
                    : 'text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                Co-Branded (-50%)
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {isCoBranded ? '50% discount with DispatchHub watermark' : '100% private unbranded headers'}
            </p>
          </div>

          {/* Atomic Cost Estimation */}
          <div className="flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estimated Debit
            </span>
            <div className="mt-1.5 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                ${estimatedCost.toFixed(3)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (${currentUnitRate.toFixed(3)}/unit)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Pre-flight balance: ${Number(user?.walletBalance || 0).toFixed(3)}</span>
          </div>
        </div>

        {/* Sender & Custom Domain */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              Sender Address (Custom Domain)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Signed with RSA-2048 DKIM
            </span>
          </div>
          <input
            type="text"
            required
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="dispatch@mail1.postal.test.sudhi.online"
            className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
        </div>

        {/* Advanced Headers (Reply-To, Cc, Bcc) */}
        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => setShowAdvancedHeaders(!showAdvancedHeaders)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <span className="flex items-center gap-2">
              <span>RFC Headers: Reply-To, Cc, Bcc</span>
              {(replyTo || cc || bcc) && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Configured
                </span>
              )}
            </span>
            {showAdvancedHeaders ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvancedHeaders && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Reply-To Address</label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="support@sudhi.online"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Cc (Carbon Copy)</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="team@sudhi.online"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Bcc (Blind Copy)</label>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="audit@sudhi.online"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Recipients Input */}
        {mode === 'single' ? (
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">Recipient Email</label>
              <button
                type="button"
                onClick={() => setTo('sudhiselampa19@gmail.com')}
                className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Fill My Target: sudhiselampa19@gmail.com</span>
              </button>
            </div>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                if (fieldErrors.to) setFieldErrors((prev) => ({ ...prev, to: '' }));
              }}
              placeholder="recipient@domain.com"
              className={`mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border ${
                fieldErrors.to ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              } rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
            {fieldErrors.to && <p className="mt-1 text-xs text-rose-400">{fieldErrors.to}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Campaign Name</label>
              <input
                type="text"
                required
                value={campaignName}
                onChange={(e) => {
                  setCampaignName(e.target.value);
                  if (fieldErrors.campaignName) setFieldErrors((prev) => ({ ...prev, campaignName: '' }));
                }}
                placeholder="E.g. Q4 Product Launch"
                className={`mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border ${
                  fieldErrors.campaignName ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
                } rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {fieldErrors.campaignName && <p className="mt-1 text-xs text-rose-400">{fieldErrors.campaignName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Recipients (One per line: email, name)
              </label>
              <textarea
                rows={4}
                required
                value={campaignRecipientsText}
                onChange={(e) => {
                  setCampaignRecipientsText(e.target.value);
                  if (fieldErrors.campaignRecipients) setFieldErrors((prev) => ({ ...prev, campaignRecipients: '' }));
                }}
                className={`mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border ${
                  fieldErrors.campaignRecipients ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
                } rounded-lg text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {fieldErrors.campaignRecipients && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.campaignRecipients}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Telinfy Lookahead Slicing will claim ~50 emails at a time into Redis shards.
              </p>
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-300">Email Subject</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (fieldErrors.subject) setFieldErrors((prev) => ({ ...prev, subject: '' }));
            }}
            placeholder="Security code or announcement..."
            className={`mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border ${
              fieldErrors.subject ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
            } rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          {fieldErrors.subject && <p className="mt-1 text-xs text-rose-400">{fieldErrors.subject}</p>}
        </div>

        {/* HTML Body */}
        <div>
          <label className="block text-xs font-semibold text-slate-300">HTML Body Template</label>
          <textarea
            rows={5}
            required
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Supports dot-notation placeholders like <code className="text-indigo-400">{'{{recipient.name}}'}</code> or <code className="text-indigo-400">{'{{body.code}}'}</code>.
          </p>
        </div>

        {/* Template Variables JSON (Single Send) */}
        {mode === 'single' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300">Dynamic Variables (JSON)</label>
            <textarea
              rows={3}
              value={variablesJson}
              onChange={(e) => {
                setVariablesJson(e.target.value);
                if (fieldErrors.variablesJson) setFieldErrors((prev) => ({ ...prev, variablesJson: '' }));
              }}
              className={`mt-1.5 block w-full px-3.5 py-2 bg-slate-950 border ${
                fieldErrors.variablesJson ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              } rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
            {fieldErrors.variablesJson && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.variablesJson}</p>
            )}
          </div>
        )}

        {/* SSRF Safe Remote Attachments */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
              <span>URL-Only Remote Attachments (SSRF Protected)</span>
            </span>
            <span className="text-[11px] text-slate-500">Max 10MB per file</span>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={newAttUrl}
              onChange={(e) => setNewAttUrl(e.target.value)}
              placeholder="https://example.com/invoice.pdf"
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={newAttName}
              onChange={(e) => setNewAttName(e.target.value)}
              placeholder="Invoice.pdf"
              className="w-40 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddAttachment}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2 mt-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                  <span className="text-indigo-300 truncate max-w-md">{att.filename} ({att.url})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Balance will be atomically verified & debited before dispatch.
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Queue...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Dispatch {mode === 'single' ? 'Message' : 'Campaign'} Now</span>
              </>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
