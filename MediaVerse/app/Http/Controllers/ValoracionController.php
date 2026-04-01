<?php

namespace App\Http\Controllers;

use App\Models\Valoracion;
use App\Models\Medio;
use App\Models\Interaccion;
use App\Models\ValoracionVote;
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
            'tipo' => 'required|in:pelicula,videojuego,serie',
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

            // 5. Automatización: Si puntúa, se añade a VISTAS / JUGADO automáticamente
            // Eliminamos otras interacciones primero (siguiendo la lógica de InteraccionController para exclusividad)
            Interaccion::where('user_id', $request->user()->id)
                ->where('medio_id', $medio->id)
                ->delete();

            Interaccion::create([
                'user_id' => $request->user()->id,
                'medio_id' => $medio->id,
                'tipo' => 'visto'
            ]);

            // Cargamos el nombre del usuario para devolverlo a React
            $valoracion->load('user:id,name');

            return response()->json([
                'success' => true,
                'message' => 'Valoración y estado de vista actualizados.',
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
    public function getResenasPorMedio(Request $request, $tipo, $api_id)
    {
        // Buscamos si tenemos ese medio registrado
        $medio = Medio::where('api_id', $api_id)->where('tipo', $tipo)->first();

        // Si no existe en nuestra DB, nadie ha comentado aún
        if (!$medio) {
            return response()->json(['success' => true, 'data' => []], 200);
        }

        // Si existe, traemos todas sus valoraciones con el nombre del autor y votos.
        // Hacemos una carga manual de likes/dislikes para que sea eficiente.
        $valoraciones = Valoracion::with(['user:id,name', 'votes'])
            ->where('medio_id', $medio->id)
            ->get()
            ->map(function ($val) use ($request) {
                // Añadimos contadores calculados y si el usuario actual ha votado
                $val->likes_count = $val->votes->where('type', 'like')->count();
                $val->dislikes_count = $val->votes->where('type', 'dislike')->count();
                $userVote = $request->user() ? $val->votes->where('user_id', $request->user()->id)->first() : null;
                $val->user_vote_type = $userVote ? $userVote->type : null;
                unset($val->votes); // Quitamos la colección pesada de votos
                return $val;
            });

        // Ordenamos según la petición del usuario: La suya propia al principio (si está logueado), y luego por fecha.
        if ($request->user()) {
            $userId = $request->user()->id;
            $valoraciones = $valoraciones->sortBy(function($val) use ($userId) {
                return $val->user_id === $userId ? 0 : 1; 
            })->values();
        } else {
            $valoraciones = $valoraciones->sortByDesc('created_at')->values();
        }

        return response()->json([
            'success' => true,
            'data' => $valoraciones
        ], 200);
    }

    /**
     * DAR LIKE O DISLIKE A UNA RESEÑA
     */
    public function toggleVote(Request $request, $id)
    {
        $request->validate(['type' => 'required|in:like,dislike']);
        $user = $request->user();

        // No puedes votarte a ti mismo
        $valoracion = Valoracion::findOrFail($id);
        if ($valoracion->user_id === $user->id) {
            return response()->json(['success' => false, 'message' => 'No puedes votar tu propia reseña.'], 403);
        }

        // Buscar si ya tiene un voto
        $votoExistente = ValoracionVote::where('user_id', $user->id)
            ->where('valoracion_id', $id)
            ->first();

        if ($votoExistente) {
            if ($votoExistente->type === $request->type) {
                // Si pulsa lo mismo, lo quitamos
                $votoExistente->delete();
                $message = 'Voto eliminado.';
            } else {
                // Si pulsa lo contrario, lo cambiamos
                $votoExistente->update(['type' => $request->type]);
                $message = 'Voto cambiado.';
            }
        } else {
            // Si no tiene voto, lo creamos
            ValoracionVote::create([
                'user_id' => $user->id,
                'valoracion_id' => $id,
                'type' => $request->type
            ]);
            $message = 'Voto registrado.';
        }

        return response()->json(['success' => true, 'message' => $message]);
    }

    /**
     * ELIMINAR UNA RESEÑA
     */
    public function destroy(Request $request, $id)
    {
        $valoracion = Valoracion::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $valoracion->delete();

        return response()->json(['success' => true, 'message' => 'Reseña eliminada.']);
    }
}