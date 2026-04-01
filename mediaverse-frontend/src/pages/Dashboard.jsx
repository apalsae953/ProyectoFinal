import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

function Dashboard() {
  const [stats, setStats] = useState({ visto: 0, favorito: 0, pendiente: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [latestThreads, setLatestThreads] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user_info'));
    setUser(userData);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [resMovies, resSeries, resGames, resThreads] = await Promise.all([
          api.get('/movies/latest'),
          api.get('/tv/latest'),
          api.get('/games/latest'),
          api.get('/threads')
        ]);

        if (resMovies.data.success) setPopularMovies(resMovies.data.data.slice(0, 10));
        if (resSeries.data.success) setPopularSeries(resSeries.data.data.slice(0, 10));
        if (resGames.data.success) setPopularGames(resGames.data.data.slice(0, 10));
        if (resThreads.data.success) setLatestThreads(resThreads.data.data.slice(0, 4));

        // Combinar para una sección hero de "Tendencias Hot" (Ordenadas por novedad)
        const hot = [
          ...(resMovies.data.data?.slice(0, 3).map(m => ({ ...m, type: 'movie' })) || []),
          ...(resSeries.data.data?.slice(0, 2).map(s => ({ ...s, type: 'tv' })) || []),
          ...(resGames.data.data?.slice(0, 2).map(g => ({ ...g, type: 'game' })) || [])
        ];
        
        setTrending(hot);

        // Obtener estadísticas del usuario si está identificado
        const token = localStorage.getItem('auth_token');
        if (token) {
          const resInter = await api.get('/interactions/me');
          if (resInter.data.success) {
            const data = resInter.data.data;
            setStats({
              visto: data.visto?.length || 0,
              favorito: data.favorito?.length || 0,
              pendiente: data.pendiente?.length || 0
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Reproducción automática para el carrusel (Se reinicia al cambiar manualmente)
  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % trending.length);
    }, 10000); // 10 segundos
    return () => clearInterval(interval);
  }, [trending, activeSlide]); // Al añadir activeSlide, el timer se reinicia en cada cambio manual

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ fontSize: '40px' }}>
        <i className="fa-solid fa-circle-notch"></i>
      </motion.div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', color: 'white', overflowX: 'hidden' }}>

      {/* 1. HERO CAROUSEL */}
      <div style={{ position: 'relative', height: '550px', width: '100%', marginBottom: '60px', overflow: 'hidden' }}>
        <AnimatePresence mode='wait'>
          {trending.length > 0 && (
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{
                position: 'absolute', width: '100%', height: '100%',
                backgroundImage: `linear-gradient(to bottom, rgba(18,18,18,0.2) 0%, rgba(18,18,18,1) 95%), url(${trending[activeSlide].backdrop_path ? 'https://image.tmdb.org/t/p/original' + trending[activeSlide].backdrop_path : (trending[activeSlide].background_image || '')})`,
                backgroundSize: 'cover', backgroundPosition: 'center'
              }}
            >
              <div style={{ position: 'absolute', bottom: '80px', left: '60px', maxWidth: '600px' }}>
                <motion.span
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                  style={{ backgroundColor: '#e50914', padding: '5px 15px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}
                >
                  Tendencia de Hoy
                </motion.span>
                <motion.h1
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                  style={{ fontSize: '4.5rem', margin: '20px 0', fontWeight: '900', lineHeight: '1', textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}
                >
                  {trending[activeSlide].title || trending[activeSlide].name}
                </motion.h1>
                <motion.p
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
                  style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '30px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {trending[activeSlide].overview || trending[activeSlide].category_name || "Descubre todo sobre este título en Mediaverse."}
                </motion.p>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }} style={{ display: 'flex', gap: '15px' }}>
                  <button
                    onClick={() => navigate(`/detalle/${trending[activeSlide].type || 'movie'}/${trending[activeSlide].id}`)}
                    style={{ padding: '12px 35px', backgroundColor: 'white', color: 'black', borderRadius: '30px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}
                  >
                    <i className="fa-solid fa-circle-info"></i> Ver Detalles
                  </button>
                  {user && (
                    <button style={{ padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                      <i className="fa-solid fa-plus"></i>
                    </button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicadores del Carrusel */}
        <div style={{ position: 'absolute', bottom: '40px', right: '60px', display: 'flex', gap: '10px', zIndex: 10 }}>
          {trending.map((_, i) => (
            <div
              key={i}
              onClick={() => setActiveSlide(i)}
              style={{
                width: i === activeSlide ? '30px' : '10px', height: '10px',
                borderRadius: '5px', backgroundColor: i === activeSlide ? '#e50914' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer', transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Carousel Arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); setActiveSlide((prev) => (prev - 1 + trending.length) % trending.length); }}
          style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', backdropFilter: 'blur(5px)', transition: 'all 0.3s' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(229, 9, 20, 0.8)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.3)'}
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setActiveSlide((prev) => (prev + 1) % trending.length); }}
          style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', backdropFilter: 'blur(5px)', transition: 'all 0.3s' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(229, 9, 20, 0.8)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.3)'}
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>

        {/* 2. STATS & GREETING BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px', backgroundColor: '#1a1a1a', padding: '25px 40px', borderRadius: '20px', border: '1px solid #333', backdropFilter: 'blur(20px)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>
              {user ? `¡Qué bueno verte, ${user.name.split(' ')[0]}!` : '¡Únete a la comunidad!'}
            </h2>
            <p style={{ color: '#888', margin: '5px 0 0 0' }}>Explora lo último en cine, series y videojuegos.</p>
          </div>
          {user ? (
            <div style={{ display: 'flex', gap: '40px' }}>
              <StatMini icon="fa-check" value={stats.visto} label="Vistos" color="#4caf50" />
              <StatMini icon="fa-heart" value={stats.favorito} label="Favoritos" color="#e50914" />
              <StatMini icon="fa-bookmark" value={stats.pendiente} label="Pendientes" color="#2196f3" />
            </div>
          ) : (
            <Link to="/auth" style={{ padding: '10px 25px', backgroundColor: '#e50914', color: 'white', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none' }}>Iniciar Sesión</Link>
          )}
        </div>

        {/* 3. ROW: MOVIES */}
        <SectionRow title="🔥 Películas que no te puedes perder" data={popularMovies} type="movie" />

        {/* 4. ROW: SERIES */}
        <SectionRow title="📺 Series de las que todos hablan" data={popularSeries} type="tv" />

        {/* 5. COMMUNITY & GAMES GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', marginTop: '60px', paddingBottom: '100px' }}>

          {/* GAMES LIST */}
          <div>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <i className="fa-solid fa-gamepad" style={{ color: '#03a9f4' }}></i> Imprescindibles en Videojuegos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {popularGames.slice(0, 6).map(game => (
                <motion.div
                  key={game.id}
                  whileHover={{ y: -10 }}
                  onClick={() => navigate(`/detalle/game/${game.id}`)}
                  style={{ backgroundColor: '#1a1a1a', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #333' }}
                >
                  <div style={{ height: '160px', backgroundImage: `url(${game.background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: '15px' }}>
                    <h4 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '10px' }}>{game.name}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px', fontWeight: 'bold' }}>
                      <span style={{ color: '#66cc33', fontSize: '13px' }} title="Puntuación de la Crítica">
                        {game.metacritic ? (
                          <><i className="fa-solid fa-star"></i> {Number(game.metacritic).toFixed(1)}</>
                        ) : null}
                      </span>
                      <span style={{ color: '#4caf50', fontSize: '13px' }} title="Puntuación MediaVerse">
                        <i className="fa-solid fa-users"></i> {game.puntuacion_usuarios || '—'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* COMMUNITY FEED / NEWS */}
          <div>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <i className="fa-solid fa-newspaper" style={{ color: '#ffc107' }}></i> Novedades y Comunidad
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {latestThreads.length > 0 ? latestThreads.map(thread => (
                <Link to={`/foro`} key={thread.id} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={{ scale: 1.02, backgroundColor: '#222' }}
                    style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}
                  >
                    <div style={{ fontSize: '12px', color: '#e50914', fontWeight: 'bold', marginBottom: '5px' }}>CUIDADORES DEL FORO</div>
                    <h4 style={{ color: 'white', margin: '5px 0', fontSize: '1.1rem' }}>{thread.titulo}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#333', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{thread.user?.name?.[0]}</div>
                      <span style={{ fontSize: '12px', color: '#888' }}> {thread.user?.name} · {new Date(thread.created_at).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                </Link>
              )) : (
                <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#1a1a1a', borderRadius: '15px', color: '#666' }}>
                  <p>Prepárate para las noticias...</p>
                </div>
              )}

              {/* QUICK NAVIGATION NEWS (SITE) */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                style={{ padding: '20px', borderRadius: '15px', background: 'linear-gradient(45deg, #e50914, #80060d)', marginTop: '10px' }}
              >
                <h4 style={{ margin: 0 }}>¡Nueva sección de Actores!</h4>
                <p style={{ margin: '10px 0 0 0', fontSize: '14px', opacity: 0.9 }}>Ahora puedes buscar a tus estrellas favoritas y ver su biografía completa.</p>
                <Link to="/actores" style={{ display: 'inline-block', marginTop: '15px', color: 'white', fontWeight: 'bold', textDecoration: 'none', borderBottom: '1px solid white' }}>Ir a buscar <i className="fa-solid fa-arrow-right"></i></Link>
              </motion.div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// HELPERS
function StatMini({ icon, value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1.2rem' }}></i> {value}
      </div>
      <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '3px' }}>{label}</div>
    </div>
  );
}

function SectionRow({ title, data, type }) {
  const navigate = useNavigate();
  return (
    <div style={{ marginBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h3 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>{title}</h3>
        <Link to={type === 'movie' ? '/cine-y-series' : (type === 'tv' ? '/cine-y-series' : '/juegos')} style={{ color: '#e50914', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>Ver todo <i className="fa-solid fa-arrow-right"></i></Link>
      </div>
      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', scrollbarWidth: 'none' }} className="no-scrollbar">
        {data.map(item => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate(`/detalle/${type}/${item.id}`)}
            style={{ minWidth: '180px', cursor: 'pointer' }}
          >
            <img
              src={item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : (item.background_image || 'https://via.placeholder.com/500x750?text=No+Image')}
              alt={item.title || item.name}
              style={{ width: '100%', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', height: '270px', objectFit: 'cover' }}
            />
            <h5 style={{ margin: '15px 0 5px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontWeight: 'bold' }}>
              <span style={{ color: '#66cc33', fontSize: '13px' }}>
                {(item.vote_average || item.metacritic) ? (
                  <><i className="fa-solid fa-star"></i> {(item.vote_average || item.metacritic).toFixed(1)}</>
                ) : null}
              </span>
              <span style={{ color: '#4caf50', fontSize: '13px' }}>
                <i className="fa-solid fa-users"></i> {item.puntuacion_usuarios || '—'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
