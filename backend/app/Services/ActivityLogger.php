<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    public static function log(
        string $action,
        string $modelType,
        ?int $modelId,
        string $modelLabel,
        string $description,
        ?array $properties = null
    ): void {
        $user = Auth::user();

        ActivityLog::create([
            'user_id'     => $user?->id,
            'user_name'   => $user?->name ?? 'System',
            'action'      => $action,
            'model_type'  => $modelType,
            'model_id'    => $modelId,
            'model_label' => $modelLabel,
            'description' => $description,
            'properties'  => $properties,
        ]);
    }

    /**
     * Build a diff array of changed fields (only scalar fields worth showing).
     */
    public static function diff(array $original, array $changes, array $skip = []): array
    {
        $skip = array_merge(['updated_at', 'created_at'], $skip);
        $diff = [];

        foreach ($changes as $key => $newVal) {
            if (in_array($key, $skip)) continue;
            if (!is_scalar($newVal) && !is_null($newVal)) continue;
            $oldVal = $original[$key] ?? null;
            if ($oldVal != $newVal) {
                $diff[$key] = ['old' => $oldVal, 'new' => $newVal];
            }
        }

        return $diff;
    }
}
