<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * REGISTRO DE NUEVOS USUARIOS
     */
    public function register(Request $request)
    {
        // 1. Validamos los datos que nos envía React
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        // 2. Creamos el usuario en la base de datos
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password), // ¡Siempre encriptada!
        ]);

        // 3. Generamos el Token de acceso con Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        // 4. Devolvemos la respuesta a React
        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado correctamente',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ], 201);
    }

    /**
     *INICIO DE SESIÓN
     */
    public function login(Request $request)
    {
        // 1. Validamos que nos envíen email y contraseña
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Buscamos al usuario por su email
        $user = User::where('email', $request->email)->first();

        // 3. Verificamos si existe y si la contraseña es correcta
        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        // 4. Borramos tokens antiguos (Es opcional pero lo hacemos para no acumular tokens como burros)
        $user->tokens()->delete();

        // 5. Creamos un nuevo Token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Inicio de sesión exitoso',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ], 200);
    }

    /**
     * CERRAR SESIÓN (Revocar el Token)
     */
    public function logout(Request $request)
    {
        // Eliminamos el token que está usando actualmente el usuario
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente'
        ], 200);
    }
}