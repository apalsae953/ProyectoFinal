import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';

function Actor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actor, setActor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setCargando(true);
    api.get(`/actor/${id}`)
      .then(res => {
        setActor(res.data.data);
        setCargando(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setCargando(false);
      });
  }, [id]);

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <i className="fa-solid fa-spinner fa-3x"></i>
        </motion.div>
      </div>
    );
  }

  if (error || !actor) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'white' }}>
        <h2>No pudimos encontrar al actor.</h2>
        <button onClick={() => navigate(-1)} className="btn-volver" style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '5px', backgroundColor: '#e50914', color: 'white', border: 'none', cursor: 'pointer' }}>Volver</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'white', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* HEADER ACTOR */}
      <div style={{ 
        minHeight: '50vh', position: 'relative', overflow: 'hidden', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(to bottom, #1a1a1a, #121212)',
        padding: '60px 20px'
      }}>
        {/* BOTON VOLVER */}
        <button 
          onClick={() => navigate(-1)}
          className="btn-volver"
          style={{ 
            position: 'absolute', top: '30px', left: '30px', zIndex: 100,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', 
            color: 'white', padding: '10px 15px', borderRadius: '30px', cursor: 'pointer',
            backdropFilter: 'blur(5px)'
          }}
        >
          <i className="fa-solid fa-arrow-left"></i> Volver
        </button>

        {/* Imagen */}
        <div style={{ zIndex: 5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <img 
              src={actor.profile_path ? `https://image.tmdb.org/t/p/h632${actor.profile_path}` : 'https://via.placeholder.com/300x450?text=Actor'} 
              style={{ width: '220px', height: '220px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #e50914', boxShadow: '0 0 40px rgba(229, 9, 20, 0.5)', marginBottom: '25px' }}
            />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: '3.5rem', margin: 0, fontWeight: 'bold' }}
          >
            {actor.name}
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ color: '#e50914', fontSize: '1.4rem', marginTop: '10px', fontWeight: '500' }}
          >
            {actor.place_of_birth}
          </motion.p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* BIOGRAFÍA */}
        <section style={{ marginBottom: '50px' }}>
          <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '20px' }}>Biografía</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#ccc' }}>
            {actor.biography || "No hay biografía disponible para este actor en español."}
          </p>
        </section>

        {/* FILMOGRAFÍA */}
        <section>
          <h2 style={{ borderLeft: '5px solid #e50914', paddingLeft: '20px', marginBottom: '30px' }}>Filmografía Destacada</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {actor.filmography.map((item) => (
              <motion.div 
                key={`${item.tipo}-${item.id}`}
                whileHover={{ y: -10 }}
                onClick={() => navigate(`/detalle/${item.tipo}/${item.id}`)}
                style={{ width: '180px', cursor: 'pointer', backgroundColor: '#1e1e1e', borderRadius: '15px', overflow: 'hidden', transition: 'box-shadow 0.3s' }}
              >
                <img 
                  src={item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : 'https://via.placeholder.com/180x270?text=No+Poster'} 
                  style={{ width: '100%', height: '250px', objectFit: 'cover' }}
                />
                <div style={{ padding: '12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                  <p style={{ fontSize: '12px', color: '#e50914', margin: 0 }}>{item.year}</p>
                  <p style={{ fontSize: '11px', color: '#888', marginTop: '5px', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </div>


    </motion.div>
  );
}

export default Actor;
