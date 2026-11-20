<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingService;
use App\Models\Category;
use App\Models\Payment;
use App\Models\Profile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CancelledBookingFinancialReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_financial_report_excludes_cancelled_service_sales_and_records_only_its_cancellation_fee(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'status' => User::STATUS_ACTIVE,
        ]);
        $customer = User::factory()->create([
            'role' => 'Customer',
            'status' => User::STATUS_ACTIVE,
        ]);
        $profile = Profile::create([
            'user_id' => $customer->id,
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'phone' => '09123456789',
            'address' => 'Test address',
        ]);
        $category = Category::create([
            'name' => 'Maintenance',
            'description' => 'Car maintenance services',
        ]);
        $service = Service::create([
            'category_id' => $category->id,
            'name' => 'Oil Change',
            'description' => 'Oil change service',
            'price' => 100,
        ]);

        $cancelledBooking = Booking::create([
            'profile_id' => $profile->id,
            'date' => '2026-11-20',
            'status' => 'cancelled',
            'cancellation_paid_amount' => 150,
            'cancellation_fee' => 50,
            'refund_amount' => 100,
            'cancelled_at' => now(),
        ]);
        BookingService::create([
            'booking_id' => $cancelledBooking->id,
            'service_id' => $service->id,
            'status' => 'pending',
        ]);
        Payment::create([
            'booking_id' => $cancelledBooking->id,
            'payment_method' => 'gcash',
            'amount' => 150,
            'amount_type' => 'full',
            'status' => 'paid',
        ]);

        $completedBooking = Booking::create([
            'profile_id' => $profile->id,
            'date' => '2026-11-20',
            'status' => 'completed',
        ]);
        BookingService::create([
            'booking_id' => $completedBooking->id,
            'service_id' => $service->id,
            'status' => 'completed',
        ]);
        Payment::create([
            'booking_id' => $completedBooking->id,
            'payment_method' => 'gcash',
            'amount' => 100,
            'amount_type' => 'full',
            'status' => 'paid',
        ]);

        $response = $this->actingAs($admin)->getJson('/admin/reports/financial')->assertOk();
        $report = $response->json();
        $paymentMethods = collect($report['revenue_by_payment_method'])->keyBy('payment_method');

        $this->assertEquals(150, $report['total_daily_revenue']);
        $this->assertEquals(100, $report['total_revenue_by_service']);
        $this->assertEquals(0, $report['total_product_sales']);
        $this->assertEquals(50, $report['total_cancellation_fees']);
        $this->assertEquals(100, $paymentMethods['gcash']['total']);
        $this->assertEquals(50, $paymentMethods['cancellation fee']['total']);

        $overview = $this->getJson('/admin/reports/overview')->assertOk()->json();
        $this->assertEquals(1, $overview['total_bookings']);
        $this->assertEquals(150, $overview['total_revenue']);
        $this->assertEquals(50, $overview['total_cancellation_fees']);

        $this->get('/dashboard')->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('bookingStats.total', 1)
            ->where('paymentStats.total_revenue', 150)
            ->where('paymentStats.total_cancellation_fees', 50)
            ->where('monthlyRevenue.0.total', 150));
    }
}
