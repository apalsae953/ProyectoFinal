import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

function Detalle() {
  const { tipo, id } = useParams();
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setCargando(true);
    setError(false);

    let endpoint = '';
    if (tipo === 'movie') endpoint = `/movies/${id}`;
    else if (tipo === 'tv') endpoint = `/tv/${id}`;
    else if (tipo === 'game') endpoint = `/games/${id}`;

    api.get(endpoint)
      .then((respuesta) => {
        setDatos(respuesta.data.data);
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error al cargar detalle:", err);
        setError(true);
        setCargando(false);
      });
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
        <button onClick={() => navigate(-1)} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '5px', backgroundColor: '#e50914', color: 'white', border: 'none', cursor: 'pointer' }}>Volver</button>
      </div>
    );
  }

  const backdrop = tipo === 'game'
    ? datos.backdrop_path
    : (datos.backdrop_path ? `https://image.tmdb.org/t/p/original${datos.backdrop_path}` : null);

  const poster = tipo === 'game'
    ? datos.poster_path
    : (datos.poster_path ? `https://image.tmdb.org/t/p/w500${datos.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: 'white', minHeight: '100vh' }}>

      {/* SECCIÓN HERO */}
      <div style={{ position: 'relative', width: '100%', height: '70vh', overflow: 'hidden' }}>
        {backdrop && (
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url(${backdrop})`, backgroundSize: 'cover', backgroundPosition: 'top center', filter: 'brightness(0.35)', zIndex: 0 }}
          />
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80%', background: 'linear-gradient(to top, #121212, transparent)', zIndex: 1 }} />

        <button onClick={() => navigate(-1)} style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '10px 15px', borderRadius: '30px', cursor: 'pointer', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-arrow-left"></i> Volver
        </button>

        <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '1200px', display: 'flex', gap: '40px', alignItems: 'center', zIndex: 5 }}>
          <motion.img initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} src={poster} alt={datos.title || datos.name} style={{ width: '260px', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }} />
          <div style={{ flex: 1 }}>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} style={{ fontSize: '3.5rem', margin: 0, fontWeight: 'bold' }}>{datos.title || datos.name}</motion.h1>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', gap: '20px', marginTop: '15px', fontSize: '20px', alignItems: 'center' }}>
              <span style={{ backgroundColor: '#e50914', padding: '3px 12px', borderRadius: '6px', fontWeight: 'bold' }}>{datos.year}</span>

              {/* PUNTUACIÓN UNIFICADA (Estrella en verde) */}
              {tipo === 'game' ? (
                datos.metacritic ? (
                  <span style={{ color: '#66cc33' }} title="Nota de la Crítica (IGDB/Aggregation)">
                    <i className="fa-solid fa-star"></i> {(datos.metacritic / 10).toFixed(1)}
                  </span>
                ) : (
                  <span style={{ color: '#66cc33' }} title="Puntuación de usuarios (IGDB)">
                    <i className="fa-solid fa-star"></i> {datos.vote_average ? datos.vote_average.toFixed(1) : 'N/A'}
                  </span>
                )
              ) : (
                <span style={{ color: '#66cc33' }} title="Puntuación oficial (TMDB)">
                  <i className="fa-solid fa-star"></i> {datos.vote_average ? datos.vote_average.toFixed(1) : 'N/A'}
                </span>
              )}

              {/* PUNTUACIÓN MEDIAVERSE (USUARIOS) */}
              <span style={{ color: '#4caf50', fontWeight: 'bold' }} title="Puntuación MediaVerse">
                <i className="fa-solid fa-users"></i> {datos.puntuacion_usuarios ? datos.puntuacion_usuarios : '-'}
              </span>

              <span>{tipo === 'movie' ? (datos.runtime + ' min') : (tipo === 'tv' ? (datos.number_of_seasons + ' Temporadas') : 'Videojuego')}</span>
            </motion.div>

            {/* BOTONES DE ACCIÓN (Ahora en el Hero para que se vean bien) */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: '12px 25px', borderRadius: '10px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(229, 9, 20, 0.3)' }}>
                <i className="fa-solid fa-heart"></i> Añadir a Favoritos
              </motion.button>
              <motion.button whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.95 }} style={{ padding: '12px 25px', borderRadius: '10px', border: '1px solid white', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-star"></i> Escribir Reseña
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL LAYOUT DE UNA COLUMNA */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}>

        {/* SINOPSIS */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '25px', fontSize: '2rem' }}>Sinopsis</h2>
          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#ddd' }}>{datos.overview || 'No hay descripción disponible.'}</p>
        </section>

        {/* TRAILER */}
        {datos.trailer_url && (
          <section style={{ marginBottom: '60px' }}>
            <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '25px', fontSize: '2rem' }}>Trailer Oficial</h2>
            <div style={{ maxWidth: '900px' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} src={datos.trailer_url} title="YouTube video player" frameBorder="0" allowFullScreen></iframe>
              </div>
            </div>
          </section>
        )}

        {/* REPARTO */}
        {datos.cast && datos.cast.length > 0 && (
          <section style={{ marginBottom: '60px' }}>
            <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '25px', fontSize: '2rem' }}>Reparto Principal</h2>
            <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {datos.cast.map((actor) => (
                <div
                  key={actor.id}
                  onClick={() => navigate(`/actor/${actor.id}`)}
                  style={{ width: '140px', textAlign: 'center', marginBottom: '20px', cursor: 'pointer' }}
                >
                  <motion.div whileHover={{ scale: 1.05 }}>
                    <img src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/185x278?text=Actor'} alt={actor.name} style={{ width: '100%', borderRadius: '15px', marginBottom: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }} />
                    <p style={{ fontSize: '15px', margin: 0, fontWeight: 'bold', lineHeight: '1.2' }}>{actor.name}</p>
                    <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0 0' }}>{actor.character}</p>
                  </motion.div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FICHA TÉCNICA (Ahora en una nueva fila/sección) */}
        <section style={{
          backgroundColor: 'rgba(30, 30, 30, 0.5)',
          padding: '40px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '30px'
        }}>
          {tipo !== 'game' && (
            <div>
              <label style={{ color: '#e50914', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Director/a</label>
              <p style={{ fontSize: '1.2rem', marginTop: '10px' }}>{datos.director || 'Desconocido'}</p>
            </div>
          )}
          <div>
            <label style={{ color: '#e50914', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Géneros</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {(datos.genres || []).map(g => (
                <span key={g.id} style={{ fontSize: '14px', padding: '5px 15px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '20px' }}>{g.name}</span>
              ))}
            </div>
          </div>
          {tipo === 'movie' && datos.budget > 0 && (
            <div>
              <label style={{ color: '#e50914', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Presupuesto</label>
              <p style={{ fontSize: '1.2rem', marginTop: '10px' }}>${datos.budget.toLocaleString()}</p>
            </div>
          )}
          {tipo === 'game' && (
            <>
              <div>
                <label style={{ color: '#e50914', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Plataformas</label>
                <p style={{ fontSize: '1.1rem', marginTop: '10px' }}>{(datos.platforms || []).map(p => p.name).join(', ')}</p>
              </div>
              <div>
                <label style={{ color: '#e50914', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Desarrollador/a</label>
                <p style={{ fontSize: '1.2rem', marginTop: '10px' }}>{datos.developer}</p>
              </div>
            </>
          )}
        </section>
      </div>
    </motion.div>
  );
}

export default Detalle;