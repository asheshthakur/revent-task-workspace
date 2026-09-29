'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Download,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { InvoiceDetailModal } from '@/components/InvoiceDetailModal';
import { TaskFormModal } from '@/components/TaskFormModal';

function InvoiceTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('paymentStatus') || '');
  const [pdcStatus, setPdcStatus] = useState('');
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '');
  const [timing, setTiming] = useState(searchParams.get('timing') || '');

  // Modals
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create Invoice Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get('create') === 'true');
  const [invNum, setInvNum] = useState('');
  const [invClientId, setInvClientId] = useState('');
  const [invOwnerId, setInvOwnerId] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState('');
  const [invSubtotal, setInvSubtotal] = useState('');
  const [invVatRate, setInvVatRate] = useState('5.0');
  const [invNotes, setInvNotes] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Pre-populated Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskInitialValues, setTaskInitialValues] = useState<any>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (pdcStatus) params.set('pdcStatus', pdcStatus);
      if (clientId) params.set('clientId', clientId);
      if (timing) params.set('timing', timing);

      const res = await fetch(`/api/finance/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [search, paymentStatus, pdcStatus, clientId, timing]);

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

        const empRes = await fetch('/api/employees?active=true');
        if (empRes.ok) {
          const eData = await empRes.json();
          setEmployees(eData.employees || []);
        }
      } catch (err) {
        console.error('Init error:', err);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const targetId = searchParams.get('id');
    if (targetId) {
      setSelectedInvoiceId(parseInt(targetId, 10));
      setIsDetailOpen(true);
    }
  }, [searchParams]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!invNum.trim() || !invClientId || !invDueDate) {
      setCreateError('Invoice number, client, and due date are required');
      return;
    }

    try {
      setCreateSubmitting(true);
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: invNum.trim(),
          client_id: invClientId,
          account_owner_id: invOwnerId || currentUser.id,
          invoice_date: invDate,
          due_date: invDueDate,
          subtotal: parseFloat(invSubtotal) || 0,
          vat_rate: parseFloat(invVatRate) || 0,
          notes: invNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create invoice');
      }

      setIsCreateOpen(false);
      setInvNum('');
      setInvSubtotal('');
      setInvDueDate('');
      setInvNotes('');
      fetchInvoices();
    } catch (err: any) {
      setCreateError(err.message || 'Error creating invoice');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenRelatedTask = (inv: any) => {
    setTaskInitialValues({
      taskName: `Follow up: ${inv.invoice_number} - ${inv.client_name}`,
      description: `Invoice: ${inv.invoice_number}\nClient: ${inv.client_name}\nTotal: ${inv.currency} ${Number(inv.total_amount).toLocaleString()}\nOutstanding: ${inv.currency} ${Number(inv.outstanding_amount).toLocaleString()}\nDue Date: ${inv.due_date}`,
      dueDate: inv.due_date,
      invoiceId: inv.id,
      department: 'Finance',
    });
    setIsTaskModalOpen(true);
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
              <Receipt className="w-6 h-6 text-emerald-600" />
              <span>Internal Invoice Tracker</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Search, filter, track client invoices, payments, and connected follow-up tasks.
            </p>
          </div>

          <button
            onClick={() => {
              setInvNum(`INV-${Date.now().toString().slice(-4)}`);
              setInvDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center space-x-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Invoice</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search invoice #, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Payment Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={pdcStatus}
              onChange={(e) => setPdcStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All PDC Statuses</option>
              <option value="Received">PDC Received</option>
              <option value="Pending">PDC Pending</option>
              <option value="Deposited">PDC Deposited</option>
              <option value="Cleared">PDC Cleared</option>
              <option value="Bounced">PDC Bounced</option>
              <option value="None">No PDC</option>
            </select>

            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Timings</option>
              <option value="overdue">Overdue Only</option>
              <option value="due_today">Due Today</option>
              <option value="due_week">Due This Week</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Subtotal</th>
                  <th className="py-3.5 px-4 text-right">VAT</th>
                  <th className="py-3.5 px-4 text-right">Total</th>
                  <th className="py-3.5 px-4 text-right">Paid</th>
                  <th className="py-3.5 px-4 text-right">Outstanding</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">PDC</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      No invoices match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[150px] truncate">
                        {inv.client_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {inv.due_date}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {Number(inv.subtotal).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {Number(inv.vat_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {inv.currency} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {Number(inv.paid_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600">
                        {Number(inv.outstanding_amount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            inv.effective_status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.effective_status === 'Overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : inv.effective_status === 'Partially Paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.effective_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          inv.pdc_status === 'Cleared'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.pdc_status === 'Received'
                            ? 'bg-purple-50 text-purple-700'
                            : inv.pdc_status === 'Bounced'
                            ? 'bg-rose-50 text-rose-700'
                            : 'text-slate-400'
                        }`}>
                          {inv.pdc_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-[100px]">
                        {inv.account_owner_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedInvoiceId(inv.id);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenRelatedTask(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Create Related Task"
                        >
                          <Layers className="w-4 h-4" />
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

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedInvoiceId(null);
        }}
        onRefresh={fetchInvoices}
        currentUser={currentUser}
      />

      {/* Create Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Create New Invoice</span>
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-1001"
                    value={invNum}
                    onChange={(e) => setInvNum(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Client *</label>
                  <select
                    required
                    value={invClientId}
                    onChange={(e) => setInvClientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subtotal (AED) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="10000"
                    value={invSubtotal}
                    onChange={(e) => setInvSubtotal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={invVatRate}
                    onChange={(e) => setInvVatRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Owner / Manager</label>
                <select
                  value={invOwnerId}
                  onChange={(e) => setInvOwnerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Current User ({currentUser.name})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department || 'Employee'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Terms, payment instructions, or internal notes"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {createSubmitting ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          setIsTaskModalOpen(false);
          fetchInvoices();
        }}
        initialValues={taskInitialValues}
      />
    </AppLayout>
  );
}

export default function InvoiceTrackerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Invoices...</div>}>
      <InvoiceTrackerContent />
    </Suspense>
  );
}
