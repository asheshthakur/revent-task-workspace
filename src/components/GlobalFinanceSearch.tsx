'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Building, Receipt, FileCheck, CreditCard, Layers } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  clients: any[];
  invoices: any[];
  pdcs: any[];
  payments: any[];
  tasks: any[];
}

interface GlobalFinanceSearchProps {
  onSelectInvoice?: (invoiceId: number) => void;
  onSelectClient?: (clientId: number) => void;
}

export const GlobalFinanceSearch: React.FC<GlobalFinanceSearchProps> = ({
  onSelectInvoice,
  onSelectClient,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/finance/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results &&
    (results.clients.length > 0 ||
      results.invoices.length > 0 ||
      results.pdcs.length > 0 ||
      results.payments.length > 0 ||
      results.tasks.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          placeholder="Search Finance: client, company, invoice #, PDC #, contact person..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results) setIsOpen(true);
          }}
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        {loading ? (
          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin absolute right-3 top-3" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 absolute right-2.5 top-2.5"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-96 overflow-y-auto">
          {!hasResults ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No financial records, invoices, PDCs, or clients matched &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {/* Clients */}
              {results.clients.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3 h-3 text-indigo-600" />
                    <span>Clients ({results.clients.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.clients.map((c) => (
                      <Link
                        key={c.id}
                        href={`/finance/clients?id=${c.id}`}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.contact_person ? `Contact: ${c.contact_person}` : c.email || 'Client Profile'}
                          </div>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">
                          View Profile &rarr;
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                    <Receipt className="w-3 h-3 text-emerald-600" />
                    <span>Invoices ({results.invoices.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.invoices.map((inv) => (
                      <Link
                        key={inv.id}
                        href={`/finance/invoices?id=${inv.id}`}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {inv.invoice_number} • {inv.client_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Total: {inv.currency} {Number(inv.total_amount).toLocaleString()} • Outstanding: {inv.currency} {Number(inv.outstanding_amount).toLocaleString()}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inv.effective_status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.effective_status === 'Overdue'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.effective_status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* PDCs */}
              {results.pdcs.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                    <FileCheck className="w-3 h-3 text-purple-600" />
                    <span>PDCs ({results.pdcs.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.pdcs.map((p) => (
                      <Link
                        key={p.id}
                        href={`/finance/pdcs?search=${encodeURIComponent(p.pdc_number)}`}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            PDC #{p.pdc_number} • {p.bank_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p.client_name} • {p.currency} {Number(p.amount).toLocaleString()} • Cheque Date: {p.cheque_date}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                          {p.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {results.payments.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                    <CreditCard className="w-3 h-3 text-blue-600" />
                    <span>Payments ({results.payments.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.payments.map((pm) => (
                      <Link
                        key={pm.id}
                        href={`/finance/payments?search=${encodeURIComponent(pm.invoice_number || '')}`}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            AED {Number(pm.amount).toLocaleString()} • {pm.client_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {pm.payment_method} • Ref: {pm.payment_reference || 'N/A'} • {pm.payment_date}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Inv: {pm.invoice_number || 'N/A'}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                    <Layers className="w-3 h-3 text-indigo-600" />
                    <span>Related Tasks ({results.tasks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.tasks.map((t) => (
                      <Link
                        key={t.id}
                        href={`/all-tasks?search=${encodeURIComponent(t.task_name)}`}
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{t.task_name}</div>
                          <div className="text-[11px] text-slate-500">
                            Assigned To: {t.assigned_to_name} {t.invoice_number ? `• Linked Invoice: ${t.invoice_number}` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {t.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
