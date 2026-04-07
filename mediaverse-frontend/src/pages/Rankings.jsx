import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { alerts } from '../utils/swal';
import { useNavigate } from 'react-router-dom';

function Rankings() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('globales'); // globales o mis
    const [rankings, setRankings] = useState([]);
    const [misRankings, setMisRankings] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [isLogged, setIsLogged] = useState(!!localStorage.getItem('auth_token'));
    
    // Globales Pagination & Filters
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });
    const [tipoFiltro, setTipoFiltro] = useState('');
    const [busquedaGlobal, setBusquedaGlobal] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [nuevoRanking, setNuevoRanking] = useState({ titulo: '', descripcion: '', tipo: 'mixed', is_public: true });

    const tipoText = {
        'movies': 'Películas',
        'series': 'Series',
        'games': 'Videojuegos',
        'mixed': 'Cualquier Medio'
    };

    const tipoIcon = {
        'movies': 'fa-film',
        'series': 'fa-tv',
        'games': 'fa-gamepad',
        'mixed': 'fa-photo-film' // mixto
    };

    const fetchGlobales = async () => {
        setCargando(true);
        try {
            const config = { 
                params: { 
                    tipo: tipoFiltro,
                    page: page,
                    q: busquedaGlobal
                } 
            };
            const res = await api.get('/rankings', config);
            setRankings(res.data.data);
            setPagination({
                current_page: res.data.current_page,
                last_page: res.data.last_page
            });
        } catch (err) {
            console.error(err);
        }
        setCargando(false);
    };

    const fetchMisRankings = async () => {
        setCargando(true);
        try {
            const res = await api.get('/user/rankings');
            setMisRankings(res.data);
        } catch (err) {
            console.error(err);
        }
        setCargando(false);
    };

    useEffect(() => {
        if (tab === 'globales') fetchGlobales();
        else {
            if (isLogged) fetchMisRankings();
            else setCargando(false);
        }
    }, [tab, tipoFiltro, page, isLogged]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchGlobales();
    };

    const handleSearchClear = () => {
        setBusquedaGlobal('');
        setPage(1);
        // Si usamos timeout para delay, podemos simplemente llamar a fetch() aquí u obligarlo modificando un estado extra
        // Por simplicidad, el timeout se encargará en base a un effect, pero arriba desactivamos dependencias automáticas de q.
        // Haremos fetch manual:
        setTimeout(() => fetchGlobales(), 0);
    };

    const handleLike = async (ranking_id, ranking_user_id, e) => {
        e.stopPropagation();
        
        if (!isLogged) {
            alerts.loginRequired(navigate, 'Inicia sesión para dar like');
            return;
        }

        const userInfoStr = localStorage.getItem('user_info');
        if (userInfoStr) {
            try {
                const userInfo = JSON.parse(userInfoStr);
                if (String(userInfo.id) === String(ranking_user_id)) {
                     alerts.info('¡Es tu propio ranking!', 'El autor no puede darse like');
                     return;
                }
            } catch(error) { console.error(error); }
        }

        try {
            const res = await api.post('/rankings/' + ranking_id + '/like');
            setRankings(prev => prev.map(r => {
                if(r.id === ranking_id) {
                    return {
                         ...r,
                         is_liked: !r.is_liked,
                         likes_count: res.data.likes_count
                    };
                }
                return r;
            }));
        } catch(error) {
             console.error(error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/rankings', nuevoRanking);
            alerts.success('Ranking creado exitosamente');
            setShowModal(false);
            setNuevoRanking({ titulo: '', descripcion: '', tipo: 'mixed', is_public: true });
            
            if (res.data && res.data.ranking && res.data.ranking.id) {
                navigate('/rankings/' + res.data.ranking.id);
            } else {
                fetchMisRankings();
            }
        } catch (err) {
            alerts.error('No se pudo crear el ranking.');
        }
    };

    const renderRankingCard = (r) => (
        <motion.div 
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            onClick={() => navigate('/rankings/' + r.id)}
            style={{ 
                backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '15px', 
                borderLeft: '5px solid ' + (r.tipo === 'movies' ? '#e50914' : r.tipo === 'series' ? '#4caf50' : r.tipo === 'games' ? '#2196f3' : '#9c27b0'),
                cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{r.titulo}</h3>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    <i className={'fa-solid ' + tipoIcon[r.tipo]}></i> {tipoText[r.tipo]}
                </span>
            </div>
            
            <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem', flex: 1 }}>{r.descripcion || 'Sin descripción'}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={r.user?.avatar || 'https://ui-avatars.com/api/?name=' + r.user?.name + '&background=random'} alt={r.user?.name} style={{ width: '25px', height: '25px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: '#ccc' }}>{r.user?.name}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#888' }} title="Elementos en este ranking">
                        <i className="fa-solid fa-list-ol"></i> {r.items_count || 0}
                    </div>
                    {tab === 'globales' && (
                        <div 
                            style={{ 
                                fontSize: '14px', 
                                color: r.is_liked ? '#e50914' : '#888', 
                                cursor: 'pointer', 
                                transition: 'all 0.2s', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '5px',
                                padding: '4px 8px',
                                borderRadius: '15px',
                                backgroundColor: r.is_liked ? 'rgba(229, 9, 20, 0.1)' : 'transparent'
                            }}
                            onClick={(e) => handleLike(r.id, r.user_id, e)}
                            onMouseEnter={(e) => {if(!r.is_liked) e.currentTarget.style.color = '#ff6b6b'}}
                            onMouseLeave={(e) => {if(!r.is_liked) e.currentTarget.style.color = '#888'}}
                            title={r.is_liked ? 'Quitar like' : 'Dar like'}
                        >
                            <motion.i 
                                whileTap={{ scale: 1.5 }} 
                                className={(r.is_liked ? 'fa-solid' : 'fa-regular') + ' fa-heart'}
                            ></motion.i> 
                            <span>{r.likes_count || 0}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );

    return (
        <div style={{ padding: '20px', color: 'white', maxWidth: '1000px', margin: '0 auto', minHeight: '80vh' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '2.5rem' }}>
                <i className="fa-solid fa-ranking-star" style={{ color: '#ffd700' }}></i> Rankings y Listas
            </h2>
            <p style={{ textAlign: 'center', color: '#ccc', marginBottom: '30px' }}>Descubre el contenido mejor valorado o crea tus propios rankings personalizados.</p>

            {/* TABS */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
                <button 
                    onClick={() => setTab('globales')}
                    style={{ padding: '10px 25px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: tab === 'globales' ? '#e50914' : '#333', color: 'white' }}
                >
                    <i className="fa-solid fa-globe"></i> Explorar Globales
                </button>
                <button 
                    onClick={() => {
                        if (!isLogged) {
                            alerts.loginRequired(navigate, 'Debes iniciar sesión');
                            return;
                        }
                        setTab('mis');
                    }}
                    style={{ padding: '10px 25px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: tab === 'mis' ? '#e50914' : '#333', color: 'white' }}
                >
                    <i className="fa-solid fa-user"></i> Mis Rankings
                </button>
            </div>

            {/* TAB: GLOBAL */}
            {tab === 'globales' && (
                <div>
                    {/* Búsqueda y Filtros */}
                    <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '15px', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {/* Buscador de Texto */}
                        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <i className="fa-solid fa-search" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}></i>
                                <input 
                                    type="text" 
                                    placeholder="Buscar rankings globales..." 
                                    value={busquedaGlobal}
                                    onChange={e => setBusquedaGlobal(e.target.value)}
                                    style={{ width: '100%', padding: '12px 40px', borderRadius: '25px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: 'white', boxSizing: 'border-box', outline: 'none' }}
                                />
                                {busquedaGlobal && (
                                    <i className="fa-solid fa-times" onClick={handleSearchClear} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888', cursor: 'pointer' }}></i>
                                )}
                            </div>
                            <button type="submit" style={{ padding: '0 25px', borderRadius: '25px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                Buscar
                            </button>
                        </form>

                        {/* Filtros Tipo */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid #333', paddingTop: '15px' }}>
                            {['', 'movies', 'series', 'games', 'mixed'].map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => { setTipoFiltro(t); setPage(1); }}
                                    style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid transparent', backgroundColor: tipoFiltro === t ? 'rgba(255,255,255,0.1)' : 'transparent', color: tipoFiltro === t ? '#fff' : '#888', cursor: 'pointer', transition: 'all 0.2s', fontWeight: tipoFiltro === t ? 'bold' : 'normal' }}
                                >
                                    {t === '' ? 'Todos' : tipoText[t]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {cargando ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>
                    ) : rankings.length > 0 ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                {rankings.map(renderRankingCard)}
                            </div>
                            
                            {/* Paginación */}
                            {pagination.last_page > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px' }}>
                                    <button 
                                        disabled={pagination.current_page === 1}
                                        onClick={() => setPage(page - 1)}
                                        style={{ padding: '10px 20px', borderRadius: '25px', border: '1px solid #444', backgroundColor: pagination.current_page === 1 ? 'transparent' : '#e50914', color: pagination.current_page === 1 ? '#444' : 'white', cursor: pagination.current_page === 1 ? 'not-allowed' : 'pointer' }}
                                    >
                                        <i className="fa-solid fa-chevron-left"></i> Anterior
                                    </button>
                                    <span style={{ color: '#888' }}>Página {pagination.current_page} de {pagination.last_page}</span>
                                    <button 
                                        disabled={pagination.current_page === pagination.last_page}
                                        onClick={() => setPage(page + 1)}
                                        style={{ padding: '10px 20px', borderRadius: '25px', border: '1px solid #444', backgroundColor: pagination.current_page === pagination.last_page ? 'transparent' : '#e50914', color: pagination.current_page === pagination.last_page ? '#444' : 'white', cursor: pagination.current_page === pagination.last_page ? 'not-allowed' : 'pointer' }}
                                    >
                                        Siguiente <i className="fa-solid fa-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#888', padding: '40px' }}>No se encontraron rankings coincidentes.</p>
                    )}
                </div>
            )}

            {/* TAB: MIS RANKINGS */}
            {tab === 'mis' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Tus Rankings Creados</h3>
                        <button 
                            onClick={() => setShowModal(true)}
                            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <i className="fa-solid fa-plus"></i> Crear Nuevo
                        </button>
                    </div>

                    {cargando ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>
                    ) : misRankings.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {misRankings.map(renderRankingCard)}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', backgroundColor: '#1e1e1e', padding: '60px', borderRadius: '15px' }}>
                            <i className="fa-solid fa-ghost fa-3x" style={{ color: '#555', marginBottom: '15px' }}></i>
                            <p style={{ color: '#aaa' }}>Aún no has creado ningún ranking. ¡Anímate y crea el primero!</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL CREAR RANKING */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '500px', border: '1px solid #333' }}
                        >
                            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                Crear Nuevo Ranking
                                <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', color: '#888' }} onClick={() => setShowModal(false)}></i>
                            </h3>
                            <form onSubmit={handleCreate}>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontWeight: 'bold' }}>Nombre del Ranking</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={nuevoRanking.titulo}
                                        onChange={e => setNuevoRanking({...nuevoRanking, titulo: e.target.value})}
                                        placeholder="Ej: Mis películas favoritas del 2026"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: 'white', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontWeight: 'bold' }}>Descripción (Opcional)</label>
                                    <textarea 
                                        value={nuevoRanking.descripcion}
                                        onChange={e => setNuevoRanking({...nuevoRanking, descripcion: e.target.value})}
                                        rows="3"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: 'white', boxSizing: 'border-box' }}
                                    ></textarea>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontWeight: 'bold' }}>Tipo de Contenido</label>
                                    <select 
                                        value={nuevoRanking.tipo}
                                        onChange={e => setNuevoRanking({...nuevoRanking, tipo: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: 'white', boxSizing: 'border-box' }}
                                    >
                                        <option value="mixed">Cualquier Medio (Mixto)</option>
                                        <option value="movies">Solo Películas</option>
                                        <option value="series">Solo Series</option>
                                        <option value="games">Solo Videojuegos</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="isPublic"
                                        checked={nuevoRanking.is_public}
                                        onChange={e => setNuevoRanking({...nuevoRanking, is_public: e.target.checked})}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="isPublic" style={{ cursor: 'pointer', color: '#ccc' }}>
                                        Hacer este ranking público
                                        <div style={{ fontSize: '12px', color: '#888' }}>Si está marcado, aparecerá en el listado global.</div>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #555', backgroundColor: 'transparent', color: 'white', cursor: 'pointer' }}>Cancelar</button>
                                    <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Ranking</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Rankings;
