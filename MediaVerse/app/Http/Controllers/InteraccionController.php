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
     * Alternar el estado de una interacción (Favoritos, Vistos, Ver más tarde)
     */
    public function toggle(Request $request)
    {
        // Validación de los datos de entrada
        $request->validate([
            'api_id' => 'required|integer',
            'tipo_medio' => 'required|in:pelicula,videojuego,serie,movie,tv,game',
            'titulo' => 'required|string',
            'poster_path' => 'nullable|string',
            'tipo_interaccion' => 'required|in:favorito,visto,ver_mas_tarde'
        ]);

        try {
            // Obtener o registrar el Medio en la base de datos
            $medio = Medio::firstOrCreate(
                ['api_id' => $request->api_id, 'tipo' => $request->tipo_medio],
                ['titulo' => $request->titulo, 'poster_path' => $request->poster_path]
            );

            // Verificar si el usuario ya tiene esta interacción registrada
            $interaccionExistente = Interaccion::where('user_id', $request->user()->id)
                ->where('medio_id', $medio->id)
                ->where('tipo', $request->tipo_interaccion)
                ->first();

            // Lógica de alternancia (Delete si existe, Create si no)
            if ($interaccionExistente) {
                // Si ya lo tenía en favoritos, lo borramos (Click para quitar)
                $interaccionExistente->delete();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Eliminado de ' . $request->tipo_interaccion,
                    'is_attached' => false // Desactivación del estado en el frontend
                ], 200);
            } else {
                // Lógica de EXCLUSIVIDAD: Visto vs Ver Más Tarde
                // Favorito es independiente y no debe borrar nada.
                if ($request->tipo_interaccion === 'visto' || $request->tipo_interaccion === 'ver_mas_tarde') {
                    $opuesto = $request->tipo_interaccion === 'visto' ? 'ver_mas_tarde' : 'visto';
                    Interaccion::where('user_id', $request->user()->id)
                        ->where('medio_id', $medio->id)
                        ->where('tipo', $opuesto)
                        ->delete();
                }

                // Creamos la nueva interacción
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
     * Obtener listado de interacciones agrupadas del usuario
     */
    public function misInteracciones(Request $request)
    {
        // Obtener interacciones ordenadas por fecha de creación
        $interacciones = Interaccion::with('medio')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        // Agrupamos por tipo (favorito, visto, ver_mas_tarde) para el frontend
        $agrupadas = $interacciones->groupBy('tipo');

        // Incluir valoraciones del usuario para mostrar puntuaciones en las miniaturas
        $valoraciones = Valoracion::with('medio')
            ->where('user_id', $request->user()->id)
            ->get();
        
        $agrupadas['valoraciones'] = $valoraciones;

        return response()->json([
            'success' => true,
            'data' => $agrupadas
        ], 200);
    }

    /**
     * ACTUALIZAR LA FECHA DE UNA INTERACCIÓN
     * Permite al usuario modificar manualmente cuándo vio o jugó un título.
     */
    public function updateDate(Request $request, $id)
    {
        // Validamos que la fecha tenga un formato correcto
        $request->validate([
            'fecha' => 'required|date'
        ]);

        try {
            // Buscamos la interacción asegurándonos de que pertenezca al usuario autenticado
            $interaccion = Interaccion::where('id', $id)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();

            // Actualizamos el timestamp de creación para reflejar la nueva fecha
            $interaccion->created_at = $request->fecha;
            $interaccion->save();

            return response()->json([
                'success' => true,
                'message' => 'Fecha de visualización actualizada correctamente.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error al actualizar fecha de interacción: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'No se pudo actualizar la fecha.'
            ], 500);
        }
    }
}