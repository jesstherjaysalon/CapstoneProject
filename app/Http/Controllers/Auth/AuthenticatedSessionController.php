<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $user = Auth::user();

        if (! $user instanceof User || $user->status !== User::STATUS_ACTIVE) {
            Auth::logout();

            return back()->withErrors([
                'email' => 'Your account is not active or authorized to sign in.',
            ]);
        }

        $request->session()->put('face_verification_user_id', $user->id);
        $request->session()->put('face_verification_remember', $request->boolean('remember'));
        $request->session()->put('face_verification_expires_at', now()->addMinutes(10));
        $request->session()->forget(['login_otp_hash', 'login_otp_expires_at', 'login_otp_sent_at']);

        Auth::logout();

        return redirect()->route('verification.choice');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
