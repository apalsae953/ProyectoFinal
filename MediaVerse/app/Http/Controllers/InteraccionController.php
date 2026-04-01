<?php

namespace App\Http\Controllers;

use App\Models\Interaccion;
use App\Models\Medio;
use App\Models\Valoracion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InteraccionController extends Controller
{
    /**
     * ALTERNAR UNA INTERACCIÓN (Añadir/Quitar Favorito, Visto, etc.)
     */
    public function toggle(Request $request)
    {
        // 1. Validamos los datos. Fíjate que diferenciamos el tipo de medio y el tipo de interacción
        $request->validate([
            'api_id' => 'required|integer',
            'tipo_medio' => 'required|in:pelicula,videojuego,serie,movie,tv,game',
            'titulo' => 'required|string',
            'poster_path' => 'nullable|string',
            'tipo_interaccion' => 'required|in:favorito,visto,ver_mas_tarde'
        ]);

        try {
            // 2. Buscamos el Medio en nuestra DB o lo creamos
            $medio = Medio::firstOrCreate(
                ['api_id' => $request->api_id, 'tipo' => $request->tipo_medio],
                ['titulo' => $request->titulo, 'poster_path' => $request->poster_path]
            );

            // 3. Buscamos si el usuario YA tiene esta interacción con este medio
            $interaccionExistente = Interaccion::where('user_id', $request->user()->id)
                ->where('medio_id', $medio->id)
                ->where('tipo', $request->tipo_interaccion)
                ->first();

            // 4. Lógica de INTERRUPTOR (Toggle)
            if ($interaccionExistente) {
                // Si ya lo tenía en favoritos, lo borramos (Click para quitar)
                $interaccionExistente->delete();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Eliminado de ' . $request->tipo_interaccion,
                    'is_attached' => false // Le decimos a React que apague el corazón
                ], 200);
            } else {
                // Si ya existe otra interacción sobre el MISMO medio (ej: estaba en 'ver_mas_tarde' y cliquean 'visto'), 
                // eliminamos cualquier interacción previa para que sean mutuamente exclusivas
                Interaccion::where('user_id', $request->user()->id)
                    ->where('medio_id', $medio->id)
                    ->delete();

                // Si no lo tenía, lo creamos (Click para añadir)
                Interaccion::create([
                    'user_id' => $request->user()->id,
                    'medio_id' => $medio->id,
                    'tipo' => $request->tipo_interaccion
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Añadido a ' . $request->tipo_interaccion,
                    'is_attached' => true // Le decimos a React que encienda el corazón
                ], 201);
            }

        } catch (\Exception $e) {
            Log::error('Error en InteraccionController@toggle: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Hubo un problema al procesar la interacción.'
            ], 500);
        }
    }

    /**
     * OBTENER LAS LISTAS DEL USUARIO (Perfil)
     */
    public function misInteracciones(Request $request)
    {
        // Traemos las interacciones del usuario y cargamos los datos del medio (título, poster)
        $interacciones = Interaccion::with('medio')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        // Podríamos devolverlo tal cual, pero nivel Senior es agruparlo por "tipo" para React
        $agrupadas = $interacciones->groupBy('tipo');

        // AÑADIDO: También cargamos todas sus valoraciones para poder pintarlas en las cards
        $valoraciones = Valoracion::with('medio')
            ->where('user_id', $request->user()->id)
            ->get();
        
        $agrupadas['valoraciones'] = $valoraciones;

        return response()->json([
            'success' => true,
            'data' => $agrupadas
        ], 200);
    }
}