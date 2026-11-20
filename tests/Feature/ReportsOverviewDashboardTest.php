<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingService;
use App\Models\Category;
use App\Models\Profile;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsOverviewDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_returns_booking_charts_and_table_data(): void
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
        $booking = Booking::create([
            'profile_id' => $profile->id,
            'date' => Carbon::today()->toDateString(),
            'status' => 'accepted',
        ]);
        BookingService::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->getJson('/admin/reports/overview')->assertOk();

        $response->assertJsonPath('booking_trend.6.bookings', 1)
            ->assertJsonPath('booking_status_distribution.0.status', 'accepted')
            ->assertJsonPath('booking_status_distribution.0.total', 1)
            ->assertJsonPath('recent_bookings.0.customer_name', 'Test Customer')
            ->assertJsonPath('top_services.0.name', 'Oil Change')
            ->assertJsonPath('top_services.0.bookings', 1);
    }
}
