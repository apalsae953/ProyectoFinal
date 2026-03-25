<?php

namespace App\Http\Controllers;

use App\Models\Valoracion;
use App\Models\Medio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ValoracionController extends Controller
{
    /**
     * GUARDAR O ACTUALIZAR UNA VALORACIÓN
     */
    public function store(Request $request)
    {
        // 1. Validamos que los datos sean correctos y permitimos decimales
        $request->validate([
            'api_id' => 'required|integer',
            'tipo' => 'required|in:pelicula,videojuego',
            'titulo' => 'required|string',
            'poster_path' => 'nullable|string',
            'puntuacion' => 'required|numeric|min:0|max:10', // numeric permite 8.5
            'comentario' => 'nullable|string|max:1000'
        ]);

        try {
            // 2. Buscamos el Medio en nuestra DB. Si no existe, lo creamos al vuelo.
            $medio = Medio::firstOrCreate(
                ['api_id' => $request->api_id, 'tipo' => $request->tipo], // Condición para buscar
                ['titulo' => $request->titulo, 'poster_path' => $request->poster_path] // Datos si hay que crear
            );

            // 3. Formateamos la puntuación para asegurar que siempre tenga 1 decimal
            $puntuacionExacta = round((float) $request->puntuacion, 1);

            // 4. Creamos o actualizamos la valoración (updateOrCreate evita que un usuario vote 2 veces lo mismo)
            $valoracion = Valoracion::updateOrCreate(
                ['user_id' => $request->user()->id, 'medio_id' => $medio->id],
                ['puntuacion' => $puntuacionExacta, 'comentario' => $request->comentario]
            );

            // Cargamos el nombre del usuario para devolverlo a React
            $valoracion->load('user:id,name');

            return response()->json([
                'success' => true,
                'message' => 'Valoración guardada correctamente.',
                'data' => $valoracion
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error al guardar valoración: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Hubo un problema al guardar la reseña.'
            ], 500);
        }
    }

    /**
     * OBTENER TODAS LAS RESEÑAS DE UNA PELÍCULA/JUEGO
     */
    public function getResenasPorMedio($tipo, $api_id)
    {
        // Buscamos si tenemos ese medio registrado
        $medio = Medio::where('api_id', $api_id)->where('tipo', $tipo)->first();

        // Si no existe en nuestra DB, significa que nadie ha comentado aún
        if (!$medio) {
            return response()->json([
                'success' => true,
                'data' => [] 
            ], 200);
        }

        // Si existe, traemos todas sus valoraciones con el nombre del autor
        $valoraciones = Valoracion::with('user:id,name')
            ->where('medio_id', $medio->id)
            ->latest() // Las más nuevas primero
            ->get();

        return response()->json([
            'success' => true,
            'data' => $valoraciones
        ], 200);
    }
}