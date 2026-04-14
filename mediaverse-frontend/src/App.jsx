import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import MoviesSeries from './pages/MoviesSeries';
import SearchActors from './pages/SearchActors';
import Games from './pages/Games';
import Detalle from './pages/Detalle';
import Actor from './pages/Actor';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import OAuthCallback from './pages/OAuthCallback';
import VerMasTarde from './pages/VerMasTarde';
import Rankings from './pages/Rankings';
import RankingDetail from './pages/RankingDetail';
import MisResenas from './pages/MisResenas';
import Foro from './pages/Foro';
import YaVistos from './pages/YaVistos';
import Anime from './pages/Anime';
import Trivia from './pages/Trivia';
import ResetPassword from './pages/ResetPassword';
import Ajustes from './pages/Ajustes';
import { alerts } from './utils/swal';
import { motion, AnimatePresence } from 'framer-motion';
import api from './services/api';

function App() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuBloqueado, setMenuBloqueado] = useState(false);
  const [cineMenuAbierto, setCineMenuAbierto] = useState(false);
  const [isLogged, setIsLogged] = useState(!!localStorage.getItem('auth_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user_info'));
    } catch {
      return null;
    }
  });
  const menuRef = useRef(null);
  const [closeTimeout, setCloseTimeout] = useState(null);

  const fetchUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      localStorage.removeItem('user_info');
      return;
    }

    try {
      const res = await api.get('/profile');
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('user_info', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error("Error al obtener usuario:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        setIsLogged(false);
        setUser(null);
      }
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeout) clearTimeout(closeTimeout);
    setMenuAbierto(true);
  };

  const handleMouseLeave = () => {
    if (!menuBloqueado) {
      const timeout = setTimeout(() => {
        setMenuAbierto(false);
      }, 300);
      setCloseTimeout(timeout);
    }
  };

  const toggleMenuLock = () => {
    setMenuBloqueado(!menuBloqueado);
    setMenuAbierto(true);
  };

  // Sincronizar estado cuando cambie el storage u otros componentes avisen
  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem('auth_token');
      setIsLogged(!!token);
      fetchUser();
    };

    fetchUser();
    window.addEventListener('auth_changed', syncAuth);
    window.addEventListener('storage', syncAuth);

    // Cerrar menú al hacer clic fuera (desactivando el bloqueo)
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAbierto(false);
        setMenuBloqueado(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Fail-safe: Comprobar cada dos segundos por si acaso
    const interval = setInterval(syncAuth, 2000);

    return () => {
      window.removeEventListener('auth_changed', syncAuth);
      window.removeEventListener('storage', syncAuth);
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsLogged(false);
    window.dispatchEvent(new Event('auth_changed'));
    setMenuAbierto(false);
    alerts.success('Sesión cerrada');
  };

  return (
    <Router>
      <div style={{ backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'sans-serif', position: 'relative' }}>

        {/* BARRA DE NAVEGACIÓN SUPERIOR */}
        <nav style={{ padding: '20px', backgroundColor: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Lado Izquierdo: Logo y Secciones Principales */}
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <Link to="/dashboard" style={{ textDecoration: 'none', transition: 'transform 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.10)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <h2 style={{ color: '#e50914', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-clapperboard"></i> 
                <span className="hide-on-mobile">Mediaverse</span>
              </h2>
            </Link>
            <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Inicio</Link>


            {/* SECCIONES ESCRITORIO (Ocultas en móvil) */}
            <div className="hide-on-mobile" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {/* DROPDOWN Cine y Series */}
              <div
                style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => setCineMenuAbierto(true)}
                onMouseLeave={() => setCineMenuAbierto(false)}
              >
                
                <Link to="/cine-y-series" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
                  Cine y Series <i className="fa-solid fa-caret-down" style={{ fontSize: '12px', transition: 'transform 0.3s', transform: cineMenuAbierto ? 'rotate(180deg)' : 'none' }}></i>
                </Link>

                <AnimatePresence>
                  {cineMenuAbierto && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{
                        position: 'absolute', top: '100%', left: '0',
                        backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '12px',
                        minWidth: '220px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                        zIndex: 2000, border: '1px solid #333',
                        marginTop: '5px'
                      }}
                    >
                      <Link to="/cine-y-series" onClick={() => setCineMenuAbierto(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', textDecoration: 'none', padding: '10px 15px', borderRadius: '8px', fontSize: '15px', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#e50914'; }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}>
                        <i className="fa-solid fa-film"></i> Películas y Series
                      </Link>
                      <div style={{ height: '1px', backgroundColor: '#333', margin: '5px 0' }}></div>
                      <Link to="/actores" onClick={() => setCineMenuAbierto(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', textDecoration: 'none', padding: '10px 15px', borderRadius: '8px', fontSize: '15px', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#e50914'; }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}>
                        <i className="fa-solid fa-masks-theater"></i> Buscar Actores
                      </Link>
                      <Link to="/Anime" onClick={() => setCineMenuAbierto(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', textDecoration: 'none', padding: '10px 15px', borderRadius: '8px', fontSize: '15px', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#e50914'; }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}>
                        <i className="fa-solid fa-torii-gate"></i> Animes
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/juegos" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Videojuegos</Link>
              <Link to="/foro" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Foro</Link>
              <Link to="/kahoot" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Trivia</Link>
              <Link to="/rankings" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}> Rankings</Link>
            </div>
          </div>

          {/* Lado Derecho: Perfil y Menú */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>

            {/* PERFIL O LOGIN */}
            {isLogged ? (
              <Link to="/perfil" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'white', backgroundColor: '#111', padding: '5px 15px', borderRadius: '30px', border: '1px solid #333', transition: 'all 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#e50914'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333'}>
                <span className="hide-on-mobile" style={{ fontSize: '14px', fontWeight: 'bold' }}>{user?.name?.split(' ')[0] || 'Cargando...'}</span>
                <img
                  src={user?.avatar || user?.profile_photo_url || 'https://ui-avatars.com/api/?name=' + (user?.name || 'User') + '&background=e50914&color=fff'}
                  alt="Perfil"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e50914' }}
                />
              </Link>
            ) : (
              <Link to="/auth" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.target.style.color = '#e50914'} onMouseLeave={(e) => e.target.style.color = 'white'}>
                <i className="fa-solid fa-circle-user" style={{ fontSize: '20px' }}></i> 
                <span className="hide-on-mobile">Registrarse / Iniciar Sesión</span>
              </Link>
            )}

            <div
              ref={menuRef}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <button
                onClick={toggleMenuLock}
                className="btn-hamburger"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: (menuBloqueado || menuAbierto) ? '#e50914' : 'white',
                  fontSize: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1001,
                  padding: '10px',
                  transition: 'color 0.3s'
                }}
              >
                <i className={(menuBloqueado || menuAbierto) ? "fa-solid fa-bars-staggered" : "fa-solid fa-bars"}></i>
              </button>
              {/* PANEL DEL MENÚ LATERAL */}
              {menuAbierto && (
                <div
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    position: 'absolute', top: '55px', right: '0', width: '250px',
                    backgroundColor: '#1a1a1a', boxShadow: '-4px 4px 15px rgba(0,0,0,0.8)',
                    padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 1000,
                    borderBottomLeftRadius: '15px', borderLeft: '1px solid #333', borderBottom: '1px solid #333',
                    paddingTop: '25px', maxHeight: '90vh', overflowY: 'auto'
                  }}>
                  
                  {/* SECCIONES PARA MÓVIL (Visibles solo en móvil) */}
                  <div className="show-on-mobile">
                    <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: 0 }}>Navegación</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                      <Link to="/cine-y-series" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none' }}><i className="fa-solid fa-film"></i> Cine y Series</Link>
                      <Link to="/juegos" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none' }}><i className="fa-solid fa-gamepad"></i> Videojuegos</Link>
                      <Link to="/foro" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none' }}><i className="fa-solid fa-comments"></i> Foro</Link>
                      <Link to="/kahoot" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none' }}><i className="fa-solid fa-brain"></i> Trivia</Link>
                      <Link to="/rankings" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none' }}><i className="fa-solid fa-trophy"></i> Rankings</Link>
                    </div>
                  </div>

                  <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: 10 }}>Mi Cuenta</h3>

                  {isLogged ? (
                    <>
                      <Link to="/perfil" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px', transition: 'padding-left 0.3s' }} onMouseEnter={(e) => e.target.style.paddingLeft = '10px'} onMouseLeave={(e) => e.target.style.paddingLeft = '0'}><i className="fa-solid fa-user"></i> Mi Perfil</Link>
                      <Link to="/ver-mas-tarde" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px', transition: 'padding-left 0.3s' }} onMouseEnter={(e) => e.target.style.paddingLeft = '10px'} onMouseLeave={(e) => e.target.style.paddingLeft = '0'}><i className="fa-solid fa-clock"></i> Para más tarde</Link>
                      <Link to="/resenas" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px', transition: 'padding-left 0.3s' }} onMouseEnter={(e) => e.target.style.paddingLeft = '10px'} onMouseLeave={(e) => e.target.style.paddingLeft = '0'}><i className="fa-solid fa-pen-to-square"></i> Mis Reseñas</Link>
                      <Link to="/yaVistos" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px', transition: 'padding-left 0.3s' }} onMouseEnter={(e) => e.target.style.paddingLeft = '10px'} onMouseLeave={(e) => e.target.style.paddingLeft = '0'}><i className="fa-solid fa-eye"></i> Ya Vistos</Link>
                      <Link to="/ajustes" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px', transition: 'padding-left 0.3s' }} onMouseEnter={(e) => e.target.style.paddingLeft = '10px'} onMouseLeave={(e) => e.target.style.paddingLeft = '0'}><i className="fa-solid fa-gear"></i> Ajustes</Link>

                      <hr style={{ borderColor: '#333', width: '100%', margin: '5px 0' }} />
                      <button onClick={handleLogout} style={{ background: 'none', border: 'none', textAlign: 'left', color: '#e50914', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', padding: 0, transition: 'padding-left 0.3s' }} onMouseEnter={(e) => e.target.style.paddingLeft = '10px'} onMouseLeave={(e) => e.target.style.paddingLeft = '0'}><i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión</button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth" onClick={() => setMenuAbierto(false)} style={{ color: '#e50914', textDecoration: 'none', fontSize: '16px', fontWeight: 'bold', transition: 'padding-left 0.3s' }} onMouseEnter={(e) => e.target.style.paddingLeft = '10px'} onMouseLeave={(e) => e.target.style.paddingLeft = '0'}><i className="fa-solid fa-door-open"></i> Iniciar Sesión / Registro</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* CONTENIDO DE LAS PÁGINAS */}
        <div style={{ padding: '20px' }} onClick={() => setMenuAbierto(false)}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/cine-y-series" element={<MoviesSeries />} />
            <Route path="/juegos" element={<Games />} />
            <Route path="/actores" element={<SearchActors />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/foro" element={<Foro />} />
            <Route path="/kahoot" element={<Trivia />} />
            <Route path="/detalle/:tipo/:id" element={<Detalle />} />
            <Route path="/actor/:id" element={<Actor />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/ver-mas-tarde" element={<VerMasTarde />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/rankings/:id" element={<RankingDetail />} />
            <Route path="/resenas" element={<MisResenas />} />
            <Route path="/yaVistos" element={<YaVistos />} />
            <Route path="/Anime" element={<Anime />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/ajustes" element={<Ajustes />} />
          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;