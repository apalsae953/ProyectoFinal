<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cuestionario;
use App\Models\Pregunta;
use App\Models\Respuesta;
use Illuminate\Support\Facades\DB;

class TriviaSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function() {
            // 0. Limpieza total rápida
            DB::statement('TRUNCATE TABLE respuestas, preguntas, cuestionarios RESTART IDENTITY CASCADE');

            // 1. Cuestionarios
            $cCine = Cuestionario::create([
                'titulo' => 'Películas y Series',
                'descripcion' => 'Demuestra tus conocimientos sobre cine y series.',
                'categoria' => 'peliculas_y_series',
                'dificultad' => 'medio'
            ]);

            $cJuegos = Cuestionario::create([
                'titulo' => 'Cultura de Videojuegos',
                'descripcion' => '¿Eres un verdadero gamer?',
                'categoria' => 'videojuegos',
                'dificultad' => 'medio'
            ]);

            $cMixto = Cuestionario::create([
                'titulo' => 'Modo Mixto: Todo Vale',
                'descripcion' => 'Cine, series y videojuegos mezclados. Solo los más expertos sobreviven.',
                'categoria' => 'mixto',
                'dificultad' => 'dificil'
            ]);

            // 2. Datos Cine (Consolidados)
            $datosCine = [
                ['p' => "¿Quién dirigió 'Origen'?", 'r' => ["Christopher Nolan", "Spielberg", "Tarantino", "Scorsese"], 'c' => 0],
                ['p' => "¿Actor de Iron Man?", 'r' => ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], 'c' => 1],
                ['p' => "¿Director de 'El Padrino'?", 'r' => ["Francis Ford Coppola", "Scorsese", "Kubrick", "Hitchcock"], 'c' => 0],
                ['p' => "¿Neo elige la pastilla...?", 'r' => ["Azul", "Verde", "Roja", "Amarilla"], 'c' => 2],
                ['p' => "¿Padre de Luke Skywalker?", 'r' => ["Darth Vader", "Obi-Wan Kenobi", "Yoda", "Han Solo"], 'c' => 0],
                ['p' => "¿Protagonista de Toy Story?", 'r' => ["Woody", "Buzz", "Rex", "Slinky"], 'c' => 0],
                ['p' => "¿Actor de Jack Dawson?", 'r' => ["DiCaprio", "Pitt", "Depp", "Cruise"], 'c' => 0],
                ['p' => "¿Villano de Avengers: Infinity War?", 'r' => ["Thanos", "Loki", "Ultron", "Hela"], 'c' => 0],
                ['p' => "¿Dory aparece en...?", 'r' => ["Buscando a Nemo", "La Sirenita", "Shark Tale", "Luca"], 'c' => 0],
                ['p' => "¿Serie ambientada en Poniente?", 'r' => ["Juego de Tronos", "The Witcher", "Vikingos", "The Last Kingdom"], 'c' => 0],
            ];

            // 3. Datos Juegos (Consolidados)
            $datosJuegos = [
                ['p' => "¿Protagonista de Zelda?", 'r' => ["Zelda", "Link", "Ganon", "Epona"], 'c' => 1],
                ['p' => "¿Creador de Fortnite?", 'r' => ["Epic Games", "EA", "Activision", "Ubisoft"], 'c' => 0],
                ['p' => "¿Hermano de Mario?", 'r' => ["Luigi", "Wario", "Waluigi", "Toad"], 'c' => 0],
                ['p' => "¿Estudio de The Last of Us?", 'r' => ["Naughty Dog", "Santa Monica", "Insomniac", "Guerrilla"], 'c' => 0],
                ['p' => "¿Ciudad de GTA V?", 'r' => ["Los Santos", "Vice City", "Liberty City", "San Fierro"], 'c' => 0],
                ['p' => "¿Protagonista de God of War?", 'r' => ["Kratos", "Zeus", "Ares", "Hades"], 'c' => 0],
                ['p' => "¿Mascota de Sega?", 'r' => ["Sonic", "Mario", "Crash", "Spyro"], 'c' => 0],
                ['p' => "¿Juego de 'Pyramid Head'?", 'r' => ["Silent Hill", "Resident Evil", "Amnesia", "F.E.A.R"], 'c' => 0],
                ['p' => "¿Nombre del Jefe Maestro?", 'r' => ["John-117", "Cortana", "Noble 6", "Johnson"], 'c' => 0],
                ['p' => "¿Juego más vendido de la historia?", 'r' => ["Minecraft", "Tetris", "GTA V", "Wii Sports"], 'c' => 0],
            ];

            // Función de inserción rápida
            $ins = function($cId, $datos) {
                foreach ($datos as $d) {
                    $pId = DB::table('preguntas')->insertGetId([
                        'cuestionario_id' => $cId, 'texto_pregunta' => $d['p'],
                        'created_at' => now(), 'updated_at' => now()
                    ]);
                    foreach ($d['r'] as $i => $t) {
                        DB::table('respuestas')->insert([
                            'pregunta_id' => $pId, 'texto_respuesta' => $t,
                            'es_correcta' => ($i === $d['c']),
                            'created_at' => now(), 'updated_at' => now()
                        ]);
                    }
                }
            };

            $ins($cCine->id, $datosCine);
            $ins($cJuegos->id, $datosJuegos);
            $ins($cMixto->id, array_merge($datosCine, $datosJuegos));
        });
    }
}