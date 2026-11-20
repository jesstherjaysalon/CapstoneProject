<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobOrder;
use App\Models\JobOrderNote;
use App\Models\Product;
use App\Models\ServiceProductUsage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StaffApiController extends Controller
{
    /**
     * Display the staff dashboard.
     */
    public function dashboard(Request $request)
    {
        $user = Auth::user();
        $staff = $user->profile;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'staff' => [
                    'id' => $staff->id,
                    'first_name' => $staff->first_name,
                    'last_name' => $staff->last_name,
                ],
            ],
        ]);
    }

    /**
     * Display the staff's assigned tasks.
     */
    public function tasks(Request $request)
    {
        $staff = Auth::user()->profile;

        $jobOrders = JobOrder::with(['bookingService.service', 'bookingService.booking.profile', 'bookingService.booking.vehicle'])
            ->whereJsonContains('profile_id', $staff->id)
            ->where('status', '!=', 'completed')
            ->orderBy('created_at', 'desc')
            ->get();

        $jobOrderIds = $jobOrders->pluck('id');

        $productUsages = ServiceProductUsage::with(['product.inventoryCategory'])
            ->whereIn('job_order_id', $jobOrderIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('job_order_id');

        $taskUpdates = JobOrderNote::whereIn('job_order_id', $jobOrderIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('job_order_id');

        $jobOrders = $jobOrders->map(function ($jobOrder) use ($productUsages, $taskUpdates) {
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

            $updates = $taskUpdates->get($jobOrder->id, collect())->map(function ($update) {
                return [
                    'id' => $update->id,
                    'note' => $update->note,
                    'photos' => collect($update->photos ?? [])->map(function ($path) {
                        return [
                            'path' => $path,
                            'url' => Storage::disk('public')->url($path),
                        ];
                    })->values(),
                    'created_at' => $update->created_at?->format('Y-m-d H:i:s'),
                ];
            })->values();

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
                'vehicle' => $jobOrder->bookingService?->booking?->vehicle ? [
                    'brand' => $jobOrder->bookingService->booking->vehicle->brand,
                    'model' => $jobOrder->bookingService->booking->vehicle->model,
                    'plate_number' => $jobOrder->bookingService->booking->vehicle->plate_number,
                ] : null,
                'start_time' => $jobOrder->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $jobOrder->end_time?->format('Y-m-d H:i:s'),
                'status' => $jobOrder->status,
                'product_usages' => $usages,
                'updates' => $updates,
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

        return response()->json([
            'success' => true,
            'data' => [
                'jobOrders' => $jobOrders,
                'products' => $products,
            ],
        ]);
    }

    /**
     * Display the staff's completed job orders (Service Assignments).
     */
    public function serviceAssignments(Request $request)
    {
        $staff = Auth::user()->profile;

        $jobOrders = JobOrder::with(['bookingService.service', 'bookingService.booking.profile', 'bookingService.booking.vehicle'])
            ->whereJsonContains('profile_id', $staff->id)
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
                'vehicle' => $jobOrder->bookingService?->booking?->vehicle ? [
                    'brand' => $jobOrder->bookingService->booking->vehicle->brand,
                    'model' => $jobOrder->bookingService->booking->vehicle->model,
                    'plate_number' => $jobOrder->bookingService->booking->vehicle->plate_number,
                ] : null,
                'start_time' => $jobOrder->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $jobOrder->end_time?->format('Y-m-d H:i:s'),
                'status' => $jobOrder->status,
                'service_product_usages' => $usages,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'jobOrders' => $jobOrders,
            ],
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
        if (!in_array($staff->id, $jobOrder->profile_id ?? [])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized action.',
            ], 403);
        }

        // If completing, require an image and ensure all returnable items have been returned
        if ($request->input('status') === 'completed') {
            $bookingService = $jobOrder->bookingService;
            if (!$bookingService || !$bookingService->image) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please upload a completion image before marking the task as completed.',
                ], 400);
            }

            $hasOutstandingReturnableUsage = ServiceProductUsage::where('job_order_id', $jobOrder->id)
                ->whereNull('returned_at')
                ->where('status', '!=', 'Rejected')
                ->whereHas('product.inventoryCategory', function ($query) {
                    $query->where('is_asset', true);
                })
                ->exists();

            if ($hasOutstandingReturnableUsage) {
                return response()->json([
                    'success' => false,
                    'message' => 'This task cannot be completed until all returnable products are returned.',
                ], 400);
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

        return response()->json([
            'success' => true,
            'message' => 'Task status updated successfully.',
            'data' => [
                'jobOrder' => [
                    'id' => $jobOrder->id,
                    'status' => $jobOrder->status,
                    'start_time' => $jobOrder->start_time?->format('Y-m-d H:i:s'),
                    'end_time' => $jobOrder->end_time?->format('Y-m-d H:i:s'),
                ],
            ],
        ]);
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
        if (!in_array($staff->id, $jobOrder->profile_id ?? [])) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized action.',
            ], 403);
        }

        $bookingService = $jobOrder->bookingService;
        if (!$bookingService) {
            return response()->json([
                'success' => false,
                'error' => 'Booking service not found.',
            ], 404);
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
            'message' => 'Image uploaded successfully.',
            'data' => [
                'image_url' => Storage::disk('public')->url($path),
                'image_path' => $path,
            ],
        ]);
    }

    /**
     * Save a staff note and optional supporting photos for a job order.
     */
    public function storeTaskUpdate(Request $request, JobOrder $jobOrder)
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:5000'],
            'photos' => ['sometimes', 'array', 'min:1', 'max:10'],
            'photos.*' => ['image', 'max:10240'],
        ]);

        $staff = Auth::user()->profile;
        if (! in_array($staff->id, $jobOrder->profile_id ?? [])) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized action.',
            ], 403);
        }

        $note = trim($validated['note'] ?? '');
        $photos = $request->file('photos', []);
        if ($note === '' && count($photos) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Add a note or select at least one photo.',
            ], 422);
        }

        $storedPaths = [];
        try {
            foreach ($photos as $photo) {
                $path = $photo->store('task-update-photos', 'public');
                if ($path === false) {
                    throw new \RuntimeException('Unable to store a task update photo.');
                }
                $storedPaths[] = $path;
            }

            $update = DB::transaction(function () use ($jobOrder, $note, $storedPaths) {
                return JobOrderNote::create([
                    'job_order_id' => $jobOrder->id,
                    'note' => $note !== '' ? $note : null,
                    'photos' => $storedPaths,
                ]);
            });
        } catch (\Throwable $error) {
            Storage::disk('public')->delete($storedPaths);
            throw $error;
        }

        return response()->json([
            'success' => true,
            'message' => 'Task update saved successfully.',
            'data' => [
                'update' => [
                    'id' => $update->id,
                    'note' => $update->note,
                    'photos' => collect($update->photos)->map(function ($path) {
                        return [
                            'path' => $path,
                            'url' => Storage::disk('public')->url($path),
                        ];
                    })->values(),
                    'created_at' => $update->created_at?->format('Y-m-d H:i:s'),
                ],
            ],
        ], 201);
    }
}
