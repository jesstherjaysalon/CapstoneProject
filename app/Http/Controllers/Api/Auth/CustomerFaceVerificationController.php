<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\FaceVerificationService;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class CustomerFaceVerificationController extends Controller
{
    public function verify(Request $request, FaceVerificationService $verificationService): JsonResponse
    {
        $request->validate([
            'face_image' => ['required', 'image', 'mimes:jpeg,png,jpg', 'max:5120'],
            'user_id' => ['required'],
            'pending_token' => ['required', 'string'],
        ]);

        $pending = Cache::get('mobile_login:'.$request->input('pending_token'));
        $userId = $pending['user_id'] ?? null;

        if (! $userId) {
            return response()->json([
                'verified' => false,
                'message' => 'User ID is required for face verification.',
            ], 400);
        }

        $user = User::find($userId);

        if (! $user || $user->status !== User::STATUS_ACTIVE || $user->role !== 'Customer') {
            return response()->json([
                'verified' => false,
                'message' => 'Face verification is not authorized for this account.',
            ], 403);
        }

        if (! $user->faceData) {
            return response()->json([
                'verified' => false,
                'message' => 'Face data is not registered for this account.',
            ], 422);
        }

        $file = $request->file('face_image');
        $tempName = uniqid('face_verify_', true).'.'.$file->getClientOriginalExtension();
        $tempPath = Storage::disk('local')->putFileAs('temp_face_verify', $file, $tempName);

        if (! $tempPath) {
            return response()->json([
                'verified' => false,
                'message' => 'Unable to save captured image for verification.',
            ], 500);
        }

        // Normalize stored encoding to ensure it's a JSON array on disk.
        $stored = $user->faceData->face_encoding;
        $normalized = null;

        \Log::info('Customer face verification - stored encoding type', [
            'type' => gettype($stored),
            'is_array' => is_array($stored),
            'is_string' => is_string($stored),
        ]);

        if (is_array($stored)) {
            $normalized = $stored;
        } elseif (is_string($stored)) {
            // Try decode as-is
            $decoded = json_decode($stored, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $normalized = $decoded;
            } else {
                // Try stripslashes then decode
                $stripped = stripslashes($stored);
                $decoded = json_decode($stripped, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $normalized = $decoded;
                } else {
                    // Try trimming surrounding quotes then decode
                    $trimmed = trim($stored, "'\"");
                    $decoded = json_decode($trimmed, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $normalized = $decoded;
                    }
                }
            }
        }

        if (! is_array($normalized)) {
            Storage::disk('local')->delete($tempPath);
            \Log::warning('Customer face verification - normalized encoding failed', [
                'type' => gettype($normalized),
                'is_null' => is_null($normalized),
            ]);
            return response()->json([
                'verified' => false,
                'message' => 'Stored face encoding is not available for verification.',
            ], 422);
        }

        $encodingRelativePath = 'temp_face_verify/'.uniqid('face_encoding_', true).'.json';
        Storage::disk('local')->put($encodingRelativePath, json_encode($normalized));
        $tempFullPath = Storage::disk('local')->path($tempPath);
        $encodingFullPath = Storage::disk('local')->path($encodingRelativePath);

        try {
            \Log::info('Customer face verification - calling verify service', [
                'tempFullPath' => $tempFullPath,
                'encodingFullPath' => $encodingFullPath,
                'file_exists_temp' => file_exists($tempFullPath),
                'file_exists_encoding' => file_exists($encodingFullPath),
            ]);
            $result = $verificationService->verifyFace($tempFullPath, $encodingFullPath);
            \Log::info('Customer face verification - result', $result);
        } catch (\RuntimeException $exception) {
            Storage::disk('local')->delete($tempPath);
            Storage::disk('local')->delete($encodingRelativePath);

            \Log::error('Customer face verification - error', [
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'verified' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        Storage::disk('local')->delete($tempPath);
        Storage::disk('local')->delete($encodingRelativePath);

        // Require minimum confidence of 50% to prevent false positives
        $confidence = $result['confidence'] ?? ($result['score'] * 100 ?? 0);
        
        if (! isset($result['verified']) || ! $result['verified'] || $confidence < 50) {
            return response()->json([
                'verified' => false,
                'message' => $confidence < 50 
                    ? 'Face does not match the registered account. Confidence too low.'
                    : ($result['message'] ?? 'Face not recognized.'),
                'score' => $result['score'] ?? null,
                'confidence' => $confidence,
            ], 422);
        }

        Cache::forget('mobile_login:'.$request->input('pending_token'));
        $token = $user->createToken('mobile-app-token')->plainTextToken;

        return response()->json([
            'verified' => true,
            'user_id' => $user->id,
            'message' => 'Face matched.',
            'data' => [
                'user' => $user->only(['id', 'name', 'email', 'role', 'status']),
                'token' => $token,
            ],
            'redirect_url' => RouteServiceProvider::homeForRole($user->role),
        ]);
    }
}
