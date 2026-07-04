<?php

namespace App\Providers;

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
