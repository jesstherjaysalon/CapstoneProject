<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterFaceRequest;
use App\Models\User;
use App\Services\FaceRecognitionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CustomerProfileController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Show the customer profile completion form.
     */
    public function showCompletion(Request $request, User $user)
    {
        // Verify the request is signed
        if (!$request->hasValidSignature()) {
            abort(403, 'Invalid or expired link.');
        }

        // Prevent completing profile if already done
        if ($user->profile && $user->role === 'Customer') {
            return Inertia::render('Customer/ProfileAlreadyComplete', [
                'user' => $user,
            ]);
        }

        return Inertia::render('Customer/CompleteProfile', [
            'user' => $user,
        ]);
    }

    /**
     * Store the customer profile data.
     */
    public function storeProfile(Request $request, User $user)
    {
        if (!$request->hasValidSignature()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired link.',
            ], 403);
        }

        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'address' => 'required|string|max:255',
            ]);

            // Create or update profile
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                $validated
            );

            $faceUrl = URL::temporarySignedRoute(
                'customer.face.register',
                now()->addHours(24),
                ['user' => $user->id]
            );

            return response()->json([
                'success' => true,
                'message' => 'Profile saved successfully. Please proceed to face registration.',
                'face_url' => $faceUrl,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save profile. Please try again.',
            ], 500);
        }
    }

    /**
     * Show the face registration form.
     */
    public function showFaceRegistration(Request $request, User $user)
    {
        if (!$request->hasValidSignature()) {
            abort(403, 'Invalid or expired link.');
        }

        if (!$user->profile || $user->role !== 'Customer') {
            abort(403, 'Please complete your profile first.');
        }

        $storeUrl = URL::temporarySignedRoute(
            'customer.face.store',
            now()->addHours(24),
            ['user' => $user->id]
        );

        $backUrl = URL::temporarySignedRoute(
            'customer.profile.complete',
            now()->addHours(24),
            ['user' => $user->id]
        );

        return Inertia::render('Customer/RegisterFace', [
            'user' => $user,
            'storeUrl' => $storeUrl,
            'backUrl' => $backUrl,
        ]);
    }

    /**
     * Store the customer face data.
     */
    public function storeFaceData(RegisterFaceRequest $request, User $user, FaceRecognitionService $faceRecognitionService)
    {
        if (!$request->hasValidSignature()) {
            abort(403, 'Invalid or expired signature.');
        }

        $profile = $user->profile;

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Please complete your profile first.',
            ], 422);
        }

        $file = $request->file('face_image');

        $tempName = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $tempPath = Storage::disk('local')->putFileAs('temp_faces', $file, $tempName);

        if (!$tempPath) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to save captured image. Please try again.',
            ], 500);
        }

        $tempFullPath = Storage::disk('local')->path($tempPath);

        try {
            $result = $faceRecognitionService->encodeFromPath($tempFullPath);
            $encoding = $result['encoding'] ?? [];
        } catch (\RuntimeException $exception) {
            Storage::disk('local')->delete($tempPath);

            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 500);
        }

        $finalName = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $finalPath = 'faces/'.$finalName;

        $tempContent = Storage::disk('local')->get($tempPath);
        Storage::disk('public')->put($finalPath, $tempContent);

        $profile->faceData()->updateOrCreate(
            ['profile_id' => $profile->id],
            [
                'face_image_path' => $finalPath,
                'face_encoding' => $encoding,
                'registered_date' => now(),
            ]
        );

        Storage::disk('local')->delete($tempPath);

        $user->update(['status' => User::STATUS_ACTIVE]);
        Auth::logout();

        return redirect()->route('login')->with('success', 'Please go back to the app and try logging in your created account');
    }
}
