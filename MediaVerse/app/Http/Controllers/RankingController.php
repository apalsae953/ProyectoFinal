<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Ranking;
use App\Models\RankingItem;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RankingController extends Controller
{
    // Obtener rankings públicos (Globales)
    public function index(Request $request)
    {
        $tipo = $request->query('tipo');
        $q = $request->query('q');
        
        $query = Ranking::with('user:id,name,avatar')->where('is_public', true);
        
        if ($tipo) {
            $query->where('tipo', $tipo);
        }

        if ($q) {
            $query->where('titulo', 'like', "%{$q}%");
        }

        // Si el usuario está autenticado, verificamos si ha dado like
        $user = auth('sanctum')->user();
        if ($user) {
            $query->withExists(['likes as is_liked' => function ($query) use ($user) {
                $query->where('user_id', $user->id);
            }]);
        }

        $rankings = $query->withCount('items')
                          ->withCount('likes')
                          ->orderBy('likes_count', 'desc')
                          ->orderBy('created_at', 'desc')
                          ->paginate(15);
        
        return response()->json($rankings);
    }

    // Obtener mis rankings (Privados y Públicos)
    public function myRankings(Request $request)
    {
        $rankings = Ranking::with('user:id,name,avatar')
            ->where('user_id', $request->user()->id)
            ->withCount('items')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($rankings);
    }

    // Crear un nuevo ranking
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'tipo' => 'required|in:movies,series,games,mixed',
            'is_public' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ranking = Ranking::create([
            'user_id' => $request->user()->id,
            'titulo' => $request->titulo,
            'descripcion' => $request->descripcion,
            'tipo' => $request->tipo,
            'is_public' => $request->is_public ?? true
        ]);

        return response()->json([
            'message' => 'Ranking creado exitosamente',
            'ranking' => $ranking
        ], 201);
    }

    // Ver el detalle de un ranking con sus items
    public function show($id)
    {
        $ranking = Ranking::with(['user:id,name,avatar', 'items' => function($query) {
            $query->orderBy('position', 'asc');
        }])->findOrFail($id);

        return response()->json($ranking);
    }

    // Actualizar un ranking (titulo, desc, is_public)
    public function update(Request $request, $id)
    {
        $ranking = Ranking::findOrFail($id);

        if ($ranking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'titulo' => 'sometimes|string|max:255',
            'descripcion' => 'nullable|string',
            'is_public' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ranking->update($request->all());

        return response()->json([
            'message' => 'Ranking actualizado',
            'ranking' => $ranking
        ]);
    }

    // Eliminar un ranking
    public function destroy(Request $request, $id)
    {
        $ranking = Ranking::findOrFail($id);

        if ($ranking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $ranking->delete();

        return response()->json(['message' => 'Ranking eliminado']);
    }

    // Añadir un item al ranking
    public function addItem(Request $request, $id)
    {
        $ranking = Ranking::findOrFail($id);

        if ($ranking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Validar tipo (mixed permite todos, movies sólo movies, etc.)
        $validator = Validator::make($request->all(), [
            'media_id' => 'required|integer',
            'media_type' => 'required|in:movie,tv,game',
            'media_name' => 'nullable|string',
            'media_image' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($ranking->tipo !== 'mixed') {
            if (($ranking->tipo === 'movies' && $request->media_type !== 'movie') ||
                ($ranking->tipo === 'series' && $request->media_type !== 'tv') ||
                ($ranking->tipo === 'games' && $request->media_type !== 'game')) {
                return response()->json(['message' => 'El tipo de medio no coincide con el tipo de ranking'], 400);
            }
        }

        // Check if media already in this ranking
        $exists = RankingItem::where('ranking_id', $ranking->id)
            ->where('media_id', $request->media_id)
            ->where('media_type', $request->media_type)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Este elemento ya está en el ranking'], 400);
        }

        // Get next position
        $maxPosition = RankingItem::where('ranking_id', $ranking->id)->max('position');
        $position = $maxPosition ? $maxPosition + 1 : 1;

        $item = RankingItem::create([
            'ranking_id' => $ranking->id,
            'media_id' => $request->media_id,
            'media_type' => $request->media_type,
            'media_name' => $request->media_name,
            'media_image' => $request->media_image,
            'position' => $position
        ]);

        return response()->json([
            'message' => 'Elemento añadido al ranking',
            'item' => $item
        ], 201);
    }

    // Eliminar un item
    public function removeItem(Request $request, $id, $item_id)
    {
        $ranking = Ranking::findOrFail($id);

        if ($ranking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $item = RankingItem::where('ranking_id', $ranking->id)->findOrFail($item_id);
        $item->delete();
        
        // Reordenar items después de borrar
        $items = RankingItem::where('ranking_id', $ranking->id)->orderBy('position', 'asc')->get();
        foreach ($items as $index => $i) {
            $i->update(['position' => $index + 1]);
        }

        return response()->json(['message' => 'Elemento eliminado']);
    }

    // Reordenar items enviando array [{id: 1, position: 1}, {id: 2, position: 2}]
    public function reorderItems(Request $request, $id)
    {
        $ranking = Ranking::findOrFail($id);

        if ($ranking->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $items = $request->input('items', []);

        DB::transaction(function () use ($ranking, $items) {
            foreach ($items as $itemData) {
                RankingItem::where('ranking_id', $ranking->id)
                    ->where('id', $itemData['id'])
                    ->update(['position' => $itemData['position']]);
            }
        });

        return response()->json(['message' => 'Ranking reordenado correctamente']);
    }

    public function toggleLike(Request $request, $id)
    {
        $ranking = Ranking::findOrFail($id);

        if ($ranking->user_id === $request->user()->id) {
            return response()->json(['message' => 'No puedes dar like a tu propio ranking'], 400);
        }

        $ranking->likes()->toggle($request->user()->id);

        return response()->json([
            'message' => 'Like actualizado',
            'likes_count' => $ranking->likes()->count()
        ]);
    }
}
