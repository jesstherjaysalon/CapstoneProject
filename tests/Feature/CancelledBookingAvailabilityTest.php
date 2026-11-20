<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingService;
use App\Models\Category;
use App\Models\Schedule;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CancelledBookingAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancelled_booking_releases_its_date_and_time_slot(): void
    {
        $date = Carbon::parse('2026-11-23');
        Schedule::create([
            'operating_days' => [$date->format('l')],
            'business_hours_start' => '09:00',
            'business_hours_end' => '10:00',
            'max_bookings_per_day' => 1,
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
            'date' => $date->toDateString(),
            'status' => 'cancelled',
        ]);
        BookingService::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'status' => 'pending',
            'scheduled_time' => '09:00:00',
        ]);

        $this->getJson('/api/schedules/slots?date=2026-11-23')
            ->assertOk()
            ->assertJsonPath('data.0.available', true);

        $booking->update(['status' => 'accepted']);

        $this->getJson('/api/schedules/slots?date=2026-11-23')
            ->assertOk()
            ->assertJsonPath('data.0.available', false);
    }
}
