'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CreditCard, 
  FileCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Loader2, 
  Building2,
  ExternalLink
} from 'lucide-react';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

interface CommercialWorkspaceCardProps {
  activeOrg: any;
  currentUser: any;
}

export const CommercialWorkspaceCard: React.FC<CommercialWorkspaceCardProps> = ({
  activeOrg,
  currentUser,
}) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dpaLoading, setDpaLoading] = useState(false);
  const [dpaSuccess, setDpaSuccess] = useState(false);
  
  // Deletion Request Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionScheduled, setDeletionScheduled] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const isOwner = activeOrg.role === 'owner';
  const isAdmin = activeOrg.is_admin;

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workspaces/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
      
      const delRes = await fetch('/api/workspaces/deletion-request');
      if (delRes.ok) {
        const delData = await delRes.json();
        if (delData.pendingDeletionRequest) {
          setDeletionScheduled(delData.pendingDeletionRequest.scheduled_purge_at);
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [activeOrg.id]);

  const handleSignDpa = async () => {
    try {
      setDpaLoading(true);
      const res = await fetch('/api/legal/acceptances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'DPA',
          documentVersion: '1.0',
          acceptanceType: 'WORKSPACE_ADMIN_EXECUTION',
          organisationId: activeOrg.id,
          metadata: {
            organizationName: activeOrg.name,
            executedByRole: activeOrg.role,
          },
        }),
      });

      if (res.ok) {
        setDpaSuccess(true);
        loadSubscription();
      }
    } catch {
      // Non-fatal
    } finally {
      setDpaLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      const res = await fetch('/api/workspaces/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationText: deleteConfirmInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule deletion');
      }
      setDeletionScheduled(data.scheduledPurgeAt);
      setShowDeleteModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion error';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
      </div>
    );
  }

  const planId = subscription?.plan_id || 'pro';
  const planInfo = VEYA_LEGAL_CONFIG.PRICING_PLANS.find(p => p.id === planId) || VEYA_LEGAL_CONFIG.PRICING_PLANS[1];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Commercial Plan & Legal Compliance</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Overview of organizational subscription tier, B2B contracting status, and statutory data protection agreements.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            Plan: {planInfo.name}
          </span>
        </div>
      </div>

      {/* Deletion Warning Banner if scheduled */}
      {deletionScheduled && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Organizational Erasure Scheduled</span>
            <p className="text-amber-800 leading-relaxed">
              This workspace has been scheduled for permanent erasure on{' '}
              <strong>{new Date(deletionScheduled).toLocaleDateString()}</strong>. You are currently in the 30-day export grace period.
            </p>
          </div>
        </div>
      )}

      {/* Compliance Checklist Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">Terms of Service</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-slate-500 text-[11px]">
            Acknowledged upon user registration (v1.0).
          </p>
          <Link href="/legal/terms" target="_blank" className="text-indigo-600 font-semibold text-[11px] hover:underline inline-flex items-center space-x-1">
            <span>Review Terms</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">Privacy Policy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-slate-500 text-[11px]">
            UAE PDPL aligned disclosure (v1.0).
          </p>
          <Link href="/legal/privacy" target="_blank" className="text-indigo-600 font-semibold text-[11px] hover:underline inline-flex items-center space-x-1">
            <span>Review Policy</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">Data Processing (DPA)</span>
            {subscription?.dpa_accepted_at ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Pending
              </span>
            )}
          </div>
          <p className="text-slate-500 text-[11px]">
            {subscription?.dpa_accepted_at
              ? `Executed on ${new Date(subscription.dpa_accepted_at).toLocaleDateString()}`
              : 'Statutory controller/processor agreement.'}
          </p>
          {subscription?.dpa_accepted_at ? (
            <Link href="/legal/dpa" target="_blank" className="text-indigo-600 font-semibold text-[11px] hover:underline inline-flex items-center space-x-1">
              <span>View Executed DPA</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          ) : isAdmin ? (
            <button
              onClick={handleSignDpa}
              disabled={dpaLoading}
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {dpaLoading ? 'Executing...' : 'Execute DPA for Org'}
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">Admin execution required</span>
          )}
        </div>
      </div>

      {/* Plan Details & Upgrades */}
      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-900 block text-sm">{planInfo.name}</span>
            <span className="text-slate-600 text-[11px]">{planInfo.description}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/pricing"
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-colors inline-flex items-center space-x-1"
            >
              <span>View All Plans</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="/legal/order-form"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
            >
              Enterprise Contracting
            </Link>
          </div>
        </div>
      </div>

      {/* Danger Zone: Workspace Deletion */}
      {isOwner && (
        <div className="pt-4 border-t border-red-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Organizational Data Erasure & Termination</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Permanently purge all workspace records, projects, tasks, chat histories, and employee time entries.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Request Deletion
            </button>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Confirm Workspace Erasure</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will schedule permanent deletion of the entire workspace <strong>{activeOrg.name}</strong>. Pursuant to our Data Retention Policy, you will receive a <strong>30-day export grace period</strong> before database records and files are irrevocably purged.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {deleteError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Type <span className="font-mono text-red-600 font-bold">DELETE {activeOrg.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={`DELETE ${activeOrg.name}`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmInput('');
                  setDeleteError('');
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput !== `DELETE ${activeOrg.name}` || isDeleting}
                onClick={handleRequestDeletion}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Erasure Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
