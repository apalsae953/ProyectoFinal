import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { alerts } from '../utils/swal';
import { motion, AnimatePresence } from 'framer-motion';

// Debounce helper simple para evitar peticiones masivas
let searchTimeout = null;

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar: '',
    password: '',
    password_confirmation: '',
    pelicula_favorita: null,
    serie_favorita: null,
    juego_favorito: null,
  });

  const [searchMedia, setSearchMedia] = useState({ query: '', results: [], type: '', loading: false });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchProfile();

    // Listener para cuando se cierre sesión desde el menú (App.jsx) mientras estamos aquí
    const handleAuthChange = () => {
      if (!localStorage.getItem('auth_token')) {
        navigate('/dashboard');
      }
    };
    window.addEventListener('auth_changed', handleAuthChange);
    return () => window.removeEventListener('auth_changed', handleAuthChange);
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      if (res.data.success) {
        setProfile(res.data.user);
        setFormData({
          name: res.data.user.name || '',
          email: res.data.user.email || '',
          bio: res.data.user.bio || '',
          avatar: res.data.user.avatar || '',
          password: '',
          password_confirmation: '',
          pelicula_favorita: res.data.user.pelicula_favorita || null,
          serie_favorita: res.data.user.serie_favorita || null,
          juego_favorito: res.data.user.juego_favorito || null,
        });
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return alerts.error('La imagen es demasiado grande (Máx 2MB)');
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (formData.password && formData.password !== formData.password_confirmation) {
        return alerts.error('Las contraseñas no coinciden');
      }

      const { password, password_confirmation, ...params } = formData;
      if (password) {
        params.password = password;
        params.password_confirmation = password_confirmation;
      }

      const res = await api.post('/profile', params);
      if (res.data.success) {
        setProfile(res.data.user);
        // Notificar a App.jsx que el usuario ha cambiado (para actualizar la foto en el nav)
        localStorage.setItem('user_info', JSON.stringify(res.data.user));
        window.dispatchEvent(new Event('auth_changed'));
        setEditing(false);
        alerts.success('Perfil actualizado');
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      if (data?.errors) {
        // Unimos los mensajes de error de Laravel en una lista
        const errorList = Object.values(data.errors).flat().join('\n• ');
        alerts.error('Revisa los datos', '• ' + errorList);
      } else {
        alerts.error('Error al actualizar', data?.message || 'No se pudo guardar el perfil.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      bio: profile.bio || '',
      avatar: profile.avatar || '',
      password: '',
      password_confirmation: '',
      pelicula_favorita: profile.pelicula_favorita || null,
      serie_favorita: profile.serie_favorita || null,
      juego_favorito: profile.juego_favorito || null,
    });
    setEditing(false);
    setSearchMedia({ query: '', results: [], type: '', loading: false });
  };

  const handleRemoveAvatar = () => {
    setFormData({ ...formData, avatar: null });
  };

  const handleSearchMedia = (query, type) => {
    setSearchMedia(prev => ({ ...prev, query, type, loading: true }));

    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (!query.trim()) {
      setSearchMedia(prev => ({ ...prev, results: [], loading: false }));
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const endpoint = type === 'movie' ? '/movies/search' : type === 'tv' ? '/tv/search' : '/games/search';
        const res = await api.get(endpoint, { params: { query } });
        // Aseguramos que los resultados correspondan a la búsqueda actual
        const results = (res.data.data?.results || res.data.data || []).slice(0, 5);
        setSearchMedia(prev => {
          if (prev.type !== type || prev.query !== query) return prev;
          return { ...prev, results, loading: false };
        });
      } catch (e) {
        console.error(e);
        setSearchMedia(prev => ({ ...prev, loading: false }));
      }
    }, 500); 
  };

  const selectFavorite = (item, type) => {
    const field = type === 'movie' ? 'pelicula_favorita' : type === 'tv' ? 'serie_favorita' : 'juego_favorito';
    const data = {
      api_id: item.id,
      titulo: item.title || item.name,
      poster_path: type === 'game' ? (item.background_image || '') : (item.poster_path || '')
    };
    setFormData({ ...formData, [field]: data });
    setSearchMedia({ query: '', results: [], type: '', loading: false });
  };

  const removeFavorite = (field) => {
    setFormData({ ...formData, [field]: null });
  };

  const getAvatarUrl = (user) => {
    if (user.avatar) return user.avatar;
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=e50914&color=fff';
  };

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '100px' }}>Cargando perfil...</div>;
  if (!profile) return null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: 'white' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={editing ? (formData.avatar || 'https://ui-avatars.com/api/?name=' + profile.name + '&background=e50914&color=fff') : getAvatarUrl(profile)} 
              alt="Avatar" 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e50914' }} 
            />
            {editing && (
              <div style={{ position: 'absolute', bottom: -5, right: -5, display: 'flex', gap: '5px' }}>
                <label style={{ backgroundColor: '#e50914', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #1e1e1e' }}>
                  <i className="fa-solid fa-camera" style={{ fontSize: '14px' }}></i>
                  <input type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                </label>
                {formData.avatar && (
                  <button type="button" onClick={handleRemoveAvatar} style={{ backgroundColor: '#444', borderRadius: '50%', width: '30px', height: '30px', border: '2px solid #1e1e1e', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-trash-can" style={{ fontSize: '12px' }}></i>
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{profile.name}</h1>
            <p style={{ margin: 0, color: '#aaa', fontSize: '1.2rem' }}>{profile.email}</p>
            {profile.provider && <span style={{ backgroundColor: '#333', padding: '3px 8px', borderRadius: '5px', fontSize: '0.8rem', marginTop: '5px', display: 'inline-block' }}><i className={'fa-brands fa-' + profile.provider}></i> Ingresó vía {profile.provider}</span>}
          </div>
        </div>

        {!editing ? (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Biografía</h3>
              <p style={{ color: '#ccc', lineHeight: '1.6' }}>{profile.bio || "No has escrito nada sobre ti aún."}</p>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Contenido Favorito</h3>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                {[
                  { label: 'Película', data: profile.pelicula_favorita, icon: 'fa-film', color: '#e50914' },
                  { label: 'Serie', data: profile.serie_favorita, icon: 'fa-tv', color: '#2196f3' },
                  { label: 'Juego', data: profile.juego_favorito, icon: 'fa-gamepad', color: '#4caf50' }
                ].map(fav => (
                  <div key={fav.label} style={{ flex: '1 1 200px', backgroundColor: '#2a2a2a', borderRadius: '15px', padding: '15px', display: 'flex', gap: '15px', alignItems: 'center', minWidth: '220px' }}>
                    <div style={{ width: '50px', height: '75px', backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {fav.data?.poster_path ? (
                        <img src={fav.data.poster_path.startsWith('http') ? fav.data.poster_path : 'https://image.tmdb.org/t/p/w92' + fav.data.poster_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <i className={`fa-solid ${fav.icon}`} style={{ color: '#333', fontSize: '20px' }}></i>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: fav.color, fontWeight: 'bold' }}>{fav.label}</span>
                      <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '0.9rem', color: fav.data ? 'white' : '#555' }}>
                        {fav.data?.titulo || 'No seleccionado'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button onClick={() => setEditing(true)} style={{ padding: '12px 25px', borderRadius: '30px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}>
              <i className="fa-solid fa-pen-to-square"></i> Editar mi Perfil
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label>Nombre de Usuario</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white', marginTop: '5px' }} />
            </div>
            <div>
              <label>Biografía</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} rows="4" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white', marginTop: '5px', resize: 'vertical' }} />
            </div>

            {/* FAVORITOS EDITING */}
            <div style={{ borderTop: '1px solid #333', marginTop: '10px', paddingTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '15px' }}>Mis Favoritos</label>
              {[
                { label: 'Película Favorita', field: 'pelicula_favorita', type: 'movie', icon: 'fa-film', color: '#e50914' },
                { label: 'Serie Favorita', field: 'serie_favorita', type: 'tv', icon: 'fa-tv', color: '#2196f3' },
                { label: 'Juego Favorito', field: 'juego_favorito', type: 'game', icon: 'fa-gamepad', color: '#4caf50' }
              ].map(fav => (
                <div key={fav.field} style={{ marginBottom: '20px', backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.9rem', color: fav.color, fontWeight: 'bold' }}>{fav.label}</label>
                    {formData[fav.field] && (
                      <button type="button" onClick={() => removeFavorite(fav.field)} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '0.8rem' }}>
                        <i className="fa-solid fa-xmark"></i> Quitar
                      </button>
                    )}
                  </div>
                  
                  {!formData[fav.field] ? (
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder={`Buscar ${fav.label.toLowerCase()}...`}
                        value={searchMedia.type === fav.type ? searchMedia.query : ''}
                        onChange={(e) => handleSearchMedia(e.target.value, fav.type)}
                        style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #444', backgroundColor: '#111', color: 'white', fontSize: '14px', outline: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = fav.color; }}
                        onBlur={(e) => { e.target.style.borderColor = '#444'; }}
                      />
                      {searchMedia.loading && searchMedia.type === fav.type && (
                        <div style={{ position: 'absolute', right: '15px', top: '12px' }}>
                          <i className="fa-solid fa-spinner fa-spin" style={{ color: fav.color }}></i>
                        </div>
                      )}
                      
                      {searchMedia.type === fav.type && searchMedia.results.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', backgroundColor: '#181818', border: '1px solid #333', borderRadius: '10px', marginTop: '8px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                          {searchMedia.results.map(res => (
                            <div key={res.id} onClick={() => selectFavorite(res, fav.type)} 
                              style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #252525', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s' }} 
                              onMouseEnter={e => e.currentTarget.style.backgroundColor='#2a2a2a'} 
                              onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                              <img src={fav.type === 'game' ? (res.background_image || '') : (res.poster_path ? 'https://image.tmdb.org/t/p/w92' + res.poster_path : '')} 
                                alt="" style={{ width: '35px', height: '50px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#000' }} />
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{res.title || res.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#666' }}>{res.release_date ? res.release_date.substring(0, 4) : res.released ? res.released.substring(0, 4) : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#111', padding: '10px', borderRadius: '8px' }}>
                       <img src={formData[fav.field].poster_path.startsWith('http') ? formData[fav.field].poster_path : 'https://image.tmdb.org/t/p/w92' + formData[fav.field].poster_path} alt="" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                       <span style={{ fontWeight: 'bold' }}>{formData[fav.field].titulo}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Si inició con red social, evitamos que cambie contraseña por ahora para no romper */}
            {!profile.provider && (
              <>
                <div style={{ borderTop: '1px solid #333', marginTop: '10px', paddingTop: '20px' }}>
                  <label>Nueva Contraseña <small>(Opcional)</small></label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white', marginTop: '5px' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Confirmar Nueva Contraseña</label>
                  <input type="password" name="password_confirmation" value={formData.password_confirmation} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white', marginTop: '5px' }} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button type="submit" disabled={submitting} style={{ padding: '12px 20px', borderRadius: '30px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Guardando...</> : <><i className="fa-solid fa-check"></i> Guardar Cambios</>}
              </button>
              <button type="button" onClick={handleCancel} style={{ padding: '12px 20px', borderRadius: '30px', border: '1px solid #444', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Cancelar</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default Profile;
