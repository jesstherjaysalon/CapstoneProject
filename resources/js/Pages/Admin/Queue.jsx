import { useMemo, useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CheckCircle, Clock, ClipboardList, Search, ChevronLeft, ChevronRight, User, Car, Calendar, PlayCircle, Filter, RotateCcw, Star, Zap, X } from 'lucide-react';

const statusClasses = {
    pending: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-sky-100 text-sky-800',
    completed: 'bg-emerald-100 text-emerald-800',
};

const priorityClasses = {
    0: 'bg-slate-100 text-slate-600',
    1: 'bg-blue-100 text-blue-600',
    2: 'bg-indigo-100 text-indigo-600',
    3: 'bg-purple-100 text-purple-600',
    4: 'bg-pink-100 text-pink-600',
    5: 'bg-rose-100 text-rose-600',
};

export default function Queue({ auth, jobOrders, pagination, queueSummary, filters, staff }) {
    const { flash = {} } = usePage().props;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [dateFilter, setDateFilter] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1);
    const [pageSize, setPageSize] = useState(pagination?.per_page || 20);
    const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(null);
    const [editStaffJobOrder, setEditStaffJobOrder] = useState(null);
    const [selectedStaffIds, setSelectedStaffIds] = useState([]);

    const filteredJobOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query && !statusFilter) {
            return jobOrders;
        }

        return jobOrders.filter((jobOrder) => {
            const staffName = jobOrder.staff?.name || '';
            const serviceName = jobOrder.service?.service_name || '';
            const customerName = jobOrder.customer?.name || '';
            const status = jobOrder.status || '';
            const queueNumber = jobOrder.queue_number?.toString() || '';

            if (statusFilter && jobOrder.status !== statusFilter) {
                return false;
            }

            return [staffName, serviceName, customerName, status, queueNumber]
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [jobOrders, search, statusFilter]);

    const handleStatusChange = (event, jobOrderId) => {
        event.preventDefault();
        router.put(route('admin.queue.update-status', jobOrderId), {
            status: event.target.status.value,
        });
    };

    const handlePriorityChange = (jobOrderId, priority) => {
        router.put(route('admin.queue.update-priority', jobOrderId), {
            queue_priority: priority,
        });
        setPriorityDropdownOpen(null);
    };

    const handleEditStaff = (jobOrder) => {
        setEditStaffJobOrder(jobOrder);
        setSelectedStaffIds(jobOrder.staff_ids || []);
    };

    const handleSaveStaff = () => {
        router.put(route('admin.queue.update-staff', editStaffJobOrder.id), {
            staff_ids: selectedStaffIds,
        }, {
            onSuccess: () => {
                setEditStaffJobOrder(null);
                setSelectedStaffIds([]);
            },
        });
    };

    const handleApplyFilters = () => {
        router.get(route('admin.queue.index'), {
            date: dateFilter,
            status: statusFilter,
            page: 1,
            per_page: pageSize,
        }, { preserveState: true });
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        router.get(route('admin.queue.index'), {
            page: newPage,
            per_page: pageSize,
            date: dateFilter,
            status: statusFilter,
        }, { preserveState: true });
    };

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setCurrentPage(1);
        router.get(route('admin.queue.index'), {
            page: 1,
            per_page: newPageSize,
            date: dateFilter,
            status: statusFilter,
        }, { preserveState: true });
    };

    const handleQuickStatusChange = (jobOrderId, newStatus) => {
        router.put(route('admin.queue.update-status', jobOrderId), {
            status: newStatus,
        });
    };

    return (
        <>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
            <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-lg text-gray-800 leading-tight">Queue Management</h2>}>
            <Head title="Queue Management" />

            <div className="space-y-2 py-2 px-2">
                {flash.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <div className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-5 w-5" />
                            <div>{flash.success}</div>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-2.5" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Queue Management</h1>
                            <p className="mt-0.5 text-xs text-slate-600">
                                Monitor and manage service queues, update status, and adjust priorities.
                            </p>
                        </div>

                        <div className="relative max-w-md w-full">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search queue..."
                                className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3 items-center flex-wrap">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-slate-400" />
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">All statuses</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>

                            <button
                                onClick={handleApplyFilters}
                                className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 transition flex items-center gap-1"
                            >
                                <Filter size={14} /> Apply Filters
                            </button>

                            <button
                                onClick={() => { setStatusFilter(''); setDateFilter(new Date().toISOString().split('T')[0]); handleApplyFilters(); }}
                                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200 transition flex items-center gap-1"
                            >
                                <RotateCcw size={14} /> Reset
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 grid gap-2.5 md:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-2.5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600">Total Queue</p>
                                    <p className="mt-1 text-xl font-bold text-slate-900">{queueSummary.total}</p>
                                </div>
                                <div className="rounded-xl bg-indigo-100 p-3">
                                    <ClipboardList className="h-6 w-6 text-indigo-600" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-2.5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600">Waiting</p>
                                    <p className="mt-1 text-xl font-bold text-amber-600">{queueSummary.pending}</p>
                                </div>
                                <div className="rounded-xl bg-amber-100 p-3">
                                    <Clock className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-2.5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600">Serving</p>
                                    <p className="mt-1 text-xl font-bold text-sky-600">{queueSummary.in_progress}</p>
                                </div>
                                <div className="rounded-xl bg-sky-100 p-3">
                                    <PlayCircle className="h-6 w-6 text-sky-600" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-2.5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600">Completed</p>
                                    <p className="mt-1 text-xl font-bold text-emerald-600">{queueSummary.completed}</p>
                                </div>
                                <div className="rounded-xl bg-emerald-100 p-3">
                                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                    {filteredJobOrders.length === 0 ? (
                        <div className="p-12 text-center">
                            <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                            <p className="text-sm font-semibold text-slate-700">
                                {search ? 'No matching queue entries found.' : 'No queue entries found for this date.'}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {search ? 'Try another search term or clear the filter.' : 'Select a different date or wait for new bookings.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full min-w-[1000px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Queue #</th>
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Priority</th>
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Customer</th>
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Vehicle</th>
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Service</th>
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Staff</th>
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Status</th>
                                            <th className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredJobOrders.map((jobOrder) => (
                                            <tr key={jobOrder.id} className="hover:bg-slate-50 transition">
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 font-bold text-indigo-600">
                                                        #{jobOrder.queue_number}
                                                    </span>
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setPriorityDropdownOpen(priorityDropdownOpen === jobOrder.id ? null : jobOrder.id)}
                                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${priorityClasses[jobOrder.queue_priority] || priorityClasses[0]}`}
                                                        >
                                                            {jobOrder.queue_priority > 0 ? (
                                                                <>
                                                                    <Zap size={12} /> {jobOrder.queue_priority}
                                                                </>
                                                            ) : (
                                                                'Normal'
                                                            )}
                                                        </button>
                                                        {priorityDropdownOpen === jobOrder.id && (
                                                            <div className="absolute z-10 mt-1 w-32 rounded-lg border border-slate-200 bg-white shadow-lg">
                                                                <div className="p-1">
                                                                    {[0, 1, 2, 3, 4, 5].map((priority) => (
                                                                        <button
                                                                            key={priority}
                                                                            onClick={() => handlePriorityChange(jobOrder.id, priority)}
                                                                            className="w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 transition"
                                                                        >
                                                                            {priority === 0 ? 'Normal' : `Priority ${priority}`}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <User size={14} className="text-slate-400" />
                                                        <span className="font-semibold">{jobOrder.customer.name}</span>
                                                    </div>
                                                    {jobOrder.customer.phone && (
                                                        <div className="text-[10px] text-slate-500">{jobOrder.customer.phone}</div>
                                                    )}
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    {jobOrder.vehicle ? (
                                                        <div className="flex items-center gap-1">
                                                            <Car size={14} className="text-slate-400" />
                                                            <span>{jobOrder.vehicle.brand} {jobOrder.vehicle.model}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">No vehicle</span>
                                                    )}
                                                    {jobOrder.vehicle?.plate_number && (
                                                        <div className="text-[10px] text-slate-500">{jobOrder.vehicle.plate_number}</div>
                                                    )}
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    <div className="font-semibold">{jobOrder.service.service_name}</div>
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <User size={14} className="text-slate-400" />
                                                        <span className="font-semibold">
                                                            {Array.isArray(jobOrder.staff) && jobOrder.staff.length > 0
                                                                ? jobOrder.staff.map(s => s.name).join(', ')
                                                                : 'Unassigned'}
                                                        </span>
                                                    </div>
                                                    {Array.isArray(jobOrder.staff) && jobOrder.staff.length > 1 && (
                                                        <div className="text-[10px] text-slate-500">{jobOrder.staff.length} staff assigned</div>
                                                    )}
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[jobOrder.status] || 'bg-slate-100 text-slate-800'}`}>
                                                        {jobOrder.status === 'in_progress' ? 'Serving' : jobOrder.status === 'pending' ? 'Waiting' : jobOrder.status}
                                                    </span>
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                                                    <div className="flex gap-1">
                                                        {jobOrder.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleQuickStatusChange(jobOrder.id, 'in_progress')}
                                                                className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-700 transition flex items-center gap-1"
                                                                title="Start Service"
                                                            >
                                                                <PlayCircle size={12} /> Start
                                                            </button>
                                                        )}
                                                        {jobOrder.status === 'in_progress' && (
                                                            <button
                                                                onClick={() => handleQuickStatusChange(jobOrder.id, 'completed')}
                                                                className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition flex items-center gap-1"
                                                                title="Complete Service"
                                                            >
                                                                <CheckCircle size={12} /> Complete
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleEditStaff(jobOrder)}
                                                            className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-semibold text-white hover:bg-purple-700 transition flex items-center gap-1"
                                                            title="Edit Staff"
                                                        >
                                                            <User size={12} /> Staff
                                                        </button>
                                                        <form onSubmit={(event) => handleStatusChange(event, jobOrder.id)} className="inline">
                                                            <select
                                                                name="status"
                                                                defaultValue={jobOrder.status}
                                                                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                                                            >
                                                                <option value="pending">Waiting</option>
                                                                <option value="in_progress">Serving</option>
                                                                <option value="completed">Completed</option>
                                                            </select>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200 px-2.5 py-2 bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        First
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
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
                                                    className={`min-w-[30px] rounded-lg px-2 py-1.5 text-xs font-medium transition ${
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
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination?.last_page || 1)}
                                        disabled={currentPage === (pagination?.last_page || 1)}
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Last
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-600">Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                                    >
                                        {[10, 20, 30, 50].map((size) => (
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

                {/* Edit Staff Modal */}
                {editStaffJobOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-2xl bg-white max-w-md w-full overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                            <div className="bg-white border-b border-slate-200 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-slate-900">Edit Staff Assignment</h2>
                                    <button
                                        onClick={() => { setEditStaffJobOrder(null); setSelectedStaffIds([]); }}
                                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <p className="text-sm text-slate-600 mb-1">Queue #{editStaffJobOrder.queue_number}</p>
                                    <p className="text-sm font-semibold text-slate-900">{editStaffJobOrder.service.service_name}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Staff (Multiple)</label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {staff.map((s) => (
                                            <label key={s.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStaffIds.includes(s.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedStaffIds([...selectedStaffIds, s.id]);
                                                        } else {
                                                            setSelectedStaffIds(selectedStaffIds.filter(id => id !== s.id));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700">{s.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setEditStaffJobOrder(null); setSelectedStaffIds([]); }}
                                        className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveStaff}
                                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </AuthenticatedLayout>
        </>
    );
}
