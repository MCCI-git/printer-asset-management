<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Single source of truth for all date/period logic in the app.
 * Change fiscal year rules here only — nowhere else.
 */
class Calendar
{
    public static function currentYear(): int
    {
        return now()->year;
    }

    public static function currentMonth(): int
    {
        return now()->month;
    }

    /**
     * How many months of the given year have elapsed (full year = 12 if past).
     */
    public static function monthsElapsed(int $year): int
    {
        return $year === self::currentYear() ? self::currentMonth() : 12;
    }

    public static function yearStart(int $year): Carbon
    {
        return Carbon::create($year, 1, 1)->startOfDay();
    }

    public static function yearEnd(int $year): Carbon
    {
        return Carbon::create($year, 12, 31)->endOfDay();
    }

    public static function isFutureYear(int $year): bool
    {
        return $year > self::currentYear();
    }
}
