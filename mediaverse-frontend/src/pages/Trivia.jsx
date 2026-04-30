import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { alerts } from '../utils/swal';

// Iconos por categoría para las tarjetas del menú
const CATEGORY_ICONS = {
    peliculas: 'fa-solid fa-film',
    series: 'fa-solid fa-tv',
    peliculas_y_series: 'fa-solid fa-clapperboard',
    videojuegos: 'fa-solid fa-gamepad',
    mixto: 'fa-solid fa-shuffle'
};

const CATEGORY_COLORS = {
    peliculas: '#e50914',
    series: '#2196f3',
    peliculas_y_series: '#ff6b35',
    videojuegos: '#4caf50',
    mixto: '#9c27b0'
};

function Trivia() {
    const navigate = useNavigate();

    // Estados principales
    const [fase, setFase] = useState('menu'); // menu | countdown | jugando | resultado
    const [cuestionarios, setCuestionarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [records, setRecords] = useState({}); // { cuestionario_id: best_score }

    // Variables para el juego
    const [quizActual, setQuizActual] = useState(null);
    const [preguntas, setPreguntas] = useState([]);
    const [preguntaIndex, setPreguntaIndex] = useState(0);
    const [seleccion, setSeleccion] = useState(null);
    const [puntuacion, setPuntuacion] = useState(0);
    const [tiempoRestante, setTiempoRestante] = useState(15);
    const [tiempoTotal, setTiempoTotal] = useState(0);
    const [racha, setRacha] = useState(0);
    const [mejorRacha, setMejorRacha] = useState(0);
    const [respondida, setRespondida] = useState(false);
    const [countdownNum, setCountdownNum] = useState(3);
    const [guardando, setGuardando] = useState(false);
    const [aciertos, setAciertos] = useState(0);

    const timerRef = useRef(null);
    const tiempoTotalRef = useRef(0);

    // Cargar lista de cuestionarios y records
    useEffect(() => {
        const fetchQuestionnaires = async () => {
            try {
                const res = await api.get('/trivia');
                // Laravel devuelve { success, data }
                const data = res.data.data || res.data;
                setCuestionarios(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error cargando trivias:', err);
                alerts.error('No se pudieron cargar los cuestionarios');
            } finally {
                setCargando(false);
            }
        };

        const fetchUserBestScores = async () => {
            if (!localStorage.getItem('auth_token')) return;
            try {
                const resRec = await api.get('/trivia/my-scores');
                const bestScores = resRec.data.data || [];
                if (Array.isArray(bestScores)) {
                    const recMap = {};
                    bestScores.forEach(r => {
                        recMap[r.cuestionario_id] = r.best_score ?? 0;
                    });
                    setRecords(recMap);
                }
            } catch (err) {
                console.warn('Error cargando records personales (probablemente sesión expirada):', err);
            }
        };

        fetchQuestionnaires();
        fetchUserBestScores();
    }, []);

    // Contador de tiempo de cada pregunta
    useEffect(() => {
        if (fase !== 'jugando' || respondida) return;

        timerRef.current = setInterval(() => {
            setTiempoRestante(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
            tiempoTotalRef.current += 1;
            setTiempoTotal(tiempoTotalRef.current);
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [fase, preguntaIndex, respondida]);

    // Cuenta atrás antes de empezar
    useEffect(() => {
        if (fase !== 'countdown') return;
        if (countdownNum <= 0) {
            setFase('jugando');
            return;
        }
        const t = setTimeout(() => setCountdownNum(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    }, [fase, countdownNum]);

    const iniciarQuiz = (quiz) => {
        setCargando(true);
        api.get('/trivia/' + quiz.id + '/play')
            .then(res => {
                const fetchedQuestions = res.data.data.preguntas || [];
                if (fetchedQuestions.length === 0) {
                    alerts.error('Este cuestionario no tiene preguntas todavia.');
                    setCargando(false);
                    return;
                }
                setQuizActual(quiz);
                setPreguntas(fetchedQuestions);
                setPreguntaIndex(0);
                setPuntuacion(0);
                setAciertos(0);
                setTiempoRestante(15);
                setTiempoTotal(0);
                tiempoTotalRef.current = 0;
                setRacha(0);
                setMejorRacha(0);
                setSeleccion(null);
                setRespondida(false);
                setCountdownNum(3);
                setCargando(false);
                setFase('countdown');
            })
            .catch(err => {
                console.error('Error iniciando quiz:', err);
                setCargando(false);
                alerts.error('No se pudo cargar el cuestionario');
            });
    };

    const handleTimeout = useCallback(() => {
        setRespondida(true);
        setRacha(0);
        // Auto-avanzar tras 2s
        setTimeout(() => siguientePregunta(), 2000);
    }, [preguntaIndex, preguntas.length]);

    const seleccionarRespuesta = (respuesta, index) => {
        if (respondida) return;
        clearInterval(timerRef.current);
        setSeleccion(index);
        setRespondida(true);

        if (respuesta.es_correcta) {
            setAciertos(prev => prev + 1);
            const nuevaRacha = racha + 1;
            setRacha(nuevaRacha);
            if (nuevaRacha > mejorRacha) setMejorRacha(nuevaRacha);
            // Puntuacion basada en velocidad: base 50 + hasta 150 bonus segun rapidez
            const tiempoMax = 15;
            const bonusVelocidad = Math.round((tiempoRestante / tiempoMax) * 150);
            const puntosGanados = 50 + bonusVelocidad; // Min 50, Max 200
            setPuntuacion(prev => prev + puntosGanados);
        } else {
            setRacha(0);
        }

        // Paso a la siguiente tras casi 2 segundos
        setTimeout(() => siguientePregunta(), 1800);
    };

    const siguientePregunta = () => {
        if (preguntaIndex + 1 >= preguntas.length) {
            setFase('resultado');
            // Auto-guardar solo si hay puntos y está logueado
            if (puntuacion > 0 && localStorage.getItem('auth_token')) {
                guardarPuntuacion(puntuacion);
            }
            return;
        }
        setPreguntaIndex(prev => prev + 1);
        setSeleccion(null);
        setRespondida(false);
        setTiempoRestante(15);
    };

    const guardarPuntuacion = async (scoreToSave = puntuacion) => {
        setGuardando(true);
        try {
            await api.post('/trivia/' + quizActual.id + '/score', {
                puntuacion: scoreToSave,
                tiempo_tardado_segundos: tiempoTotal
            });

            // Si es record, avisamos
            const currentRecord = records[quizActual.id] || 0;
            if (scoreToSave > currentRecord) {
                alerts.success('¡Nuevo récord semanal en ' + quizActual.titulo + '!');
            }
            // Actualizar records localmente
            setRecords(prev => ({
                ...prev,
                [quizActual.id]: Math.max(prev[quizActual.id] || 0, scoreToSave)
            }));
        } catch (err) {
            console.error('Error auto-guardando:', err);
        }
        setGuardando(false);
    };

    const volverAlMenu = () => {
        setFase('menu');
        setQuizActual(null);
        setPreguntas([]);
        setPreguntaIndex(0);
        setPuntuacion(0);
        setTiempoTotal(0);
        tiempoTotalRef.current = 0;
    };



    // Pantalla de carga
    if (cargando) {
        return (
            <div style={{ padding: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    style={{ fontSize: '60px', color: '#e50914' }}
                >
                    <i className="fa-solid fa-brain"></i>
                </motion.div>
                <h2 style={{ color: 'white', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '1.1rem' }}>Cargando trivia...</h2>
            </div>
        );
    }

    // MENU DE SELECCION
    if (fase === 'menu') {
        return (
            <div style={{ paddingBottom: '60px', maxWidth: '1350px', margin: '0 auto' }}>
                {/* Cabecera */}
                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <h1 className="hero-title" style={{ color: 'white', fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-1px', marginBottom: '10px' }}>
                        <i className="fa-solid fa-brain" style={{ color: '#e50914', marginRight: '15px' }}></i>
                        Trivia MediaVerse
                    </h1>
                    <p style={{ color: '#888', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto', padding: '0 20px' }}>
                        Pon a prueba tus conocimientos sobre cine, series y videojuegos. Cuanto mas rapido respondas, mas puntos consigues.
                    </p>
                </div>

                {/* Lista de cuestionarios */}
                <div className="responsive-grid" style={{
                    padding: '0 20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '30px'
                }}>
                    {cuestionarios.map((quiz, i) => {
                        const catColor = CATEGORY_COLORS[quiz.categoria] || '#e50914';
                        const catIcon = CATEGORY_ICONS[quiz.categoria] || 'fa-solid fa-question';

                        return (
                            <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.15 }}
                                onClick={() => iniciarQuiz(quiz)}
                                style={{
                                    background: 'linear-gradient(145deg, #1a1a1a 0%, #111 100%)',
                                    borderRadius: '20px',
                                    padding: '30px',
                                    cursor: 'pointer',
                                    border: '1px solid #222',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.borderColor = catColor;
                                    e.currentTarget.style.boxShadow = '0 15px 40px ' + catColor + '33';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = '#222';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Le meto un efectito de glow de fondo */}
                                <div style={{
                                    position: 'absolute', top: '-50px', right: '-50px',
                                    width: '150px', height: '150px',
                                    background: 'radial-gradient(circle, ' + catColor + '15 0%, transparent 70%)',
                                    borderRadius: '50%', pointerEvents: 'none'
                                }}></div>

                                {/* Icono grande */}
                                <div style={{
                                    fontSize: '50px', color: catColor, marginBottom: '20px',
                                    filter: 'drop-shadow(0 0 15px ' + catColor + '55)'
                                }}>
                                    <i className={catIcon}></i>
                                </div>

                                {/* Titulo */}
                                <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>
                                    {quiz.titulo}
                                </h2>

                                {/* Record si existe */}
                                {records[quiz.id] !== undefined && (
                                    <div style={{
                                        marginBottom: '15px', color: '#ff9800', fontWeight: 800,
                                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        <i className="fa-solid fa-trophy"></i>
                                        TU RÉCORD: {records[quiz.id]} PTS
                                    </div>
                                )}

                                {/* Descripcion */}
                                <p style={{ color: '#999', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '20px', minHeight: '45px' }}>
                                    {quiz.descripcion}
                                </p>

                                {/* Tags */}
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        backgroundColor: catColor + '22', color: catColor,
                                        padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                        textTransform: 'uppercase'
                                    }}>
                                        {quiz.categoria.replace('_', ' ')}
                                    </span>

                                    <span style={{
                                        backgroundColor: 'rgba(255,255,255,0.06)', color: '#aaa',
                                        padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
                                    }}>
                                        10 preguntas
                                    </span>
                                </div>

                                {/* Boton Jugar */}
                                <div style={{
                                    marginTop: 'auto', paddingTop: '25px'
                                }}>
                                    <div style={{
                                        padding: '12px', textAlign: 'center',
                                        backgroundColor: catColor, borderRadius: '12px',
                                        fontWeight: 800, fontSize: '1rem', color: 'white',
                                        letterSpacing: '1px', textTransform: 'uppercase',
                                        transition: 'all 0.2s'
                                    }}>
                                        <i className="fa-solid fa-play" style={{ marginRight: '10px' }}></i>
                                        Jugar
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {cuestionarios.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                        <i className="fa-solid fa-ghost" style={{ fontSize: '4rem', marginBottom: '20px', display: 'block' }}></i>
                        <h2 style={{ color: 'white' }}>No hay cuestionarios disponibles</h2>
                        <p>Los administradores aun no han creado trivias. Vuelve pronto.</p>
                    </div>
                )}
            </div>
        );
    }

    // Pantalla de la cuenta atrás
    if (fase === 'countdown') {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                minHeight: '60vh', flexDirection: 'column'
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={countdownNum}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ textAlign: 'center' }}
                    >
                        {countdownNum > 0 ? (
                            <span style={{
                                fontSize: '120px', fontWeight: 900, color: '#e50914',
                                textShadow: '0 0 60px rgba(229,9,20,0.5)'
                            }}>
                                {countdownNum}
                            </span>
                        ) : (
                            <span style={{
                                fontSize: '80px', fontWeight: 900, color: '#4caf50',
                                textShadow: '0 0 60px rgba(76,175,80,0.5)',
                                textTransform: 'uppercase', letterSpacing: '10px'
                            }}>
                                GO!
                            </span>
                        )}
                    </motion.div>
                </AnimatePresence>
                <p style={{ color: '#666', marginTop: '30px', fontSize: '1.1rem' }}>
                    {quizActual?.titulo}
                </p>
            </div>
        );
    }

    // La pantalla del juego
    if (fase === 'jugando' && preguntas.length > 0) {
        const preguntaActual = preguntas[preguntaIndex];
        if (!preguntaActual) return null; // Por si acaso no carga la pregunta

        const tiempoMax = 15;
        const porcentajeTiempo = (tiempoRestante / tiempoMax) * 100;
        const colorTiempo = tiempoRestante <= 5 ? '#f44336' : tiempoRestante <= 10 ? '#ff9800' : '#4caf50';
        const catColor = CATEGORY_COLORS[quizActual?.categoria] || '#e50914';

        // Las letras de las respuestas
        const letras = ['A', 'B', 'C', 'D'];
        const coloresOpciones = ['#e50914', '#2196f3', '#ff9800', '#4caf50'];

        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
                {/* La barra de arriba con la info */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '20px', padding: '0 5px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ color: '#888', fontSize: '14px', fontWeight: 600 }}>
                            {preguntaIndex + 1} / {preguntas.length}
                        </span>
                        {racha >= 2 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                style={{
                                    backgroundColor: '#ff9800', color: '#000', padding: '3px 10px',
                                    borderRadius: '20px', fontSize: '12px', fontWeight: 800
                                }}
                            >
                                <i className="fa-solid fa-fire"></i> Racha x{racha}
                            </motion.span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-star" style={{ color: '#ffd700' }}></i>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>{puntuacion}</span>
                    </div>
                </div>

                {/* La barrita de progreso */}
                <div style={{
                    display: 'flex', gap: '4px', marginBottom: '25px'
                }}>
                    {preguntas.map((_, i) => (
                        <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: '2px',
                            backgroundColor: i < preguntaIndex ? catColor : i === preguntaIndex ? '#fff' : '#333',
                            transition: 'all 0.3s'
                        }}></div>
                    ))}
                </div>

                {/* El circulito del tiempo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px' }}>
                    <div style={{
                        position: 'relative', width: '70px', height: '70px'
                    }}>
                        <svg width="70" height="70" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="35" cy="35" r="30" stroke="#222" strokeWidth="5" fill="none" />
                            <motion.circle
                                cx="35" cy="35" r="30"
                                stroke={colorTiempo}
                                strokeWidth="5"
                                fill="none"
                                strokeDasharray={2 * Math.PI * 30}
                                animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - porcentajeTiempo / 100) }}
                                transition={{ duration: respondida ? 0.3 : 1, ease: 'linear' }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <span style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: colorTiempo, fontWeight: 900, fontSize: '1.3rem'
                        }}>
                            {tiempoRestante}
                        </span>
                    </div>
                </div>

                {/* Pregunta */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={preguntaIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div style={{
                            backgroundColor: '#1a1a1a', borderRadius: '20px', padding: '30px',
                            border: '1px solid #333', marginBottom: '25px', textAlign: 'center'
                        }}>
                            {preguntaActual.imagen_url && (
                                <img
                                    src={preguntaActual.imagen_url}
                                    alt="Pista"
                                    style={{
                                        maxWidth: '100%', maxHeight: '200px', borderRadius: '12px',
                                        marginBottom: '20px', objectFit: 'cover'
                                    }}
                                />
                            )}
                            <h2 style={{
                                color: 'white', fontSize: '1.4rem', fontWeight: 700,
                                lineHeight: 1.4, margin: 0
                            }}>
                                {preguntaActual.texto_pregunta}
                            </h2>
                        </div>

                        {/* Y aquí las respuestas posibles */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            {preguntaActual.respuestas.map((resp, idx) => {
                                let bgColor = coloresOpciones[idx] + '15';
                                let borderColor = coloresOpciones[idx] + '44';
                                let textColor = 'white';

                                if (respondida) {
                                    if (resp.es_correcta) {
                                        bgColor = '#4caf5033';
                                        borderColor = '#4caf50';
                                    } else if (seleccion === idx && !resp.es_correcta) {
                                        bgColor = '#f4433633';
                                        borderColor = '#f44336';
                                    } else {
                                        bgColor = '#111';
                                        borderColor = '#222';
                                        textColor = '#555';
                                    }
                                }

                                return (
                                    <motion.button
                                        key={idx}
                                        whileHover={!respondida ? { scale: 1.02 } : {}}
                                        whileTap={!respondida ? { scale: 0.98 } : {}}
                                        onClick={() => seleccionarRespuesta(resp, idx)}
                                        disabled={respondida}
                                        style={{
                                            padding: '20px',
                                            backgroundColor: bgColor,
                                            border: '2px solid ' + borderColor,
                                            borderRadius: '16px',
                                            color: textColor,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            cursor: respondida ? 'default' : 'pointer',
                                            transition: 'all 0.3s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <span style={{
                                            width: '36px', height: '36px', minWidth: '36px',
                                            borderRadius: '10px', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: respondida && resp.es_correcta ? '#4caf50'
                                                : respondida && seleccion === idx && !resp.es_correcta ? '#f44336'
                                                    : coloresOpciones[idx],
                                            fontWeight: 900, fontSize: '0.9rem'
                                        }}>
                                            {respondida && resp.es_correcta ? (
                                                <i className="fa-solid fa-check"></i>
                                            ) : respondida && seleccion === idx && !resp.es_correcta ? (
                                                <i className="fa-solid fa-xmark"></i>
                                            ) : (
                                                letras[idx]
                                            )}
                                        </span>
                                        {resp.texto_respuesta}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    // RESULTADO FINAL
    if (fase === 'resultado') {
        const maxPuntuacion = preguntas.length * 200;
        const porcentaje = Math.round((aciertos / preguntas.length) * 100);
        const mensaje = porcentaje >= 80 ? 'Increible!' : porcentaje >= 60 ? 'Bien hecho!' : porcentaje >= 40 ? 'No esta mal' : 'Sigue intentandolo';
        const emoji = porcentaje >= 80 ? 'fa-solid fa-trophy' : porcentaje >= 60 ? 'fa-solid fa-medal' : porcentaje >= 40 ? 'fa-solid fa-thumbs-up' : 'fa-solid fa-face-sad-tear';
        const emojiColor = porcentaje >= 80 ? '#ffd700' : porcentaje >= 60 ? '#c0c0c0' : porcentaje >= 40 ? '#cd7f32' : '#666';

        return (
            <div style={{
                maxWidth: '550px', margin: '0 auto', paddingBottom: '60px', textAlign: 'center'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    {/* Icono resultado */}
                    <motion.div
                        animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        style={{ fontSize: '80px', color: emojiColor, marginBottom: '20px' }}
                    >
                        <i className={emoji}></i>
                    </motion.div>

                    <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, marginBottom: '5px' }}>
                        {mensaje}
                    </h1>
                    <p style={{ color: '#888', fontSize: '1rem', marginBottom: '40px' }}>
                        {quizActual?.titulo}
                    </p>

                    {/* Banner de Récord Semanal */}
                    {puntuacion > (records[quizActual?.id] || 0) && (
                        <motion.div
                            initial={{ scale: 0, rotate: -5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                            style={{
                                display: 'inline-block', padding: '10px 25px', borderRadius: '50px',
                                background: 'linear-gradient(45deg, #ff9800, #ff5722)',
                                color: 'white', fontWeight: 900, marginBottom: '25px',
                                boxShadow: '0 8px 25px rgba(255, 152, 0, 0.4)', fontSize: '0.9rem',
                                letterSpacing: '1px'
                            }}
                        >
                            <i className="fa-solid fa-trophy"></i> ¡NUEVO RÉCORD SEMANAL! <i className="fa-solid fa-trophy"></i>
                        </motion.div>
                    )}

                    {/* Tarjeta de puntuacion */}
                    <div style={{
                        backgroundColor: '#1a1a1a', borderRadius: '24px', padding: '35px',
                        border: '1px solid #333', marginBottom: '30px'
                    }}>
                        {/* Puntuacion principal */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                            style={{ marginBottom: '30px' }}
                        >
                            <div style={{ fontSize: '4rem', fontWeight: 900, color: '#e50914', lineHeight: 1 }}>
                                {puntuacion}
                            </div>
                            <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '5px' }}>
                                de {maxPuntuacion} puntos posibles
                            </div>
                        </motion.div>

                        {/* Stats grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px',
                            borderTop: '1px solid #222', paddingTop: '25px'
                        }}>
                            <div>
                                <div style={{ color: '#4caf50', fontSize: '1.8rem', fontWeight: 800 }}>
                                    {porcentaje}%
                                </div>
                                <div style={{ color: '#888', fontSize: '0.8rem' }}>Aciertos</div>
                            </div>
                            <div>
                                <div style={{ color: '#ff9800', fontSize: '1.8rem', fontWeight: 800 }}>
                                    <i className="fa-solid fa-fire" style={{ fontSize: '1.5rem' }}></i> {mejorRacha}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.8rem' }}>Mejor Racha</div>
                            </div>
                            <div>
                                <div style={{ color: '#2196f3', fontSize: '1.8rem', fontWeight: 800 }}>
                                    {tiempoTotal}s
                                </div>
                                <div style={{ color: '#888', fontSize: '0.8rem' }}>Tiempo</div>
                            </div>
                        </div>
                    </div>

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {guardando && (
                            <div style={{ width: '100%', color: '#888', fontSize: '0.85rem', marginBottom: '10px' }}>
                                <i className="fa-solid fa-cloud-arrow-up"></i> Autoguardando record...
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => iniciarQuiz(quizActual)}
                            style={{
                                padding: '14px 30px', borderRadius: '14px',
                                border: '2px solid #333', backgroundColor: 'transparent',
                                color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                            }}
                        >
                            <i className="fa-solid fa-rotate-right" style={{ marginRight: '8px' }}></i>
                            Jugar de Nuevo
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={volverAlMenu}
                            style={{
                                padding: '14px 30px', borderRadius: '14px',
                                border: '2px solid #333', backgroundColor: 'transparent',
                                color: '#888', fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                            }}
                        >
                            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>
                            Elegir Otro
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return null;
}

export default Trivia;
