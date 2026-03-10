<?php

namespace App\Http\Controllers;

use App\Models\RespuestaHilo;
use App\Models\Hilo;
use Illuminate\Http\Request;

class RespuestaHiloController extends Controller
{
    /**
     * RESPONDER A UN HILO (Protegido)
     */
    public function store(Request $request, $hilo_id)
    {
        $request->validate([
            'contenido' => 'required|string',
            'padre_id' => 'nullable|exists:respuesta_hilos,id' // Para permitir respuestas a otras respuestas (anidadas)
        ]);

        // Verificamos que el hilo existe
        $hilo = Hilo::find($hilo_id);
        if (!$hilo) {
            return response()->json(['success' => false, 'message' => 'El hilo no existe.'], 404);
        }

        // Creamos la respuesta
        $respuesta = RespuestaHilo::create([
            'hilo_id' => $hilo->id,
            'user_id' => $request->user()->id,
            'padre_id' => $request->padre_id, // Si es nulo, es un comentario principal. Si tiene ID, es una respuesta a otro usuario.
            'contenido' => $request->contenido
        ]);

        // Cargamos el nombre del usuario para que React pueda pintarlo inmediatamente
        $respuesta->load('user:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Respuesta enviada.',
            'data' => $respuesta
        ], 201);
    }
}