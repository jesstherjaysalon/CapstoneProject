import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Camera, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function LoginVerification({ email, canFaceVerify, sendOtpUrl, verifyOtpUrl, faceVerifyUrl }) {
    const [mode, setMode] = useState('choice');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const requestOtp = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(sendOtpUrl);
            setMessage(response.data.message);
            setMode('otp');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to send the verification code.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(verifyOtpUrl, { otp });
            window.location.href = response.data.redirect_url;
        } catch (verifyError) {
            setError(verifyError.response?.data?.message || 'The verification code is invalid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Verify your identity" />
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
                <section className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 text-white">
                        <ShieldCheck className="h-7 w-7" />
                    </div>
                    <h1 className="mt-6 text-center text-2xl font-semibold text-slate-900">Verify your identity</h1>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Choose how you would like to finish signing in to {email}.
                    </p>

                    {mode === 'choice' && (
                        <div className="mt-8 grid gap-3">
                            {canFaceVerify && (
                                <a href={faceVerifyUrl} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-900 hover:bg-blue-50">
                                    <Camera className="h-6 w-6 text-blue-900" />
                                    <span>
                                        <span className="block font-semibold text-slate-900">Face verification</span>
                                        <span className="block text-sm text-slate-500">Use your registered face data</span>
                                    </span>
                                </a>
                            )}
                            <button type="button" onClick={requestOtp} disabled={loading} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-900 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">
                                <Mail className="h-6 w-6 text-blue-900" />
                                <span>
                                    <span className="block font-semibold text-slate-900">Gmail OTP</span>
                                    <span className="block text-sm text-slate-500">Send a code to your registered email</span>
                                </span>
                            </button>
                        </div>
                    )}

                    {mode === 'otp' && (
                        <form onSubmit={verifyOtp} className="mt-8">
                            <label htmlFor="otp" className="block text-sm font-medium text-slate-700">Enter the 6-digit code</label>
                            <input id="otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-900 focus:border-blue-900 focus:ring-blue-900/20" />
                            <button type="submit" disabled={loading || otp.length !== 6} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-900 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                                <CheckCircle2 className="h-5 w-5" />
                                {loading ? 'Verifying...' : 'Verify and sign in'}
                            </button>
                            <button type="button" onClick={() => setMode('choice')} className="mt-3 w-full text-sm text-slate-500 hover:text-blue-900">Use another method</button>
                        </form>
                    )}

                    {message && <p className="mt-5 text-center text-sm text-emerald-600" role="status">{message}</p>}
                    {error && <p className="mt-5 text-center text-sm text-rose-600" role="alert">{error}</p>}
                </section>
            </main>
        </>
    );
}
