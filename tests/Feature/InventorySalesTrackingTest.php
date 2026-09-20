<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingService;
use App\Models\Category;
use App\Models\InventoryCategory;
use App\Models\JobOrder;
use App\Models\Product;
use App\Models\Profile;
use App\Models\Service;
use App\Models\ServiceProductUsage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventorySalesTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_product_usage_with_customer_and_appointment_details(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'status' => User::STATUS_ACTIVE,
        ]);

        $customer = User::factory()->create([
            'role' => 'Customer',
            'status' => User::STATUS_ACTIVE,
        ]);
        $customerProfile = Profile::create([
            'user_id' => $customer->id,
            'first_name' => 'Jane',
            'last_name' => 'Customer',
            'phone' => '09123456789',
            'address' => 'Sample Address',
        ]);

        $staff = User::factory()->create([
            'role' => 'Staff',
            'status' => User::STATUS_ACTIVE,
        ]);
        $staffProfile = Profile::create([
            'user_id' => $staff->id,
            'first_name' => 'John',
            'last_name' => 'Staff',
            'phone' => '09987654321',
            'address' => 'Staff Address',
        ]);

        $category = Category::create([
            'name' => 'Maintenance',
            'description' => 'Car maintenance services',
        ]);

        $service = Service::create([
            'category_id' => $category->id,
            'name' => 'Oil Change',
            'description' => 'Oil change service',
            'price' => 1500,
        ]);

        $inventoryCategory = InventoryCategory::create([
            'name' => 'Consumables',
            'description' => 'Consumable products',
            'has_price' => true,
            'deduct_on_service' => true,
            'is_asset' => false,
        ]);

        $product = Product::create([
            'supplier_id' => null,
            'inventory_category_id' => $inventoryCategory->id,
            'name' => 'Oil Filter',
            'unit' => 'pcs',
            'current_stock' => 20,
            'reorder_level' => 5,
            'price' => 250,
            'description' => 'Engine oil filter',
            'is_active' => true,
        ]);

        $booking = Booking::create([
            'profile_id' => $customerProfile->id,
            'date' => '2026-09-17',
            'status' => 'completed',
        ]);

        $bookingService = BookingService::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'status' => 'completed',
            'scheduled_time' => '09:00',
        ]);

        $jobOrder = JobOrder::create([
            'booking_service_id' => $bookingService->id,
            'profile_id' => $staffProfile->id,
            'status' => 'completed',
            'start_time' => '2026-09-17 09:00:00',
            'end_time' => '2026-09-17 10:00:00',
        ]);

        ServiceProductUsage::create([
            'job_order_id' => $jobOrder->id,
            'product_id' => $product->id,
            'quantity_used' => 2,
            'status' => 'Approved',
        ]);

        $response = $this->actingAs($admin)->getJson('/admin/service-product-usage');

        $response->assertOk();
        $response->assertJsonPath('data.0.product.name', 'Oil Filter');
        $response->assertJsonPath('data.0.job_order.booking_service.booking.profile.first_name', 'Jane');
        $response->assertJsonPath('data.0.job_order.profile.user.name', 'John Staff');
    }

    public function test_asset_product_can_be_requested_for_service_usage(): void
    {
        $staff = User::factory()->create([
            'role' => 'Staff',
            'status' => User::STATUS_ACTIVE,
        ]);
        $staffProfile = Profile::create([
            'user_id' => $staff->id,
            'first_name' => 'Asset',
            'last_name' => 'Staff',
            'phone' => '09100000001',
            'address' => 'Work Address',
        ]);

        $customer = User::factory()->create([
            'role' => 'Customer',
            'status' => User::STATUS_ACTIVE,
        ]);
        $customerProfile = Profile::create([
            'user_id' => $customer->id,
            'first_name' => 'Asset',
            'last_name' => 'Customer',
            'phone' => '09100000002',
            'address' => 'Customer Address',
        ]);

        $category = Category::create([
            'name' => 'Workshop Tools',
            'description' => 'Tools used in services',
        ]);

        $service = Service::create([
            'category_id' => $category->id,
            'name' => 'Brake Inspection',
            'description' => 'Brake inspection service',
            'price' => 1800,
        ]);

        $inventoryCategory = InventoryCategory::create([
            'name' => 'Tools',
            'description' => 'Returnable tools',
            'has_price' => true,
            'deduct_on_service' => false,
            'is_asset' => true,
        ]);

        $product = Product::create([
            'supplier_id' => null,
            'inventory_category_id' => $inventoryCategory->id,
            'name' => 'Jack Stand',
            'unit' => 'pcs',
            'current_stock' => 4,
            'reorder_level' => 1,
            'price' => 1200,
            'description' => 'Workshop jack stand',
            'is_active' => true,
        ]);

        $booking = Booking::create([
            'profile_id' => $customerProfile->id,
            'date' => '2026-09-17',
            'status' => 'confirmed',
        ]);

        $bookingService = BookingService::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'status' => 'in_progress',
            'scheduled_time' => '09:00',
        ]);

        $jobOrder = JobOrder::create([
            'booking_service_id' => $bookingService->id,
            'profile_id' => $staffProfile->id,
            'status' => 'in_progress',
            'start_time' => '2026-09-17 09:00:00',
            'end_time' => '2026-09-17 10:00:00',
        ]);

        $response = $this->actingAs($staff)->postJson('/staff/service-product-usage', [
            'job_order_id' => $jobOrder->id,
            'product_id' => $product->id,
            'quantity_used' => 1,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('service_product_usages', [
            'job_order_id' => $jobOrder->id,
            'product_id' => $product->id,
            'quantity_used' => 1,
            'status' => 'Pending',
        ]);
    }

    public function test_staff_cannot_complete_task_until_returnable_product_is_returned(): void
    {
        $staff = User::factory()->create([
            'role' => 'Staff',
            'status' => User::STATUS_ACTIVE,
        ]);
        $staffProfile = Profile::create([
            'user_id' => $staff->id,
            'first_name' => 'Return',
            'last_name' => 'Staff',
            'phone' => '09100000003',
            'address' => 'Work Address',
        ]);

        $customer = User::factory()->create([
            'role' => 'Customer',
            'status' => User::STATUS_ACTIVE,
        ]);
        $customerProfile = Profile::create([
            'user_id' => $customer->id,
            'first_name' => 'Return',
            'last_name' => 'Customer',
            'phone' => '09100000004',
            'address' => 'Customer Address',
        ]);

        $category = Category::create([
            'name' => 'Workshop Equipment',
            'description' => 'Equipment used in service jobs',
        ]);

        $service = Service::create([
            'category_id' => $category->id,
            'name' => 'Brake Service',
            'description' => 'Brake service',
            'price' => 2200,
        ]);

        $inventoryCategory = InventoryCategory::create([
            'name' => 'Tools',
            'description' => 'Returnable tools',
            'has_price' => true,
            'deduct_on_service' => false,
            'is_asset' => true,
        ]);

        $product = Product::create([
            'supplier_id' => null,
            'inventory_category_id' => $inventoryCategory->id,
            'name' => 'Torque Wrench',
            'unit' => 'pcs',
            'current_stock' => 3,
            'reorder_level' => 1,
            'price' => 1500,
            'description' => 'Torque wrench',
            'is_active' => true,
        ]);

        $booking = Booking::create([
            'profile_id' => $customerProfile->id,
            'date' => '2026-09-20',
            'status' => 'confirmed',
        ]);

        $bookingService = BookingService::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'status' => 'ongoing',
            'scheduled_time' => '09:00',
            'image' => 'completion-images/test.jpg',
        ]);

        $jobOrder = JobOrder::create([
            'booking_service_id' => $bookingService->id,
            'profile_id' => $staffProfile->id,
            'status' => 'in_progress',
            'start_time' => '2026-09-20 09:00:00',
            'end_time' => null,
        ]);

        ServiceProductUsage::create([
            'job_order_id' => $jobOrder->id,
            'product_id' => $product->id,
            'quantity_used' => 1,
            'status' => 'Approved',
            'returned_at' => null,
        ]);

        $response = $this->actingAs($staff)->from('/staff/tasks')->put('/staff/tasks/' . $jobOrder->id, [
            'status' => 'completed',
        ]);

        $response->assertRedirect('/staff/tasks');
        $this->assertSessionHas('error', 'This task cannot be completed until all returnable products are returned.');
        $this->assertDatabaseHas('job_orders', [
            'id' => $jobOrder->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_consumable_sales_report_includes_customer_and_appointment_context(): void
    {
        $admin = User::factory()->create([
            'role' => 'Admin',
            'status' => User::STATUS_ACTIVE,
        ]);

        $customer = User::factory()->create([
            'role' => 'Customer',
            'status' => User::STATUS_ACTIVE,
        ]);
        $customerProfile = Profile::create([
            'user_id' => $customer->id,
            'first_name' => 'Maria',
            'last_name' => 'Customer',
            'phone' => '09121234567',
            'address' => 'Customer Address',
        ]);

        $staff = User::factory()->create([
            'role' => 'Staff',
            'status' => User::STATUS_ACTIVE,
        ]);
        $staffProfile = Profile::create([
            'user_id' => $staff->id,
            'first_name' => 'Alex',
            'last_name' => 'Staff',
            'phone' => '09876543210',
            'address' => 'Staff Address',
        ]);

        $category = Category::create([
            'name' => 'Diagnostics',
            'description' => 'Diagnostic services',
        ]);

        $service = Service::create([
            'category_id' => $category->id,
            'name' => 'Engine Tune-Up',
            'description' => 'Engine tune-up service',
            'price' => 2500,
        ]);

        $inventoryCategory = InventoryCategory::create([
            'name' => 'Parts',
            'description' => 'Vehicle parts',
            'has_price' => true,
            'deduct_on_service' => true,
            'is_asset' => false,
        ]);

        $product = Product::create([
            'supplier_id' => null,
            'inventory_category_id' => $inventoryCategory->id,
            'name' => 'Spark Plug',
            'unit' => 'set',
            'current_stock' => 30,
            'reorder_level' => 10,
            'price' => 350,
            'description' => 'Spark plug set',
            'is_active' => true,
        ]);

        $booking = Booking::create([
            'profile_id' => $customerProfile->id,
            'date' => '2026-09-18',
            'status' => 'completed',
        ]);

        $bookingService = BookingService::create([
            'booking_id' => $booking->id,
            'service_id' => $service->id,
            'status' => 'completed',
            'scheduled_time' => '10:00',
        ]);

        $jobOrder = JobOrder::create([
            'booking_service_id' => $bookingService->id,
            'profile_id' => $staffProfile->id,
            'status' => 'completed',
            'start_time' => '2026-09-18 10:00:00',
            'end_time' => '2026-09-18 11:00:00',
        ]);

        ServiceProductUsage::create([
            'job_order_id' => $jobOrder->id,
            'product_id' => $product->id,
            'quantity_used' => 3,
            'status' => 'Approved',
        ]);

        $response = $this->actingAs($admin)->getJson('/admin/reports/consumable-product-sales');

        $response->assertOk();
        $response->assertJsonFragment(['product_name' => 'Spark Plug']);
        $response->assertJsonFragment(['customer_name' => 'Maria Customer']);
        $response->assertJsonFragment(['staff_name' => 'Alex Staff']);
    }
}
