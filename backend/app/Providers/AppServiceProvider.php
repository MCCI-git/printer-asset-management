<?php

namespace App\Providers;

use App\Models\Consumable;
use App\Models\Contract;
use App\Models\Printer;
use App\Models\Supplier;
use App\Models\WorkOrder;
use App\Observers\ConsumableObserver;
use App\Observers\ContractObserver;
use App\Observers\PrinterObserver;
use App\Observers\SupplierObserver;
use App\Observers\WorkOrderObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Printer::observe(PrinterObserver::class);
        Consumable::observe(ConsumableObserver::class);
        WorkOrder::observe(WorkOrderObserver::class);
        Contract::observe(ContractObserver::class);
        Supplier::observe(SupplierObserver::class);

        $smtpPath = storage_path('app/smtp_config.json');
        if (file_exists($smtpPath)) {
            $config = json_decode(file_get_contents($smtpPath), true);
            if ($config) {
                $encryption = ($config['encryption'] ?? 'tls') === 'none' ? null : ($config['encryption'] ?? 'tls');
                config([
                    'mail.default'                 => 'smtp',
                    'mail.mailers.smtp.transport'  => 'smtp',
                    'mail.mailers.smtp.host'       => $config['host'] ?? '',
                    'mail.mailers.smtp.port'       => (int) ($config['port'] ?? 587),
                    'mail.mailers.smtp.encryption' => $encryption,
                    'mail.mailers.smtp.username'   => $config['username'] ?? '',
                    'mail.mailers.smtp.password'   => $config['password'] ?? '',
                    'mail.from.address'            => $config['from_address'] ?? '',
                    'mail.from.name'               => $config['from_name'] ?? config('app.name'),
                ]);
            }
        }
    }
}
