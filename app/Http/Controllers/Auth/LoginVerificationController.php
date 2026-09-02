<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\LoginOtpMail;
use App\Models\User;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class LoginVerificationController extends Controller
{
    public function choice(Request $request): Response
    {
        $user = $this->pendingUser($request);

        return Inertia::render('Auth/LoginVerification', [
            'email' => $user->email,
            'canFaceVerify' => (bool) $user->faceData,
            'sendOtpUrl' => route('verification.otp.send'),
            'verifyOtpUrl' => route('verification.otp.verify'),
            'faceVerifyUrl' => route('face.verify'),
        ]);
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $user = $this->pendingUser($request);
        $code = (string) random_int(100000, 999999);

        $request->session()->put([
            'login_otp_hash' => Hash::make($code),
            'login_otp_expires_at' => now()->addMinutes(10),
            'login_otp_sent_at' => now(),
        ]);

        Mail::to($user->email)->send(new LoginOtpMail($code));

        return response()->json([
            'message' => 'A one-time code was sent to your registered email address.',
            'expiresIn' => 600,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate(['otp' => ['required', 'digits:6']]);
        $user = $this->pendingUser($request);
        $expiresAt = $request->session()->get('login_otp_expires_at');
        $hash = $request->session()->get('login_otp_hash');

        if (! $expiresAt || now()->greaterThan($expiresAt) || ! $hash || ! Hash::check($request->string('otp'), $hash)) {
            return response()->json(['message' => 'The code is invalid or expired.'], 422);
        }

        $remember = (bool) $request->session()->get('face_verification_remember');
        $this->clearPendingVerification($request);
        Auth::login($user, $remember);
        $request->session()->regenerate();

        return response()->json([
            'redirect_url' => RouteServiceProvider::homeForRole($user->role),
        ]);
    }

    private function pendingUser(Request $request): User
    {
        $userId = $request->session()->get('face_verification_user_id');
        $expiresAt = $request->session()->get('face_verification_expires_at');
        $user = $userId ? User::find($userId) : null;

        abort_unless($user && $user->status === User::STATUS_ACTIVE && $expiresAt && now()->lessThanOrEqualTo($expiresAt) && ! Auth::check(), 401, 'Verification session expired. Please sign in again.');

        return $user;
    }

    private function clearPendingVerification(Request $request): void
    {
        $request->session()->forget([
            'face_verification_user_id',
            'face_verification_remember',
            'face_verification_expires_at',
            'login_otp_hash',
            'login_otp_expires_at',
            'login_otp_sent_at',
        ]);
    }
}
