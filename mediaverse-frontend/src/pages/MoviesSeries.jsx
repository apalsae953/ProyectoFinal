import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alerts } from '../utils/swal';

function MoviesSeries() {
    const [peliculas, setPeliculas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [modo, setModo] = useState(localStorage.getItem('mediaverse_modo') || 'movies');

    // Persistimos solo el modo
    useEffect(() => {
        localStorage.setItem('mediaverse_modo', modo);
    }, [modo]);
    const navigate = useNavigate();
    const [vistos, setVistos] = useState([]);
    const [verMasTarde, setVerMasTarde] = useState([]);
    const [valoraciones, setValoraciones] = useState([]);

    const [filtros, setFiltros] = useState({
        genre: '',
        year: '',
        sort: 'popularity.desc'
    });

    useEffect(() => {
        if (localStorage.getItem('auth_token')) {
            api.get('/interactions/me').then(res => {
                const data = res.data.data;
                const tipoActual = modo === 'movies' ? 'pelicula' : 'serie';
                if (data.visto) setVistos(data.visto.filter(i => i.medio?.tipo === tipoActual).map(i => Number(i.medio?.api_id)));
                if (data.ver_mas_tarde) setVerMasTarde(data.ver_mas_tarde.filter(i => i.medio?.tipo === tipoActual).map(i => Number(i.medio?.api_id)));
                if (data.valoraciones) setValoraciones(data.valoraciones.filter(v => v.medio?.tipo === tipoActual).map(v => ({ api_id: Number(v.medio?.api_id), score: v.puntuacion })));
            }).catch(console.error);
        }
    }, [modo]); // Listar al cambiar de modo

    const toggleInteraccion = (e, peli, toggleTipo) => {
        e.stopPropagation();
        if (!localStorage.getItem('auth_token')) {
            alerts.loginRequired(navigate);
            return;
        }

        // Optimistic UI Update para no tener latencia visual (Mutuamente exclusivos)
        if (toggleTipo === 'visto') {
            if (!vistos.includes(peli.id)) {
                setVistos(prev => [...prev, peli.id]);
                setVerMasTarde(prev => prev.filter(id => id !== peli.id));
            } else {
                setVistos(prev => prev.filter(id => id !== peli.id));
            }
        } else if (toggleTipo === 'verMasTarde') {
            if (!verMasTarde.includes(peli.id)) {
                setVerMasTarde(prev => [...prev, peli.id]);
                setVistos(prev => prev.filter(id => id !== peli.id));
            } else {
                setVerMasTarde(prev => prev.filter(id => id !== peli.id));
            }
        }

        const tipoLogicoSql = toggleTipo === 'visto' ? 'visto' : 'ver_mas_tarde';

        api.post('/interactions/toggle', {
            api_id: peli.id,
            tipo_medio: modo === 'movies' ? 'pelicula' : 'serie', // Coincide con BBDD
            titulo: peli.title || peli.name,
            poster_path: peli.poster_path || '',
            tipo_interaccion: tipoLogicoSql
        }).catch(err => {
            console.error("Error interaccion:", err);
        });
    };

    const cargarPopulares = (page = 1, modoActual = modo) => {
        setCargando(true);
        const endpoint = modoActual === 'movies' ? '/movies/popular' : '/tv/popular';
        let url = endpoint + '?page=' + page;
        if (filtros.genre) url += '&genre=' + filtros.genre;
        if (filtros.year) url += '&year=' + filtros.year;
        if (filtros.sort) url += '&sort=' + filtros.sort;

        api.get(url)
            .then((respuesta) => {
                setPeliculas(respuesta.data.data);
                setPaginaActual(respuesta.data.current_page);
                setTotalPaginas(respuesta.data.total_pages);
                setCargando(false);
                setBuscando(false);
            })
            .catch((error) => {
                console.error("Error:", error);
                setCargando(false);
            });
    };

    const buscarContenido = (termino, page = 1) => {
        setBuscando(true);
        setCargando(true);
        const endpoint = modo === 'movies' ? '/movies/search' : '/tv/search';
        api.get(endpoint + '?query=' + termino + '&page=' + page)
            .then((respuesta) => {
                setPeliculas(respuesta.data.data);
                setPaginaActual(respuesta.data.current_page);
                setTotalPaginas(respuesta.data.total_pages);
                setCargando(false);
            })
            .catch((error) => {
                console.error("Error en la búsqueda:", error);
                setCargando(false);
                setBuscando(false);
            });
    };

    useEffect(() => {
        const temporizador = setTimeout(() => {
            if (busqueda.trim() !== '') {
                buscarContenido(busqueda, paginaActual);
            } else {
                cargarPopulares(paginaActual, modo);
            }
        }, 500);
        return () => clearTimeout(temporizador);
    }, [busqueda, modo, filtros, paginaActual]);

    const cambiarPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            setPaginaActual(nuevaPagina);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const estiloBotonModo = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', padding: '10px', transition: '0.3s' };

    return (
        <div style={{ textAlign: 'center', paddingTop: '0', paddingBottom: '40px' }}>
            {/* SELECTORES DE MODO (PELIS / SERIES) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
                <button
                    onClick={() => { setModo('movies'); setPaginaActual(1); setBusqueda(''); setFiltros({ genre: '', year: '', sort: 'popularity.desc' }); }}
                    style={{ ...estiloBotonModo, borderBottom: modo === 'movies' ? '3px solid #e50914' : 'none', color: modo === 'movies' ? '#e50914' : 'white' }}
                ><i className="fa-solid fa-film"></i> Películas</button>
                <button
                    onClick={() => { setModo('tv'); setPaginaActual(1); setBusqueda(''); setFiltros({ genre: '', year: '', sort: 'popularity.desc' }); }}
                    style={{ ...estiloBotonModo, borderBottom: modo === 'tv' ? '3px solid #e50914' : 'none', color: modo === 'tv' ? '#e50914' : 'white' }}
                ><i className="fa-solid fa-tv"></i> Series</button>
            </div>

            <h1 className="hero-title" style={{ color: 'white', marginTop: '0', marginBottom: '10px', fontSize: '2.5rem' }}>
                {buscando ? 'Resultados para: "' + busqueda + '"' : (modo === 'movies' ? 'Películas Populares' : 'Series Populares')}
            </h1>

            {/* FILTROS (ARRIBA) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginBottom: '10px', padding: '0 20px' }}>
                <select
                    value={filtros.genre}
                    onChange={(e) => {
                        setFiltros({ ...filtros, genre: e.target.value });
                        setPaginaActual(1);
                    }}
                    style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none', transition: 'all 0.3s' }}
                >
                    <option value="">Todos los Géneros</option>
                    {modo === 'movies' ? (
                        <>
                            <option value="28">Acción</option>
                            <option value="12">Aventura</option>
                            <option value="16">Animación</option>
                            <option value="35">Comedia</option>
                            <option value="80">Crimen</option>
                            <option value="99">Documental</option>
                            <option value="18">Drama</option>
                            <option value="10751">Familia</option>
                            <option value="14">Fantasía</option>
                            <option value="36">Historia</option>
                            <option value="27">Terror</option>
                            <option value="10402">Música</option>
                            <option value="9648">Misterio</option>
                            <option value="10749">Romance</option>
                            <option value="878">Ciencia Ficción</option>
                            <option value="10770">Película de TV</option>
                            <option value="53">Suspense</option>
                            <option value="10752">Bélico</option>
                            <option value="37">Western</option>
                        </>
                    ) : (
                        <>
                            <option value="10759">Acción y Aventura</option>
                            <option value="16">Animación</option>
                            <option value="35">Comedia</option>
                            <option value="80">Crimen</option>
                            <option value="99">Documental</option>
                            <option value="18">Drama</option>
                            <option value="10751">Familia</option>
                            <option value="10762">Infantil</option>
                            <option value="9648">Misterio</option>
                            <option value="10763">Noticias</option>
                            <option value="10764">Reality Show</option>
                            <option value="10765">Sci-Fi y Fantasía</option>
                            <option value="10766">Telenovela</option>
                            <option value="10767">Talk Show</option>
                            <option value="10768">Guerra y Política</option>
                            <option value="37">Western</option>
                        </>
                    )}
                </select>

                <select
                    value={filtros.year}
                    onChange={(e) => {
                        setFiltros({ ...filtros, year: e.target.value });
                        setPaginaActual(1);
                    }}
                    style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="">Año</option>
                    {Array.from({ length: 45 }, (_, i) => 2026 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <select
                    value={filtros.sort}
                    onChange={(e) => {
                        setFiltros({ ...filtros, sort: e.target.value });
                        setPaginaActual(1);
                    }}
                    style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="popularity.desc">Más Populares</option>
                    <option value="vote_average.desc">Mejor Valoradas</option>
                    <option value={modo === 'movies' ? 'primary_release_date.desc' : 'first_air_date.desc'}>Más Recientes</option>
                </select>

                {(filtros.genre || filtros.year || filtros.sort !== 'popularity.desc') && (
                    <button
                        onClick={() => setFiltros({ genre: '', year: '', sort: 'popularity.desc' })}
                        style={{ padding: '12px 25px', borderRadius: '25px', border: 'none', backgroundColor: '#333', color: 'white', cursor: 'pointer', transition: 'background 0.3s' }}
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* BARRA DE BÚSQUEDA (ABAJO) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', padding: '0 20px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
                    <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#e50914' }}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <input
                        type="text"
                        placeholder={modo === 'movies' ? "Escribe para buscar películas..." : "Escribe para buscar series..."}
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
                <div style={{ padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <motion.div
                        animate={{ rotate: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        style={{ fontSize: '60px', color: '#e50914' }}
                    >
                        <i className="fa-solid fa-clapperboard"></i>
                    </motion.div>
                    <h2 style={{ color: 'white', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '1.2rem' }}>Preparando la función...</h2>
                </div>
            ) : (
                <>
                    <div className="responsive-grid" style={{ padding: '0 20px' }}>
                        {peliculas.map((peli) => (
                            <div
                                key={peli.id}
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
                                    width: '100%' // Ocupa el ancho del grid cell
                                }}
                                onClick={() => navigate('/detalle/' + (modo === 'movies' ? 'movie' : 'tv') + '/' + peli.id)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {/* BOTONES FLOTANTES INTERACCIÓN */}
                                <button
                                    onClick={(e) => toggleInteraccion(e, peli, 'visto')}
                                    style={{
                                        position: 'absolute', top: '15px', right: '15px',
                                        backgroundColor: vistos.includes(peli.id) ? '#4caf50' : 'rgba(0,0,0,0.6)',
                                        border: vistos.includes(peli.id) ? 'none' : '1px solid white',
                                        borderRadius: '50%', width: '35px', height: '35px', color: 'white',
                                        cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 10, transition: 'all 0.3s ease'
                                    }}
                                    title={vistos.includes(peli.id) ? "Quitar de Vistos" : "Marcar como Visto"}
                                >
                                    {vistos.includes(peli.id) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-eye"></i>}
                                </button>
                                <button
                                    onClick={(e) => toggleInteraccion(e, peli, 'verMasTarde')}
                                    style={{
                                        position: 'absolute', top: '15px', right: '55px',
                                        backgroundColor: verMasTarde.includes(peli.id) ? '#e50914' : 'rgba(0,0,0,0.6)',
                                        border: verMasTarde.includes(peli.id) ? 'none' : '1px solid white',
                                        borderRadius: '50%', width: '35px', height: '35px', color: 'white',
                                        cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 10, transition: 'all 0.3s ease'
                                    }}
                                    title={verMasTarde.includes(peli.id) ? "Quitar de Ver Más Tarde" : "Ver Más Tarde"}
                                >
                                    <i className="fa-solid fa-clock"></i>
                                </button>

                                <div>
                                    <img src={peli.poster_path ? 'https://image.tmdb.org/t/p/w500' + peli.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'} alt={peli.title} style={{ width: '100%', borderRadius: '4px' }} />
                                    <h3 style={{ fontSize: '15px', margin: '12px 0 5px 0', lineHeight: '1.2' }}>
                                        {peli.title} <span style={{ color: '#777', fontSize: '12px' }}>({peli.year})</span>
                                    </h3>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px', fontWeight: 'bold' }}>
                                    <span style={{ color: '#66cc33', fontSize: '0.85rem' }}>
                                        <i className="fa-solid fa-star"></i> {peli.vote_average ? peli.vote_average.toFixed(1) : 'N/A'}
                                    </span>

                                    {/* NOTA PERSONAL (AZUL Y CHICA) */}
                                    {valoraciones.find(v => v.api_id === peli.id) && (
                                        <span style={{ color: '#2196f3', fontSize: '0.75rem', backgroundColor: 'rgba(33, 150, 243, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                            {Number(valoraciones.find(v => v.api_id === peli.id).score).toFixed(1)}
                                        </span>
                                    )}

                                    <span style={{ color: '#4caf50', fontSize: '0.85rem' }}><i className="fa-solid fa-users"></i> {peli.puntuacion_usuarios ? peli.puntuacion_usuarios : '-'}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPaginas > 1 && (
                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                            <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} style={{ padding: '12px 25px', backgroundColor: paginaActual === 1 ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '30px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                                <i className="fa-solid fa-arrow-left"></i> Anterior
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1a1a1a', padding: '8px 15px', borderRadius: '30px', border: '1px solid #333' }}>
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

                            <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} style={{ padding: '12px 25px', backgroundColor: paginaActual === totalPaginas ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '30px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}>
                                Siguiente <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </div>
                    )}

                    {!cargando && peliculas.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ padding: '100px 20px', textAlign: 'center' }}
                        >
                            <i className="fa-solid fa-film" style={{ fontSize: '4rem', color: '#333', marginBottom: '20px' }}></i>
                            <h1 style={{ fontSize: '3.5rem', color: 'white', fontWeight: 'bold', margin: 0 }}>FIN DE LA FUNCIÓN</h1>
                            <p style={{ color: '#888', fontSize: '1.2rem', marginTop: '10px', marginBottom: '30px' }}>No hemos encontrado esa escena en nuestro archivo.</p>
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: '#e50914' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setBusqueda(''); setPaginaActual(1); }}
                                style={{ padding: '12px 35px', borderRadius: '30px', border: '1px solid #e50914', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                REINTENTAR BÚSQUEDA
                            </motion.button>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}

export default MoviesSeries;