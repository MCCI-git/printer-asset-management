<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Location;
use App\Models\Printer;
use App\Services\SnipeItService;
use Illuminate\Console\Command;

class SyncSnipeIt extends Command
{
    protected $signature   = 'snipeit:sync';
    protected $description = 'Sync printers from Snipe-IT';

    public function handle(SnipeItService $snipeIt): int
    {
        $path   = storage_path('app/snipeit_config.json');
        $config = file_exists($path) ? json_decode(file_get_contents($path), true) : [];

        if (empty($config['url']) || empty($config['api_key'])) {
            $this->warn('Snipe-IT not configured — skipping sync.');
            return self::SUCCESS;
        }

        try {
            $result = $snipeIt->getAssets(500);
        } catch (\Exception $e) {
            $this->error('Snipe-IT sync failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        $rows = $result['rows'] ?? [];
        $created = $updated = $skipped = 0;

        foreach ($rows as $asset) {
            $snipeId = $asset['id'] ?? null;
            if (!$snipeId) { $skipped++; continue; }

            $categoryId = null;
            if (!empty($asset['category']['name'])) {
                $categoryId = Category::firstOrCreate(['name' => $asset['category']['name']])->id;
            }

            $locationId = null;
            if (!empty($asset['location']['name'])) {
                $locationId = Location::firstOrCreate(['name' => trim(html_entity_decode($asset['location']['name']))])->id;
            }

            $statusType = $asset['status_label']['status_type'] ?? 'deployable';
            $status = match ($statusType) {
                'undeployable' => 'maintenance',
                'archived'     => 'retired',
                default        => 'active',
            };

            $purchaseDate = null;
            if (!empty($asset['purchase_date']['date'])) {
                $purchaseDate = substr($asset['purchase_date']['date'], 0, 10);
            } elseif (!empty($asset['purchase_date']['formatted'])) {
                $purchaseDate = $asset['purchase_date']['formatted'];
            }

            $exists = Printer::where('snipeit_id', $snipeId)->exists();

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
                    'ip_address'    => $this->extractIp($asset),
                ]
            );

            $exists ? $updated++ : $created++;
        }

        $this->info("Snipe-IT sync complete — created: {$created}, updated: {$updated}, skipped: {$skipped}.");
        return self::SUCCESS;
    }

    private function extractIp(array $asset): ?string
    {
        foreach ($asset['custom_fields'] ?? [] as $field) {
            $label = strtolower($field['field'] ?? '');
            if (str_contains($label, 'ip') && filter_var($field['value'] ?? '', FILTER_VALIDATE_IP)) {
                return $field['value'];
            }
        }
        return null;
    }
}
