import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alerts } from '../utils/swal';

function Anime() {
    const [contenido, setContenido] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    
    const navigate = useNavigate();
    const [vistos, setVistos] = useState([]);
    const [verMasTarde, setVerMasTarde] = useState([]);
    const [valoraciones, setValoraciones] = useState([]);

    const [filtros, setFiltros] = useState({
        year: '',
        sort: 'popularity.desc'
    });

    // Cargar interacciones del usuario
    useEffect(() => {
        if(localStorage.getItem('auth_token')) {
            api.get('/interactions/me').then(res => {
                const data = res.data.data;
                if(data.visto) setVistos(data.visto.map(i => Number(i.medio?.api_id)));
                if(data.ver_mas_tarde) setVerMasTarde(data.ver_mas_tarde.map(i => Number(i.medio?.api_id)));
                if(data.valoraciones) setValoraciones(data.valoraciones.map(v => ({api_id: Number(v.medio?.api_id), score: v.puntuacion})));
            }).catch(console.error);
        }
    }, []); // Carga inicial

    const toggleInteraccion = (e, item, toggleTipo) => {
        e.stopPropagation();
        if (!localStorage.getItem('auth_token')) {
            alerts.loginRequired(navigate);
            return;
        }

        const id = item.id;
        // Optimistic UI Update
        if(toggleTipo === 'visto') {
            if(!vistos.includes(id)) {
                setVistos(prev => [...prev, id]);
                setVerMasTarde(prev => prev.filter(vid => vid !== id));
            } else {
                setVistos(prev => prev.filter(vid => vid !== id));
            }
        } else if(toggleTipo === 'verMasTarde') {
            if(!verMasTarde.includes(id)) {
                setVerMasTarde(prev => [...prev, id]);
                setVistos(prev => prev.filter(vid => vid !== id));
            } else {
                setVerMasTarde(prev => prev.filter(vid => vid !== id));
            }
        }

        api.post('/interactions/toggle', {
            api_id: id,
            tipo_medio: item._type_mixed === 'movie' ? 'pelicula' : 'serie',
            titulo: item.title || item.name,
            poster_path: item.poster_path || '',
            tipo_interaccion: toggleTipo === 'visto' ? 'visto' : 'ver_mas_tarde'
        }).catch(err => {
            console.error("Error interaccion:", err);
        });
    };

    const cargarAnime = (page = 1) => {
        setCargando(true);
        let url = '/anime/popular?page=' + page;
        if (filtros.year) url += '&year=' + filtros.year;
        if (filtros.sort) url += '&sort=' + filtros.sort;

        api.get(url)
            .then((respuesta) => {
                setContenido(respuesta.data.data);
                setPaginaActual(respuesta.data.current_page);
                setTotalPaginas(respuesta.data.total_pages);
                setCargando(false);
                setBuscando(false);
            })
            .catch((error) => {
                console.error("Error al cargar anime:", error);
                setCargando(false);
            });
    };

    const buscarAnime = (termino, page = 1) => {
        setBuscando(true);
        setCargando(true);
        api.get('/anime/search?query=' + termino + '&page=' + page)
            .then((respuesta) => {
                setContenido(respuesta.data.data);
                setPaginaActual(respuesta.data.current_page);
                setTotalPaginas(respuesta.data.total_pages);
                setCargando(false);
            })
            .catch((error) => {
                console.error("Error en búsqueda anime:", error);
                setCargando(false);
            });
    };

    useEffect(() => {
        const temporizador = setTimeout(() => {
            if (busqueda.trim() !== '') {
                buscarAnime(busqueda, paginaActual);
            } else {
                cargarAnime(paginaActual);
            }
        }, 500);
        return () => clearTimeout(temporizador);
    }, [busqueda, paginaActual, filtros]);

    const cambiarPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            setPaginaActual(nuevaPagina);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ color: 'white', fontSize: '3rem', fontWeight: 900, letterSpacing: '-2px', marginBottom: '5px' }}>
                    <i className="fa-solid fa-shinto-portal" style={{ color: '#e50914', marginRight: '15px' }}></i>
                    {buscando ? 'Resultados: "' + busqueda + '"' : 'Universo Anime'}
                </h1>
                <p style={{ color: '#aaa', fontSize: '1.1rem' }}>Películas y series de animación japonesa en un mismo lugar.</p>
            </div>

            {/* BARRA DE BÚSQUEDA (ESTILO PREMIUM) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', padding: '0 20px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
                    <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#e50914' }}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <input
                        type="text"
                        placeholder="Busca tu anime favorito..."
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                        style={{ padding: '15px 45px 15px 55px', width: '100%', borderRadius: '50px', border: '2px solid #222', backgroundColor: '#000', color: 'white', outline: 'none', fontSize: '18px', transition: 'all 0.3s', boxSizing: 'border-box' }}
                        onFocus={(e) => (e.target.style.borderColor = '#e50914')}
                        onBlur={(e) => (e.target.style.borderColor = '#222')}
                    />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}>
                            <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* FILTROS */}
            {!buscando && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginBottom: '40px' }}>
                    <select 
                        value={filtros.year} 
                        onChange={(e) => { setFiltros({...filtros, year: e.target.value}); setPaginaActual(1); }}
                        style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="">Cualquier Año</option>
                        {Array.from({length: 40}, (_, i) => 2025 - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <select 
                        value={filtros.sort} 
                        onChange={(e) => { setFiltros({...filtros, sort: e.target.value}); setPaginaActual(1); }}
                        style={{ padding: '12px 20px', borderRadius: '25px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="popularity.desc">Más Populares</option>
                        <option value="vote_average.desc">Mejor Valoradas</option>
                        <option value="primary_release_date.desc">Estrenos Recientes</option>
                    </select>

                    {(filtros.year || filtros.sort !== 'popularity.desc') && (
                        <button 
                            onClick={() => setFiltros({ year: '', sort: 'popularity.desc' })}
                            style={{ padding: '12px 25px', borderRadius: '25px', border: 'none', backgroundColor: '#333', color: 'white', cursor: 'pointer' }}
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            )}

            {cargando ? (
                <div style={{ padding: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <motion.div
                        animate={{ rotate: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        style={{ fontSize: '60px', color: '#e50914' }}
                    >
                        <i className="fa-solid fa-clapperboard"></i>
                    </motion.div>
                    <h2 style={{ color: 'white', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '1.2rem' }}>Invocando contenido...</h2>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px', justifyContent: 'center' }}>
                        {contenido.map((item) => (
                            <div
                                key={`${item._type_mixed}-${item.id}`}
                                style={{
                                    width: '210px',
                                    backgroundColor: '#161616',
                                    borderRadius: '12px',
                                    padding: '10px',
                                    color: 'white',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: '1px solid #222'
                                }}
                                onClick={() => navigate('/detalle/' + (item._type_mixed === 'movie' ? 'movie' : 'tv') + '/' + item.id)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-10px)';
                                    e.currentTarget.style.borderColor = '#e50914';
                                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(229,9,20,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = '#222';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* BADGE TIPO */}
                                <div style={{ position: 'absolute', top: '15px', left: '15px', backgroundColor: item._type_mixed === 'movie' ? '#e50914' : '#2196f3', fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '4px', zIndex: 11, textTransform: 'uppercase' }}>
                                    {item._type_mixed === 'movie' ? 'Película' : 'Serie'}
                                </div>

                                {/* BOTONES INTERACCIÓN */}
                                <button
                                    onClick={(e) => toggleInteraccion(e, item, 'visto')}
                                    style={{
                                        position: 'absolute', top: '15px', right: '15px',
                                        backgroundColor: vistos.includes(item.id) ? '#4caf50' : 'rgba(0,0,0,0.6)',
                                        border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'white', cursor: 'pointer', zIndex: 12, transition: 'all 0.3s'
                                    }}
                                >
                                    {vistos.includes(item.id) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-eye"></i>}
                                </button>
                                <button
                                    onClick={(e) => toggleInteraccion(e, item, 'verMasTarde')}
                                    style={{
                                        position: 'absolute', top: '55px', right: '15px',
                                        backgroundColor: verMasTarde.includes(item.id) ? '#e50914' : 'rgba(0,0,0,0.6)',
                                        border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'white', cursor: 'pointer', zIndex: 12, transition: 'all 0.3s'
                                    }}
                                >
                                    <i className="fa-solid fa-clock"></i>
                                </button>

                                <img src={item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'} alt={item.title} style={{ width: '100%', borderRadius: '8px' }} />
                                
                                <h3 style={{ fontSize: '15px', margin: '15px 0 5px 0', lineHeight: 1.3, height: '40px', overflow: 'hidden' }}>
                                    {item.title} <span style={{ color: '#666', fontSize: '12px' }}>({item.year})</span>
                                </h3>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #222', paddingTop: '10px' }}>
                                    <span style={{ color: '#66cc33', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        <i className="fa-solid fa-star"></i> {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
                                    </span>
                                    {item.puntuacion_usuarios && (
                                        <span style={{ color: '#2196f3', fontSize: '0.8rem', backgroundColor: 'rgba(33,150,243,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                            {item.puntuacion_usuarios}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PAGINACIÓN */}
                        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                            <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} style={{ padding: '12px 30px', backgroundColor: paginaActual === 1 ? '#555' : '#e50914', opacity: paginaActual === 1 ? 0.3 : 1, color: 'white', border: 'none', borderRadius: '30px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}>
                                <i className="fa-solid fa-chevron-left"></i> Anterior
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

                            <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} style={{ padding: '12px 30px', backgroundColor: paginaActual === totalPaginas ? '#555' : '#e50914', opacity: paginaActual === totalPaginas ? 0.3 : 1, color: 'white', border: 'none', borderRadius: '30px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}>
                                Siguiente <i className="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>

                    {!cargando && contenido.length === 0 && (
                        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                            <i className="fa-solid fa-ghost" style={{ fontSize: '4rem', color: '#333', marginBottom: '20px' }}></i>
                            <h2 style={{ color: 'white' }}>No se han encontrado resultados</h2>
                            <p style={{ color: '#666' }}>Prueba con otros términos o limpia los filtros.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Anime;
