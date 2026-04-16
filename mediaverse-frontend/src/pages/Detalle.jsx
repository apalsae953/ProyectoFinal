import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { alerts } from '../utils/swal';

const av = (u) => u?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u?.name || 'U') + '&background=e50914&color=fff&size=80';

function Detalle() {
  const { tipo, id } = useParams();
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [esVerMasTarde, setEsVerMasTarde] = useState(false);
  const [esVisto, setEsVisto] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [misRankings, setMisRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // Estados para Reseñas
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myRating, setMyRating] = useState(null);

  useEffect(() => {
    if(localStorage.getItem('auth_token') && datos) {
        api.get('/interactions/me').then(res => {
            const data = res.data.data;
            const dbTipo = tipo === 'game' ? 'videojuego' : (tipo === 'movie' ? 'pelicula' : 'serie');
            
            if(data.ver_mas_tarde) {
                setEsVerMasTarde(data.ver_mas_tarde.some(
                    fav => fav.medio?.tipo === dbTipo && String(fav.medio?.api_id) === String(datos.id)
                ));
            }
            if(data.visto) {
                setEsVisto(data.visto.some(
                    v => v.medio?.tipo === dbTipo && String(v.medio?.api_id) === String(datos.id)
                ));
            }
        }).catch(err => console.error("Error al cargar interacciones:", err));

        // Cargar mi nota (para mostrar en el hero sin abrir modal)
        const dbTipo = tipo === 'game' ? 'videojuego' : (tipo === 'movie' ? 'pelicula' : 'serie');
        api.get('/reviews/' + dbTipo + '/' + datos.id + '/auth').then(res => {
            const userInfo = JSON.parse(localStorage.getItem('user_info'));
            if (userInfo && res.data.data) {
                const mine = res.data.data.find(r => r.user_id === userInfo.id);
                if (mine) {
                    setMyRating(mine.puntuacion);
                    // De paso pre-rellenamos los estados de reseña por si abre el modal
                    setMyReview(mine);
                    setUserRating(mine.puntuacion);
                    setUserComment(mine.comentario || '');
                }
            }
        }).catch(e => console.error("Error cargando mi nota:", e));
    }
  }, [datos, tipo]);

  const toggleVerMasTarde = () => {
    if (!localStorage.getItem('auth_token')) {
        alerts.loginRequired(navigate, 'Debes iniciar sesión');
        return;
    }

    // Actualización optimista de UI
    setEsVerMasTarde(prev => !prev);

    const dbTipo = tipo === 'game' ? 'videojuego' : (tipo === 'movie' ? 'pelicula' : 'serie');

    api.post('/interactions/toggle', {
        api_id: datos.id,
        tipo_medio: dbTipo,
        titulo: datos.title || datos.name,
        poster_path: datos.poster_path || datos.background_image || '',
        tipo_interaccion: 'ver_mas_tarde'
    }).then(res => {
        // Aseguramos la exclusividad si el backend tuvo éxito (aunque ya lo hicimos optimista)
        if(res.data.is_attached) setEsVisto(false);
    }).catch(err => {
        console.error("Error toggling ver más tarde:", err);
        // Si hay error, revertimos el botón
        setEsVerMasTarde(prev => !prev);
    });
  };

  const toggleVisto = () => {
    if (!localStorage.getItem('auth_token')) {
        alerts.loginRequired(navigate, 'Debes iniciar sesión');
        return;
    }

    // Actualización optimista
    setEsVisto(prev => !prev);
    if(!esVisto) setEsVerMasTarde(false); // Si marcamos como visto, quitamos de ver más tarde

    const dbTipo = tipo === 'game' ? 'videojuego' : (tipo === 'movie' ? 'pelicula' : 'serie');

    api.post('/interactions/toggle', {
        api_id: datos.id,
        tipo_medio: dbTipo,
        titulo: datos.title || datos.name,
        poster_path: datos.poster_path || datos.background_image || '',
        tipo_interaccion: 'visto'
    }).then(res => {
        if(res.data.is_attached) setEsVerMasTarde(false);
    }).catch(err => {
        console.error("Error toggling visto:", err);
        setEsVisto(prev => !prev);
    });
  };

  const abrirModalRanking = async () => {
    if (!localStorage.getItem('auth_token')) {
        alerts.loginRequired(navigate, 'Debes iniciar sesión');
        return;
    }
    setShowRankingModal(true);
    setLoadingRankings(true);
    try {
        const res = await api.get('/user/rankings');
        // Filtrar compatibles
        const compatibles = res.data.filter(r => r.tipo === 'mixed' || (r.tipo === 'movies' && tipo === 'movie') || (r.tipo === 'series' && tipo === 'tv') || (r.tipo === 'games' && tipo === 'game'));
        setMisRankings(compatibles);
    } catch (err) {
        console.error(err);
    }
    setLoadingRankings(false);
  };

  const abrirModalReviews = async () => {
    // Reset temporal para que fetchReviews pueda cargar los datos de la DB sin conflictos
    setUserRating(0);
    setUserComment('');
    setShowReviewsModal(true);
    fetchReviews();
  };

  const fetchReviews = async (onlyUpdateList = false) => {
    setLoadingReviews(true);
    try {
        const token = localStorage.getItem('auth_token');
        const dbTipo = tipo === 'game' ? 'videojuego' : (tipo === 'movie' ? 'pelicula' : 'serie');
        const endpoint = token ? '/reviews/' + dbTipo + '/' + datos.id + '/auth' : '/reviews/' + dbTipo + '/' + datos.id;
        
        const res = await api.get(endpoint);
        const data = res.data.data;
        setReviews(data);

        // Buscar mi reseña (sólo si no estamos recargando la lista para no borrar lo que escribe el usuario)
        const userInfo = JSON.parse(localStorage.getItem('user_info'));
        if (userInfo && !onlyUpdateList) {
            const mine = data.find(r => r.user_id === userInfo.id);
            if (mine) {
                setMyReview(mine);
                // SÓLO sobreescribimos si el usuario aún no ha escrito nada nuevo en esta sesión del modal
                setUserRating(prev => (prev === 0 ? mine.puntuacion : prev));
                setUserComment(prev => (prev === '' ? (mine.comentario || '') : prev));
            } else {
                setMyReview(null);
            }
        }
    } catch (err) {
        console.error("Error al cargar reseñas:", err);
    }
    setLoadingReviews(false);
  };

  const handleSaveReview = async () => {
    if (!localStorage.getItem('auth_token')) {
        alerts.loginRequired(navigate, 'Login requerido');
        return;
    }
    if (userRating === 0) {
        alerts.error('Debes elegir una puntuación');
        return;
    }

    setSubmittingReview(true);
    try {
        const dbTipo = tipo === 'game' ? 'videojuego' : (tipo === 'movie' ? 'pelicula' : 'serie');
        await api.post('/reviews', {
            api_id: datos.id,
            tipo: dbTipo,
            titulo: datos.title || datos.name,
            poster_path: datos.poster_path || datos.background_image || '',
            puntuacion: userRating,
            comentario: userComment
        });
        localStorage.getItem('auth_token'); // side effect
        setEsVerMasTarde(false);
        setEsVisto(true);
        setMyRating(userRating); // Actualizar nota en el Hero
        alerts.success('¡Puntuado!');
        fetchReviews();
        fetchDatos(false); // Actualizar nota media sin F5
    } catch (err) {
        console.error(err);
    }
    setSubmittingReview(false);
  };

  const handleDeleteReview = async () => {
    if (!myReview) return;
    const confirm = await alerts.confirm('¿Eliminar tu reseña?', 'No podrás recuperar el comentario.', 'Sí, eliminar');

    if (confirm.isConfirmed) {
        try {
            await api.delete('/reviews/' + myReview.id);
            setMyReview(null);
            setMyRating(null); // Borrar nota del Hero
            setUserRating(0);
            setUserComment('');
            fetchReviews();
            fetchDatos(false); // Actualizar nota media sin F5
        } catch (err) { console.error(err); }
    }
  };

  const handleVote = async (reviewId, type) => {
    if (!localStorage.getItem('auth_token')) return;
    try {
        await api.post('/reviews/' + reviewId + '/vote', { type });
        fetchReviews();
    } catch (err) {
        if (err.response?.status === 403) {
            alerts.info('No puedes votar tu propia reseña');
        }
    }
  };

  const fetchDatos = async (showLoading = false) => {
    if (showLoading) setCargando(true);
    setError(false);
    let endpoint = '';
    if (tipo === 'movie') endpoint = '/movies/' + id;
    else if (tipo === 'tv') endpoint = '/tv/' + id;
    else if (tipo === 'game') endpoint = '/games/' + id;

    try {
        const respuesta = await api.get(endpoint);
        setDatos(respuesta.data.data);
    } catch (err) {
        if (showLoading) {
            console.error("Error al cargar detalle:", err);
            setError(true);
        }
    } finally {
        if (showLoading) setCargando(false);
    }
  };

  useEffect(() => {
    fetchDatos(true);
  }, [tipo, id]);

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <i className="fa-solid fa-spinner fa-3x"></i>
        </motion.div>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'white' }}>
        <h2><i className="fa-solid fa-circle-exclamation"></i> No hemos podido encontrar lo que buscabas.</h2>
        <button onClick={() => navigate(-1)} className="btn-volver" style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '5px', backgroundColor: '#e50914', color: 'white', border: 'none', cursor: 'pointer' }}>Volver</button>
      </div>
    );
  }

  const backdrop = tipo === 'game'
    ? datos.backdrop_path
    : (datos.backdrop_path ? 'https://image.tmdb.org/t/p/original' + datos.backdrop_path : null);

  const poster = tipo === 'game'
    ? datos.poster_path
    : (datos.poster_path ? 'https://image.tmdb.org/t/p/w500' + datos.poster_path : 'https://via.placeholder.com/500x750?text=No+Image');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: 'white', minHeight: '100vh' }}>
      
      {/* SECCIÓN HERO (Cinematográfica y con espacio arriba relleno) */}
      <div style={{ position: 'relative', width: '100%', minHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* FONDO (Backdrop) */}
        {backdrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(' + backdrop + ')', backgroundSize: 'cover', backgroundPosition: 'center 20%', filter: 'brightness(0.3)', zIndex: 0 }}
          />
        )}
        
        {/* DEGRADADO INTEGRADO */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to top, #121212 5%, transparent 70%, rgba(0,0,0,0.5) 100%)', zIndex: 1 }} />

        {/* CONTENEDOR HERO - LAYOUT POR FILAS */}
        <div style={{ position: 'relative', zIndex: 10, width: '92%', maxWidth: '1400px', margin: '0 auto', padding: '25px 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* FILA 1: CABECERA (BOTÓN VOLVER + METADATOS) -> ESTO RELLENA EL CUADRADO ROJO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)} 
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 22px', borderRadius: '40px', cursor: 'pointer', backdropFilter: 'blur(10px)', fontSize: '13px', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-arrow-left"></i> VOLVER
            </motion.button>

            {/* Metadatos rápidos superiores para rellenar el espacio */}
            <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
              <span style={{ color: '#e50914', fontWeight: '900', fontSize: '15px', letterSpacing: '3px', textTransform: 'uppercase' }}>
                {tipo === 'game' ? (datos.developer || 'DEVELOPER') : (datos.director || 'DIRECTOR')}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(datos.genres || []).slice(0, 3).map(g => (
                  <span key={g.id} style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', padding: '4px 12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px' }}>{g.name}</span>
                ))}
              </div>
            </div>
          </div>

          {/* FILA 2: CONTENIDO PRINCIPAL (PÓSTER + TÍTULO E INFO) */}
          <div className="detalle-main-row" style={{ display: 'flex', gap: '60px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
            
            {/* Póster */}
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <img className="detalle-poster" src={poster} alt={datos.title || datos.name} style={{ width: '300px', borderRadius: '15px', boxShadow: '0 20px 60px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </motion.div>

            {/* Información y Título */}
            <div className="detalle-info-col" style={{ flex: '1 1 500px' }}>
              <motion.h1 className="detalle-title" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} style={{ fontSize: '4.5rem', margin: 0, fontWeight: '900', lineHeight: '1', letterSpacing: '-3px', textShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
                {datos.title || datos.name}
              </motion.h1>

              {/* Fila de info (Año, Puntuaciones, Duración) */}
              <motion.div className="detalle-info-row" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', gap: '30px', marginTop: '35px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ backgroundColor: '#e50914', color: 'white', padding: '6px 16px', borderRadius: '6px', fontWeight: '900', fontSize: '20px' }}>{datos.year}</div>
                
                {/* Puntuaciones */}
                <div className="detalle-scores-bar" style={{ display: 'flex', gap: '20px', padding: '10px 25px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="detalle-score-num" style={{ color: '#66cc33', fontWeight: '900', fontSize: '24px' }}>{datos.metacritic ? Number(datos.metacritic).toFixed(1) : (tipo !== 'game' && datos.vote_average ? Number(datos.vote_average).toFixed(1) : 'N/A')}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Crítica</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="detalle-score-num" style={{ color: '#4caf50', fontWeight: '900', fontSize: '24px' }}>{datos.puntuacion_usuarios ? datos.puntuacion_usuarios : '-'}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>MediaVerse</div>
                  </div>
                  {myRating !== null && (
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #333', paddingLeft: '20px' }}>
                      <div className="detalle-score-num" style={{ color: '#e50914', fontWeight: '900', fontSize: '24px' }}>{Number(myRating).toFixed(1)}</div>
                      <div style={{ fontSize: '10px', color: '#e50914', textTransform: 'uppercase', fontWeight: 'bold' }}>Tu Nota</div>
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '18px', color: '#aaa', fontWeight: 'bold' }}>
                  {tipo === 'movie' ? (datos.runtime + ' min') : (tipo === 'tv' ? (datos.number_of_seasons + ' Temporadas') : 'Videojuego')}
                </span>
              </motion.div>

              {/* Botones de acción dentro del Hero */}
              <motion.div className="detalle-action-btns" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: 'flex', gap: '15px', marginTop: '45px', flexWrap: 'wrap' }}>
                <motion.button
                  className="detalle-action-btn"
                  onClick={toggleVerMasTarde}
                  whileHover={{ scale: 1.05, boxShadow: esVerMasTarde ? '0 8px 30px rgba(229, 9, 20, 0.4)' : '0 8px 30px rgba(229, 9, 20, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ padding: '15px 35px', borderRadius: '12px', border: esVerMasTarde ? 'none' : '1px solid rgba(255,255,255,0.4)', backgroundColor: esVerMasTarde ? '#e50914' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '900', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(10px)', transition: 'background-color 0.3s' }}
                >
                  <i className={'fa-solid ' + (esVerMasTarde ? 'fa-circle-xmark' : 'fa-clock')}></i> {esVerMasTarde ? (tipo === 'game' ? 'QUITAR DE JUGAR MÁS TARDE' : 'QUITAR DE VER MÁS TARDE') : (tipo === 'game' ? 'JUGAR MÁS TARDE' : 'VER MÁS TARDE')}
                </motion.button>

                <motion.button
                  className="detalle-action-btn"
                  onClick={toggleVisto}
                  whileHover={{ scale: 1.05, boxShadow: esVisto ? '0 8px 30px rgba(100, 100, 100, 0.4)' : '0 8px 30px rgba(76, 175, 80, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ padding: '15px 35px', borderRadius: '12px', border: esVisto ? '1px solid rgba(255,255,255,0.4)' : 'none', backgroundColor: esVisto ? '#4caf50' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '900', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(10px)', transition: 'background-color 0.3s' }}
                >
                  <i className={'fa-solid ' + (esVisto ? 'fa-check' : (tipo === 'game' ? 'fa-gamepad' : 'fa-eye'))}></i> {esVisto ? (tipo === 'game' ? 'JUGADO' : 'VISTO') : (tipo === 'game' ? 'MARCAR COMO JUGADO' : 'MARCAR COMO VISTO')}
                </motion.button>

                <motion.button
                  className="detalle-action-btn"
                  onClick={abrirModalReviews}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ padding: '15px 30px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.4)', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <i className="fa-solid fa-star"></i> VER RESEÑAS
                </motion.button>
                <motion.button
                  className="detalle-action-btn"
                  onClick={abrirModalRanking}
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  title="Añadir a Ranking"
                  style={{ padding: '15px 25px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.4)', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <i className="fa-solid fa-list-ol"></i>
                </motion.button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL (SINOPSIS, TRAILER, REPARTO) */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}>
        
        {/* Sinopsis */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '25px', fontSize: '2rem' }}>Sinopsis</h2>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#ddd' }}>{datos.overview || 'No hay descripción disponible.'}</p>
        </section>

        {/* Trailer */}
        {datos.trailer_url && (
          <section style={{ marginBottom: '60px' }}>
            <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '25px', fontSize: '2rem' }}>Trailer Oficial</h2>
            <div style={{ maxWidth: '900px' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} src={datos.trailer_url} title="YouTube video player" frameBorder="0" allowFullScreen></iframe>
              </div>
            </div>
          </section>
        )}

        {/* DÓNDE VER / COMPRAR */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ borderLeft: '5px solid #2196f3', paddingLeft: '20px', marginBottom: '25px', fontSize: '2rem' }}>
            {tipo === 'game' ? 'Dónde Comprarlo' : 'Dónde Verlo'}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Hacemos lo mismo para juegos */}


            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {tipo === 'game' ? (
                (datos.tiendas && datos.tiendas.length > 0) ? (
                  datos.tiendas.map((t, idx) => (
                    <a key={idx} href={t.url} target="_blank" rel="noopener noreferrer" style={{ padding: '15px 30px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '15px', color: 'white', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s' }} onMouseEnter={e => {e.currentTarget.style.borderColor = '#2196f3'; e.currentTarget.style.backgroundColor = 'rgba(33,150,243,0.1)'}} onMouseLeave={e => {e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.backgroundColor = '#111'}}>
                      <i className="fa-solid fa-cart-shopping" style={{color:'#2196f3'}}></i> {t.nombre}
                    </a>
                  ))
                ) : !datos.link_primario && <p style={{color: '#888'}}>No se han encontrado tiendas digitales disponibles.</p>
              ) : (
                (datos.donde_ver && (datos.donde_ver.streaming.length > 0 || datos.donde_ver.alquiler.length > 0 || datos.donde_ver.compra.length > 0)) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%', backgroundColor: '#111', padding: '30px', borderRadius: '25px', border: '1px solid #222' }}>
                    {datos.donde_ver.streaming.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: '900' }}>Disponible en Suscripción</h4>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          {datos.donde_ver.streaming.map(p => (
                            <img key={p.provider_id} src={'https://image.tmdb.org/t/p/original' + p.logo_path} title={p.provider_name} alt={p.provider_name} style={{ width: '60px', height: '60px', borderRadius: '15px', border: '1px solid #333', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }} />
                          ))}
                        </div>
                      </div>
                    )}
                    {datos.donde_ver.alquiler.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', fontWeight: '900' }}>Alquiler / Compra</h4>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          {datos.donde_ver.alquiler.map(p => (
                            <img key={p.provider_id} src={'https://image.tmdb.org/t/p/original' + p.logo_path} title={p.provider_name} alt={p.provider_name} style={{ width: '45px', height: '45px', borderRadius: '12px', opacity: 0.6, grayscale: 1 }} />
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : !datos.link_primario && <p style={{color: '#888'}}>No hay información de streaming disponible para España en este momento.</p>
              )}
            </div>
          </div>
        </section>

        {/* Reparto Principal */}
        {datos.cast && datos.cast.length > 0 && (
          <section style={{ marginBottom: '60px' }}>
            <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '25px', fontSize: '2rem' }}>Reparto Principal</h2>
            <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap' }}>
              {datos.cast.map((actor) => (
                <div key={actor.id} onClick={() => navigate('/actor/' + actor.id)} style={{ width: '140px', textAlign: 'center', cursor: 'pointer' }}>
                  <motion.img whileHover={{ scale: 1.05 }} src={actor.profile_path ? 'https://image.tmdb.org/t/p/w185' + actor.profile_path : 'https://via.placeholder.com/185x278?text=Actor'} alt={actor.name} style={{ width: '100%', borderRadius: '15px', marginBottom: '10px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{actor.name}</p>
                  <p style={{ fontSize: '12px', color: '#888' }}>{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ficha Técnica */}
        <section style={{ backgroundColor: 'rgba(30, 30, 30, 0.5)', padding: '40px', borderRadius: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
          <div>
            <label style={{ color: '#e50914', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Géneros</label>
            <p style={{ marginTop: '5px' }}>{(datos.genres || []).map(g => g.name).join(', ')}</p>
          </div>
          {tipo === 'game' ? (
            <>
              <div>
                <label style={{ color: '#e50914', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Plataformas</label>
                <p style={{ marginTop: '5px' }}>{(datos.platforms || []).map(p => p.name).join(', ')}</p>
              </div>
              <div>
                <label style={{ color: '#e50914', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Desarrolladora</label>
                <p style={{ marginTop: '5px' }}>{datos.developer}</p>
              </div>
            </>
          ) : (
            <div>
              <label style={{ color: '#e50914', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Dirección</label>
              <p style={{ marginTop: '5px' }}>{datos.director || 'Desconocido'}</p>
            </div>
          )}
        </section>
      </div>

      {/* Modal Reseñas y Puntuación */}
      <AnimatePresence>
        {showReviewsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ backgroundColor: '#161616', width: '95%', maxWidth: '900px', height: '85vh', borderRadius: '25px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #333', boxShadow: '0 30px 100px rgba(0,0,0,0.5)' }}>
                
                {/* Header Modal */}
                <div style={{ padding: '25px 40px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>Reseñas de la comunidad</h2>
                        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '0.9rem' }}>Comparte tu opinión sobre {datos.title || datos.name}</p>
                    </div>
                    <i className="fa-solid fa-xmark" style={{ fontSize: '1.5rem', cursor: 'pointer', color: '#555' }} onClick={() => setShowReviewsModal(false)}></i>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr', overflow: 'hidden' }}>
                    
                    {/* IZQUIERDA: Formulario de puntuación */}
                    <div style={{ padding: '40px', backgroundColor: '#1c1c1c', borderRight: '1px solid #333', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '25px', color: '#e50914', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>{myReview ? 'Tu Valoración' : 'Añadir Valoración'}</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}>
                            <div style={{ fontSize: '3rem', fontWeight: '900', color: '#e50914', marginBottom: '10px' }}>{userRating || '0'}</div>
                            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                    <i 
                                        key={star} 
                                        className={star <= Math.floor(userRating) ? "fa-solid fa-star" : "fa-regular fa-star"} 
                                        style={{ color: star <= Math.floor(userRating) ? '#e50914' : '#444', cursor: 'pointer', fontSize: '1.2rem' }}
                                        onClick={() => setUserRating(star)}
                                    ></i>
                                ))}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                <span style={{fontSize:'0.9rem', color:'#888', fontWeight:'bold'}}>Ajustar nota:</span>
                                <input 
                                    type="number" 
                                    min="0" max="10" step="0.1" 
                                    value={userRating} 
                                    onChange={e => {
                                        let val = parseFloat(e.target.value);
                                        if (val > 10) val = 10;
                                        if (val < 0) val = 0;
                                        setUserRating(val);
                                    }}
                                    style={{ flex: 1, backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px', padding: '8px', color: 'white', fontWeight: 'bold', textAlign: 'center', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <label style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '20px', display: 'block' }}>Tu Reseña (Opcional)</label>
                        <textarea 
                            value={userComment} 
                            onChange={e => setUserComment(e.target.value)}
                            placeholder="¿Qué te ha parecido? (Opcional si solo quieres puntuar)"
                            style={{ width: '100%', marginTop: '10px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '15px', padding: '15px', color: 'white', fontSize: '1rem', outline: 'none', resize: 'none', height: '150px' }}
                        />

                        <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button 
                                onClick={handleSaveReview}
                                disabled={submittingReview}
                                style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                            >
                                {submittingReview ? <i className="fa-solid fa-spinner fa-spin"></i> : (myReview ? 'ACTUALIZAR RESEÑA' : 'GUARDAR Y MARCAR VISTO')}
                            </button>
                            {myReview && (
                                <button onClick={handleDeleteReview} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #444', backgroundColor: 'transparent', color: '#e50914', fontWeight: 'bold', cursor: 'pointer' }}>ELIMINAR MI RESEÑA</button>
                            )}
                        </div>
                    </div>

                    {/* DERECHA: Lista de reseñas */}
                    <div style={{ padding: '0 40px', overflowY: 'auto' }}>
                        {loadingReviews ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><i className="fa-solid fa-spinner fa-spin fa-3x" style={{color:'#e50914'}}></i></div>
                        ) : reviews.filter(r => r.comentario && r.comentario.trim() !== '').length > 0 ? (
                            <div style={{ padding: '30px 0' }}>
                                {reviews.filter(r => r.comentario && r.comentario.trim() !== '').map((rev, i) => (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={rev.id} style={{ backgroundColor: '#1c1c1c', padding: '25px', borderRadius: '20px', marginBottom: '20px', border: rev.user_id === myReview?.user_id ? '1px solid #e50914' : '1px solid #2a2a2a' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <img src={av(rev.user)} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #333' }} />
                                                <div>
                                                    <div style={{fontWeight:'bold'}}>{rev.user?.name} {rev.user_id === myReview?.user_id && <span style={{color:'#e50914', fontSize:'0.7rem', marginLeft:'5px'}}>(TÚ)</span>}</div>
                                                    <div style={{fontSize:'0.8rem', color:'#666'}}>{new Date(rev.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <div style={{ padding: '5px 15px', backgroundColor: '#333', borderRadius: '10px', color: '#e50914', fontWeight: '900', fontSize: '1.2rem' }}>{Number(rev.puntuacion).toFixed(1)}</div>
                                        </div>
                                        {rev.comentario && <p style={{ color: '#ccc', lineHeight: '1.6', margin: '0 0 20px 0' }}>{rev.comentario}</p>}
                                        
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', borderTop: '1px solid #2a2a2a', paddingTop: '15px' }}>
                                            <button onClick={() => handleVote(rev.id, 'like')} style={{ background: 'transparent', border: 'none', color: rev.user_vote_type === 'like' ? '#4caf50' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', fontWeight: 'bold' }}>
                                                <i className="fa-solid fa-thumbs-up"></i> {rev.likes_count}
                                            </button>
                                            <button onClick={() => handleVote(rev.id, 'dislike')} style={{ background: 'transparent', border: 'none', color: rev.user_vote_type === 'dislike' ? '#e50914' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', fontWeight: 'bold' }}>
                                                <i className="fa-solid fa-thumbs-down"></i> {rev.dislikes_count}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '100px 40px' }}>
                                <i className="fa-solid fa-comment-slash fa-4x" style={{ color: '#2a2a2a', marginBottom: '20px' }}></i>
                                <h3 style={{ color: '#555' }}>Nadie ha escrito un comentario todavía.</h3>
                                <p style={{ color: '#444' }}>¡Sé el primero en compartir tu opinión!</p>
                            </div>
                        )}
                    </div>
                </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Añadir a Ranking */}
      <AnimatePresence>
        {showRankingModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '450px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.6rem', fontWeight: '900' }}>
                    <span style={{display:'flex', alignItems:'center', gap:'10px'}}><i className="fa-solid fa-ranking-star" style={{color:'#e50914'}}></i> Añadir a Ranking</span>
                    <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', color: '#888', transition:'color 0.2s' }} onMouseEnter={e=>e.target.style.color='white'} onMouseLeave={e=>e.target.style.color='#888'} onClick={() => setShowRankingModal(false)}></i>
                </h3>
                
                {loadingRankings ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}><i className="fa-solid fa-spinner fa-spin fa-2x" style={{color:'#e50914'}}></i></div>
                ) : misRankings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                        {misRankings.map(r => (
                            <button key={r.id} onClick={() => añadirItem(r.id)} style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#2a2a2a', border: '1px solid #444', color: 'white', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.backgroundColor='#3a3a3a'; e.currentTarget.style.borderColor='#e50914'}} onMouseLeave={e => {e.currentTarget.style.backgroundColor='#2a2a2a'; e.currentTarget.style.borderColor='#444'}}>
                                <div style={{flex: 1}}>
                                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>{r.titulo}</h4>
                                    <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight:'bold' }}>{r.tipo === 'mixed' ? 'Cualquier Medio' : r.tipo}</div>
                                </div>
                                <i className="fa-solid fa-plus" style={{ color: '#e50914', fontSize: '1.2rem', padding: '10px', backgroundColor: 'rgba(229,9,20,0.1)', borderRadius: '50%' }}></i>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
                        <i className="fa-solid fa-box-open fa-3x" style={{ marginBottom: '20px', color: '#444' }}></i>
                        <p style={{fontSize:'1.1rem'}}>No tienes rankings compatibles con este tipo de contenido.</p>
                        <button onClick={() => {setShowRankingModal(false); navigate('/rankings')}} style={{ marginTop: '20px', padding: '12px 25px', borderRadius: '8px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize:'1rem' }}>Crear Ranking Nuevo</button>
                    </div>
                )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Detalle;