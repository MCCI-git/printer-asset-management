<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Printer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NetworkScanController extends Controller
{
    private const PRINTER_PORTS = [9100, 515, 631];
    private const CONNECT_TIMEOUT_US = 400000; // 400ms per socket
    private const BATCH_SIZE = 50;             // sockets open at once

    public function scan(Request $request): JsonResponse
    {
        $request->validate([
            'start' => 'required|ip',
            'end'   => 'required|ip',
        ]);

        $ips = $this->expandRange($request->input('start'), $request->input('end'));

        if (count($ips) > 254) {
            return response()->json(['message' => 'Range too large. Max 254 IPs.'], 422);
        }

        $found = [];
        foreach (array_chunk($ips, self::BATCH_SIZE) as $batch) {
            $found = array_merge($found, $this->probeBatch($batch));
        }

        // Tag which printers already have each IP assigned
        $assigned = Printer::whereIn('ip_address', $found)->get(['id', 'name', 'asset_tag', 'ip_address']);
        $assignedMap = $assigned->keyBy('ip_address');

        $results = array_map(fn($ip) => [
            'ip'       => $ip,
            'printer'  => isset($assignedMap[$ip]) ? [
                'id'        => $assignedMap[$ip]->id,
                'name'      => $assignedMap[$ip]->name,
                'asset_tag' => $assignedMap[$ip]->asset_tag,
            ] : null,
        ], $found);

        return response()->json(['results' => array_values($results), 'scanned' => count($ips)]);
    }

    public function assign(Request $request): JsonResponse
    {
        $request->validate([
            'printer_id' => 'required|exists:printers,id',
            'ip_address' => 'required|ip',
        ]);

        $printer = Printer::findOrFail($request->input('printer_id'));
        $printer->update(['ip_address' => $request->input('ip_address')]);

        return response()->json(['message' => "IP {$request->input('ip_address')} assigned to {$printer->name}."]);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private function expandRange(string $start, string $end): array
    {
        $startLong = ip2long($start);
        $endLong   = ip2long($end);

        if ($startLong > $endLong) {
            [$startLong, $endLong] = [$endLong, $startLong];
        }

        $ips = [];
        for ($i = $startLong; $i <= $endLong; $i++) {
            $ips[] = long2ip($i);
        }
        return $ips;
    }

    private function probeBatch(array $ips): array
    {
        $sockets = []; // ['socket' => resource, 'ip' => string]

        foreach ($ips as $ip) {
            foreach (self::PRINTER_PORTS as $port) {
                $sock = @stream_socket_client(
                    "tcp://{$ip}:{$port}",
                    $errno,
                    $errstr,
                    0,
                    STREAM_CLIENT_CONNECT | STREAM_CLIENT_ASYNC_CONNECT
                );
                if ($sock) {
                    stream_set_blocking($sock, false);
                    $sockets[] = ['socket' => $sock, 'ip' => $ip, 'port' => $port];
                }
            }
        }

        if (empty($sockets)) return [];

        $found = [];
        $deadline = microtime(true) + (self::CONNECT_TIMEOUT_US / 1_000_000);

        while (!empty($sockets) && microtime(true) < $deadline) {
            $write = $except = array_column($sockets, 'socket');
            $read  = [];
            $changed = @stream_select($read, $write, $except, 0, 100_000);

            if ($changed === false || $changed === 0) continue;

            $remaining = [];
            foreach ($sockets as $entry) {
                $sock = $entry['socket'];
                if (in_array($sock, $write, true) || in_array($sock, $except, true)) {
                    // Check if actually connected
                    $peer = @stream_socket_get_name($sock, true);
                    if ($peer !== false && !in_array($entry['ip'], $found)) {
                        $found[] = $entry['ip'];
                    }
                    fclose($sock);
                } else {
                    $remaining[] = $entry;
                }
            }
            $sockets = $remaining;
        }

        foreach ($sockets as $entry) {
            @fclose($entry['socket']);
        }

        return $found;
    }
}
