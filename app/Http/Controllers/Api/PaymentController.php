<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ManualPayment;
use App\Models\Payment;
use App\Models\Booking;
use Illuminate\Support\Facades\Auth;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        // Get all bookings for the user
        $bookingIds = Booking::where('profile_id', $profile->id)->pluck('id');

        // Get all online payments for these bookings with booking details
        $onlinePayments = Payment::with(['booking'])
            ->whereIn('booking_id', $bookingIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($payment) {
                $payment->payment_type = 'online';
                return $payment;
            });

        // Get all manual payments for these bookings with booking details
        $manualPayments = ManualPayment::with(['booking'])
            ->whereIn('booking_id', $bookingIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($payment) {
                $payment->payment_type = 'manual';
                $payment->payment_method = 'manual';
                $payment->amount_type = 'full';
                $payment->status = 'paid';
                return $payment;
            });

        // Merge and sort by created_at
        $allPayments = $onlinePayments->concat($manualPayments)
            ->sortByDesc('created_at')
            ->values();

        return response()->json(['success' => true, 'data' => $allPayments]);
    }

    public function update(Request $request, Payment $payment)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $payment->update([
            'amount' => $request->input('amount'),
        ]);

        return response()->json(['success' => true, 'message' => 'Payment updated successfully']);
    }
}
