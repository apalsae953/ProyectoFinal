import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { alerts } from '../utils/swal';

function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      console.log("Token captured from URL:", token);
      localStorage.setItem('auth_token', token);
      window.dispatchEvent(new Event('auth_changed'));
      alerts.success('¡Bienvenido!');
      navigate('/dashboard');
    } else {
      alerts.error('No se pudo iniciar sesión con la red social.');
      navigate('/auth');
    }
  }, [location, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}>
      <h2>Verificando inicio de sesión...</h2>
    </div>
  );
}

export default OAuthCallback;
