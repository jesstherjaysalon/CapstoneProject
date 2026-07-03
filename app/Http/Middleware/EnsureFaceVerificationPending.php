<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFaceVerificationPending
{
    public function handle(Request $request, Closure $next): Response
    {
        // For web requests with session
        if ($request->hasSession()) {
            $userId = $request->session()->get('face_verification_user_id');
            $expiresAt = $request->session()->get('face_verification_expires_at');

            if (! $userId || ! $expiresAt || now()->greaterThan($expiresAt)) {
                $request->session()->forget([
                    'face_verification_user_id',
                    'face_verification_remember',
                    'face_verification_expires_at',
                ]);

                return redirect()->route('login')->withErrors([
                    'email' => 'Face verification session expired. Please sign in again.',
                ]);
            }

            return $next($request);
        }

        // For API/mobile requests - get from request body/headers
        $userId = $request->input('user_id') ?? $request->header('X-User-Id');
        $expiresAt = $request->input('expires_at') ?? $request->header('X-Expires-At');

        if (! $userId || ! $expiresAt || now()->greaterThan($expiresAt)) {
            return response()->json([
                'success' => false,
                'message' => 'Face verification session expired. Please sign in again.',
            ], 401);
        }

        // Add user_id to request for controller use
        $request->merge(['face_verification_user_id' => $userId]);

        return $next($request);
    }
}
