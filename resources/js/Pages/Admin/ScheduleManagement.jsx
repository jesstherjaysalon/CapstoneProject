import { useEffect, useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Plus,
    Pencil,
    Trash2,
    X,
    Clock,
    AlertCircle,
    CheckCircle,
    Calendar,
} from 'lucide-react';

export default function ScheduleManagement({ auth, schedule }) {
    const { flash = {} } = usePage().props;
    const [modal, setModal] = useState({ open: false, mode: 'create' });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const form = useForm({
        operating_days: schedule?.operating_days || [],
        business_hours_start: schedule?.business_hours_start || '09:00',
        business_hours_end: schedule?.business_hours_end || '18:00',
        max_bookings_per_day: schedule?.max_bookings_per_day || 10,
    });

    useEffect(() => {
        if (!modal.open) {
            form.reset();
            if (schedule) {
                form.setData('operating_days', schedule.operating_days || []);
                form.setData('business_hours_start', schedule.business_hours_start || '09:00');
                form.setData('business_hours_end', schedule.business_hours_end || '18:00');
                form.setData('max_bookings_per_day', schedule.max_bookings_per_day || 10);
            }
        }
    }, [modal.open]);

    const handleDayToggle = (day) => {
        const updated = form.data.operating_days.includes(day)
            ? form.data.operating_days.filter((d) => d !== day)
            : [...form.data.operating_days, day];
        form.setData('operating_days', updated);
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!form.data.operating_days.length) {
            alert('Please select at least one operating day');
            return;
        }

        if (schedule?.id) {
            form.put(route('admin.schedule.update', schedule.id), {
                preserveScroll: true,
                onSuccess: () => setModal({ ...modal, open: false }),
            });
        } else {
            form.post(route('admin.schedule.store'), {
                preserveScroll: true,
                onSuccess: () => setModal({ ...modal, open: false }),
            });
        }
    };

    const handleDelete = () => {
        if (schedule?.id) {
            router.delete(route('admin.schedule.destroy', schedule.id), {
                preserveScroll: true,
                onSuccess: () => setDeleteModal({ open: false, id: null }),
            });
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Schedule Management" />

            <div className="min-h-screen py-8 px-4">
                <div className="mx-auto max-w-4xl">
                    {/* Success Message */}
                    {flash.success && (
                        <div className="mb-6 flex items-center gap-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 shadow-sm">
                            <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                            <p className="text-sm font-medium text-green-800">{flash.success}</p>
                        </div>
                    )}

                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                        <Calendar size={24} className="text-white" />
                                    </div>
                                    <h1 className="text-4xl font-bold text-gray-900">Schedule Management</h1>
                                </div>
                                <p className="text-gray-600 ml-12">
                                    Configure your business operating hours, working days, and daily booking capacity
                                </p>
                            </div>
                            <button
                                onClick={() => setModal({ open: true, mode: schedule?.id ? 'edit' : 'create' })}
                                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <Plus size={20} />
                                {schedule?.id ? 'Edit Schedule' : 'Create Schedule'}
                            </button>
                        </div>
                    </div>

                    {/* Current Schedule Card */}
                    {schedule?.id ? (
                        <div className="mb-8 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Clock size={20} className="text-blue-600" />
                                    Current Schedule
                                </h2>
                            </div>
                            
                            <div className="p-6">
                                <div className="grid gap-6 md:grid-cols-3">
                                    {/* Operating Days Card */}
                                    <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Operating Days</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {schedule.operating_days && schedule.operating_days.length > 0 ? (
                                                schedule.operating_days.map((day) => (
                                                    <span
                                                        key={day}
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700"
                                                    >
                                                        {day.slice(0, 3)}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 text-sm">Not set</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Business Hours Card */}
                                    <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Business Hours</p>
                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className="text-indigo-600" />
                                                <span className="text-lg font-bold text-gray-900">
                                                    {schedule.business_hours_start}
                                                </span>
                                            </div>
                                            <div className="h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className="text-indigo-600" />
                                                <span className="text-lg font-bold text-gray-900">
                                                    {schedule.business_hours_end}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Max Bookings Card */}
                                    <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Max Daily Bookings</p>
                                        <div className="mt-3">
                                            <div className="text-4xl font-bold text-indigo-600 mb-2">
                                                {schedule.max_bookings_per_day}
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full"
                                                    style={{ width: `${Math.min((schedule.max_bookings_per_day / 30) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 flex gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setModal({ open: true, mode: 'edit' })}
                                        className="flex items-center justify-center gap-2 flex-1 rounded-lg bg-blue-50 text-blue-600 font-medium py-2 hover:bg-blue-100 transition-colors duration-200"
                                    >
                                        <Pencil size={18} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal({ open: true, id: schedule.id })}
                                        className="flex items-center justify-center gap-2 flex-1 rounded-lg bg-red-50 text-red-600 font-medium py-2 hover:bg-red-100 transition-colors duration-200"
                                    >
                                        <Trash2 size={18} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                            <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedule Found</h3>
                            <p className="text-gray-600 mb-6">Create a schedule to manage your business hours and booking capacity</p>
                            <button
                                onClick={() => setModal({ open: true, mode: 'create' })}
                                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                            >
                                <Plus size={20} />
                                Create Schedule
                            </button>
                        </div>
                    )}

                    {/* Modal */}
                    {modal.open && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                            <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-white">
                                        {schedule?.id ? 'Edit Schedule' : 'Create Schedule'}
                                    </h2>
                                    <button
                                        onClick={() => setModal({ ...modal, open: false })}
                                        className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[calc(85vh-180px)] overflow-y-auto">
                                    {/* Operating Days */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                                            Operating Days *
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {days.map((day) => (
                                                <label
                                                    key={day}
                                                    className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${
                                                        form.data.operating_days.includes(day)
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.data.operating_days.includes(day)}
                                                        onChange={() => handleDayToggle(day)}
                                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                                                    />
                                                    <span className="font-medium text-gray-700">{day}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {form.errors.operating_days && (
                                            <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                                                <AlertCircle size={16} />
                                                {form.errors.operating_days}
                                            </p>
                                        )}
                                    </div>

                                    {/* Business Hours */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Opening Time */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                                                Opening Time *
                                            </label>
                                            <div className="relative">
                                                <Clock size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                                <input
                                                    type="time"
                                                    value={form.data.business_hours_start}
                                                    onChange={(e) =>
                                                        form.setData('business_hours_start', e.target.value)
                                                    }
                                                    className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors font-medium"
                                                />
                                            </div>
                                            {form.errors.business_hours_start && (
                                                <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                                                    <AlertCircle size={16} />
                                                    {form.errors.business_hours_start}
                                                </p>
                                            )}
                                        </div>

                                        {/* Closing Time */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                                                Closing Time *
                                            </label>
                                            <div className="relative">
                                                <Clock size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                                <input
                                                    type="time"
                                                    value={form.data.business_hours_end}
                                                    onChange={(e) =>
                                                        form.setData('business_hours_end', e.target.value)
                                                    }
                                                    className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors font-medium"
                                                />
                                            </div>
                                            {form.errors.business_hours_end && (
                                                <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                                                    <AlertCircle size={16} />
                                                    {form.errors.business_hours_end}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Max Bookings Per Day */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                                            Maximum Bookings Per Day *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.data.max_bookings_per_day}
                                            onChange={(e) =>
                                                form.setData('max_bookings_per_day', parseInt(e.target.value))
                                            }
                                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors font-medium"
                                        />
                                        <p className="mt-2 text-xs text-gray-500">Set a reasonable limit to manage booking capacity</p>
                                        {form.errors.max_bookings_per_day && (
                                            <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                                                <AlertCircle size={16} />
                                                {form.errors.max_bookings_per_day}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setModal({ ...modal, open: false })}
                                            className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={form.processing}
                                            className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                        >
                                            {form.processing ? 'Saving...' : 'Save Schedule'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {deleteModal.open && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                            <div className="w-full max-w-lg max-h-[85vh] rounded-2xl bg-white shadow-2xl overflow-hidden my-8">
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-red-600 to-orange-600 px-8 py-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <AlertCircle size={24} />
                                        Delete Schedule
                                    </h2>
                                </div>

                                {/* Modal Body */}
                                <div className="p-8 max-h-[calc(85vh-180px)] overflow-y-auto">
                                    <p className="text-gray-700 mb-6">
                                        Are you sure you want to delete this schedule? This action cannot be undone and will reset your business configuration.
                                    </p>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setDeleteModal({ open: false, id: null })}
                                            className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="flex-1 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 text-white font-semibold hover:from-red-700 hover:to-orange-700 transition-all duration-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}