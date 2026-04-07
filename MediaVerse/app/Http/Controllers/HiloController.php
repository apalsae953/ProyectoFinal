<?php

namespace App\Http\Controllers;

use App\Models\Hilo;
use App\Models\Medio;
use App\Models\RespuestaHilo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class HiloController extends Controller
{
    /**
     * SACAR EL LISTADO DE HILOS (Público)
     */
    public function index(Request $request)
    {
        $query = Hilo::with(['user:id,name,avatar', 'medios'])
            ->withCount('respuestas');

        // Filtrar por categoría (busca hilos que contengan esa categoría en su JSON)
        if ($request->has('categoria') && $request->categoria !== 'todos') {
            if ($request->categoria === 'general') {
                $query->where(function ($q) {
                    $q->whereNull('categorias')
                      ->orWhere('categorias', '[]');
                });
            } else {
                $query->whereJsonContains('categorias', $request->categoria);
            }
        }

        // Si buscamos algo en concreto por texto
        if ($request->has('search') && trim($request->search) !== '') {
            $term = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('titulo', 'LIKE', $term)
                  ->orWhere('contenido', 'LIKE', $term);
            });
        }

        // Parámetro para el Dashboard (3 más populares del último día con actividad)
        if ($request->has('dashboard')) {
            $ultimoHilo = Hilo::latest()->first();
            
            if (!$ultimoHilo) {
                return response()->json(['success' => true, 'data' => []], 200);
            }

            // Tomamos la fecha exacta del hilo más reciente
            $fechaCercana = $ultimoHilo->created_at->toDateString();

            $topDiaCercano = (clone $query)
                ->whereDate('created_at', $fechaCercana)
                ->orderByDesc('respuestas_count')
                ->orderByDesc('created_at')
                ->limit(3)
                ->get();

            return response()->json(['success' => true, 'data' => $topDiaCercano], 200);
        }

        // Ordenamos según la opción seleccionada
        $sort = $request->get('sort', 'recientes');
        switch ($sort) {
            case 'populares': $query->orderByDesc('respuestas_count'); break;
            case 'antiguos': $query->orderBy('created_at', 'asc'); break;
            default: $query->latest(); break;
        }

        return response()->json(['success' => true, 'data' => $query->get()], 200);
    }

    /**
     * VER EL HILO A FONDO CON SUS COMENTARIOS (Árbol recursivo)
     */
    public function show($id)
    {
        $hilo = Hilo::with(['user:id,name,avatar', 'medios'])->find($id);

        if (!$hilo) {
            return response()->json(['success' => false, 'message' => 'Hilo no encontrado'], 404);
        }

        // Recuperamos todas las respuestas del hilo para construir la estructura jerárquica
        /** @var \Illuminate\Database\Eloquent\Collection<int, \App\Models\RespuestaHilo> $todasRespuestas */
        $todasRespuestas = RespuestaHilo::where('hilo_id', $id)
            ->with(['user:id,name,avatar'])
            ->orderBy('created_at', 'asc') 
            ->get();

        // Construimos un mapa para acceso rápido por ID
        /** @var \App\Models\RespuestaHilo[] $respuestasMap */
        $respuestasMap = [];
        foreach ($todasRespuestas as $r) {
            /** @var \App\Models\RespuestaHilo $r */
            // Inicializamos la colección de respuestas hijas
            $r->setRelation('respuestasHijas', collect());
            $respuestasMap[$r->id] = $r;
        }

        // Organizamos las respuestas en un árbol (padres e hijos)
        $arbolRespuestas = [];
        foreach ($todasRespuestas as $r) {
            if ($r->padre_id && isset($respuestasMap[$r->padre_id])) {
                // Si tiene padre, la añadimos a su colección de respuestasHijas
                $respuestasMap[$r->padre_id]->getRelation('respuestasHijas')->push($r);
            } else if (!$r->padre_id) {
                // Si no tiene padre, es una respuesta de primer nivel
                $arbolRespuestas[] = $r;
            }
        }

        // Invertimos las respuestas principales para mostrar las más recientes primero
        // Usamos values() para asegurar que la respuesta sea un array JSON válido
        $arbolRespuestas = collect($arbolRespuestas)->reverse()->values();

        $hilo->setRelation('respuestas', $arbolRespuestas);

        return response()->json(['success' => true, 'data' => $hilo], 200);
    }

    /**
     * CREAR UN NUEVO HILO
     * - categorias: géneros seleccionados por el usuario
     * - medios: lista de películas, series o juegos vinculados
     */
    public function store(Request $request)
    {
        $request->validate([
            'titulo' => 'required|string|max:255',
            'contenido' => 'required|string',
            'categorias' => 'nullable|array',
            'categorias.*' => 'in:pelicula,serie,videojuego',
            'medios' => 'nullable|array',
            'medios.*.api_id' => 'required_with:medios|integer',
            'medios.*.tipo' => 'required_with:medios|in:pelicula,videojuego,serie',
            'medios.*.titulo' => 'required_with:medios|string',
            'medios.*.poster_path' => 'nullable|string',
        ]);

        try {
            $hilo = Hilo::create([
                'user_id' => $request->user()->id,
                'titulo' => $request->titulo,
                'contenido' => $request->contenido,
                'categorias' => $request->categorias ?? []
            ]);

            // Enganchamos todos los medios que vengan en el paquete
            if ($request->medios && is_array($request->medios)) {
                foreach ($request->medios as $m) {
                    $medio = Medio::firstOrCreate(
                        ['api_id' => $m['api_id'], 'tipo' => $m['tipo']],
                        ['titulo' => $m['titulo'], 'poster_path' => $m['poster_path'] ?? null]
                    );
                    // Vincular medios evitando duplicidades en la tabla pivote
                    $hilo->medios()->syncWithoutDetaching([$medio->id]);
                }
            }

            $hilo->load(['user:id,name,avatar', 'medios']);
            $hilo->loadCount('respuestas');

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

    /**
     * ELIMINAR UN HILO (Solo permitido al autor)
     */
    public function destroy(Request $request, $id)
    {
        $hilo = Hilo::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $hilo->medios()->detach();
        $hilo->delete();

        return response()->json(['success' => true, 'message' => 'Hilo eliminado.']);
    }
}