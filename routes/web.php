<?php

use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerProfileController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\StaffDashboardController;
use App\Http\Controllers\Auth\FaceVerificationController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\StaffRegistrationController;
use App\Http\Controllers\InventoryCategoryController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\StockTransactionController;
use App\Http\Controllers\ServiceProductUsageController;
use App\Http\Controllers\ReportsController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'staff'])->group(function () {
    Route::get('/staff/dashboard', [StaffDashboardController::class, 'index'])->name('staff.dashboard');
    Route::get('/staff/tasks', [StaffDashboardController::class, 'tasks'])->name('staff.tasks');
    Route::get('/staff/service-assignments', [StaffDashboardController::class, 'serviceAssignments'])->name('staff.service-assignments');
    Route::put('/staff/tasks/{jobOrder}', [StaffDashboardController::class, 'updateTaskStatus'])->name('staff.tasks.update');
    Route::post('/staff/tasks/{jobOrder}/upload-image', [StaffDashboardController::class, 'uploadCompletionImage'])->name('staff.tasks.upload-image');
    Route::post('/staff/service-product-usage', [ServiceProductUsageController::class, 'store'])->name('staff.service-product-usage.store');
    Route::post('/staff/service-product-usage/{serviceProductUsage}/return', [ServiceProductUsageController::class, 'return'])->name('staff.service-product-usage.return');
});

Route::middleware(['guest', 'pending.face'])->group(function () {
    Route::post('/face/verify', [FaceVerificationController::class, 'verify'])
        ->name('api.face.verify');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('/admin/booking-calendar', [AdminDashboardController::class, 'bookingCalendar'])->name('admin.booking-calendar');
    
    Route::get('/staff', [StaffController::class, 'index'])->name('staff.index');
    Route::post('/staff', [StaffController::class, 'store'])->name('staff.store');

    Route::get('/admin/services-management', [ServiceController::class, 'index'])->name('admin.services.management');

    Route::post('/admin/categories', [CategoryController::class, 'store'])->name('admin.categories.store');
    Route::put('/admin/categories/{id}', [CategoryController::class, 'update'])->name('admin.categories.update');
    Route::delete('/admin/categories/{id}', [CategoryController::class, 'destroy'])->name('admin.categories.destroy');

    Route::post('/admin/services', [ServiceController::class, 'store'])->name('admin.services.store');
    Route::put('/admin/services/{id}', [ServiceController::class, 'update'])->name('admin.services.update');
    Route::delete('/admin/services/{id}', [ServiceController::class, 'destroy'])->name('admin.services.destroy');

    Route::get('/admin/schedule-management', [ScheduleController::class, 'index'])->name('admin.schedule.index');
    Route::post('/admin/schedule', [ScheduleController::class, 'store'])->name('admin.schedule.store');
    Route::put('/admin/schedule/{id}', [ScheduleController::class, 'update'])->name('admin.schedule.update');
    Route::delete('/admin/schedule/{id}', [ScheduleController::class, 'destroy'])->name('admin.schedule.destroy');

    Route::get('/admin/appointments', [AppointmentController::class, 'index'])->name('admin.appointments.index');
    Route::put('/admin/appointments/{booking}', [AppointmentController::class, 'updateBookingStatus'])->name('admin.appointments.booking.update');
    Route::put('/admin/appointments/service/{bookingService}', [AppointmentController::class, 'updateServiceStatus'])->name('admin.appointments.service.update');
    Route::put('/admin/appointments/service/{bookingService}/assign', [AppointmentController::class, 'assignStaff'])->name('admin.appointments.service.assign');
    Route::put('/admin/payments/{payment}', [AppointmentController::class, 'updatePayment'])->name('admin.payments.update');
    Route::post('/admin/manual-payments', [AppointmentController::class, 'createManualPayment'])->name('admin.manual-payments.store');

    Route::get('/admin/job-orders', [AppointmentController::class, 'jobOrders'])->name('admin.job-orders.index');
    Route::put('/admin/job-orders/{jobOrder}', [AppointmentController::class, 'updateJobOrderStatus'])->name('admin.job-orders.update');
    Route::put('/admin/job-orders/{jobOrder}/edit', [AppointmentController::class, 'updateJobOrder'])->name('admin.job-orders.edit');

    Route::get('/admin/inventory-management', function () {
        return Inertia::render('Admin/InventoryManagement');
    })->name('admin.inventory-management.index');

    // Inventory Management Routes
    Route::get('/admin/inventory-categories', [InventoryCategoryController::class, 'index'])->name('admin.inventory-categories.index');
    Route::post('/admin/inventory-categories', [InventoryCategoryController::class, 'store'])->name('admin.inventory-categories.store');
    Route::get('/admin/inventory-categories/{inventoryCategory}', [InventoryCategoryController::class, 'show'])->name('admin.inventory-categories.show');
    Route::put('/admin/inventory-categories/{inventoryCategory}', [InventoryCategoryController::class, 'update'])->name('admin.inventory-categories.update');
    Route::delete('/admin/inventory-categories/{inventoryCategory}', [InventoryCategoryController::class, 'destroy'])->name('admin.inventory-categories.destroy');

    Route::get('/admin/suppliers', [SupplierController::class, 'index'])->name('admin.suppliers.index');
    Route::post('/admin/suppliers', [SupplierController::class, 'store'])->name('admin.suppliers.store');
    Route::get('/admin/suppliers/{supplier}', [SupplierController::class, 'show'])->name('admin.suppliers.show');
    Route::put('/admin/suppliers/{supplier}', [SupplierController::class, 'update'])->name('admin.suppliers.update');
    Route::delete('/admin/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('admin.suppliers.destroy');

    Route::get('/admin/products/low-stock', [ProductController::class, 'getLowStock'])->name('admin.products.low-stock');
    Route::get('/admin/products/for-service', [ProductController::class, 'getForService'])->name('admin.products.for-service');
    Route::get('/admin/products', [ProductController::class, 'index'])->name('admin.products.index');
    Route::post('/admin/products', [ProductController::class, 'store'])->name('admin.products.store');
    Route::get('/admin/products/{product}', [ProductController::class, 'show'])->name('admin.products.show');
    Route::put('/admin/products/{product}', [ProductController::class, 'update'])->name('admin.products.update');
    Route::delete('/admin/products/{product}', [ProductController::class, 'destroy'])->name('admin.products.destroy');
    Route::post('/admin/products/{product}/add-stock', [ProductController::class, 'addStock'])->name('admin.products.add-stock');

    Route::get('/admin/stock-transactions', [StockTransactionController::class, 'index'])->name('admin.stock-transactions.index');
    Route::get('/admin/stock-transactions/{stockTransaction}', [StockTransactionController::class, 'show'])->name('admin.stock-transactions.show');

    Route::get('/admin/service-product-usage', [ServiceProductUsageController::class, 'index'])->name('admin.service-product-usage.index');
    Route::post('/admin/service-product-usage', [ServiceProductUsageController::class, 'store'])->name('admin.service-product-usage.store');
    Route::get('/admin/service-product-usage/{serviceProductUsage}', [ServiceProductUsageController::class, 'show'])->name('admin.service-product-usage.show');
    Route::put('/admin/service-product-usage/{serviceProductUsage}', [ServiceProductUsageController::class, 'update'])->name('admin.service-product-usage.update');
    Route::delete('/admin/service-product-usage/{serviceProductUsage}', [ServiceProductUsageController::class, 'destroy'])->name('admin.service-product-usage.destroy');
    Route::post('/admin/service-product-usage/{serviceProductUsage}/approve', [ServiceProductUsageController::class, 'approve'])->name('admin.service-product-usage.approve');
    Route::post('/admin/service-product-usage/{serviceProductUsage}/reject', [ServiceProductUsageController::class, 'reject'])->name('admin.service-product-usage.reject');
    Route::post('/admin/service-product-usage/{serviceProductUsage}/return', [ServiceProductUsageController::class, 'return'])->name('admin.service-product-usage.return');

    // Reports Routes
    Route::get('/admin/reports', [ReportsController::class, 'index'])->name('admin.reports.index');
    Route::get('/admin/reports/overview', [ReportsController::class, 'overview'])->name('admin.reports.overview');
    Route::get('/admin/reports/financial', [ReportsController::class, 'financial'])->name('admin.reports.financial');
    Route::get('/admin/reports/revenue-by-service', [ReportsController::class, 'revenueByService'])->name('admin.reports.revenue-by-service');
    Route::get('/admin/reports/consumable-product-sales', [ReportsController::class, 'consumableProductSales'])->name('admin.reports.consumable-product-sales');
    Route::get('/admin/reports/bookings', [ReportsController::class, 'bookings'])->name('admin.reports.bookings');
    Route::get('/admin/reports/job-orders', [ReportsController::class, 'jobOrders'])->name('admin.reports.job-orders');
    Route::get('/admin/reports/inventory', [ReportsController::class, 'inventory'])->name('admin.reports.inventory');
    Route::get('/admin/reports/customers', [ReportsController::class, 'customers'])->name('admin.reports.customers');
    Route::get('/admin/reports/staff', [ReportsController::class, 'staff'])->name('admin.reports.staff');
});

Route::middleware(['signed', 'pending.staff'])->group(function () {
    Route::get('/staff/profile/create/{user}', [StaffRegistrationController::class, 'createProfile'])
        ->name('staff.profile.create');

    Route::post('/staff/profile/create/{user}', [StaffRegistrationController::class, 'storeProfile'])
        ->name('staff.profile.store');

    Route::get('/staff/face/register/{user}', [StaffRegistrationController::class, 'showFaceRegistration'])
        ->name('staff.face.register');

    Route::post('/staff/face/register/{user}', [StaffRegistrationController::class, 'storeFaceRegistration'])
        ->name('staff.face.store');
});

Route::middleware(['signed'])->group(function () {
    Route::get('/customer/profile/complete/{user}', [CustomerProfileController::class, 'showCompletion'])
        ->name('customer.profile.complete');

    Route::post('/customer/profile/complete/{user}', [CustomerProfileController::class, 'storeProfile'])
        ->name('customer.profile.store');

    Route::get('/customer/face/register/{user}', [CustomerProfileController::class, 'showFaceRegistration'])
        ->name('customer.face.register');

    Route::post('/customer/face/register/{user}', [CustomerProfileController::class, 'storeFaceData'])
        ->name('customer.face.store');
});

// Route::post('/webhook/paymongo', [PaymentWebhookController::class, 'paymongo']);

Route::get('/payment/success', function () {
    return response('<h1>Payment successful</h1><p>Your payment has been completed successfully.</p>', 200)
        ->header('Content-Type', 'text/html');
});

Route::get('/payment/failed', function () {
    return response('<h1>Payment failed</h1><p>Your payment did not complete. Please try again.</p>', 200)
        ->header('Content-Type', 'text/html');
});

require __DIR__.'/auth.php';
