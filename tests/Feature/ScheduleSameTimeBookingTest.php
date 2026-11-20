<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingService;
use App\Models\Category;
use App\Models\Schedule;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleSameTimeBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_booking_does_not_block_a_time_slot_while_daily_capacity_remains(): void
    {
        Schedule::create([
            'operating_days' => ['Monday'],
            'business_hours_start' => '09:00',
            'business_hours_end' => '10:00',
            'max_bookings_per_day' => 3,
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
            'date' => '2026-11-23',
            'status' => 'accepted',
        ]);
        BookingService::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'status' => 'pending',
            'scheduled_time' => '09:00:00',
        ]);

        $this->getJson('/api/schedules/slots?date=2026-11-23')
            ->assertOk()
            ->assertJsonPath('data.0.time', '09:00:00')
            ->assertJsonPath('data.0.available', true);
    }
}
