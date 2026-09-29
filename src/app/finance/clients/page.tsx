'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Receipt,
  FileCheck,
  CreditCard,
  Layers,
  X,
  Eye,
  Mail,
  Phone,
  Building,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { InvoiceDetailModal } from '@/components/InvoiceDetailModal';

function ClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Add Client Modal
  const [isAddOpen, setIsAddOpen] = useState(searchParams.get('add') === 'true');
  const [clientName, setClientName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [accountOwnerId, setAccountOwnerId] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  // Client Financial Profile Modal
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null
  );
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'pdcs' | 'payments' | 'tasks'>('invoices');

  // Invoice Detail Modal pass-through
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/finance/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

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
    fetchClients();
  }, [fetchClients]);

  const fetchClientProfile = useCallback(async (id: number) => {
    try {
      setProfileLoading(true);
      const res = await fetch(`/api/finance/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClientProfile(data);
      }
    } catch (err) {
      console.error('Error loading client profile:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientProfile(selectedClientId);
    } else {
      setClientProfile(null);
    }
  }, [selectedClientId, fetchClientProfile]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!clientName.trim()) {
      setAddError('Company or client name is required.');
      return;
    }

    try {
      setAddSubmitting(true);
      const res = await fetch('/api/finance/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName.trim(),
          contact_person: contactPerson.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          account_owner_id: accountOwnerId || currentUser.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create client');
      }

      setIsAddOpen(false);
      setClientName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAddress('');
      fetchClients();
    } catch (err: any) {
      setAddError(err.message || 'Error creating client');
    } finally {
      setAddSubmitting(false);
    }
  };

  const totalInvoiced = clients.reduce((sum, c) => sum + (Number(c.total_invoiced) || 0), 0);
  const totalPaid = clients.reduce((sum, c) => sum + (Number(c.total_paid) || 0), 0);
  const totalOutstanding = clients.reduce((sum, c) => sum + (Number(c.total_outstanding) || 0), 0);

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
              <Building className="w-6 h-6 text-emerald-600" />
              <span>Clients & Financial Profiles</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Complete customer directory, total invoiced, payments collected, outstanding receivables, and connected tasks.
            </p>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center space-x-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Client</span>
          </button>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Clients
            </div>
            <div className="text-2xl font-black text-slate-900">{clients.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Active enterprise accounts</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Total Invoiced
            </div>
            <div className="text-xl font-black text-slate-900">
              AED {totalInvoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across all client accounts</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs bg-emerald-50/20">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
              Total Collected
            </div>
            <div className="text-xl font-black text-emerald-900">
              AED {totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Realized revenues</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs bg-amber-50/20">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">
              Total Outstanding
            </div>
            <div className="text-xl font-black text-amber-900">
              AED {totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Receivable balances</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Search clients by name, contact person, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Clients Directory Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Client Name</th>
                  <th className="py-3.5 px-4">Contact Person</th>
                  <th className="py-3.5 px-4">Account Manager</th>
                  <th className="py-3.5 px-4 text-center">Invoices</th>
                  <th className="py-3.5 px-4 text-center">PDCs</th>
                  <th className="py-3.5 px-4 text-center">Open Tasks</th>
                  <th className="py-3.5 px-4 text-right">Total Invoiced</th>
                  <th className="py-3.5 px-4 text-right">Total Paid</th>
                  <th className="py-3.5 px-4 text-right">Outstanding</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Loading clients directory...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No clients found. Click &quot;+ Add Client&quot; to create the first client profile.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <button
                          onClick={() => setSelectedClientId(c.id)}
                          className="hover:text-emerald-700 text-left cursor-pointer font-bold"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{c.contact_person || '—'}</div>
                        {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.account_owner_name || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-slate-700">{c.invoice_count}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-purple-700">{c.pdc_count}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${c.open_tasks_count > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {c.open_tasks_count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        AED {Number(c.total_invoiced).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        AED {Number(c.total_paid).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600">
                        AED {Number(c.total_outstanding).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedClientId(c.id)}
                          className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Profile</span>
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

      {/* Add Client Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                <span>Add Client Account</span>
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al Futtaim Group"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Tariq Mansoor"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="finance@client.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+971 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
                <textarea
                  rows={2}
                  placeholder="Street, Tower, City..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Internal Account Owner</label>
                <select
                  value={accountOwnerId}
                  onChange={(e) => setAccountOwnerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Current User ({currentUser.name})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {addSubmitting ? 'Adding...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Financial Profile Modal */}
      {selectedClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 text-slate-900 animate-in fade-in zoom-in duration-150">
            {profileLoading || !clientProfile ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading client profile...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building className="w-6 h-6 text-emerald-600" />
                      <h2 className="text-xl font-black text-slate-900">{clientProfile.client.name}</h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      {clientProfile.client.contact_person && (
                        <span>Contact: <strong>{clientProfile.client.contact_person}</strong></span>
                      )}
                      {clientProfile.client.email && <span>{clientProfile.client.email}</span>}
                      {clientProfile.client.phone && <span>{clientProfile.client.phone}</span>}
                      <span>Owner: <strong>{clientProfile.client.account_owner_name || 'Unassigned'}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedClientId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 4 Financial Balances */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Total Invoiced</span>
                    <span className="text-base font-black text-slate-900">
                      AED {Number(clientProfile.financialSummary.totalInvoiced).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 block mb-0.5">Total Paid</span>
                    <span className="text-base font-black text-emerald-700">
                      AED {Number(clientProfile.financialSummary.totalPaid).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <span className="text-[10px] font-bold uppercase text-amber-600 block mb-0.5">Total Outstanding</span>
                    <span className="text-base font-black text-amber-700">
                      AED {Number(clientProfile.financialSummary.totalOutstanding).toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold uppercase text-rose-600 block mb-0.5">Total Overdue</span>
                    <span className="text-base font-black text-rose-700">
                      AED {Number(clientProfile.financialSummary.totalOverdue).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 text-xs font-bold gap-6">
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`pb-2.5 cursor-pointer flex items-center gap-1.5 transition-colors ${
                      activeTab === 'invoices'
                        ? 'border-b-2 border-emerald-600 text-emerald-700'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Invoices ({clientProfile.invoices?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('pdcs')}
                    className={`pb-2.5 cursor-pointer flex items-center gap-1.5 transition-colors ${
                      activeTab === 'pdcs'
                        ? 'border-b-2 border-purple-600 text-purple-700'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>PDCs ({clientProfile.pdcs?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`pb-2.5 cursor-pointer flex items-center gap-1.5 transition-colors ${
                      activeTab === 'payments'
                        ? 'border-b-2 border-blue-600 text-blue-700'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payments ({clientProfile.payments?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`pb-2.5 cursor-pointer flex items-center gap-1.5 transition-colors ${
                      activeTab === 'tasks'
                        ? 'border-b-2 border-indigo-600 text-indigo-700'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Related Tasks ({clientProfile.tasks?.length || 0})</span>
                  </button>
                </div>

                {/* Tab 1: Invoices */}
                {activeTab === 'invoices' && (
                  <div className="overflow-x-auto">
                    {clientProfile.invoices?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No invoices issued for this client yet.</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                            <th className="pb-2">Invoice #</th>
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Due Date</th>
                            <th className="pb-2 text-right">Total</th>
                            <th className="pb-2 text-right">Outstanding</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clientProfile.invoices.map((inv: any) => (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                              <td className="py-2.5 text-slate-500">{inv.invoice_date}</td>
                              <td className="py-2.5 text-slate-600">{inv.due_date}</td>
                              <td className="py-2.5 text-right font-semibold text-slate-900">
                                {inv.currency} {Number(inv.total_amount).toLocaleString()}
                              </td>
                              <td className="py-2.5 text-right font-bold text-amber-600">
                                {Number(inv.outstanding_amount).toLocaleString()}
                              </td>
                              <td className="py-2.5">
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {inv.effective_status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceId(inv.id);
                                    setIsInvoiceDetailOpen(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab 2: PDCs */}
                {activeTab === 'pdcs' && (
                  <div className="overflow-x-auto">
                    {clientProfile.pdcs?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No PDCs recorded for this client.</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                            <th className="pb-2">Cheque #</th>
                            <th className="pb-2">Bank</th>
                            <th className="pb-2">Cheque Date</th>
                            <th className="pb-2">Invoice #</th>
                            <th className="pb-2 text-right">Amount</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clientProfile.pdcs.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-mono font-bold text-slate-900">{p.pdc_number}</td>
                              <td className="py-2.5 text-slate-600">{p.bank_name}</td>
                              <td className="py-2.5 font-medium text-slate-800">{p.cheque_date}</td>
                              <td className="py-2.5 text-slate-500">{p.invoice_number || '—'}</td>
                              <td className="py-2.5 text-right font-bold text-purple-700">
                                {p.currency} {Number(p.amount).toLocaleString()}
                              </td>
                              <td className="py-2.5">
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab 3: Payments */}
                {activeTab === 'payments' && (
                  <div className="overflow-x-auto">
                    {clientProfile.payments?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No payments recorded for this client.</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Invoice #</th>
                            <th className="pb-2">Method</th>
                            <th className="pb-2">Reference</th>
                            <th className="pb-2 text-right">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clientProfile.payments.map((pm: any) => (
                            <tr key={pm.id} className="hover:bg-slate-50">
                              <td className="py-2.5 text-slate-700">{pm.payment_date}</td>
                              <td className="py-2.5 font-mono text-indigo-600 font-bold">{pm.invoice_number}</td>
                              <td className="py-2.5 text-slate-600">{pm.payment_method}</td>
                              <td className="py-2.5 font-mono text-slate-500 text-[11px]">{pm.payment_reference || '—'}</td>
                              <td className="py-2.5 text-right font-bold text-emerald-600">
                                AED {Number(pm.amount).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab 4: Tasks */}
                {activeTab === 'tasks' && (
                  <div className="overflow-x-auto">
                    {clientProfile.tasks?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No operational tasks linked to this client.</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                            <th className="pb-2">Task</th>
                            <th className="pb-2">Assigned To</th>
                            <th className="pb-2">Due Date</th>
                            <th className="pb-2">Priority</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clientProfile.tasks.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-medium text-slate-900">{t.task_name}</td>
                              <td className="py-2.5 text-slate-600">{t.assigned_to_name || 'Unassigned'}</td>
                              <td className="py-2.5 text-slate-500">{t.due_date}</td>
                              <td className="py-2.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  t.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {t.priority}
                                </span>
                              </td>
                              <td className="py-2.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoiceId={selectedInvoiceId}
        isOpen={isInvoiceDetailOpen}
        onClose={() => {
          setIsInvoiceDetailOpen(false);
          setSelectedInvoiceId(null);
        }}
        onRefresh={() => {
          if (selectedClientId) fetchClientProfile(selectedClientId);
          fetchClients();
        }}
        currentUser={currentUser}
      />
    </AppLayout>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Clients...</div>}>
      <ClientsPageContent />
    </Suspense>
  );
}
