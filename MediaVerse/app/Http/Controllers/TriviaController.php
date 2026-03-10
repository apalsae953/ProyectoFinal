<?php

namespace App\Http\Controllers;

use App\Models\Cuestionario;
use Illuminate\Http\Request;

class TriviaController extends Controller
{
    /**
     * OBTENER TODOS LOS CUESTIONARIOS DISPONIBLES (Para el menú principal del juego)
     */
    public function getCuestionarios()
    {
        $cuestionarios = Cuestionario::all();

        return response()->json([
            'success' => true,
            'data' => $cuestionarios
        ], 200);
    }

    /**
     *JUGAR UN CUESTIONARIO ESPECÍFICO
     */
    public function jugarCuestionario($id)
    {
        // 1. Buscamos el cuestionario y traemos 10 preguntas al azar usando Eloquent
        $cuestionario = Cuestionario::with(['preguntas' => function ($query) {
            $query->inRandomOrder()->limit(10);
        }, 'preguntas.respuestas'])->find($id);

        // 2. Manejo de error si el usuario pide un ID que no existe
        if (!$cuestionario) {
            return response()->json([
                'success' => false,
                'message' => 'Cuestionario no encontrado.'
            ], 404);
        }

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