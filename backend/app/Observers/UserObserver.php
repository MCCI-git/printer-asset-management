<?php

namespace App\Observers;

use App\Models\User;
use App\Services\ActivityLogger;

class UserObserver
{
    public function created(User $user): void
    {
        ActivityLogger::log(
            action:      'created',
            modelType:   'User',
            modelId:     $user->id,
            modelLabel:  $user->name,
            description: "User \"{$user->name}\" ({$user->email}) was created with role \"{$user->role}\".",
            properties:  ['email' => $user->email, 'role' => $user->role],
        );
    }

    public function updated(User $user): void
    {
        $diff = ActivityLogger::diff($user->getOriginal(), $user->getDirty(), ['password', 'remember_token']);
        if (empty($diff)) return;

        ActivityLogger::log(
            action:      'updated',
            modelType:   'User',
            modelId:     $user->id,
            modelLabel:  $user->name,
            description: "User \"{$user->name}\" was updated (" . implode(', ', array_keys($diff)) . ").",
            properties:  $diff,
        );
    }

    public function deleted(User $user): void
    {
        ActivityLogger::log(
            action:      'deleted',
            modelType:   'User',
            modelId:     $user->id,
            modelLabel:  $user->name,
            description: "User \"{$user->name}\" ({$user->email}) was deleted.",
        );
    }
}
