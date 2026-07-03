<?php

namespace App\Http\Controllers;

use App\Models\InventoryCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryCategoryController extends Controller
{
    public function index()
    {
        $categories = InventoryCategory::withCount('products')->get();
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:inventory_categories,name',
            'description' => 'nullable|string',
            'has_price' => 'boolean',
            'deduct_on_service' => 'boolean',
            'is_asset' => 'boolean',
        ]);

        $category = InventoryCategory::create($validated);
        return response()->json($category, 201);
    }

    public function show(InventoryCategory $inventoryCategory)
    {
        $inventoryCategory->load('products');
        return response()->json($inventoryCategory);
    }

    public function update(Request $request, InventoryCategory $inventoryCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:inventory_categories,name,' . $inventoryCategory->id,
            'description' => 'nullable|string',
            'has_price' => 'boolean',
            'deduct_on_service' => 'boolean',
            'is_asset' => 'boolean',
        ]);

        $inventoryCategory->update($validated);
        return response()->json($inventoryCategory);
    }

    public function destroy(InventoryCategory $inventoryCategory)
    {
        if ($inventoryCategory->products()->exists()) {
            return response()->json(['message' => 'Cannot delete category with associated products'], 400);
        }

        $inventoryCategory->delete();
        return response()->json(null, 204);
    }
}
