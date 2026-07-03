<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Mail\CustomerInvitation;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class RegisterController extends Controller
{
    /**
     * Handle API registration request and return JSON response.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:'.User::class,
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
                'password_confirmation' => 'required',
                'role' => 'required|string|in:Admin,Customer,Staff',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
                'status' => User::STATUS_ACTIVE,
            ]);

            event(new Registered($user));

            // Send invitation email for customers to complete profile and face registration
            if ($validated['role'] === 'Customer') {
                try {
                    $completionUrl = URL::temporarySignedRoute(
                        'customer.profile.complete',
                        now()->addDay(),
                        ['user' => $user->id]
                    );

                    Mail::to($user->email)->send(new CustomerInvitation($user, $completionUrl));
                } catch (\Exception $mailError) {
                    // Log the mail error but don't fail the registration
                    \Log::error('Failed to send customer invitation email: ' . $mailError->getMessage());
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Registration completed successfully. Please check your email to complete your profile.',
                'data' => [
                    'user' => $user->only(['id', 'name', 'email', 'role', 'status']),
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed. Please try again.',
            ], 500);
        }
    }
}
