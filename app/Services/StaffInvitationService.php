<?php

namespace App\Services;

use App\Mail\StaffProfileInvitationMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class StaffInvitationService
{
    public function sendInvitation(User $staff): void
    {
        $invitationUrl = URL::temporarySignedRoute(
            'staff.profile.create',
            now()->addHours(24),
            ['user' => $staff->id]
        );

        Mail::to($staff->email)
            ->send(new StaffProfileInvitationMail($staff, $invitationUrl));
    }
}
