<?php

namespace App\Services;

use App\Models\Printer;
use Illuminate\Support\Facades\Log;

class TopAccessService
{
    private const OID_SYS_DESCR      = '1.3.6.1.2.1.1.1.0';
    private const OID_SYS_NAME       = '1.3.6.1.2.1.1.5.0';
    private const OID_PRINTER_STATUS = '1.3.6.1.2.1.25.3.5.1.1.1';
    private const OID_SERIAL         = '1.3.6.1.2.1.43.5.1.1.17.1';
    private const OID_TOTAL_PAGES    = '1.3.6.1.2.1.43.10.2.1.4.1.1';
    private const OID_TONER_CURRENT  = '1.3.6.1.2.1.43.11.1.1.9.1.';
    private const OID_TONER_MAX      = '1.3.6.1.2.1.43.11.1.1.8.1.';
    private const OID_TONER_NAME     = '1.3.6.1.2.1.43.12.1.1.4.1.';

    public function getPrinters(): array
    {
        $printers = Printer::whereNotNull('ip_address')
            ->where('ip_address', '!=', '')
            ->get();

        return $printers->map(fn (Printer $p) => $this->formatPrinter($p))->values()->toArray();
    }

    public function fetchAllLive(): array
    {
        $printers = Printer::whereNotNull('ip_address')
            ->where('ip_address', '!=', '')
            ->get();

        return $printers->map(fn (Printer $p) => $this->queryPrinter($p))->values()->toArray();
    }

    public function formatPrinter(Printer $printer): array
    {
        return [
            'printer_id'  => $printer->id,
            'ip'          => $printer->ip_address,
            'name'        => $printer->name,
            'asset_tag'   => $printer->asset_tag,
            'reachable'   => $printer->snmp_status === 'fetched',
            'status'      => $printer->snmp_printer_status ?? 'unknown',
            'serial'      => $printer->snmp_serial,
            'model'       => $printer->snmp_model,
            'total_pages' => $printer->snmp_total_pages,
            'toner'       => $printer->snmp_toner ?? [],
            'fetched_at'  => $printer->snmp_fetched_at?->toDateTimeString(),
            'error'       => $printer->snmp_status === 'failed' ? 'Last fetch failed.' : null,
        ];
    }

    public function queryPrinter(Printer $printer): array
    {
        try {
            snmp_set_valueretrieval(SNMP_VALUE_PLAIN);
            snmp_set_quick_print(true);

            $community = $printer->snmp_community ?: 'public';

            $sysDescr = @snmpget($printer->ip_address, $community, self::OID_SYS_DESCR, 1500000, 1);
            if ($sysDescr === false) {
                $printer->update(['snmp_status' => 'failed']);
                $printer->refresh();
                return $this->formatPrinter($printer);
            }

            $model = trim($sysDescr);
            $name  = $printer->name;

            $sysName = @snmpget($printer->ip_address, $community, self::OID_SYS_NAME, 1500000, 1);
            if ($sysName !== false) $name = trim($sysName);

            $serial     = null;
            $serialRaw  = @snmpget($printer->ip_address, $community, self::OID_SERIAL, 1500000, 1);
            if ($serialRaw !== false) $serial = trim($serialRaw);

            $totalPages = null;
            $pagesRaw   = @snmpget($printer->ip_address, $community, self::OID_TOTAL_PAGES, 1500000, 1);
            if ($pagesRaw !== false) $totalPages = (int) $pagesRaw;

            $statusRaw    = @snmpget($printer->ip_address, $community, self::OID_PRINTER_STATUS, 1500000, 1);
            $printerStatus = $this->mapStatus((int) $statusRaw);

            $toner = [];
            for ($i = 1; $i <= 4; $i++) {
                $current = @snmpget($printer->ip_address, $community, self::OID_TONER_CURRENT . $i, 1500000, 1);
                $max     = @snmpget($printer->ip_address, $community, self::OID_TONER_MAX . $i, 1500000, 1);
                if ($current === false || $max === false) continue;
                $maxVal  = (int) $max;
                $curVal  = (int) $current;
                $nameRaw = @snmpget($printer->ip_address, $community, self::OID_TONER_NAME . $i, 1500000, 1);
                $toner[] = [
                    'name'    => ($nameRaw !== false) ? strtolower(trim($nameRaw)) : ['black','cyan','magenta','yellow'][$i - 1] ?? "toner-{$i}",
                    'current' => $curVal,
                    'max'     => $maxVal,
                    'percent' => $maxVal > 0 ? round(($curVal / $maxVal) * 100) : 0,
                ];
            }

            $printer->update([
                'snmp_status'         => 'fetched',
                'snmp_total_pages'    => $totalPages,
                'snmp_toner'          => $toner,
                'snmp_model'          => $model,
                'snmp_serial'         => $serial,
                'snmp_printer_status' => $printerStatus,
                'snmp_fetched_at'     => now(),
            ]);

            $printer->refresh();
            return $this->formatPrinter($printer);

        } catch (\Exception $e) {
            Log::error('SNMP error', ['ip' => $printer->ip_address, 'error' => $e->getMessage()]);
            $printer->update(['snmp_status' => 'failed']);
            $printer->refresh();
            return $this->formatPrinter($printer);
        }
    }

    public function testConnection(string $ip, string $community = 'public'): array
    {
        if (!$ip) return ['success' => false, 'message' => 'IP address is required.'];
        try {
            snmp_set_valueretrieval(SNMP_VALUE_PLAIN);
            snmp_set_quick_print(true);
            $sysDescr = @snmpget($ip, $community, self::OID_SYS_DESCR, 1500000, 1);
            if ($sysDescr === false) {
                return ['success' => false, 'message' => "Cannot reach {$ip} via SNMP. Check the IP, community string, and that SNMP is enabled on the printer."];
            }
            return ['success' => true, 'message' => "Connected to {$ip}. Device: " . trim($sysDescr)];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function probeIp(string $ip, string $community = 'public'): array
    {
        try {
            snmp_set_valueretrieval(SNMP_VALUE_PLAIN);
            snmp_set_quick_print(true);

            $sysDescr = @snmpget($ip, $community, self::OID_SYS_DESCR, 1500000, 1);
            if ($sysDescr === false) {
                return ['ip' => $ip, 'reachable' => false, 'name' => $ip, 'status' => 'unknown', 'serial' => null, 'model' => null, 'total_pages' => null, 'toner' => [], 'error' => 'SNMP unreachable', 'fetched_at' => now()->toISOString()];
            }

            $model = trim($sysDescr);
            $name  = $ip;

            $sysName = @snmpget($ip, $community, self::OID_SYS_NAME, 1500000, 1);
            if ($sysName !== false) $name = trim($sysName);

            $serial    = null;
            $serialRaw = @snmpget($ip, $community, self::OID_SERIAL, 1500000, 1);
            if ($serialRaw !== false) $serial = trim($serialRaw);

            $totalPages = null;
            $pagesRaw   = @snmpget($ip, $community, self::OID_TOTAL_PAGES, 1500000, 1);
            if ($pagesRaw !== false) $totalPages = (int) $pagesRaw;

            $statusRaw     = @snmpget($ip, $community, self::OID_PRINTER_STATUS, 1500000, 1);
            $printerStatus = $this->mapStatus((int) $statusRaw);

            $toner = [];
            for ($i = 1; $i <= 4; $i++) {
                $current = @snmpget($ip, $community, self::OID_TONER_CURRENT . $i, 1500000, 1);
                $max     = @snmpget($ip, $community, self::OID_TONER_MAX . $i, 1500000, 1);
                if ($current === false || $max === false) continue;
                $maxVal  = (int) $max;
                $curVal  = (int) $current;
                $nameRaw = @snmpget($ip, $community, self::OID_TONER_NAME . $i, 1500000, 1);
                $toner[] = [
                    'name'    => ($nameRaw !== false) ? strtolower(trim($nameRaw)) : (['black','cyan','magenta','yellow'][$i - 1] ?? "toner-{$i}"),
                    'current' => $curVal,
                    'max'     => $maxVal,
                    'percent' => $maxVal > 0 ? round(($curVal / $maxVal) * 100) : 0,
                ];
            }

            return [
                'ip'          => $ip,
                'reachable'   => true,
                'name'        => $name,
                'status'      => $printerStatus,
                'serial'      => $serial,
                'model'       => $model,
                'total_pages' => $totalPages,
                'toner'       => $toner,
                'error'       => null,
                'fetched_at'  => now()->toISOString(),
            ];
        } catch (\Exception $e) {
            return ['ip' => $ip, 'reachable' => false, 'name' => $ip, 'status' => 'unknown', 'serial' => null, 'model' => null, 'total_pages' => null, 'toner' => [], 'error' => $e->getMessage(), 'fetched_at' => now()->toISOString()];
        }
    }

    private function mapStatus(int $code): string
    {
        return match ($code) {
            3 => 'idle',
            4 => 'printing',
            5 => 'warmup',
            default => 'unknown',
        };
    }
}
