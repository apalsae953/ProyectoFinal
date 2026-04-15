<?php

namespace App\Http\Controllers;

use App\Models\Cuestionario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TriviaController extends Controller
{
    /**
     * OBTENER TODOS LOS CUESTIONARIOS DISPONIBLES (Para el menú principal del juego)
     */
    public function getCuestionarios()
    {
        try {
            // Incluimos el conteo de preguntas para que el Frontend sepa si se puede jugar
            $cuestionarios = Cuestionario::withCount('preguntas')->get();

            return response()->json([
                'success' => true,
                'data' => $cuestionarios
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cargar cuestionarios: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * OBTENER LAS MEJORES PUNTUACIONES DEL USUARIO ACTUAL
     */
    public function getBestScores(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['success' => false], 401);

        // Solo recuperamos las mejores puntuaciones DE ESTA SEMANA (se resetea cada lunes 00:00)
        $bestScores = $user->puntuacionesCuestionarios()
            ->where('created_at', '>=', now()->startOfWeek())
            ->select('cuestionario_id', DB::raw('MAX(puntuacion) as best_score'))
            ->groupBy('cuestionario_id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $bestScores
        ]);
    }

    /**
     *JUGAR UN CUESTIONARIO ESPECÍFICO
     */
    public function jugarCuestionario(Request $request, $id)
    {
        // 1. Buscamos el cuestionario primero
        $cuestionario = Cuestionario::find($id);

        if (!$cuestionario) {
            return response()->json([
                'success' => false,
                'message' => 'Cuestionario no encontrado.'
            ], 404);
        }

        // 2. Obtenemos todos los IDs de preguntas de este cuestionario
        $preguntasIds = $cuestionario->preguntas()->pluck('id')->toArray();

        // 3. Sistema Anti-Repetición: Excluir IDs vistos recientemente por el usuario
        $userId = auth('sanctum')->id() ?? $request->ip();
        $cacheKey = "trivia_history_{$userId}_{$id}";
        $vistasRecientemente = \Illuminate\Support\Facades\Cache::get($cacheKey, []);

        // Filtramos las preguntas para no repetir las últimas 20 si hay pool suficiente
        $candidatas = array_diff($preguntasIds, $vistasRecientemente);
        
        // Si al filtrar nos quedamos con muy pocas, reseteamos para no bloquear el juego
        if (count($candidatas) < 10) {
            $candidatas = $preguntasIds;
            $vistasRecientemente = [];
        }

        // 4. Barajamos los IDs y cogemos 10
        shuffle($candidatas);
        $seleccionados = array_slice($candidatas, 0, 10);

        // 5. Guardar los nuevos IDs en el historial (manteniendo los últimos 20)
        $nuevoHistorial = array_slice(array_unique(array_merge($seleccionados, $vistasRecientemente)), 0, 20);
        \Illuminate\Support\Facades\Cache::put($cacheKey, $nuevoHistorial, 1800); // 30 min memoria

        // 6. Cargamos las preguntas completas con sus respuestas
        $cuestionario->load(['preguntas' => function ($query) use ($seleccionados) {
            $query->whereIn('id', $seleccionados)->with('respuestas');
        }]);

        // 3. Barajamos las respuestas para que la correcta no esté siempre en el mismo sitio
        foreach ($cuestionario->preguntas as $pregunta) {
            // Reemplazamos las respuestas ordenadas por las barajadas
            $pregunta->setRelation('respuestas', $pregunta->respuestas->shuffle()->values());
        }

        // 4. Devolvemos el JSON perfectamente empaquetado para React
        return response()->json([
            'success' => true,
            'data' => $cuestionario
        ], 200);
    }

    /**
     * GUARDAR LA PUNTUACIÓN DEL USUARIO
     */
    public function guardarPuntuacion(Request $request, $id)
    {
        // 1. Validamos que React nos envíe los datos correctamente
        $request->validate([
            'puntuacion' => 'required|integer|min:0',
            'tiempo_tardado_segundos' => 'nullable|integer|min:0'
        ]);

        // 2. Comprobamos que el cuestionario existe
        $cuestionario = Cuestionario::find($id);
        if (!$cuestionario) {
            return response()->json([
                'success' => false,
                'message' => 'Cuestionario no encontrado.'
            ], 404);
        }

        // 3. Guardamos la puntuación conectándola con el usuario logueado
        // $request->user() obtiene automáticamente al usuario gracias al token de Sanctum
        $puntuacion = $request->user()->puntuacionesCuestionarios()->create([
            'cuestionario_id' => $cuestionario->id,
            'puntuacion' => $request->puntuacion,
            'tiempo_tardado_segundos' => $request->tiempo_tardado_segundos
        ]);

        return response()->json([
            'success' => true,
            'message' => '¡Puntuación guardada con éxito!',
            'data' => $puntuacion
        ], 201);
    }
}