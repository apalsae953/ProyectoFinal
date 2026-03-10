<?php

namespace App\Http\Controllers;

use App\Models\Hilo;
use App\Models\Medio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class HiloController extends Controller
{
    /**
     * OBTENER TODOS LOS HILOS (Público)
     * Puede recibir un ?api_id=123&tipo=pelicula para filtrar los hilos de una peli concreta.
     */
    public function index(Request $request)
    {
        // Iniciamos la consulta cargando el autor y el medio asociado (para evitar el problema N+1)
        $query = Hilo::with(['user:id,name', 'medio']);

        // Si React nos pide los hilos de una película/juego específico
        if ($request->has('api_id') && $request->has('tipo')) {
            $medio = Medio::where('api_id', $request->api_id)->where('tipo', $request->tipo)->first();
            if ($medio) {
                $query->where('medio_id', $medio->id);
            } else {
                // Si el medio no existe en DB, es imposible que tenga hilos
                return response()->json(['success' => true, 'data' => []], 200);
            }
        }

        // Devolvemos los hilos ordenados por los más recientes
        return response()->json([
            'success' => true,
            'data' => $query->latest()->get()
        ], 200);
    }

    /**
     * VER UN HILO ESPECÍFICO CON SUS RESPUESTAS (Público)
     */
    public function show($id)
    {
        // Traemos el hilo + el autor + las respuestas + los autores de las respuestas
        $hilo = Hilo::with(['user:id,name', 'medio', 'respuestas.user:id,name'])->find($id);

        if (!$hilo) {
            return response()->json(['success' => false, 'message' => 'Hilo no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $hilo], 200);
    }

    /**
     * CREAR UN NUEVO HILO (Protegido)
     */
    public function store(Request $request)
    {
        $request->validate([
            'api_id' => 'required|integer',
            'tipo_medio' => 'required|in:pelicula,videojuego',
            'titulo_medio' => 'required|string',
            'poster_path' => 'nullable|string',
            'titulo' => 'required|string|max:255', // El título del debate
            'contenido' => 'required|string' // El texto explicativo
        ]);

        try {
            // Buscamos o creamos el medio al vuelo
            $medio = Medio::firstOrCreate(
                ['api_id' => $request->api_id, 'tipo' => $request->tipo_medio],
                ['titulo' => $request->titulo_medio, 'poster_path' => $request->poster_path]
            );

            // Creamos el hilo asociado al usuario logueado
            $hilo = Hilo::create([
                'user_id' => $request->user()->id,
                'medio_id' => $medio->id,
                'titulo' => $request->titulo,
                'contenido' => $request->contenido
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Hilo creado con éxito.',
                'data' => $hilo
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error al crear hilo: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al crear el debate.'], 500);
        }
    }
}