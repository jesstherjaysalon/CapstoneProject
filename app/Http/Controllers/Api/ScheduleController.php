<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Schedule;
use App\Models\Booking;
use App\Models\BookingService;
use Carbon\Carbon;

class ScheduleController extends Controller
{
    // Return schedule(s)
    public function index()
    {
        $schedules = Schedule::all();
        return response()->json([ 'success' => true, 'data' => $schedules ]);
    }

    // Generate available slots for a given date (query param `date=YYYY-MM-DD`)
    public function slots(Request $request)
    {
        $dateParam = $request->query('date');
        $date = $dateParam ? Carbon::createFromFormat('Y-m-d', $dateParam) : Carbon::today();

        // for now use the first schedule entry
        $schedule = Schedule::first();
        if (! $schedule) {
            return response()->json([ 'success' => false, 'message' => 'No schedule configured' ], 404);
        }

        $operating = $schedule->operating_days ?? [];
        $weekday = $date->format('l'); // e.g., Monday

        // Accept operating_days as array of names or numeric indices
        $isOpen = true;
        if (is_array($operating) && count($operating) > 0) {
            $isOpen = in_array($weekday, $operating) || in_array((string)$date->dayOfWeek, $operating);
        }

        if (! $isOpen) {
            return response()->json([ 'success' => true, 'data' => [], 'schedule' => $schedule ]);
        }

        $start = $this->parseScheduleTime($schedule->business_hours_start, '09:00');
        $end = $this->parseScheduleTime($schedule->business_hours_end, '17:00');

        if (! $start || ! $end) {
            return response()->json([ 'success' => false, 'message' => 'Invalid schedule hours' ], 500);
        }

        // normalize to the requested date
        $start->year = $date->year; $start->month = $date->month; $start->day = $date->day;
        $end->year = $date->year; $end->month = $date->month; $end->day = $date->day;

        $slots = [];
        $cursor = $start->copy();
        while ($cursor->lt($end)) {
            $timeStr = $cursor->format('H:i:s');
            $slots[] = [
                'time' => $timeStr,
                'label' => $cursor->format('H:i'),
            ];
            $cursor->addMinutes(30);
        }

        // count bookings for that date
        $bookingCount = Booking::whereDate('date', $date->toDateString())->count();
        $maxPerDay = $schedule->max_bookings_per_day ?? null;

        // if max per day set and reached, mark all slots unavailable
        $available = [];
        foreach ($slots as $s) {
            $isAvailable = true;
            if ($maxPerDay !== null && $bookingCount >= $maxPerDay) {
                $isAvailable = false;
            } else {
                // optional: check bookings at the exact time
                $slotBookings = BookingService::where('scheduled_time', $s['time'])
                    ->whereHas('booking', function($q) use ($date) {
                        $q->whereDate('date', $date->toDateString());
                    })->count();
                // assume unlimited per-slot unless you set per-slot limit; keep available if slotBookings is 0
                if ($slotBookings > 0) $isAvailable = false;
            }
            $available[] = array_merge($s, ['available' => $isAvailable]);
        }

        return response()->json([ 'success' => true, 'data' => $available, 'schedule' => $schedule ]);
    }

    protected function parseScheduleTime(?string $value, string $fallback)
    {
        $value = $value ?: $fallback;
        $formats = ['H:i:s', 'H:i'];
        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $value);
            } catch (\Exception $e) {
                continue;
            }
        }

        return null;
    }
}
