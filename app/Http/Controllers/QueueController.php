<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use App\Models\Profile;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QueueController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 20);
        $page = $request->input('page', 1);
        $dateFilter = $request->input('date', today()->format('Y-m-d'));
        $statusFilter = $request->input('status', '');

        $jobOrdersQuery = JobOrder::with(['bookingService.service', 'bookingService.booking.profile', 'bookingService.booking.vehicle'])
            ->whereDate('queue_date', $dateFilter)
            ->whereNotNull('queue_number')
            ->orderBy('queue_priority', 'desc')
            ->orderBy('queue_number', 'asc');

        if ($statusFilter) {
            $jobOrdersQuery->where('status', $statusFilter);
        }

        $jobOrders = $jobOrdersQuery->paginate($perPage, ['*'], 'page', $page);

        $mappedJobOrders = $jobOrders->getCollection()->map(function ($jobOrder) {
            return [
                'id' => $jobOrder->id,
                'queue_number' => $jobOrder->queue_number ? str_pad($jobOrder->queue_number, 4, '0', STR_PAD_LEFT) : null,
                'queue_priority' => $jobOrder->queue_priority,
                'queue_date' => $jobOrder->queue_date ? $jobOrder->queue_date->format('Y-m-d') : null,
                'status' => $jobOrder->status,
                'start_time' => $jobOrder->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $jobOrder->end_time?->format('Y-m-d H:i:s'),
                'service' => [
                    'id' => $jobOrder->bookingService->id,
                    'service_name' => $jobOrder->bookingService->service?->name ?? 'Unknown Service',
                    'scheduled_time' => $jobOrder->bookingService->scheduled_time,
                ],
                'customer' => [
                    'name' => $jobOrder->bookingService->booking->profile
                        ? trim(sprintf('%s %s', $jobOrder->bookingService->booking->profile->first_name ?? '', $jobOrder->bookingService->booking->profile->last_name ?? ''))
                        : 'Unknown',
                    'phone' => $jobOrder->bookingService->booking->profile?->phone,
                ],
                'vehicle' => $jobOrder->bookingService->booking->vehicle ? [
                    'brand' => $jobOrder->bookingService->booking->vehicle->brand,
                    'model' => $jobOrder->bookingService->booking->vehicle->model,
                    'plate_number' => $jobOrder->bookingService->booking->vehicle->plate_number,
                ] : null,
                'staff' => $jobOrder->staff->map(function ($profile) {
                    return [
                        'id' => $profile->id,
                        'name' => $profile->user->name,
                    ];
                })->toArray(),
                'staff_ids' => $jobOrder->profile_id,
                'booking_id' => $jobOrder->bookingService->booking->id,
            ];
        });

        $jobOrders->setCollection($mappedJobOrders);

        // Calculate queue summary
        $allJobOrders = JobOrder::whereDate('queue_date', $dateFilter)
            ->whereNotNull('queue_number')
            ->get();

        $queueSummary = [
            'total' => $allJobOrders->count(),
            'pending' => $allJobOrders->where('status', 'pending')->count(),
            'in_progress' => $allJobOrders->where('status', 'in_progress')->count(),
            'completed' => $allJobOrders->where('status', 'completed')->count(),
        ];

        $staff = Profile::with('user')
            ->whereHas('user', function ($query) {
                $query->where('role', 'Staff');
            })
            ->get()
            ->map(function ($profile) {
                return [
                    'id' => $profile->id,
                    'name' => $profile->user->name,
                ];
            });

        return Inertia::render('Admin/Queue', [
            'jobOrders' => $jobOrders->items(),
            'pagination' => [
                'current_page' => $jobOrders->currentPage(),
                'last_page' => $jobOrders->lastPage(),
                'per_page' => $jobOrders->perPage(),
                'total' => $jobOrders->total(),
                'from' => $jobOrders->firstItem(),
                'to' => $jobOrders->lastItem(),
            ],
            'queueSummary' => $queueSummary,
            'filters' => [
                'date' => $dateFilter,
                'status' => $statusFilter,
            ],
            'staff' => $staff,
        ]);
    }

    public function updateStatus(Request $request, JobOrder $jobOrder)
    {
        $request->validate([
            'status' => ['required', 'in:pending,in_progress,completed'],
        ]);

        $jobOrder->update([
            'status' => $request->input('status'),
        ]);

        // Update start_time and end_time based on status
        if ($request->input('status') === 'in_progress' && !$jobOrder->start_time) {
            $jobOrder->update(['start_time' => now()]);
        }

        if ($request->input('status') === 'completed' && !$jobOrder->end_time) {
            $jobOrder->update(['end_time' => now()]);
        }

        // Update booking service status
        $bookingService = $jobOrder->bookingService;
        if ($bookingService) {
            $bookingService->update(['status' => $request->input('status')]);

            // Update booking status if all services are completed
            $booking = $bookingService->booking;
            if ($booking && $request->input('status') === 'completed') {
                $allServicesCompleted = $booking->services()->where('status', '!=', 'completed')->count() === 0;
                if ($allServicesCompleted) {
                    $booking->update(['status' => 'completed']);
                }
            }
        }

        return redirect()->back()->with('success', 'Queue status updated successfully.');
    }

    public function updatePriority(Request $request, JobOrder $jobOrder)
    {
        $request->validate([
            'queue_priority' => ['required', 'integer', 'min:0', 'max:10'],
        ]);

        $jobOrder->update([
            'queue_priority' => $request->input('queue_priority'),
        ]);

        return redirect()->back()->with('success', 'Queue priority updated successfully.');
    }

    public function updateStaff(Request $request, JobOrder $jobOrder)
    {
        $request->validate([
            'staff_ids' => ['required', 'array'],
            'staff_ids.*' => ['exists:profiles,id'],
        ]);

        $jobOrder->update([
            'profile_id' => $request->input('staff_ids'),
        ]);

        return redirect()->back()->with('success', 'Staff updated successfully.');
    }
}
