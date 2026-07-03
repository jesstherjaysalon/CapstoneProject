import { useMemo, useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CheckCircle, Clock, ClipboardList, Tag, Search, X, Eye, DollarSign, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';

const statusClasses = {
    pending: 'bg-amber-100 text-amber-800',
    accepted: 'bg-sky-100 text-sky-800',
    assigned: 'bg-purple-100 text-purple-800',
    rejected: 'bg-rose-100 text-rose-800',
    completed: 'bg-emerald-100 text-emerald-800',
    ongoing: 'bg-indigo-100 text-indigo-800',
};

export default function Appointments({ auth, bookings, pagination, bookingSummary, bookingStatuses, serviceStatuses, staff }) {
    const { flash = {} } = usePage().props;
    const [search, setSearch] = useState('');
    const [bookingStatusFilter, setBookingStatusFilter] = useState('');
    const [serviceStatusFilter, setServiceStatusFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1);
    const [pageSize, setPageSize] = useState(pagination?.per_page || 10);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [remarks, setRemarks] = useState('');

    const filteredBookings = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query && !bookingStatusFilter && !serviceStatusFilter) {
            return bookings;
        }

        return bookings.filter((booking) => {
            const customerName = booking.customer.name || '';
            const customerEmail = booking.customer.email || '';
            const customerPhone = booking.customer.phone || '';
            const bookingId = booking.id.toString();
            const date = booking.date || '';
            const bookingStatus = booking.status || '';
            // filter by booking status if set
            if (bookingStatusFilter && booking.status !== bookingStatusFilter) {
                return false;
            }

            const serviceMatch = booking.services.some((service) => {
                const serviceName = service.service_name || '';
                const scheduledTime = service.scheduled_time || '';
                // filter by service status if set
                if (serviceStatusFilter && service.status !== serviceStatusFilter) {
                    return false;
                }
                return [serviceName, scheduledTime]
                    .some((value) => value.toLowerCase().includes(query));
            });

            const baseMatch = [customerName, customerEmail, customerPhone, bookingId, date, bookingStatus]
                .some((value) => value.toLowerCase().includes(query));

            // if search query exists, match either base fields or service fields
            if (query) {
                return baseMatch || serviceMatch;
            }

            // if only filters are set (no query), use the filters' results
            if (serviceStatusFilter) {
                // serviceMatch already respects serviceStatusFilter
                return serviceMatch;
            }

            return true;
        });
    }, [bookings, search, bookingStatusFilter, serviceStatusFilter]);

    const columns = useMemo(() => [
        {
            accessorKey: 'id',
            header: 'Booking ID',
            cell: (info) => <span className="font-semibold text-slate-900">#{info.getValue()}</span>,
        },
        {
            accessorKey: 'customer.name',
            header: 'Customer',
            cell: (info) => info.getValue() || 'Guest Customer',
        },
        {
            accessorKey: 'customer.email',
            header: 'Email',
            cell: (info) => info.getValue() || '-',
        },
        {
            accessorKey: 'customer.phone',
            header: 'Phone',
            cell: (info) => info.getValue() || '-',
        },
        {
            accessorKey: 'date',
            header: 'Date',
            cell: (info) => info.getValue(),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: (info) => (
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[info.getValue()] || 'bg-slate-100 text-slate-800'}`}>
                    {info.getValue()}
                </span>
            ),
        },
        {
            accessorKey: 'services',
            header: 'Services',
            cell: (info) => (
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                    <Tag size={14} /> {info.getValue().length}
                </div>
            ),
        },
        {
            accessorKey: 'payment',
            header: 'Payment',
            cell: (info) => {
                const payment = info.getValue();
                const hasOnlinePayment = payment && payment.payments && payment.payments.length > 0 && payment.payments.some(p => p.status === 'paid');
                const hasManualPayment = payment && payment.manual_payments && payment.manual_payments.length > 0;

                if (hasOnlinePayment || hasManualPayment) {
                    return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            <DollarSign size={14} /> Paid
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        <AlertCircle size={14} /> No Payment
                    </span>
                );
            },
        },
        {
            accessorKey: 'payment.balance',
            header: 'Balance',
            cell: (info) => <span className="font-semibold text-slate-700">₱{(info.getValue() || 0).toFixed(2)}</span>,
        },
        {
            id: 'actions',
            header: 'Action',
            cell: (info) => {
                const booking = info.row.original;
                const hasBalance = booking.payment?.balance > 0;
                return (
                    <div className="flex gap-2">
                        {hasBalance && (
                            <button
                                onClick={() => openPaymentModal(booking)}
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                            >
                                <DollarSign size={16} /> Pay
                            </button>
                        )}
                        <button
                            onClick={() => openModal(booking)}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                        >
                            <Eye size={16} /> View
                        </button>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: filteredBookings,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: pagination?.last_page || 1,
        state: {
            pagination: {
                pageIndex: currentPage - 1,
                pageSize: pageSize,
            },
        },
    });

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        router.get(route('admin.appointments.index'), {
            page: newPage,
            per_page: pageSize,
            search,
            booking_status: bookingStatusFilter,
            service_status: serviceStatusFilter,
        }, { preserveState: true });
    };

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setCurrentPage(1);
        router.get(route('admin.appointments.index'), {
            page: 1,
            per_page: newPageSize,
            search,
            booking_status: bookingStatusFilter,
            service_status: serviceStatusFilter,
        }, { preserveState: true });
    };

    const handleBookingStatusChange = (event, bookingId) => {
        event.preventDefault();
        router.put(route('admin.appointments.booking.update', bookingId), {
            status: event.target.status.value,
        });
    };

    const handleServiceStatusChange = (event, serviceId) => {
        event.preventDefault();
        router.put(route('admin.appointments.service.update', serviceId), {
            status: event.target.status.value,
        });
    };

    const handleStaffAssign = (event, serviceId) => {
        event.preventDefault();
        router.put(route('admin.appointments.service.assign', serviceId), {
            staff_id: event.target.staff_id.value,
        });
    };

    const openModal = (booking) => {
        setSelectedBooking(booking);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedBooking(null);
    };

    const openPaymentModal = (booking) => {
        setPaymentBooking(booking);
        setPaymentAmount(booking.payment?.balance?.toString() || '');
        setRemarks('');
        setIsPaymentModalOpen(true);
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setPaymentBooking(null);
        setPaymentAmount('');
        setRemarks('');
    };

    const handleCreateManualPayment = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/admin/manual-payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                },
                body: JSON.stringify({
                    booking_id: paymentBooking.id,
                    amount: parseFloat(paymentAmount),
                    remarks: remarks,
                }),
            });

            const data = await response.json();

            if (data.success) {
                closePaymentModal();
                router.reload();
            } else {
                alert('Failed to create payment: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            alert('Failed to create payment: ' + error.message);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Appointments</h2>}>
            <Head title="Appointments" />

            <div className="space-y-6 py-6 px-4">
                {flash.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <div className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-5 w-5" />
                            <div>{flash.success}</div>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Appointment Management</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                Monitor bookings, update statuses, and quickly locate appointments.
                            </p>
                        </div>

                        <div className="relative max-w-md w-full">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search bookings..."
                                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3 items-center flex-wrap">
                            <select
                                value={bookingStatusFilter}
                                onChange={(e) => setBookingStatusFilter(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">All booking statuses</option>
                                {bookingStatuses.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>

                            <select
                                value={serviceStatusFilter}
                                onChange={(e) => setServiceStatusFilter(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">All service statuses</option>
                                {serviceStatuses.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => { setBookingStatusFilter(''); setServiceStatusFilter(''); setSearch(''); }}
                                className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 transition"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Total Bookings</p>
                                    <p className="mt-2 text-3xl font-bold text-slate-900">{bookingSummary.total}</p>
                                </div>
                                <div className="rounded-xl bg-indigo-100 p-3">
                                    <ClipboardList className="h-6 w-6 text-indigo-600" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Pending</p>
                                    <p className="mt-2 text-3xl font-bold text-amber-600">{bookingSummary.pending}</p>
                                </div>
                                <div className="rounded-xl bg-amber-100 p-3">
                                    <Clock className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Completed</p>
                                    <p className="mt-2 text-3xl font-bold text-emerald-600">{bookingSummary.completed}</p>
                                </div>
                                <div className="rounded-xl bg-emerald-100 p-3">
                                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    {filteredBookings.length === 0 ? (
                        <div className="p-12 text-center">
                            <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                            <p className="text-sm font-semibold text-slate-700">
                                {search ? 'No matching bookings found.' : 'No bookings found yet.'}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {search ? 'Try another search term or clear the filter.' : 'Create new bookings to see them here.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50">
                                                {headerGroup.headers.map((header) => (
                                                    <th key={header.id} className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {table.getRowModel().rows.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50 transition">
                                                {row.getVisibleCells().map((cell) => (
                                                    <td key={cell.id} className="px-6 py-4 text-sm text-slate-700">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        First
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(Math.min(5, pagination?.last_page || 1))].map((_, i) => {
                                            let pageNum;
                                            if ((pagination?.last_page || 1) <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= (pagination?.last_page || 1) - 2) {
                                                pageNum = (pagination?.last_page || 1) - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                        currentPage === pageNum
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === (pagination?.last_page || 1)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination?.last_page || 1)}
                                        disabled={currentPage === (pagination?.last_page || 1)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Last
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-600">Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                    >
                                        {[5, 10, 20, 30, 50].map((size) => (
                                            <option key={size} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && selectedBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-2xl bg-white max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Booking #{selectedBooking.id}</h2>
                                        <p className="text-sm text-slate-600 mt-1">{selectedBooking.customer.name}</p>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Customer Details */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4">Customer Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Name</p>
                                            <p className="text-sm font-semibold text-slate-900">{selectedBooking.customer.name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Email</p>
                                            <p className="text-sm font-semibold text-slate-900">{selectedBooking.customer.email || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Phone</p>
                                            <p className="text-sm font-semibold text-slate-900">{selectedBooking.customer.phone || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Address</p>
                                            <p className="text-sm font-semibold text-slate-900">{selectedBooking.customer.address || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Information */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4">Booking Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Date</p>
                                            <p className="text-lg font-bold text-slate-900">{selectedBooking.date}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Status</p>
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusClasses[selectedBooking.status] || 'bg-slate-100 text-slate-800'}`}>
                                                {selectedBooking.status}
                                            </span>
                                        </div>
                                    </div>

                                    <form onSubmit={(event) => { handleBookingStatusChange(event, selectedBooking.id); closeModal(); }} className="mt-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Update booking status</label>
                                        <div className="flex gap-3">
                                            <select name="status" defaultValue={selectedBooking.status} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none">
                                                {bookingStatuses.map((status) => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                                                Update
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Services */}
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4">Services ({selectedBooking.services.length})</h3>

                                    <div className="space-y-3">
                                        {selectedBooking.services.map((service) => (
                                            <div key={service.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-slate-900">{service.service_name}</p>
                                                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-600">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={14} /> {service.scheduled_time || 'Not set'}
                                                            </span>
                                                            <span>₱{parseFloat(service.price || 0).toFixed(2)}</span>
                                                            {service.job_order && (
                                                                <span>Staff: {service.job_order.staff_name || 'Unassigned'}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusClasses[service.status] || 'bg-slate-100 text-slate-700'}`}>
                                                        {service.status}
                                                    </span>
                                                </div>

                                                {selectedBooking.status === 'accepted' && (
                                                    <form onSubmit={(event) => handleStaffAssign(event, service.id)} className="grid gap-2 sm:grid-cols-[1fr_auto] mb-3">
                                                        <select name="staff_id" defaultValue={service.job_order?.staff_id || ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none">
                                                            <option value="">Select Staff</option>
                                                            {staff.map((s) => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                                                            Assign
                                                        </button>
                                                    </form>
                                                )}

                                                <form onSubmit={(event) => handleServiceStatusChange(event, service.id)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                                    <select name="status" defaultValue={service.status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none">
                                                        {serviceStatuses.map((status) => (
                                                            <option key={status} value={status}>{status}</option>
                                                        ))}
                                                    </select>
                                                    <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">
                                                        Save
                                                    </button>
                                                </form>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Information */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="text-sm font-bold text-slate-900 mb-4">Payment Information</h3>
                                    <div className="grid gap-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Service Cost</p>
                                                <p className="text-xl font-bold text-slate-900">₱{(selectedBooking.payment?.service_cost || 0).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Product Cost</p>
                                                <p className="text-xl font-bold text-rose-600">₱{(selectedBooking.payment?.product_cost || 0).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Total Cost</p>
                                                <p className="text-xl font-bold text-indigo-600">₱{(selectedBooking.payment?.total_cost || 0).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {selectedBooking.payment?.product_breakdown && selectedBooking.payment.product_breakdown.length > 0 && (
                                            <div className="mt-4 bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                                    <p className="text-sm font-semibold text-slate-900">Product Cost Breakdown</p>
                                                </div>
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Product</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Qty</th>
                                                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Unit Price</th>
                                                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200">
                                                        {selectedBooking.payment.product_breakdown.map((item, index) => (
                                                            <tr key={index}>
                                                                <td className="px-4 py-2 text-slate-900">{item.product_name}</td>
                                                                <td className="px-4 py-2 text-slate-600">{item.quantity}</td>
                                                                <td className="px-4 py-2 text-right text-slate-600">₱{Number(item.unit_price).toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right font-semibold text-indigo-600">₱{Number(item.total).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Total Paid</p>
                                                <p className="text-xl font-bold text-emerald-600">₱{(selectedBooking.payment?.total_paid || 0).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Balance</p>
                                                <p className={`text-xl font-bold ${(selectedBooking.payment?.balance || 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                                    ₱{(selectedBooking.payment?.balance || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>

                                        {(selectedBooking.payment?.payments && selectedBooking.payment.payments.length > 0) ||
                                         (selectedBooking.payment?.manual_payments && selectedBooking.payment.manual_payments.length > 0) ? (
                                            <div className="mt-4">
                                                <p className="text-sm font-semibold text-slate-900 mb-2">Payment Records</p>
                                                <div className="space-y-2">
                                                    {selectedBooking.payment.payments.map((payment) => (
                                                        <div key={payment.id} className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {payment.payment_method.toUpperCase()} - {payment.amount_type}
                                                                </p>
                                                                <p className="text-xs text-slate-500">Amount: ₱{payment.amount.toFixed(2)}</p>
                                                            </div>
                                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                                payment.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                                payment.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-rose-100 text-rose-800'
                                                            }`}>
                                                                {payment.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {selectedBooking.payment.manual_payments.map((manualPayment) => (
                                                        <div key={manualPayment.id} className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    Manual Payment - {manualPayment.receipt_number}
                                                                </p>
                                                                <p className="text-xs text-slate-500">Amount: ₱{manualPayment.amount.toFixed(2)}</p>
                                                                {manualPayment.remarks && (
                                                                    <p className="text-xs text-slate-500 mt-1">Remarks: {manualPayment.remarks}</p>
                                                                )}
                                                            </div>
                                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                Paid
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 rounded-lg bg-white p-4 border border-slate-200 text-center">
                                                <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                                                <p className="text-sm text-slate-600">No payment records found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manual Payment Modal */}
                {isPaymentModalOpen && paymentBooking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-2xl bg-white max-w-md w-full overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                            <div className="bg-white border-b border-slate-200 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-slate-900">Record Manual Payment</h2>
                                    <button
                                        onClick={closePaymentModal}
                                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleCreateManualPayment} className="p-6 space-y-4">
                                <div>
                                    <p className="text-sm text-slate-600 mb-1">Booking #{paymentBooking.id}</p>
                                    <p className="text-sm font-semibold text-slate-900">{paymentBooking.customer?.name || 'Unknown'}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Balance: ₱{(paymentBooking.payment?.balance || 0).toFixed(2)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Remarks (Optional)</label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                                        rows="3"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closePaymentModal}
                                        className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                                    >
                                        Record Payment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
