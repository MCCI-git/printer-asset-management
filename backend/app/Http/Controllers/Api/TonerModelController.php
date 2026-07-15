<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TonerModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TonerModelController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(TonerModel::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'model_number'        => 'nullable|string|max:255',
            'low_stock_threshold' => 'required|integer|min:0',
        ]);

        $toner = TonerModel::create($validated);
        return response()->json($toner, 201);
    }

    public function update(Request $request, TonerModel $tonerModel): JsonResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'model_number'        => 'nullable|string|max:255',
            'low_stock_threshold' => 'required|integer|min:0',
        ]);

        $tonerModel->update($validated);
        return response()->json($tonerModel);
    }

    public function destroy(TonerModel $tonerModel): JsonResponse
    {
        $tonerModel->delete();
        return response()->json(null, 204);
    }
}
