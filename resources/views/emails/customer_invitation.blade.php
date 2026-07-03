<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Customer Profile</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, sans-serif; background:#f5f7fb; color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 16px 32px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="padding:32px; text-align:center; background:#111827; color:#ffffff;">
                            <h1 style="margin:0; font-size:24px;">Car Services</h1>
                            <p style="margin:8px 0 0; font-size:14px; color:#d1d5db;">Complete your profile</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px; color:#111827;">
                            <p style="margin:0 0 16px; font-size:16px;">Hello {{ $customer->name }},</p>
                            <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">
                                Thank you for registering with Car Services! To complete your account setup and unlock full access to our services, 
                                please complete your profile and register your face for secure authentication.
                            </p>
                            <p style="margin:0 0 24px; font-size:16px; line-height:1.6;">
                                Click the button below to begin the profile completion process. This link expires in 24 hours.
                            </p>
                            <p style="text-align:center; margin:0 0 32px;">
                                <a href="{{ $completionUrl }}" style="display:inline-block; padding:14px 24px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">
                                    Complete Your Profile
                                </a>
                            </p>
                            <p style="margin:0 0 16px; font-size:14px; color:#6b7280;">
                                If the button does not work, copy and paste the following link into your browser:
                            </p>
                            <p style="word-break:break-all; font-size:14px; color:#2563eb;">{{ $completionUrl }}</p>
                            <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;">
                            <p style="margin:0 0 8px; font-size:14px; color:#6b7280; font-weight:600;">What happens next?</p>
                            <ul style="margin:8px 0 16px; padding-left:20px; color:#6b7280; font-size:14px; line-height:1.8;">
                                <li>Complete your personal information</li>
                                <li>Register your face for secure authentication</li>
                                <li>Start using all Car Services features</li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 32px 32px; font-size:14px; color:#6b7280; background:#f9fafb;">
                            <p style="margin:0;">If you did not create this account, please ignore this email.</p>
                            <p style="margin:8px 0 0;">Thank you,<br>Car Services Team</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
