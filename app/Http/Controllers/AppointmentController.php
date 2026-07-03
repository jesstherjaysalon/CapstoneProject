<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingService;
use App\Models\JobOrder;
use App\Models\ManualPayment;
use App\Models\Payment;
use App\Models\Profile;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AppointmentController extends Controller
{
    //Pagination
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $page = $request->input('page', 1);

        $bookingsQuery = Booking::with(['profile.user', 'services.service', 'payments', 'manualPayments', 'services.jobOrder.staff'])
            ->orderBy('date', 'desc');

        $bookings = $bookingsQuery->paginate($perPage, ['*'], 'page', $page);

        $mappedBookings = $bookings->getCollection()->map(function (Booking $booking) {
                // Calculate service cost
                $serviceCost = $booking->services->sum(function ($service) {
                    return $service->service?->price ?? 0;
                });

                // Calculate product cost (approved only)
                $bookingServiceIds = $booking->services->pluck('id');
                $jobOrderIds = JobOrder::whereIn('booking_service_id', $bookingServiceIds)->pluck('id');
                $productUsages = \App\Models\ServiceProductUsage::with('product')
                    ->whereIn('job_order_id', $jobOrderIds)
                    ->where('status', 'Approved')
                    ->whereHas('product', function ($query) {
                        $query->whereNotNull('price')->where('price', '>', 0);
                    })
                    ->get();

                $productCost = 0;
                $productBreakdown = [];
                foreach ($productUsages as $usage) {
                    $cost = $usage->product->price * $usage->quantity_used;
                    $productCost += $cost;
                    $productBreakdown[] = [
                        'product_name' => $usage->product->name,
                        'quantity' => $usage->quantity_used,
                        'unit_price' => $usage->product->price,
                        'total' => $cost,
                    ];
                }

                $totalCost = $serviceCost + $productCost;

                // Load payments fresh to ensure we get the data
                $payments = $booking->payments()->get();
                $totalPaid = $payments->where('status', 'paid')->sum('amount');

                // Include manual payments
                $manualPayments = $booking->manualPayments()->get();
                $totalManualPaid = $manualPayments->sum('amount');
                $totalPaid += $totalManualPaid;

                $balance = $totalCost - $totalPaid;
                $hasPayment = $payments->count() > 0 || $manualPayments->count() > 0;

                // Debug for specific bookings
                if (in_array($booking->id, [7, 8])) {
                    \Log::info("Booking {$booking->id}:");
                    \Log::info("  Payment count: " . $payments->count());
                    \Log::info("  Payments: " . json_encode($payments->toArray()));
                    \Log::info("  Total paid: " . $totalPaid);
                    \Log::info("  Balance: " . $balance);
                    \Log::info("  Has payment: " . ($hasPayment ? 'true' : 'false'));
                }

                return [
                    'id' => $booking->id,
                    'date' => optional($booking->date)->format('Y-m-d'),
                    'status' => $booking->status,
                    'rating' => $booking->rating,
                    'feedback' => $booking->feedback,
                    'customer' => [
                        'name' => $booking->profile
                            ? trim(sprintf('%s %s', $booking->profile->first_name ?? '', $booking->profile->last_name ?? ''))
                            : null,
                        'phone' => $booking->profile?->phone,
                        'email' => $booking->profile?->user?->email,
                        'address' => $booking->profile?->address,
                    ],
                    'services' => $booking->services->map(function (BookingService $service) {
                        return [
                            'id' => $service->id,
                            'service_name' => $service->service?->name ?? 'Unknown Service',
                            'status' => $service->status,
                            'scheduled_time' => $service->scheduled_time,
                            'image' => $service->image,
                            'rating' => $service->rating,
                            'price' => $service->service?->price ?? 0,
                            'job_order' => $service->jobOrder ? [
                                'id' => $service->jobOrder->id,
                                'staff_name' => $service->jobOrder->staff?->user?->name,
                                'staff_id' => $service->jobOrder->profile_id,
                                'start_time' => $service->jobOrder->start_time?->format('Y-m-d H:i:s'),
                                'end_time' => $service->jobOrder->end_time?->format('Y-m-d H:i:s'),
                                'status' => $service->jobOrder->status,
                            ] : null,
                        ];
                    })->toArray(),
                    'payment' => [
                        'has_payment' => $hasPayment,
                        'service_cost' => $serviceCost,
                        'product_cost' => $productCost,
                        'product_breakdown' => $productBreakdown,
                        'total_cost' => $totalCost,
                        'total_paid' => $totalPaid,
                        'balance' => $balance,
                        'payments' => $payments->map(function ($payment) {
                            return [
                                'id' => $payment->id,
                                'payment_method' => $payment->payment_method,
                                'amount' => (float) $payment->amount,
                                'amount_type' => $payment->amount_type,
                                'status' => $payment->status,
                            ];
                        })->toArray(),
                        'manual_payments' => $manualPayments->map(function ($manualPayment) {
                            return [
                                'id' => $manualPayment->id,
                                'amount' => (float) $manualPayment->amount,
                                'receipt_number' => $manualPayment->receipt_number,
                                'remarks' => $manualPayment->remarks,
                                'created_at' => $manualPayment->created_at?->format('Y-m-d H:i:s'),
                            ];
                        })->toArray(),
                    ],
                ];
            });

        $bookings->setCollection($mappedBookings);

        // Calculate summary for all bookings (not just current page)
        $allBookings = Booking::with(['services'])->get();
        $bookingSummary = [
            'total' => $allBookings->count(),
            'pending' => $allBookings->where('status', 'pending')->count(),
            'accepted' => $allBookings->where('status', 'accepted')->count(),
            'rejected' => $allBookings->where('status', 'rejected')->count(),
            'completed' => $allBookings->where('status', 'completed')->count(),
            'assigned' => $allBookings->where('status', 'assigned')->count(),
            'ongoing' => 0,
        ];

        foreach ($allBookings as $booking) {
            foreach ($booking->services as $service) {
                if ($service->status === 'ongoing') {
                    $bookingSummary['ongoing'] += 1;
                }
            }
        }

        $staff = Profile::with('user')
            ->whereHas('user', function ($query) {
                $query->where('role', 'Staff');
            })
            ->get()
            ->map(function ($profile) {
                return [
                    'id' => $profile->id,
                    'name' => $profile->user->name,
                    'email' => $profile->user->email,
                ];
            });

        return Inertia::render('Admin/Appointments', [
            'bookings' => $bookings->items(),
            'pagination' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
                'from' => $bookings->firstItem(),
                'to' => $bookings->lastItem(),
            ],
            'bookingSummary' => $bookingSummary,
            'staff' => $staff,
            'bookingStatuses' => ['pending', 'accepted', 'assigned', 'rejected', 'completed'],
            'serviceStatuses' => ['pending', 'ongoing', 'completed'],
        ]);
    }

    public function updateBookingStatus(Request $request, Booking $booking)
    {
        $request->validate([
            'status' => ['required', 'in:pending,accepted,assigned,rejected,completed'],
        ]);

        $booking->update([
            'status' => $request->input('status'),
        ]);

        return redirect()->back()->with('success', 'Booking status updated successfully.');
    }

    public function updateServiceStatus(Request $request, BookingService $bookingService)
    {
        $request->validate([
            'status' => ['required', 'in:pending,ongoing,completed'],
        ]);

        $bookingService->update([
            'status' => $request->input('status'),
        ]);

        if ($request->input('status') === 'completed') {
            $booking = $bookingService->booking;
            if ($booking && $booking->services()->where('status', '!=', 'completed')->count() === 0) {
                $booking->update(['status' => 'completed']);
            }
        }

        return redirect()->back()->with('success', 'Service status updated successfully.');
    }

    public function assignStaff(Request $request, BookingService $bookingService)
    {
        $request->validate([
            'staff_id' => ['required', 'exists:profiles,id'],
        ]);

        $jobOrder = JobOrder::updateOrCreate(
            ['booking_service_id' => $bookingService->id],
            [
                'profile_id' => $request->input('staff_id'),
                'status' => 'pending',
            ]
        );

        // Update booking status to 'assigned' if all services have staff assigned
        $booking = $bookingService->booking;
        if ($booking) {
            $allServicesAssigned = $booking->services()->whereHas('jobOrder')->count() === $booking->services()->count();
            if ($allServicesAssigned && $booking->status === 'accepted') {
                $booking->update(['status' => 'assigned']);
            }
        }

        return redirect()->back()->with('success', 'Staff assigned successfully.');
    }

    public function jobOrders()
    {
        $jobOrders = JobOrder::with(['bookingService.service', 'bookingService.booking.profile', 'staff.user'])
            ->orderBy('created_at', 'desc')
            ->get();

        $jobOrderIds = $jobOrders->pluck('id');

        $productUsages = \App\Models\ServiceProductUsage::with(['product.inventoryCategory'])
            ->whereIn('job_order_id', $jobOrderIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('job_order_id');

        $jobOrders = $jobOrders->map(function ($jobOrder) use ($productUsages) {
            $usages = $productUsages->get($jobOrder->id, collect())->map(function ($usage) {
                return [
                    'id' => $usage->id,
                    'product' => [
                        'id' => $usage->product->id,
                        'name' => $usage->product->name,
                        'unit' => $usage->product->unit,
                    ],
                    'quantity_used' => $usage->quantity_used,
                    'status' => $usage->status,
                    'is_returnable' => $usage->product->inventoryCategory?->is_asset ?? false,
                    'returned_at' => $usage->returned_at?->format('Y-m-d H:i:s'),
                    'created_at' => $usage->created_at?->format('Y-m-d H:i:s'),
                ];
            });

            return [
                'id' => $jobOrder->id,
                'service' => [
                    'id' => $jobOrder->bookingService->id,
                    'service_name' => $jobOrder->bookingService->service?->name ?? 'Unknown Service',
                ],
                'customer' => [
                    'name' => $jobOrder->bookingService->booking->profile
                        ? trim(sprintf('%s %s', $jobOrder->bookingService->booking->profile->first_name ?? '', $jobOrder->bookingService->booking->profile->last_name ?? ''))
                        : 'Unknown',
                ],
                'staff' => [
                    'id' => $jobOrder->staff->id,
                    'name' => $jobOrder->staff->user->name,
                ],
                'start_time' => $jobOrder->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $jobOrder->end_time?->format('Y-m-d H:i:s'),
                'status' => $jobOrder->status,
                'product_usages' => $usages,
            ];
        });

        $jobOrderSummary = [
            'total' => $jobOrders->count(),
            'pending' => $jobOrders->where('status', 'pending')->count(),
            'in_progress' => $jobOrders->where('status', 'in_progress')->count(),
            'completed' => $jobOrders->where('status', 'completed')->count(),
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
                    'email' => $profile->user->email,
                ];
            });

        return Inertia::render('Admin/JobOrders', [
            'jobOrders' => $jobOrders,
            'staff' => $staff,
            'jobOrderSummary' => $jobOrderSummary,
        ]);
    }

    public function updateJobOrderStatus(Request $request, JobOrder $jobOrder)
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

        return redirect()->back()->with('success', 'Job order status updated successfully.');
    }

    public function updateJobOrder(Request $request, JobOrder $jobOrder)
    {
        $request->validate([
            'profile_id' => ['nullable', 'exists:profiles,id'],
            'start_time' => ['nullable', 'date'],
            'end_time' => ['nullable', 'date', 'after:start_time'],
        ]);

        $jobOrder->update([
            'profile_id' => $request->input('profile_id'),
            'start_time' => $request->input('start_time'),
            'end_time' => $request->input('end_time'),
        ]);

        return redirect()->back()->with('success', 'Job order updated successfully.');
    }

    public function updatePayment(Request $request, Payment $payment)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $payment->update([
            'amount' => $request->input('amount'),
        ]);

        return response()->json(['success' => true, 'message' => 'Payment updated successfully']);
    }

    public function createManualPayment(Request $request)
    {
        $request->validate([
            'booking_id' => ['required', 'exists:bookings,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string'],
        ]);

        // Auto-generate receipt number in format: YYYY-XXXXXX-XXXXX
        $year = date('Y');
        $random1 = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        $random2 = str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT);
        $receiptNumber = "{$year}-{$random1}-{$random2}";

        // Ensure uniqueness
        while (ManualPayment::where('receipt_number', $receiptNumber)->exists()) {
            $random1 = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
            $random2 = str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT);
            $receiptNumber = "{$year}-{$random1}-{$random2}";
        }

        $manualPayment = ManualPayment::create([
            'booking_id' => $request->input('booking_id'),
            'amount' => $request->input('amount'),
            'receipt_number' => $receiptNumber,
            'remarks' => $request->input('remarks'),
        ]);

        // Update booking status from pending to accepted when payment is made
        $booking = Booking::find($request->input('booking_id'));
        if ($booking && $booking->status === 'pending') {
            $booking->update(['status' => 'accepted']);
        }

        return response()->json(['success' => true, 'message' => 'Manual payment created successfully', 'receipt_number' => $receiptNumber]);
    }
}
