import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

function Dashboard() {
  const [stats, setStats] = useState({ visto: 0, favorito: 0, pendiente: 0 }); // Estadísticas
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // Datos de sesión
  const [trending, setTrending] = useState([]); // Lo destacado para el banner
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [latestThreads, setLatestThreads] = useState([]); // Últimos temas del foro
  const [activeSlide, setActiveSlide] = useState(0); // Para saber por dónde va el carrusel
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user_info'));
    setUser(userData);

    const fetchData = async () => {
      setLoading(true);
      const MAX_RETRIES = 4;
      const RETRY_DELAY = 8000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Una llamada optimizada para traer todo de golpe y que no tarde tanto
          const res = await api.get('/dashboard/summary');
          const batch = res.data.data;

          if (batch) {
            if (batch.movies) setPopularMovies(batch.movies.slice(0, 10));
            if (batch.series) setPopularSeries(batch.series.slice(0, 10));
            if (batch.games) setPopularGames(batch.games.slice(0, 10));
            if (batch.threads) setLatestThreads(batch.threads);

            const hot = [
              ...(batch.movies?.slice(0, 3).map(m => ({ ...m, type: 'movie' })) || []),
              ...(batch.series?.slice(0, 2).map(s => ({ ...s, type: 'tv' })) || []),
              ...(batch.games?.slice(0, 2).map(g => ({ ...g, type: 'game' })) || [])
            ];
            setTrending(hot);
          }

          // Si el usuario está logueado, obtenemos sus estadísticas de interacción
          const token = localStorage.getItem('auth_token');
          if (token) {
            const resInter = await api.get('/interactions/me');
            if (resInter.data.success) {
              const data = resInter.data.data;
              setStats({
                visto: data.visto?.length || 0,
                favorito: data.favorito?.length || 0,
                pendiente: data.ver_mas_tarde?.length || 0
              });
            }
          }
          break;
        } catch (err) {
          console.error(`Dashboard fetch attempt ${attempt} failed:`, err);
          if (attempt < MAX_RETRIES) {
            await new Promise(res => setTimeout(res, RETRY_DELAY));
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Rotación automática del carrusel cada 10 segundos
  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % trending.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [trending, activeSlide]); // Reinicio el contador si toco el carrusel a mano para que no pegue un salto raro

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white', gap: '20px' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ fontSize: '40px' }}>
        <i className="fa-solid fa-circle-notch"></i>
      </motion.div>
      <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', maxWidth: '300px' }}>
        Despertando el servidor... esto puede tardar unos segundos la primera vez.
      </p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', color: 'white', overflowX: 'hidden' }}>

      {/* Carrusel principal */}
      <div className="hero-carousel-section" style={{ position: 'relative', height: '550px', width: '100%', marginBottom: '60px', overflow: 'hidden' }}>
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
                backgroundImage: 'linear-gradient(to bottom, rgba(18,18,18,0.2) 0%, rgba(18,18,18,1) 95%), url(' + (trending[activeSlide].backdrop_path ? 'https://image.tmdb.org/t/p/original' + trending[activeSlide].backdrop_path : (trending[activeSlide].background_image || '')) + ')',
                backgroundSize: 'cover', backgroundPosition: 'center'
              }}
            >
              <div className="hero-content" style={{ position: 'absolute', bottom: '80px', left: '60px', maxWidth: '600px' }}>
                <motion.span
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                  style={{ backgroundColor: '#e50914', padding: '5px 15px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}
                >
                  Novedad destacada hoy en España
                </motion.span>
                <motion.h1
                  className="hero-title"
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                  style={{ fontSize: '4.5rem', margin: '20px 0', fontWeight: '900', lineHeight: '1', textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}
                >
                  {trending[activeSlide].title || trending[activeSlide].name}
                </motion.h1>
                <motion.p
                  className="hero-text"
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
                  style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '30px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {trending[activeSlide].overview || trending[activeSlide].category_name || "Descubre todo sobre este título en Mediaverse."}
                </motion.p>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }} style={{ display: 'flex', gap: '15px' }}>
                  <button
                    onClick={() => navigate('/detalle/' + (trending[activeSlide].type || 'movie') + '/' + trending[activeSlide].id)}
                    style={{ padding: '12px 35px', backgroundColor: 'white', color: 'black', borderRadius: '30px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}
                  >
                    <i className="fa-solid fa-circle-info"></i> <span className="hide-on-mobile">Ver Detalles</span>
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicadores del Carrusel */}
        <div className="carousel-indicators" style={{ position: 'absolute', bottom: '40px', right: '60px', display: 'flex', gap: '10px', zIndex: 10 }}>
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

        {/* Flechas del carrusel */}
        <button
          className="carousel-arrow-btn"
          onClick={(e) => { e.stopPropagation(); setActiveSlide((prev) => (prev - 1 + trending.length) % trending.length); }}
          style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', backdropFilter: 'blur(5px)', transition: 'all 0.3s' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(229, 9, 20, 0.8)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.3)'}
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <button
          className="carousel-arrow-btn"
          onClick={(e) => { e.stopPropagation(); setActiveSlide((prev) => (prev + 1) % trending.length); }}
          style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', backdropFilter: 'blur(5px)', transition: 'all 0.3s' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(229, 9, 20, 0.8)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.3)'}
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="mobile-p-small" style={{ padding: '0 40px' }}>

          {/* Barra de saludo y estadísticas */}
          <div className="dashboard-stats-bar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '60px',
            backgroundColor: '#1a1a1a',
            padding: '25px 40px',
            borderRadius: '20px',
            border: '1px solid #333',
            backdropFilter: 'blur(20px)'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>
                {user ? '¡Qué bueno verte, ' + user.name.split(' ')[0] + '!' : '¡Únete a la comunidad!'}
              </h2>
              <p style={{ color: '#888', margin: '5px 0 0 0' }}>Explora lo último en cine, series y videojuegos.</p>
            </div>
            {user ? (
              <div className="stats-items-row" style={{ display: 'flex', gap: '40px' }}>
                <Link to="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <StatMini icon="fa-check" value={stats.visto} label="Vistos" color="#4caf50" />
                </Link>
                <Link to="/ver-mas-tarde" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <StatMini icon="fa-bookmark" value={stats.pendiente} label="Para más tarde" color="#2196f3" />
                </Link>
              </div>
            ) : (
              <Link to="/auth" style={{ padding: '10px 25px', backgroundColor: '#e50914', color: 'white', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none' }}>Iniciar Sesión</Link>
            )}
          </div>

          {/* Fila de películas */}
          <SectionRow
            title={
              <>
                <i className="fa-solid fa-clapperboard" style={{ color: '#e50914' }}></i> Películas en cartelera (España)
              </>
            }
            data={popularMovies}
            type="movie"
          />

          {/* Fila de series */}
          <SectionRow
            title={
              <>
                <i className="fa-solid fa-tv" style={{ color: '#03a9f4' }}></i> Series de las que todos hablan
              </>
            }
            data={popularSeries}
            type="tv"
          />

          {/* Cuadrícula de juegos y foro */}
          <div className="mobile-stack grid-dashboard-layout" style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '50px',
            marginTop: '60px',
            paddingBottom: '100px'
          }}>

            {/* Lista de juegos */}
            <div>
              <h3 style={{ fontSize: '2rem', marginBottom: '35px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <i className="fa-solid fa-gamepad" style={{ color: 'green' }}></i> Imprescindibles en Videojuegos
              </h3>
              <div className="dashboard-games-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
                {popularGames.slice(0, 6).map(game => (
                  <motion.div
                    key={game.id}
                    whileHover={{ y: -10, boxShadow: '0 15px 30px rgba(0,0,0,0.5)' }}
                    onClick={() => navigate('/detalle/game/' + game.id)}
                    style={{ backgroundColor: '#1a1a1a', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #333', transition: 'all 0.3s ease' }}
                  >
                    <div className="game-card-img" style={{ height: '220px', backgroundImage: 'url(' + game.background_image + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
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

            {/* Feed del foro */}
            <div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <i className="fa-solid fa-newspaper" style={{ color: '#ffc107' }}></i> Novedades y Comunidad
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {latestThreads.length > 0 ? latestThreads.map(thread => (
                  <Link to={'/foro'} key={thread.id} style={{ textDecoration: 'none' }}>
                    <motion.div
                      whileHover={{ scale: 1.02, backgroundColor: '#222' }}
                      style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '1px solid #333' }}
                    >
                      <div style={{ fontSize: '12px', color: '#e50914', fontWeight: 'bold', marginBottom: '5px' }}>TEMA CALIENTE</div>
                      <h4 style={{ color: 'white', margin: '5px 0', fontSize: '1.1rem' }}>{thread.titulo}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#333', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{thread.user?.name?.[0]}</div>
                        <span style={{ fontSize: '12px', color: '#888' }}> {thread.user?.name} · {new Date(thread.created_at).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  </Link>
                )) : (
                  <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#1a1a1a', borderRadius: '15px', color: '#666' }}>
                    <p>Aún no hay nada nuevo por aquí... ¡Date una vuelta más tarde!</p>
                  </div>
                )}

                {/* Botón rápido para la sección de actores */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  style={{ padding: '20px', borderRadius: '15px', background: 'linear-gradient(45deg, #e50914, #80060d)', marginTop: '10px' }}
                >
                  <h4 style={{ margin: 0 }}>¡Nueva sección de Actores!</h4>
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px', opacity: 0.9 }}>He añadido una sección para buscar actores y consultar su trayectoria profesional.</p>
                  <Link to="/actores" style={{ display: 'inline-block', marginTop: '15px', color: 'white', fontWeight: 'bold', textDecoration: 'none', borderBottom: '1px solid white' }}>Ir a buscar <i className="fa-solid fa-arrow-right"></i></Link>
                </motion.div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


function StatMini({ icon, value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <i className={'fa-solid ' + icon} style={{ color, fontSize: '1.2rem' }}></i> {value}
      </div>
      <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '3px' }}>{label}</div>
    </div>
  );
}

function SectionRow({ title, data, type }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [moved, setMoved] = useState(false);

  const onMouseDown = (e) => {
    setIsDragging(true);
    setMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 5) setMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div style={{ marginBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ fontSize: 'min(1.8rem, 6vw)', fontWeight: '700', margin: 0 }}>{title}</h3>
        <Link to={type === 'movie' ? '/cine-y-series' : (type === 'tv' ? '/cine-y-series' : '/juegos')} style={{ color: '#e50914', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>Ver todo <i className="fa-solid fa-arrow-right"></i></Link>
      </div>
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
        style={{
          display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', scrollbarWidth: 'none',
          cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none'
        }}
        className="no-scrollbar"
      >
        {data.map(item => (
          <motion.div
            key={item.id}
            className="section-row-card"
            whileHover={{ scale: moved ? 1 : 1.05 }}
            onClick={() => {
              if (!moved) navigate('/detalle/' + type + '/' + item.id);
            }}
            style={{ minWidth: '180px', cursor: moved ? 'grabbing' : 'pointer' }}
          >
            <img
              src={item.poster_path ? 'https://image.tmdb.org/t/p/w500' + item.poster_path : (item.background_image || 'https://via.placeholder.com/500x750?text=No+Image')}
              alt={item.title || item.name}
              style={{ width: '100%', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', height: '270px', objectFit: 'cover', pointerEvents: 'none' }}
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
