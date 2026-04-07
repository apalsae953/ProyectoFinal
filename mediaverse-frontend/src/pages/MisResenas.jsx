import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { alerts } from '../utils/swal';

function MisResenas() {
    const [resenas, setResenas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTipo, setFilterTipo] = useState('todos');
    const [sortBy, setSortBy] = useState('recientes');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingId, setEditingId] = useState(null);
    const [editRating, setEditRating] = useState(0);
    const [editComment, setEditComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const ITEMS_PER_PAGE = 8;
    const navigate = useNavigate();

    useEffect(() => {
        if (!localStorage.getItem('auth_token')) {
            navigate('/auth');
            return;
        }
        fetchResenas();
    }, [navigate]);

    const fetchResenas = async () => {
        try {
            const res = await api.get('/user/reviews');
            if (res.data.success) {
                setResenas(res.data.data);
            }
        } catch (err) {
            console.error('Error cargando reseñas:', err);
        }
        setCargando(false);
    };

    // Estadísticas globales
    const stats = {
        total: resenas.length,
        mediaScore: resenas.length > 0 ? (resenas.reduce((acc, r) => acc + Number(r.puntuacion), 0) / resenas.length).toFixed(1) : '0.0',
        totalLikes: resenas.reduce((acc, r) => acc + (r.likes_count || 0), 0),
        conComentario: resenas.filter(r => r.comentario && r.comentario.trim() !== '').length
    };

    // Filtrado
    const filteredItems = resenas.filter(item => {
        const matchesSearch = item.medio?.titulo?.toLowerCase().includes(search.toLowerCase()) ||
            (item.comentario && item.comentario.toLowerCase().includes(search.toLowerCase()));
        const matchesTipo = filterTipo === 'todos' || item.medio?.tipo === filterTipo;
        return matchesSearch && matchesTipo;
    });

    // Ordenamiento
    const sortedItems = [...filteredItems].sort((a, b) => {
        switch (sortBy) {
            case 'recientes':
                return new Date(b.updated_at) - new Date(a.updated_at);
            case 'antiguos':
                return new Date(a.updated_at) - new Date(b.updated_at);
            case 'mejor_nota':
                return Number(b.puntuacion) - Number(a.puntuacion);
            case 'peor_nota':
                return Number(a.puntuacion) - Number(b.puntuacion);
            case 'mas_likes':
                return (b.likes_count || 0) - (a.likes_count || 0);
            default:
                return 0;
        }
    });

    // Paginación
    const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [sortedItems.length, totalPages, currentPage]);

    const paginatedItems = sortedItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Helpers
    const getTipoUrl = (tipo) => {
        if (tipo === 'videojuego') return 'game';
        if (tipo === 'pelicula') return 'movie';
        return 'tv';
    };

    const getTipoLabel = (tipo) => {
        if (tipo === 'videojuego') return 'Videojuego';
        if (tipo === 'pelicula') return 'Película';
        return 'Serie';
    };

    const getTipoIcon = (tipo) => {
        if (tipo === 'videojuego') return 'fa-gamepad';
        if (tipo === 'pelicula') return 'fa-film';
        return 'fa-tv';
    };

    const getTipoColor = (tipo) => {
        if (tipo === 'videojuego') return '#4caf50';
        if (tipo === 'pelicula') return '#e50914';
        return '#2196f3';
    };

    const getRatingColor = (score) => {
        if (score >= 8) return '#4caf50';
        if (score >= 6) return '#ff9800';
        if (score >= 4) return '#ff5722';
        return '#e50914';
    };

    const getPosterUrl = (medio) => {
        if (!medio?.poster_path) return 'https://via.placeholder.com/500x750?text=No+Image';
        if (medio.poster_path.startsWith('http')) return medio.poster_path;
        return 'https://image.tmdb.org/t/p/w500' + medio.poster_path;
    };

    // Editar reseña inline
    const startEditing = (resena) => {
        setEditingId(resena.id);
        setEditRating(Number(resena.puntuacion));
        setEditComment(resena.comentario || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditRating(0);
        setEditComment('');
    };

    const saveEdit = async (resena) => {
        if (editRating === 0) {
            alerts.error('Debes elegir una puntuación');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/reviews', {
                api_id: resena.medio.api_id,
                tipo: resena.medio.tipo,
                titulo: resena.medio.titulo,
                puntuacion: editRating,
                comentario: editComment
            });
            alerts.success('Reseña actualizada');
            setEditingId(null);
            fetchResenas();
        } catch (err) {
            console.error(err);
            alerts.error('Error al actualizar');
        }
        setSubmitting(false);
    };

    // Eliminar reseña
    const handleDelete = async (id) => {
        const confirm = await alerts.confirm('¿Eliminar esta reseña?', 'No podrás recuperarla.', 'Sí, eliminar');
        if (confirm.isConfirmed) {
            try {
                await api.delete('/reviews/' + id);
                alerts.success('Reseña eliminada');
                fetchResenas();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div style={{ padding: '40px 20px', color: 'white', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>

            {/* CABECERA */}
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: '3.5rem', margin: '0 0 10px 0', fontWeight: '900', letterSpacing: '-2px', background: 'linear-gradient(135deg, #e50914, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                    <i className="fa-solid fa-pen-to-square" style={{ WebkitTextFillColor: '#e50914', marginRight: '15px' }}></i>
                    Mis Reseñas
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{ color: '#888', fontSize: '1.2rem', margin: 0 }}
                >
                    Todas las opiniones y puntuaciones que has dejado en la plataforma.
                </motion.p>
            </div>

            {/* ESTADÍSTICAS */}
            {!cargando && resenas.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '50px' }}
                >
                    {[
                        { icon: 'fa-pen-fancy', label: 'Total Reseñas', value: stats.total, color: '#e50914' },
                        { icon: 'fa-star', label: 'Nota Media', value: stats.mediaScore, color: '#ff9800' },
                        { icon: 'fa-thumbs-up', label: 'Likes Recibidos', value: stats.totalLikes, color: '#4caf50' },
                        { icon: 'fa-comment', label: 'Con Comentario', value: stats.conComentario, color: '#2196f3' }
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            style={{
                                backgroundColor: '#1a1a1a',
                                borderRadius: '20px',
                                padding: '30px',
                                textAlign: 'center',
                                border: '1px solid #2a2a2a',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', color: stat.color, opacity: 0.06 }}>
                                <i className={'fa-solid ' + stat.icon}></i>
                            </div>
                            <i className={'fa-solid ' + stat.icon} style={{ fontSize: '1.5rem', color: stat.color, marginBottom: '12px', display: 'block' }}></i>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '5px' }}>{stat.value}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* BARRA DE BÚSQUEDA Y FILTROS */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginBottom: '40px', alignItems: 'center' }}
            >
                {/* Buscador */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#e50914' }}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por título o comentario..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        style={{ width: '100%', padding: '15px 20px 15px 50px', borderRadius: '30px', border: '2px solid #333', backgroundColor: '#111', color: 'white', fontSize: '16px', outline: 'none', transition: 'border-color 0.3s' }}
                        onFocus={(e) => e.target.style.borderColor = '#e50914'}
                        onBlur={(e) => e.target.style.borderColor = '#333'}
                    />
                </div>

                {/* Filtro por tipo */}
                <select
                    value={filterTipo}
                    onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
                    style={{ padding: '15px 25px', borderRadius: '30px', border: '2px solid #333', backgroundColor: '#111', color: 'white', fontSize: '16px', outline: 'none', cursor: 'pointer', appearance: 'none', minWidth: '180px' }}
                >
                    <option value="todos">Todos los medios</option>
                    <option value="pelicula">Películas</option>
                    <option value="serie">Series</option>
                    <option value="videojuego">Videojuegos</option>
                </select>

                {/* Ordenar */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ padding: '15px 25px', borderRadius: '30px', border: '2px solid #333', backgroundColor: '#111', color: 'white', fontSize: '16px', outline: 'none', cursor: 'pointer', appearance: 'none', minWidth: '180px' }}
                >
                    <option value="recientes">Más recientes</option>
                    <option value="antiguos">Más antiguos</option>
                    <option value="mejor_nota">Mejor nota</option>
                    <option value="peor_nota">Peor nota</option>
                    <option value="mas_likes">Más likes</option>
                </select>
            </motion.div>

            {/* CONTENIDO */}
            {cargando ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '80px' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ fontSize: '50px', color: '#e50914' }}>
                        <i className="fa-solid fa-spinner"></i>
                    </motion.div>
                </div>
            ) : sortedItems.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: '#111', borderRadius: '25px', border: '1px solid #2a2a2a' }}
                >
                    <motion.i
                        className="fa-solid fa-pen-to-square"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        style={{ fontSize: '5rem', color: '#333', marginBottom: '30px', display: 'block' }}
                    ></motion.i>
                    <h2 style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: '900' }}>
                        {search || filterTipo !== 'todos' ? 'Sin resultados' : 'Aún no has escrito reseñas'}
                    </h2>
                    <p style={{ color: '#888', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
                        {search || filterTipo !== 'todos'
                            ? 'No encontramos reseñas que coincidan con tus filtros actuales.'
                            : 'Explora películas, series y videojuegos y comparte tu opinión con la comunidad.'}
                    </p>
                    {!search && filterTipo === 'todos' && (
                        <button
                            onClick={() => navigate('/dashboard')}
                            style={{ padding: '15px 40px', borderRadius: '30px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                        >
                            <i className="fa-solid fa-compass"></i> Explorar Contenido
                        </button>
                    )}
                </motion.div>
            ) : (
                <>
                    {/* LISTA DE RESEÑAS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <AnimatePresence>
                            {paginatedItems.map((resena, index) => (
                                <motion.div
                                    key={resena.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: index * 0.06 }}
                                    layout
                                    style={{
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: '20px',
                                        overflow: 'hidden',
                                        border: editingId === resena.id ? '1px solid #e50914' : '1px solid #2a2a2a',
                                        display: 'flex',
                                        transition: 'border-color 0.3s, box-shadow 0.3s',
                                        position: 'relative'
                                    }}
                                    whileHover={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderColor: '#444' }}
                                >
                                    {/* PÓSTER */}
                                    <div
                                        onClick={() => navigate('/detalle/' + getTipoUrl(resena.medio?.tipo) + '/' + resena.medio?.api_id)}
                                        style={{ width: '160px', minHeight: '240px', flexShrink: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                                    >
                                        <img
                                            src={getPosterUrl(resena.medio)}
                                            alt={resena.medio?.titulo}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                        />
                                        {/* Badge de tipo */}
                                        <div style={{
                                            position: 'absolute', top: '10px', left: '10px',
                                            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                                            padding: '5px 12px', borderRadius: '20px', fontSize: '11px',
                                            fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.15)',
                                            textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px'
                                        }}>
                                            <i className={'fa-solid ' + getTipoIcon(resena.medio?.tipo)} style={{ color: getTipoColor(resena.medio?.tipo) }}></i>
                                            {getTipoLabel(resena.medio?.tipo)}
                                        </div>
                                        {/* Nota visual grande en el póster */}
                                        <div style={{
                                            position: 'absolute', bottom: '10px', right: '10px',
                                            width: '50px', height: '50px', borderRadius: '15px',
                                            backgroundColor: getRatingColor(Number(resena.puntuacion)),
                                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                                            fontWeight: '900', fontSize: '1.2rem',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                                            border: '2px solid rgba(255,255,255,0.2)'
                                        }}>
                                            {Number(resena.puntuacion).toFixed(1)}
                                        </div>
                                    </div>

                                    {/* CONTENIDO */}
                                    <div style={{ flex: 1, padding: '25px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>

                                        {editingId === resena.id ? (
                                            /* MODO EDICIÓN */
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', fontWeight: '900' }}>
                                                    Editando: {resena.medio?.titulo}
                                                </h3>

                                                {/* Estrellas edición */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px', marginBottom: '15px', backgroundColor: '#111', padding: '15px 20px', borderRadius: '15px', border: '1px solid #333' }}>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                                            <i
                                                                key={star}
                                                                className={star <= Math.floor(editRating) ? 'fa-solid fa-star' : 'fa-regular fa-star'}
                                                                style={{ color: star <= Math.floor(editRating) ? '#e50914' : '#444', cursor: 'pointer', fontSize: '1.1rem', transition: 'color 0.15s' }}
                                                                onClick={() => setEditRating(star)}
                                                            ></i>
                                                        ))}
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min="0" max="10" step="0.1"
                                                        value={editRating}
                                                        onChange={e => {
                                                            let val = parseFloat(e.target.value);
                                                            if (val > 10) val = 10;
                                                            if (val < 0) val = 0;
                                                            setEditRating(val);
                                                        }}
                                                        style={{ width: '70px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px', padding: '8px', color: '#e50914', fontWeight: '900', textAlign: 'center', outline: 'none', fontSize: '1.1rem' }}
                                                    />
                                                </div>

                                                <textarea
                                                    value={editComment}
                                                    onChange={e => setEditComment(e.target.value)}
                                                    placeholder="Tu comentario (opcional)..."
                                                    style={{ width: '100%', backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', padding: '15px', color: 'white', fontSize: '0.95rem', outline: 'none', resize: 'vertical', height: '80px', lineHeight: '1.5', boxSizing: 'border-box' }}
                                                />

                                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                                    <button
                                                        onClick={() => saveEdit(resena)}
                                                        disabled={submitting}
                                                        style={{ padding: '10px 25px', borderRadius: '10px', border: 'none', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                    >
                                                        {submitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Guardar
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        style={{ padding: '10px 25px', borderRadius: '10px', border: '1px solid #444', backgroundColor: 'transparent', color: '#aaa', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* MODO VISUALIZACIÓN */
                                            <>
                                                <div>
                                                    {/* Título y fecha */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                                        <h3
                                                            onClick={() => navigate('/detalle/' + getTipoUrl(resena.medio?.tipo) + '/' + resena.medio?.api_id)}
                                                            style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', cursor: 'pointer', transition: 'color 0.2s', lineHeight: '1.2' }}
                                                            onMouseEnter={(e) => e.target.style.color = '#e50914'}
                                                            onMouseLeave={(e) => e.target.style.color = 'white'}
                                                        >
                                                            {resena.medio?.titulo}
                                                        </h3>
                                                        <span style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                            <i className="fa-regular fa-calendar" style={{ marginRight: '5px' }}></i>
                                                            {new Date(resena.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>

                                                    {/* Puntuación en estrellas */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                                        <div style={{ display: 'flex', gap: '3px' }}>
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                                                <i
                                                                    key={star}
                                                                    className={star <= Math.floor(Number(resena.puntuacion)) ? 'fa-solid fa-star' : 'fa-regular fa-star'}
                                                                    style={{ color: star <= Math.floor(Number(resena.puntuacion)) ? getRatingColor(Number(resena.puntuacion)) : '#333', fontSize: '0.85rem' }}
                                                                ></i>
                                                            ))}
                                                        </div>
                                                        <span style={{ fontWeight: '900', color: getRatingColor(Number(resena.puntuacion)), fontSize: '1.1rem' }}>
                                                            {Number(resena.puntuacion).toFixed(1)}
                                                        </span>
                                                    </div>

                                                    {/* Comentario */}
                                                    {resena.comentario ? (
                                                        <p style={{ color: '#ccc', lineHeight: '1.7', margin: '0 0 15px 0', fontSize: '0.95rem', borderLeft: '3px solid #333', paddingLeft: '15px' }}>
                                                            {resena.comentario}
                                                        </p>
                                                    ) : (
                                                        <p style={{ color: '#555', fontStyle: 'italic', margin: '0 0 15px 0', fontSize: '0.9rem' }}>
                                                            <i className="fa-regular fa-comment" style={{ marginRight: '8px' }}></i>
                                                            Solo puntuación, sin comentario.
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Footer: Likes/Dislikes + Acciones */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2a2a2a', paddingTop: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                                    {/* Likes y Dislikes */}
                                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (resena.likes_count || 0) > 0 ? '#4caf50' : '#555', fontSize: '0.95rem', fontWeight: 'bold' }}>
                                                            <i className="fa-solid fa-thumbs-up"></i> {resena.likes_count || 0}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (resena.dislikes_count || 0) > 0 ? '#e50914' : '#555', fontSize: '0.95rem', fontWeight: 'bold' }}>
                                                            <i className="fa-solid fa-thumbs-down"></i> {resena.dislikes_count || 0}
                                                        </span>
                                                    </div>

                                                    {/* Botones de acción */}
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button
                                                            onClick={() => navigate('/detalle/' + getTipoUrl(resena.medio?.tipo) + '/' + resena.medio?.api_id)}
                                                            style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid #333', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2196f3'; e.currentTarget.style.color = '#2196f3'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa'; }}
                                                        >
                                                            <i className="fa-solid fa-eye"></i> Ver
                                                        </button>
                                                        <button
                                                            onClick={() => startEditing(resena)}
                                                            style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid #333', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff9800'; e.currentTarget.style.color = '#ff9800'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa'; }}
                                                        >
                                                            <i className="fa-solid fa-pen"></i> Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(resena.id)}
                                                            style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid #333', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e50914'; e.currentTarget.style.color = '#e50914'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa'; }}
                                                        >
                                                            <i className="fa-solid fa-trash"></i> Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '60px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '12px 25px', borderRadius: '30px', border: 'none',
                                    backgroundColor: currentPage === 1 ? '#333' : '#e50914',
                                    color: 'white', fontWeight: 'bold',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'background-color 0.3s'
                                }}
                            >
                                <i className="fa-solid fa-chevron-left"></i> Anterior
                            </button>

                            {/* Números de página */}
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .reduce((acc, p, i, arr) => {
                                        if (i > 0 && p - arr[i - 1] > 1) {
                                            acc.push('...');
                                        }
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, i) => (
                                        p === '...' ? (
                                            <span key={'dots-' + i} style={{ padding: '8px 5px', color: '#666', fontSize: '16px' }}>...</span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                style={{
                                                    width: '42px', height: '42px', borderRadius: '50%', border: 'none',
                                                    backgroundColor: currentPage === p ? '#e50914' : '#222',
                                                    color: 'white', fontWeight: currentPage === p ? '900' : 'normal',
                                                    cursor: 'pointer', fontSize: '15px',
                                                    transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))
                                }
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '12px 25px', borderRadius: '30px', border: 'none',
                                    backgroundColor: currentPage === totalPages ? '#333' : '#e50914',
                                    color: 'white', fontWeight: 'bold',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'background-color 0.3s'
                                }}
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

export default MisResenas;
