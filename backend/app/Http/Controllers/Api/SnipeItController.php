<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Location;
use App\Models\Printer;
use App\Services\SnipeItService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

class SnipeItController extends Controller
{
    public function __construct(private SnipeItService $snipeIt) {}

    public function assets(Request $request): JsonResponse
    {
        try {
            $data = $this->snipeIt->getAssets(
                (int) $request->get('limit', 100),
                (int) $request->get('offset', 0)
            );
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage(), 'rows' => [], 'total' => 0], 502);
        }
    }

    public function asset(int $id): JsonResponse
    {
        return response()->json($this->snipeIt->getAsset($id));
    }

    public function categories(): JsonResponse
    {
        return response()->json($this->snipeIt->getCategories());
    }

    public function locations(): JsonResponse
    {
        return response()->json($this->snipeIt->getLocations());
    }

    public function saveConfig(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'url'         => 'required|url',
            'api_key'     => 'required|string',
            'category_id' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $config = [
            'url'         => rtrim($request->input('url'), '/'),
            'api_key'     => $request->input('api_key'),
            'category_id' => (int) $request->input('category_id', 0),
            'sync_freq'   => $request->input('sync_freq', 'manual'),
        ];

        file_put_contents(storage_path('app/snipeit_config.json'), json_encode($config, JSON_PRETTY_PRINT));
        Cache::forget('snipeit_assets_100_0');

        return response()->json(['message' => 'Snipe-IT configuration saved.']);
    }

    public function getConfig(): JsonResponse
    {
        $path = storage_path('app/snipeit_config.json');
        if (file_exists($path)) {
            return response()->json(json_decode(file_get_contents($path), true) ?? []);
        }
        return response()->json([
            'url'         => config('services.snipeit.url', ''),
            'category_id' => config('services.snipeit.category_id', 0),
            'api_key'     => '',
        ]);
    }

    public function testConnection(Request $request): JsonResponse
    {
        $url    = rtrim($request->input('url', ''), '/');
        $apiKey = $request->input('api_key', '');

        if ($url && $apiKey) {
            return response()->json($this->snipeIt->testConnectionWith($url, $apiKey));
        }

        return response()->json($this->snipeIt->testConnection());
    }

    public function sync(): JsonResponse
    {
        try {
            $result = $this->snipeIt->getAssets(500);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        $rows    = $result['rows'] ?? [];
        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($rows as $asset) {
            $snipeId = $asset['id'] ?? null;
            if (!$snipeId) { $skipped++; continue; }
            $exists = Printer::where('snipeit_id', $snipeId)->exists();

            // Resolve or create category / location records
            $categoryId = null;
            if (!empty($asset['category']['name'])) {
                $categoryId = Category::firstOrCreate(['name' => $asset['category']['name']])->id;
            }

            $locationId = null;
            if (!empty($asset['location']['name'])) {
                $locationId = Location::firstOrCreate(['name' => trim(html_entity_decode($asset['location']['name']))])->id;
            }

            // Map Snipe-IT status_type → our status enum
            $statusType = $asset['status_label']['status_type'] ?? 'deployable';
            $status = match ($statusType) {
                'undeployable' => 'maintenance',
                'archived'     => 'retired',
                default        => 'active',
            };

            // Parse purchase date
            $purchaseDate = null;
            if (!empty($asset['purchase_date']['date'])) {
                $purchaseDate = substr($asset['purchase_date']['date'], 0, 10);
            } elseif (!empty($asset['purchase_date']['formatted'])) {
                $purchaseDate = $asset['purchase_date']['formatted'];
            }

            Printer::updateOrCreate(
                ['snipeit_id' => $snipeId],
                [
                    'asset_tag'     => $asset['asset_tag']          ?? "SNIPE-{$snipeId}",
                    'name'          => $asset['name']                ?? 'Unknown',
                    'serial'        => $asset['serial']              ?? null,
                    'model'         => $asset['model']['name']       ?? null,
                    'location'      => isset($asset['location']['name']) ? trim(html_entity_decode($asset['location']['name'])) : null,
                    'department'    => isset($asset['location']['name']) ? trim(html_entity_decode($asset['location']['name'])) : null,
                    'assigned_to'   => $asset['assigned_to']['name'] ?? null,
                    'status'        => $status,
                    'purchase_cost' => $asset['purchase_cost']       ?? null,
                    'purchase_date' => $purchaseDate,
                    'image_url'     => $asset['image']               ?? null,
                    'notes'         => $asset['notes']               ?? null,
                    'cost_type'     => 'CAPEX',
                    'category_id'   => $categoryId,
                    'location_id'   => $locationId,
                ]
            );

            $exists ? $updated++ : $created++;
        }

        $synced = $created + $updated;
        $parts  = [];
        if ($created) $parts[] = "{$created} new";
        if ($updated) $parts[] = "{$updated} updated";

        return response()->json([
            'success' => true,
            'synced'  => $synced,
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'message' => "Synced {$synced} asset(s) from Snipe-IT (" . implode(', ', $parts) . ").",
        ]);
    }
}
