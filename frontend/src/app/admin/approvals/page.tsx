'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { messagesApi } from '@/lib/api';
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
} from 'lucide-react';

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Campaign content violation: missing valid unsubscribe footer');
  const [notice, setNotice] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // Fetch messages with status PENDING_APPROVAL
      const res = await messagesApi.list({ limit: 50 });
      if (res && res.data) {
        // Group or filter by campaigns
        const flagged = res.data.filter(
          (m: any) => m.status === 'PENDING_APPROVAL' || m.campaign?.status === 'PENDING_APPROVAL'
        );
        setCampaigns(flagged);
      }
    } catch (err) {
      console.error('Failed to load campaigns for review:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleApprove = async (campaignId: string) => {
    try {
      await messagesApi.approveCampaign(campaignId);
      setNotice(`Campaign ${campaignId} approved! Dispatched to Redis shards.`);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async (campaignId: string) => {
    try {
      await messagesApi.rejectCampaign(campaignId, rejectReason);
      setNotice(`Campaign ${campaignId} rejected. 100% wallet credits automatically refunded to client.`);
      setRejectingId(null);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 mt-1">
          This review queue is restricted to Master Admin accounts. Use the top bar to switch to Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Approvals & Content Guard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Review campaigns flagged by the automated compliance engine for marketing buzzwords, recipient volume, or missing unsubscribe tokens.
        </p>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Approvals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800">
            Checking compliance queue...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
            <span className="font-semibold text-slate-300">Compliance Queue is Clear</span>
            <span className="text-xs text-slate-500 mt-1">
              All active campaigns have met automated compliance or have been approved.
            </span>
          </div>
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    PENDING APPROVAL
                  </span>
                  <span className="text-xs font-mono text-slate-500">ID: {camp.id}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{camp.subject}</h3>
                <p className="text-xs text-slate-400">
                  Recipient: <span className="text-slate-200">{camp.to}</span> | Total Cost:{' '}
                  <span className="text-emerald-400 font-mono font-semibold">${Number(camp.cost).toFixed(3)}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={() => handleApprove(camp.campaignId || camp.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow flex items-center space-x-1.5 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Dispatch</span>
                </button>
                <button
                  onClick={() => setRejectingId(camp.campaignId || camp.id)}
                  className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reject & Refund 100%</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Confirm Campaign Rejection</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Rejecting this campaign will immediately stop delivery and perform an <b>instant 100% wallet credit refund</b> back to the customer's wallet balance.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReject(rejectingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                Reject & Issue Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
