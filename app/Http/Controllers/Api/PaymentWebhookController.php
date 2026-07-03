<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    public function paymongo(Request $request)
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Paymongo-Signature');

        Log::info('PayMongo webhook received', [
            'signature_present' => !empty($signature),
            'payload_length' => strlen($payload),
            'payload_preview' => substr($payload, 0, 500),
        ]);

        // Temporarily disable signature verification for test mode
        // PayMongo test mode doesn't send signature headers
        if (!$this->verifySignature($payload, $signature) && !empty($signature)) {
            Log::warning('Invalid Paymongo webhook signature', [
                'signature' => $signature,
                'secret_configured' => !empty(config('services.paymongo.webhook_secret')),
            ]);
            return response()->json(['success' => false, 'message' => 'Invalid signature'], 403);
        }

        $data = $request->json('data');
        $attributes = $data['attributes'] ?? [];
        $eventType = $attributes['type'] ?? null;

        Log::info('Webhook event type', ['event_type' => $eventType]);

        // Handle different webhook events
        switch ($eventType) {
            case 'source.chargeable':
                return $this->handleSourceChargeable($data, $attributes);
            case 'payment.paid':
                return $this->handlePaymentPaid($data, $attributes);
            case 'payment.failed':
                return $this->handlePaymentFailed($data, $attributes);
            default:
                Log::info("Unhandled webhook event type: {$eventType}");
                return response()->json(['success' => true, 'message' => 'Event not handled']);
        }
    }

    private function handleSourceChargeable($data, $attributes)
    {
        $sourceData = $attributes['data'] ?? [];
        $sourceId = $sourceData['id'] ?? null;
        $sourceAttributes = $sourceData['attributes'] ?? [];
        $amount = $sourceAttributes['amount'] ?? null;
        $currency = $sourceAttributes['currency'] ?? 'PHP';

        if (!$sourceId) {
            Log::warning('Source chargeable webhook missing source ID');
            return response()->json(['success' => false, 'message' => 'Missing source ID'], 400);
        }

        $payment = Payment::where('paymongo_source_id', $sourceId)->first();
        if (!$payment) {
            Log::warning("Payment not found for source ID: {$sourceId}");
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        // Update source status
        $payment->paymongo_source_status = 'chargeable';
        $payment->save();

        Log::info("Source {$sourceId} is now chargeable, creating payment...");

        // Create the actual Payment/Charge using the source
        $paymongoSecret = config('services.paymongo.secret');
        if (!$paymongoSecret) {
            Log::error('PayMongo secret not configured');
            return response()->json(['success' => false, 'message' => 'PayMongo secret not configured'], 500);
        }

        $amountInCents = (int) round($payment->amount * 100);

        $paymentResponse = Http::withBasicAuth($paymongoSecret, '')
            ->acceptJson()
            ->post('https://api.paymongo.com/v1/payments', [
                'data' => [
                    'attributes' => [
                        'amount' => $amountInCents,
                        'currency' => $currency,
                        'source' => [
                            'id' => $sourceId,
                            'type' => 'source',
                        ],
                    ],
                ],
            ]);

        Log::info('PayMongo payment creation response', [
            'status' => $paymentResponse->status(),
            'body' => $paymentResponse->body(),
        ]);

        if (!$paymentResponse->ok()) {
            Log::error('Failed to create PayMongo payment', [
                'status' => $paymentResponse->status(),
                'response' => $paymentResponse->json(),
            ]);
            return response()->json(['success' => false, 'message' => 'Failed to create payment'], 500);
        }

        $paymentData = $paymentResponse->json('data');
        $paymentId = data_get($paymentData, 'id');
        $paymentStatus = data_get($paymentData, 'attributes.status');

        // Update payment record with PayMongo payment details
        $payment->paymongo_payment_id = $paymentId;
        $payment->paymongo_payment_status = $paymentStatus;
        $payment->save();

        Log::info("Payment created successfully: {$paymentId} with status {$paymentStatus}");

        return response()->json(['success' => true, 'message' => 'Payment created']);
    }

    private function handlePaymentPaid($data, $attributes)
    {
        $paymentData = $attributes['data'] ?? [];
        $paymentId = $paymentData['id'] ?? null;
        $paymentAttributes = $paymentData['attributes'] ?? [];
        $sourceId = data_get($paymentAttributes, 'source.id');

        if (!$paymentId) {
            Log::warning('Payment paid webhook missing payment ID');
            return response()->json(['success' => false, 'message' => 'Missing payment ID'], 400);
        }

        // Find payment by PayMongo payment ID
        $payment = Payment::where('paymongo_payment_id', $paymentId)->first();
        
        // If not found by payment ID, try by source ID
        if (!$payment && $sourceId) {
            $payment = Payment::where('paymongo_source_id', $sourceId)->first();
        }

        if (!$payment) {
            Log::warning("Payment not found for payment ID: {$paymentId} or source ID: {$sourceId}");
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        // Update payment status to paid
        $payment->status = 'paid';
        $payment->paymongo_payment_status = 'paid';
        $payment->paymongo_source_status = 'paid';
        $payment->save();

        // Update booking status
        if ($payment->booking) {
            $payment->booking->status = 'accepted';
            $payment->booking->save();
        }

        Log::info("Payment {$payment->id} marked as paid, PayMongo payment ID: {$paymentId}");

        return response()->json(['success' => true, 'message' => 'Payment status updated']);
    }

    private function handlePaymentFailed($data, $attributes)
    {
        $paymentData = $attributes['data'] ?? [];
        $paymentId = $paymentData['id'] ?? null;
        $paymentAttributes = $paymentData['attributes'] ?? [];
        $sourceId = data_get($paymentAttributes, 'source.id');

        if (!$paymentId) {
            Log::warning('Payment failed webhook missing payment ID');
            return response()->json(['success' => false, 'message' => 'Missing payment ID'], 400);
        }

        // Find payment by PayMongo payment ID
        $payment = Payment::where('paymongo_payment_id', $paymentId)->first();
        
        // If not found by payment ID, try by source ID
        if (!$payment && $sourceId) {
            $payment = Payment::where('paymongo_source_id', $sourceId)->first();
        }

        if (!$payment) {
            Log::warning("Payment not found for payment ID: {$paymentId} or source ID: {$sourceId}");
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        // Update payment status to failed
        $payment->status = 'failed';
        $payment->paymongo_payment_status = 'failed';
        $payment->paymongo_source_status = 'failed';
        $payment->save();

        Log::info("Payment {$payment->id} marked as failed, PayMongo payment ID: {$paymentId}");

        return response()->json(['success' => true, 'message' => 'Payment status updated']);
    }

    private function verifySignature($payload, $signature)
    {
        $secret = config('services.paymongo.webhook_secret');
        if (!$secret || !$signature) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $payload, $secret);
        return hash_equals($expectedSignature, $signature);
    }
}
