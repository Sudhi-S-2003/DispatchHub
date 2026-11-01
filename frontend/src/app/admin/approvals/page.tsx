'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { campaignsApi, messagesApi } from '@/lib/api';
import { useDialog, useToast, Dialog, EmptyState, LoadingState, ErrorState } from '@/components/ui';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  User,
  Layers,
  ArrowRight,
  Mail,
  Tag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const { confirm } = useDialog();
  const toast = useToast();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingCampaign, setRejectingCampaign] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('Campaign content violation: missing valid unsubscribe footer or policy terms.');
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCampaigns = async (page: number = 1) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await campaignsApi.getPendingApprovals({ page, limit: 10 }, { signal: controller.signal });
      if (res && res.data) {
        setCampaigns(res.data);
        if (res.meta) {
          setPagination({
            page: res.meta.page,
            limit: res.meta.limit,
            totalPages: res.meta.totalPages,
            total: res.meta.total,
          });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || (err.code === 'TIMEOUT_ERROR' && controller.signal.aborted)) {
        return;
      }
      setError(err.userMessage || err.message || 'Failed to load pending campaign queue');
      toast.error(err.userMessage || err.message || 'Failed to load pending campaign queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchCampaigns(1);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

  const handleApprove = async (camp: any) => {
    const confirmed = await confirm({
      title: `Approve Campaign "${camp.name || camp.subject}"?`,
      description: `This will dispatch ${camp.totalRecipients} emails across sharded queues. Total deducted cost: $${Number(camp.totalCostDeducted || 0).toFixed(3)}.`,
      confirmText: 'Approve & Dispatch',
      cancelText: 'Cancel',
      variant: 'default',
    });

    if (!confirmed) return;

    try {
      await messagesApi.approveCampaign(camp.id);
      toast.success(`Campaign "${camp.name || camp.id}" approved! Dispatched to lookahead shard queues.`);
      fetchCampaigns(pagination.page);
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingCampaign) return;
    setIsProcessing(true);
    try {
      await messagesApi.rejectCampaign(rejectingCampaign.id, rejectReason);
      toast.success(`Campaign "${rejectingCampaign.name || rejectingCampaign.id}" rejected. 100% wallet credits automatically refunded to client.`);
      setRejectingCampaign(null);
      fetchCampaigns(pagination.page);
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800 max-w-xl mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 mt-1">
          This approval queue requires Master Admin role privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Approvals & Content Guard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review high-volume or flagged campaigns before shard lookahead dispatching.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20">
            {pagination.total} Pending Review
          </span>
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {loading ? (
          <LoadingState label="Scanning pending campaign queue..." />
        ) : error && campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <ErrorState
              title="Failed to Load Campaign Queue"
              message={error}
              retryLabel="Retry"
              onRetry={() => fetchCampaigns(pagination.page)}
            />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
            title="Approval Queue is Clear"
            description="All scheduled campaigns have satisfied automated compliance rules or have been reviewed."
          />
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    PENDING APPROVAL
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {camp.category}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {camp.brandingMode}
                  </span>
                  <span className="text-xs font-mono text-slate-500">ID: {camp.id}</span>
                </div>

                <h3 className="text-base font-bold text-white mt-1">{camp.name || camp.subject}</h3>
                <p className="text-xs text-slate-300 font-medium">Subject: <span className="text-slate-400">{camp.subject}</span></p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span>Tenant: <strong className="text-slate-200">{camp.account?.name || camp.account?.email || camp.accountId}</strong></span>
                  <span>Recipients: <strong className="text-slate-200 font-mono">{camp.totalRecipients}</strong></span>
                  <span>Total Deducted: <strong className="text-emerald-400 font-mono">${Number(camp.totalCostDeducted || 0).toFixed(3)}</strong></span>
                  <span>Sender: <strong className="text-slate-300 font-mono">{camp.senderEmail}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={() => handleApprove(camp)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Dispatch</span>
                </button>
                <button
                  onClick={() => setRejectingCampaign(camp)}
                  className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Reject & Refund</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-4">
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchCampaigns(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 transition"
            >
              Previous
            </button>
            <button
              onClick={() => fetchCampaigns(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reusable Dialog for Rejection Reason */}
      {rejectingCampaign && (
        <Dialog
          isOpen={Boolean(rejectingCampaign)}
          onClose={() => !isProcessing && setRejectingCampaign(null)}
          title="Confirm Campaign Rejection & Refund"
          description={`Rejecting "${rejectingCampaign.name || rejectingCampaign.subject}" will immediately halt delivery and trigger an automated 100% wallet credit refund ($${Number(rejectingCampaign.totalCostDeducted || 0).toFixed(3)}) to the client account.`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Rejection Policy Reason
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Specify compliance violation or terms breach..."
              />
            </div>

            <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setRejectingCampaign(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-rose-600/20 transition flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Processing Refund...' : 'Reject & Issue 100% Refund'}</span>
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
