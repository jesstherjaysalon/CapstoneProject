<?php

namespace App\Http\Controllers;

use App\Models\ServiceProductUsage;
use App\Models\Product;
use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceProductUsageController extends Controller
{
    public function index(Request $request)
    {
        $query = ServiceProductUsage::with(['product.inventoryCategory', 'jobOrder']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('job_order_id')) {
            $query->where('job_order_id', $request->job_order_id);
        }

        $usages = $query->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($usages);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'job_order_id' => 'required|exists:job_orders,id',
                'product_id' => 'required|exists:products,id',
                'quantity_used' => 'required|integer|min:1',
            ]);

            $product = Product::with('inventoryCategory')->find($validated['product_id']);

            if (!$product) {
                return response()->json(['message' => 'Product not found'], 404);
            }

            if (!$product->inventoryCategory) {
                return response()->json(['message' => 'Product has no category assigned'], 422);
            }

            if (!$product->inventoryCategory->deduct_on_service) {
                return response()->json(['message' => 'This product category cannot be requested for service'], 422);
            }

            $usage = ServiceProductUsage::create([
                'job_order_id' => $validated['job_order_id'],
                'product_id' => $validated['product_id'],
                'quantity_used' => $validated['quantity_used'],
                'status' => 'Pending',
            ]);
            $usage->load(['product.inventoryCategory', 'jobOrder']);

            return response()->json($usage, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function show(ServiceProductUsage $serviceProductUsage)
    {
        $serviceProductUsage->load(['product.inventoryCategory', 'jobOrder']);
        return response()->json($serviceProductUsage);
    }

    public function update(Request $request, ServiceProductUsage $serviceProductUsage)
    {
        if ($serviceProductUsage->status !== 'Pending') {
            return response()->json(['message' => 'Can only update pending requests'], 400);
        }

        $validated = $request->validate([
            'quantity_used' => 'required|integer|min:1',
        ]);

        $serviceProductUsage->update($validated);
        $serviceProductUsage->load(['product.inventoryCategory', 'jobOrder']);

        return response()->json($serviceProductUsage);
    }

    public function approve(ServiceProductUsage $serviceProductUsage)
    {
        if ($serviceProductUsage->status !== 'Pending') {
            return response()->json(['message' => 'Can only approve pending requests'], 400);
        }

        $product = Product::find($serviceProductUsage->product_id);

        if ($product->current_stock < $serviceProductUsage->quantity_used) {
            return response()->json([
                'message' => 'Insufficient stock',
                'available' => $product->current_stock,
                'requested' => $serviceProductUsage->quantity_used
            ], 400);
        }

        DB::transaction(function () use ($serviceProductUsage, $product) {
            $serviceProductUsage->update(['status' => 'Approved']);

            $product->decrement('current_stock', $serviceProductUsage->quantity_used);

            StockTransaction::create([
                'product_id' => $product->id,
                'user_id' => auth()->id(),
                'transaction_type' => 'OUT',
                'quantity' => $serviceProductUsage->quantity_used,
                'transaction_date' => now(),
                'remarks' => "Job Order #{$serviceProductUsage->job_order_id}",
            ]);
        });

        $serviceProductUsage->refresh();
        $serviceProductUsage->load(['product.inventoryCategory', 'jobOrder']);

        return response()->json($serviceProductUsage);
    }

    public function reject(ServiceProductUsage $serviceProductUsage)
    {
        if ($serviceProductUsage->status !== 'Pending') {
            return response()->json(['message' => 'Can only reject pending requests'], 400);
        }

        $serviceProductUsage->update(['status' => 'Rejected']);
        $serviceProductUsage->load(['product.inventoryCategory', 'jobOrder']);

        return response()->json($serviceProductUsage);
    }

    public function destroy(ServiceProductUsage $serviceProductUsage)
    {
        if ($serviceProductUsage->status !== 'Pending') {
            return response()->json(['message' => 'Can only delete pending requests'], 400);
        }

        $serviceProductUsage->delete();
        return response()->json(null, 204);
    }

    public function return(ServiceProductUsage $serviceProductUsage)
    {
        if ($serviceProductUsage->status !== 'Approved') {
            return response()->json(['message' => 'Can only return approved requests'], 400);
        }

        if ($serviceProductUsage->returned_at !== null) {
            return response()->json(['message' => 'Product already returned'], 400);
        }

        $product = Product::with('inventoryCategory')->find($serviceProductUsage->product_id);

        if (!$product->inventoryCategory || !$product->inventoryCategory->is_asset) {
            return response()->json(['message' => 'This product is not returnable'], 400);
        }

        DB::transaction(function () use ($serviceProductUsage, $product) {
            $serviceProductUsage->update(['returned_at' => now()]);

            $product->increment('current_stock', $serviceProductUsage->quantity_used);

            StockTransaction::create([
                'product_id' => $product->id,
                'user_id' => auth()->id(),
                'transaction_type' => 'IN',
                'quantity' => $serviceProductUsage->quantity_used,
                'transaction_date' => now(),
                'remarks' => "Returned from Job Order #{$serviceProductUsage->job_order_id}",
            ]);
        });

        $serviceProductUsage->refresh();
        $serviceProductUsage->load(['product.inventoryCategory', 'jobOrder']);

        return response()->json($serviceProductUsage);
    }
}
