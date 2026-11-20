<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Booking;
use App\Models\BookingService;
use App\Models\ManualPayment;
use App\Models\Payment;
use App\Models\JobOrder;
use App\Models\Product;
use App\Models\StockTransaction;
use App\Models\ServiceProductUsage;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Service;
use Illuminate\Validation\ValidationException;

class ReportsController extends Controller
{
    private function validatedDateRange(Request $request): array
    {
        $dates = $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $startDate = $dates['start_date'] ?? null;
        $endDate = $dates['end_date'] ?? null;

        if ($startDate && $endDate && $endDate < $startDate) {
            throw ValidationException::withMessages([
                'end_date' => 'The end date must be on or after the start date.',
            ]);
        }

        return [$startDate, $endDate];
    }

    private function applyTimestampRange($query, string $column, ?string $startDate, ?string $endDate)
    {
        if ($startDate) {
            $query->where($column, '>=', Carbon::parse($startDate)->startOfDay());
        }

        if ($endDate) {
            $query->where($column, '<=', Carbon::parse($endDate)->endOfDay());
        }

        return $query;
    }

    private function getBookingFinancialSummary(Booking $booking): array
    {
        $serviceCost = (float) $booking->services->sum(function ($service) {
            return (float) ($service->service?->price ?? 0);
        });

        $jobOrderIds = $booking->services->pluck('id')->filter()->all();
        $jobOrderIds = JobOrder::whereIn('booking_service_id', $jobOrderIds)->pluck('id');

        $productCost = (float) ServiceProductUsage::with('product')
            ->whereIn('job_order_id', $jobOrderIds)
            ->where('status', 'Approved')
            ->whereHas('product', function ($query) {
                $query->whereNotNull('price')->where('price', '>', 0);
            })
            ->get()
            ->sum(function ($usage) {
                return ((float) ($usage->product->price ?? 0)) * (int) $usage->quantity_used;
            });

        $actualPaid = (float) $booking->payments()->where('status', 'paid')->sum('amount')
            + (float) $booking->manualPayments()->sum('amount');
        $totalPaid = $booking->status === 'cancelled'
            ? (float) ($booking->cancellation_fee ?? min($actualPaid, 50))
            : $actualPaid;

        $totalCost = $serviceCost + $productCost;
        $balance = $booking->status === 'cancelled' ? 0 : $totalCost - $totalPaid;

        return [
            'service_cost' => $serviceCost,
            'product_cost' => $productCost,
            'total_cost' => $totalCost,
            'total_paid' => $totalPaid,
            'balance' => $balance,
            'is_paid' => $booking->status === 'cancelled' || $balance <= 0,
            'customer_name' => trim(sprintf('%s %s',
                $booking->profile?->first_name ?? '',
                $booking->profile?->last_name ?? ''
            )),
            'date' => $booking->date?->format('Y-m-d'),
            'booking_id' => $booking->id,
        ];
    }

    private function getBookingRevenueSummary(Booking $booking): array
    {
        $serviceRevenue = (float) $booking->services->sum(function ($service) {
            $servicePrice = (float) ($service->service?->price ?? 0);

            return $servicePrice;
        });

        $paidServiceIds = $booking->services->pluck('id')->filter()->all();

        $productRevenue = (float) ServiceProductUsage::with('product')
            ->whereIn('job_order_id', JobOrder::whereIn('booking_service_id', $paidServiceIds)->pluck('id'))
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

        if ($booking->status === 'cancelled') {
            $cancellationFee = (float) ($booking->cancellation_fee ?? min($paidAmount, 50));

            return [
                'service_revenue' => 0,
                'product_revenue' => 0,
                'cancellation_fee_revenue' => $cancellationFee,
                'total_revenue' => $cancellationFee,
                'balance' => 0,
            ];
        }

        $actualPaidServiceRevenue = $paidAmount > 0 ? min($serviceRevenue, $paidAmount) : 0;

        return [
            'service_revenue' => $actualPaidServiceRevenue,
            'product_revenue' => $productRevenue,
            'cancellation_fee_revenue' => 0,
            'total_revenue' => $actualPaidServiceRevenue + $productRevenue,
            'balance' => max(0, $serviceRevenue + $productRevenue - $paidAmount),
        ];
    }

    public function index()
    {
        return inertia('Admin/Reports');
    }

    // Dashboard Overview
    public function overview()
    {
        $cancelledBookingIds = Booking::where('status', 'cancelled')->pluck('id');
        $onlinePayments = Payment::where('status', 'paid')
            ->whereNotIn('booking_id', $cancelledBookingIds)
            ->sum('amount');
        $manualPayments = ManualPayment::whereNotIn('booking_id', $cancelledBookingIds)->sum('amount');
        $cancellationFees = (float) Booking::where('status', 'cancelled')->sum('cancellation_fee');
        $cancelledBookingServiceIds = BookingService::whereIn('booking_id', $cancelledBookingIds)->pluck('id');
        $cancelledJobOrderIds = JobOrder::whereIn('booking_service_id', $cancelledBookingServiceIds)->pluck('id');

        // Calculate product sales from approved service product usage
        $productSales = ServiceProductUsage::with('product')
            ->where('status', 'Approved')
            ->whereNotIn('job_order_id', $cancelledJobOrderIds)
            ->whereHas('product', function ($query) {
                $query->whereNotNull('price')->where('price', '>', 0);
            })
            ->get()
            ->sum(function ($usage) {
                return ($usage->product->price ?? 0) * $usage->quantity_used;
            });

        $totalRevenue = $onlinePayments + $manualPayments + $productSales + $cancellationFees;
        $today = Carbon::today();
        $trendStart = $today->copy()->subDays(6);
        $dailyBookingCounts = Booking::query()
            ->select('date', DB::raw('COUNT(*) as total'))
            ->whereBetween('date', [$trendStart->toDateString(), $today->toDateString()])
            ->where('status', '!=', 'cancelled')
            ->groupBy('date')
            ->pluck('total', 'date');
        $bookingTrend = collect(range(0, 6))->map(function ($dayOffset) use ($trendStart, $dailyBookingCounts) {
            $date = $trendStart->copy()->addDays($dayOffset);
            $dateKey = $date->toDateString();

            return [
                'date' => $dateKey,
                'bookings' => (int) ($dailyBookingCounts[$dateKey] ?? 0),
            ];
        });
        $bookingStatusDistribution = Booking::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderBy('status')
            ->get()
            ->map(fn ($booking) => [
                'status' => $booking->status,
                'total' => (int) $booking->total,
            ]);
        $recentBookings = Booking::with(['profile', 'services.service'])
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(fn ($booking) => [
                'id' => $booking->id,
                'customer_name' => trim(sprintf(
                    '%s %s',
                    $booking->profile?->first_name ?? '',
                    $booking->profile?->last_name ?? ''
                )) ?: 'Guest Customer',
                'date' => $booking->date?->format('Y-m-d'),
                'services' => $booking->services
                    ->map(fn ($bookingService) => $bookingService->service?->name)
                    ->filter()
                    ->implode(', ') ?: 'No service listed',
                'status' => $booking->status,
            ]);
        $topServices = BookingService::query()
            ->select('service_id', DB::raw('COUNT(*) as total_bookings'))
            ->with('service:id,name')
            ->whereHas('booking', fn ($query) => $query->where('status', '!=', 'cancelled'))
            ->groupBy('service_id')
            ->orderByDesc('total_bookings')
            ->limit(5)
            ->get()
            ->map(fn ($bookingService) => [
                'name' => $bookingService->service?->name ?? 'Unknown service',
                'bookings' => (int) $bookingService->total_bookings,
            ]);

        return response()->json([
            'total_bookings' => Booking::where('status', '!=', 'cancelled')->count(),
            'pending_bookings' => Booking::where('status', 'pending')->count(),
            'completed_bookings' => Booking::where('status', 'completed')->count(),
            'total_revenue' => $totalRevenue,
            'total_cancellation_fees' => $cancellationFees,
            'total_customers' => User::where('role', 'Customer')->count(),
            'total_staff' => User::where('role', 'Staff')->count(),
            'low_stock_products' => Product::where('current_stock', '<=', DB::raw('reorder_level'))->count(),
            'active_job_orders' => JobOrder::where('status', 'in_progress')->count(),
            'booking_trend' => $bookingTrend,
            'booking_status_distribution' => $bookingStatusDistribution,
            'recent_bookings' => $recentBookings,
            'top_services' => $topServices,
        ]);
    }

    // Financial Reports
    public function financial(Request $request)
    {
        [$startDate, $endDate] = $this->validatedDateRange($request);

        $bookings = Booking::with(['profile', 'services.service', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected')
            ->when($startDate, fn ($query) => $query->whereDate('date', '>=', $startDate))
            ->when($endDate, fn ($query) => $query->whereDate('date', '<=', $endDate))
            ->get();

        $bookingSummaries = $bookings->map(function (Booking $booking) {
            return $this->getBookingFinancialSummary($booking);
        });

        $revenueBookingIds = $bookings->where('status', '!=', 'cancelled')->pluck('id')->all();
        $revenueSummaries = $bookings->map(function (Booking $booking) {
            return $this->getBookingRevenueSummary($booking);
        })->filter(fn ($summary) => $summary['total_revenue'] > 0);

        $unpaidCustomers = $bookingSummaries->filter(fn ($summary) => !$summary['is_paid'] && $summary['total_cost'] > 0)
            ->sortByDesc('balance')
            ->values()
            ->map(function ($summary) {
                return [
                    'booking_id' => $summary['booking_id'],
                    'customer_name' => $summary['customer_name'] ?: 'Guest Customer',
                    'date' => $summary['date'],
                    'balance' => round((float) $summary['balance'], 2),
                ];
            });

        $totalUnpaidBalance = (float) $unpaidCustomers->sum('balance');

        $revenueByPaymentMethod = Payment::where('status', 'paid')
            ->when($startDate || $endDate, fn ($query) => $this->applyTimestampRange($query, 'created_at', $startDate, $endDate))
            ->whereIn('booking_id', $revenueBookingIds)
            ->selectRaw('payment_method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('payment_method')
            ->get();

        $manualPaymentTotal = ManualPayment::when($startDate || $endDate, fn ($query) => $this->applyTimestampRange($query, 'created_at', $startDate, $endDate))
            ->whereIn('booking_id', $revenueBookingIds)
            ->sum('amount');
        $manualPaymentCount = ManualPayment::when($startDate || $endDate, fn ($query) => $this->applyTimestampRange($query, 'created_at', $startDate, $endDate))
            ->whereIn('booking_id', $revenueBookingIds)
            ->count();

        if ($manualPaymentTotal > 0) {
            $revenueByPaymentMethod->push((object) [
                'payment_method' => 'manual',
                'total' => $manualPaymentTotal,
                'count' => $manualPaymentCount,
            ]);
        }

        $cancellationFeeBookings = $bookings->where('status', 'cancelled')
            ->filter(fn (Booking $booking) => (float) ($booking->cancellation_fee ?? 0) > 0);
        $cancellationFeeTotal = (float) $cancellationFeeBookings->sum('cancellation_fee');

        if ($cancellationFeeTotal > 0) {
            $revenueByPaymentMethod->push((object) [
                'payment_method' => 'cancellation fee',
                'total' => $cancellationFeeTotal,
                'count' => $cancellationFeeBookings->count(),
            ]);
        }

        $revenueByAmountType = Payment::where('status', 'paid')
            ->when($startDate || $endDate, fn ($query) => $this->applyTimestampRange($query, 'created_at', $startDate, $endDate))
            ->whereIn('booking_id', $revenueBookingIds)
            ->selectRaw('amount_type, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('amount_type')
            ->get();

        $paymentStatus = Payment::selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->whereIn('booking_id', $revenueBookingIds)
            ->when($startDate || $endDate, fn ($query) => $this->applyTimestampRange($query, 'created_at', $startDate, $endDate))
            ->groupBy('status')
            ->get();

        $paymentStatus->push((object) [
            'status' => 'manual',
            'count' => $manualPaymentCount,
            'total' => $manualPaymentTotal,
        ]);

        $dailyRevenue = $revenueSummaries
            ->groupBy(fn ($summary, $index) => $bookings->get($index)?->date?->format('Y-m-d'))
            ->map(function ($summaryGroup, $date) {
                $serviceTotal = (float) $summaryGroup->sum('service_revenue');
                $productTotal = (float) $summaryGroup->sum('product_revenue');
                $cancellationFeeTotal = (float) $summaryGroup->sum('cancellation_fee_revenue');

                return (object) [
                    'date' => $date,
                    'service_total' => $serviceTotal,
                    'product_total' => $productTotal,
                    'cancellation_fee_total' => $cancellationFeeTotal,
                    'total' => $serviceTotal + $productTotal + $cancellationFeeTotal,
                ];
            })
            ->sortBy('date')
            ->values();

        $totalProductSales = (float) $revenueSummaries->sum('product_revenue');
        $totalRevenueByService = (float) $revenueSummaries->sum('service_revenue');
        $totalCancellationFees = (float) $revenueSummaries->sum('cancellation_fee_revenue');
        $totalDailyRevenue = $totalProductSales + $totalRevenueByService + $totalCancellationFees;

        $response = [
            'revenue_by_payment_method' => $revenueByPaymentMethod,
            'revenue_by_amount_type' => $revenueByAmountType,
            'payment_status' => $paymentStatus,
            'daily_revenue' => $dailyRevenue,
            'total_daily_revenue' => $totalDailyRevenue,
            'total_product_sales' => $totalProductSales,
            'total_revenue_by_service' => $totalRevenueByService,
            'total_cancellation_fees' => $totalCancellationFees,
            'total_unpaid_balance' => $totalUnpaidBalance,
            'unpaid_customers' => $unpaidCustomers,
        ];

        return response()->json($response);
    }

    public function revenueByService(Request $request)
    {
        [$startDate, $endDate] = $this->validatedDateRange($request);

        $paidBookingIds = Booking::with(['services.service', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected')
            ->where('status', '!=', 'cancelled')
            ->when($startDate, fn ($query) => $query->whereDate('date', '>=', $startDate))
            ->when($endDate, fn ($query) => $query->whereDate('date', '<=', $endDate))
            ->get()
            ->filter(function (Booking $booking) {
                $summary = $this->getBookingFinancialSummary($booking);
                return $summary['is_paid'] && $summary['total_paid'] > 0;
            })
            ->pluck('id')
            ->all();

        $revenue = DB::table('booking_services')
            ->join('services', 'booking_services.service_id', '=', 'services.id')
            ->whereIn('booking_services.booking_id', $paidBookingIds)
            ->selectRaw('services.id, services.name, services.price, COUNT(DISTINCT booking_services.booking_id) as booking_count, SUM(services.price) as total_revenue')
            ->groupBy('services.id', 'services.name', 'services.price')
            ->get();

        $totalRevenueByService = (float) $revenue->sum('total_revenue');

        return response()->json([
            'revenue' => $revenue,
            'total_revenue_by_service' => $totalRevenueByService,
        ]);
    }

    public function consumableProductSales(Request $request)
    {
        [$startDate, $endDate] = $this->validatedDateRange($request);

        $productSales = DB::table('service_product_usage as spu')
            ->join('products as p', 'spu.product_id', '=', 'p.id')
            ->join('job_orders as jo', 'spu.job_order_id', '=', 'jo.id')
            ->join('booking_services as bs', 'jo.booking_service_id', '=', 'bs.id')
            ->join('bookings as b', 'bs.booking_id', '=', 'b.id')
            ->leftJoin('profiles as customer_profile', 'b.profile_id', '=', 'customer_profile.id')
            ->leftJoin('users as customer_user', 'customer_profile.user_id', '=', 'customer_user.id')
            ->leftJoin('services as s', 'bs.service_id', '=', 's.id')
            ->where('spu.status', 'Approved')
            ->whereNotIn('b.status', ['rejected', 'cancelled'])
            ->whereNotNull('p.price')
            ->where('p.price', '>', 0)
            ->when($startDate, fn ($query) => $query->whereDate('b.date', '>=', $startDate))
            ->when($endDate, fn ($query) => $query->whereDate('b.date', '<=', $endDate))
            ->select([
                'spu.id as usage_id',
                'p.id as product_id',
                'p.name as product_name',
                'p.name',
                'jo.profile_id as staff_ids',
                's.name as service_name',
                'b.id as booking_id',
                'b.date as booking_date',
                'spu.quantity_used',
                'p.price',
                DB::raw("COALESCE(customer_user.name, 'Guest Customer') as customer_name"),
                DB::raw('(spu.quantity_used * p.price) as total_sales'),
            ])
            ->orderByDesc('total_sales')
            ->get();

        // Map staff_ids to staff names
        $productSales->transform(function ($sale) {
            $staffIds = $sale->staff_ids;
            if ($staffIds) {
                // If it's already an array (from JSON cast)
                if (is_array($staffIds)) {
                    $ids = $staffIds;
                } else {
                    // If it's a JSON string, decode it
                    $ids = json_decode($staffIds, true) ?? [];
                }

                if (!empty($ids)) {
                    $staffNames = \App\Models\Profile::whereIn('id', $ids)
                        ->with('user')
                        ->get()
                        ->pluck('user.name')
                        ->join(', ');
                    $sale->staff_name = $staffNames ?: 'Unassigned';
                } else {
                    $sale->staff_name = 'Unassigned';
                }
            } else {
                $sale->staff_name = 'Unassigned';
            }
            return $sale;
        });

        return response()->json($productSales);
    }

    // Booking Reports
    public function bookings(Request $request)
    {
        $startDate = $request->get('start_date') ?? now()->startOfMonth();
        $endDate = $request->get('end_date') ?? now()->endOfMonth();

        $bookingStatus = Booking::where('status', '!=', 'rejected')
            ->whereBetween('date', [$startDate, $endDate])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $dailyBookings = Booking::where('status', '!=', 'rejected')
            ->whereBetween('date', [$startDate, $endDate])
            ->selectRaw('date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $paidBookings = Booking::with(['profile.user', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected')
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->map(function (Booking $booking) {
                $totalPaid = (float) $booking->payments()->where('status', 'paid')->sum('amount')
                    + (float) $booking->manualPayments()->sum('amount');

                return [
                    'booking_id' => $booking->id,
                    'customer_name' => trim(sprintf('%s %s',
                        $booking->profile?->first_name ?? '',
                        $booking->profile?->last_name ?? ''
                    )) ?: 'Guest Customer',
                    'date' => $booking->date?->format('Y-m-d'),
                    'status' => $booking->status,
                    'amount_paid' => round($totalPaid, 2),
                ];
            })
            ->filter(fn ($booking) => $booking['amount_paid'] > 0)
            ->values();

        $servicePopularity = DB::table('booking_services')
            ->join('services', 'booking_services.service_id', '=', 'services.id')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->where('bookings.status', '!=', 'rejected')
            ->whereBetween('bookings.date', [$startDate, $endDate])
            ->selectRaw('services.name, COUNT(*) as booking_count')
            ->groupBy('services.id', 'services.name')
            ->orderByDesc('booking_count')
            ->limit(10)
            ->get();

        $averageRating = DB::table('booking_services')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->where('bookings.status', '!=', 'rejected')
            ->whereNotNull('booking_services.rating')
            ->whereBetween('bookings.date', [$startDate, $endDate])
            ->avg('booking_services.rating');

        $dailyRatings = DB::table('booking_services')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->where('bookings.status', '!=', 'rejected')
            ->whereNotNull('booking_services.rating')
            ->whereBetween('bookings.date', [$startDate, $endDate])
            ->selectRaw('DATE(bookings.date) as date, AVG(booking_services.rating) as avg_rating')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'booking_status' => $bookingStatus,
            'daily_bookings' => $dailyBookings,
            'paid_bookings' => $paidBookings,
            'service_popularity' => $servicePopularity,
            'average_rating' => $averageRating ?? 0,
            'daily_ratings' => $dailyRatings,
        ]);
    }

    // Job Order Reports
    public function jobOrders(Request $request)
    {
        $startDate = $request->get('start_date') ?? now()->startOfMonth();
        $endDate = $request->get('end_date') ?? now()->endOfMonth();

        $jobOrderStatus = JobOrder::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $averageDuration = JobOrder::whereNotNull('start_time')
            ->whereNotNull('end_time')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_minutes')
            ->first();

        $completedJobOrders = JobOrder::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $dailyCompletedJobOrders = JobOrder::join('booking_services', 'job_orders.booking_service_id', '=', 'booking_services.id')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->where('job_orders.status', 'completed')
            ->whereBetween('bookings.date', [$startDate, $endDate])
            ->selectRaw('DATE(bookings.date) as date, COUNT(job_orders.id) as count')
            ->groupByRaw('DATE(bookings.date)')
            ->orderBy('date')
            ->get();

        $staffRatings = JobOrder::with(['bookingService'])
            ->where('status', 'completed')
            ->whereHas('bookingService', function ($query) {
                $query->whereNotNull('rating');
            })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get()
            ->flatMap(function ($jobOrder) {
                $staffIds = $jobOrder->profile_id ?? [];
                $ratings = [];
                foreach ($staffIds as $staffId) {
                    $profile = \App\Models\Profile::with('user')->find($staffId);
                    if ($profile) {
                        $ratings[] = [
                            'first_name' => $profile->first_name,
                            'last_name' => $profile->last_name,
                            'avg_rating' => $jobOrder->bookingService->rating,
                            'completed_jobs' => 1,
                        ];
                    }
                }
                return $ratings;
            });

        // Group by staff name and calculate averages
        $staffRatingsGrouped = [];
        foreach ($staffRatings as $rating) {
            $key = $rating['first_name'] . '|' . $rating['last_name'];
            if (!isset($staffRatingsGrouped[$key])) {
                $staffRatingsGrouped[$key] = [
                    'first_name' => $rating['first_name'],
                    'last_name' => $rating['last_name'],
                    'avg_rating' => 0,
                    'completed_jobs' => 0,
                    'total_rating' => 0,
                ];
            }
            $staffRatingsGrouped[$key]['total_rating'] += $rating['avg_rating'];
            $staffRatingsGrouped[$key]['completed_jobs'] += 1;
        }

        foreach ($staffRatingsGrouped as &$staff) {
            $staff['avg_rating'] = $staff['total_rating'] / $staff['completed_jobs'];
            unset($staff['total_rating']);
        }

        $staffRatingsGrouped = collect($staffRatingsGrouped)->sortByDesc('avg_rating')->values();

        $jobOrderHistory = JobOrder::with([
            'bookingService.service',
            'bookingService.booking.profile',
            'bookingService.booking.vehicle',
        ])
            ->latest()
            ->get();

        $jobOrderProducts = ServiceProductUsage::with([
            'product' => fn ($query) => $query->withTrashed(),
        ])
            ->whereIn('job_order_id', $jobOrderHistory->pluck('id'))
            ->where('status', 'Approved')
            ->get()
            ->groupBy('job_order_id');

        $jobOrderHistory = $jobOrderHistory->map(function (JobOrder $jobOrder) use ($jobOrderProducts) {
                $booking = $jobOrder->bookingService?->booking;
                $vehicle = $booking?->vehicle;
                $customer = $booking?->profile;
                $staffNames = $jobOrder->staff_names ?? 'Unassigned';
                $isCancelled = in_array($booking?->status, ['rejected', 'cancelled'], true);
                $products = $jobOrderProducts->get($jobOrder->id, collect())
                    ->filter(fn ($usage) => $usage->product && (float) $usage->product->price > 0)
                    ->map(function ($usage) {
                        $unitPrice = (float) $usage->product->price;
                        $quantity = (int) $usage->quantity_used;

                        return [
                            'name' => $usage->product->name,
                            'quantity' => $quantity,
                            'unit' => $usage->product->unit,
                            'unit_price' => $unitPrice,
                            'total_sales' => $unitPrice * $quantity,
                        ];
                    })
                    ->values();
                $serviceSales = !$isCancelled
                    ? (float) ($jobOrder->bookingService?->service?->price ?? 0)
                    : 0;
                $productSales = !$isCancelled
                    ? (float) $products->sum('total_sales')
                    : 0;

                return [
                    'id' => $jobOrder->id,
                    'booking_id' => $booking?->id,
                    'booking_status' => $booking?->status,
                    'customer_id' => $customer?->id,
                    'service_name' => $jobOrder->bookingService?->service?->name,
                    'customer_name' => $customer
                        ? trim(($customer->first_name ?? '').' '.($customer->last_name ?? ''))
                        : null,
                    'vehicle' => $vehicle ? [
                        'brand' => $vehicle->brand,
                        'model' => $vehicle->model,
                        'plate_number' => $vehicle->plate_number,
                    ] : null,
                    'staff_name' => $staffNames,
                    'booking_date' => $booking?->date?->format('Y-m-d'),
                    'start_time' => $jobOrder->start_time?->toISOString(),
                    'end_time' => $jobOrder->end_time?->toISOString(),
                    'status' => $jobOrder->status,
                    'products' => $products,
                    'sales_excluded' => $isCancelled,
                    'service_sales' => $serviceSales,
                    'product_sales' => $productSales,
                    'total_sales' => $serviceSales + $productSales,
                ];
            })
            ->values();

        return response()->json([
            'job_order_status' => $jobOrderStatus,
            'average_duration' => $averageDuration->avg_minutes ?? 0,
            'completed_job_orders' => $completedJobOrders,
            'daily_completed_job_orders' => $dailyCompletedJobOrders,
            'staff_ratings' => $staffRatings,
            'job_order_history' => $jobOrderHistory,
        ]);
    }

    // Inventory Reports
    public function inventory()
    {
        $lowStockProducts = Product::with('inventoryCategory', 'supplier')
            ->where('current_stock', '<=', DB::raw('reorder_level'))
            ->where('is_active', true)
            ->get();

        $stockTransactions = StockTransaction::with('product')
            ->confirmed()
            ->orderBy('transaction_date', 'desc')
            ->limit(50)
            ->get();

        $stockByCategory = DB::table('products')
            ->join('inventory_categories', 'products.inventory_category_id', '=', 'inventory_categories.id')
            ->selectRaw('inventory_categories.name, SUM(products.current_stock) as total_stock')
            ->groupBy('inventory_categories.id', 'inventory_categories.name')
            ->get();

        $productUsage = ServiceProductUsage::with('product')
            ->selectRaw('product_id, SUM(quantity_used) as total_used')
            ->groupBy('product_id')
            ->orderByDesc('total_used')
            ->limit(10)
            ->get();

        return response()->json([
            'low_stock_products' => $lowStockProducts,
            'stock_transactions' => $stockTransactions,
            'stock_by_category' => $stockByCategory,
            'product_usage' => $productUsage,
        ]);
    }

    // Customer Reports
    public function customers()
    {
        $customerRegistrations = User::where('role', 'Customer')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->limit(30)
            ->get();

        $vehicleDistribution = DB::table('vehicles')
            ->selectRaw('brand, COUNT(*) as count')
            ->groupBy('brand')
            ->orderByDesc('count')
            ->get();

        $topCustomers = DB::table('bookings')
            ->join('profiles', 'bookings.profile_id', '=', 'profiles.id')
            ->selectRaw('profiles.first_name, profiles.last_name, COUNT(*) as booking_count')
            ->groupBy('profiles.id', 'profiles.first_name', 'profiles.last_name')
            ->orderByDesc('booking_count')
            ->limit(10)
            ->get();

        $totalCustomers = User::where('role', 'Customer')->count();
        $customersWithBookings = Booking::distinct('profile_id')->count('profile_id');
        $repeatCustomerRate = $totalCustomers > 0 ? ($customersWithBookings / $totalCustomers) * 100 : 0;

        return response()->json([
            'customer_registrations' => $customerRegistrations,
            'vehicle_distribution' => $vehicleDistribution,
            'top_customers' => $topCustomers,
            'total_customers' => $totalCustomers,
            'repeat_customer_rate' => round($repeatCustomerRate, 2),
        ]);
    }

    // Staff Reports
    public function staff()
    {
        $totalStaff = User::where('role', 'Staff')->count();

        $jobOrders = JobOrder::where('status', 'completed')->get();

        $staffProductivity = [];
        foreach ($jobOrders as $jobOrder) {
            $staffIds = $jobOrder->profile_id ?? [];
            foreach ($staffIds as $staffId) {
                $profile = \App\Models\Profile::with('user')->find($staffId);
                if ($profile) {
                    $key = $profile->id;
                    if (!isset($staffProductivity[$key])) {
                        $staffProductivity[$key] = [
                            'name' => $profile->user->name,
                            'completed_jobs' => 0,
                        ];
                    }
                    $staffProductivity[$key]['completed_jobs'] += 1;
                }
            }
        }

        $staffProductivity = collect($staffProductivity)->sortByDesc('completed_jobs')->values();

        return response()->json([
            'total_staff' => $totalStaff,
            'staff_productivity' => $staffProductivity,
        ]);
    }
}
