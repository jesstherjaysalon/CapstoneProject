import { useMemo, useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CheckCircle, Clock, ClipboardList, Search, X, User, Calendar, PlayCircle, Check, Package, Eye, RotateCcw, MoreVertical, Edit, Pencil } from 'lucide-react';

const statusClasses = {
    pending: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-sky-100 text-sky-800',
    completed: 'bg-emerald-100 text-emerald-800',
};

const requestStatusClasses = {
    Pending: 'bg-amber-100 text-amber-800',
    Approved: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-rose-100 text-rose-800',
};

export default function JobOrders({ auth, jobOrders, staff, jobOrderSummary }) {
    const { flash = {} } = usePage().props;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isViewRequestsModalOpen, setIsViewRequestsModalOpen] = useState(false);
    const [selectedJobOrder, setSelectedJobOrder] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingJobOrder, setEditingJobOrder] = useState(null);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [editFormData, setEditFormData] = useState({});

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

            if (statusFilter && jobOrder.status !== statusFilter) {
                return false;
            }

            return [staffName, serviceName, customerName, status]
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [jobOrders, search, statusFilter]);

    const handleStatusChange = (event, jobOrderId) => {
        event.preventDefault();
        router.put(route('admin.job-orders.update', jobOrderId), {
            status: event.target.status.value,
        });
    };

    const handleQuickStatusChange = (jobOrderId, newStatus) => {
        router.put(route('admin.job-orders.update', jobOrderId), {
            status: newStatus,
        });
        setStatusDropdownOpen(null);
    };

    const handleToggleDropdown = (event, jobOrderId) => {
        const rect = event.target.getBoundingClientRect();
        setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.right - 160, // Subtract width of dropdown to align right
        });
        setStatusDropdownOpen(statusDropdownOpen === jobOrderId ? null : jobOrderId);
    };

    const handleViewRequests = (jobOrder) => {
        setSelectedJobOrder(jobOrder);
        setIsViewRequestsModalOpen(true);
    };

    const handleEditJobOrder = (jobOrder) => {
        setEditingJobOrder(jobOrder);
        setEditFormData({
            profile_id: jobOrder.staff?.id || '',
            start_time: jobOrder.start_time || '',
            end_time: jobOrder.end_time || '',
        });
        setIsEditModalOpen(true);
        setStatusDropdownOpen(null);
    };

    const handleSaveEdit = async (event) => {
        event.preventDefault();
        try {
            router.put(route('admin.job-orders.edit', editingJobOrder.id), editFormData, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                },
                onError: () => {
                    alert('Failed to update job order');
                }
            });
        } catch (error) {
            alert('Error updating job order');
        }
    };

    const handleReturnProduct = async (usageId) => {
        try {
            const response = await fetch(`/admin/service-product-usage/${usageId}/return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
            });

            if (response.ok) {
                router.reload();
            } else {
                const error = await response.json();
                console.error('Failed to return product:', error.message);
                alert(error.message || 'Failed to return product');
            }
        } catch (error) {
            console.error('Error returning product:', error);
            alert('Error returning product');
        }
    };

    return (
        <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Job Orders</h2>}>
            <Head title="Job Orders" />

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
                            <h1 className="text-2xl font-bold text-slate-900">Job Order Management</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                Monitor and manage job orders assigned to staff members.
                            </p>
                        </div>

                        <div className="relative max-w-md w-full">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search job orders..."
                                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3 items-center flex-wrap">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">All statuses</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>

                            <button
                                onClick={() => { setStatusFilter(''); setSearch(''); }}
                                className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 transition"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Total Job Orders</p>
                                    <p className="mt-2 text-3xl font-bold text-slate-900">{jobOrderSummary?.total || 0}</p>
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
                                    <p className="mt-2 text-3xl font-bold text-amber-600">{jobOrderSummary?.pending || 0}</p>
                                </div>
                                <div className="rounded-xl bg-amber-100 p-3">
                                    <Clock className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">In Progress</p>
                                    <p className="mt-2 text-3xl font-bold text-sky-600">{jobOrderSummary?.in_progress || 0}</p>
                                </div>
                                <div className="rounded-xl bg-sky-100 p-3">
                                    <PlayCircle className="h-6 w-6 text-sky-600" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-600">Completed</p>
                                    <p className="mt-2 text-3xl font-bold text-emerald-600">{jobOrderSummary?.completed || 0}</p>
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
                                {search ? 'No matching job orders found.' : 'No job orders found yet.'}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {search ? 'Try another search term or clear the filter.' : 'Job orders will appear here when staff are assigned to services.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Service</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Assigned Staff</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Start Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">End Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredJobOrders.map((jobOrder) => (
                                        <tr key={jobOrder.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">#{jobOrder.id}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{jobOrder.service?.service_name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{jobOrder.customer?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <User size={16} />
                                                    {jobOrder.staff?.name || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {jobOrder.start_time ? (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} />
                                                        {new Date(jobOrder.start_time).toLocaleString()}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {jobOrder.end_time ? (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} />
                                                        {new Date(jobOrder.end_time).toLocaleString()}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[jobOrder.status] || 'bg-slate-100 text-slate-800'}`}>
                                                    {jobOrder.status === 'in_progress' ? <PlayCircle size={14} className="mr-1" /> : jobOrder.status === 'completed' ? <Check size={14} className="mr-1" /> : <Clock size={14} className="mr-1" />}
                                                    {jobOrder.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2 relative">
                                                    <button
                                                        onClick={() => handleViewRequests(jobOrder)}
                                                        className="rounded-lg p-2 transition bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        title="View Requests"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => handleToggleDropdown(e, jobOrder.id)}
                                                            className="rounded-lg p-2 transition bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                            title="Actions"
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>
                                                        {statusDropdownOpen === jobOrder.id && (
                                                            <div className="fixed w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50" style={{
                                                                top: `${dropdownPosition.top}px`,
                                                                left: `${dropdownPosition.left}px`
                                                            }}>
                                                                <div className="py-1">
                                                                    <button
                                                                        onClick={() => handleQuickStatusChange(jobOrder.id, 'pending')}
                                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                                                                    >
                                                                        Pending
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleQuickStatusChange(jobOrder.id, 'in_progress')}
                                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                                                                    >
                                                                        In Progress
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleQuickStatusChange(jobOrder.id, 'completed')}
                                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                                                                    >
                                                                        Completed
                                                                    </button>
                                                                    <div className="border-t border-slate-200 my-1"></div>
                                                                    <button
                                                                        onClick={() => handleEditJobOrder(jobOrder)}
                                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                                                                    >
                                                                        <Edit size={14} /> Edit
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Edit Job Order Modal */}
                {isEditModalOpen && editingJobOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-2xl bg-white max-w-md w-full" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                                <h2 className="text-lg font-bold text-slate-900">Edit Job Order #{editingJobOrder.id}</h2>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Staff</label>
                                    <select
                                        value={editFormData.profile_id}
                                        onChange={(e) => setEditFormData({ ...editFormData, profile_id: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                    >
                                        <option value="">Select Staff</option>
                                        {staff.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editFormData.start_time}
                                        onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editFormData.end_time}
                                        onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* View Requests Modal */}
                {isViewRequestsModalOpen && selectedJobOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-2xl bg-white max-w-lg w-full" style={{ boxShadow: '0 4px 20px rgba(30, 58, 138, 0.15)' }}>
                            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                                <h2 className="text-lg font-bold text-slate-900">Product Requests</h2>
                                <button
                                    onClick={() => setIsViewRequestsModalOpen(false)}
                                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
                                    <p className="text-sm text-slate-600">Job Order: <span className="font-semibold text-slate-900">#{selectedJobOrder.id}</span></p>
                                    <p className="text-sm text-slate-600">Service: <span className="font-semibold text-slate-900">{selectedJobOrder.service?.service_name || 'Unknown'}</span></p>
                                </div>
                                {selectedJobOrder.product_usages && selectedJobOrder.product_usages.length > 0 ? (
                                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Product</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Quantity</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {selectedJobOrder.product_usages.map((usage) => (
                                                        <tr key={usage.id} className="hover:bg-slate-50 transition">
                                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                                <div className="flex items-center gap-2">
                                                                    <Package size={14} />
                                                                    <span>{usage.product.name}</span>
                                                                    {usage.is_returnable && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                                                                            <RotateCcw size={10} />
                                                                            Returnable
                                                                        </span>
                                                                    )}
                                                                    {usage.returned_at && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                                            <Check size={10} />
                                                                            Returned
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                                {usage.quantity_used} {usage.product.unit}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${requestStatusClasses[usage.status] || 'bg-slate-100 text-slate-800'}`}>
                                                                    {usage.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                                {usage.created_at ? new Date(usage.created_at).toLocaleString() : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {usage.is_returnable && usage.status === 'Approved' && !usage.returned_at && (
                                                                    <button
                                                                        onClick={() => handleReturnProduct(usage.id)}
                                                                        className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition"
                                                                    >
                                                                        <RotateCcw size={12} />
                                                                        Return
                                                                    </button>
                                                                )}
                                                                {usage.returned_at && (
                                                                    <span className="text-xs text-slate-500">
                                                                        {new Date(usage.returned_at).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                                        <Package className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">
                                            No product requests yet.
                                        </p>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Staff can request inventory for this task.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
