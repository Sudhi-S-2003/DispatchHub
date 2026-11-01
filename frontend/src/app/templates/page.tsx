'use client';

import React, { useState, useEffect } from 'react';
import { templatesApi } from '@/lib/api';
import { GmailPreview } from '@/components/GmailPreview';
import { useDialog, useToast, Dialog, EmptyState, LoadingState } from '@/components/ui';
import {
  FileCode2,
  Plus,
  Eye,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Sliders,
  Trash2,
} from 'lucide-react';

export default function TemplatesPage() {
  const { confirm } = useDialog();
  const toast = useToast();

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'TEST'>('TRANSACTIONAL');
  const [subject, setSubject] = useState('Welcome {{recipient.name}}!');
  const [htmlContent, setHtmlContent] = useState(
    `<div style="font-family:sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">\n  <h2 style="color:#4f46e5;">Hello, {{recipient.name}}!</h2>\n  <p>Thank you for choosing DispatchHub. Your authentication token is:</p>\n  <div style="background:#f1f5f9;padding:12px;font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:2px;display:inline-block;">{{body.token}}</div>\n  <p style="color:#64748b;font-size:12px;margin-top:20px;">If you did not request this, please ignore.</p>\n</div>`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [previewVariablesJson, setPreviewVariablesJson] = useState('{\n  "recipient": { "name": "Sudhi" },\n  "body": { "token": "SEC-849201" }\n}');
  const [renderedPreviewHtml, setRenderedPreviewHtml] = useState<string>('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await templatesApi.list();
      if (res && res.data) {
        setTemplates(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      toast.error(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await templatesApi.create({
        name,
        category,
        subject,
        htmlContent,
      });
      setShowCreateModal(false);
      setName('');
      toast.success(`Template "${name}" created successfully!`);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string, templateName: string) => {
    const confirmed = await confirm({
      title: `Delete template "${templateName}"?`,
      description: 'This will permanently delete this template. Any past campaigns dispatched with it will retain their rendered content.',
      confirmText: 'Delete template',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await templatesApi.delete(id);
      toast.success(`Template "${templateName}" deleted.`);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    }
  };

  const handleOpenPreview = async (tmpl: any) => {
    setPreviewTemplate(tmpl);
    try {
      const parsed = JSON.parse(previewVariablesJson);
      const res = await templatesApi.preview({
        htmlContent: tmpl.htmlContent,
        variables: parsed,
      });
      setRenderedPreviewHtml(res.data?.renderedHtml || tmpl.htmlContent);
    } catch {
      setRenderedPreviewHtml(tmpl.htmlContent);
    }
  };

  const handleUpdatePreview = async () => {
    if (!previewTemplate) return;
    try {
      const parsed = JSON.parse(previewVariablesJson);
      const res = await templatesApi.preview({
        htmlContent: previewTemplate.htmlContent,
        variables: parsed,
      });
      setRenderedPreviewHtml(res.data?.renderedHtml || previewTemplate.htmlContent);
      toast.info('Variables updated in preview');
    } catch {
      toast.error('Invalid variables JSON syntax');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Template Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Author reusable dot-notation templates with live variable interpolation and preview.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full">
            <LoadingState label="Loading template catalogue..." />
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<FileCode2 className="w-6 h-6 text-indigo-400" />}
              title="No Templates Created"
              description="Build your first dynamic template with variable placeholders (e.g. {{recipient.name}})."
              action={{
                label: 'Create Template',
                onClick: () => setShowCreateModal(true),
              }}
            />
          </div>
        ) : (
          templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">v{tmpl.schemaVersion || '1.0.0'}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-3 group-hover:text-indigo-400 transition">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono truncate">{tmpl.subject}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {new Date(tmpl.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenPreview(tmpl)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Test</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <Dialog
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Template"
          description="Define reusable dynamic content with {{variable}} placeholders for bulk campaigns and OTP receipts."
          maxWidth="lg"
        >
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Template Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Security OTP Code"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TRANSACTIONAL">TRANSACTIONAL</option>
                <option value="MARKETING">MARKETING</option>
                <option value="NOTIFICATION">NOTIFICATION</option>
                <option value="TEST">TEST</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Email Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Welcome {{recipient.name}}!"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">HTML Content</label>
              <textarea
                rows={8}
                required
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                {isSubmitting ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Gmail UI Preview Modal */}
      {previewTemplate && (
        <Dialog
          isOpen={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
          title={`Template Live Tester: ${previewTemplate.name}`}
          description="Test real-time variable interpolation inside an authentic Gmail canvas."
          maxWidth="xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Variable Interpolation Editor */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Merge Variables (JSON)</span>
                </label>
                <button
                  type="button"
                  onClick={handleUpdatePreview}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-md flex items-center space-x-1 transition shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Apply</span>
                </button>
              </div>

              <textarea
                rows={9}
                value={previewVariablesJson}
                onChange={(e) => setPreviewVariablesJson(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                placeholder='{ "recipient": { "name": "Sudhi" } }'
              />

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 Dynamic Merging:</p>
                <p>Changes apply instantly inside the Gmail preview canvas to test client rendering.</p>
              </div>
            </div>

            {/* Right Column: High-Fidelity Gmail UI Preview */}
            <div className="lg:col-span-8">
              <GmailPreview
                sender="dispatch@mail1.postal.test.sudhi.online"
                senderName="DispatchHub Templates"
                recipient="sudhiselampa19@gmail.com"
                subject={previewTemplate.subject || 'Preview Subject'}
                htmlBody={renderedPreviewHtml || previewTemplate.htmlContent}
                date={new Date().toLocaleString()}
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
