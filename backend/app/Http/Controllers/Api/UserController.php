<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index()
    {
        return User::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(['super-admin', 'admin', 'reports', 'view'])],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'locked'])],
        ]);

        $data['password'] = bcrypt($data['password']);

        return response()->json(User::create($data), 201);
    }

    public function show(string $id)
    {
        return User::findOrFail($id);
    }

    public function update(Request $request, string $id)
    {
        $target = User::findOrFail($id);
        $actor = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target->id)],
            'role' => ['sometimes', Rule::in(['super-admin', 'admin', 'reports', 'view'])],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'locked'])],
        ]);

        if (array_key_exists('role', $data) && $data['role'] !== $target->role) {
            if (!$actor->isSuperAdmin()) {
                throw ValidationException::withMessages([
                    'role' => 'Only a super admin can change roles.',
                ])->status(403);
            }

            if ($target->isSuperAdmin() && $target->id !== $actor->id) {
                throw ValidationException::withMessages([
                    'role' => 'A super admin cannot change the role of another super admin. They must log in and change it themselves.',
                ])->status(403);
            }

            if ($target->isSuperAdmin() && $target->id === $actor->id && $data['role'] !== 'super-admin') {
                $otherSuperAdmins = User::where('role', 'super-admin')->where('id', '!=', $actor->id)->exists();
                if (!$otherSuperAdmins) {
                    throw ValidationException::withMessages([
                        'role' => 'You cannot give up the super admin role while you are the only super admin. Promote another user first.',
                    ])->status(403);
                }
            }
        }

        $target->update($data);

        return $target->fresh();
    }

    public function destroy(string $id)
    {
        $target = User::findOrFail($id);
        $actor = request()->user();

        if ($target->isSuperAdmin() && $target->id !== $actor->id) {
            throw ValidationException::withMessages([
                'role' => 'A super admin cannot delete another super admin account.',
            ])->status(403);
        }

        $target->delete();

        return response()->noContent();
    }

    public function toggleStatus(string $id)
    {
        $target = User::findOrFail($id);
        $actor = request()->user();

        if ($target->isSuperAdmin() && $target->id !== $actor->id) {
            throw ValidationException::withMessages([
                'status' => 'A super admin cannot disable another super admin account.',
            ])->status(403);
        }

        $target->status = $target->status === 'active' ? 'inactive' : 'active';
        $target->save();

        return $target->fresh();
    }
}
