import { Head, Link, useForm } from '@inertiajs/react';

export default function CreateProfile({ staff, storeUrl }) {
    const form = useForm({
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
    });

    const submit = (event) => {
        event.preventDefault();
        form.post(storeUrl);
    };

    return (
        <>
            <Head title="Complete Profile" />

            <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-4xl">
                    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.25)] p-6 sm:p-8 lg:p-10">
                        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
                                    Staff onboarding
                                </p>
                                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                                    Complete your profile
                                </h1>
                                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                                    Share your details to finalize the onboarding process before face registration. This keeps your team experience polished and secure.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-950/10 p-6 shadow-sm shadow-slate-950/5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/10 text-slate-950 ring-1 ring-slate-950/10">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-950">Profile details</p>
                                        <p className="text-sm text-slate-500">One refined step to complete your account.</p>
                                    </div>
                                </div>
                                <div className="mt-6 space-y-3 rounded-3xl bg-slate-100 p-4 text-slate-600">
                                    <div className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm shadow-slate-950/5 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="text-sm">First name</span>
                                        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">required</span>
                                    </div>
                                    <div className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm shadow-slate-950/5 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="text-sm">Phone number</span>
                                        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">09XXXXXXXXX</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submit} className="mt-10 grid gap-6 sm:grid-cols-2">
                            <div className="space-y-6 sm:col-span-2">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={form.data.first_name}
                                            onChange={(e) => form.setData('first_name', e.target.value)}
                                            placeholder="Enter first name"
                                            className="mt-3 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 shadow-sm shadow-slate-950/5 transition duration-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                        />
                                        {form.errors.first_name && (
                                            <p className="mt-2 text-sm text-rose-500">
                                                {form.errors.first_name}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={form.data.last_name}
                                            onChange={(e) => form.setData('last_name', e.target.value)}
                                            placeholder="Enter last name"
                                            className="mt-3 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 shadow-sm shadow-slate-950/5 transition duration-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                        />
                                        {form.errors.last_name && (
                                            <p className="mt-2 text-sm text-rose-500">
                                                {form.errors.last_name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                        placeholder="09XXXXXXXXX"
                                        className="mt-3 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 shadow-sm shadow-slate-950/5 transition duration-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                    />
                                    {form.errors.phone && (
                                        <p className="mt-2 text-sm text-rose-500">
                                            {form.errors.phone}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Address
                                    </label>
                                    <textarea
                                        value={form.data.address}
                                        onChange={(e) => form.setData('address', e.target.value)}
                                        rows={5}
                                        placeholder="Enter full address"
                                        className="mt-3 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 shadow-sm shadow-slate-950/5 transition duration-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                    />
                                    {form.errors.address && (
                                        <p className="mt-2 text-sm text-rose-500">
                                            {form.errors.address}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Link
                                        href={route('login')}
                                        className="inline-flex items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                    >
                                        Back to login
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="inline-flex items-center justify-center rounded-[24px] bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition duration-200 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Next step
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}