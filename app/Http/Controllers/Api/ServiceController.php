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
            $services = Service::with('category')->get();

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
}
