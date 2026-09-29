'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileCheck,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Download,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

function PdcTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdcs, setPdcs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '');
  const [timing, setTiming] = useState(searchParams.get('timing') || '');

  // Upload PDC Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [pdcNum, setPdcNum] = useState('');
  const [pdcClientId, setPdcClientId] = useState('');
  const [pdcInvoiceId, setPdcInvoiceId] = useState('');
  const [pdcBank, setPdcBank] = useState('');
  const [pdcChequeDate, setPdcChequeDate] = useState('');
  const [pdcAmount, setPdcAmount] = useState('');
  const [pdcStatus, setPdcStatus] = useState('Received');
  const [pdcNotes, setPdcNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBase64, setDocBase64] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Status Change Modal State
  const [selectedPdc, setSelectedPdc] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchPdcs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (clientId) params.set('clientId', clientId);
      if (timing) params.set('timing', timing);

      const res = await fetch(`/api/finance/pdcs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPdcs(data.pdcs || []);
      }
    } catch (err) {
      console.error('Error fetching PDCs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, status, clientId, timing]);

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const clientsRes = await fetch('/api/finance/clients');
        if (clientsRes.ok) {
          const cData = await clientsRes.json();
          setClients(cData.clients || []);
        }

        const invRes = await fetch('/api/finance/invoices');
        if (invRes.ok) {
          const iData = await invRes.json();
          setInvoices(iData.invoices || []);
        }
      } catch (err) {
        console.error('Init error:', err);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    fetchPdcs();
  }, [fetchPdcs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File exceeds 10MB limit.');
        return;
      }
      setDocFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPdc = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!pdcNum.trim() || !pdcClientId || !pdcBank.trim() || !pdcChequeDate || !pdcAmount) {
      setUploadError('PDC number, client, bank, cheque date, and amount are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/finance/pdcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdc_number: pdcNum.trim(),
          client_id: pdcClientId,
          invoice_id: pdcInvoiceId || null,
          bank_name: pdcBank.trim(),
          cheque_date: pdcChequeDate,
          amount: parseFloat(pdcAmount),
          status: pdcStatus,
          notes: pdcNotes,
          document_data: docBase64 || undefined,
          document_filename: docFile?.name || undefined,
          document_mime_type: docFile?.type || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save PDC');
      }

      setIsUploadOpen(false);
      setPdcNum('');
      setPdcBank('');
      setPdcChequeDate('');
      setPdcAmount('');
      setPdcNotes('');
      setDocFile(null);
      setDocBase64('');
      fetchPdcs();
    } catch (err: any) {
      setUploadError(err.message || 'Error recording PDC');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePdcStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPdc || !newStatus) return;

    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/finance/pdcs/${selectedPdc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes ? `${selectedPdc.notes ? selectedPdc.notes + '\n' : ''}[${new Date().toISOString().split('T')[0]}] ${statusNotes}` : undefined,
        }),
      });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to update status');
      }

      setIsStatusModalOpen(false);
      setSelectedPdc(null);
      fetchPdcs();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-purple-600" />
              <span>Post-Dated Cheques (PDC) Tracker</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Upload, track, clear, and manage post-dated client cheques and deposits.
            </p>
          </div>

          <button
            onClick={() => {
              setPdcChequeDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
              setIsUploadOpen(true);
            }}
            className="inline-flex items-center space-x-2 py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Upload className="w-4 h-4" />
            <span>+ Upload PDC</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search PDC #, bank, client, invoice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              <option value="Deposited">Deposited</option>
              <option value="Cleared">Cleared</option>
              <option value="Bounced">Bounced</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Dates</option>
              <option value="due_soon">Due Soon (Next 7 Days)</option>
            </select>
          </div>
        </div>

        {/* PDC Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">PDC #</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Bank</th>
                  <th className="py-3.5 px-4">Cheque Date</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Document</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading PDCs...
                    </td>
                  </tr>
                ) : pdcs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No post-dated cheques recorded matching this criteria.
                    </td>
                  </tr>
                ) : (
                  pdcs.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.pdc_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.client_name}</td>
                      <td className="py-3 px-4 text-indigo-600 font-medium">
                        {p.invoice_number ? (
                          <a href={`/finance/invoices?id=${p.invoice_id}`} className="hover:underline">
                            {p.invoice_number}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{p.bank_name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.cheque_date}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {p.currency} {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.status === 'Cleared'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'Bounced'
                              ? 'bg-rose-100 text-rose-800'
                              : p.status === 'Deposited'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.document_id ? (
                          <a
                            href={`/api/finance/documents/${p.document_id}?download=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No file</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedPdc(p);
                            setNewStatus(p.status);
                            setStatusNotes('');
                            setIsStatusModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 font-bold text-xs"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload PDC Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                <span>Upload Post-Dated Cheque (PDC)</span>
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadPdc} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client *</label>
                  <select
                    required
                    value={pdcClientId}
                    onChange={(e) => {
                      setPdcClientId(e.target.value);
                      setPdcInvoiceId('');
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Linked Invoice (Optional)</label>
                  <select
                    value={pdcInvoiceId}
                    onChange={(e) => setPdcInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No linked invoice</option>
                    {invoices
                      .filter((i) => !pdcClientId || String(i.client_id) === String(pdcClientId))
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.invoice_number} ({i.currency} {Number(i.total_amount).toLocaleString()})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cheque / PDC Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 000142"
                    value={pdcNum}
                    onChange={(e) => setPdcNum(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emirates NBD, ADCB, FAB"
                    value={pdcBank}
                    onChange={(e) => setPdcBank(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cheque Date *</label>
                  <input
                    type="date"
                    required
                    value={pdcChequeDate}
                    onChange={(e) => setPdcChequeDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (AED) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="10000"
                    value={pdcAmount}
                    onChange={(e) => setPdcAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PDC Status</label>
                  <select
                    value={pdcStatus}
                    onChange={(e) => setPdcStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                    <option value="Deposited">Deposited</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Upload Cheque Scan (PDF/IMG)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional internal notes"
                  value={pdcNotes}
                  onChange={(e) => setPdcNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {submitting ? 'Uploading...' : 'Save PDC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update PDC Status Modal */}
      {isStatusModalOpen && selectedPdc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-slate-900">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Update PDC Status</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePdcStatus} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">{selectedPdc.pdc_number} • {selectedPdc.bank_name}</div>
                <div className="text-slate-500 mt-0.5">Amount: {selectedPdc.currency} {Number(selectedPdc.amount).toLocaleString()}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Received">Received</option>
                  <option value="Deposited">Deposited</option>
                  <option value="Cleared">Cleared</option>
                  <option value="Bounced">Bounced</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Note / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Deposited in ENBD account"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {updatingStatus ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function PdcTrackerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading PDCs...</div>}>
      <PdcTrackerContent />
    </Suspense>
  );
}
