'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Building,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileText,
  CreditCard,
  FileCheck,
  Download,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { TaskFormModal } from './TaskFormModal';

interface InvoiceDetailModalProps {
  invoiceId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  currentUser: any;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoiceId,
  isOpen,
  onClose,
  onRefresh,
  currentUser,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  // Payment Recording Modal State
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Task Creation Pre-populated Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskInitialValues, setTaskInitialValues] = useState<any>(null);

  const fetchInvoiceDetail = async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/finance/invoices/${invoiceId}`);
      if (!res.ok) {
        throw new Error('Failed to load invoice details');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceDetail();
    } else {
      setData(null);
    }
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!payAmount || parseFloat(payAmount) <= 0) {
      setPaymentError('Please enter a valid amount');
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: payAmount,
          payment_date: payDate,
          payment_method: payMethod,
          payment_reference: payRef,
          notes: payNotes,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Failed to record payment');
      }

      setIsRecordPaymentOpen(false);
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      fetchInvoiceDetail();
      onRefresh();
    } catch (err: any) {
      setPaymentError(err.message || 'Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenCreateTask = () => {
    if (!data?.invoice) return;
    const inv = data.invoice;
    setTaskInitialValues({
      taskName: `Follow up: ${inv.invoice_number} - ${inv.client_name}`,
      description: `Invoice: ${inv.invoice_number}\nClient: ${inv.client_name}\nTotal: ${inv.currency} ${Number(inv.total_amount).toLocaleString()}\nOutstanding: ${inv.currency} ${Number(inv.outstanding_amount).toLocaleString()}\nDue Date: ${inv.due_date}`,
      dueDate: inv.due_date,
      invoiceId: inv.id,
      department: 'Finance',
    });
    setIsTaskModalOpen(true);
  };

  const invoice = data?.invoice;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {invoice?.invoice_number || 'Loading Invoice...'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {invoice ? `Client: ${invoice.client_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading invoice details...</div>
            ) : error ? (
              <div className="p-8 text-center text-xs text-rose-600">{error}</div>
            ) : invoice ? (
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Financial Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Total Invoiced
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {invoice.currency} {Number(invoice.total_amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                      Amount Paid
                    </span>
                    <span className="text-base font-black text-emerald-600">
                      {invoice.currency} {Number(invoice.paid_amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                      Outstanding
                    </span>
                    <span className="text-base font-black text-amber-600">
                      {invoice.currency} {Number(invoice.outstanding_amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Payment Status
                    </span>
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${
                        invoice.effective_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : invoice.effective_status === 'Overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {invoice.effective_status}
                    </span>
                  </div>
                </div>

                {/* Client & Account Owner Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Client Details
                    </span>
                    <div className="font-bold text-slate-900 text-sm">{invoice.client_name}</div>
                    {invoice.client_contact_person && (
                      <div className="text-slate-600">Contact: {invoice.client_contact_person}</div>
                    )}
                    {invoice.client_email && <div className="text-slate-500">{invoice.client_email}</div>}
                    {invoice.client_phone && <div className="text-slate-500">{invoice.client_phone}</div>}
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Dates & Responsible Owner
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Invoice Date:</span>
                      <span className="font-semibold text-slate-800">{invoice.invoice_date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Due Date:</span>
                      <span className="font-bold text-slate-900">{invoice.due_date}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Account Owner:</span>
                      <span className="font-semibold text-indigo-600">{invoice.account_owner_name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>

                {/* Subtotal & VAT Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{invoice.currency} {Number(invoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>VAT ({invoice.vat_rate}%):</span>
                    <span>{invoice.currency} {Number(invoice.vat_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1 text-sm">
                    <span>Invoice Total:</span>
                    <span>{invoice.currency} {Number(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Action Buttons: Record Payment & Create Related Task */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    {invoice.outstanding_amount > 0 && (
                      <button
                        onClick={() => {
                          setPayAmount(String(invoice.outstanding_amount));
                          setIsRecordPaymentOpen(true);
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenCreateTask}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>+ Create Related Task</span>
                    </button>
                  </div>
                </div>

                {/* Recorded Payments History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>Payment History ({data.payments?.length || 0})</span>
                  </h4>
                  {(!data.payments || data.payments.length === 0) ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                      No payments recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {data.payments.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">
                              {invoice.currency} {Number(p.amount).toLocaleString()}
                            </span>
                            <span className="text-slate-500 ml-2">via {p.payment_method}</span>
                            {p.payment_reference && (
                              <span className="text-slate-400 ml-2 font-mono text-[10px]">
                                (Ref: {p.payment_reference})
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 font-medium">{p.payment_date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked PDCs */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Associated Post-Dated Cheques ({data.pdcs?.length || 0})</span>
                  </h4>
                  {(!data.pdcs || data.pdcs.length === 0) ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                      No PDCs linked to this invoice.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {data.pdcs.map((p: any) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">
                              PDC #{p.pdc_number} • {p.bank_name}
                            </span>
                            <span className="text-slate-500 ml-2">
                              {invoice.currency} {Number(p.amount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500">Cheque Date: {p.cheque_date}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked Tasks */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Linked Tasks ({data.tasks?.length || 0})</span>
                  </h4>
                  {(!data.tasks || data.tasks.length === 0) ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                      No follow-up tasks linked to this invoice.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {data.tasks.map((t: any) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{t.task_name}</span>
                            <span className="text-slate-500 ml-2">Assigned to: {t.assigned_to_name}</span>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Record Payment Sub-Modal */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
              <button onClick={() => setIsRecordPaymentOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque / PDC">Cheque / PDC</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / Transaction #</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-99824"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional payment notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  {submittingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation Modal Pre-populated */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          setIsTaskModalOpen(false);
          fetchInvoiceDetail();
        }}
        initialValues={taskInitialValues}
      />
    </>
  );
};
