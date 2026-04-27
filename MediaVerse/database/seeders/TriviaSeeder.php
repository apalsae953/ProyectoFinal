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
        $datosCineCount  = 40;
        $datosJuegosCount = 40;
        // preguntas únicas + las del mixto (que son la suma de ambas)
        $expectedTotal = $datosCineCount * 2 + $datosJuegosCount * 2;

        if (DB::table('preguntas')->count() === $expectedTotal) {
            $this->command->info('TriviaSeeder: preguntas ya actualizadas, se omite para conservar los scores.');
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('TRUNCATE TABLE respuestas, preguntas, cuestionarios RESTART IDENTITY CASCADE');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            DB::table('respuestas')->truncate();
            DB::table('preguntas')->truncate();
            DB::table('cuestionarios')->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        DB::transaction(function () {

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
                'descripcion' => 'Cine, series y videojuegos mezclados.',
                'categoria' => 'mixto',
                'dificultad' => 'dificil'
            ]);

            // 2. Preguntas de Cine y Series (40 preguntas)
            $datosCine = [
                ['p' => "¿Quién dirigió 'Origen (Inception)'?", 'r' => ["Christopher Nolan", "Steven Spielberg", "Quentin Tarantino", "Martin Scorsese"], 'c' => 0],
                ['p' => "¿Quién interpreta a Iron Man en el UCM?", 'r' => ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], 'c' => 1],
                ['p' => "¿Quién dirigió 'El Padrino'?", 'r' => ["Francis Ford Coppola", "Martin Scorsese", "Stanley Kubrick", "Alfred Hitchcock"], 'c' => 0],
                ['p' => "¿Qué pastilla elige Neo en Matrix?", 'r' => ["Azul", "Verde", "Roja", "Amarilla"], 'c' => 2],
                ['p' => "¿Quién es el padre de Luke Skywalker?", 'r' => ["Darth Vader", "Obi-Wan Kenobi", "Yoda", "Han Solo"], 'c' => 0],
                ['p' => "¿Quién es el protagonista de Toy Story?", 'r' => ["Woody", "Buzz", "Rex", "Slinky"], 'c' => 0],
                ['p' => "¿Quién interpreta a Jack Dawson en Titanic?", 'r' => ["Leonardo DiCaprio", "Brad Pitt", "Johnny Depp", "Tom Cruise"], 'c' => 0],
                ['p' => "¿Cuál es el villano principal de Avengers: Infinity War?", 'r' => ["Thanos", "Loki", "Ultron", "Hela"], 'c' => 0],
                ['p' => "¿En qué película aparece el pez Dory por primera vez?", 'r' => ["Buscando a Nemo", "La Sirenita", "Shark Tale", "Luca"], 'c' => 0],
                ['p' => "¿Cómo se llama la serie ambientada en Poniente?", 'r' => ["Juego de Tronos", "The Witcher", "Vikingos", "The Last Kingdom"], 'c' => 0],
                ['p' => "¿Quién interpreta a Hermione Granger en Harry Potter?", 'r' => ["Emma Watson", "Emma Stone", "Keira Knightley", "Natalie Portman"], 'c' => 0],
                ['p' => "¿En qué ciudad está ambientada Breaking Bad?", 'r' => ["Albuquerque", "Denver", "Tucson", "Phoenix"], 'c' => 0],
                ['p' => "¿Quién dirige Pulp Fiction?", 'r' => ["Quentin Tarantino", "Francis Ford Coppola", "Martin Scorsese", "David Fincher"], 'c' => 0],
                ['p' => "¿Qué película ganó el Oscar a Mejor Película en 2020?", 'r' => ["Parásitos", "1917", "Joker", "Había una vez en Hollywood"], 'c' => 0],
                ['p' => "¿Cómo se llama el robot protagonista de Wall-E?", 'r' => ["WALL-E", "R2-D2", "Baymax", "EVE"], 'c' => 0],
                ['p' => "¿De qué reino es Thor en el UCM?", 'r' => ["Asgard", "Xandar", "Vormir", "Sakaar"], 'c' => 0],
                ['p' => "¿Quién interpreta al Joker en El Caballero Oscuro?", 'r' => ["Heath Ledger", "Joaquin Phoenix", "Jack Nicholson", "Jared Leto"], 'c' => 0],
                ['p' => "¿En qué plataforma está disponible Stranger Things?", 'r' => ["Netflix", "HBO Max", "Disney+", "Amazon Prime"], 'c' => 0],
                ['p' => "¿Quién creó la serie Los Simpson?", 'r' => ["Matt Groening", "Seth MacFarlane", "Mike Judge", "Trey Parker"], 'c' => 0],
                ['p' => "¿En qué película escuchamos 'Houston, tenemos un problema'?", 'r' => ["Apolo 13", "Gravity", "Interstellar", "El Marciano"], 'c' => 0],
                ['p' => "¿Quién interpreta a Jack Sparrow en Piratas del Caribe?", 'r' => ["Johnny Depp", "Orlando Bloom", "Geoffrey Rush", "Javier Bardem"], 'c' => 0],
                ['p' => "¿Cómo se llama la escuela de magia de Harry Potter?", 'r' => ["Hogwarts", "Beauxbatons", "Durmstrang", "Ilvermorny"], 'c' => 0],
                ['p' => "¿Cuántas temporadas tiene la serie Friends?", 'r' => ["10", "8", "12", "7"], 'c' => 0],
                ['p' => "¿Quién dirige la trilogía de El Señor de los Anillos?", 'r' => ["Peter Jackson", "James Cameron", "Ridley Scott", "Steven Spielberg"], 'c' => 0],
                ['p' => "¿Quién interpreta a Captain America en el UCM?", 'r' => ["Chris Evans", "Chris Hemsworth", "Chris Pratt", "Chris Pine"], 'c' => 0],
                ['p' => "¿En qué película aparece la frase 'I'll be back'?", 'r' => ["Terminator", "RoboCop", "Predator", "Total Recall"], 'c' => 0],
                ['p' => "¿Cuál fue la primera película del Universo Cinematográfico Marvel?", 'r' => ["Iron Man", "El Increíble Hulk", "Thor", "Captain America"], 'c' => 0],
                ['p' => "¿Qué actor protagoniza la saga John Wick?", 'r' => ["Keanu Reeves", "Tom Hardy", "Ryan Reynolds", "Vin Diesel"], 'c' => 0],
                ['p' => "¿Cómo se llama el villano de El Rey León?", 'r' => ["Scar", "Mufasa", "Simba", "Rafiki"], 'c' => 0],
                ['p' => "¿Qué serie cuenta la historia de Walter White?", 'r' => ["Breaking Bad", "Better Call Saul", "Ozark", "Narcos"], 'c' => 0],
                ['p' => "¿Qué actor interpreta a Batman en la trilogía de Christopher Nolan?", 'r' => ["Christian Bale", "Ben Affleck", "Michael Keaton", "Val Kilmer"], 'c' => 0],
                ['p' => "¿Cuál es el nombre del mayordomo de Batman?", 'r' => ["Alfred", "James Gordon", "Lucius Fox", "Harvey Dent"], 'c' => 0],
                ['p' => "¿Quién compone la banda sonora de la saga Star Wars?", 'r' => ["John Williams", "Hans Zimmer", "Ennio Morricone", "Howard Shore"], 'c' => 0],
                ['p' => "¿En qué año se ambienta la primera película de Regreso al Futuro?", 'r' => ["1985", "1955", "2015", "1975"], 'c' => 0],
                ['p' => "¿Cómo se llama el protagonista de Peaky Blinders?", 'r' => ["Tommy Shelby", "Arthur Shelby", "John Shelby", "Michael Gray"], 'c' => 0],
                ['p' => "¿Qué actor interpreta a Sherlock Holmes en la serie de la BBC?", 'r' => ["Benedict Cumberbatch", "Martin Freeman", "Andrew Scott", "Mark Gatiss"], 'c' => 0],
                ['p' => "¿Cuál es el nombre del dragón de Daenerys que resucita como no-muerto?", 'r' => ["Viserion", "Drogon", "Rhaegal", "Balerion"], 'c' => 0],
                ['p' => "¿En qué ciudad está ambientada la serie alemana Dark?", 'r' => ["Winden", "Berlín", "Múnich", "Hamburgo"], 'c' => 0],
                ['p' => "¿Qué actriz protagoniza la saga Hunger Games como Katniss?", 'r' => ["Jennifer Lawrence", "Emma Watson", "Shailene Woodley", "Hailee Steinfeld"], 'c' => 0],
                ['p' => "¿Cuántas Joyas del Infinito existen en el UCM?", 'r' => ["6", "4", "5", "7"], 'c' => 0],
            ];

            // 3. Preguntas de Videojuegos (40 preguntas)
            $datosJuegos = [
                ['p' => "¿Quién es el verdadero protagonista de la saga The Legend of Zelda?", 'r' => ["Link", "Zelda", "Ganon", "Epona"], 'c' => 0],
                ['p' => "¿Qué empresa desarrolló Fortnite?", 'r' => ["Epic Games", "EA Sports", "Activision", "Ubisoft"], 'c' => 0],
                ['p' => "¿Cuál es el nombre del hermano de Mario?", 'r' => ["Luigi", "Wario", "Waluigi", "Toad"], 'c' => 0],
                ['p' => "¿Qué estudio desarrolló The Last of Us?", 'r' => ["Naughty Dog", "Santa Monica Studio", "Insomniac Games", "Guerrilla Games"], 'c' => 0],
                ['p' => "¿En qué ciudad está ambientada GTA V?", 'r' => ["Los Santos", "Vice City", "Liberty City", "San Fierro"], 'c' => 0],
                ['p' => "¿Quién es el protagonista de God of War?", 'r' => ["Kratos", "Zeus", "Ares", "Hades"], 'c' => 0],
                ['p' => "¿Cuál es la mascota de Sega?", 'r' => ["Sonic", "Mario", "Crash Bandicoot", "Spyro"], 'c' => 0],
                ['p' => "¿De qué saga de videojuegos es el personaje Pyramid Head?", 'r' => ["Silent Hill", "Resident Evil", "Amnesia", "F.E.A.R."], 'c' => 0],
                ['p' => "¿Cuál es el nombre real del Jefe Maestro (Master Chief)?", 'r' => ["John-117", "Cortana", "Noble 6", "Sargento Johnson"], 'c' => 0],
                ['p' => "¿Cuál es el juego más vendido de la historia?", 'r' => ["Minecraft", "Tetris", "GTA V", "Wii Sports"], 'c' => 0],
                ['p' => "¿Qué empresa desarrolló la saga Dark Souls?", 'r' => ["FromSoftware", "Bandai Namco", "Square Enix", "Capcom"], 'c' => 0],
                ['p' => "¿Cómo se llama la protagonista de Horizon Zero Dawn?", 'r' => ["Aloy", "Lara", "Ellie", "Samus"], 'c' => 0],
                ['p' => "¿En qué año se lanzó la primera PlayStation?", 'r' => ["1994", "1996", "1989", "2000"], 'c' => 0],
                ['p' => "¿Cómo se llama el caballo de Link en The Legend of Zelda?", 'r' => ["Epona", "Rocinante", "Sombra", "Pegaso"], 'c' => 0],
                ['p' => "¿En qué juego aparece el personaje Geralt de Rivia?", 'r' => ["The Witcher", "Dragon Age", "Dark Souls", "Skyrim"], 'c' => 0],
                ['p' => "¿Cuántos bits tenía la Super Nintendo (SNES)?", 'r' => ["16", "8", "32", "64"], 'c' => 0],
                ['p' => "¿Qué empresa fabrica la consola Xbox?", 'r' => ["Microsoft", "Sony", "Nintendo", "Sega"], 'c' => 0],
                ['p' => "¿Qué saga protagoniza el arqueólogo Nathan Drake?", 'r' => ["Uncharted", "Tomb Raider", "Assassin's Creed", "Hitman"], 'c' => 0],
                ['p' => "¿Cuál es el nombre del protagonista de Red Dead Redemption 2?", 'r' => ["Arthur Morgan", "John Marston", "Dutch van der Linde", "Bill Williamson"], 'c' => 0],
                ['p' => "¿Qué juego tiene como protagonista a Cloud Strife?", 'r' => ["Final Fantasy VII", "Kingdom Hearts", "Dragon Quest", "Chrono Trigger"], 'c' => 0],
                ['p' => "¿Cómo se llama la princesa que suele rescatar Mario?", 'r' => ["Peach", "Daisy", "Rosalina", "Pauline"], 'c' => 0],
                ['p' => "¿Qué empresa desarrolló Overwatch?", 'r' => ["Blizzard", "Valve", "Riot Games", "Epic Games"], 'c' => 0],
                ['p' => "¿Cuál es el nombre del antagonista principal de Final Fantasy VII?", 'r' => ["Sephiroth", "Cloud", "Genesis", "Kefka"], 'c' => 0],
                ['p' => "¿Qué juego usa el eslogan 'Gotta catch 'em all'?", 'r' => ["Pokémon", "Digimon", "Yo-Kai Watch", "Monster Hunter"], 'c' => 0],
                ['p' => "¿En qué año se lanzó el primer Grand Theft Auto?", 'r' => ["1997", "1999", "2001", "1995"], 'c' => 0],
                ['p' => "¿Quién es el creador de la saga Metal Gear Solid?", 'r' => ["Hideo Kojima", "Shinji Mikami", "Shigeru Miyamoto", "Tetsuya Nomura"], 'c' => 0],
                ['p' => "¿En qué franquicia aparece la cazarrecompensas Samus Aran?", 'r' => ["Metroid", "Halo", "Mass Effect", "Destiny"], 'c' => 0],
                ['p' => "¿Qué saga de lucha incluye a los personajes Ryu y Ken?", 'r' => ["Street Fighter", "Tekken", "Mortal Kombat", "Virtua Fighter"], 'c' => 0],
                ['p' => "¿En qué franquicia aparece el personaje Lara Croft?", 'r' => ["Tomb Raider", "Uncharted", "Assassin's Creed", "Prince of Persia"], 'c' => 0],
                ['p' => "¿En qué ciudad ficticia está ambientada Bioshock Infinite?", 'r' => ["Columbia", "Rapture", "Arkham", "Raccoon City"], 'c' => 0],
                ['p' => "¿Cuál es el nombre del jefe final de Super Mario Bros. original?", 'r' => ["Bowser", "Koopa", "Wario", "Kamek"], 'c' => 0],
                ['p' => "¿Qué empresa desarrolló la consola GameCube?", 'r' => ["Nintendo", "Sony", "Microsoft", "Sega"], 'c' => 0],
                ['p' => "¿En qué juego el protagonista debe escapar de la instalación Aperture Science?", 'r' => ["Portal", "Half-Life", "Mirror's Edge", "Q.U.B.E."], 'c' => 0],
                ['p' => "¿Cuál es el nombre del personaje principal de la saga Persona 5?", 'r' => ["Ren Amamiya / Joker", "Ryuji Sakamoto", "Yusuke Kitagawa", "Makoto Niijima"], 'c' => 0],
                ['p' => "¿Qué juego popularizó el género Battle Royale a nivel masivo en 2017?", 'r' => ["PUBG", "Fortnite", "Apex Legends", "H1Z1"], 'c' => 0],
                ['p' => "¿En qué juego eres un prisionero que construye y sobrevive en un mundo de bloques?", 'r' => ["Minecraft", "Terraria", "Roblox", "Valheim"], 'c' => 0],
                ['p' => "¿Cuántas regiones principales tiene el primer juego de Pokémon?", 'r' => ["1", "2", "3", "4"], 'c' => 0],
                ['p' => "¿Qué compañía desarrolló la saga Resident Evil?", 'r' => ["Capcom", "Konami", "Square Enix", "FromSoftware"], 'c' => 0],
                ['p' => "¿Cómo se llama el personaje que protagoniza la saga Assassin's Creed original?", 'r' => ["Altaïr Ibn-La'Ahad", "Ezio Auditore", "Connor", "Edward Kenway"], 'c' => 0],
                ['p' => "¿En qué saga el protagonista usa la Cámara de Desplazamiento para combatir?", 'r' => ["Control", "Alan Wake", "Quantum Break", "Max Payne"], 'c' => 0],
            ];

            // Función de inserción rápida
            $ins = function ($cId, $datos) {
                foreach ($datos as $d) {
                    $pId = DB::table('preguntas')->insertGetId([
                        'cuestionario_id' => $cId,
                        'texto_pregunta' => $d['p'],
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                    foreach ($d['r'] as $i => $t) {
                        DB::table('respuestas')->insert([
                            'pregunta_id' => $pId,
                            'texto_respuesta' => $t,
                            'es_correcta' => ($i === $d['c']),
                            'created_at' => now(),
                            'updated_at' => now()
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
