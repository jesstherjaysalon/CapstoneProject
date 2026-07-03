<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStaffRequest;
use App\Models\User;
use App\Services\StaffInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    /**
     * Display the staff management page.
     */
    public function index(): Response
    {
        $staff = User::with('profile.faceData')
            ->where('role', 'Staff')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status', 'created_at'])
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                    'created_at' => $user->created_at,
                    'profile' => $user->profile ? [
                        'first_name' => $user->profile->first_name,
                        'last_name' => $user->profile->last_name,
                        'phone' => $user->profile->phone,
                        'address' => $user->profile->address,
                    ] : null,
                    'face_registered' => $user->profile && $user->profile->faceData ? true : false,
                    'face_image_path' => $user->profile && $user->profile->faceData
                        ? Storage::disk('public')->url($user->profile->faceData->face_image_path)
                        : null,
                ];
            });

        return Inertia::render('Staff/Index', [
            'staff' => $staff,
        ]);
    }

    /**
     * Store a new staff account.
     */
    public function store(StoreStaffRequest $request, StaffInvitationService $invitationService): RedirectResponse
    {
        $staff = User::create(array_merge($request->validated(), [
            'role' => 'Staff',
            'status' => User::STATUS_PENDING,
        ]));

        $invitationService->sendInvitation($staff);

        return redirect()->route('staff.index')->with('success', 'Staff account created successfully. An email invitation has been sent to the staff member.');
    }
}
