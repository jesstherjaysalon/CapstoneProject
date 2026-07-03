import { useEffect, useCallback, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        return () => reset('password');
    }, [reset]);

    const handleChange = useCallback(
        (field) => (e) => {
            setData(field, field === 'remember' ? e.target.checked : e.target.value);
        },
        [setData]
    );

    const submit = useCallback(
        (e) => {
            e.preventDefault();

            post(route('login'), {
                preserveScroll: true,
                onFinish: () => reset('password'),
            });
        },
        [post, reset]
    );

    const statusMessage = useMemo(() => {
        if (!status) return null;
        return (
            <div className="mb-4 text-sm text-green-400" role="status">
                {status}
            </div>
        );
    }, [status]);

    return (
        <>
            <Head title="Sign in" />

            <div className="relative min-h-screen bg-white px-4 py-10 flex items-center justify-center overflow-hidden">
                <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-900/15 blur-3xl"></div>
                <div className="pointer-events-none absolute right-10 top-24 h-56 w-56 rounded-full bg-blue-900/20 blur-3xl"></div>
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-800/10 blur-2xl"></div>
                <div className="pointer-events-none absolute right-[-36px] bottom-20 h-72 w-72 rounded-full bg-blue-900/10 blur-3xl"></div>

                <div className="relative w-full max-w-md">
                    <div className="mb-8 text-center">
                        <img
                            src="/images/logo.png"
                            alt="Logo"
                            className="mx-auto h-14 w-auto object-contain"
                        />
                        <h1 className="mt-6 text-3xl font-semibold text-blue-900">Sign in</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            Continue with secure access for your Car Services account.
                        </p>
                    </div>

                    {statusMessage && (
                        <div className="mb-6 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <InputLabel htmlFor="email" value="Email address" className="text-slate-700" />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                isFocused
                                className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-900 focus:ring-blue-900/20"
                                onChange={handleChange('email')}
                                disabled={processing}
                            />
                            <InputError message={errors.email} className="mt-2 text-sm text-rose-500" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="Password" className="text-slate-700" />
                            <div className="relative mt-1">
                                <TextInput
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    autoComplete="current-password"
                                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 focus:border-blue-900 focus:ring-blue-900/20"
                                    onChange={handleChange('password')}
                                    disabled={processing}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-blue-900"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                            <path d="M12 5.25c-5.04 0-9.27 3.18-11 7.5 1.73 4.32 5.96 7.5 11 7.5 5.04 0 9.27-3.18 11-7.5-1.73-4.32-5.96-7.5-11-7.5Zm0 13.5c-3.54 0-6.6-2.14-8.06-5.25C5.4 10.14 8.46 8 12 8c3.54 0 6.6 2.14 8.06 5.25C18.6 16.61 15.54 18.75 12 18.75Zm0-8.25a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                            <path d="M2.47 2.47a.75.75 0 0 0-1.06 1.06l1.28 1.28A12.09 12.09 0 0 0 1.25 12c1.73 4.32 5.96 7.5 11 7.5 1.58 0 3.09-.33 4.44-.93l1.34 1.34a.75.75 0 0 0 1.06-1.06L3.53 2.47Zm4.39 4.39 1.82 1.82a3 3 0 0 0 3.96 3.96l1.82 1.82C10.47 14.58 9.27 14.75 8 14.75c-3.54 0-6.6-2.14-8.06-5.25a10.59 10.59 0 0 1 2.92-3.64Zm11.16 6.77-1.53-1.53a3 3 0 0 0-3.96-3.96L6.8 5.75C8.26 5.25 9.88 5 11.5 5c5.04 0 9.27 3.18 11 7.5-.4 1-.92 1.95-1.59 2.8ZM15.5 12a3.5 3.5 0 0 1-3.47 3.5c-.4 0-.79-.08-1.15-.22l1.61-1.61a1.75 1.75 0 0 0 2.5-2.5l1.61-1.61c-.14-.36-.22-.75-.22-1.15A3.5 3.5 0 0 1 15.5 12Zm-5 0a1.5 1.5 0 0 1 1.24-1.47l-1.47 1.47c.09.33.23.64.4.92Z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-2 text-sm text-rose-500" />
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={handleChange('remember')}
                                    disabled={processing}
                                />
                                Remember me
                            </label>
                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-blue-900 hover:text-blue-700"
                                >
                                    Forgot password?
                                </Link>
                            )}
                        </div>

                        <PrimaryButton
                            type="submit"
                            disabled={processing}
                            className="w-full justify-center bg-blue-900 text-white hover:bg-blue-800"
                        >
                            {processing ? 'Signing in...' : 'Sign in'}
                        </PrimaryButton>
                    </form>

                    <div className="mt-8 text-center text-xs text-slate-500">
                        Secure login powered by Car Services Management System
                    </div>
                </div>
            </div>
        </>
    );
}