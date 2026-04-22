import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function VerMasTarde() {
    const [verMasTarde, setVerMasTarde] = useState([]); // Lista de medios guardados para ver más tarde
    const [cargando, setCargando] = useState(true); // Estado de carga de la página

    // Búsqueda y filtrado
    const [search, setSearch] = useState('');
    const [filterTipo, setFilterTipo] = useState('todos');

    // Paginación (pongo 12 por página)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    const navigate = useNavigate();

    useEffect(() => {
        if (!localStorage.getItem('auth_token')) {
            navigate('/auth'); // Redirigir si el usuario no está autenticado
            return;
        }

        // Obtener interacciones marcadas como "ver más tarde"
        api.get('/interactions/me').then(res => {
            if (res.data.data.ver_mas_tarde) {
                setVerMasTarde(res.data.data.ver_mas_tarde);
            }
            setCargando(false);
        }).catch(err => {
            console.error("Error al cargar la lista de pendientes:", err);
            setCargando(false);
        });
    }, [navigate]);

    // Filtro de lo que haya buscado
    const filteredItems = verMasTarde.filter(item => {
        const matchesSearch = item.medio.titulo.toLowerCase().includes(search.toLowerCase());
        const matchesTipo = filterTipo === 'todos' || item.medio.tipo === filterTipo;
        return matchesSearch && matchesTipo;
    });

    // Calcular Paginación
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

    // Si filtramos y nos quedamos en una página que ya no existe, volvemos a la 1
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [filteredItems.length, totalPages, currentPage]);

    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalVerMasTarde = verMasTarde.length;

    return (
        <div style={{ padding: '40px 20px', color: 'white', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '3rem', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-1px' }}>
                    <i className="fa-solid fa-clock" style={{ color: '#e50914', marginRight: '15px' }}></i>
                    Ver Más Tarde
                </h2>
                <p style={{ color: '#aaa', fontSize: '1.2rem', margin: 0 }}>Todo el contenido que has guardado para disfrutar en el futuro. Total:  <span style={{ color: '#e50914', fontWeight: 'bold' }}>{totalVerMasTarde}</span> elementos.</p>
            </div>

            {/* BARRA DE BÚSQUEDA Y FILTROS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginBottom: '40px' }}>
                {/* Buscador */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#e50914' }}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar en tu lista..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '15px 20px 15px 50px', borderRadius: '30px', border: '2px solid #333', backgroundColor: '#111', color: 'white', fontSize: '16px', outline: 'none', transition: 'border-color 0.3s' }}
                        onFocus={(e) => e.target.style.borderColor = '#e50914'}
                        onBlur={(e) => e.target.style.borderColor = '#333'}
                    />
                </div>

                {/* Filtro por tipo */}
                <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    style={{ padding: '15px 25px', borderRadius: '30px', border: '2px solid #333', backgroundColor: '#111', color: 'white', fontSize: '16px', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                >
                    <option value="todos">Todos los medios</option>
                    <option value="pelicula">Películas</option>
                    <option value="serie">Series</option>
                    <option value="videojuego">Videojuegos</option>
                </select>
            </div>

            {cargando ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ fontSize: '40px', color: '#e50914' }}>
                        <i className="fa-solid fa-spinner"></i>
                    </motion.div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
                        {filteredItems.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', backgroundColor: '#111', borderRadius: '20px', border: '1px solid #333' }}>
                                <i className="fa-regular fa-clock" style={{ fontSize: '5rem', color: '#444', marginBottom: '25px' }}></i>
                                <h3 style={{ fontSize: '2rem', marginBottom: '10px' }}>No hay resultados</h3>
                                <p style={{ color: '#888', fontSize: '1.2rem' }}>
                                    {search || filterTipo !== 'todos' ? 'No encontramos nada que coincida con tus filtros.' : 'Aún no has guardado nada para ver más tarde.'}
                                </p>
                            </div>
                        ) : null}

                        {paginatedItems.map((item, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={item.id}
                                style={{ backgroundColor: '#1a1a1a', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}
                                whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(0,0,0,0.8)', borderColor: '#e50914' }}
                                onClick={() => {
                                    const tipoUrl = item.medio.tipo === 'videojuego' ? 'game' : (item.medio.tipo === 'pelicula' ? 'movie' : 'tv');
                                    navigate('/detalle/' + tipoUrl + '/' + item.medio.api_id);
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={item.medio.poster_path ? (item.medio.poster_path.startsWith('http') ? item.medio.poster_path : 'https://image.tmdb.org/t/p/w500' + item.medio.poster_path) : 'https://via.placeholder.com/500x750?text=No+Image'}
                                        alt={item.medio.titulo}
                                        style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
                                    />
                                    {/* Etiqueta para saber qué es cada cosa */}
                                    <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                                        {item.medio.tipo === 'videojuego' ? <><i className="fa-solid fa-gamepad" style={{ color: '#4caf50', marginRight: '5px' }}></i> Videojuego</> : item.medio.tipo === 'pelicula' ? <><i className="fa-solid fa-film" style={{ color: '#e50914', marginRight: '5px' }}></i> Película</> : <><i className="fa-solid fa-tv" style={{ color: '#2196f3', marginRight: '5px' }}></i> Serie</>}
                                    </div>
                                </div>
                                <div style={{ padding: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <h4 style={{ margin: '0', fontSize: '1rem', lineHeight: '1.2', fontWeight: 'bold' }}>{item.medio.titulo}</h4>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Controles de Paginación */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '60px' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '12px 25px', borderRadius: '30px', border: 'none', backgroundColor: currentPage === 1 ? '#333' : '#e50914', color: 'white', fontWeight: 'bold', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.3s' }}
                            >
                                <i className="fa-solid fa-chevron-left"></i> Anterior
                            </button>

                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ccc' }}>
                                {currentPage} <span style={{ color: '#666', fontWeight: 'normal' }}>de {totalPages}</span>
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{ padding: '12px 25px', borderRadius: '30px', border: 'none', backgroundColor: currentPage === totalPages ? '#333' : '#e50914', color: 'white', fontWeight: 'bold', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.3s' }}
                            >
                                Siguiente <i className="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default VerMasTarde;
