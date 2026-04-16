import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { alerts } from '../utils/swal';
import { motion, AnimatePresence } from 'framer-motion';

function Games() {
    const [juegos, setJuegos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // No persistimos la búsqueda
    const navigate = useNavigate();
    const [jugados, setJugados] = useState([]);
    const [verMasTarde, setVerMasTarde] = useState([]);
    const [valoraciones, setValoraciones] = useState([]);
    const [filtros, setFiltros] = useState({
        genre: '',
        year: '',
        platform: '',
        sort: 'rating_count' // Popularidad por defecto
    });

    const [favoritos, setFavoritos] = useState([]);

    useEffect(() => {
        if(localStorage.getItem('auth_token')) {
            api.get('/interactions/me').then(res => {
                const data = res.data.data;
                // Parseamos api_id a Number porque la BBDD lo devuelve como String y .includes fallaría
                if(data.visto) setJugados(data.visto.filter(i => i.medio?.tipo === 'videojuego').map(i => Number(i.medio?.api_id)));
                if(data.ver_mas_tarde) setVerMasTarde(data.ver_mas_tarde.filter(i => i.medio?.tipo === 'videojuego').map(i => Number(i.medio?.api_id)));
                if(data.valoraciones) setValoraciones(data.valoraciones.filter(v => v.medio?.tipo === 'videojuego').map(v => ({api_id: Number(v.medio?.api_id), score: v.puntuacion})));
            }).catch(console.error);
        }
    }, []); // Carga inicial de interacciones

    const toggleInteraccion = (e, juego, tipoLogico) => {
        e.stopPropagation();
        if (!localStorage.getItem('auth_token')) {
            alerts.loginRequired(navigate);
            return;
        }

        // Optimistic UI Update para no haber latencia visual (Mutuamente exclusivos)
        if(tipoLogico === 'jugado') {
            if(!jugados.includes(juego.id)) {
                setJugados(prev => [...prev, juego.id]);
                setVerMasTarde(prev => prev.filter(id => id !== juego.id));
            } else {
                setJugados(prev => prev.filter(id => id !== juego.id));
            }
        } else if(tipoLogico === 'verMasTarde') {
            if(!verMasTarde.includes(juego.id)) {
                setVerMasTarde(prev => [...prev, juego.id]);
                setJugados(prev => prev.filter(id => id !== juego.id));
            } else {
                setVerMasTarde(prev => prev.filter(id => id !== juego.id));
            }
        }

        // Traducir 'jugado' a 'visto' para que SQL no falle
        const tipoSql = tipoLogico === 'jugado' ? 'visto' : 'ver_mas_tarde';

        api.post('/interactions/toggle', {
            api_id: juego.id,
            tipo_medio: 'videojuego',
            titulo: juego.name,
            poster_path: juego.background_image || '',
            tipo_interaccion: tipoSql
        }).catch(err => {
            console.error("Error guardando interacción:", err);
        });
    };

    const cargarJuegos = (page = 1) => {
        setCargando(true);
        let url = '/games/popular?page=' + page;
        if (filtros.genre) url += '&genre=' + filtros.genre;
        if (filtros.year) url += '&year=' + filtros.year;
        if (filtros.platform) url += '&platform=' + filtros.platform;
        if (filtros.sort) url += '&sort=' + filtros.sort;

        api.get(url)
            .then((respuesta) => {
                setJuegos(respuesta.data.data);
                setPaginaActual(page);
                setTotalPaginas(Math.ceil(respuesta.data.total_results / 20));
                setCargando(false);
                setBuscando(false);
            })
            .catch((error) => {
                console.error("Error cargando juegos populares:", error);
                setCargando(false);
            });
    };

    const buscarContenido = (termino, page = 1) => {
        setBuscando(true);
        setCargando(true);
        api.get('/games/search?query=' + termino + '&page=' + page)
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

    // Debounce para la búsqueda en tiempo real
    useEffect(() => {
        const temporizador = setTimeout(() => {
            if (busqueda.trim() !== '') {
                buscarContenido(busqueda, paginaActual);
            } else {
                cargarJuegos(paginaActual);
            }
        }, 500);

        return () => clearTimeout(temporizador);
    }, [busqueda, filtros, paginaActual]);

    const cambiarPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            setPaginaActual(nuevaPagina);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div style={{ textAlign: 'center', paddingTop: '0', paddingBottom: '40px' }}>
            <h1 style={{ color: 'white', marginTop: '0', marginBottom: '10px', fontSize: '2.5rem' }}>
                {buscando ? 'Resultados para: "' + busqueda + '"' : 'Videojuegos Populares'}
            </h1>

            {/* FILTROS (ARRIBA) */}
            <div className="filtros-wrapper" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginBottom: '10px', padding: '0 20px' }}>
                <select
                    value={filtros.genre}
                    onChange={(e) => {
                        setFiltros({ ...filtros, genre: e.target.value });
                        setPaginaActual(1);
                    }}
                    style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="">Géneros IGDB</option>
                    <option value="4">Acción</option>
                    <option value="12">RPG (Rol)</option>
                    <option value="5">Shooter</option>
                    <option value="31">Aventura</option>
                    <option value="10">Carreras</option>
                    <option value="14">Deportes</option>
                    <option value="32">Indie</option>
                    <option value="15">Estrategia</option>
                </select>

                <select
                    value={filtros.platform}
                    onChange={(e) => {
                        setFiltros({ ...filtros, platform: e.target.value });
                        setPaginaActual(1);
                    }}
                    style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="">Plataformas</option>
                    <option value="6">PC (Windows)</option>
                    <option value="167">PlayStation 5</option>
                    <option value="169">Xbox Series X|S</option>
                    <option value="130">Nintendo Switch</option>
                    <option value="48">PlayStation 4</option>
                </select>

                <select
                    value={filtros.year}
                    onChange={(e) => {
                        setFiltros({ ...filtros, year: e.target.value });
                        setPaginaActual(1);
                    }}
                    style={{ padding: '12px 20px', borderRadius: '30px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="">Año</option>
                    {Array.from({ length: 45 }, (_, i) => 2026 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {/* SELECTOR DE ORDEN*/}
                <select
                    value={filtros.sort}
                    onChange={(e) => {
                        setFiltros({ ...filtros, sort: e.target.value });
                        setPaginaActual(1);
                    }}
                    style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="rating_count">Más Populares</option>
                    <option value="rating">Mejor Valorados</option>
                </select>

                {(filtros.genre || filtros.year || filtros.platform || filtros.sort !== 'rating_count') && (
                    <button
                        onClick={() => {
                            setFiltros({ genre: '', year: '', platform: '', sort: 'rating_count' });
                            setPaginaActual(1);
                        }}
                        style={{ padding: '12px 25px', borderRadius: '25px', border: 'none', backgroundColor: '#333', color: 'white', cursor: 'pointer', transition: 'background 0.3s' }}
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* BARRA DE BÚSQUEDA (ABAJO) */}
            <div className="search-bar-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', padding: '0 20px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
                    <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#e50914' }}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <input
                        type="text"
                        placeholder="Escribe para buscar juegos..."
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value);
                            setPaginaActual(1);
                        }}
                        style={{ padding: '15px 45px 15px 55px', width: '100%', borderRadius: '50px', border: '2px solid #222', backgroundColor: '#000', color: 'white', outline: 'none', fontSize: '18px', transition: 'all 0.3s' }}
                        onFocus={(e) => (e.target.style.borderColor = '#e50914')}
                        onBlur={(e) => (e.target.style.borderColor = '#222')}
                    />
                    {busqueda && (
                        <button
                            onClick={() => setBusqueda('')}
                            style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}
                        >
                            <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                    )}
                </div>
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
                    <div className="responsive-grid" style={{ padding: '0 20px' }}>
                        {juegos.map((juego) => (
                            <div
                                key={juego.id}
                                style={{
                                    backgroundColor: '#1e1e1e',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    width: '100%'
                                }}
                                // AL CLICAR, VAMOS AL DETALLE DE TIPO "GAME"
                                onClick={() => navigate('/detalle/game/' + juego.id)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {/* BOTONES FLOTANTES INTERACCIÓN */}
                                <button
                                    className="card-btn-float"
                                    onClick={(e) => toggleInteraccion(e, juego, 'jugado')}
                                    style={{
                                        position: 'absolute', top: '15px', right: '15px',
                                        backgroundColor: jugados.includes(juego.id) ? '#4caf50' : 'rgba(0,0,0,0.6)',
                                        border: jugados.includes(juego.id) ? 'none' : '1px solid white',
                                        borderRadius: '50%', width: '35px', height: '35px', color: 'white',
                                        cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 10, transition: 'all 0.3s ease'
                                    }}
                                    title={jugados.includes(juego.id) ? "Quitar de Jugados" : "Marcar como Jugado"}
                                >
                                    {jugados.includes(juego.id) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-gamepad"></i>}
                                </button>
                                <button
                                    className="card-btn-float-2"
                                    onClick={(e) => toggleInteraccion(e, juego, 'verMasTarde')}
                                    style={{
                                        position: 'absolute', top: '15px', right: '55px',
                                        backgroundColor: verMasTarde.includes(juego.id) ? '#e50914' : 'rgba(0,0,0,0.6)',
                                        border: verMasTarde.includes(juego.id) ? 'none' : '1px solid white',
                                        borderRadius: '50%', width: '35px', height: '35px', color: 'white',
                                        cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 10, transition: 'all 0.3s ease'
                                    }}
                                    title={verMasTarde.includes(juego.id) ? "Quitar de Jugar más tarde" : "Jugar más tarde"}
                                >
                                    <i className="fa-solid fa-clock"></i>
                                </button>
                                <div>
                                    <div style={{ position: 'relative' }}>
                                        <img className="game-grid-img" src={juego.background_image ? juego.background_image : 'https://via.placeholder.com/500x750?text=No+Image'} alt={juego.name} style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                    <h3 style={{ fontSize: '15px', margin: '12px 0 5px 0', lineHeight: '1.2', height: '40px', overflow: 'hidden' }}>
                                        {juego.name} <span style={{ color: '#777', fontSize: '12px' }}>({juego.year})</span>
                                    </h3>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px', fontWeight: 'bold' }}>
                                    {juego.metacritic ? (
                                        <span style={{ color: '#66cc33', fontSize: '13px' }} title="Puntuación de la Crítica">
                                            <i className="fa-solid fa-star"></i> {Number(juego.metacritic).toFixed(1)}
                                        </span>
                                    ) : <div></div>}

                                    {/* NOTA PERSONAL */}
                                    {valoraciones.find(v => v.api_id === juego.id) && (
                                        <span style={{ color: '#2196f3', fontSize: '0.75rem', backgroundColor: 'rgba(33, 150, 243, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                            {Number(valoraciones.find(v => v.api_id === juego.id).score).toFixed(1)}
                                        </span>
                                    )}

                                    <span style={{ color: '#4caf50', fontSize: '13px' }} title="Puntuación MediaVerse">
                                        <i className="fa-solid fa-users"></i> {juego.puntuacion_usuarios || '—'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPaginas > 1 && (
                        <div className="pagination-controls" style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                            <button className="pagination-btn" onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} style={{ padding: '12px 25px', backgroundColor: paginaActual === 1 ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '30px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                                <i className="fa-solid fa-arrow-left"></i> <span className="pagination-btn-text">Anterior</span>
                            </button>

                            <div className="pagination-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1a1a1a', padding: '8px 15px', borderRadius: '30px', border: '1px solid #333' }}>
                                <span style={{ color: '#888', fontSize: '14px' }}>Pág.</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={totalPaginas}
                                    defaultValue={paginaActual}
                                    key={paginaActual}
                                    onBlur={(e) => {
                                        const valor = parseInt(e.target.value);
                                        if (valor && valor >= 1 && valor <= totalPaginas) {
                                            cambiarPagina(valor);
                                        } else {
                                            e.target.value = paginaActual;
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const valor = parseInt(e.target.value);
                                            if (valor && valor >= 1 && valor <= totalPaginas) {
                                                cambiarPagina(valor);
                                            } else {
                                                e.target.value = paginaActual;
                                            }
                                        }
                                    }}
                                    style={{ width: '45px', background: 'transparent', border: 'none', color: '#e50914', fontWeight: 'bold', fontSize: '16px', textAlign: 'center', outline: 'none' }}
                                />
                                <span style={{ color: '#888', fontSize: '14px' }}>de {totalPaginas}</span>
                            </div>

                            <button className="pagination-btn" onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} style={{ padding: '12px 25px', backgroundColor: paginaActual === totalPaginas ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '30px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                                <span className="pagination-btn-text">Siguiente</span> <i className="fa-solid fa-arrow-right"></i>
                            </button>
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
                                Reintentar búsqueda
                            </motion.button>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}

export default Games;