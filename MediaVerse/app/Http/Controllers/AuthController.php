<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Registro de usuarios
    public function register(Request $request)
    {
        // 1. Validamos los datos que nos envía React (Añadimos confirmación)
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed', // 'confirmed' busca password_confirmation
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

    // Login
    public function login(Request $request)
    {
        // 1. Validamos que nos envíen email y contraseña
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Buscamos al usuario por su email
        $user = User::where('email', $request->email)->first();

        // Verificar credenciales

        // Borrar tokens previos
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
            // Cliente HTTP sin verificación SSL para dev
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

    // Recuperar contraseña
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        
        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Enlace enviado si el correo existe.'
            ]);
        }

        // 2. Usamos el 'broker' oficial de Laravel para generar el token y enviar el email
        $status = Password::broker()->sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'success' => true,
                'message' => 'Enlace de recuperación enviado correctamente. Revisa tu correo.'
            ]);
        }

        // Si falla, devolvemos el error específico de Laravel para que sepas qué falta
        return response()->json([
            'success' => false,
            'message' => __($status) // Muestra el error real
        ], 400);
    }

    // Resetear contraseña
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'success' => true,
                'message' => 'Contraseña actualizada correctamente.'
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => __($status)
        ], 400);
    }
}