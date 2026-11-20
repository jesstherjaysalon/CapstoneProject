<?php

namespace Tests\Feature;

use App\Models\InventoryCategory;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceivingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_receipt_keeps_stock_unchanged_until_confirmation_and_confirms_all_lines_once(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'status' => User::STATUS_ACTIVE,
        ]);
        $supplier = Supplier::create(['name' => 'Parts Supplier', 'contact' => '09123456789']);
        $category = InventoryCategory::create([
            'name' => 'Consumables',
            'description' => 'Shop supplies',
            'has_price' => false,
            'deduct_on_service' => true,
            'is_asset' => false,
        ]);
        $firstProduct = $this->createProduct($category, 'Oil Filter', 8);
        $secondProduct = $this->createProduct($category, 'Brake Cleaner', 3);

        $response = $this->actingAs($admin)->postJson('/admin/receivings', [
            'supplier_id' => $supplier->id,
            'transaction_date' => '2026-11-20',
            'remarks' => 'Morning delivery',
            'items' => [
                ['product_id' => $firstProduct->id, 'quantity' => 4, 'unit_cost' => 12.50],
                ['product_id' => $secondProduct->id, 'quantity' => 2, 'unit_cost' => 18],
            ],
        ])->assertCreated()
            ->assertJsonPath('reference_number', '000001')
            ->assertJsonPath('status', 'pending');

        $receiptId = $response->json('id');
        $this->assertSame(8, $firstProduct->fresh()->current_stock);
        $this->assertSame(3, $secondProduct->fresh()->current_stock);
        $this->assertDatabaseHas('stock_transactions', [
            'receipt_id' => $receiptId,
            'product_id' => $firstProduct->id,
            'status' => 'pending',
            'total_cost' => '50.00',
        ]);

        $this->actingAs($admin)
            ->postJson("/admin/receivings/{$receiptId}/confirm")
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');

        $this->assertSame(12, $firstProduct->fresh()->current_stock);
        $this->assertSame(5, $secondProduct->fresh()->current_stock);
        $this->assertDatabaseMissing('stock_transactions', [
            'receipt_id' => $receiptId,
            'status' => 'pending',
        ]);

        $this->postJson("/admin/receivings/{$receiptId}/confirm")->assertStatus(409);
        $this->assertSame(12, $firstProduct->fresh()->current_stock);
        $this->assertSame(5, $secondProduct->fresh()->current_stock);
    }

    public function test_legacy_add_stock_endpoint_creates_a_pending_receipt_without_changing_stock(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'status' => User::STATUS_ACTIVE,
        ]);
        $category = InventoryCategory::create([
            'name' => 'Parts',
            'description' => null,
            'has_price' => false,
            'deduct_on_service' => false,
            'is_asset' => false,
        ]);
        $product = $this->createProduct($category, 'Air Filter', 6);

        $response = $this->actingAs($admin)
            ->postJson("/admin/products/{$product->id}/add-stock", ['quantity' => 3])
            ->assertStatus(202)
            ->assertJsonPath('transaction.status', 'pending');

        $this->assertSame(6, $product->fresh()->current_stock);
        $this->assertDatabaseHas('stock_transactions', [
            'receipt_id' => $response->json('transaction.receipt_id'),
            'product_id' => $product->id,
            'quantity' => 3,
            'status' => 'pending',
        ]);
    }

    public function test_product_create_and_update_cannot_change_available_stock_directly(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'status' => User::STATUS_ACTIVE,
        ]);
        $category = InventoryCategory::create([
            'name' => 'Fluids',
            'description' => null,
            'has_price' => false,
            'deduct_on_service' => true,
            'is_asset' => false,
        ]);

        $response = $this->actingAs($admin)->postJson('/admin/products', [
            'inventory_category_id' => $category->id,
            'name' => 'Engine Oil',
            'unit' => 'bottle',
            'current_stock' => 50,
            'reorder_level' => 5,
            'is_active' => true,
        ])->assertCreated();

        $productId = $response->json('id');
        $this->assertSame(0, Product::findOrFail($productId)->current_stock);

        $this->putJson("/admin/products/{$productId}", [
            'inventory_category_id' => $category->id,
            'name' => 'Engine Oil',
            'unit' => 'bottle',
            'current_stock' => 90,
            'reorder_level' => 5,
            'is_active' => true,
        ])->assertOk();

        $this->assertSame(0, Product::findOrFail($productId)->current_stock);
    }

    private function createProduct(InventoryCategory $category, string $name, int $stock): Product
    {
        return Product::create([
            'inventory_category_id' => $category->id,
            'name' => $name,
            'unit' => 'pcs',
            'current_stock' => $stock,
            'reorder_level' => 2,
            'price' => null,
            'is_active' => true,
        ]);
    }
}
