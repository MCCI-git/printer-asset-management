<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SnipeItService
{
    private string $baseUrl;
    private string $apiKey;
    private int $categoryId;
    private int $cacheTtl = 300; // 5 minutes

    public function __construct()
    {
        // Prefer config saved via the UI (storage/app/snipeit_config.json) over .env
        $stored = $this->loadStoredConfig();

        $this->baseUrl    = rtrim($stored['url']         ?? config('services.snipeit.url', ''), '/');
        $this->apiKey     = $stored['api_key']           ?? config('services.snipeit.api_key', '');
        $this->categoryId = (int) ($stored['category_id'] ?? config('services.snipeit.category_id', 0));
    }

    private function loadStoredConfig(): array
    {
        $path = storage_path('app/snipeit_config.json');
        if (file_exists($path)) {
            return json_decode(file_get_contents($path), true) ?? [];
        }
        return [];
    }

    private function headers(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];
    }

    private function isMockMode(): bool
    {
        return empty($this->apiKey) || str_contains($this->apiKey, 'your-api-key');
    }

    public function getAssets(int $limit = 100, int $offset = 0): array
    {
        if ($this->isMockMode()) {
            return $this->getMockAssets();
        }

        $params = ['limit' => $limit, 'offset' => $offset];
        if ($this->categoryId) {
            $params['category_id'] = $this->categoryId;
        }

        $candidates = $this->buildCandidates($this->baseUrl);

        foreach ($candidates as $base) {
            try {
                $response = Http::withHeaders($this->headers())
                    ->timeout(20)
                    ->withoutVerifying()
                    ->get("{$base}/api/v1/hardware", $params);

                if ($response->successful()) {
                    // Persist the working base URL so future calls skip the probe
                    if ($base !== $this->baseUrl) {
                        $this->persistWorkingUrl($base);
                        $this->baseUrl = $base;
                    }
                    return $response->json() ?? ['rows' => [], 'total' => 0];
                }

                if ($response->status() !== 404) {
                    $body = $response->json();
                    $msg  = $body['message'] ?? $body['error'] ?? "HTTP {$response->status()}";
                    throw new \RuntimeException("Snipe-IT returned {$response->status()}: {$msg}");
                }
            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                continue;
            }
        }

        $tried = implode(', ', array_map(fn($b) => "{$b}/api/v1/hardware", $candidates));
        throw new \RuntimeException("Snipe-IT not found at any path tried. Paths: {$tried}");
    }

    private function buildCandidates(string $url): array
    {
        $url = rtrim($url, '/');
        $alt = str_starts_with($url, 'http://') ? str_replace('http://', 'https://', $url) : str_replace('https://', 'http://', $url);
        return array_unique([
            $url,
            $alt,
            $url . '/public',
            $alt . '/public',
            $url . '/snipeit',
            $url . '/snipe-it',
        ]);
    }

    private function persistWorkingUrl(string $workingUrl): void
    {
        $path = storage_path('app/snipeit_config.json');
        $config = file_exists($path) ? (json_decode(file_get_contents($path), true) ?? []) : [];
        $config['url'] = $workingUrl;
        file_put_contents($path, json_encode($config, JSON_PRETTY_PRINT));
    }

    public function getAsset(int $id): array
    {
        if ($this->isMockMode()) {
            $assets = $this->getMockAssets();
            return collect($assets['rows'])->firstWhere('id', $id) ?? [];
        }

        $cacheKey = "snipeit_asset_{$id}";

        return Cache::remember($cacheKey, $this->cacheTtl, function () use ($id) {
            try {
                $response = Http::withHeaders($this->headers())
                    ->timeout(15)
                    ->get("{$this->baseUrl}/api/v1/hardware/{$id}");

                if ($response->failed()) {
                    return [];
                }

                return $response->json() ?? [];
            } catch (\Exception $e) {
                Log::error('Snipe-IT asset fetch error', ['id' => $id, 'message' => $e->getMessage()]);
                return [];
            }
        });
    }

    public function getCategories(): array
    {
        if ($this->isMockMode()) {
            return $this->getMockCategories();
        }

        return Cache::remember('snipeit_categories', $this->cacheTtl, function () {
            try {
                $response = Http::withHeaders($this->headers())
                    ->timeout(15)
                    ->get("{$this->baseUrl}/api/v1/categories");

                return $response->successful() ? ($response->json() ?? []) : [];
            } catch (\Exception $e) {
                Log::error('Snipe-IT categories fetch error', ['message' => $e->getMessage()]);
                return [];
            }
        });
    }

    public function getLocations(): array
    {
        if ($this->isMockMode()) {
            return $this->getMockLocations();
        }

        return Cache::remember('snipeit_locations', $this->cacheTtl, function () {
            try {
                $response = Http::withHeaders($this->headers())
                    ->timeout(15)
                    ->get("{$this->baseUrl}/api/v1/locations");

                return $response->successful() ? ($response->json() ?? []) : [];
            } catch (\Exception $e) {
                Log::error('Snipe-IT locations fetch error', ['message' => $e->getMessage()]);
                return [];
            }
        });
    }

    public function testConnection(): array
    {
        if ($this->isMockMode()) {
            return ['success' => false, 'message' => 'No Snipe-IT URL or API key configured.'];
        }

        return $this->testConnectionWith($this->baseUrl, $this->apiKey);
    }

    public function testConnectionWith(string $url, string $apiKey): array
    {
        $url = rtrim($url, '/');

        if (!$url || !$apiKey) {
            return ['success' => false, 'message' => 'URL and API key are required.'];
        }

        $headers = [
            'Authorization' => "Bearer {$apiKey}",
            'Accept'        => 'application/json',
        ];

        $candidates = array_unique([...$this->buildCandidates($url), $url . '/assets']);

        $lastStatus  = null;
        $lastTried   = '';
        $notFoundAll = true;

        foreach ($candidates as $base) {
            $endpoint = "{$base}/api/v1/hardware?limit=1";
            try {
                $response = Http::withHeaders($headers)
                    ->timeout(10)
                    ->withoutVerifying()
                    ->get($endpoint);

                $lastStatus = $response->status();
                $lastTried  = $endpoint;

                if ($response->successful()) {
                    $total = $response->json('total') ?? '?';
                    return [
                        'success'     => true,
                        'message'     => "Connected. {$total} total asset(s) found.",
                        'tested_url'  => $endpoint,
                        'working_url' => $base,
                    ];
                }

                if ($response->status() !== 404) {
                    $notFoundAll = false;
                    $body = $response->json();
                    $msg  = $body['message'] ?? $body['error'] ?? substr($response->body(), 0, 300);
                    // Don't break — keep trying other candidates only on 404
                    // On auth/server errors, report immediately
                    if (in_array($response->status(), [401, 403, 500, 503])) {
                        return [
                            'success'    => false,
                            'message'    => "HTTP {$response->status()}: {$msg}\n\nThe server was reached at {$base} — check your API key.",
                            'tested_url' => $endpoint,
                        ];
                    }
                }

            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                // This candidate is unreachable, try next
                continue;
            }
        }

        // All candidates 404'd
        $tried = implode("\n  • ", array_map(fn($b) => "{$b}/api/v1/hardware", $candidates));
        return [
            'success'    => false,
            'message'    => "Snipe-IT not found at any of the paths tried. Verify the URL by opening it in your browser — the Snipe-IT login page should load there.\n\nPaths tried:\n  • {$tried}",
            'tested_url' => $lastTried,
        ];
    }

    // ── Mock data (used when no real Snipe-IT is configured) ──────────────

    private function getMockAssets(): array
    {
        return [
            'total' => 4,
            'rows' => [
                [
                    'id' => 1, 'asset_tag' => 'PRN-001', 'serial' => 'HP-2025-001',
                    'name' => 'HP LaserJet Pro MFP', 'model' => ['name' => 'HP LaserJet Pro MFP M428fdw'],
                    'category' => ['name' => 'Printers'], 'manufacturer' => ['name' => 'HP Inc.'],
                    'supplier' => ['name' => 'Cartridge World'],
                    'purchase_date' => ['formatted' => '2025-01-15'],
                    'purchase_cost' => 4200.00, 'cost_type' => 'CAPEX',
                    'warranty_months' => 36, 'location' => ['name' => 'IT Department'],
                    'status_label' => ['name' => 'Deployed', 'status_type' => 'deployable'],
                    'assigned_to' => ['name' => 'John Smith', 'username' => 'john.smith'],
                    'notes' => 'Primary office printer for IT department.',
                ],
                [
                    'id' => 2, 'asset_tag' => 'PRN-002', 'serial' => 'XRX-2025-001',
                    'name' => 'Xerox VersaLink C405', 'model' => ['name' => 'Xerox VersaLink C405'],
                    'category' => ['name' => 'Printers'], 'manufacturer' => ['name' => 'Xerox Corp.'],
                    'supplier' => ['name' => 'Office Depot'],
                    'purchase_date' => ['formatted' => '2025-03-01'],
                    'purchase_cost' => 3200.00, 'cost_type' => 'OPEX',
                    'warranty_months' => 24, 'location' => ['name' => 'Admin Office'],
                    'status_label' => ['name' => 'Deployed', 'status_type' => 'deployable'],
                    'assigned_to' => ['name' => 'Jane Admin', 'username' => 'jane.admin'],
                    'notes' => 'Color printer for admin staff.',
                ],
                [
                    'id' => 3, 'asset_tag' => 'PRN-003', 'serial' => 'BRTH-2024-001',
                    'name' => 'Brother HL-L2350DW', 'model' => ['name' => 'Brother HL-L2350DW'],
                    'category' => ['name' => 'Printers'], 'manufacturer' => ['name' => 'Brother'],
                    'supplier' => ['name' => 'Cartridge World'],
                    'purchase_date' => ['formatted' => '2024-12-10'],
                    'purchase_cost' => 1800.00, 'cost_type' => 'CAPEX',
                    'warranty_months' => 24, 'location' => ['name' => 'Finance Department'],
                    'status_label' => ['name' => 'Deployed', 'status_type' => 'deployable'],
                    'assigned_to' => ['name' => 'Finance Team', 'username' => 'finance'],
                    'notes' => 'Monochrome printer for financial reports.',
                ],
                [
                    'id' => 4, 'asset_tag' => 'PRN-004', 'serial' => 'CAN-2025-001',
                    'name' => 'Canon imageCLASS MF743', 'model' => ['name' => 'Canon imageCLASS MF743'],
                    'category' => ['name' => 'Printers'], 'manufacturer' => ['name' => 'Canon Solutions'],
                    'supplier' => ['name' => 'Office Depot'],
                    'purchase_date' => ['formatted' => '2025-02-15'],
                    'purchase_cost' => 2800.00, 'cost_type' => 'OPEX',
                    'warranty_months' => 24, 'location' => ['name' => 'HR Department'],
                    'status_label' => ['name' => 'Maintenance', 'status_type' => 'undeployable'],
                    'assigned_to' => ['name' => 'HR Team', 'username' => 'hr'],
                    'notes' => 'Currently undergoing maintenance due to network issues.',
                ],
            ],
        ];
    }

    private function getMockCategories(): array
    {
        return [
            'rows' => [
                ['id' => 1, 'name' => 'Printers'],
                ['id' => 2, 'name' => 'Consumables'],
                ['id' => 3, 'name' => 'Accessories'],
            ],
        ];
    }

    private function getMockLocations(): array
    {
        return [
            'rows' => [
                ['id' => 1, 'name' => 'IT Department'],
                ['id' => 2, 'name' => 'Admin Office'],
                ['id' => 3, 'name' => 'Finance Department'],
                ['id' => 4, 'name' => 'HR Department'],
            ],
        ];
    }
}
