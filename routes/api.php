<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\CustomerFaceVerificationController;
use App\Http\Controllers\Api\CustomerProfileApiController;
use App\Http\Controllers\Auth\FaceVerificationController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\PaymentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Guest API routes (no authentication required)
Route::middleware('guest')->group(function () {
    Route::post('/register', [RegisterController::class, 'store']);
    Route::post('/login', [LoginController::class, 'store']);
    Route::post('/login/otp/send', [LoginController::class, 'sendOtp']);
    Route::post('/login/otp/verify', [LoginController::class, 'verifyOtp']);
});

// Paymongo webhook (no authentication required)
Route::post('/webhook/paymongo', [PaymentWebhookController::class, 'paymongo']);

// Route::middleware(['guest', 'pending.face'])->group(function () {
//     Route::post('/face/verify', [FaceVerificationController::class, 'verify'])
//         ->name('api.face.verify');
// });

// Customer mobile face verification
Route::post('/customer/face/verify', [CustomerFaceVerificationController::class, 'verify'])
    ->name('api.customer.face.verify');

// Public services listing
Route::get('/services', [ServiceController::class, 'index']);
// Service details
Route::get('/services/{id}', [ServiceController::class, 'show']);

// Schedules and slots
Route::get('/schedules', [ScheduleController::class, 'index']);
Route::get('/schedules/slots', [ScheduleController::class, 'slots']);

// Authenticated API routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return response()->json([
            'success' => true,
            'data' => $request->user(),
        ]);
    });

    Route::post('/logout', [LoginController::class, 'destroy']);
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/completed', [BookingController::class, 'completed']);
    Route::get('/bookings/{bookingId}/product-usage', [BookingController::class, 'productUsage']);
    Route::post('/bookings/{bookingId}/rate', [BookingController::class, 'rate']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::post('/bookings/cash', [BookingController::class, 'cash']);
    Route::get('/bookings/completed-services', [BookingController::class, 'completedServices']);
    Route::get('/bookings/completed-services/{serviceId}', [BookingController::class, 'completedServicesByService']);
    Route::post('/payments/paymongo', [BookingController::class, 'paymongo']);
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::put('/payments/{payment}', [PaymentController::class, 'update']);

    // Customer profile completion
    Route::post('/customer/profile', [CustomerProfileApiController::class, 'completeProfile']);
    Route::post('/customer/face', [CustomerProfileApiController::class, 'registerFace']);
    Route::apiResource('vehicles', VehicleController::class)->except(['create', 'edit']);
});


