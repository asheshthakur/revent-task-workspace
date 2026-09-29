'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign,
  Receipt,
  FileCheck,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Building,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { GlobalFinanceSearch } from '@/components/GlobalFinanceSearch';

export default function FinanceOverviewPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndOverview = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const res = await fetch('/api/finance/overview');
        if (res.ok) {
          const overviewData = await res.json();
          setData(overviewData);
        }
      } catch (err) {
        console.error('Error fetching finance overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndOverview();
  }, [router]);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalInvoices: 0,
    totalInvoiceValue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
    overdueValue: 0,
    pdcsReceived: 0,
    pdcsPending: 0,
    pdcsDueSoon: 0,
    pdcsCleared: 0,
    pdcsBounced: 0,
  };

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-6">
        {/* Top Header & Global Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              <span>Finance & Invoicing Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time cash flow, client receivables, PDCs, and invoice tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <GlobalFinanceSearch />
            <Link
              href="/finance/invoices?create=true"
              className="inline-flex items-center space-x-2 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Invoice</span>
            </Link>
          </div>
        </div>

        {/* 11 Mandatory Finance KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Invoices */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Invoices</span>
              <Receipt className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-slate-900">{stats.totalInvoices}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Recorded invoices</div>
          </div>

          {/* Total Invoice Value */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Value</span>
              <TrendingUp className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-lg font-black text-slate-900">
              AED {stats.totalInvoiceValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cumulative billed</div>
          </div>

          {/* Total Paid */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Paid</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-emerald-900">
              AED {stats.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Collected revenue</div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs bg-amber-50/20">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Outstanding</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-lg font-black text-amber-900">
              AED {stats.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Pending collection</div>
          </div>

          {/* Overdue Invoices */}
          <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-lg font-black text-rose-900">
              {stats.overdueCount} ({stats.overdueValue > 0 ? `AED ${stats.overdueValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '0'})
            </div>
            <div className="text-[10px] text-rose-600 mt-0.5">Requires follow-up</div>
          </div>

          {/* PDCs Received */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-purple-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">PDCs Received</span>
              <FileCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-900">{stats.pdcsReceived}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">In possession</div>
          </div>
        </div>

        {/* Secondary PDC KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">PDCs Due Soon (7 Days)</span>
            <span className="text-base font-black text-amber-600">{stats.pdcsDueSoon}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">Due for deposit</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">PDCs Pending</span>
            <span className="text-base font-black text-slate-700">{stats.pdcsPending}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">Awaiting receipt</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">PDCs Cleared</span>
            <span className="text-base font-black text-emerald-600">{stats.pdcsCleared}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">Funds realized</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">PDCs Bounced</span>
            <span className="text-base font-black text-rose-600">{stats.pdcsBounced}</span>
            <span className="text-slate-400 text-[10px] ml-1.5">Requires action</span>
          </div>
        </div>

        {/* Quick Link Navigation Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/finance/invoices"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Invoice Tracker</div>
              <div className="text-[11px] text-slate-500">View and manage invoices</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </Link>

          <Link
            href="/finance/pdcs"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-400 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600">PDC Tracker</div>
              <div className="text-[11px] text-slate-500">Post-dated cheques workflow</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
          </Link>

          <Link
            href="/finance/payments"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Payments Tracker</div>
              <div className="text-[11px] text-slate-500">Recorded receipts & history</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </Link>

          <Link
            href="/finance/clients"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Client Profiles</div>
              <div className="text-[11px] text-slate-500">Customer balances & records</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
          </Link>
        </div>

        {/* Two-Column Activity Feeds: Upcoming Due Dates & Recent Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming & Overdue Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Upcoming & Overdue Invoices</span>
              </h3>
              <Link href="/finance/invoices?timing=overdue" className="text-xs text-indigo-600 font-semibold hover:underline">
                View All &rarr;
              </Link>
            </div>

            {(!data?.upcomingInvoices || data.upcomingInvoices.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No pending or overdue invoices found.
              </div>
            ) : (
              <div className="space-y-2">
                {data.upcomingInvoices.map((inv: any) => (
                  <Link
                    key={inv.id}
                    href={`/finance/invoices?id=${inv.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{inv.invoice_number} • {inv.client_name}</div>
                      <div className="text-[11px] text-slate-500">
                        Due: <span className="font-semibold">{inv.due_date}</span> • Outstanding: <span className="font-bold text-slate-800">{inv.currency} {Number(inv.outstanding_amount).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      inv.effective_status === 'Overdue'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.effective_status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming PDCs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Upcoming Post-Dated Cheques (PDCs)</span>
              </h3>
              <Link href="/finance/pdcs?timing=due_soon" className="text-xs text-indigo-600 font-semibold hover:underline">
                View All &rarr;
              </Link>
            </div>

            {(!data?.upcomingPdcs || data.upcomingPdcs.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active PDCs scheduled for upcoming deposit.
              </div>
            ) : (
              <div className="space-y-2">
                {data.upcomingPdcs.map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/finance/pdcs?search=${encodeURIComponent(p.pdc_number)}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        PDC #{p.pdc_number} • {p.bank_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.client_name} • Cheque Date: <span className="font-semibold text-slate-800">{p.cheque_date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {p.currency} {Number(p.amount).toLocaleString()}
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700">
                        {p.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recently Recorded Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Recently Recorded Client Payments</span>
            </h3>
            <Link href="/finance/payments" className="text-xs text-indigo-600 font-semibold hover:underline">
              View All Payments &rarr;
            </Link>
          </div>

          {(!data?.recentPayments || data.recentPayments.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Client</th>
                    <th className="pb-2.5">Invoice</th>
                    <th className="pb-2.5">Method</th>
                    <th className="pb-2.5">Reference</th>
                    <th className="pb-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentPayments.map((pm: any) => (
                    <tr key={pm.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 font-medium text-slate-700">{pm.payment_date}</td>
                      <td className="py-2.5 font-bold text-slate-900">{pm.client_name}</td>
                      <td className="py-2.5 text-indigo-600 font-semibold">
                        <Link href={`/finance/invoices?id=${pm.invoice_id}`}>{pm.invoice_number}</Link>
                      </td>
                      <td className="py-2.5 text-slate-600">{pm.payment_method}</td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">{pm.payment_reference || '—'}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        AED {Number(pm.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
