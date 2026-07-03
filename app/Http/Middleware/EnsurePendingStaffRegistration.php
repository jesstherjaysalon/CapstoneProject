<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePendingStaffRegistration
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->route('user');

        if (! $user instanceof User || $user->role !== 'Staff' || $user->status !== User::STATUS_PENDING) {
            abort(403, 'This staff registration link is no longer valid.');
        }

        return $next($request);
    }
}
