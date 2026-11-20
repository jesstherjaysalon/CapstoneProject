import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { AlertCircle, CheckCircle, ClipboardList, Download, Plus, Search, Trash2, Truck, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import formatQuantityWithUnit from '@/utils/formatQuantityWithUnit';

const today = () => {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
};

const emptyItem = () => ({ product_id: '', quantity: '1', unit_cost: '' });

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const formatDate = (value) => {
    if (!value) return '-';

    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
};

const escapeHtml = (value) => String(value === null || value === undefined ? '' : value)
    .replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    })[character]);

async function readJson(response) {
    const data = await response.json();
    if (!response.ok) {
        const validationMessage = data.errors ? Object.values(data.errors).flat()[0] : null;
        throw new Error(validationMessage || data.message || 'The request could not be completed.');
    }
    return data;
}

export default function Receiving({ auth }) {
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [supplierId, setSupplierId] = useState('');
    const [transactionDate, setTransactionDate] = useState(today);
    const [remarks, setRemarks] = useState('');
    const [items, setItems] = useState([emptyItem()]);
    const [historySearch, setHistorySearch] = useState('');
    const [historyStatus, setHistoryStatus] = useState('');
    const [historySupplier, setHistorySupplier] = useState('');
    const [historyFromDate, setHistoryFromDate] = useState('');
    const [historyToDate, setHistoryToDate] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmingReceipt, setConfirmingReceipt] = useState(null);

    const fetchSuppliers = useCallback(async () => {
        setSuppliers(await readJson(await fetch('/admin/suppliers', {
            headers: { Accept: 'application/json' },
        })));
    }, []);

    const fetchProducts = useCallback(async () => {
        const data = await readJson(await fetch('/admin/products', {
            headers: { Accept: 'application/json' },
        }));
        setProducts(data.filter((product) => product.is_active));
    }, []);

    const fetchReceipts = useCallback(async () => {
        setReceipts(await readJson(await fetch('/admin/receivings', {
            headers: { Accept: 'application/json' },
        })));
    }, []);

    useEffect(() => {
        Promise.all([fetchSuppliers(), fetchProducts(), fetchReceipts()])
            .catch((fetchError) => setError(fetchError.message))
            .finally(() => setIsLoading(false));
    }, [fetchProducts, fetchReceipts, fetchSuppliers]);

    useEffect(() => {
        const productId = new URLSearchParams(window.location.search).get('product_id');
        if (!productId || products.length === 0) return;

        setItems((currentItems) => {
            if (currentItems.some((item) => item.product_id)) return currentItems;
            return [{ ...currentItems[0], product_id: productId }];
        });
    }, [products]);

    const totalCost = useMemo(() => items.reduce((total, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitCost = Number(item.unit_cost) || 0;
        return total + quantity * unitCost;
    }, 0), [items]);

    const filteredReceipts = useMemo(() => {
        const searchTerm = historySearch.trim().toLowerCase();

        return receipts.filter((receipt) => {
            const receiptDate = String(receipt.transaction_date || '').slice(0, 10);
            const matchesStatus = !historyStatus || receipt.status === historyStatus;
            const matchesSupplier = !historySupplier || String(receipt.supplier?.id) === historySupplier;
            const matchesDateRange = (!historyFromDate || receiptDate >= historyFromDate)
                && (!historyToDate || receiptDate <= historyToDate);
            const searchableText = [
                receipt.reference_number,
                receipt.supplier?.name,
                receipt.remarks,
                ...(receipt.items || []).flatMap((line) => [
                    line.product?.name,
                    line.product?.inventory_category?.name,
                ]),
            ].filter(Boolean).join(' ').toLowerCase();

            return matchesStatus && matchesSupplier && matchesDateRange
                && (!searchTerm || searchableText.includes(searchTerm));
        });
    }, [receipts, historySearch, historyStatus, historySupplier, historyFromDate, historyToDate]);

    const updateItem = (index, field, value) => {
        setItems((currentItems) => currentItems.map((item, itemIndex) => (
            itemIndex === index ? { ...item, [field]: value } : item
        )));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setMessage('');
        setIsSaving(true);

        try {
            const response = await fetch('/admin/receivings', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify({
                    supplier_id: supplierId,
                    transaction_date: transactionDate,
                    remarks,
                    items: items.map((item) => ({
                        product_id: item.product_id,
                        quantity: Number(item.quantity),
                        unit_cost: Number(item.unit_cost),
                    })),
                }),
            });
            const receipt = await readJson(response);
            setSupplierId('');
            setTransactionDate(today());
            setRemarks('');
            setItems([emptyItem()]);
            setMessage(`Receipt ${receipt.reference_number} saved as pending. Confirm it in the history table to update available stock.`);
            await fetchReceipts();
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmReceipt = async (receipt) => {
        if (!window.confirm(`Confirm receipt ${receipt.reference_number}? This will add its quantities to inventory.`)) return;

        setError('');
        setMessage('');
        setConfirmingReceipt(receipt.id);
        try {
            const response = await fetch(`/admin/receivings/${receipt.id}/confirm`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });
            const data = await readJson(response);
            setMessage(data.message);
            await Promise.all([fetchReceipts(), fetchProducts()]);
        } catch (confirmError) {
            setError(confirmError.message);
        } finally {
            setConfirmingReceipt(null);
        }
    };

    const downloadReceipts = (receiptsToDownload, filterDescription = 'Individual receipt') => {
        if (receiptsToDownload.length === 0) return;

        const printWindow = window.open('', '_blank', 'width=900,height=750');
        if (!printWindow) {
            setError('Allow pop-ups to open the printable receipt report.');
            return;
        }
        printWindow.opener = null;

        const isSingleReceipt = receiptsToDownload.length === 1;
        const reportTotal = receiptsToDownload.reduce((total, receipt) => total + Number(receipt.total_cost || 0), 0);
        const receiptSections = receiptsToDownload.map((receipt) => {
            const isConfirmed = receipt.status === 'confirmed';
            const status = isConfirmed ? 'Confirmed' : 'Pending confirmation';
            const itemRows = (receipt.items || []).map((line) => `
                <tr>
                    <td>
                        <strong>${escapeHtml(line.product?.name || 'Product removed')}</strong>
                        <span class="subtext">${escapeHtml(line.product?.inventory_category?.name || 'Uncategorized')}</span>
                    </td>
                    <td class="number">${escapeHtml(formatQuantityWithUnit(line.quantity, line.product?.unit))}</td>
                    <td class="number">${escapeHtml(formatCurrency(line.unit_cost))}</td>
                    <td class="number total">${escapeHtml(formatCurrency(line.total_cost))}</td>
                </tr>
            `).join('');
            const remarks = receipt.remarks
                ? `<p class="remarks"><strong>Remarks:</strong> ${escapeHtml(receipt.remarks)}</p>`
                : '';
            const confirmedDate = receipt.confirmed_at
                ? `<span class="meta-note">Confirmed ${escapeHtml(new Date(receipt.confirmed_at).toLocaleString())}</span>`
                : '';

            return `
                <section class="receipt-entry">
                    <header class="entry-header">
                        <div>
                            <span class="reference-label">Reference number</span>
                            <span class="reference-number">${escapeHtml(receipt.reference_number)}</span>
                        </div>
                        <span class="status ${isConfirmed ? 'confirmed' : 'pending'}">${status}</span>
                    </header>
                    <div class="entry-meta">
                        <div><span class="meta-label">Supplier</span><strong>${escapeHtml(receipt.supplier?.name || 'Supplier removed')}</strong></div>
                        <div><span class="meta-label">Receiving date</span><strong>${escapeHtml(formatDate(receipt.transaction_date))}</strong></div>
                        <div>${confirmedDate}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Product / Category</th>
                                <th class="number">Quantity</th>
                                <th class="number">Unit cost</th>
                                <th class="number">Line total</th>
                            </tr>
                        </thead>
                        <tbody>${itemRows}</tbody>
                    </table>
                    <div class="entry-total"><span>Receipt total</span><strong>${escapeHtml(formatCurrency(receipt.total_cost))}</strong></div>
                    ${remarks}
                </section>
            `;
        }).join('');
        const reportTitle = isSingleReceipt ? 'Receiving Receipt' : 'Receiving History Report';
        const reportSubtitle = isSingleReceipt && filterDescription === 'Individual receipt'
            ? 'Inventory delivery record'
            : isSingleReceipt
                ? `Filtered receipt · ${filterDescription}`
                : `${receiptsToDownload.length} matching receipts · ${filterDescription}`;
        const reportTotalSection = isSingleReceipt ? '' : `
            <section class="report-total">
                <span>Combined total for ${receiptsToDownload.length} receipts</span>
                <strong>${escapeHtml(formatCurrency(reportTotal))}</strong>
            </section>
        `;

        printWindow.document.open();
        printWindow.document.write(`<!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>${escapeHtml(reportTitle)}</title>
                    <style>
                        @page { size: A4; margin: 18mm; }
                        * { box-sizing: border-box; }
                        body { margin: 0; color: #172033; font: 14px/1.5 Arial, Helvetica, sans-serif; background: #eef2f8; }
                        .toolbar { max-width: 820px; margin: 24px auto 12px; display: flex; justify-content: flex-end; }
                        .toolbar span { margin-right: 14px; color: #64748b; font-size: 12px; align-self: center; }
                        .print-button { border: 0; border-radius: 8px; background: #243f9d; color: #fff; padding: 11px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
                        .receipt { max-width: 820px; margin: 0 auto 32px; padding: 44px 48px; background: #fff; box-shadow: 0 12px 40px rgba(15, 23, 42, .12); }
                        .topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 2px solid #e8ecf4; }
                        .brand { color: #243f9d; font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
                        h1 { margin: 7px 0 4px; color: #111827; font-size: 28px; letter-spacing: -.5px; }
                        .subtitle { margin: 0; color: #64748b; font-size: 13px; }
                        .report-summary { margin-top: 16px; color: #475569; font-size: 11px; }
                        .reference-label, .meta-label { display: block; color: #64748b; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
                        .reference-number { display: block; margin-top: 5px; color: #243f9d; font: 700 17px/1.2 'Courier New', monospace; }
                        .receipt-entry { margin-top: 22px; padding: 19px; border: 1px solid #e6eaf1; border-radius: 10px; break-inside: auto; }
                        .entry-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 1px solid #e8ecf4; }
                        .status { display: inline-block; padding: 5px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; white-space: nowrap; }
                        .status.confirmed { background: #dcfce7; color: #166534; }
                        .status.pending { background: #fef3c7; color: #92400e; }
                        .entry-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 14px 0 8px; }
                        .entry-meta strong { display: block; margin-top: 5px; color: #1e293b; font-size: 11px; overflow-wrap: anywhere; }
                        .meta-note { margin: 6px 0 0; color: #64748b; font-size: 10px; }
                        table { width: 100%; margin-top: 8px; border-collapse: collapse; }
                        thead { display: table-header-group; }
                        th { padding: 9px 8px; border-bottom: 1px solid #dfe5ef; color: #64748b; font-size: 9px; letter-spacing: .8px; text-align: left; text-transform: uppercase; }
                        td { padding: 10px 8px; border-bottom: 1px solid #edf0f5; color: #334155; font-size: 10px; vertical-align: top; }
                        .number { text-align: right; white-space: nowrap; }
                        .total { color: #172554; font-weight: 700; }
                        .subtext { display: block; margin-top: 3px; color: #64748b; font-size: 9px; }
                        .entry-total { display: flex; justify-content: flex-end; gap: 16px; padding: 12px 8px 4px; color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
                        .entry-total strong { color: #172554; font-size: 13px; }
                        .remarks { margin: 12px 0 0; padding: 10px 12px; border-left: 3px solid #243f9d; background: #f8fafc; color: #334155; font-size: 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
                        .report-total { display: flex; justify-content: flex-end; gap: 18px; align-items: center; margin-top: 22px; padding: 16px 18px; background: #172554; color: #fff; border-radius: 9px; }
                        .report-total span { font-size: 10px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; }
                        .report-total strong { font-size: 20px; }
                        .footer { margin-top: 28px; padding-top: 15px; border-top: 1px solid #e8ecf4; color: #64748b; font-size: 9px; text-align: center; }
                        @media (max-width: 600px) {
                            .receipt { padding: 28px 20px; }
                            .entry-meta { grid-template-columns: 1fr; }
                            .topline { flex-direction: column; }
                        }
                        @media print {
                            body { background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                            .toolbar { display: none; }
                            .receipt { max-width: none; margin: 0; padding: 0; box-shadow: none; }
                            tr { break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="toolbar">
                        <span>Choose “Save as PDF” in the print dialog to download a copy.</span>
                        <button id="print-button" class="print-button" type="button">Print again</button>
                    </div>
                    <main class="receipt">
                        <header class="topline">
                            <div>
                                <div class="brand">Car Services</div>
                                <h1>${escapeHtml(reportTitle)}</h1>
                                <p class="subtitle">${escapeHtml(reportSubtitle)}</p>
                            </div>
                        </header>
                        <p class="report-summary">Generated ${escapeHtml(formatDate(today()))} · ${receiptsToDownload.length} receipt${receiptsToDownload.length === 1 ? '' : 's'}</p>
                        ${receiptSections}
                        ${reportTotalSection}
                        <footer class="footer">Generated by Car Services Management System · Keep this report for your inventory records.</footer>
                    </main>
                </body>
            </html>`);
        printWindow.document.close();
        printWindow.document.getElementById('print-button')?.addEventListener('click', () => printWindow.print());
        window.setTimeout(() => {
            if (!printWindow.closed) {
                printWindow.focus();
                printWindow.print();
            }
        }, 300);
    };

    const downloadReceipt = (receipt) => downloadReceipts([receipt]);

    const downloadFilteredReceipts = () => {
        const filterDescription = [
            historySearch.trim() && `Search: ${historySearch.trim()}`,
            historyStatus && `Status: ${historyStatus}`,
            historySupplier && `Supplier: ${suppliers.find((supplier) => String(supplier.id) === historySupplier)?.name || 'Selected supplier'}`,
            historyFromDate && `From ${formatDate(historyFromDate)}`,
            historyToDate && `Through ${formatDate(historyToDate)}`,
        ].filter(Boolean).join(' · ') || 'All receiving records';

        downloadReceipts(filteredReceipts, filterDescription);
    };

    const pendingCount = receipts.filter((receipt) => receipt.status === 'pending').length;
    const confirmedCount = receipts.filter((receipt) => receipt.status === 'confirmed').length;
    const confirmedValue = receipts
        .filter((receipt) => receipt.status === 'confirmed')
        .reduce((total, receipt) => total + Number(receipt.total_cost || 0), 0);

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Receiving</h2>}>
            <Head title="Receiving" />

            <div className="min-h-full bg-slate-50 px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 px-6 py-8 text-white shadow-xl sm:px-8">
                        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/5" />
                        <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-indigo-400/10" />
                        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 shadow-inner">
                                    <ClipboardList className="h-7 w-7 text-indigo-100" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Inventory / Receiving</p>
                                    <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Inventory Receiving</h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                                        Record supplier deliveries, review each line, and confirm receipts when they are ready to be added to stock.
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/15 bg-white/10 px-4 py-3 sm:self-center">
                                <span className="relative flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-300" />
                                </span>
                                <div>
                                    <p className="text-xs text-indigo-100">Awaiting confirmation</p>
                                    <p className="text-lg font-bold">{pendingCount} receipt{pendingCount === 1 ? '' : 's'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Total receipts</p>
                                    <p className="mt-2 text-3xl font-bold text-slate-900">{receipts.length}</p>
                                </div>
                                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><ClipboardList className="h-5 w-5" /></div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Pending</p>
                                    <p className="mt-2 text-3xl font-bold text-amber-600">{pendingCount}</p>
                                </div>
                                <div className="rounded-xl bg-amber-50 p-3 text-amber-600"><AlertCircle className="h-5 w-5" /></div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Confirmed value</p>
                                    <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(confirmedValue)}</p>
                                    <p className="mt-1 text-xs text-slate-500">{confirmedCount} confirmed receipt{confirmedCount === 1 ? '' : 's'}</p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><CheckCircle className="h-5 w-5" /></div>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800 shadow-sm">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                    {message && (
                        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800 shadow-sm">
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <p>{message}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Truck className="h-5 w-5" /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">New receiving transaction</h2>
                                    <p className="mt-0.5 text-sm text-slate-500">Enter delivery details and add the products received.</p>
                                </div>
                            </div>
                            <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Draft · stock unchanged</span>
                        </div>

                        <div className="space-y-7 px-6 py-6 sm:px-8">
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                <label className="text-sm font-semibold text-slate-700">
                                    Supplier <span className="text-rose-500">*</span>
                                    <select
                                        value={supplierId}
                                        onChange={(event) => setSupplierId(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                        required
                                    >
                                        <option value="">Select supplier</option>
                                        {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                                    </select>
                                </label>
                                <label className="text-sm font-semibold text-slate-700">
                                    Receiving date <span className="text-rose-500">*</span>
                                    <input
                                        type="date"
                                        value={transactionDate}
                                        onChange={(event) => setTransactionDate(event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                        required
                                    />
                                    <span className="mt-1.5 block text-xs font-normal text-slate-500">{formatDate(transactionDate)}</span>
                                </label>
                                <label className="text-sm font-semibold text-slate-700 md:col-span-2 xl:col-span-1">
                                    Remarks
                                    <textarea
                                        value={remarks}
                                        onChange={(event) => setRemarks(event.target.value)}
                                        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                        placeholder="Add delivery notes (optional)"
                                        rows="1"
                                    />
                                </label>
                            </div>

                            <div>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900">Received products</h3>
                                        <p className="mt-1 text-xs text-slate-500">Choose a product to automatically show its category.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setItems((currentItems) => [...currentItems, emptyItem()])}
                                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                                    >
                                        <Plus className="h-4 w-4" /> Add product
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {items.map((item, index) => {
                                        const product = products.find((entry) => String(entry.id) === String(item.product_id));
                                        const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                                        const selectedIds = items.filter((_, itemIndex) => itemIndex !== index).map((entry) => String(entry.product_id));

                                        return (
                                            <div key={index} className="grid items-end gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-[minmax(230px,2fr)_minmax(150px,1.2fr)_minmax(100px,0.8fr)_minmax(130px,1fr)_minmax(140px,1fr)_40px]">
                                                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Product
                                                    <select
                                                        value={item.product_id}
                                                        onChange={(event) => updateItem(index, 'product_id', event.target.value)}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                                        required
                                                    >
                                                        <option value="">Select product</option>
                                                        {products.filter((entry) => !selectedIds.includes(String(entry.id))).map((entry) => (
                                                            <option key={entry.id} value={entry.id}>{entry.name} ({formatQuantityWithUnit(entry.current_stock, entry.unit)})</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Category
                                                    <div className="mt-2 flex min-h-[46px] items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 shadow-sm">
                                                        {product?.inventory_category?.name || <span className="font-normal text-slate-400">Select a product</span>}
                                                    </div>
                                                </div>
                                                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Quantity
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={item.quantity}
                                                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                                        required
                                                    />
                                                </label>
                                                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Unit cost
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unit_cost}
                                                        onChange={(event) => updateItem(index, 'unit_cost', event.target.value)}
                                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </label>
                                                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Total cost
                                                    <div className="mt-2 flex min-h-[46px] items-center rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold normal-case tracking-normal text-indigo-800">
                                                        {formatCurrency(lineTotal)}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index))}
                                                    disabled={items.length === 1}
                                                    className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                    aria-label="Remove product"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col gap-5 rounded-2xl bg-slate-950 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Receipt total</p>
                                    <p className="mt-1 text-3xl font-bold tracking-tight">{formatCurrency(totalCost)}</p>
                                    <p className="mt-1 text-xs text-slate-400">{items.length} product line{items.length === 1 ? '' : 's'} · stock updates after confirmation</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSaving || suppliers.length === 0 || products.length === 0}
                                    className="inline-flex min-w-[12rem] items-center justify-center rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving receipt...' : 'Save pending receipt'}
                                </button>
                            </div>
                            {(suppliers.length === 0 || products.length === 0) && !isLoading && (
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    Add at least one supplier and one active product before receiving inventory.
                                </p>
                            )}
                        </div>
                    </form>

                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Receiving history</h2>
                                <p className="mt-1 text-sm text-slate-500">Filter deliveries, confirm stock, or download a report of matching receipts.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                    {filteredReceipts.length} of {receipts.length} receipt{receipts.length === 1 ? '' : 's'}
                                </span>
                                <button
                                    type="button"
                                    onClick={downloadFilteredReceipts}
                                    disabled={isLoading || filteredReceipts.length === 0}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Download className="h-4 w-4" />
                                    Download filtered
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 sm:px-8">
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500 xl:col-span-2">
                                Search
                                <div className="relative mt-1.5">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={historySearch}
                                        onChange={(event) => setHistorySearch(event.target.value)}
                                        placeholder="Reference, supplier, product..."
                                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-normal normal-case tracking-normal text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    />
                                </div>
                            </label>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Supplier
                                <select
                                    value={historySupplier}
                                    onChange={(event) => setHistorySupplier(event.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                >
                                    <option value="">All suppliers</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Status
                                <select
                                    value={historyStatus}
                                    onChange={(event) => setHistoryStatus(event.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                >
                                    <option value="">All statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                </select>
                            </label>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                From date
                                <input
                                    type="date"
                                    value={historyFromDate}
                                    onChange={(event) => setHistoryFromDate(event.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                />
                            </label>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                To date
                                <input
                                    type="date"
                                    value={historyToDate}
                                    onChange={(event) => setHistoryToDate(event.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                />
                            </label>
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHistorySearch('');
                                        setHistoryStatus('');
                                        setHistorySupplier('');
                                        setHistoryFromDate('');
                                        setHistoryToDate('');
                                    }}
                                    disabled={!historySearch && !historyStatus && !historySupplier && !historyFromDate && !historyToDate}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <X className="h-4 w-4" /> Clear filters
                                </button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="p-12 text-center">
                                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
                                <p className="mt-3 text-sm text-slate-500">Loading receiving history...</p>
                            </div>
                        ) : filteredReceipts.length === 0 ? (
                            <div className="px-6 py-14 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                    <ClipboardList className="h-7 w-7" />
                                </div>
                                <p className="mt-4 font-semibold text-slate-800">
                                    {receipts.length === 0 ? 'No receiving transactions yet' : 'No receipts match these filters'}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {receipts.length === 0 ? 'Your saved receipts will appear here for review and confirmation.' : 'Adjust or clear the filters to see more results.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px]">
                                    <thead>
                                        <tr className="bg-slate-50/80 text-left text-[11px] uppercase tracking-[0.12em] text-slate-500">
                                            <th className="px-6 py-4 font-bold">Receipt</th>
                                            <th className="px-6 py-4 font-bold">Supplier</th>
                                            <th className="px-6 py-4 font-bold">Products</th>
                                            <th className="px-6 py-4 font-bold">Total</th>
                                            <th className="px-6 py-4 font-bold">Status</th>
                                            <th className="px-6 py-4 text-right font-bold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredReceipts.map((receipt) => (
                                            <tr key={receipt.id} className="align-top transition hover:bg-slate-50/70">
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-sm font-bold text-indigo-700">
                                                        {receipt.reference_number || '—'}
                                                    </span>
                                                    <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(receipt.transaction_date)}</p>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-medium text-slate-700">{receipt.supplier?.name || 'Supplier removed'}</td>
                                                <td className="max-w-md px-6 py-5">
                                                    <div className="space-y-3">
                                                        {receipt.items.map((line) => (
                                                            <div key={line.id} className="flex items-start justify-between gap-4 text-sm">
                                                                <div>
                                                                    <p className="font-semibold text-slate-800">{line.product?.name || 'Product removed'}</p>
                                                                    <p className="mt-0.5 text-xs text-slate-500">{line.product?.inventory_category?.name || 'Uncategorized'}</p>
                                                                </div>
                                                                <p className="shrink-0 text-right text-xs text-slate-500">
                                                                    {formatQuantityWithUnit(line.quantity, line.product?.unit)} × {formatCurrency(line.unit_cost)}
                                                                    <span className="mt-0.5 block font-semibold text-slate-700">{formatCurrency(line.total_cost)}</span>
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {receipt.remarks && <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">{receipt.remarks}</p>}
                                                </td>
                                                <td className="px-6 py-5 text-sm font-bold text-slate-900">{formatCurrency(receipt.total_cost)}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${receipt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${receipt.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        {receipt.status}
                                                    </span>
                                                    {receipt.confirmed_at && (
                                                        <p className="mt-2 text-xs text-slate-500">
                                                            {new Date(receipt.confirmed_at).toLocaleString()}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadReceipt(receipt)}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            Download
                                                        </button>
                                                        {receipt.status === 'pending' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => confirmReceipt(receipt)}
                                                                disabled={confirmingReceipt === receipt.id}
                                                                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {confirmingReceipt === receipt.id ? 'Confirming...' : 'Confirm'}
                                                            </button>
                                                        ) : (
                                                            <span className="self-center text-xs font-semibold text-slate-400">Completed</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
