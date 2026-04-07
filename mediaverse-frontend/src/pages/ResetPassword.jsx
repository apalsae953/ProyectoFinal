import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { alerts } from '../utils/swal';

function ResetPassword() {
  const [formData, setFormData] = useState({ password: '', password_confirmation: '' });
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extraer token y email de la URL (puestos por Laravel en el email)
    const queryParams = new URLSearchParams(location.search);
    setToken(queryParams.get('token') || '');
    setEmail(queryParams.get('email') || '');
  }, [location]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.password_confirmation) {
      alerts.error('Las contraseñas no coinciden.');
      return;
    }

    try {
      const res = await api.post('/password/reset', {
        token,
        email,
        password: formData.password,
        password_confirmation: formData.password_confirmation
      });

      if (res.data.success) {
        alerts.success('¡Contraseña cambiada!', 'Ya puedes iniciar sesión con tu nueva clave.');
        navigate('/auth');
      }
    } catch (err) {
      alerts.error(err.response?.data?.message || 'El enlace ha caducado o es inválido.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', color: 'white' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#e50914' }}>
          Restablecer Contraseña
        </h2>
        <p style={{ color: '#888', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
            Introduce tu nueva contraseña para la cuenta <b>{email}</b>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="password"
            name="password"
            placeholder="Nueva contraseña"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white' }}
          />
          <input
            type="password"
            name="password_confirmation"
            placeholder="Confirmar nueva contraseña"
            value={formData.password_confirmation}
            onChange={handleChange}
            required
            style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: 'white' }}
          />
          <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            Cambiar Contraseña
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default ResetPassword;
