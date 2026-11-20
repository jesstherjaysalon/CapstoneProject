<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\ManualPayment;
use App\Models\Payment;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingCancellationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_cancels_booking_and_gets_net_refund_without_changing_payment_records(): void
    {
        [$user, $booking] = $this->createCustomerBooking('accepted');
        Payment::create([
            'booking_id' => $booking->id,
            'payment_method' => 'gcash',
            'amount' => 120,
            'amount_type' => 'full',
            'status' => 'paid',
        ]);
        ManualPayment::create([
            'booking_id' => $booking->id,
            'amount' => 30,
            'receipt_number' => 'MANUAL-BOOKING-1',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancellation_paid_amount', '150.00')
            ->assertJsonPath('data.cancellation_fee', '50.00')
            ->assertJsonPath('data.refund_amount', '100.00');

        $this->assertSame('cancelled', $booking->fresh()->status);
        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'amount' => '120.00',
            'status' => 'paid',
        ]);
    }

    public function test_cancellation_fee_is_capped_at_the_amount_paid(): void
    {
        [$user, $booking] = $this->createCustomerBooking('pending');
        Payment::create([
            'booking_id' => $booking->id,
            'payment_method' => 'maya',
            'amount' => 30,
            'amount_type' => 'half',
            'status' => 'paid',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.cancellation_paid_amount', '30.00')
            ->assertJsonPath('data.cancellation_fee', '30.00')
            ->assertJsonPath('data.refund_amount', '0.00');
    }

    public function test_pending_payment_does_not_block_cancellation_and_assigned_bookings_remain_non_cancellable(): void
    {
        [$user, $booking] = $this->createCustomerBooking('pending');
        Payment::create([
            'booking_id' => $booking->id,
            'payment_method' => 'gcash',
            'amount' => 100,
            'amount_type' => 'full',
            'status' => 'pending',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.payment_pending', true)
            ->assertJsonPath('data.cancellation_paid_amount', '0.00')
            ->assertJsonPath('data.refund_amount', '0.00');

        $this->assertSame('cancelled', $booking->fresh()->status);

        [$assignedUser, $assignedBooking] = $this->createCustomerBooking('assigned');
        $this->actingAs($assignedUser, 'sanctum');
        $this->postJson("/api/bookings/{$assignedBooking->id}/cancel")->assertStatus(409);
        $this->assertSame('assigned', $assignedBooking->fresh()->status);
    }

    private function createCustomerBooking(string $status): array
    {
        $user = User::factory()->create([
            'role' => 'Customer',
            'status' => User::STATUS_ACTIVE,
        ]);
        $profile = Profile::create([
            'user_id' => $user->id,
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'phone' => '09123456789',
            'address' => 'Test address',
        ]);
        $booking = Booking::create([
            'profile_id' => $profile->id,
            'date' => '2026-11-25',
            'status' => $status,
        ]);

        return [$user, $booking];
    }
}
