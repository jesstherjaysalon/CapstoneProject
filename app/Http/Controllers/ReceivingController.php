<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class ReceivingController extends Controller
{
    public function index()
    {
        $receipts = StockTransaction::with(['product.inventoryCategory', 'supplier'])
            ->whereNotNull('receipt_id')
            ->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('receipt_id')
            ->map(function ($lines, $receiptId) {
                $receipt = $lines->first();

                return [
                    'id' => $receiptId,
                    'supplier' => $receipt->supplier,
                    'reference_number' => $receipt->reference_number,
                    'transaction_date' => $receipt->transaction_date,
                    'remarks' => $receipt->remarks,
                    'status' => $receipt->status,
                    'confirmed_at' => $receipt->confirmed_at,
                    'total_cost' => $lines->sum(fn ($line) => (float) $line->total_cost),
                    'items' => $lines->values(),
                ];
            })
            ->values();

        return response()->json($receipts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => [
                'required',
                Rule::exists('suppliers', 'id')->whereNull('deleted_at'),
            ],
            'transaction_date' => 'required|date_format:Y-m-d',
            'remarks' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => [
                'required',
                'distinct',
                Rule::exists('products', 'id')->where(function ($query) {
                    $query->whereNull('deleted_at')->where('is_active', true);
                }),
            ],
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0|max:99999999.99',
        ]);

        $receiptId = (string) Str::uuid();

        $referenceNumber = DB::transaction(function () use ($validated, $receiptId) {
            $referenceNumber = StockTransaction::nextReceiptReferenceNumber();

            foreach ($validated['items'] as $item) {
                $unitCost = round((float) $item['unit_cost'], 2);

                StockTransaction::create([
                    'product_id' => $item['product_id'],
                    'user_id' => auth()->id(),
                    'transaction_type' => 'IN',
                    'quantity' => $item['quantity'],
                    'transaction_date' => $validated['transaction_date'],
                    'remarks' => $validated['remarks'] ?? null,
                    'receipt_id' => $receiptId,
                    'supplier_id' => $validated['supplier_id'],
                    'reference_number' => $referenceNumber,
                    'unit_cost' => $unitCost,
                    'total_cost' => round($unitCost * $item['quantity'], 2),
                    'status' => 'pending',
                ]);
            }

            return $referenceNumber;
        });

        return response()->json([
            'id' => $receiptId,
            'reference_number' => $referenceNumber,
            'status' => 'pending',
            'message' => 'Receiving transaction saved. Confirm it to update inventory stock.',
        ], 201);
    }

    public function confirm(string $receiptId)
    {
        DB::transaction(function () use ($receiptId) {
            $lines = StockTransaction::where('receipt_id', $receiptId)
                ->orderBy('product_id')
                ->lockForUpdate()
                ->get();

            if ($lines->isEmpty()) {
                abort(404, 'Receiving transaction not found.');
            }

            if ($lines->contains(fn ($line) => $line->status !== 'pending')) {
                abort(409, 'Only pending receiving transactions can be confirmed.');
            }

            foreach ($lines as $line) {
                $product = Product::whereKey($line->product_id)->lockForUpdate()->firstOrFail();
                $product->current_stock += $line->quantity;
                $product->save();
            }

            StockTransaction::where('receipt_id', $receiptId)->update([
                'status' => 'confirmed',
                'confirmed_at' => now(),
            ]);
        });

        return response()->json([
            'id' => $receiptId,
            'status' => 'confirmed',
            'message' => 'Receiving transaction confirmed and inventory stock updated.',
        ]);
    }
}
