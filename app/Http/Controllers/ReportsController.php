<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Booking;
use App\Models\ManualPayment;
use App\Models\Payment;
use App\Models\JobOrder;
use App\Models\Product;
use App\Models\StockTransaction;
use App\Models\ServiceProductUsage;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Service;

class ReportsController extends Controller
{
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

        $totalPaid = (float) $booking->payments()->where('status', 'paid')->sum('amount')
            + (float) $booking->manualPayments()->sum('amount');

        $totalCost = $serviceCost + $productCost;
        $balance = $totalCost - $totalPaid;

        return [
            'service_cost' => $serviceCost,
            'product_cost' => $productCost,
            'total_cost' => $totalCost,
            'total_paid' => $totalPaid,
            'balance' => $balance,
            'is_paid' => $balance <= 0,
            'customer_name' => trim(sprintf('%s %s',
                $booking->profile?->first_name ?? '',
                $booking->profile?->last_name ?? ''
            )),
            'date' => $booking->date?->format('Y-m-d'),
            'booking_id' => $booking->id,
        ];
    }

    private function getPaidBookingRevenueSummary(Booking $booking): array
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

        $actualPaidServiceRevenue = $paidAmount > 0 ? min($serviceRevenue, $paidAmount) : 0;
        $actualPaidProductRevenue = $paidAmount > 0 ? max(0, $paidAmount - $actualPaidServiceRevenue) : 0;

        if ($productRevenue > 0 && $actualPaidProductRevenue > 0) {
            $actualPaidProductRevenue = min($productRevenue, $actualPaidProductRevenue);
        }

        return [
            'service_revenue' => $actualPaidServiceRevenue,
            'product_revenue' => $actualPaidProductRevenue,
            'total_paid_revenue' => $actualPaidServiceRevenue + $actualPaidProductRevenue,
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
        $onlinePayments = Payment::where('status', 'paid')->sum('amount');
        $manualPayments = ManualPayment::sum('amount');

        // Calculate product sales from approved service product usage
        $productSales = ServiceProductUsage::with('product')
            ->where('status', 'Approved')
            ->whereHas('product', function ($query) {
                $query->whereNotNull('price')->where('price', '>', 0);
            })
            ->get()
            ->sum(function ($usage) {
                return ($usage->product->price ?? 0) * $usage->quantity_used;
            });

        $totalRevenue = $onlinePayments + $manualPayments + $productSales;

        return response()->json([
            'total_bookings' => Booking::count(),
            'pending_bookings' => Booking::where('status', 'pending')->count(),
            'completed_bookings' => Booking::where('status', 'completed')->count(),
            'total_revenue' => $totalRevenue,
            'total_customers' => User::where('role', 'Customer')->count(),
            'total_staff' => User::where('role', 'Staff')->count(),
            'low_stock_products' => Product::where('current_stock', '<=', DB::raw('reorder_level'))->count(),
            'active_job_orders' => JobOrder::where('status', 'in_progress')->count(),
        ]);
    }

    // Financial Reports
    public function financial(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        $bookings = Booking::with(['profile', 'services.service', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('date', [$startDate, $endDate]);
            })
            ->get();

        $bookingSummaries = $bookings->map(function (Booking $booking) {
            return $this->getBookingFinancialSummary($booking);
        });

        $paidBookings = $bookingSummaries->filter(fn ($summary) => $summary['is_paid'] && $summary['total_paid'] > 0)->values();
        $paidRevenueSummaries = $bookings->map(function (Booking $booking) {
            return $this->getPaidBookingRevenueSummary($booking);
        })->filter(fn ($summary) => $summary['total_paid_revenue'] > 0);

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

        $revenueByPaymentMethod = $paidBookings->flatMap(function ($summary) {
            return [];
        })->values();

        $revenueByPaymentMethod = Payment::where('status', 'paid')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->whereIn('booking_id', $paidBookings->pluck('booking_id')->all())
            ->selectRaw('payment_method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('payment_method')
            ->get();

        $manualPaymentTotal = ManualPayment::when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->whereIn('booking_id', $paidBookings->pluck('booking_id')->all())
            ->sum('amount');
        $manualPaymentCount = ManualPayment::when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->whereIn('booking_id', $paidBookings->pluck('booking_id')->all())
            ->count();

        if ($manualPaymentTotal > 0) {
            $revenueByPaymentMethod->push((object) [
                'payment_method' => 'manual',
                'total' => $manualPaymentTotal,
                'count' => $manualPaymentCount,
            ]);
        }

        $revenueByAmountType = Payment::where('status', 'paid')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->whereIn('booking_id', $paidBookings->pluck('booking_id')->all())
            ->selectRaw('amount_type, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('amount_type')
            ->get();

        $paymentStatus = Payment::selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->whereIn('booking_id', $paidBookings->pluck('booking_id')->all())
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->groupBy('status')
            ->get();

        $paymentStatus->push((object) [
            'status' => 'manual',
            'count' => $manualPaymentCount,
            'total' => $manualPaymentTotal,
        ]);

        $dailyRevenue = $paidRevenueSummaries
            ->groupBy(fn ($summary, $index) => $bookings->get($index)?->date?->format('Y-m-d'))
            ->map(function ($summaryGroup, $date) {
                $serviceTotal = (float) $summaryGroup->sum('service_revenue');
                $productTotal = (float) $summaryGroup->sum('product_revenue');

                return (object) [
                    'date' => $date,
                    'service_total' => $serviceTotal,
                    'product_total' => $productTotal,
                    'total' => $serviceTotal + $productTotal,
                ];
            })
            ->sortBy('date')
            ->values();

        $totalProductSales = (float) $paidRevenueSummaries->sum('product_revenue');
        $totalRevenueByService = (float) $paidRevenueSummaries->sum('service_revenue');
        $totalDailyRevenue = $totalProductSales + $totalRevenueByService;

        $response = [
            'revenue_by_payment_method' => $revenueByPaymentMethod,
            'revenue_by_amount_type' => $revenueByAmountType,
            'payment_status' => $paymentStatus,
            'daily_revenue' => $dailyRevenue,
            'total_daily_revenue' => $totalDailyRevenue,
            'total_product_sales' => $totalProductSales,
            'total_revenue_by_service' => $totalRevenueByService,
            'total_unpaid_balance' => $totalUnpaidBalance,
            'unpaid_customers' => $unpaidCustomers,
        ];

        return response()->json($response);
    }

    public function revenueByService(Request $request)
    {
        $startDate = $request->get('start_date') ?? now()->startOfMonth();
        $endDate = $request->get('end_date') ?? now()->endOfMonth();

        $paidBookingIds = Booking::with(['services.service', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('date', [$startDate, $endDate]);
            })
            ->get()
            ->filter(function (Booking $booking) {
                $summary = $this->getBookingFinancialSummary($booking);
                return $summary['is_paid'] && $summary['total_paid'] > 0;
            })
            ->pluck('id')
            ->all();

        $onlineRevenue = DB::table('booking_services')
            ->join('services', 'booking_services.service_id', '=', 'services.id')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->join('payments', 'bookings.id', '=', 'payments.booking_id')
            ->whereIn('bookings.id', $paidBookingIds)
            ->where('payments.status', 'paid')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('payments.created_at', [$startDate, $endDate]);
            })
            ->selectRaw('services.id, services.name, services.price, COUNT(DISTINCT bookings.id) as booking_count, SUM(services.price) as total_revenue')
            ->groupBy('services.id', 'services.name', 'services.price')
            ->get()
            ->keyBy('id');

        $manualRevenue = DB::table('booking_services')
            ->join('services', 'booking_services.service_id', '=', 'services.id')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->join('manual_payments', 'bookings.id', '=', 'manual_payments.booking_id')
            ->whereIn('bookings.id', $paidBookingIds)
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('manual_payments.created_at', [$startDate, $endDate]);
            })
            ->selectRaw('services.id, services.name, services.price, COUNT(DISTINCT bookings.id) as booking_count, SUM(services.price) as total_revenue')
            ->groupBy('services.id', 'services.name', 'services.price')
            ->get()
            ->keyBy('id');

        $allServiceIds = $onlineRevenue->keys()->merge($manualRevenue->keys())->unique();
        $revenue = $allServiceIds->map(function ($serviceId) use ($onlineRevenue, $manualRevenue) {
            $online = $onlineRevenue->get($serviceId);
            $manual = $manualRevenue->get($serviceId);

            $bookingCount = ($online?->booking_count ?? 0) + ($manual?->booking_count ?? 0);
            $totalRevenue = ((float) ($online?->total_revenue ?? 0)) + ((float) ($manual?->total_revenue ?? 0));

            return (object) [
                'id' => $serviceId,
                'name' => $online?->name ?? $manual?->name,
                'price' => $online?->price ?? $manual?->price,
                'booking_count' => $bookingCount,
                'total_revenue' => $totalRevenue,
            ];
        })->values();

        $totalRevenueByService = (float) $revenue->sum('total_revenue');

        return response()->json([
            'revenue' => $revenue,
            'total_revenue_by_service' => $totalRevenueByService,
        ]);
    }

    public function consumableProductSales(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        $paidBookingIds = Booking::with(['services.service', 'payments', 'manualPayments'])
            ->where('status', '!=', 'rejected')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('date', [$startDate, $endDate]);
            })
            ->get()
            ->filter(function (Booking $booking) {
                $summary = $this->getBookingFinancialSummary($booking);
                return $summary['is_paid'] && $summary['total_paid'] > 0;
            })
            ->pluck('id')
            ->all();

        $productSales = DB::table('service_product_usage as spu')
            ->join('products as p', 'spu.product_id', '=', 'p.id')
            ->join('job_orders as jo', 'spu.job_order_id', '=', 'jo.id')
            ->join('booking_services as bs', 'jo.booking_service_id', '=', 'bs.id')
            ->join('bookings as b', 'bs.booking_id', '=', 'b.id')
            ->join('profiles as customer_profile', 'b.profile_id', '=', 'customer_profile.id')
            ->join('users as customer_user', 'customer_profile.user_id', '=', 'customer_user.id')
            ->leftJoin('profiles as staff_profile', 'jo.profile_id', '=', 'staff_profile.id')
            ->leftJoin('users as staff_user', 'staff_profile.user_id', '=', 'staff_user.id')
            ->leftJoin('services as s', 'bs.service_id', '=', 's.id')
            ->where('spu.status', 'Approved')
            ->whereIn('b.id', $paidBookingIds)
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('spu.created_at', [$startDate, $endDate]);
            })
            ->select([
                'spu.id as usage_id',
                'p.id as product_id',
                'p.name as product_name',
                'p.name',
                'customer_user.name as customer_name',
                'staff_user.name as staff_name',
                's.name as service_name',
                'b.id as booking_id',
                'b.date as booking_date',
                'spu.quantity_used',
                'p.price',
                DB::raw('(spu.quantity_used * p.price) as total_sales'),
            ])
            ->orderByDesc('total_sales')
            ->get();

        return response()->json($productSales);
    }

    // Booking Reports
    public function bookings(Request $request)
    {
        $startDate = $request->get('start_date') ?? now()->startOfMonth();
        $endDate = $request->get('end_date') ?? now()->endOfMonth();

        $bookingStatus = Booking::where('status', '!=', 'rejected')
            ->whereBetween('created_at', [$startDate, $endDate])
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

        $dailyCompletedJobOrders = JobOrder::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $staffRatings = DB::table('job_orders')
            ->join('booking_services', 'job_orders.booking_service_id', '=', 'booking_services.id')
            ->join('profiles', 'job_orders.profile_id', '=', 'profiles.id')
            ->where('job_orders.status', 'completed')
            ->whereNotNull('booking_services.rating')
            ->whereBetween('job_orders.created_at', [$startDate, $endDate])
            ->selectRaw('profiles.first_name, profiles.last_name, AVG(booking_services.rating) as avg_rating, COUNT(*) as completed_jobs')
            ->groupBy('profiles.id', 'profiles.first_name', 'profiles.last_name')
            ->orderByDesc('avg_rating')
            ->get();

        return response()->json([
            'job_order_status' => $jobOrderStatus,
            'average_duration' => $averageDuration->avg_minutes ?? 0,
            'completed_job_orders' => $completedJobOrders,
            'daily_completed_job_orders' => $dailyCompletedJobOrders,
            'staff_ratings' => $staffRatings,
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

        $staffProductivity = DB::table('job_orders')
            ->join('profiles', 'job_orders.profile_id', '=', 'profiles.id')
            ->join('users', 'profiles.user_id', '=', 'users.id')
            ->selectRaw('users.name, COUNT(*) as completed_jobs')
            ->where('job_orders.status', 'completed')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('completed_jobs')
            ->get();

        return response()->json([
            'total_staff' => $totalStaff,
            'staff_productivity' => $staffProductivity,
        ]);
    }
}
