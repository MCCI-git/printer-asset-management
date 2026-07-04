<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AlertDigest;
use App\Models\Consumable;
use App\Models\Contract;
use App\Models\Printer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class SmtpController extends Controller
{
    private string $smtpPath;
    private string $notifPath;

    public function __construct()
    {
        $this->smtpPath  = storage_path('app/smtp_config.json');
        $this->notifPath = storage_path('app/notification_config.json');
    }

    // ── SMTP ──────────────────────────────────────────────────────────────

    public function get(): JsonResponse
    {
        if (!file_exists($this->smtpPath)) {
            return response()->json(null);
        }
        $config = json_decode(file_get_contents($this->smtpPath), true);
        // Never expose the password
        unset($config['password']);
        return response()->json($config);
    }

    public function save(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'host'         => 'required|string',
            'port'         => 'required|integer|min:1|max:65535',
            'encryption'   => 'required|in:tls,ssl,none',
            'username'     => 'required|string',
            'password'     => 'nullable|string',   // nullable so frontend can omit to keep existing
            'from_address' => 'required|email',
            'from_name'    => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $incoming = $validator->validated();

        // Merge with existing so password is preserved if not sent
        $existing = file_exists($this->smtpPath)
            ? json_decode(file_get_contents($this->smtpPath), true)
            : [];

        if (empty($incoming['password'])) {
            $incoming['password'] = $existing['password'] ?? '';
        }

        file_put_contents($this->smtpPath, json_encode($incoming, JSON_PRETTY_PRINT));
        $this->applySmtp($incoming);

        return response()->json(['message' => 'SMTP settings saved.']);
    }

    public function test(): JsonResponse
    {
        $this->bootSmtp();

        $recipient = auth()->user()?->email ?? config('mail.from.address');

        try {
            Mail::raw('This is a test email from Printer Asset Management.', function ($m) use ($recipient) {
                $m->to($recipient)->subject('Test Email — Printer Asset Management');
            });
            return response()->json(['message' => "Test email sent to {$recipient}."]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed: ' . $e->getMessage()], 500);
        }
    }

    // ── NOTIFICATION SETTINGS ─────────────────────────────────────────────

    public function getNotifications(): JsonResponse
    {
        if (!file_exists($this->notifPath)) {
            return response()->json($this->defaultNotifConfig());
        }
        return response()->json(json_decode(file_get_contents($this->notifPath), true));
    }

    public function saveNotifications(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'recipients'             => 'required|string',
            'alert_low_stock'        => 'boolean',
            'alert_out_of_stock'     => 'boolean',
            'alert_contract_expiry'  => 'boolean',
            'contract_expiry_days'   => 'integer|min:7|max:365',
            'alert_overdue_service'  => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $config = array_merge($this->defaultNotifConfig(), $validator->validated());
        file_put_contents($this->notifPath, json_encode($config, JSON_PRETTY_PRINT));

        return response()->json(['message' => 'Notification settings saved.']);
    }

    // ── SEND ALERTS ───────────────────────────────────────────────────────

    public function sendAlerts(): JsonResponse
    {
        $this->bootSmtp();

        $notif = file_exists($this->notifPath)
            ? json_decode(file_get_contents($this->notifPath), true)
            : $this->defaultNotifConfig();

        $recipients = array_filter(array_map('trim', explode(',', $notif['recipients'] ?? '')));
        if (empty($recipients)) {
            return response()->json(['message' => 'No recipient email addresses configured.'], 422);
        }

        $lowStock         = [];
        $outOfStock       = [];
        $expiringContracts = [];
        $overdueService   = [];

        if (!empty($notif['alert_out_of_stock']) || !empty($notif['alert_low_stock'])) {
            $consumables = Consumable::with('printer')->get();
            foreach ($consumables as $c) {
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
            $contracts = Contract::where('status', 'active')
                ->where('end_date', '>=', Carbon::today())
                ->where('end_date', '<=', Carbon::today()->addDays(60))
                ->get();
            foreach ($contracts as $c) {
                $daysLeft = (int) Carbon::today()->diffInDays($c->end_date);
                if ($daysLeft <= 30) {
                    $tier = '30';
                } elseif ($daysLeft <= 45) {
                    $tier = '45';
                } else {
                    $tier = '60';
                }
                $expiringContracts[] = [
                    'name'      => $c->name,
                    'vendor'    => $c->vendor,
                    'end_date'  => Carbon::parse($c->end_date)->format('d M Y'),
                    'days_left' => $daysLeft,
                    'tier'      => $tier,
                    'manager'   => $c->contract_manager,
                ];
            }
            // Sort by days_left ascending (most urgent first)
            usort($expiringContracts, fn($a, $b) => $a['days_left'] <=> $b['days_left']);
        }

        if (!empty($notif['alert_overdue_service'])) {
            $printers = Printer::where('status', 'active')
                ->whereNotNull('next_service_date')
                ->where('next_service_date', '<', Carbon::today())
                ->get();
            foreach ($printers as $p) {
                $overdueService[] = [
                    'asset_tag' => $p->asset_tag,
                    'name'      => $p->name,
                    'due_date'  => Carbon::parse($p->next_service_date)->format('d M Y'),
                    'location'  => $p->location,
                ];
            }
        }

        $totalAlerts = count($lowStock) + count($outOfStock) + count($expiringContracts) + count($overdueService);

        try {
            $mailable = new AlertDigest($lowStock, $outOfStock, $expiringContracts, $overdueService);
            foreach ($recipients as $email) {
                Mail::to($email)->send($mailable);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message'       => 'Alert digest sent to ' . implode(', ', $recipients) . '.',
            'alert_count'   => $totalAlerts,
            'recipients'    => $recipients,
        ]);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────

    private function bootSmtp(): void
    {
        if (file_exists($this->smtpPath)) {
            $this->applySmtp(json_decode(file_get_contents($this->smtpPath), true));
        }
    }

    private function applySmtp(array $config): void
    {
        $encryption = ($config['encryption'] ?? 'tls') === 'none' ? null : ($config['encryption'] ?? 'tls');
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $config['host'] ?? '');
        Config::set('mail.mailers.smtp.port', (int) ($config['port'] ?? 587));
        Config::set('mail.mailers.smtp.encryption', $encryption);
        Config::set('mail.mailers.smtp.username', $config['username'] ?? '');
        Config::set('mail.mailers.smtp.password', $config['password'] ?? '');
        Config::set('mail.from.address', $config['from_address'] ?? '');
        Config::set('mail.from.name', $config['from_name'] ?? config('app.name'));
    }

    private function defaultNotifConfig(): array
    {
        return [
            'recipients'            => '',
            'alert_low_stock'       => true,
            'alert_out_of_stock'    => true,
            'alert_contract_expiry' => true,
            'alert_overdue_service' => true,
        ];
    }
}
