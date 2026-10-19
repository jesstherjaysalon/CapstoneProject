<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use App\Models\Service;
use App\Models\BookingService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        // Get booking statistics with date filter
        $bookingQuery = Booking::query();
        if ($startDate) {
            $bookingQuery->where('date', '>=', $startDate);
        }
        if ($endDate) {
            $bookingQuery->where('date', '<=', $endDate);
        }
        $bookingStats = [
            'total' => $bookingQuery->count(),
            'pending' => (clone $bookingQuery)->where('status', 'pending')->count(),
            'accepted' => (clone $bookingQuery)->where('status', 'accepted')->count(),
            'rejected' => (clone $bookingQuery)->where('status', 'rejected')->count(),
            'completed' => (clone $bookingQuery)->where('status', 'completed')->count(),
        ];

        // Get payment statistics with date filter
        $paymentQuery = Payment::query();
        if ($startDate) {
            $paymentQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $paymentQuery->where('created_at', '<=', $endDate);
        }

        // Calculate total revenue including service revenue and product sales (same as Reports)
        $bookings = Booking::with(['services.service', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected');
        if ($startDate) {
            $bookings->whereDate('date', '>=', $startDate);
        }
        if ($endDate) {
            $bookings->whereDate('date', '<=', $endDate);
        }
        $bookings = $bookings->get();

        $totalServiceRevenue = 0;
        $totalProductSales = 0;

        foreach ($bookings as $booking) {
            $serviceRevenue = (float) $booking->services->sum(function ($service) {
                return (float) ($service->service?->price ?? 0);
            });

            $paidServiceIds = $booking->services->pluck('id')->filter()->all();

            $productRevenue = (float) \App\Models\ServiceProductUsage::with('product')
                ->whereIn('job_order_id', \App\Models\JobOrder::whereIn('booking_service_id', $paidServiceIds)->pluck('id'))
                ->where('status', 'Approved')
                ->whereHas('product', function ($query) {
                    $query->whereNotNull('price')->where('price', '>', 0);
                })
                ->get()
                ->sum(function ($usage) {
                    return ((float) ($usage->product->price ?? 0)) * (int) $usage->quantity_used;
                });

            $paidAmount = (float) $booking->payments()->where('status', 'paid')->sum('amount')
                + (float) $booking->manualPayments()->sum('amount');

            $actualPaidServiceRevenue = $paidAmount > 0 ? min($serviceRevenue, $paidAmount) : 0;
            $actualPaidProductRevenue = $paidAmount > 0 ? max(0, $paidAmount - $actualPaidServiceRevenue) : 0;

            if ($productRevenue > 0 && $actualPaidProductRevenue > 0) {
                $actualPaidProductRevenue = min($productRevenue, $actualPaidProductRevenue);
            }

            $totalPaidRevenue = $actualPaidServiceRevenue + $actualPaidProductRevenue;

            if ($totalPaidRevenue > 0) {
                $totalServiceRevenue += $actualPaidServiceRevenue;
                $totalProductSales += $actualPaidProductRevenue;
            }
        }

        $totalRevenue = $totalServiceRevenue + $totalProductSales;

        $paymentStats = [
            'total_revenue' => $totalRevenue,
            'pending_payments' => (clone $paymentQuery)->where('status', 'pending')->count(),
            'paid_payments' => (clone $paymentQuery)->where('status', 'paid')->count(),
            'failed_payments' => (clone $paymentQuery)->where('status', 'failed')->count(),
        ];

        // Get user statistics
        $userStats = [
            'total' => User::count(),
            'admins' => User::where('role', 'Admin')->count(),
            'customers' => User::where('role', 'Customer')->count(),
            'staff' => User::where('role', 'Staff')->count(),
        ];

        // Get recent bookings with relations and date filter
        $recentBookingsQuery = Booking::with(['profile.user', 'services.service']);
        if ($startDate) {
            $recentBookingsQuery->where('date', '>=', $startDate);
        }
        if ($endDate) {
            $recentBookingsQuery->where('date', '<=', $endDate);
        }
        $recentBookings = $recentBookingsQuery
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($booking) {
                $serviceNames = $booking->services->map(function ($bookingService) {
                    return $bookingService->service?->name ?? 'Unknown Service';
                })->implode(', ');
                
                return [
                    'id' => $booking->id,
                    'customer_first_name' => $booking->profile?->first_name ?? 'Unknown',
                    'customer_last_name' => $booking->profile?->last_name ?? '',
                    'date' => $booking->date?->format('M d, Y') ?? 'N/A',
                    'status' => $booking->status,
                    'rating' => $booking->rating,
                    'services' => $serviceNames,
                    'created_at' => $booking->created_at->format('M d, Y'),
                ];
            });

        // Get top services by average rating from booking_services with date filter
        $topServicesQuery = Service::select('services.id', 'services.name', 'services.price')
            ->selectRaw('COUNT(booking_services.id) as bookings_count')
            ->selectRaw('AVG(booking_services.rating) as avg_rating')
            ->leftJoin('booking_services', 'services.id', '=', 'booking_services.service_id')
            ->leftJoin('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->whereNotNull('booking_services.rating');
        if ($startDate) {
            $topServicesQuery->where('bookings.date', '>=', $startDate);
        }
        if ($endDate) {
            $topServicesQuery->where('bookings.date', '<=', $endDate);
        }
        $topServices = $topServicesQuery
            ->groupBy('services.id', 'services.name', 'services.price')
            ->orderBy('avg_rating', 'desc')
            ->take(5)
            ->get()
            ->map(function ($service) {
                return [
                    'name' => $service->name,
                    'price' => $service->price,
                    'bookings_count' => $service->bookings_count,
                    'avg_rating' => round($service->avg_rating, 1),
                    'revenue' => $service->bookings_count * $service->price,
                ];
            });

        // Get monthly revenue with date filter (same logic as Reports - service + product revenue)
        $monthlyBookingsQuery = Booking::with(['services.service', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected');
        if ($startDate) {
            $monthlyBookingsQuery->whereDate('date', '>=', $startDate);
        } else {
            $monthlyBookingsQuery->whereDate('date', '>=', now()->subMonths(6));
        }
        if ($endDate) {
            $monthlyBookingsQuery->whereDate('date', '<=', $endDate);
        }
        $monthlyBookings = $monthlyBookingsQuery->get();

        $monthlyRevenueMap = [];

        foreach ($monthlyBookings as $booking) {
            $serviceRevenue = (float) $booking->services->sum(function ($service) {
                return (float) ($service->service?->price ?? 0);
            });

            $paidServiceIds = $booking->services->pluck('id')->filter()->all();

            $productRevenue = (float) \App\Models\ServiceProductUsage::with('product')
                ->whereIn('job_order_id', \App\Models\JobOrder::whereIn('booking_service_id', $paidServiceIds)->pluck('id'))
                ->where('status', 'Approved')
                ->whereHas('product', function ($query) {
                    $query->whereNotNull('price')->where('price', '>', 0);
                })
                ->get()
                ->sum(function ($usage) {
                    return ((float) ($usage->product->price ?? 0)) * (int) $usage->quantity_used;
                });

            $paidAmount = (float) $booking->payments()->where('status', 'paid')->sum('amount')
                + (float) $booking->manualPayments()->sum('amount');

            $actualPaidServiceRevenue = $paidAmount > 0 ? min($serviceRevenue, $paidAmount) : 0;
            $actualPaidProductRevenue = $paidAmount > 0 ? max(0, $paidAmount - $actualPaidServiceRevenue) : 0;

            if ($productRevenue > 0 && $actualPaidProductRevenue > 0) {
                $actualPaidProductRevenue = min($productRevenue, $actualPaidProductRevenue);
            }

            $totalPaidRevenue = $actualPaidServiceRevenue + $actualPaidProductRevenue;

            if ($totalPaidRevenue > 0 && $booking->date) {
                $monthKey = $booking->date->format('Y-m');
                if (!isset($monthlyRevenueMap[$monthKey])) {
                    $monthlyRevenueMap[$monthKey] = 0;
                }
                $monthlyRevenueMap[$monthKey] += $totalPaidRevenue;
            }
        }

        $monthlyRevenue = collect($monthlyRevenueMap)
            ->map(function ($total, $month) {
                return [
                    'month' => $month,
                    'total' => (float) $total,
                ];
            })
            ->sortBy('month')
            ->values();

        // Get daily bookings for Gantt chart with date filter
        $dailyBookingsQuery = Booking::selectRaw('DATE(date) as booking_date, COUNT(*) as count, status');
        if ($startDate) {
            $dailyBookingsQuery->where('date', '>=', $startDate);
        } else {
            $dailyBookingsQuery->where('date', '>=', now()->subDays(30));
        }
        if ($endDate) {
            $dailyBookingsQuery->where('date', '<=', $endDate);
        }
        $dailyBookings = $dailyBookingsQuery
            ->groupBy('booking_date', 'status')
            ->orderBy('booking_date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->booking_date,
                    'count' => $item->count,
                    'status' => $item->status,
                ];
            });

        // Get top customers with date filter
        $topCustomersQuery = Booking::join('profiles', 'bookings.profile_id', '=', 'profiles.id');
        if ($startDate) {
            $topCustomersQuery->where('bookings.date', '>=', $startDate);
        }
        if ($endDate) {
            $topCustomersQuery->where('bookings.date', '<=', $endDate);
        }
        $topCustomers = $topCustomersQuery
            ->selectRaw('profiles.first_name, profiles.last_name, COUNT(*) as booking_count')
            ->groupBy('profiles.id', 'profiles.first_name', 'profiles.last_name')
            ->orderByDesc('booking_count')
            ->limit(10)
            ->get()
            ->map(function ($customer) {
                return [
                    'first_name' => $customer->first_name,
                    'last_name' => $customer->last_name,
                    'booking_count' => $customer->booking_count,
                ];
            });

        // Get current queue data for projection
        $today = now()->format('Y-m-d');
        $queueData = \App\Models\JobOrder::with(['bookingService.service', 'bookingService.booking.profile'])
            ->whereDate('queue_date', $today)
            ->whereNotNull('queue_number')
            ->orderBy('queue_priority', 'desc')
            ->orderBy('queue_number', 'asc')
            ->get()
            ->map(function ($jobOrder) {
                $staffIds = $jobOrder->profile_id ?? [];
                $staffNames = [];
                if (is_array($staffIds) && count($staffIds) > 0) {
                    $staffProfiles = \App\Models\Profile::whereIn('id', $staffIds)->with('user')->get();
                    $staffNames = $staffProfiles->pluck('user.name')->toArray();
                }

                return [
                    'id' => $jobOrder->id,
                    'queue_number' => $jobOrder->queue_number ? str_pad($jobOrder->queue_number, 4, '0', STR_PAD_LEFT) : null,
                    'service_name' => $jobOrder->bookingService->service?->name ?? 'Unknown Service',
                    'customer_name' => trim(($jobOrder->bookingService->booking->profile?->first_name ?? '') . ' ' . ($jobOrder->bookingService->booking->profile?->last_name ?? '')) ?: 'Unknown',
                    'staff_names' => $staffNames,
                    'status' => $jobOrder->status,
                    'priority' => $jobOrder->queue_priority,
                ];
            });

        return Inertia::render('Dashboard', [
            'bookingStats' => $bookingStats,
            'paymentStats' => $paymentStats,
            'userStats' => $userStats,
            'recentBookings' => $recentBookings,
            'topServices' => $topServices,
            'monthlyRevenue' => $monthlyRevenue,
            'dailyBookings' => $dailyBookings,
            'topCustomers' => $topCustomers,
            'queueData' => $queueData,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    public function bookingCalendar(Request $request): Response
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $bookingsQuery = Booking::with(['profile.user', 'services.service'])
            ->whereIn('status', ['accepted']);

        if ($startDate) {
            $bookingsQuery->where('date', '>=', $startDate);
        }
        if ($endDate) {
            $bookingsQuery->where('date', '<=', $endDate);
        }

        $bookings = $bookingsQuery
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($booking) {
                $serviceNames = $booking->services->map(function ($bookingService) {
                    return $bookingService->service?->name ?? 'Unknown Service';
                })->implode(', ');

                return [
                    'id' => $booking->id,
                    'customer_name' => $booking->profile?->user?->name ?? 'Unknown',
                    'date' => $booking->date?->format('Y-m-d'),
                    'display_date' => $booking->date?->format('M d, Y'),
                    'status' => $booking->status,
                    'rating' => $booking->rating,
                    'services' => $serviceNames,
                    'created_at' => $booking->created_at->format('M d, Y'),
                ];
            });

        return Inertia::render('Admin/BookingCalendar', [
            'bookings' => $bookings,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }
}
