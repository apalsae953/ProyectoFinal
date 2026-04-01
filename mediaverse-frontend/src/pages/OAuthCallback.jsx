import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

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
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Sesión iniciada correctamente',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: '#1e1e1e',
        color: '#fff',
        iconColor: '#e50914',
      });
      navigate('/dashboard');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error de Autenticación',
        text: 'No se pudo iniciar sesión con la red social.',
        background: '#1e1e1e',
        color: 'white',
      });
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
