<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use App\Mail\LoginOtpMail;

class LoginController extends Controller
{
    /**
     * Handle API login request and return JSON response.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|string|email',
                'password' => 'required|string',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if ($user->status !== User::STATUS_ACTIVE) {
            return response()->json(['success' => false, 'message' => 'This account is not active.'], 403);
        }

        $pendingToken = bin2hex(random_bytes(32));
        Cache::put('mobile_login:'.$pendingToken, ['user_id' => $user->id], now()->addMinutes(10));

        return response()->json([
            'success' => true,
            'message' => 'Choose a verification method.',
            'requires_verification' => true,
            'data' => [
                'user' => $user->only(['id', 'name', 'email', 'role', 'status']),
                'pending_token' => $pendingToken,
                'can_face_verify' => $user->faceData !== null,
            ],
        ], 202);
    }

    public function sendOtp(Request $request)
    {
        $request->validate(['pending_token' => 'required|string']);
        $pending = Cache::get('mobile_login:'.$request->input('pending_token'));
        if (! $pending) {
            return response()->json(['success' => false, 'message' => 'Login verification has expired.'], 401);
        }

        $key = 'mobile_login_otp:'.$request->input('pending_token');
        $current = Cache::get($key);
        if ($current && isset($current['sent_at']) && now()->diffInSeconds($current['sent_at']) < 60) {
            return response()->json(['success' => false, 'message' => 'Please wait before requesting another code.'], 429);
        }

        $user = User::find($pending['user_id']);
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Account not found.'], 404);
        }

        $code = (string) random_int(100000, 999999);
        Cache::put($key, [
            'hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(10),
            'sent_at' => now(),
        ], now()->addMinutes(10));
        Mail::to($user->email)->send(new LoginOtpMail($code));

        return response()->json(['success' => true, 'message' => 'A verification code was sent to your registered email.']);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate(['pending_token' => 'required|string', 'otp' => 'required|digits:6']);
        $pending = Cache::get('mobile_login:'.$request->pending_token);
        $otp = Cache::get('mobile_login_otp:'.$request->pending_token);

        if (! $pending || ! $otp || now()->greaterThan($otp['expires_at']) || ! Hash::check($request->otp, $otp['hash'])) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired verification code.'], 422);
        }

        return $this->completeMobileLogin($request->pending_token, $pending['user_id']);
    }

    private function completeMobileLogin(string $pendingToken, int $userId)
    {
        Cache::forget('mobile_login:'.$pendingToken);
        Cache::forget('mobile_login_otp:'.$pendingToken);
        $user = User::findOrFail($userId);
        $token = $user->createToken('mobile-app-token')->plainTextToken;

        return response()->json(['success' => true, 'message' => 'Login successful.', 'data' => [
            'user' => $user->only(['id', 'name', 'email', 'role', 'status']),
            'token' => $token,
        ]]);
    }

    /**
     * Handle API logout request.
     */
    public function destroy(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logout successful.',
        ], 200);
    }
}
