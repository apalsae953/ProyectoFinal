import Swal from 'sweetalert2';

/**
 * UTILS: SWEETALERT2 PERSONALIZADO (MediaVerse Premium)
 * Centraliza la configuración de las alertas para que todas hereden 
 * el mismo estilo "chulo" y el z-index correcto.
 */

// Configuración base para Toasts (Notificaciones pequeñas)
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#161616',
    color: '#fff',
    iconColor: '#e50914',
    customClass: {
        popup: 'mediaverse-toast'
    },
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

/**
 * Diccionario centralizado de alertas (Clean Code)
 * Úsalo como: alerts.success('Título') o alerts.confirm('Título', 'Texto')
 */
export const alerts = {
    // Éxito rápido
    success: (title) => Toast.fire({ icon: 'success', title }),
    
    // Error (Volvemos a Toast por petición del usuario, con límite de texto)
    error: (title, text = null) => {
        let finalTitle = title;
        // Si el texto es una burrada (como un base64), lo cortamos o lo ignoramos
        if (text && text.length > 150) {
            text = text.substring(0, 150) + '...';
        }

        return Toast.fire({ 
            icon: 'error', 
            title: finalTitle,
            text: text // SweetAlert2 Toast permite un pequeño texto debajo
        });
    },

    // Advertencia rápida
    warning: (title) => Toast.fire({ icon: 'warning', title }),
    
    // Info rápida
    info: (title, text = null) => {
        if (text && text.length > 150) text = text.substring(0, 150) + '...';
        return Toast.fire({ icon: 'info', title, text });
    },
    
    // Confirmación (Modales)
    confirm: async (title, text, confirmText = 'Sí, continuar') => {
        return Swal.fire({
            title,
            text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e50914',
            cancelButtonColor: '#333',
            confirmButtonText: confirmText,
            cancelButtonText: 'Cancelar',
            background: '#161616',
            color: '#fff'
        });
    },

    // Sesión requerida (Redirección activa)
    loginRequired: (navigate, title = '¡Sesión requerida!') => {
        Swal.fire({
            title: title,
            html: '<p style="color:#888; font-size:1.1rem; margin-top:10px;">Para realizar esta acción primero debes iniciar sesión en tu cuenta de MediaVerse.</p>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-right-to-bracket"></i> IR A INICIAR SESIÓN',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#e50914',
            cancelButtonColor: '#333',
            background: '#161616',
            color: '#fff',
            padding: '2rem'
        }).then((result) => {
            if (result.isConfirmed) {
                navigate('/auth');
            }
        });
    },

    // Entrada de datos del usuario
    prompt: async (title, text, inputPlaceholder, confirmButtonText = 'Enviar') => {
        return Swal.fire({
            title,
            text,
            input: 'email',
            inputPlaceholder,
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#e50914',
            cancelButtonColor: '#333',
            background: '#161616',
            color: '#fff',
            inputAttributes: {
                autocapitalize: 'off',
                style: 'background-color: #333; color: white; border: 1px solid #444; margin-top: 15px;'
            }
        });
    }
};

/**
 * Mantenemos estas funciones por compatibilidad con las páginas ya refactorizadas
 */
export const notify = (title, icon = 'success') => alerts[icon](title);
export const confirmAction = (title, text, confirmText) => alerts.confirm(title, text, confirmText);
export const loginRequired = (navigate, title) => alerts.loginRequired(navigate, title);

export default Swal;
