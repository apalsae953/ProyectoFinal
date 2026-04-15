<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cuestionario;
use App\Models\Pregunta;
use App\Models\Respuesta;

class FixGamesTriviaSeeder extends Seeder
{
    /**
     * Inserta las preguntas de Videojuegos y Mixto si están vacías.
     * Seguro de ejecutar en producción: no duplica datos.
     */
    public function run(): void
    {
        $datosJuegos = [
            ['pregunta' => "¿Cuál fue el nombre original de Mario antes de llamarse así en el juego 'Donkey Kong'?", 'respuestas' => ["Jumpman", "Mr. Video", "Luigi Prototype", "Plumber Boy"], 'correcta' => 0],
            ['pregunta' => "¿Qué consola de SEGA fue la primera en incluir un módem interno para jugar online?", 'respuestas' => ["Dreamcast", "Saturn", "Mega Drive", "Master System"], 'correcta' => 0],
            ['pregunta' => "¿Cómo se llamaba el periférico de Nintendo 64 que solo salió en Japón y usaba discos magnéticos?", 'respuestas' => ["64DD", "Satellaview", "N64 Disc", "Power Drive"], 'correcta' => 0],
            ['pregunta' => "¿En qué año se fundó la compañía Blizzard Entertainment?", 'respuestas' => ["1991", "1994", "1989", "1996"], 'correcta' => 0],
            ['pregunta' => "¿Cuál fue el primer juego de la historia en usar la técnica de 'Cel-shading' para sus gráficos?", 'respuestas' => ["Fear Effect", "Jet Set Radio", "The Legend of Zelda: Wind Waker", "Okami"], 'correcta' => 1],
            ['pregunta' => "¿Cuál es el nombre del mundo donde se desarrolla la saga 'The Elder Scrolls'?", 'respuestas' => ["Nirn", "Tamriel", "Oblivion", "Skyrim"], 'correcta' => 0],
            ['pregunta' => "¿En la saga 'BioShock', qué sustancia otorga poderes genéticos al jugador?", 'respuestas' => ["ADAM", "EVE", "Vigor", "Plásmido"], 'correcta' => 0],
            ['pregunta' => "¿Cómo se llama el caballo de Geralt de Rivia en 'The Witcher 3'?", 'respuestas' => ["Sardinilla (Roach)", "Epona", "Agro", "Sombra"], 'correcta' => 0],
            ['pregunta' => "¿En 'Metal Gear Solid', cuál es el nombre real de Solid Snake?", 'respuestas' => ["David", "Jack", "Eli", "George"], 'correcta' => 0],
            ['pregunta' => "¿Qué personaje de 'League of Legends' es conocido como el 'Ciego Monje'?", 'respuestas' => ["Lee Sin", "Master Yi", "Yasuo", "Jax"], 'correcta' => 0],
            ['pregunta' => "¿En 'Silent Hill 2', qué representa el monstruo Pyramid Head?", 'respuestas' => ["El sentimiento de culpa de James", "El miedo a la muerte", "La represión sexual", "Un antiguo dios local"], 'correcta' => 0],
            ['pregunta' => "¿Cuál es el nombre de la corporación enemiga principal en la saga 'Resident Evil'?", 'respuestas' => ["Umbrella Corporation", "Abstergo", "Aperture Science", "Shinra"], 'correcta' => 0],
            ['pregunta' => "¿En 'Dark Souls', quién es el caballero que nos ayuda y busca su propio sol?", 'respuestas' => ["Solaire de Astora", "Siegmeyer de Catarina", "Oscar de Astora", "Patches"], 'correcta' => 0],
            ['pregunta' => "¿Qué motor gráfico utiliza la mayoría de los juegos de la saga 'Borderlands'?", 'respuestas' => ["Unreal Engine", "Unity", "RE Engine", "Frostbite"], 'correcta' => 0],
            ['pregunta' => "¿En 'Final Fantasy VII', cómo se llama el arma final de Cloud Strife?", 'respuestas' => ["Artesana (Ultima Weapon)", "Buster Sword", "Masamune", "Ragnarok"], 'correcta' => 0],
            ['pregunta' => "¿Cuál es el nombre del lenguaje ficticio que hablan los personajes en 'The Sims'?", 'respuestas' => ["Simlish", "Simtalk", "Hylian", "Dovahzul"], 'correcta' => 0],
            ['pregunta' => "¿En 'God of War' (trilogía original), qué objeto le da a Kratos la capacidad de volar?", 'respuestas' => ["Las Alas de Ícaro", "Las Botas de Hermes", "El Vellocino de Oro", "La Cabeza de Medusa"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de Valve introdujo por primera vez el concepto de 'Sombreros' como cosméticos?", 'respuestas' => ["Team Fortress 2", "Counter-Strike", "Dota 2", "Portal 2"], 'correcta' => 0],
            ['pregunta' => "¿Cuál es el nombre de la inteligencia artificial que guía al Jefe Maestro en Halo?", 'respuestas' => ["Cortana", "Serina", "Isabel", "The Weapon"], 'correcta' => 0],
            ['pregunta' => "¿En 'Fallout', cómo se llama el dispositivo de muñeca que gestiona el inventario y mapa?", 'respuestas' => ["Pip-Boy", "Vault-Tec Manager", "Wrist-Com", "Pokedex"], 'correcta' => 0],
            ['pregunta' => "¿Cuál es el videojuego más vendido de la historia?", 'respuestas' => ["Grand Theft Auto V", "Minecraft", "Tetris", "Wii Sports"], 'correcta' => 1],
            ['pregunta' => "¿Cómo se llama el protagonista de la saga 'The Legend of Zelda'?", 'respuestas' => ["Zelda", "Link", "Ganon", "Epona"], 'correcta' => 1],
            ['pregunta' => "¿Qué compañía desarrolló 'Fortnite'?", 'respuestas' => ["Activision", "Electronic Arts", "Epic Games", "Ubisoft"], 'correcta' => 2],
            ['pregunta' => "¿En qué año se lanzó la primera PlayStation en Japón?", 'respuestas' => ["1994", "1996", "1998", "2000"], 'correcta' => 0],
            ['pregunta' => "¿Cuál es el nombre del fontanero hermano de Mario?", 'respuestas' => ["Wario", "Luigi", "Waluigi", "Toad"], 'correcta' => 1],
            ['pregunta' => "¿Qué juego popularizó el género 'Battle Royale'?", 'respuestas' => ["Fortnite", "PUBG", "Apex Legends", "Call of Duty: Warzone"], 'correcta' => 1],
            ['pregunta' => "¿Cómo se llama el Jefe Maestro en Halo?", 'respuestas' => ["John-117", "Cortana", "Noble 6", "Sargento Johnson"], 'correcta' => 0],
            ['pregunta' => "¿Qué estudio desarrolló 'The Last of Us'?", 'respuestas' => ["Santa Monica Studio", "Naughty Dog", "Insomniac Games", "Guerrilla Games"], 'correcta' => 1],
            ['pregunta' => "¿En 'God of War' (2018), cómo llama Kratos a su hijo?", 'respuestas' => ["Atreus", "Chico (Boy)", "Loki", "Hijo"], 'correcta' => 1],
            ['pregunta' => "¿Cuál es el Pokémon número 25 en la Pokédex?", 'respuestas' => ["Bulbasaur", "Charmander", "Pikachu", "Squirtle"], 'correcta' => 2],
            ['pregunta' => "¿Qué personaje es la mascota de Sega?", 'respuestas' => ["Mario", "Sonic", "Crash Bandicoot", "Spyro"], 'correcta' => 1],
            ['pregunta' => "¿En qué juego aparece la ciudad sumergida de 'Rapture'?", 'respuestas' => ["BioShock", "Fallout", "Dishonored", "Borderlands"], 'correcta' => 0],
            ['pregunta' => "¿Cuál es el arma principal de Gordon Freeman en Half-Life?", 'respuestas' => ["Palanca", "Escopeta", "Pistola de Gravedad", "Ballesta"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego indie trata sobre un niño que cae al subsuelo lleno de monstruos?", 'respuestas' => ["Hollow Knight", "Celeste", "Undertale", "Limbo"], 'correcta' => 2],
            ['pregunta' => "¿Cómo se llama la princesa del Reino Champiñón?", 'respuestas' => ["Daisy", "Estela (Rosalina)", "Peach", "Zelda"], 'correcta' => 2],
            ['pregunta' => "¿Qué juego de cartas digital es del universo de Warcraft?", 'respuestas' => ["Gwent", "Hearthstone", "Legends of Runeterra", "Artifact"], 'correcta' => 1],
            ['pregunta' => "¿En qué juego debes 'Hacerte con todos'?", 'respuestas' => ["Digimon", "Yo-Kai Watch", "Pokémon", "Monster Rancher"], 'correcta' => 2],
            ['pregunta' => "¿Qué personaje de Nintendo es un gorila con corbata?", 'respuestas' => ["King Kong", "Donkey Kong", "Winston", "Grodd"], 'correcta' => 1],
            ['pregunta' => "¿Cuál es el juego de fútbol más popular de EA Sports?", 'respuestas' => ["PES", "FIFA (ahora EA FC)", "Dream League", "Winning Eleven"], 'correcta' => 1],
            ['pregunta' => "¿Qué juego de disparos táctico cuenta con agentes como Jett y Phoenix?", 'respuestas' => ["CS:GO", "Overwatch", "Valorant", "Rainbow Six Siege"], 'correcta' => 2],
            ['pregunta' => "¿Quién es el protagonista de 'Red Dead Redemption 2'?", 'respuestas' => ["John Marston", "Dutch van der Linde", "Arthur Morgan", "Micah Bell"], 'correcta' => 2],
            ['pregunta' => "¿En qué año transcurre la historia principal de Red Dead Redemption 2?", 'respuestas' => ["1899", "1911", "1885", "1905"], 'correcta' => 0],
            ['pregunta' => "¿Qué banda lidera Dutch van der Linde?", 'respuestas' => ["O'Driscolls", "Banda de Van der Linde", "Pinkertons", "Lemoyne Raiders"], 'correcta' => 1],
            ['pregunta' => "¿Qué enfermedad contrae Arthur Morgan?", 'respuestas' => ["Tuberculosis", "Cólera", "Neumonía", "Disentería"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego ganó el GOTY (Juego del Año) en 2022?", 'respuestas' => ["God of War Ragnarök", "Elden Ring", "Horizon Forbidden West", "Stray"], 'correcta' => 1],
            ['pregunta' => "¿Quién es el villano principal (IA) de la saga Portal?", 'respuestas' => ["GLaDOS", "Wheatley", "Cave Johnson", "Chell"], 'correcta' => 0],
            ['pregunta' => "¿En qué juego controlas a un gato en una ciudad cyberpunk?", 'respuestas' => ["Stray", "Cat Quest", "Night in the Woods", "Tunic"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego es conocido por su dificultad y sus hogueras?", 'respuestas' => ["Dark Souls", "Skyrim", "The Witcher", "Dragon Age"], 'correcta' => 0],
            ['pregunta' => "¿Qué personaje dice 'It's-a me, Mario!'?", 'respuestas' => ["Luigi", "Mario", "Wario", "Toad"], 'correcta' => 1],
            ['pregunta' => "¿Qué compañía creó la consola Switch?", 'respuestas' => ["Nintendo", "Sony", "Microsoft", "Sega"], 'correcta' => 0],
            ['pregunta' => "¿Quién es el protagonista de la saga 'Uncharted'?", 'respuestas' => ["Nathan Drake", "Lara Croft", "Indiana Jones", "Joel Miller"], 'correcta' => 0],
            ['pregunta' => "¿Qué videojuego popularizó el género MOBA?", 'respuestas' => ["League of Legends", "Dota 2", "Heroes of the Storm", "Smite"], 'correcta' => 1],
            ['pregunta' => "¿Quién es el villano principal de 'Final Fantasy VII'?", 'respuestas' => ["Sefirot (Sephiroth)", "Kefka", "Ultimecia", "Kuja"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de Rockstar se ambienta en la ciudad de Los Santos?", 'respuestas' => ["Grand Theft Auto V", "Red Dead Redemption 2", "L.A. Noire", "Bully"], 'correcta' => 0],
            ['pregunta' => "¿Cuál es el Pokémon número 1 en la Pokédex?", 'respuestas' => ["Bulbasaur", "Ivysaur", "Venusaur", "Charmander"], 'correcta' => 0],
            ['pregunta' => "¿Qué estudio polaco desarrolló 'The Witcher 3'?", 'respuestas' => ["CD Projekt Red", "Bethesda", "BioWare", "Ubisoft"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de Valve es un shooter de zombis cooperativo?", 'respuestas' => ["Left 4 Dead", "Half-Life", "Portal", "Team Fortress 2"], 'correcta' => 0],
            ['pregunta' => "¿Quién desarrolló 'Cyberpunk 2077'?", 'respuestas' => ["CD Projekt Red", "Bethesda", "BioWare", "Ubisoft"], 'correcta' => 0],
            ['pregunta' => "¿Quién es el protagonista de 'Devil May Cry'?", 'respuestas' => ["Dante", "Nero", "Vergil", "Trish"], 'correcta' => 0],
            ['pregunta' => "¿En qué juego aparece el personaje 'Ellie'?", 'respuestas' => ["The Last of Us", "Uncharted", "Horizon Zero Dawn", "Tomb Raider"], 'correcta' => 0],
            ['pregunta' => "¿Quién desarrolló 'Red Dead Redemption 2'?", 'respuestas' => ["Rockstar Games", "Ubisoft", "Bethesda", "Naughty Dog"], 'correcta' => 0],
            ['pregunta' => "¿En qué año se lanzó 'Valorant'?", 'respuestas' => ["2020", "2019", "2021", "2022"], 'correcta' => 0],
            ['pregunta' => "¿Quién desarrolló el premiado roguelike 'Hades'?", 'respuestas' => ["Supergiant Games", "Team Cherry", "Motion Twin", "Mega Crit"], 'correcta' => 0],
            ['pregunta' => "¿En qué juego aparece el personaje 'GLaDOS'?", 'respuestas' => ["Portal", "Half-Life", "Team Fortress 2", "Left 4 Dead"], 'correcta' => 0],
            ['pregunta' => "¿Quién es el creador de 'Super Smash Bros.'?", 'respuestas' => ["Masahiro Sakurai", "Shigeru Miyamoto", "Satoru Iwata", "Reggie Fils-Aimé"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de Capcom es el pionero del survival horror?", 'respuestas' => ["Resident Evil", "Devil May Cry", "Monster Hunter", "Street Fighter"], 'correcta' => 0],
            ['pregunta' => "¿Quién es la protagonista de 'Horizon Zero Dawn'?", 'respuestas' => ["Aloy", "Lara Croft", "Samus Aran", "Jill Valentine"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de disparos en primera persona revolucionó el género en 1993?", 'respuestas' => ["Doom", "Wolfenstein 3D", "Quake", "Duke Nukem 3D"], 'correcta' => 0],
            ['pregunta' => "¿En qué juego debes sobrevivir a animatrónicos en una pizzería?", 'respuestas' => ["Five Nights at Freddy's", "Slender: The Arrival", "Poppy Playtime", "Bendy and the Ink Machine"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de simulación social te permite gestionar una isla desierta?", 'respuestas' => ["Animal Crossing: New Horizons", "Stardew Valley", "Harvest Moon", "The Sims"], 'correcta' => 0],
            ['pregunta' => "¿Quién es el creador único de 'Stardew Valley'?", 'respuestas' => ["ConcernedApe", "Chucklefish", "Team17", "Re-Logic"], 'correcta' => 0],
            ['pregunta' => "¿Qué saga de Capcom trata sobre cazar monstruos gigantes?", 'respuestas' => ["Monster Hunter", "Dragon's Dogma", "Lost Planet", "Dead Rising"], 'correcta' => 0],
            ['pregunta' => "¿Quién es el protagonista de 'Ghost of Tsushima'?", 'respuestas' => ["Jin Sakai", "Khotun Khan", "Lord Shimura", "Yuna"], 'correcta' => 0],
            ['pregunta' => "¿Quién desarrolló 'Among Us'?", 'respuestas' => ["Innersloth", "Supercell", "Rovio", "King"], 'correcta' => 0],
            ['pregunta' => "¿Qué estudio desarrolló el difícil 'Cuphead'?", 'respuestas' => ["Studio MDHR", "Team Cherry", "Yacht Club Games", "Supergiant Games"], 'correcta' => 0],
            ['pregunta' => "¿Quién desarrolló 'Rocket League'?", 'respuestas' => ["Psyonix", "Epic Games", "Valve", "Ubisoft"], 'correcta' => 0],
            ['pregunta' => "¿Qué saga de BioWare trata sobre una epopeya espacial con el Comandante Shepard?", 'respuestas' => ["Mass Effect", "Star Wars Battlefront", "Dead Space", "Titanfall"], 'correcta' => 0],
            ['pregunta' => "¿Quién es el protagonista de 'Dead Space'?", 'respuestas' => ["Isaac Clarke", "Gordon Freeman", "Jefe Maestro", "Doom Slayer"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de Naughty Dog trata sobre el cazador de tesoros Nathan Drake?", 'respuestas' => ["Uncharted", "The Last of Us", "Crash Bandicoot", "Jak and Daxter"], 'correcta' => 0],
            ['pregunta' => "¿Quién es el protagonista de 'Sekiro: Shadows Die Twice'?", 'respuestas' => ["Lobo (Wolf)", "Genichiro", "Isshin", "Búho"], 'correcta' => 0],
            ['pregunta' => "¿Qué estudio desarrolló 'Elden Ring' junto a George R.R. Martin?", 'respuestas' => ["FromSoftware", "Bandai Namco", "Square Enix", "Capcom"], 'correcta' => 0],
            ['pregunta' => "¿Qué juego de FromSoftware ganó el GOTY en 2019?", 'respuestas' => ["Sekiro: Shadows Die Twice", "Bloodborne", "Dark Souls III", "Elden Ring"], 'correcta' => 0],
            ['pregunta' => "¿En qué año se lanzó la Nintendo Switch?", 'respuestas' => ["2017", "2016", "2018", "2019"], 'correcta' => 0],
        ];

        // --- ARREGLAR VIDEOJUEGOS ---
        $cuestionarioJuegos = Cuestionario::where('categoria', 'videojuegos')->first();

        if ($cuestionarioJuegos && $cuestionarioJuegos->preguntas()->count() === 0) {
            $this->command->info('Insertando preguntas de Videojuegos...');
            foreach ($datosJuegos as $dato) {
                $pregunta = Pregunta::create([
                    'cuestionario_id' => $cuestionarioJuegos->id,
                    'texto_pregunta'  => $dato['pregunta'],
                    'imagen_url'      => $dato['imagen'] ?? null,
                    'tiempo_limite_segundos' => 20,
                ]);
                foreach ($dato['respuestas'] as $i => $texto) {
                    Respuesta::create([
                        'pregunta_id'    => $pregunta->id,
                        'texto_respuesta' => $texto,
                        'es_correcta'    => ($i === $dato['correcta']),
                    ]);
                }
            }
            $this->command->info('Videojuegos: OK (' . count($datosJuegos) . ' preguntas)');
        } else {
            $count = $cuestionarioJuegos ? $cuestionarioJuegos->preguntas()->count() : 0;
            $this->command->info("Videojuegos ya tiene {$count} preguntas, sin cambios.");
        }

        // --- ARREGLAR MIXTO ---
        $cuestionarioMixto = Cuestionario::where('categoria', 'mixto')->first();

        if ($cuestionarioMixto && $cuestionarioMixto->preguntas()->count() === 0) {
            $this->command->info('Insertando preguntas de Mixto...');
            // Tomamos 40 preguntas de juegos mezcladas
            $datosMixto = array_slice($datosJuegos, 10, 40);
            shuffle($datosMixto);

            foreach ($datosMixto as $dato) {
                $pregunta = Pregunta::create([
                    'cuestionario_id' => $cuestionarioMixto->id,
                    'texto_pregunta'  => $dato['pregunta'],
                    'imagen_url'      => $dato['imagen'] ?? null,
                    'tiempo_limite_segundos' => 15,
                ]);
                foreach ($dato['respuestas'] as $i => $texto) {
                    Respuesta::create([
                        'pregunta_id'    => $pregunta->id,
                        'texto_respuesta' => $texto,
                        'es_correcta'    => ($i === $dato['correcta']),
                    ]);
                }
            }
            $this->command->info('Mixto: OK (' . count($datosMixto) . ' preguntas)');
        } else {
            $count = $cuestionarioMixto ? $cuestionarioMixto->preguntas()->count() : 0;
            $this->command->info("Mixto ya tiene {$count} preguntas, sin cambios.");
        }
    }
}
