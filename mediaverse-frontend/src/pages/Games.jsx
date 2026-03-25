import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';

function Games() {
    const [juegos, setJuegos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState(localStorage.getItem('mediaverse_busqueda_games') || '');
    const [buscando, setBuscando] = useState(busqueda !== '');
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Guardamos la búsqueda selectivamente
    useEffect(() => {
        localStorage.setItem('mediaverse_busqueda_games', busqueda);
    }, [busqueda]);
    const navigate = useNavigate();
    const [jugados, setJugados] = useState([]);

    const toggleJugado = (e, juego) => {
        e.stopPropagation();
        const yaJugado = jugados.includes(juego.id);

        if (yaJugado) {
            setJugados(jugados.filter(id => id !== juego.id));
        } else {
            setJugados([...jugados, juego.id]);
            Swal.fire({
                title: '¡Completado!',
                text: `Has marcado "${juego.name}" como jugado.`,
                icon: 'success',
                confirmButtonColor: '#4caf50',
                background: '#1e1e1e',
                color: 'white',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    const cargarJuegos = (page = 1) => {
        setCargando(true);
        api.get(`/games/popular?page=${page}`)
            .then((respuesta) => {
                setJuegos(respuesta.data.data);
                setPaginaActual(page);
                setTotalPaginas(Math.ceil(respuesta.data.total_results / 20));
                setCargando(false);
                setBuscando(false);
            })
            .catch((error) => {
                console.error("Error cargando juegos:", error);
                setCargando(false);
            });
    };

    const buscarContenido = (termino, page = 1) => {
        setBuscando(true);
        setCargando(true);
        api.get(`/games/search?query=${termino}&page=${page}`)
            .then((respuesta) => {
                setJuegos(respuesta.data.data);
                setPaginaActual(page);
                setTotalPaginas(Math.ceil(respuesta.data.total_results / 20));
                setCargando(false);
            })
            .catch((error) => {
                console.error("Error en la búsqueda de juegos:", error);
                setCargando(false);
                setBuscando(false);
            });
    };

    // 🌟 LA MAGIA DEL DEBOUNCING
    useEffect(() => {
        const temporizador = setTimeout(() => {
            if (busqueda.trim() !== '') {
                buscarContenido(busqueda, 1);
            } else {
                cargarJuegos(1);
            }
        }, 500);

        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busqueda]);

    const cambiarPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            if (buscando) {
                buscarContenido(busqueda, nuevaPagina);
            } else {
                cargarJuegos(nuevaPagina);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
            <h1 style={{ color: 'white', marginBottom: '20px' }}>
                {buscando ? `Resultados para: "${busqueda}"` : 'Videojuegos Populares'}
            </h1>

            {/* 🔍 BARRA DE BÚSQUEDA EN TIEMPO REAL */}
            <div style={{ marginBottom: '30px', position: 'relative', width: '350px', margin: '0 auto' }}>
                <input
                    type="text"
                    placeholder="Escribe para buscar un juego (Ej: Zelda)..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{ padding: '10px 45px 10px 20px', width: '100%', borderRadius: '25px', border: '2px solid #333', backgroundColor: '#1e1e1e', color: 'white', outline: 'none', fontSize: '16px' }}
                />
                {busqueda && (
                    <button 
                        onClick={() => setBusqueda('')}
                        style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px' }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </div>

            {cargando ? (
                <div style={{ padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <motion.div
                        animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 90, 180, 270, 360]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{ fontSize: '50px', color: '#4caf50' }}
                    >
                        <i className="fa-solid fa-gamepad"></i>
                    </motion.div>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '200px' }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        style={{ height: '10px', backgroundColor: '#4caf50', borderRadius: '5px', boxShadow: '0 0 10px #4caf50' }}
                    />
                    <h2 style={{ color: 'white', letterSpacing: '2px', textTransform: 'uppercase' }}>Cargando Nivel...</h2>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                        {juegos.map((juego) => (
                            <div
                                key={juego.id}
                                style={{
                                    width: '200px', // Consistente con pelis/series
                                    backgroundColor: '#1e1e1e',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                // AL CLICAR, VAMOS AL DETALLE DE TIPO "GAME"
                                onClick={() => navigate(`/detalle/game/${juego.id}`)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {/* ✅ BOTÓN FLOTANTE "JUGADO" MEJORADO */}
                                <button
                                    onClick={(e) => toggleJugado(e, juego)}
                                    style={{
                                        position: 'absolute', top: '15px', right: '15px',
                                        backgroundColor: jugados.includes(juego.id) ? '#4caf50' : 'rgba(0,0,0,0.6)',
                                        border: jugados.includes(juego.id) ? 'none' : '2px solid #4caf50',
                                        borderRadius: '50%', width: '35px', height: '35px', color: 'white',
                                        cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 10, transition: 'all 0.3s ease'
                                    }}
                                    title="Marcar como jugado"
                                >
                                    {jugados.includes(juego.id) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-gamepad"></i>}
                                </button>
 
                                <div>
                                    <div style={{ position: 'relative' }}>
                                        <img src={juego.background_image ? juego.background_image : 'https://via.placeholder.com/500x750?text=No+Image'} alt={juego.name} style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                    <h3 style={{ fontSize: '15px', margin: '12px 0 5px 0', lineHeight: '1.2' }}>
                                        {juego.name} <span style={{ color: '#777', fontSize: '12px' }}>({juego.year})</span>
                                    </h3>
                                    <p style={{ fontSize: '11px', color: '#999', margin: '0 0 10px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {juego.platforms}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px', fontWeight: 'bold' }}>
                                    {/* CONTENEDOR DE PUNTUACIÓN UNIFICADO (Estrella en verde) */}
                                    <div>
                                        {juego.metacritic ? (
                                            <span style={{ color: '#66cc33' }} title="Nota de la Crítica">
                                                <i className="fa-solid fa-star"></i> {(juego.metacritic / 10).toFixed(1)}
                                            </span>
                                        ) : juego.rating > 0 ? (
                                            <span style={{ color: '#66cc33' }} title="Nota de Usuarios (IGDB)">
                                                <i className="fa-solid fa-star"></i> {(juego.rating * 2).toFixed(1)}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#777' }}>Sin nota</span>
                                        )}
                                    </div>
                                    
                                    {/* 👥 MEDIAVERSE (Local) */}
                                    <span style={{ color: '#4caf50' }}>
                                        <i className="fa-solid fa-users"></i> {juego.puntuacion_usuarios ? juego.puntuacion_usuarios : '-'}
                                    </span>
                                </div>
                            </div> /* 🌟 ESTE ES EL DIV QUE FALTABA PARA CERRAR LA TARJETA DEL JUEGO */
                        ))}
                    </div>

                    {totalPaginas > 1 && (
                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                            <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} style={{ padding: '10px 20px', backgroundColor: paginaActual === 1 ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-caret-left"></i> Anterior</button>
                            <span style={{ color: 'white', fontSize: '16px' }}>Página {paginaActual} de {totalPaginas}</span>
                            <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} style={{ padding: '10px 20px', backgroundColor: paginaActual === totalPaginas ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Siguiente <i className="fa-solid fa-caret-right"></i></button>
                        </div>
                    )}

                    {!cargando && juegos.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ padding: '80px 20px', textAlign: 'center' }}
                        >
                            <h1 style={{ fontSize: '5rem', color: '#e50914', textShadow: '0 0 20px rgba(229,9,20,0.8)', margin: 0 }}>GAME OVER</h1>
                            <p style={{ color: '#888', fontSize: '1.5rem', marginBottom: '30px' }}>No se encontraron juegos en esta zona.</p>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setBusqueda('')}
                                style={{ padding: '12px 30px', borderRadius: '30px', border: '2px solid white', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }}
                            >
                                ¿CONTINUAR? (Presiona para Limpiar)
                            </motion.button>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}

export default Games;