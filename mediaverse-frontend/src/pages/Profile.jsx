import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar: '',
    password: '',
    password_confirmation: '',
  });

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
          password_confirmation: ''
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
        return Swal.fire('Error', 'La imagen es demasiado grande (Máx 2MB)', 'error');
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
    try {
      if (formData.password && formData.password !== formData.password_confirmation) {
        return Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
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
        Swal.fire({
          icon: 'success',
          title: 'Perfil actualizado',
          text: res.data.message,
          background: '#1e1e1e',
          color: 'white',
          timer: 1500,
          showConfirmButton: false, 
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Error al actualizar tu perfil.',
        background: '#1e1e1e',
        color: 'white',
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      bio: profile.bio || '',
      avatar: profile.avatar || '',
      password: '',
      password_confirmation: ''
    });
    setEditing(false);
  };

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '100px' }}>Cargando perfil...</div>;
  if (!profile) return null;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: 'white' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={editing ? (formData.avatar || profile.avatar || profile.profile_photo_url || `https://ui-avatars.com/api/?name=${profile.name}&background=e50914&color=fff`) : (profile.avatar || profile.profile_photo_url || `https://ui-avatars.com/api/?name=${profile.name}&background=e50914&color=fff`)} 
              alt="Avatar" 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e50914' }} 
            />
            {editing && (
              <label style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#e50914', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <i className="fa-solid fa-camera" style={{ fontSize: '14px' }}></i>
                <input type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              </label>
            )}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{profile.name}</h1>
            <p style={{ margin: 0, color: '#aaa', fontSize: '1.2rem' }}>{profile.email}</p>
            {profile.provider && <span style={{ backgroundColor: '#333', padding: '3px 8px', borderRadius: '5px', fontSize: '0.8rem', marginTop: '5px', display: 'inline-block' }}><i className={`fa-brands fa-${profile.provider}`}></i> Ingresó vía {profile.provider}</span>}
          </div>
        </div>

        {!editing ? (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Biografía</h3>
              <p style={{ color: '#ccc', lineHeight: '1.6' }}>{profile.bio || "No has escrito nada sobre ti aún."}</p>
            </div>
            
            <button onClick={() => setEditing(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              <i className="fa-solid fa-pen"></i> Editar Perfil
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

            {/* Si inició con red social, evitamos que cambie contraseña por ahora para no romper */}
            {!profile.provider && (
              <>
                <div style={{ borderTop: '1px solid #333', marginTop: '10px', paddingTop: '10px' }}>
                  <label>Nueva Contraseña <small>(Opcional)</small></label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white', marginTop: '5px' }} />
                </div>
                <div>
                  <label>Confirmar Nueva Contraseña</label>
                  <input type="password" name="password_confirmation" value={formData.password_confirmation} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white', marginTop: '5px' }} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Guardar Cambios</button>
              <button type="button" onClick={handleCancel} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#555', color: 'white', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>Cancelar</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default Profile;
