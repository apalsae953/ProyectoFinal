import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { alerts } from '../utils/swal';

/**
 * PÁGINA: YA VISTOS / JUGADOS
 * Muestra el contenido que el usuario ha marcado como visto o que ya ha completado.
 */
function YaVistos() {
    const [vistos, setVistos] = useState([]); // Los medios que el usuario ya ha visto o jugado
    const [ratings, setRatings] = useState({}); // Las puntuaciones del usuario
    const [cargando, setCargando] = useState(true); // Para el icono de carga
    const [editingDateId, setEditingDateId] = useState(null); // Para saber de qué película estoy cambiando la fecha

    // Para buscar y filtrar
    const [search, setSearch] = useState('');
    const [filterTipo, setFilterTipo] = useState('todos');
    const [orden, setOrden] = useState('reciente');

    // Para la paginación
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15; // Aumentado ligeramente para llenar filas de 5

    const navigate = useNavigate();

    useEffect(() => {
        // Compruebo si estoy logueado
        if (!localStorage.getItem('auth_token')) {
            navigate('/auth');
            return;
        }

        // Recuperamos todas las interacciones del usuario
        api.get('/interactions/me').then(res => {
            if (res.data.data.visto) {
                setVistos(res.data.data.visto);
            }
            if (res.data.data.valoraciones) {
                const rtMap = {};
                res.data.data.valoraciones.forEach(v => {
                    rtMap[v.medio_id] = v.puntuacion;
                });
                setRatings(rtMap);
            }
            setCargando(false);
        }).catch(err => {
            console.error("Error al cargar la lista de vistos:", err);
            setCargando(false);
        });
    }, [navigate]);

    const handleUpdateDate = async (id, nuevaFecha) => {
        if (!nuevaFecha) {
            setEditingDateId(null);
            return;
        }
        try {
            await api.put(`/interactions/${id}/date`, { fecha: nuevaFecha });
            setVistos(prev => prev.map(item =>
                item.id === id ? { ...item, created_at: nuevaFecha } : item
            ));
            setEditingDateId(null);
            alerts.success('Fecha actualizada');
        } catch (e) {
            console.error(e);
            setEditingDateId(null);
            alerts.error('Error al actualizar fecha');
        }
    };

    // Lógica de filtrado y ordenación
    const processedItems = [...vistos]
        .filter(item => {
            const matchesSearch = item.medio.titulo.toLowerCase().includes(search.toLowerCase());
            const matchesTipo = filterTipo === 'todos' || item.medio.tipo === filterTipo;
            return matchesSearch && matchesTipo;
        })
        .sort((a, b) => {
            if (orden === 'reciente') return new Date(b.created_at) - new Date(a.created_at);
            if (orden === 'antiguo') return new Date(a.created_at) - new Date(b.created_at);
            if (orden === 'alfabetico') return a.medio.titulo.localeCompare(b.medio.titulo);
            if (orden === 'nota') {
                const notaA = ratings[a.medio_id] || 0;
                const notaB = ratings[b.medio_id] || 0;
                return notaB - notaA;
            }
            return 0;
        });

    const totalPages = Math.ceil(processedItems.length / ITEMS_PER_PAGE);
    const currentItems = processedItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalVistos = vistos.length;

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [processedItems.length, totalPages, currentPage]);

    if (cargando) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'white' }}>
            <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#e50914' }}></i>
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px' }}>
                        <i className="fa-solid fa-eye" style={{ color: '#e50914', marginRight: '15px' }}></i> Ya Vistos
                    </h1>
                    <p style={{ margin: '10px 0 0 0', color: '#888', fontSize: '1.2rem' }}>
                        Repasa todo el contenido que ya has disfrutado y marcado en tu cuenta. Total: <span style={{ color: '#e50914', fontWeight: 'bold' }}>{totalVistos}</span> elementos.
                    </p>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 300px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#555' }}></i>
                    <input
                        type="text"
                        placeholder="Buscar entre mis vistos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', color: 'white', fontSize: '1rem', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>Ordenar por:</span>
                    <select
                        value={orden}
                        onChange={(e) => setOrden(e.target.value)}
                        style={{ padding: '12px 15px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', color: 'white', fontSize: '1rem', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="reciente">Más recientes</option>
                        <option value="antiguo">Más antiguos</option>
                        <option value="alfabetico">Título (A-Z)</option>
                        <option value="nota">Mejor valorados</option>
                    </select>
                </div>

                <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    style={{ padding: '12px 15px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', color: 'white', fontSize: '1rem', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="todos">Todos los tipos</option>
                    <option value="pelicula">Películas</option>
                    <option value="serie">Series</option>
                    <option value="videojuego">Videojuegos</option>
                </select>
            </div>

            {processedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: '#181818', borderRadius: '20px', border: '1px dashed #333' }}>
                    <i className="fa-solid fa-eye-slash fa-4x" style={{ color: '#2a2a2a', marginBottom: '20px' }}></i>
                    <h2 style={{ color: '#555' }}>No hay elementos en esta lista</h2>
                    <p style={{ color: '#444' }}>Parece que aún no has marcado nada como visto o tu búsqueda no ha dado resultados.</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px' }}>
                        {currentItems.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                style={{ backgroundColor: '#1c1c1c', borderRadius: '15px', overflow: 'hidden', border: '1px solid #2a2a2a', position: 'relative', display: 'flex', flexDirection: 'column' }}
                                whileHover={{ scale: 1.05, borderColor: '#e50914', zIndex: 10 }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <Link to={`/detalle/${item.medio.tipo === 'videojuego' ? 'game' : item.medio.tipo === 'pelicula' ? 'movie' : 'tv'}/${item.medio.api_id}`}>
                                        <img
                                            src={item.medio.poster_path ? (item.medio.poster_path.startsWith('http') ? item.medio.poster_path : 'https://image.tmdb.org/t/p/w500' + item.medio.poster_path) : 'https://via.placeholder.com/500x750?text=No+Poster'}
                                            alt={item.medio.titulo}
                                            style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
                                        />
                                    </Link>

                                    <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                                        {item.medio.tipo === 'videojuego' ? <><i className="fa-solid fa-gamepad" style={{ color: '#4caf50', marginRight: '4px' }}></i> Juego</> : item.medio.tipo === 'pelicula' ? <><i className="fa-solid fa-film" style={{ color: '#e50914', marginRight: '4px' }}></i> Cine</> : <><i className="fa-solid fa-tv" style={{ color: '#2196f3', marginRight: '4px' }}></i> Serie</>}
                                    </div>
                                </div>

                                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', lineHeight: '1.2', height: '2.4em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.medio.titulo}</h3>

                                    <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #2a2a2a' }}>
                                        {editingDateId === item.id ? (
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <input
                                                    type="date"
                                                    defaultValue={new Date(item.created_at).toISOString().split('T')[0]}
                                                    onBlur={(e) => handleUpdateDate(item.id, e.target.value)}
                                                    style={{ width: '100%', padding: '6px', borderRadius: '6px', border: 'none', backgroundColor: '#333', color: 'white', fontSize: '0.75rem', outline: 'none' }}
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div onClick={() => setEditingDateId(item.id)} style={{ fontSize: '0.75rem', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className="fa-regular fa-calendar-days" style={{ fontSize: '0.7rem' }}></i> {new Date(item.created_at).toLocaleDateString()}
                                                    <i className="fa-solid fa-pencil" style={{ fontSize: '0.65rem', marginLeft: '5px', opacity: 0.4 }}></i>
                                                </div>
                                                {ratings[item.medio_id] !== undefined && (
                                                    <div style={{ backgroundColor: '#2196f3', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                        {Number(ratings[item.medio_id]).toFixed(1)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #333', backgroundColor: currentPage === 1 ? '#0a0a0a' : '#222', color: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Anterior
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#888', padding: '0 20px' }}>
                                {currentPage} / {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #333', backgroundColor: currentPage === totalPages ? '#0a0a0a' : '#222', color: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default YaVistos;
