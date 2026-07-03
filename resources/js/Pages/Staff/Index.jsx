import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { User } from 'lucide-react';

export default function Index({ auth, staff, flash = {} }) {
    const [showCreateForm, setShowCreateForm] = useState(false);

    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();

        form.post(route('staff.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('name', 'email', 'password', 'password_confirmation');
                setShowCreateForm(false);
            },
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Staff Management</h2>}
        >
            <Head title="Staff Management" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 18px 50px rgba(13,42,148,0.18)' }}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold text-slate-900">Staff Management</h1>
                                <p className="mt-1 text-sm text-slate-500">Add new team members and review your current staff accounts.</p>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                                Total staff: <span className="rounded-full bg-indigo-600 px-3 py-1 text-white">{staff.length}</span>
                            </div>
                        </div>
                    </div>

                    {flash.success && (
                        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
                            {flash.success}
                        </div>
                    )}

                    <div className="mb-6 flex justify-end">
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                            {showCreateForm ? 'Hide Form' : 'Create New Staff'}
                        </button>
                    </div>

                    <div className={`grid gap-6 ${showCreateForm ? 'lg:grid-cols-2' : ''}`}>
                        {showCreateForm && (
                        <section className="rounded-3xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 12px 30px rgba(13,42,148,0.12)' }}>
                            <div className="flex items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Create Staff Account</p>
                                    <p className="mt-1 text-sm text-slate-500">Fill in the details to register new staff access.</p>
                                </div>
                            </div>

                            <form onSubmit={submit} className="mt-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Name</label>
                                    <input
                                        type="text"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        className="mt-2 block w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                    />
                                    {form.errors.name && <p className="mt-2 text-sm text-rose-600">{form.errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email</label>
                                    <input
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        className="mt-2 block w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                    />
                                    {form.errors.email && <p className="mt-2 text-sm text-rose-600">{form.errors.email}</p>}
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Password</label>
                                        <input
                                            type="password"
                                            value={form.data.password}
                                            onChange={(e) => form.setData('password', e.target.value)}
                                            className="mt-2 block w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                        />
                                        {form.errors.password && <p className="mt-2 text-sm text-rose-600">{form.errors.password}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={form.data.password_confirmation}
                                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                            className="mt-2 block w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                                        />
                                        {form.errors.password_confirmation && (
                                            <p className="mt-2 text-sm text-rose-600">{form.errors.password_confirmation}</p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Create Staff
                                </button>
                            </form>
                        </section>
                        )}

                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Staff Accounts</p>
                                    <p className="mt-1 text-sm text-slate-500">Current members with access to the staff dashboard.</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                                    {staff.length} total
                                </span>
                            </div>

                            {staff.length ? (
                                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                                            <thead className="bg-slate-50 text-slate-500">
                                                <tr>
                                                    <th className="px-5 py-4 text-left font-semibold uppercase tracking-[0.16em]">Name</th>
                                                    <th className="px-5 py-4 text-left font-semibold uppercase tracking-[0.16em]">Email</th>
                                                    <th className="px-5 py-4 text-left font-semibold uppercase tracking-[0.16em]">Profile</th>
                                                    <th className="px-5 py-4 text-left font-semibold uppercase tracking-[0.16em]">Face Status</th>
                                                    <th className="px-5 py-4 text-left font-semibold uppercase tracking-[0.16em]">Face</th>
                                                    <th className="px-5 py-4 text-left font-semibold uppercase tracking-[0.16em]">Created</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 bg-white">
                                            {staff.map((member) => (
                                                <tr key={member.id} className="hover:bg-slate-50">
                                                    <td className="px-5 py-4 text-slate-900">{member.name}</td>
                                                    <td className="px-5 py-4 text-slate-600">{member.email}</td>
                                                    <td className="px-5 py-4 text-slate-600">
                                                        {member.profile ? (
                                                            <div className="space-y-1">
                                                                <p className="font-medium text-slate-900">
                                                                    {member.profile.first_name || member.profile.last_name ? `${member.profile.first_name ?? ''} ${member.profile.last_name ?? ''}`.trim() : 'Profile created'}
                                                                </p>
                                                                {member.profile.phone && (
                                                                    <p className="text-xs text-slate-500">{member.profile.phone}</p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                                                No profile
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-600">
                                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${member.face_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {member.face_registered ? 'Face verified' : 'Pending face'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                                                        {member.face_image_path ? (
                                                            <img
                                                                src={member.face_image_path}
                                                                alt={`${member.name} face`}
                                                                className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                                                                onError={(event) => {
                                                                    event.currentTarget.onerror = null;
                                                                    event.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect width=%2248%22 height=%2248%22 rx=%2224%22 fill=%22%23E2E8F0%22/%3E%3Ctext x=%2224%22 y=%2228%22 font-size=%2212%22 text-anchor=%22middle%22 fill=%22%23717A83%22%3EFace%3C/text%3E%3C/svg%3E';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                                                                <User size={24} />
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-slate-600">{new Date(member.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                                    No staff accounts created yet.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
