<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class VehicleController extends Controller
{
    public function index()
    {
        $vehicles = Vehicle::with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $vehicles,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'plate_number' => 'required|string|max:50|unique:vehicles,plate_number',
                'brand' => 'required|string|max:100',
                'model' => 'required|string|max:100',
                'year_model' => 'required|string|max:10',
                'color' => 'required|string|max:50',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        $vehicle = Vehicle::create([
            'user_id' => Auth::id() ?: 1,
            'plate_number' => $validated['plate_number'],
            'brand' => $validated['brand'],
            'model' => $validated['model'],
            'year_model' => $validated['year_model'],
            'color' => $validated['color'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $vehicle,
            'message' => 'Vehicle created successfully.',
        ], 201);
    }

    public function show(Vehicle $vehicle)
    {
        return response()->json([
            'success' => true,
            'data' => $vehicle,
        ]);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        try {
            $validated = $request->validate([
                'plate_number' => 'required|string|max:50|unique:vehicles,plate_number,' . $vehicle->id,
                'brand' => 'required|string|max:100',
                'model' => 'required|string|max:100',
                'year_model' => 'required|string|max:10',
                'color' => 'required|string|max:50',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        }

        $vehicle->update($validated);

        return response()->json([
            'success' => true,
            'data' => $vehicle,
            'message' => 'Vehicle updated successfully.',
        ]);
    }

    public function destroy(Vehicle $vehicle)
    {
        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vehicle deleted successfully.',
        ]);
    }
}
