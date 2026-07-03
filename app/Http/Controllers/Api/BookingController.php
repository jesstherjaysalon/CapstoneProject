<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\BookingService;
use App\Models\ManualPayment;
use App\Models\Payment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $bookings = Booking::with(['services.service', 'services.jobOrder.profile.user', 'payments', 'manualPayments'])
            ->where('profile_id', $profile->id)
            ->orderBy('date', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $bookings]);
    }

    public function completed(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $bookings = Booking::with(['services.service', 'services.jobOrder.profile.user', 'payments', 'manualPayments'])
            ->where('profile_id', $profile->id)
            ->where('status', '!=', 'assigned')
            ->orderBy('date', 'desc')
            ->get()
            ->map(function ($booking) {
                // Get all booking services for this booking
                $bookingServiceIds = $booking->services()->pluck('id');

                // Get all job orders for these booking services
                $jobOrderIds = \App\Models\JobOrder::whereIn('booking_service_id', $bookingServiceIds)->pluck('id');

                // Get approved product usage for these job orders
                $productUsages = \App\Models\ServiceProductUsage::with('product')
                    ->whereIn('job_order_id', $jobOrderIds)
                    ->where('status', 'Approved')
                    ->whereHas('product', function ($query) {
                        $query->whereNotNull('price')->where('price', '>', 0);
                    })
                    ->get();

                $productCost = 0;
                foreach ($productUsages as $usage) {
                    $productCost += $usage->product->price * $usage->quantity_used;
                }

                $booking->product_cost = $productCost;
                return $booking;
            })
            ->toArray();

        return response()->json(['success' => true, 'data' => $bookings]);
    }

    public function productUsage(Request $request, $bookingId)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $booking = Booking::where('id', $bookingId)
            ->where('profile_id', $profile->id)
            ->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        }

        // Get all booking services for this booking
        $bookingServiceIds = $booking->services()->pluck('id');

        // Get all job orders for these booking services
        $jobOrderIds = \App\Models\JobOrder::whereIn('booking_service_id', $bookingServiceIds)->pluck('id');

        // Get product usage for these job orders, only include products with price and approved status
        $productUsages = \App\Models\ServiceProductUsage::with('product')
            ->whereIn('job_order_id', $jobOrderIds)
            ->where('status', 'Approved')
            ->whereHas('product', function ($query) {
                $query->whereNotNull('price')->where('price', '>', 0);
            })
            ->get();

        $totalCost = 0;
        $items = [];

        foreach ($productUsages as $usage) {
            $cost = $usage->product->price * $usage->quantity_used;
            $totalCost += $cost;
            $items[] = [
                'product_name' => $usage->product->name,
                'quantity' => $usage->quantity_used,
                'unit_price' => $usage->product->price,
                'total' => $cost,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_cost' => $totalCost,
                'items' => $items,
            ]
        ]);
    }

    public function rate(Request $request, $bookingId)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $booking = Booking::where('id', $bookingId)
            ->where('profile_id', $profile->id)
            ->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found'], 404);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedback' => ['nullable', 'string', 'max:1000'],
            'service_ratings' => ['nullable', 'array'],
            'service_ratings.*.booking_service_id' => ['required', 'integer'],
            'service_ratings.*.rating' => ['required', 'integer', 'min:1', 'max:5'],
        ]);

        // Update booking rating and feedback
        $booking->update([
            'rating' => $data['rating'],
            'feedback' => $data['feedback'] ?? null,
        ]);

        // Update service ratings if provided
        if (isset($data['service_ratings'])) {
            foreach ($data['service_ratings'] as $serviceRating) {
                $bookingService = BookingService::where('id', $serviceRating['booking_service_id'])
                    ->where('booking_id', $booking->id)
                    ->first();

                if ($bookingService) {
                    $bookingService->update(['rating' => $serviceRating['rating']]);
                }
            }
        }

        return response()->json(['success' => true, 'message' => 'Rating submitted successfully']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'services' => ['required', 'array', 'min:1'],
            'services.*' => ['integer'],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['nullable', 'date_format:H:i:s'],
            'total' => ['nullable', 'numeric'],
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $booking = Booking::create([
            'profile_id' => $profile->id,
            'date' => $data['date'],
            'status' => 'pending',
            'rating' => null,
            'feedback' => null,
        ]);

        // create booking_services entries
        $timeValue = $data['time'] ?? null;
        foreach ($data['services'] as $svcId) {
            BookingService::create([
                'booking_id' => $booking->id,
                'service_id' => $svcId,
                'status' => 'pending',
                'scheduled_time' => $timeValue,
            ]);
        }

        $booking->load('services');

        return response()->json([ 'success' => true, 'data' => $booking ]);
    }

    public function paymongo(Request $request)
    {
        $data = $request->validate([
            'services' => ['required', 'array', 'min:1'],
            'services.*' => ['integer'],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['nullable', 'date_format:H:i:s'],
            'total' => ['required', 'numeric', 'min:0'],
            'amount' => ['required', 'numeric', 'min:1'],
            'payment_method' => ['required', 'string', 'in:gcash,maya'],
            'payment_amount_type' => ['required', 'string', 'in:full,half'],
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $paymongoSecret = config('services.paymongo.secret');
        if (!$paymongoSecret) {
            return response()->json(['success' => false, 'message' => 'Paymongo secret is not configured'], 500);
        }

        $amountInCents = (int) round($data['amount'] * 100);
        if ($amountInCents <= 0) {
            return response()->json(['success' => false, 'message' => 'Payment amount must be greater than zero'], 422);
        }

        // Determine redirect base URL. Prefer explicit PAYMONGO_REDIRECT_BASE,
        // otherwise derive host+scheme from PAYMONGO_WEBHOOK_URL, fallback to APP_URL.
        $redirectBase = env('PAYMONGO_REDIRECT_BASE', '');
        $webhookUrl = env('PAYMONGO_WEBHOOK_URL', '');

        if (empty($redirectBase) && !empty($webhookUrl)) {
            $parts = parse_url($webhookUrl);
            if (!empty($parts['host'])) {
                $scheme = $parts['scheme'] ?? 'https';
                $redirectBase = $scheme . '://' . $parts['host'];
                if (!empty($parts['port'])) {
                    $redirectBase .= ':' . $parts['port'];
                }
            }
        }

        if (empty($redirectBase)) {
            $redirectBase = rtrim(env('APP_URL', 'http://localhost:8000'), '/');
        }

        $successRedirect = rtrim($redirectBase, '/') . '/payment/success';
        $failedRedirect = rtrim($redirectBase, '/') . '/payment/failed';

        \Log::info('Paymongo redirect URLs', ['success' => $successRedirect, 'failed' => $failedRedirect]);

        $paymongoResponse = Http::withBasicAuth($paymongoSecret, '')
            ->acceptJson()
            ->post('https://api.paymongo.com/v1/sources', [
                'data' => [
                    'attributes' => [
                        'type' => $data['payment_method'],
                        'amount' => $amountInCents,
                        'currency' => 'PHP',
                        'redirect' => [
                            'success' => $successRedirect,
                            'failed' => $failedRedirect,
                        ],
                    ],
                ],
            ]);

        \Log::info('PayMongo API response', [
            'status' => $paymongoResponse->status(),
            'ok' => $paymongoResponse->ok(),
            'body' => $paymongoResponse->body(),
        ]);

        if (!$paymongoResponse->ok()) {
            $payload = $paymongoResponse->json();
            \Log::error('Paymongo API Error', [
                'status' => $paymongoResponse->status(),
                'response' => $payload,
                'request_data' => [
                    'type' => $data['payment_method'],
                    'amount' => $amountInCents,
                    'currency' => 'PHP',
                ],
            ]);
            return response()->json([
                'success' => false,
                'message' => $payload['errors'][0]['detail'] ?? $payload['message'] ?? 'Paymongo payment initialization failed',
                'errors' => $payload['errors'] ?? null,
                'status' => $paymongoResponse->status(),
            ], $paymongoResponse->status());
        }

        $paymongoData = $paymongoResponse->json('data');
        $sourceId = data_get($paymongoData, 'id');
        $sourceStatus = data_get($paymongoData, 'attributes.status');

        $booking = Booking::create([
            'profile_id' => $profile->id,
            'date' => $data['date'],
            'status' => 'pending',
            'rating' => null,
            'feedback' => null,
        ]);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'payment_method' => $data['payment_method'],
            'amount' => $data['amount'],
            'amount_type' => $data['payment_amount_type'],
            'status' => 'pending',
            'paymongo_source_id' => $sourceId,
            'paymongo_source_status' => $sourceStatus,
        ]);

        \Log::info('Payment record created', [
            'payment_id' => $payment->id,
            'source_id' => $sourceId,
            'source_status' => $sourceStatus,
            'amount' => $data['amount'],
        ]);

        $timeValue = $data['time'] ?? null;
        foreach ($data['services'] as $svcId) {
            BookingService::create([
                'booking_id' => $booking->id,
                'service_id' => $svcId,
                'status' => 'pending',
                'scheduled_time' => $timeValue,
            ]);
        }

        $booking->load('services');

        return response()->json([ 'success' => true, 'data' => [ 'booking' => $booking, 'source' => $paymongoData ] ]);
    }

    public function cash(Request $request)
    {
        $data = $request->validate([
            'services' => ['required', 'array', 'min:1'],
            'services.*' => ['integer'],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['nullable', 'date_format:H:i:s'],
            'total' => ['nullable', 'numeric'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $booking = Booking::create([
            'profile_id' => $profile->id,
            'date' => $data['date'],
            'status' => 'pending',
            'rating' => null,
            'feedback' => null,
        ]);

        $timeValue = $data['time'] ?? null;
        foreach ($data['services'] as $svcId) {
            BookingService::create([
                'booking_id' => $booking->id,
                'service_id' => $svcId,
                'status' => 'pending',
                'scheduled_time' => $timeValue,
            ]);
        }

        $booking->load('services');

        return response()->json([ 'success' => true, 'data' => [ 'booking' => $booking ] ]);
    }

    public function completedServices(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $completedServices = BookingService::with(['booking', 'service'])
            ->whereHas('booking', function ($query) use ($profile) {
                $query->where('profile_id', $profile->id);
            })
            ->where('status', 'completed')
            ->whereNotNull('image')
            ->orderBy('updated_at', 'desc')
            ->take(10)
            ->get();

        return response()->json(['success' => true, 'data' => $completedServices]);
    }

    public function completedServicesByService(Request $request, $serviceId)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Profile not found'], 404);
        }

        $completedServices = BookingService::with(['booking', 'service'])
            ->whereHas('booking', function ($query) use ($profile) {
                $query->where('profile_id', $profile->id);
            })
            ->where('service_id', $serviceId)
            ->where('status', 'completed')
            ->whereNotNull('image')
            ->orderBy('updated_at', 'desc')
            ->take(10)
            ->get();

        return response()->json(['success' => true, 'data' => $completedServices]);
    }
}
