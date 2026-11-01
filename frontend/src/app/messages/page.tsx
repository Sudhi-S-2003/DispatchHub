'use client';

import React, { useState, useEffect } from 'react';
import { messagesApi } from '@/lib/api';
import { GmailPreview } from '@/components/GmailPreview';
import {
  Mail,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Layers,
  DollarSign,
  ShieldAlert,
  Smartphone,
  Monitor,
} from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 });

  // Detail Modal
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'preview' | 'metadata'>('preview');

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await messagesApi.list({
        page,
        limit,
        status: status || undefined,
        category: category || undefined,
        search: search || undefined,
      });

      if (res && res.data) {
        setMessages(res.data);
        setMeta(res.meta || { total: res.data.length, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [page, limit, status, category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMessages();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Message Audit Logs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete transaction ledger for all transactional emails, marketing blasts, and Postal MTA delivery webhooks.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Total Records: <span className="font-bold text-white">{meta.total}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient or subject..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="QUEUED">QUEUED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SENT">SENT</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="BOUNCED">BOUNCED</option>
            <option value="FAILED">FAILED</option>
          </select>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="TRANSACTIONAL">TRANSACTIONAL</option>
            <option value="MARKETING">MARKETING</option>
            <option value="NOTIFICATION">NOTIFICATION</option>
            <option value="TEST">TEST</option>
          </select>

          {/* Limit selector */}
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-xs">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Recipient</th>
                <th className="px-5 py-3 text-left font-semibold">Subject</th>
                <th className="px-5 py-3 text-left font-semibold">Category</th>
                <th className="px-5 py-3 text-left font-semibold">Cost</th>
                <th className="px-5 py-3 text-left font-semibold">Shard / MTA ID</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">Created</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Loading telemetry from PostgreSQL...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No messages matched the specified criteria.
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-850/60 transition group">
                    <td className="px-5 py-3.5 font-medium text-slate-200">
                      <div>{msg.recipient || msg.to}</div>
                      {msg.campaignId && (
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                          Campaign: {msg.campaignId.slice(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 max-w-xs truncate">{msg.subject}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {msg.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-400 font-semibold">
                      ${Number(msg.cost || 0).toFixed(3)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400 text-[11px]">
                      <div>{msg.assignedShard !== undefined ? `shard-${msg.assignedShard}` : (msg.shardKey || 'queue:priority')}</div>
                      {(msg.postalMessageId || msg.mtaMessageId) && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[100px]">
                          ID: {msg.postalMessageId || msg.mtaMessageId}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          msg.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : msg.status === 'SENT'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : msg.status === 'BOUNCED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : msg.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                      {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedMessage(msg)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Inspect Message"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Production Pagination Bar */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <span className="text-white font-semibold">{page}</span> of{' '}
            <span className="text-white font-semibold">{meta.totalPages || 1}</span> ({meta.total} records)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => (meta.hasNextPage ? p + 1 : p))}
              disabled={!meta.hasNextPage && page >= (meta.totalPages || 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Message Inspection Drawer / Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Message Inspector
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {selectedMessage.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedMessage.id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setModalTab('preview')}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      modalTab === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Gmail UI Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('metadata')}
                    className={`px-3 py-1.5 rounded-md font-medium transition ${
                      modalTab === 'metadata'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Audit Details & Diagnostics
                  </button>
                </div>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
              {modalTab === 'preview' ? (
                <GmailPreview
                  sender={selectedMessage.sender || 'dispatch@mail1.postal.test.sudhi.online'}
                  senderName="DispatchHub Dispatcher"
                  recipient={selectedMessage.recipient || selectedMessage.to || 'sudhiselampa19@gmail.com'}
                  subject={selectedMessage.subject || '(No Subject)'}
                  htmlBody={selectedMessage.htmlBody || '<p>No content</p>'}
                  date={selectedMessage.sentAt ? new Date(selectedMessage.sentAt).toLocaleString() : undefined}
                  attachments={
                    selectedMessage.attachments?.map((a: any) => ({
                      filename: a.filename || 'attachment.pdf',
                      url: a.url,
                      size: 'Attached File',
                    })) || []
                  }
                  isCoBranded={selectedMessage.brandingMode === 'CO_BRANDED'}
                />
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div>
                      <span className="text-slate-500 font-medium">Sender:</span>
                      <p className="font-semibold text-slate-200 mt-0.5 truncate">{selectedMessage.sender || 'System Default'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Recipient:</span>
                      <p className="font-semibold text-slate-200 mt-0.5 truncate">{selectedMessage.recipient || selectedMessage.to}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Delivery Status:</span>
                      <p className="font-semibold text-emerald-400 mt-0.5">{selectedMessage.status}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Category:</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{selectedMessage.category}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Branding Mode:</span>
                      <p className="font-semibold text-indigo-400 mt-0.5">{selectedMessage.brandingMode || 'WHITE_LABEL'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Cost Debited:</span>
                      <p className="font-semibold font-mono text-emerald-400 mt-0.5">
                        ${Number(selectedMessage.cost || 0.05).toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Postal Message ID:</span>
                      <p className="font-mono text-indigo-300 mt-0.5 truncate">{selectedMessage.postalMessageId || 'Pending MTA Receipt'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Queue Shard:</span>
                      <p className="font-mono text-slate-300 mt-0.5">{selectedMessage.assignedShard != null ? `shard:${selectedMessage.assignedShard}` : 'queue:priority'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Dispatched At:</span>
                      <p className="font-mono text-slate-400 mt-0.5">
                        {selectedMessage.sentAt ? new Date(selectedMessage.sentAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Subject</span>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200">
                      {selectedMessage.subject}
                    </div>
                  </div>

                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">Attachments</span>
                      <div className="space-y-1">
                        {selectedMessage.attachments.map((att: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-indigo-300 flex items-center justify-between">
                            <span>{att.filename}</span>
                            <span className="text-slate-500 text-[11px] truncate max-w-xs">{att.url}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Raw HTML Source</span>
                    <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-400 font-mono text-[11px] overflow-x-auto max-h-48">
                      {selectedMessage.htmlBody || '<p>No HTML body</p>'}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
      )}
    </div>
  );
}
