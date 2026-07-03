<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateStaffProfileRequest;
use App\Http\Requests\RegisterFaceRequest;
use App\Models\User;
use App\Services\FaceRecognitionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StaffRegistrationController extends Controller
{
    public function createProfile(User $user): Response
    {
        $storeUrl = URL::temporarySignedRoute(
            'staff.profile.store',
            now()->addHours(24),
            ['user' => $user->id]
        );

        return Inertia::render('Staff/CreateProfile', [
            'staff' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
            ],
            'storeUrl' => $storeUrl,
        ]);
    }

    public function storeProfile(CreateStaffProfileRequest $request, User $user): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'Invalid or expired signature.');
        }

        $user->profile()->create($request->validated());

        $faceUrl = URL::temporarySignedRoute(
            'staff.face.register',
            now()->addHours(24),
            ['user' => $user->id]
        );

        return redirect($faceUrl);
    }

    public function showFaceRegistration(User $user): Response
    {
        $storeUrl = URL::temporarySignedRoute(
            'staff.face.store',
            now()->addHours(24),
            ['user' => $user->id]
        );

        $backUrl = URL::temporarySignedRoute(
            'staff.profile.create',
            now()->addHours(24),
            ['user' => $user->id]
        );

        return Inertia::render('Staff/RegisterFace', [
            'staff' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
            ],
            'storeUrl' => $storeUrl,
            'backUrl' => $backUrl,
        ]);
    }

    public function storeFaceRegistration(RegisterFaceRequest $request, User $user, FaceRecognitionService $faceRecognitionService): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'Invalid or expired signature.');
        }

        $profile = $user->profile;

        if (! $profile) {
            return back()->withErrors(['face_image' => 'Please complete your profile before face registration.']);
        }

        $file = $request->file('face_image');

        if (! $file || ! $file->isValid()) {
            return back()->withErrors([
                'face_image' => 'Unable to process captured image. Please try again.',
            ]);
        }

        $tempName = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $tempPath = Storage::disk('local')->putFileAs('temp_faces', $file, $tempName);

        if (! $tempPath) {
            return back()->withErrors([
                'face_image' => 'Unable to save captured image. Please try again.',
            ]);
        }

        $tempFullPath = Storage::disk('local')->path($tempPath);

        try {
            $result = $faceRecognitionService->encodeFromPath($tempFullPath);
            $encoding = $result['encoding'] ?? [];
        } catch (\RuntimeException $exception) {
            Storage::disk('local')->delete($tempPath);

            return back()->withErrors([
                'face_image' => $exception->getMessage(),
            ]);
        }

        $finalName = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $finalPath = 'faces/'.$finalName;
        
        // Copy the temp file to public storage
        $tempContent = Storage::disk('local')->get($tempPath);
        Storage::disk('public')->put($finalPath, $tempContent);

        $profile->faceData()->create([
            'face_image_path' => $finalPath,
            // store the raw array and let Eloquent casting handle JSON encoding
            'face_encoding' => $encoding,
            'registered_date' => now(),
        ]);

        Storage::disk('local')->delete($tempPath);

        $user->update(['status' => User::STATUS_ACTIVE]);
        Auth::login($user);

        return redirect()->route('staff.dashboard')->with('success', 'Face registration complete. Your account is now active.');
    }
}
