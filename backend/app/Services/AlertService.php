<?php

namespace App\Services;

use App\Mail\AlertDigest;
use App\Models\Consumable;
use App\Models\Contract;
use App\Models\Printer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class AlertService
{
    private string $smtpPath;
    private string $notifPath;

    public function __construct()
    {
        $this->smtpPath  = storage_path('app/smtp_config.json');
        $this->notifPath = storage_path('app/notif_config.json');
    }

    /**
     * Build and send the full alert digest.
     * $force = true bypasses the 24-hour dedup lock (used for immediate triggers).
     */
    public function send(bool $force = false): bool
    {
        if (!file_exists($this->smtpPath) || !file_exists($this->notifPath)) {
            return false;
        }

        $smtp  = json_decode(file_get_contents($this->smtpPath), true);
        $notif = json_decode(file_get_contents($this->notifPath), true);

        $recipients = array_filter(array_map('trim', explode(',', $notif['recipients'] ?? '')));
        if (empty($recipients)) {
            return false;
        }

        $this->bootSmtp($smtp);

        $lowStock          = [];
        $outOfStock        = [];
        $expiringContracts = [];
        $overdueService    = [];

        if (!empty($notif['alert_out_of_stock']) || !empty($notif['alert_low_stock'])) {
            foreach (Consumable::with('printer')->get() as $c) {
                $row = [
                    'sku'      => $c->sku,
                    'name'     => $c->name,
                    'type'     => $c->type,
                    'quantity' => $c->quantity,
                    'threshold'=> $c->low_stock_threshold,
                    'printer'  => $c->printer?->name,
                ];
                if (!empty($notif['alert_out_of_stock']) && $c->quantity === 0) {
                    $outOfStock[] = $row;
                } elseif (!empty($notif['alert_low_stock']) && $c->quantity > 0 && $c->quantity <= $c->low_stock_threshold) {
                    $lowStock[] = $row;
                }
            }
        }

        if (!empty($notif['alert_contract_expiry'])) {
            // Active contracts within notice window + contracts that expired today
            $contracts = Contract::where(function ($q) {
                $q->where('status', 'active')->where('end_date', '>=', Carbon::today());
            })->orWhere(function ($q) {
                $q->where('status', 'expired')->whereDate('end_date', Carbon::today());
            })->get();
            foreach ($contracts as $c) {
                $daysLeft   = (int) Carbon::today()->diffInDays($c->end_date);
                $noticeDays = (int) ($c->notice_period_days ?? 30); // fallback 30 days
                // Only alert if we're within the contract's own notice window
                if ($daysLeft > $noticeDays) continue;
                $expiringContracts[] = [
                    'name'        => $c->name,
                    'vendor'      => $c->vendor,
                    'end_date'    => Carbon::parse($c->end_date)->format('d M Y'),
                    'days_left'   => $daysLeft,
                    'notice_days' => $noticeDays,
                    'tier'        => $daysLeft <= 7 ? 'critical' : ($daysLeft <= 14 ? 'urgent' : 'notice'),
                    'manager'     => $c->contract_manager,
                ];
            }
            usort($expiringContracts, fn($a, $b) => $a['days_left'] <=> $b['days_left']);
        }

        if (!empty($notif['alert_overdue_service'])) {
            foreach (Printer::where('status', 'active')->whereNotNull('next_service_date')->where('next_service_date', '<', Carbon::today())->get() as $p) {
                $overdueService[] = [
                    'asset_tag' => $p->asset_tag,
                    'name'      => $p->name,
                    'due_date'  => Carbon::parse($p->next_service_date)->format('d M Y'),
                    'location'  => $p->location,
                ];
            }
        }

        $total = count($lowStock) + count($outOfStock) + count($expiringContracts) + count($overdueService);

        if ($total === 0) {
            return false;
        }

        // Dedup: build a hash of current alert state. If same as last sent, skip (unless forced).
        $alertHash = md5(serialize([$lowStock, $outOfStock, $expiringContracts, $overdueService]));
        $cacheKey  = 'alert_digest_last_hash';

        if (!$force && Cache::get($cacheKey) === $alertHash) {
            return false;
        }

        try {
            Mail::to($recipients)->send(new AlertDigest(
                lowStock: $lowStock,
                outOfStock: $outOfStock,
                expiringContracts: $expiringContracts,
                overdueService: $overdueService,
            ));
            // Remember this alert state for 24 hours so we don't re-send the same digest
            Cache::put($cacheKey, $alertHash, now()->addHours(24));
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Send an immediate stock alert for a single consumable (out of stock or low stock).
     */
    public function sendStockAlert(Consumable $consumable): void
    {
        if (!file_exists($this->smtpPath) || !file_exists($this->notifPath)) return;

        $smtp  = json_decode(file_get_contents($this->smtpPath), true);
        $notif = json_decode(file_get_contents($this->notifPath), true);

        $isOutOfStock = $consumable->quantity <= 0;
        $isLowStock   = $consumable->quantity > 0 && $consumable->quantity <= $consumable->low_stock_threshold;

        if ($isOutOfStock && empty($notif['alert_out_of_stock'])) return;
        if ($isLowStock  && empty($notif['alert_low_stock']))   return;
        if (!$isOutOfStock && !$isLowStock)                      return;

        $recipients = array_filter(array_map('trim', explode(',', $notif['recipients'] ?? '')));
        if (empty($recipients)) return;

        // Dedup per consumable: don't re-send same alert within 1 hour
        $cacheKey = "stock_alert_{$consumable->id}_{$consumable->quantity}";
        if (Cache::has($cacheKey)) return;
        Cache::put($cacheKey, true, now()->addHour());

        $this->bootSmtp($smtp);

        $row = [
            'sku'      => $consumable->sku,
            'name'     => $consumable->name,
            'type'     => $consumable->type,
            'quantity' => $consumable->quantity,
            'threshold'=> $consumable->low_stock_threshold,
            'printer'  => $consumable->printer?->name,
        ];

        try {
            Mail::to($recipients)->send(new AlertDigest(
                lowStock: $isLowStock   ? [$row] : [],
                outOfStock: $isOutOfStock ? [$row] : [],
                expiringContracts: [],
                overdueService: [],
            ));
        } catch (\Throwable) {}
    }

    private function bootSmtp(array $smtp): void
    {
        Config::set('mail.mailers.smtp', [
            'transport'  => 'smtp',
            'host'       => $smtp['host']       ?? 'smtp.gmail.com',
            'port'       => $smtp['port']       ?? 587,
            'encryption' => $smtp['encryption'] ?? 'tls',
            'username'   => $smtp['username']   ?? '',
            'password'   => $smtp['password']   ?? '',
        ]);
        Config::set('mail.from.address', $smtp['from_address'] ?? $smtp['username'] ?? '');
        Config::set('mail.from.name',    $smtp['from_name']    ?? 'Printer Asset Management');
    }
}
