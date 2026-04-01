import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import Swal from 'sweetalert2';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const res = await api.post(endpoint, formData);
      if (res.data.success) {
        localStorage.setItem('auth_token', res.data.access_token);
        if (res.data.user) {
          localStorage.setItem('user_info', JSON.stringify(res.data.user));
        }
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: isLogin ? '¡Hola de nuevo!' : '¡Cuenta creada!',
          text: isLogin ? 'Has iniciado sesión' : 'Ya puedes empezar',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#1e1e1e',
          color: '#fff',
          iconColor: '#e50914',
        });
        window.dispatchEvent(new Event('auth_changed'));
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Revisa tus credenciales e inténtalo de nuevo.',
        background: '#1e1e1e',
        color: 'white',
      });
    }
  };

  const handleSocialLogin = (provider) => {
    // Redirige al endpoint de Laravel que a su vez redirige al proveedor
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/${provider}/redirect`;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: 'white' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn-volver"
            style={{ 
              position: 'absolute', 
              top: '-20px', 
              left: '-20px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid #333', 
              borderRadius: '20px',
              padding: '6px 15px',
              color: '#888', 
              cursor: 'pointer', 
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.3s ease',
              zIndex: 100, // Por encima de todo
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }}
          >
            <i className="fa-solid fa-arrow-left"></i> Volver
          </button>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#e50914' }}>
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Nombre de usuario"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white' }}
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white' }}
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white' }}
          />
          <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            {isLogin ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <div style={{ margin: '20px 0', textAlign: 'center', color: '#888' }}>O continúa con</div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handleSocialLogin('google')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#333', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <i className="fa-brands fa-google" style={{ color: '#db4437' }}></i> Google
          </button>
          <button onClick={() => handleSocialLogin('github')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <i className="fa-brands fa-github"></i> GitHub
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#bbb' }}>
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <span onClick={() => setIsLogin(!isLogin)} style={{ color: '#e50914', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}>
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </span>
        </p>
      </motion.div>
    </div>
  );
}

export default Auth;
