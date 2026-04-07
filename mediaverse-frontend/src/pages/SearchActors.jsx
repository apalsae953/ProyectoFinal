import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

function SearchActors() {
  const [actors, setActors] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  useEffect(() => {
    if (query.trim() === '') {
      fetchPopularActors(paginaActual);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      searchActors(paginaActual);
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [query, paginaActual]);

  const fetchPopularActors = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/actors/popular?page=' + page);
      if (res.data.success) {
        setActors(res.data.data);
        setTotalPaginas(res.data.total_pages || 1);
        setPaginaActual(res.data.current_page || 1);
      }
    } catch (err) {
      console.error("Error al cargar actores populares:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchActors = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/actors/search?query=' + query + '&page=' + page);
      if (res.data.success) {
        setActors(res.data.data);
        setTotalPaginas(res.data.total_pages || 1);
        setPaginaActual(res.data.current_page || 1);
      }
    } catch (err) {
      console.error("Error al buscar actores:", err);
    } finally {
      setLoading(false);
    }
  };

  const cambiarPagina = (nueva) => {
    if (nueva >= 1 && nueva <= totalPaginas) {
      setPaginaActual(nueva);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: 'white', padding: '40px 20px' }}>
      
      {/* HEADER DINÁMICO */}
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span style={{ color: '#e50914', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.9rem' }}>
            Explora el estrellato
          </span>
          <h1 style={{ fontSize: '3.5rem', margin: '15px 0', fontWeight: '800', background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {query ? 'Busqueda: ' + query : 'Actores Populares'}
          </h1>
          <p style={{ color: '#aaa', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.6' }}>
            {query 
              ? 'Hemos encontrado estos talentos que coinciden con "' + query + '".'
              : 'Descubre a las figuras más influyentes del cine y la televisión en la actualidad.'}
          </p>
        </motion.div>

        {/* BUSCADOR SLEEK */}
        <div style={{ marginTop: '50px', position: 'relative', width: '100%', maxWidth: '500px', margin: '50px auto 0' }}>
          <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#e50914', fontSize: '1.2rem' }}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <input 
            type="text" 
            placeholder="Escribe el nombre de una estrella..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPaginaActual(1);
            }}
            style={{ 
              padding: '18px 25px 18px 60px', 
              width: '100%', 
              borderRadius: '50px', 
              border: '2px solid #333', 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              color: 'white', 
              outline: 'none', 
              fontSize: '1.1rem',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(5px)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#e50914';
              e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
              e.target.style.boxShadow = '0 8px 30px rgba(229, 9, 20, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#333';
              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            }}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              <i className="fa-solid fa-circle-xmark"></i>
            </button>
          )}
        </div>
      </header>

      {/* GRID DE ACTORES */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ fontSize: '3rem', color: '#e50914' }}
            >
              <i className="fa-solid fa-circle-notch"></i>
            </motion.div>
            <p style={{ marginTop: '20px', color: '#888', letterSpacing: '2px' }}>CONECTANDO CON HOLLYWOOD...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
              gap: '30px' 
            }}
          >
            <AnimatePresence mode="popLayout">
              {actors.map((actor, index) => (
                <motion.div 
                  key={actor.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03, duration: 0.4 }}
                  whileHover={{ y: -10 }}
                  onClick={() => navigate('/actor/' + actor.id)}
                  style={{ 
                    position: 'relative',
                    backgroundColor: '#1a1a1a', 
                    borderRadius: '20px', 
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
                    border: '1px solid #222'
                  }}
                >
                  {/* IMAGEN DEL ACTOR */}
                  <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden' }}>
                    <img 
                      src={actor.profile_path ? 'https://image.tmdb.org/t/p/w500' + actor.profile_path : 'https://via.placeholder.com/500x750?text=Sin+Foto'} 
                      alt={actor.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    />
                    {/* OVERLAY EN HOVER */}
                    <div className="actor-overlay" style={{ 
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 50%)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{actor.name}</h3>
                      <p style={{ margin: '5px 0 0', color: '#e50914', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {actor.known_for_department === 'Acting' ? 'Actor / Actriz' : actor.known_for_department}
                      </p>
                    </div>
                  </div>

                  {/* MINI INDICADOR DE POPULARIDAD */}
                  <div style={{ 
                    position: 'absolute', top: '15px', right: '15px', 
                    backgroundColor: 'rgba(229, 9, 20, 0.8)', padding: '5px 10px', 
                    borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', backdropFilter: 'blur(5px)'
                  }}>
                    <i className="fa-solid fa-fire"></i> Trending
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && actors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <i className="fa-solid fa-user-slash" style={{ fontSize: '4rem', color: '#222', marginBottom: '20px' }}></i>
            <h2 style={{ fontSize: '2rem', color: '#444' }}>No hemos encontrado esa estrella</h2>
            <p style={{ color: '#666' }}>Prueba con otro nombre o revisa la ortografía.</p>
          </div>
        )}
        {/* PAGINACIÓN */}
        {!loading && actors.length > 0 && totalPaginas > 1 && (
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
            <button 
              onClick={() => cambiarPagina(paginaActual - 1)} 
              disabled={paginaActual === 1}
              style={{ 
                padding: '12px 30px', 
                backgroundColor: paginaActual === 1 ? '#333' : '#e50914', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50px', 
                cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', 
                transition: '0.3s' 
              }}
            >
              <i className="fa-solid fa-chevron-left"></i> Anterior
            </button>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Página {paginaActual} {totalPaginas > 1 ? 'de ' + totalPaginas : ''}</span>
            <button 
              onClick={() => cambiarPagina(paginaActual + 1)} 
              disabled={paginaActual === totalPaginas}
              style={{ 
                padding: '12px 30px', 
                backgroundColor: paginaActual === totalPaginas ? '#333' : '#e50914', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50px', 
                cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', 
                transition: '0.3s' 
              }}
            >
              Siguiente <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchActors;
