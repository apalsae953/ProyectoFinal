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

    /**
     * REDIRECT TO SOCIAL PROVIDER
     */
    public function redirectToProvider($provider)
    {
        if (!in_array($provider, ['google', 'github'])) {
            return response()->json(['success' => false, 'message' => 'Proveedor no soportado'], 400);
        }

        return \Laravel\Socialite\Facades\Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * HANDLE PROVIDER CALLBACK
     */
    public function handleProviderCallback($provider)
    {
        try {
            // Saltarnos la validación SSL local para evitar el 'curl error 60' en Windows (solo para desarrollo)
            $httpClient = new \GuzzleHttp\Client(['verify' => false]);
            $socialUser = \Laravel\Socialite\Facades\Socialite::driver($provider)
                            ->stateless()
                            ->setHttpClient($httpClient)
                            ->user();
            
            // Buscar si el usuario ya existe por proveedor y ID
            $user = User::where('provider', $provider)->where('provider_id', $socialUser->getId())->first();

            // Si no existe con este provider_id, buscar si existe por email
            if (!$user) {
                $user = User::where('email', $socialUser->getEmail())->first();

                if ($user) {
                    // Actualizamos sus datos para incluir este provider
                    $user->update([
                        'provider' => $provider,
                        'provider_id' => $socialUser->getId(),
                        'avatar' => $user->avatar ?? $socialUser->getAvatar(),
                    ]);
                } else {
                    // Crear un nuevo usuario
                    $user = User::create([
                        'name' => $socialUser->getName() ?? $socialUser->getNickname(),
                        'email' => $socialUser->getEmail(),
                        'provider' => $provider,
                        'provider_id' => $socialUser->getId(),
                        'avatar' => $socialUser->getAvatar(),
                        // No password for social login
                    ]);
                }
            }

            // Crear el token
            $token = $user->createToken('auth_token')->plainTextToken;

            // Redirigir al frontend con el token
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            return redirect($frontendUrl . '/oauth/callback?token=' . $token);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Error en login social con {$provider}: " . $e->getMessage());
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            return redirect($frontendUrl . '/login?error=social_auth_failed');
        }
    }
}