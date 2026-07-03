<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffProfileInvitationMail extends Mailable
{
    use SerializesModels;

    public User $staff;
    public string $invitationUrl;

    public function __construct(User $staff, string $invitationUrl)
    {
        $this->staff = $staff;
        $this->invitationUrl = $invitationUrl;
    }

    public function build()
    {
        return $this->subject('Complete your Car Services staff registration')
            ->view('emails.staff_invitation')
            ->with([
                'staff' => $this->staff,
                'invitationUrl' => $this->invitationUrl,
            ]);
    }
}
