import { useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import StaffLayout from '@/Layouts/StaffLayout';
import { CheckCircle, Search, Calendar, User, Check, ClipboardList, Eye, ImageIcon, Star } from 'lucide-react';

const statusClasses = {
    pending: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-sky-100 text-sky-800',
    completed: 'bg-emerald-100 text-emerald-800',
};

const renderStars = (rating) => {
    if (!rating) return <span className="text-sm text-slate-400">No rating</span>;
    
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={16}
                    className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                />
            ))}
            <span className="ml-1 text-sm font-semibold text-slate-700">{rating}/5</span>
        </div>
    );
};

export default function ServiceAssignments({ auth, jobOrders }) {
    const { flash = {} } = usePage().props;
    const [search, setSearch] = useState('');
    const [isViewRequestsModalOpen, setIsViewRequestsModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedJobOrder, setSelectedJobOrder] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);

    const filteredJobOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return jobOrders;
        }

        return jobOrders.filter((jobOrder) => {
            const serviceName = jobOrder.service?.service_name || '';
            const customerName = jobOrder.customer?.name || '';

            return [serviceName, customerName]
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [jobOrders, search]);

    const handleViewRequests = (jobOrder) => {
        setSelectedJobOrder(jobOrder);
        setIsViewRequestsModalOpen(true);
    };

    const handleOpenImageModal = (jobOrder) => {
        setSelectedJobOrder(jobOrder);
        const imagePath = jobOrder.service?.image;
        setCapturedImage(imagePath ? `/storage/${imagePath}` : null);
        setIsImageModalOpen(true);
    };

    return (
        <StaffLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Service Assignments</h2>}
        >
            <Head title="Service Assignments" />

            <div className="space-y-6 py-6 px-4">
                {flash.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
                        <div className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-5 w-5" />
                            <div>{flash.success}</div>
                        </div>
                    </div>
                )}

                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6" style={{ boxShadow: '0 18px 50px rgba(16,185,129,0.18)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">My Job Orders History</h1>
                            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
                                View your completed job orders and service history.
                            </p>
                        </div>

                        <div className="relative max-w-md w-full">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search completed tasks..."
                                className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-900">{filteredJobOrders.length}</span> completed task{filteredJobOrders.length === 1 ? '' : 's'}.
                        </p>
                        {search && (
                            <p className="text-sm text-slate-500">
                                Search term: <span className="font-semibold text-slate-900">"{search}"</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid gap-6">
                    {filteredJobOrders.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                            <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                            <p className="text-sm font-semibold text-slate-700">
                                {search ? 'No matching completed tasks found.' : 'No completed tasks yet.'}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {search ? 'Try another search term or clear the filter.' : 'Completed tasks will appear here once you finish your assigned services.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden grid gap-4">
                                {filteredJobOrders.map((jobOrder) => (
                                    <div key={jobOrder.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <span className="text-sm font-bold text-slate-900">#{jobOrder.id}</span>
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                        <Check size={12} className="mr-1" />
                                                        Completed
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-3">
                                                <div className="p-2 bg-white rounded-xl shadow-sm">
                                                    <span className="font-semibold text-slate-900">{jobOrder.service?.service_name || 'Unknown'}</span>
                                                    <p className="text-xs text-slate-500 mt-1">Service</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-700">
                                                <div className="p-2 bg-slate-100 rounded-full">
                                                    <User size={16} className="text-slate-600" />
                                                </div>
                                                <span className="font-medium text-slate-900">{jobOrder.customer?.name || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-700 bg-slate-50 rounded-xl p-2">
                                                <Star size={14} className="text-amber-400" />
                                                <div className="text-xs">
                                                    <p className="text-slate-500">Rating</p>
                                                    {renderStars(jobOrder.service?.rating)}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex items-center gap-2 text-slate-700 bg-slate-50 rounded-xl p-2">
                                                    <Calendar size={14} className="text-slate-500" />
                                                    <div className="text-xs">
                                                        <p className="text-slate-500">Start</p>
                                                        <p className="font-medium text-slate-900">{jobOrder.start_time ? new Date(jobOrder.start_time).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-700 bg-slate-50 rounded-xl p-2">
                                                    <Calendar size={14} className="text-slate-500" />
                                                    <div className="text-xs">
                                                        <p className="text-slate-500">End</p>
                                                        <p className="font-medium text-slate-900">{jobOrder.end_time ? new Date(jobOrder.end_time).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <div className="flex gap-2 flex-1">
                                                <button
                                                    onClick={() => handleViewRequests(jobOrder)}
                                                    className="flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-2"
                                                    title="View Requests"
                                                >
                                                    <Eye size={16} />
                                                    <span>View</span>
                                                </button>
                                                {jobOrder.service?.image && (
                                                    <button
                                                        onClick={() => handleOpenImageModal(jobOrder)}
                                                        className="flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center justify-center gap-2"
                                                        title="View Completion Photo"
                                                    >
                                                        <ImageIcon size={16} />
                                                        <span>Photo</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(16,185,129,0.12)' }}>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">ID</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Service</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Customer</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Rating</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Start Time</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">End Time</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredJobOrders.map((jobOrder) => (
                                                <tr key={jobOrder.id} className="hover:bg-slate-50/80 transition">
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-900">#{jobOrder.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-medium text-slate-700">{jobOrder.service?.service_name || 'Unknown'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-slate-100 rounded-full">
                                                                <User size={14} className="text-slate-600" />
                                                            </div>
                                                            <span className="text-sm text-slate-700">{jobOrder.customer?.name || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {renderStars(jobOrder.service?.rating)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-700">
                                                        {jobOrder.start_time ? (
                                                            <div className="flex items-center gap-2">
                                                                <Calendar size={14} className="text-slate-400" />
                                                                {new Date(jobOrder.start_time).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-700">
                                                        {jobOrder.end_time ? (
                                                            <div className="flex items-center gap-2">
                                                                <Calendar size={14} className="text-slate-400" />
                                                                {new Date(jobOrder.end_time).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-800">
                                                            <Check size={12} className="mr-1.5" />
                                                            Completed
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleViewRequests(jobOrder)}
                                                                className="p-1.5 rounded-full text-slate-600 hover:bg-slate-200 transition"
                                                                title="View Requests"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {jobOrder.service?.image && (
                                                                <button
                                                                    onClick={() => handleOpenImageModal(jobOrder)}
                                                                    className="p-1.5 rounded-full text-emerald-600 hover:bg-emerald-100 transition"
                                                                    title="View Completion Photo"
                                                                >
                                                                    <ImageIcon size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* View Requests Modal */}
                {isViewRequestsModalOpen && selectedJobOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-3xl bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                                <h2 className="text-xl font-semibold text-slate-900">Inventory Requests</h2>
                                <button
                                    onClick={() => setIsViewRequestsModalOpen(false)}
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                                >
                                    <CheckCircle size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
                                    <p className="text-sm text-slate-600">Job Order: <span className="font-semibold text-slate-900">#{selectedJobOrder.id}</span></p>
                                    <p className="text-sm text-slate-600">Service: <span className="font-semibold text-slate-900">{selectedJobOrder.service?.service_name || 'Unknown'}</span></p>
                                </div>
                                {selectedJobOrder.service_product_usages && selectedJobOrder.service_product_usages.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedJobOrder.service_product_usages.map((usage) => (
                                            <div key={usage.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{usage.product?.name || 'Unknown Product'}</p>
                                                        <p className="text-sm text-slate-500">Quantity Used: {usage.quantity_used}</p>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                        usage.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                                        usage.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                                        'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {usage.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-slate-500">No inventory requests for this job order.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Modal */}
                {isImageModalOpen && selectedJobOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-3xl bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                                <h2 className="text-xl font-semibold text-slate-900">Completion Photo</h2>
                                <button
                                    onClick={() => setIsImageModalOpen(false)}
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                                >
                                    <CheckCircle size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
                                    <p className="text-sm text-slate-600">Job Order: <span className="font-semibold text-slate-900">#{selectedJobOrder.id}</span></p>
                                    <p className="text-sm text-slate-600">Service: <span className="font-semibold text-slate-900">{selectedJobOrder.service?.service_name || 'Unknown'}</span></p>
                                </div>
                                {capturedImage ? (
                                    <div className="rounded-2xl overflow-hidden border border-slate-200">
                                        <img
                                            src={capturedImage}
                                            alt="Completion Photo"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-slate-500">No completion photo available.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </StaffLayout>
    );
}
