<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    public function index()
    {
        $schedule = Schedule::first() ?? new Schedule();

        return Inertia::render('Admin/ScheduleManagement', [
            'schedule' => $schedule,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'operating_days' => ['required', 'array', 'min:1'],
            'operating_days.*' => ['string', 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'],
            'business_hours_start' => ['required', 'regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/'],
            'business_hours_end' => ['required', 'regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/'],
            'max_bookings_per_day' => ['required', 'integer', 'min:1'],
        ]);

        Schedule::create($data);

        return redirect()->back()->with('success', 'Schedule created successfully.');
    }

    public function update(Request $request, $id)
    {
        $schedule = Schedule::findOrFail($id);

        $data = $request->validate([
            'operating_days' => ['required', 'array', 'min:1'],
            'operating_days.*' => ['string', 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'],
            'business_hours_start' => ['required', 'regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/'],
            'business_hours_end' => ['required', 'regex:/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/'],
            'max_bookings_per_day' => ['required', 'integer', 'min:1'],
        ]);

        $schedule->update($data);

        return redirect()->back()->with('success', 'Schedule updated successfully.');
    }

    public function destroy($id)
    {
        Schedule::findOrFail($id)->delete();

        return redirect()->back()->with('success', 'Schedule deleted successfully.');
    }
}
