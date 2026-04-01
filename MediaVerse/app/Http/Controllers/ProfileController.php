<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $request->user()
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $validData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
            'bio' => 'nullable|string',
            'password' => 'nullable|string|min:8|confirmed',
            'avatar' => 'nullable|string', // Aceptamos URL o base64 por ahora
        ]);

        if (isset($validData['name'])) {
            $user->name = $validData['name'];
        }

        if (isset($validData['email'])) {
            $user->email = $validData['email'];
        }

        if (isset($validData['bio'])) {
            $user->bio = $validData['bio'];
        }

        if (isset($validData['avatar'])) {
            $user->avatar = $validData['avatar'];
        }

        if (!empty($validData['password'])) {
            $user->password = \Illuminate\Support\Facades\Hash::make($validData['password']);
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Perfil actualizado exitosamente',
            'user' => $user
        ]);
    }
}
