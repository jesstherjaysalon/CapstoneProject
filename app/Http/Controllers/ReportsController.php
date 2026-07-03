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

        $revenueByPaymentMethod = Payment::where('status', 'paid')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->selectRaw('payment_method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('payment_method')
            ->get();

        // Add manual payments to revenue by payment method
        $manualPaymentTotal = ManualPayment::when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->sum('amount');
        $manualPaymentCount = ManualPayment::when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->count();

        if ($manualPaymentTotal > 0) {
            $revenueByPaymentMethod->push((object) [
                'payment_method' => 'manual',
                'total' => $manualPaymentTotal,
                'count' => $manualPaymentCount,
            ]);
        }

        \Log::info('Revenue by payment method:', $revenueByPaymentMethod->toArray());

        $revenueByAmountType = Payment::where('status', 'paid')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->selectRaw('amount_type, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('amount_type')
            ->get();

        $paymentStatus = Payment::selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->groupBy('status')
            ->get();

        // Add manual payments as "paid" status
        $paymentStatus->push((object) [
            'status' => 'manual',
            'count' => $manualPaymentCount,
            'total' => $manualPaymentTotal,
        ]);

        // Get online payments daily revenue
        $onlineDailyRevenue = Payment::where('status', 'paid')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->selectRaw('DATE(created_at) as date, SUM(amount) as total')
            ->groupBy('date')
            ->get()
            ->keyBy('date');

        // Get manual payments daily revenue
        $manualDailyRevenue = ManualPayment::when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->selectRaw('DATE(created_at) as date, SUM(amount) as total')
            ->groupBy('date')
            ->get()
            ->keyBy('date');

        // Merge daily revenues
        $allDates = $onlineDailyRevenue->keys()->merge($manualDailyRevenue->keys())->unique()->sort();
        $dailyRevenue = $allDates->map(function ($date) use ($onlineDailyRevenue, $manualDailyRevenue) {
            $onlineTotal = $onlineDailyRevenue->get($date)?->total ?? 0;
            $manualTotal = $manualDailyRevenue->get($date)?->total ?? 0;
            return (object) [
                'date' => $date,
                'total' => $onlineTotal + $manualTotal,
            ];
        })->values();

        // Calculate total daily revenue
        $totalDailyRevenue = $dailyRevenue->sum('total');

        // Calculate total consumable product sales
        $totalProductSales = ServiceProductUsage::with('product')
            ->where('status', 'Approved')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('created_at', [$startDate, $endDate]);
            })
            ->whereHas('product', function ($query) {
                $query->whereNotNull('price')->where('price', '>', 0);
            })
            ->get()
            ->sum(function ($usage) {
                return ($usage->product->price ?? 0) * $usage->quantity_used;
            });

        \Log::info('Total Daily Revenue:', ['total' => $totalDailyRevenue]);
        \Log::info('Total Product Sales:', ['total' => $totalProductSales]);

        // Calculate total revenue by service (will be fetched from revenueByService endpoint)
        $totalRevenueByService = 0; // This will be calculated separately

        $response = [
            'revenue_by_payment_method' => $revenueByPaymentMethod,
            'revenue_by_amount_type' => $revenueByAmountType,
            'payment_status' => $paymentStatus,
            'daily_revenue' => $dailyRevenue,
            'total_daily_revenue' => $totalDailyRevenue,
            'total_product_sales' => $totalProductSales,
        ];

        \Log::info('Financial response:', $response);

        return response()->json($response);
    }

    public function revenueByService(Request $request)
    {
        $startDate = $request->get('start_date') ?? now()->startOfMonth();
        $endDate = $request->get('end_date') ?? now()->endOfMonth();

        // Revenue from online payments
        $onlineRevenue = DB::table('booking_services')
            ->join('services', 'booking_services.service_id', '=', 'services.id')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->join('payments', 'bookings.id', '=', 'payments.booking_id')
            ->where('payments.status', 'paid')
            ->whereBetween('payments.created_at', [$startDate, $endDate])
            ->selectRaw('services.id, services.name, services.price, COUNT(DISTINCT bookings.id) as booking_count, SUM(services.price) as total_revenue')
            ->groupBy('services.id', 'services.name', 'services.price')
            ->get()
            ->keyBy('id');

        // Revenue from manual payments
        $manualRevenue = DB::table('booking_services')
            ->join('services', 'booking_services.service_id', '=', 'services.id')
            ->join('bookings', 'booking_services.booking_id', '=', 'bookings.id')
            ->join('manual_payments', 'bookings.id', '=', 'manual_payments.booking_id')
            ->whereBetween('manual_payments.created_at', [$startDate, $endDate])
            ->selectRaw('services.id, services.name, services.price, COUNT(DISTINCT bookings.id) as booking_count, SUM(services.price) as total_revenue')
            ->groupBy('services.id', 'services.name', 'services.price')
            ->get()
            ->keyBy('id');

        // Merge revenues
        $allServiceIds = $onlineRevenue->keys()->merge($manualRevenue->keys())->unique();
        $revenue = $allServiceIds->map(function ($serviceId) use ($onlineRevenue, $manualRevenue) {
            $online = $onlineRevenue->get($serviceId);
            $manual = $manualRevenue->get($serviceId);

            $bookingCount = ($online?->booking_count ?? 0) + ($manual?->booking_count ?? 0);
            $totalRevenue = ($online?->total_revenue ?? 0) + ($manual?->total_revenue ?? 0);

            return (object) [
                'id' => $serviceId,
                'name' => $online?->name ?? $manual?->name,
                'price' => $online?->price ?? $manual?->price,
                'booking_count' => $bookingCount,
                'total_revenue' => $totalRevenue,
            ];
        })->values();

        // Calculate total revenue by service
        $totalRevenueByService = $revenue->sum('total_revenue');

        \Log::info('Total Revenue by Service:', ['total' => $totalRevenueByService]);

        return response()->json([
            'revenue' => $revenue,
            'total_revenue_by_service' => $totalRevenueByService,
        ]);
    }

    public function consumableProductSales(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        $productSales = DB::table('service_product_usage')
            ->join('products', 'service_product_usage.product_id', '=', 'products.id')
            ->where('service_product_usage.status', 'Approved')
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                return $query->whereBetween('service_product_usage.created_at', [$startDate, $endDate]);
            })
            ->selectRaw('products.name, SUM(service_product_usage.quantity_used) as total_quantity, products.price, SUM(service_product_usage.quantity_used * products.price) as total_sales')
            ->groupBy('products.id', 'products.name', 'products.price')
            ->orderByDesc('total_sales')
            ->get();

        return response()->json($productSales);
    }

    // Booking Reports
    public function bookings(Request $request)
    {
        $startDate = $request->get('start_date') ?? now()->startOfMonth();
        $endDate = $request->get('end_date') ?? now()->endOfMonth();

        $bookingStatus = Booking::whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        $dailyBookings = Booking::whereBetween('date', [$startDate, $endDate])
            ->selectRaw('date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $servicePopularity = DB::table('booking_services')
            ->join('services', 'booking_services.service_id', '=', 'services.id')
            ->selectRaw('services.name, COUNT(*) as booking_count')
            ->groupBy('services.id', 'services.name')
            ->orderByDesc('booking_count')
            ->limit(10)
            ->get();

        $averageRating = DB::table('booking_services')
            ->whereNotNull('rating')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->avg('rating');

        $dailyRatings = DB::table('booking_services')
            ->whereNotNull('rating')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, AVG(rating) as avg_rating')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'booking_status' => $bookingStatus,
            'daily_bookings' => $dailyBookings,
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
