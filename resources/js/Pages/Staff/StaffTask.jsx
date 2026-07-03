import { useMemo, useState, useRef } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import StaffLayout from '@/Layouts/StaffLayout';
import { CheckCircle, Clock, ClipboardList, Search, PlayCircle, Calendar, User, Check, Package, Plus, X, Eye, RotateCcw, Camera, Upload, Image as ImageIcon } from 'lucide-react';

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

export default function StaffTask({ auth, jobOrders, products }) {
    const { flash = {} } = usePage().props;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isViewRequestsModalOpen, setIsViewRequestsModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedJobOrder, setSelectedJobOrder] = useState(null);
    const [requestFormData, setRequestFormData] = useState({
        product_id: '',
        quantity_used: 1,
    });
    const [capturedImage, setCapturedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);

    const filteredJobOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query && !statusFilter) {
            return jobOrders;
        }

        return jobOrders.filter((jobOrder) => {
            const serviceName = jobOrder.service?.service_name || '';
            const customerName = jobOrder.customer?.name || '';
            const status = jobOrder.status || '';

            if (statusFilter && jobOrder.status !== statusFilter) {
                return false;
            }

            return [serviceName, customerName, status]
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [jobOrders, search, statusFilter]);

    const handleStatusChange = (jobOrderId, newStatus) => {
        // Check if trying to complete without image
        if (newStatus === 'completed') {
            const jobOrder = jobOrders.find(jo => jo.id === jobOrderId);
            if (!jobOrder?.service?.image) {
                setToast({
                    type: 'error',
                    message: 'Please upload a completion photo before marking the task as completed.'
                });
                setTimeout(() => setToast(null), 3000);
                return;
            }
        }
        
        router.put(route('staff.tasks.update', jobOrderId), {
            status: newStatus,
        });
    };

    const handleOpenRequestModal = (jobOrder) => {
        setSelectedJobOrder(jobOrder);
        setRequestFormData({
            product_id: '',
            quantity_used: 1,
        });
        setIsRequestModalOpen(true);
    };

    const handleViewRequests = (jobOrder) => {
        setSelectedJobOrder(jobOrder);
        setIsViewRequestsModalOpen(true);
    };

    const handleReturnProduct = async (usageId) => {
        try {
            const response = await fetch(`/staff/service-product-usage/${usageId}/return`, {
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

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/staff/service-product-usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: JSON.stringify({
                    job_order_id: selectedJobOrder.id,
                    product_id: requestFormData.product_id,
                    quantity_used: requestFormData.quantity_used,
                }),
            });

            if (response.ok) {
                setIsRequestModalOpen(false);
                router.reload();
            } else {
                console.error('Failed to submit request');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
        }
    };

    const handleOpenImageModal = (jobOrder) => {
        setSelectedJobOrder(jobOrder);
        // Convert stored path to full URL for display
        const imagePath = jobOrder.service?.image;
        setCapturedImage(imagePath ? `/storage/${imagePath}` : null);
        setIsImageModalOpen(true);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCapturedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCameraCapture = () => {
        fileInputRef.current.click();
    };

    const handleUploadImage = async () => {
        if (!capturedImage || !selectedJobOrder) return;

        setIsUploading(true);
        try {
            // Convert base64 to blob
            const response = await fetch(capturedImage);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('image', blob, 'completion-image.jpg');

            const uploadResponse = await fetch(route('staff.tasks.upload-image', selectedJobOrder.id), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: formData,
            });

            if (uploadResponse.ok) {
                setIsImageModalOpen(false);
                router.reload();
            } else {
                const error = await uploadResponse.json();
                alert(error.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <StaffLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">My Tasks</h2>}
        >
            <Head title="My Tasks" />

            <div className="space-y-6 py-6 px-4">
                {toast && (
                    <div className={`rounded-xl border p-4 text-sm shadow-sm ${toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                        <div className="flex items-start gap-2">
                            {toast.type === 'error' ? (
                                <X className="mt-0.5 h-5 w-5" />
                            ) : (
                                <CheckCircle className="mt-0.5 h-5 w-5" />
                            )}
                            <div>{toast.message}</div>
                        </div>
                    </div>
                )}
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
                            <h1 className="text-3xl font-bold text-slate-900">My Assigned Tasks</h1>
                            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
                                View and manage job orders assigned to you.
                            </p>
                        </div>

                        <div className="relative max-w-md w-full">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search tasks..."
                                className="w-full rounded-3xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-2 items-center w-full max-w-lg">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                <option value="">All statuses</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>

                            <button
                                onClick={() => { setStatusFilter(''); setSearch(''); }}
                                className="ml-auto rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-900">{filteredJobOrders.length}</span> task{filteredJobOrders.length === 1 ? '' : 's'}.
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
                                {search ? 'No matching tasks found.' : 'No tasks assigned yet.'}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {search ? 'Try another search term or clear the filter.' : 'Tasks will appear here when you are assigned to services.'}
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
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[jobOrder.status] || 'bg-slate-100 text-slate-800'}`}>
                                                        {jobOrder.status === 'in_progress' ? <PlayCircle size={12} className="mr-1" /> : jobOrder.status === 'completed' ? <Check size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                                                        {jobOrder.status.replace('_', ' ')}
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
                                                <button
                                                    onClick={() => handleOpenRequestModal(jobOrder)}
                                                    className="flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center justify-center gap-2"
                                                    title="Request Inventory"
                                                >
                                                    <Package size={16} />
                                                    <span>Request</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenImageModal(jobOrder)}
                                                    className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${jobOrder.service?.image ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                                    title="Upload Completion Image"
                                                >
                                                    {jobOrder.service?.image ? <ImageIcon size={16} /> : <Camera size={16} />}
                                                    <span className="hidden sm:inline">{jobOrder.service?.image ? 'Photo' : 'Photo'}</span>
                                                </button>
                                            </div>
                                            <div className="flex gap-1.5 flex-1">
                                                {jobOrder.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleStatusChange(jobOrder.id, 'in_progress')}
                                                        className="flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition flex items-center justify-center gap-1.5 bg-sky-100 text-sky-800 hover:bg-sky-200"
                                                        title="Set to In Progress"
                                                    >
                                                        <PlayCircle size={14} />
                                                        <span className="hidden sm:inline">Start</span>
                                                    </button>
                                                )}
                                                {jobOrder.status === 'in_progress' && (
                                                    <button
                                                        onClick={() => handleStatusChange(jobOrder.id, 'completed')}
                                                        className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition flex items-center justify-center gap-1.5 ${jobOrder.service?.image ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                        title="Set to Completed"
                                                    >
                                                        <Check size={14} />
                                                        <span className="hidden sm:inline">Done</span>
                                                    </button>
                                                )}
                                                {jobOrder.status === 'completed' && (
                                                    <span className="flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300">
                                                        <Check size={14} />
                                                        <span className="hidden sm:inline">Completed</span>
                                                    </span>
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
                                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusClasses[jobOrder.status] || 'bg-slate-100 text-slate-800'}`}>
                                                            {jobOrder.status === 'in_progress' ? <PlayCircle size={12} className="mr-1.5" /> : jobOrder.status === 'completed' ? <Check size={12} className="mr-1.5" /> : <Clock size={12} className="mr-1.5" />}
                                                            {jobOrder.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5">
                                                                <button
                                                                    onClick={() => handleViewRequests(jobOrder)}
                                                                    className="p-1.5 rounded-full text-slate-600 hover:bg-slate-200 transition"
                                                                    title="View Requests"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <div className="w-px h-4 bg-slate-300"></div>
                                                                <button
                                                                    onClick={() => handleOpenRequestModal(jobOrder)}
                                                                    className="p-1.5 rounded-full text-indigo-600 hover:bg-indigo-100 transition"
                                                                    title="Request Inventory"
                                                                >
                                                                    <Package size={16} />
                                                                </button>
                                                                <div className="w-px h-4 bg-slate-300"></div>
                                                                <button
                                                                    onClick={() => handleOpenImageModal(jobOrder)}
                                                                    className={`p-1.5 rounded-full transition ${jobOrder.service?.image ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-600 hover:bg-slate-200'}`}
                                                                    title="Upload Completion Image"
                                                                >
                                                                    {jobOrder.service?.image ? <ImageIcon size={16} /> : <Camera size={16} />}
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {jobOrder.status === 'pending' && (
                                                                    <button
                                                                        onClick={() => handleStatusChange(jobOrder.id, 'in_progress')}
                                                                        className="p-1.5 rounded-full transition bg-sky-100 text-sky-700 hover:bg-sky-200"
                                                                        title="Set to In Progress"
                                                                    >
                                                                        <PlayCircle size={16} />
                                                                    </button>
                                                                )}
                                                                {jobOrder.status === 'in_progress' && (
                                                                    <button
                                                                        onClick={() => handleStatusChange(jobOrder.id, 'completed')}
                                                                        className={`p-1.5 rounded-full transition ${jobOrder.service?.image ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                                        title="Set to Completed"
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                )}
                                                                {jobOrder.status === 'completed' && (
                                                                    <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300">
                                                                        <Check size={16} />
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
                            </div>
                        </>
                    )}
                </div>

                {/* Inventory Request Modal */}
                {isRequestModalOpen && selectedJobOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-3xl bg-white shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                                <h2 className="text-xl font-semibold text-slate-900">Request Inventory</h2>
                                <button
                                    onClick={() => setIsRequestModalOpen(false)}
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitRequest} className="space-y-4 p-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm text-slate-600">Job Order: <span className="font-semibold text-slate-900">#{selectedJobOrder.id}</span></p>
                                    <p className="text-sm text-slate-600">Service: <span className="font-semibold text-slate-900">{selectedJobOrder.service?.service_name || 'Unknown'}</span></p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                                    <select
                                        value={requestFormData.product_id}
                                        onChange={(e) => setRequestFormData({ ...requestFormData, product_id: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    >
                                        <option value="">Select Product</option>
                                        {products && products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (Available: {product.current_stock} {product.unit})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={requestFormData.quantity_used}
                                        onChange={(e) => setRequestFormData({ ...requestFormData, quantity_used: parseInt(e.target.value) || 1 })}
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsRequestModalOpen(false)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition">Cancel</button>
                                    <button type="submit" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">Submit Request</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* View Requests Modal */}
                {isViewRequestsModalOpen && selectedJobOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-3xl bg-white shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                                <h2 className="text-xl font-semibold text-slate-900">Product Requests</h2>
                                <button
                                    onClick={() => setIsViewRequestsModalOpen(false)}
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
                                    <p className="text-sm text-slate-600">Job Order: <span className="font-semibold text-slate-900">#{selectedJobOrder.id}</span></p>
                                    <p className="text-sm text-slate-600">Service: <span className="font-semibold text-slate-900">{selectedJobOrder.service?.service_name || 'Unknown'}</span></p>
                                </div>
                                {selectedJobOrder.product_usages && selectedJobOrder.product_usages.length > 0 ? (
                                    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden" style={{ boxShadow: '0 12px 30px rgba(16,185,129,0.12)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-50">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Product</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Quantity</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
                                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">Action</th>
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
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <Package className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-700">
                                            No product requests yet.
                                        </p>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Request inventory for this task by clicking the Package icon.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Upload Modal */}
                {isImageModalOpen && selectedJobOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                        <div className="rounded-3xl bg-white shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-3xl">
                                <h2 className="text-xl font-semibold text-slate-900">Completion Photo</h2>
                                <button
                                    onClick={() => setIsImageModalOpen(false)}
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-200 transition"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
                                    <p className="text-sm text-slate-600">Job Order: <span className="font-semibold text-slate-900">#{selectedJobOrder.id}</span></p>
                                    <p className="text-sm text-slate-600">Service: <span className="font-semibold text-slate-900">{selectedJobOrder.service?.service_name || 'Unknown'}</span></p>
                                </div>
                                
                                <div className="space-y-4">
                                    {capturedImage ? (
                                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                            <img
                                                src={capturedImage}
                                                alt="Captured image"
                                                className="w-full h-auto object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                            <Camera className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                                            <p className="text-sm font-semibold text-slate-700">
                                                No photo captured yet
                                            </p>
                                            <p className="mt-2 text-sm text-slate-500">
                                                Take a photo to document task completion
                                            </p>
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                    />

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleCameraCapture}
                                            className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Camera size={18} />
                                            <span>Take Photo</span>
                                        </button>
                                        {capturedImage && (
                                            <button
                                                onClick={() => setCapturedImage(null)}
                                                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {capturedImage && (
                                        <button
                                            onClick={handleUploadImage}
                                            disabled={isUploading}
                                            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUploading ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                    <span>Uploading...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={18} />
                                                    <span>Upload Photo</span>
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <p className="text-xs text-slate-500 text-center">
                                        A photo is required before marking the task as completed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </StaffLayout>
    );
}
