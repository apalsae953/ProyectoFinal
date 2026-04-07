import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import api from '../services/api';
import { alerts } from '../utils/swal';

function RankingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ranking, setRanking] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Buscador
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
    const [tipoBusqueda, setTipoBusqueda] = useState('movie');
    
    // Paginación del buscador
    const [busquedaPage, setBusquedaPage] = useState(1);
    const [apiCurrentPage, setApiCurrentPage] = useState(1);
    const [apiTotalPages, setApiTotalPages] = useState(1);

    // Edición del ranking
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ titulo: '', descripcion: '', is_public: true });

    const handleEditOpen = () => {
        if (!ranking) return;
        setEditData({
            titulo: ranking.titulo || '',
            descripcion: ranking.descripcion || '',
            is_public: ranking.is_public ?? true
        });
        setIsEditing(true);
    };

    const handleEditSave = async () => {
        if (!editData.titulo.trim()) {
            notify('El título es requerido', 'error');
            return;
        }
        try {
            await api.put('/rankings/' + id, editData);
            setRanking({ ...ranking, ...editData });
            setIsEditing(false);
            alerts.success('Ranking actualizado');
        } catch (err) {
            alerts.error('No se pudo actualizar el ranking');
        }
    };

    const handleEliminarRanking = async () => {
        const confirm = await alerts.confirm('¿Eliminar ranking entero?', '¡Esta acción es irreversible! Se borrarán todos los elementos guardados.', 'Sí, borrar ranking');
        if (confirm.isConfirmed) {
            try {
                await api.delete('/rankings/' + id);
                alerts.success('Ranking eliminado');
                navigate('/rankings');
            } catch (err) {
                alerts.error('No se pudo eliminar el ranking');
            }
        }
    };

    const fetchRanking = async () => {
        setCargando(true);
        setErrorMsg(null);
        try {
            console.log("Cargando ranking con ID:", id);
            const res = await api.get('/rankings/' + id);
            console.log("Respuesta recibida:", res.data);
            
            if (res.data) {
                setRanking(res.data);
                
                // Check ownership securely
                const userInfoStr = localStorage.getItem('user_info');
                if (userInfoStr) {
                    try {
                        const userInfo = JSON.parse(userInfoStr);
                        if (userInfo && String(userInfo.id) === String(res.data.user_id)) {
                            setIsOwner(true);
                        }
                    } catch(e) { console.error("Error parseando user info", e); }
                }
            } else {
                setErrorMsg("El backend no devolvió datos");
            }
        } catch (err) {
            console.error("Error cargando ranking:", err);
            setErrorMsg("No se ha encontrado el ranking. Quizás fue eliminado o no tienes permisos.");
        }
        setCargando(false);
    };

    useEffect(() => {
        fetchRanking();
    }, [id]);

    useEffect(() => {
        if (ranking && ranking.tipo) {
            if (ranking.tipo === 'movies') setTipoBusqueda('movie');
            else if (ranking.tipo === 'series') setTipoBusqueda('tv');
            else if (ranking.tipo === 'games') setTipoBusqueda('game');
            // Si es 'mixed' mantenemos 'movie' por defecto
        }
    }, [ranking]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!busqueda || typeof busqueda !== 'string' || busqueda.trim() === '') {
                setResultadosBusqueda([]);
                return;
            }
            // Reset searches
            setBusquedaPage(1);
            setApiCurrentPage(1);
            setResultadosBusqueda([]);
            realizarBusqueda(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [busqueda, tipoBusqueda]);

    const realizarBusqueda = async (pageToFetch) => {
        setBuscando(true);
        try {
            let endpoint = '';
            if (tipoBusqueda === 'movie') endpoint = '/movies/search?query=' + busqueda + '&page=' + pageToFetch;
            else if (tipoBusqueda === 'tv') endpoint = '/tv/search?query=' + busqueda + '&page=' + pageToFetch;
            else if (tipoBusqueda === 'game') endpoint = '/games/search?query=' + busqueda + '&page=' + pageToFetch;

            const res = await api.get(endpoint);
            if (res.data && res.data.data && res.data.data.length > 0) {
                if (pageToFetch === 1) {
                    setResultadosBusqueda(res.data.data);
                } else {
                    setResultadosBusqueda(prev => [...prev, ...res.data.data]);
                }
                setApiCurrentPage(res.data.current_page || 1);
                setApiTotalPages(res.data.total_pages || 1);
            } else if (pageToFetch === 1) {
                setResultadosBusqueda([]);
            }
        } catch (err) {
            console.error(err);
        }
        setBuscando(false);
    };

    const handleSiguienteBusqueda = () => {
        const maxLocalPages = Math.ceil(resultadosBusqueda.length / 5);
        if (busquedaPage < maxLocalPages) {
            setBusquedaPage(p => p + 1);
        } else if (apiCurrentPage < apiTotalPages) {
            realizarBusqueda(apiCurrentPage + 1).then(() => {
                setBusquedaPage(p => p + 1); // Avanza a la pagina recien cargada
            });
        }
    };

    const handleAnteriorBusqueda = () => {
        if (busquedaPage > 1) {
            setBusquedaPage(p => p - 1);
        }
    };
    
    // Elementos a mostrar en esta pagina
    const startIndex = (busquedaPage - 1) * 5;
    const resultadosVisibles = resultadosBusqueda.slice(startIndex, startIndex + 5);
    const maxLocalPagesCalc = Math.ceil(resultadosBusqueda.length / 5);
    const hasNextPage = busquedaPage < maxLocalPagesCalc || apiCurrentPage < apiTotalPages;

    const añadirElementoAPI = async (media) => {
        if (!media) return;
        
        let poster = null;
        if (tipoBusqueda === 'game') {
            poster = media.background_image;
        } else if (media.poster_path) {
            poster = 'https://image.tmdb.org/t/p/w200' + media.poster_path;
        }
        
        try {
            await api.post('/rankings/' + id + '/items', {
                media_id: media.id,
                media_type: tipoBusqueda,
                media_name: media.title || media.name || 'Desconocido',
                media_image: poster
            });
            alerts.success('Añadido al ranking');
            fetchRanking();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors || 'Error al añadir. Quizás ya esté en la lista.';
            alerts.error(typeof msg === 'string' ? msg : 'Error de validación');
        }
    };

    const handleReorder = async (nuevosItems) => {
        const reorderedItems = nuevosItems.map((item, index) => ({
            ...item,
            position: index + 1
        }));
        
        setRanking({ ...ranking, items: reorderedItems });

        try {
            await api.put('/rankings/' + id, {
                items: reorderedItems.map(item => ({ id: item.id, position: item.position }))
            });
        } catch (e) {
            fetchRanking();
            alerts.error('Error al ordenar');
        }
    };

    const handleEliminarItem = async (itemId) => {
        const confirm = await alerts.confirm('¿Quitar elemento?', 'Se eliminará de tu ranking', 'Sí, quitar');
        if (confirm.isConfirmed) {
            try {
                await api.delete('/rankings/' + id + '/items/' + itemId);
                fetchRanking();
            } catch (err) {
                alerts.error('No se pudo eliminar');
            }
        }
    };

    if (cargando) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}>
                <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#e50914' }}></i>
                <span style={{ marginLeft: '15px', fontSize: '1.2rem' }}>Cargando ranking...</span>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'white' }}>
                <i className="fa-solid fa-triangle-exclamation fa-4x" style={{ color: '#e50914', marginBottom: '20px' }}></i>
                <h2 style={{ marginBottom: '10px' }}>No pudimos cargar esto</h2>
                <p style={{ color: '#888', marginBottom: '30px' }}>{errorMsg}</p>
                <button onClick={() => navigate('/rankings')} style={{ padding: '10px 20px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Volver a Rankings</button>
            </div>
        );
    }

    if (!ranking) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: 'white' }}>
                <p>El ranking está vacío o no se reconoció.</p>
                <button onClick={() => navigate('/rankings')} style={{ padding: '10px 20px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px' }}>Volver</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', color: 'white', maxWidth: '900px', margin: '0 auto', minHeight: '80vh' }}>
            <button onClick={() => navigate('/rankings')} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', marginBottom: '20px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = '#ccc'}>
                <i className="fa-solid fa-arrow-left"></i> Volver a Rankings
            </button>

            <div style={{ backgroundColor: '#1e1e1e', padding: '15px 25px', borderRadius: '15px', borderLeft: '5px solid #e50914', marginBottom: '30px', boxShadow: '0 5px 20px rgba(0,0,0,0.5)' }}>
                {isEditing ? (
                    <div style={{ marginBottom: '15px' }}>
                        <input 
                            type="text" 
                            value={editData.titulo} 
                            onChange={e => setEditData({...editData, titulo: e.target.value})} 
                            style={{ width: '100%', fontSize: '1.8rem', fontWeight: '900', backgroundColor: '#2a2a2a', border: '1px solid #444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
                        />
                        <textarea 
                            value={editData.descripcion} 
                            onChange={e => setEditData({...editData, descripcion: e.target.value})} 
                            rows="3"
                            style={{ width: '100%', fontSize: '1rem', backgroundColor: '#2a2a2a', border: '1px solid #444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <input type="checkbox" checked={editData.is_public} onChange={e => setEditData({...editData, is_public: e.target.checked})} id="editPublic" style={{ cursor: 'pointer', width: '16px', height: '16px' }}/>
                            <label htmlFor="editPublic" style={{ color: '#ccc', cursor: 'pointer' }}>Ranking Público (visible para todos)</label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleEditSave} style={{ padding: '8px 15px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Cambios</button>
                            <button onClick={() => setIsEditing(false)} style={{ padding: '8px 15px', backgroundColor: 'transparent', color: '#ccc', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h1 style={{ margin: '0 0 5px 0', fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.5px', wordBreak: 'break-word' }}>{ranking?.titulo || 'Ranking sin Nombre'}</h1>
                            {isOwner && (
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button onClick={handleEditOpen} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }} onMouseEnter={e => {e.target.style.color = 'white'; e.target.style.borderColor='#888'}} onMouseLeave={e => {e.target.style.color = '#ccc'; e.target.style.borderColor='#444'}}>
                                        <i className="fa-solid fa-pen" style={{ pointerEvents:'none' }}></i> <span style={{ pointerEvents:'none' }}>Editar</span>
                                    </button>
                                    <button onClick={handleEliminarRanking} style={{ background: 'transparent', border: '1px solid #444', color: '#e50914', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }} onMouseEnter={e => {e.target.style.backgroundColor = '#e50914'; e.target.style.color = 'white'; e.target.style.borderColor='#e50914'}} onMouseLeave={e => {e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#e50914'; e.target.style.borderColor='#444'}}>
                                        <i className="fa-solid fa-trash" style={{ pointerEvents:'none' }}></i> <span style={{ pointerEvents:'none' }}>Borrar</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <p style={{ color: '#aaa', fontSize: '1rem', marginBottom: '15px', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{ranking?.descripcion || 'Sin descripción'}</p>
                    </>
                )}
                
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px', color: '#888', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={ranking?.user?.avatar || 'https://ui-avatars.com/api/?name=' + (ranking?.user?.name || 'User') + '&background=random'} alt="User" style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #333' }} />
                        <span style={{ color: '#ddd' }}>Por <strong style={{color:'white'}}>{ranking?.user?.name || 'Desconocido'}</strong></span>
                    </div>
                    <span style={{color: '#444'}}>|</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i className="fa-solid fa-list-ol"></i> <strong style={{color:'white'}}>{ranking?.items?.length || 0}</strong> elementos</span>
                    <span style={{color: '#444'}}>|</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className={'fa-solid ' + (ranking?.tipo === 'movies' ? 'fa-film' : ranking?.tipo === 'series' ? 'fa-tv' : ranking?.tipo === 'games' ? 'fa-gamepad' : 'fa-photo-film')}></i> 
                        <strong style={{color:'white'}}>{ranking?.tipo === 'mixed' ? 'Cualquier Medio' : ranking?.tipo === 'movies' ? 'Películas' : ranking?.tipo === 'series' ? 'Series' : 'Videojuegos'}</strong>
                    </span>
                </div>
            </div>

            {/* BUSCADOR PARA AÑADIR */}
            {isOwner && (
                <div style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '15px', marginBottom: '40px', border: '1px solid #333', boxShadow: '0 5px 20px rgba(0,0,0,0.4)' }}>
                    <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="fa-solid fa-plus-circle" style={{color:'#e50914'}}></i> Busca y Añade a tu Ranking</h3>
                    
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', position: 'relative' }}>
                        {(ranking?.tipo === 'mixed' || !ranking?.tipo) && (
                            <select 
                                value={tipoBusqueda} 
                                onChange={e => {setTipoBusqueda(e.target.value); setBusqueda(''); setResultadosBusqueda([]);}}
                                style={{ padding: '15px', borderRadius: '10px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: 'white', flex: '0 0 160px', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="movie">Películas</option>
                                <option value="tv">Series</option>
                                <option value="game">Videojuegos</option>
                            </select>
                        )}
                        
                        <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}><i className="fa-solid fa-search"></i></div>
                            <input 
                                type="text" 
                                placeholder={'Añadir ' + (tipoBusqueda === 'movie' ? 'una Película' : tipoBusqueda === 'tv' ? 'una Serie' : 'un Videojuego') + '...'} 
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                style={{ width: '100%', padding: '15px 40px', borderRadius: '10px', border: '1px solid #444', backgroundColor: '#2a2a2a', color: 'white', boxSizing: 'border-box', outline: 'none', transition: 'border 0.3s' }}
                                onFocus={e => e.target.style.borderColor = '#e50914'}
                                onBlur={e => e.target.style.borderColor = '#444'}
                            />
                            {buscando && <i className="fa-solid fa-spinner fa-spin" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#e50914' }}></i>}
                            {busqueda && !buscando && <i className="fa-solid fa-times" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888', cursor: 'pointer' }} onClick={() => {setBusqueda(''); setResultadosBusqueda([]);}}></i>}
                        </div>
                    </div>

                    {/* Resultados de Búsqueda */}
                    {resultadosVisibles && resultadosVisibles.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '15px', backgroundColor: '#111', borderRadius: '10px', padding: '10px', border: '1px solid #333' }}>
                            {resultadosVisibles.map((res, idx) => (
                                <div key={res.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: idx !== resultadosVisibles.length -1 ? '1px solid #222' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <img src={tipoBusqueda === 'game' ? res.background_image : (res.poster_path ? 'https://image.tmdb.org/t/p/w92' + res.poster_path : 'https://via.placeholder.com/45x68?text=N/A')} style={{ width: '45px', height: '68px', objectFit: 'cover', borderRadius: '5px' }} alt="Poster" />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{res.title || res.name || 'Sin título'}</div>
                                            <div style={{ fontSize: '13px', color: '#888' }}>{res.year || res.release_date?.substring(0,4) || res.first_air_date?.substring(0,4) || ''}</div>
                                        </div>
                                    </div>
                                    {ranking?.items && ranking.items.some(i => String(i.media_id) === String(res.id)) ? (
                                        <span style={{ color: '#4caf50', fontWeight: 'bold', padding: '8px 15px' }}><i className="fa-solid fa-check"></i> Ya añadido</span>
                                    ) : (
                                        <button 
                                            onClick={() => añadirElementoAPI(res)}
                                            style={{ padding: '8px 20px', borderRadius: '5px', border: 'none', backgroundColor: 'rgba(229,9,20,0.2)', color: '#e50914', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}
                                            onMouseEnter={e => {e.target.style.backgroundColor='#e50914'; e.target.style.color='white'}}
                                            onMouseLeave={e => {e.target.style.backgroundColor='rgba(229,9,20,0.2)'; e.target.style.color='#e50914'}}
                                        >
                                            <i className="fa-solid fa-plus"></i> Añadir
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Paginación del buscador */}
                            {(busquedaPage > 1 || hasNextPage) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                                    <button 
                                        onClick={handleAnteriorBusqueda}
                                        disabled={busquedaPage === 1}
                                        style={{ padding: '8px 15px', borderRadius: '5px', backgroundColor: busquedaPage === 1 ? 'transparent' : '#333', color: busquedaPage === 1 ? '#555' : '#fff', border: 'none', cursor: busquedaPage === 1 ? 'not-allowed' : 'pointer' }}
                                    >
                                        <i className="fa-solid fa-chevron-left"></i> Anterior
                                    </button>
                                    <span style={{ color: '#888', fontSize: '12px' }}>Pág. {busquedaPage}</span>
                                    <button 
                                        onClick={handleSiguienteBusqueda}
                                        disabled={!hasNextPage}
                                        style={{ padding: '8px 15px', borderRadius: '5px', backgroundColor: !hasNextPage ? 'transparent' : '#333', color: !hasNextPage ? '#555' : '#fff', border: 'none', cursor: !hasNextPage ? 'not-allowed' : 'pointer' }}
                                    >
                                        Siguiente <i className="fa-solid fa-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            )}

            <div>
                {ranking?.items && ranking.items.length > 0 ? (
                    <Reorder.Group 
                        axis="y" 
                        values={ranking.items} 
                        onReorder={handleReorder} 
                        style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: 0, margin: 0, listStyleType: 'none' }}
                    >
                        {ranking.items.map((item, index) => (
                            <Reorder.Item 
                                key={item.id}
                                value={item}
                                dragListener={isOwner}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#1a1a1a', 
                                    padding: '15px', borderRadius: '12px', position: 'relative', overflow: 'hidden',
                                    border: '1px solid #333', boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                                    cursor: isOwner ? 'grab' : 'default',
                                    userSelect: 'none'
                                }}
                                whileHover={isOwner ? { scale: 1.01, borderColor: '#555' } : {}}
                                whileDrag={{ scale: 1.05, boxShadow: '0 15px 30px rgba(0,0,0,0.5)', zIndex: 10, borderColor: '#e50914' }}
                            >
                                {isOwner && (
                                    <div style={{ color: '#555', cursor: 'grab', fontSize: '1.2rem', padding: '0 5px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                        <i className="fa-solid fa-grip-vertical"></i>
                                    </div>
                                )}

                                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#e50914', width: '50px', textAlign: 'center', opacity: 0.8 }}>
                                    #{item.position || (index + 1)}
                                </div>
                                
                                <img 
                                    src={item.media_image || 'https://via.placeholder.com/60x90?text=No+Image'} 
                                    alt={item.media_name || 'Media'} 
                                    style={{ width: '60px', height: '90px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.6)', pointerEvents: 'none' }}
                                />

                                <div style={{ flex: 1, cursor: 'pointer' }} onPointerDown={e => {if(isOwner) e.stopPropagation();}} onClick={() => navigate('/detalle/' + (item.media_type === 'tv' ? 'tv' : item.media_type === 'game' ? 'game' : 'movie') + '/' + item.media_id)}>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'white', fontWeight: '800' }}>{item.media_name || 'Desconocido'}</h3>
                                    <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '15px', fontSize: '11px', textTransform: 'uppercase', color: '#ccc', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                        {item.media_type === 'movie' ? 'Película' : item.media_type === 'tv' ? 'Serie' : item.media_type === 'game' ? 'Videojuego' : 'Medio'}
                                    </span>
                                </div>

                                {isOwner && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        {/* Botón Borrar */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEliminarItem(item.id); }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#e50914'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#e50914'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#444'; }}
                                            title="Quitar del ranking"
                                        >
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    </div>
                                )}
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#1a1a1a', borderRadius: '20px', border: '1px dashed #444' }}>
                        <i className="fa-solid fa-folder-open fa-4x" style={{ color: '#444', marginBottom: '20px' }}></i>
                        <h3 style={{ fontSize: '1.8rem', margin: '0 0 10px 0', color: '#ccc' }}>Ranking Vacío</h3>
                        <p style={{ color: '#888', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto' }}>Utiliza el buscador de arriba para empezar a rellenar este ranking.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default RankingDetail;
