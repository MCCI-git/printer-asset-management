<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q->where('name', 'like', "%{$s}%")->orWhere('contact_name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"));
        }

        return response()->json($query->orderBy('name')->paginate($request->get('per_page', 15)));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'contact_name'       => 'nullable|string|max:255',
            'email'              => 'nullable|email',
            'phone'              => 'nullable|string|max:50',
            'brn'                => 'nullable|string|max:100',
            'vat_number'         => 'nullable|string|max:100',
            'salesperson_name'   => 'nullable|string|max:255',
            'salesperson_email'  => 'nullable|email',
            'salesperson_phone'  => 'nullable|string|max:50',
            'notes'              => 'nullable|string',
            'preferred_supplier' => 'nullable|boolean',
            'contract_id'        => 'nullable|exists:contracts,id',
            'logo'               => 'nullable|image|max:2048',
        ]);

        $logoUrl = null;
        if ($request->hasFile('logo')) {
            $path    = $request->file('logo')->store('supplier-logos', 'public');
            $logoUrl = Storage::url($path);
        }

        $supplier = Supplier::create([
            'name'              => $validated['name'],
            'contact_name'      => $validated['contact_name'] ?? null,
            'email'             => $validated['email'] ?? null,
            'phone'             => $validated['phone'] ?? null,
            'brn'               => $validated['brn'] ?? null,
            'vat_number'        => $validated['vat_number'] ?? null,
            'salesperson_name'  => $validated['salesperson_name'] ?? null,
            'salesperson_email' => $validated['salesperson_email'] ?? null,
            'salesperson_phone'  => $validated['salesperson_phone'] ?? null,
            'notes'              => $validated['notes'] ?? null,
            'preferred_supplier' => $validated['preferred_supplier'] ?? false,
            'contract_id'        => $validated['contract_id'] ?? null,
            'logo_url'           => $logoUrl,
        ]);

        return response()->json($supplier, 201);
    }

    public function show(Supplier $supplier): JsonResponse
    {
        return response()->json($supplier->load('consumables'));
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'nullable|string|max:255',
            'contact_name'       => 'nullable|string|max:255',
            'email'              => 'nullable|email',
            'phone'              => 'nullable|string|max:50',
            'brn'                => 'nullable|string|max:100',
            'vat_number'         => 'nullable|string|max:100',
            'salesperson_name'   => 'nullable|string|max:255',
            'salesperson_email'  => 'nullable|email',
            'salesperson_phone'  => 'nullable|string|max:50',
            'notes'              => 'nullable|string',
            'preferred_supplier' => 'nullable|boolean',
            'contract_id'        => 'nullable|exists:contracts,id',
            'logo'               => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            if ($supplier->logo_url) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $supplier->logo_url));
            }
            $path = $request->file('logo')->store('supplier-logos', 'public');
            $validated['logo_url'] = Storage::url($path);
        }

        unset($validated['logo']);
        $supplier->update($validated);
        return response()->json($supplier);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        if ($supplier->logo_url) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $supplier->logo_url));
        }
        $supplier->delete();
        return response()->json(['message' => 'Supplier deleted.']);
    }
}
