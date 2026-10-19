<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * Return a listing of services.
     */
    public function index(Request $request)
    {
        try {
            $services = Service::with('category')
                ->get()
                ->map(function ($service) {
                    $serviceArray = $service->toArray();
                    $serviceArray['average_rating'] = $service->average_rating;
                    return $serviceArray;
                });

            return response()->json([
                'success' => true,
                'data' => $services,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch services: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Unable to retrieve services.',
            ], 500);
        }
    }

    /**
     * Return a single service.
     */
    public function show(Request $request, $id)
    {
        try {
            $service = Service::with('category')->find($id);

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found.',
                ], 404);
            }

            $serviceArray = $service->toArray();
            $serviceArray['average_rating'] = $service->average_rating;

            return response()->json([
                'success' => true,
                'data' => $serviceArray,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to fetch service: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Unable to retrieve service.',
            ], 500);
        }
    }
}
