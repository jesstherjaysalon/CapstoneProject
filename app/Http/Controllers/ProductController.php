<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\InventoryCategory;
use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::with(['supplier', 'inventoryCategory'])
            ->orderBy('name')
            ->get();
        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'inventory_category_id' => 'required|exists:inventory_categories,id',
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'reorder_level' => 'integer|min:0',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category = InventoryCategory::find($validated['inventory_category_id']);

        if ($category->has_price && empty($validated['price'])) {
            return response()->json(['message' => 'Price is required for this category'], 422);
        }

        $product = Product::create($validated);
        $product->load(['supplier', 'inventoryCategory']);

        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        $product->load(['supplier', 'inventoryCategory', 'stockTransactions' => function ($query) {
            $query->orderBy('created_at', 'desc')->limit(20);
        }]);
        return response()->json($product);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'inventory_category_id' => 'required|exists:inventory_categories,id',
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:50',
            'reorder_level' => 'integer|min:0',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category = InventoryCategory::find($validated['inventory_category_id']);

        if ($category->has_price && empty($validated['price'])) {
            return response()->json(['message' => 'Price is required for this category'], 422);
        }

        $product->update($validated);
        $product->load(['supplier', 'inventoryCategory']);

        return response()->json($product);
    }

    public function destroy(Product $product)
    {
        if ($product->stockTransactions()->exists() || $product->serviceProductUsages()->exists()) {
            return response()->json(['message' => 'Cannot delete product with transactions or usage records'], 400);
        }

        $product->delete();
        return response()->json(null, 204);
    }

    public function addStock(Request $request, Product $product)
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'remarks' => 'nullable|string',
        ]);

        $receiptId = (string) Str::uuid();
        $transaction = DB::transaction(function () use ($product, $validated, $receiptId) {
            $referenceNumber = StockTransaction::nextReceiptReferenceNumber();

            return StockTransaction::create([
                'product_id' => $product->id,
                'user_id' => auth()->id(),
                'transaction_type' => 'IN',
                'quantity' => $validated['quantity'],
                'transaction_date' => now(),
                'remarks' => $validated['remarks'] ?? 'Stock added through legacy form',
                'receipt_id' => $receiptId,
                'supplier_id' => $product->supplier_id,
                'reference_number' => $referenceNumber,
                'unit_cost' => 0,
                'total_cost' => 0,
                'status' => 'pending',
            ]);
        });

        return response()->json([
            'product' => $product->fresh(),
            'transaction' => $transaction,
            'message' => 'Stock was recorded as a pending receipt and will be added after confirmation.',
        ], 202);
    }

    public function getLowStock()
    {
        $products = Product::with(['supplier', 'inventoryCategory'])
            ->lowStock()
            ->active()
            ->get();

        return response()->json($products);
    }

    public function getForService()
    {
        $products = Product::with(['inventoryCategory'])
            ->active()
            ->whereHas('inventoryCategory', function ($query) {
                $query->where('deduct_on_service', true);
            })
            ->get();

        return response()->json($products);
    }
}
