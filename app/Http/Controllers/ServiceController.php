<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Service;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ServiceController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/ServicesManagement', [
            'categories' => Category::with('services')->get(),
            'services' => Service::with('category')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        Service::create($data);

        return redirect()->back()->with('success', 'Service created successfully.');
    }

    public function update(Request $request, $id)
    {
        $service = Service::findOrFail($id);

        $data = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $service->update($data);

        return redirect()->back()->with('success', 'Service updated successfully.');
    }

    public function destroy($id)
    {
        Service::findOrFail($id)->delete();

        return redirect()->back()->with('success', 'Service deleted successfully.');
    }
}
