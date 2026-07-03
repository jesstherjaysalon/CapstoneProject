<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CustomerProfileApiController extends Controller
{
    /**
     * Complete customer profile via API.
     */
    public function completeProfile(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'Customer') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'address' => 'required|string|max:255',
            ]);

            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                $validated
            );

            return response()->json([
                'success' => true,
                'message' => 'Profile saved successfully.',
                'data' => [
                    'profile' => $user->profile,
                ],
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save profile.',
            ], 500);
        }
    }

    /**
     * Register customer face via API.
     */
    public function registerFace(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'Customer') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        if (!$user->profile) {
            return response()->json([
                'success' => false,
                'message' => 'Please complete your profile first.',
            ], 422);
        }

        try {
            $validated = $request->validate([
                'face_data' => 'required|string',
            ]);

            $user->profile->faceData()->updateOrCreate(
                ['profile_id' => $user->profile->id],
                [
                    'face_data' => $validated['face_data'],
                    'registered_date' => now(),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Face registration completed successfully.',
                'data' => [
                    'face_data' => $user->profile->faceData,
                ],
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to register face.',
            ], 500);
        }
    }
}
