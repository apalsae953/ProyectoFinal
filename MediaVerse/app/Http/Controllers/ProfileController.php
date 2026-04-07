<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * Obtener los datos del perfil del usuario autenticado
     */
    public function show(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $request->user()
        ]);
    }

    /**
     * Actualizar la información del perfil del usuario
     */
    public function update(Request $request)
    {
        $user = $request->user();

        // Validamos con filtros de seguridad estrictos (longitud máxima)
        $validData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
            'bio' => 'nullable|string|max:1000',
            'password' => 'nullable|string|min:8|confirmed',
            // Limitamos a 500k caracteres (aprox 400KB reales) para seguridad
            'avatar' => 'nullable|string|max:500000', 
            'pelicula_favorita' => 'nullable|array',
            'serie_favorita' => 'nullable|array',
            'juego_favorito' => 'nullable|array',
        ]);

        // Actualizamos solo los campos autorizados y presentes
        if (isset($validData['name'])) $user->name = $validData['name'];
        if (isset($validData['email'])) $user->email = $validData['email'];
        if (isset($validData['bio'])) $user->bio = $validData['bio'];

        if (array_key_exists('avatar', $validData)) {
            $user->avatar = $validData['avatar'];
        }

        // Asignación de contenido favorito (almacenado como JSON en BD)
        if (array_key_exists('pelicula_favorita', $validData)) $user->pelicula_favorita = $validData['pelicula_favorita'];
        if (array_key_exists('serie_favorita', $validData)) $user->serie_favorita = $validData['serie_favorita'];
        if (array_key_exists('juego_favorito', $validData)) $user->juego_favorito = $validData['juego_favorito'];

        // Encriptar nueva contraseña si el usuario decide cambiarla
        if (!empty($validData['password'])) {
            $user->password = \Illuminate\Support\Facades\Hash::make($validData['password']);
        }

        try {
            $user->save();
            return response()->json([
                'success' => true,
                'message' => 'Perfil actualizado exitosamente',
                'user' => $user
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Error actualizando perfil: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar el perfil. Los datos son demasiado pesados o hay un problema en la base de datos.'
            ], 500);
        }
    }
}
