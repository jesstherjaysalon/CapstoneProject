<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use App\Models\Product;
use App\Models\ServiceProductUsage;
use App\Models\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class StaffDashboardController extends Controller
{
    /**
     * Display the staff dashboard.
     */
    public function index(): Response
    {
        return Inertia::render('Staff/StaffDashboard');
    }

    /**
     * Display the staff's assigned tasks.
     */
    public function tasks(): Response
    {
        $staff = Auth::user()->profile;

        $jobOrders = JobOrder::with(['bookingService.service', 'bookingService.booking.profile'])
            ->where('profile_id', $staff->id)
            ->where('status', '!=', 'completed')
            ->orderBy('created_at', 'desc')
            ->get();

        $jobOrderIds = $jobOrders->pluck('id');

        $productUsages = ServiceProductUsage::with(['product.inventoryCategory'])
            ->whereIn('job_order_id', $jobOrderIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('job_order_id');

        $jobOrders = $jobOrders->map(function ($jobOrder) use ($productUsages) {
            $usages = $productUsages->get($jobOrder->id, collect())->map(function ($usage) {
                return [
                    'id' => $usage->id,
                    'product' => [
                        'id' => $usage->product->id,
                        'name' => $usage->product->name,
                        'unit' => $usage->product->unit,
                    ],
                    'quantity_used' => $usage->quantity_used,
                    'status' => $usage->status,
                    'is_returnable' => $usage->product->inventoryCategory?->is_asset ?? false,
                    'returned_at' => $usage->returned_at?->format('Y-m-d H:i:s'),
                    'created_at' => $usage->created_at?->format('Y-m-d H:i:s'),
                ];
            });

            return [
                'id' => $jobOrder->id,
                'service' => [
                    'id' => $jobOrder->bookingService->id,
                    'service_name' => $jobOrder->bookingService->service?->name ?? 'Unknown Service',
                    'image' => $jobOrder->bookingService->image,
                ],
                'customer' => [
                    'name' => $jobOrder->bookingService->booking->profile
                        ? trim(sprintf('%s %s', $jobOrder->bookingService->booking->profile->first_name ?? '', $jobOrder->bookingService->booking->profile->last_name ?? ''))
                        : 'Unknown',
                ],
                'start_time' => $jobOrder->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $jobOrder->end_time?->format('Y-m-d H:i:s'),
                'status' => $jobOrder->status,
                'product_usages' => $usages,
            ];
        });

        $products = Product::with(['supplier', 'inventoryCategory'])
            ->active()
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'unit' => $product->unit,
                    'current_stock' => $product->current_stock,
                    'inventory_category' => [
                        'name' => $product->inventoryCategory?->name,
                    ],
                    'supplier' => [
                        'name' => $product->supplier?->name,
                    ],
                ];
            });

        return Inertia::render('Staff/StaffTask', [
            'jobOrders' => $jobOrders,
            'products' => $products,
        ]);
    }

    /**
     * Display the staff's completed job orders (Service Assignments).
     */
    public function serviceAssignments(): Response
    {
        $staff = Auth::user()->profile;

        $jobOrders = JobOrder::with(['bookingService.service', 'bookingService.booking.profile'])
            ->where('profile_id', $staff->id)
            ->where('status', 'completed')
            ->orderBy('created_at', 'desc')
            ->get();

        $jobOrderIds = $jobOrders->pluck('id');

        $productUsages = ServiceProductUsage::with(['product.inventoryCategory'])
            ->whereIn('job_order_id', $jobOrderIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('job_order_id');

        $jobOrders = $jobOrders->map(function ($jobOrder) use ($productUsages) {
            $usages = $productUsages->get($jobOrder->id, collect())->map(function ($usage) {
                return [
                    'id' => $usage->id,
                    'product' => [
                        'id' => $usage->product->id,
                        'name' => $usage->product->name,
                    ],
                    'quantity_used' => $usage->quantity_used,
                    'status' => $usage->status,
                ];
            });

            return [
                'id' => $jobOrder->id,
                'service' => [
                    'id' => $jobOrder->bookingService->id,
                    'service_name' => $jobOrder->bookingService->service?->name ?? 'Unknown Service',
                    'image' => $jobOrder->bookingService->image,
                    'rating' => $jobOrder->bookingService->rating,
                ],
                'customer' => [
                    'name' => $jobOrder->bookingService->booking->profile
                        ? trim(sprintf('%s %s', $jobOrder->bookingService->booking->profile->first_name ?? '', $jobOrder->bookingService->booking->profile->last_name ?? ''))
                        : 'Unknown',
                ],
                'start_time' => $jobOrder->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $jobOrder->end_time?->format('Y-m-d H:i:s'),
                'status' => $jobOrder->status,
                'service_product_usages' => $usages,
            ];
        });

        return Inertia::render('Staff/ServiceAssignments', [
            'jobOrders' => $jobOrders,
        ]);
    }

    /**
     * Update the job order status.
     */
    public function updateTaskStatus(Request $request, JobOrder $jobOrder)
    {
        $request->validate([
            'status' => ['required', 'in:pending,in_progress,completed'],
        ]);

        // Ensure the job order belongs to the current staff
        $staff = Auth::user()->profile;
        if ($jobOrder->profile_id !== $staff->id) {
            return redirect()->back()->with('error', 'Unauthorized action.');
        }

        // If completing, require an image
        if ($request->input('status') === 'completed') {
            $bookingService = $jobOrder->bookingService;
            if (!$bookingService || !$bookingService->image) {
                return redirect()->back()->with('error', 'Please upload a completion image before marking the task as completed.');
            }
        }

        $jobOrder->update([
            'status' => $request->input('status'),
        ]);

        // Sync booking_service status with job_order status
        $bookingService = $jobOrder->bookingService;
        if ($bookingService) {
            $statusMapping = [
                'pending' => 'pending',
                'in_progress' => 'ongoing',
                'completed' => 'completed',
            ];
            $bookingService->update([
                'status' => $statusMapping[$request->input('status')] ?? 'pending',
            ]);
        }

        // Update start_time and end_time based on status
        if ($request->input('status') === 'in_progress' && !$jobOrder->start_time) {
            $jobOrder->update(['start_time' => now()]);
        }

        if ($request->input('status') === 'completed' && !$jobOrder->end_time) {
            $jobOrder->update(['end_time' => now()]);
        }

        return redirect()->back()->with('success', 'Task status updated successfully.');
    }

    /**
     * Upload completion image for booking service.
     */
    public function uploadCompletionImage(Request $request, JobOrder $jobOrder)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:10240'], // Max 10MB
        ]);

        // Ensure the job order belongs to the current staff
        $staff = Auth::user()->profile;
        if ($jobOrder->profile_id !== $staff->id) {
            return response()->json(['error' => 'Unauthorized action.'], 403);
        }

        $bookingService = $jobOrder->bookingService;
        if (!$bookingService) {
            return response()->json(['error' => 'Booking service not found.'], 404);
        }

        // Delete old image if exists
        if ($bookingService->image) {
            Storage::disk('public')->delete($bookingService->image);
        }

        // Store new image
        $path = $request->file('image')->store('completion-images', 'public');
        
        $bookingService->update(['image' => $path]);

        return response()->json([
            'success' => true,
            'image_url' => Storage::disk('public')->url($path),
        ]);
    }
}
