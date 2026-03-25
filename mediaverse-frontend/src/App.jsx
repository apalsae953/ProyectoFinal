import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import Home from './pages/Home';
import Games from './pages/Games';
import Detalle from './pages/Detalle'; 
import Actor from './pages/Actor';

function App() {
  // ESTADO PARA CONTROLAR SI EL MENÚ ESTÁ ABIERTO O CERRADO
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <Router>
      <div style={{ backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'sans-serif', position: 'relative' }}>
        
        {/* BARRA DE NAVEGACIÓN SUPERIOR */}
        <nav style={{ padding: '20px', backgroundColor: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Lado Izquierdo: Logo y Secciones Principales */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <h2 style={{ color: '#e50914', margin: 0 }}><i className="fa-solid fa-clapperboard"></i> Mediaverse</h2>
            <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Cine y Series</Link>
            <Link to="/juegos" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Videojuegos</Link>
            <Link to="/foro" style={{ color: 'gray', textDecoration: 'none' }}>Foro</Link>
            <Link to="/kahoot" style={{ color: 'gray', textDecoration: 'none' }}>Trivia</Link>
          </div>

          {/* Lado Derecho: Botón del Menú Hamburguesa */}
          <div>
            <button 
              onClick={() => setMenuAbierto(!menuAbierto)} // Cambia de abierto a cerrado y viceversa
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
        </nav>

        {/* PANEL DEL MENÚ LATERAL (Se oculta si es false) */}
        {menuAbierto && (
          <div style={{
            position: 'absolute', top: '70px', right: '0', width: '250px', 
            backgroundColor: '#1a1a1a', boxShadow: '-4px 4px 10px rgba(0,0,0,0.5)', 
            padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 1000,
            borderBottomLeftRadius: '10px'
          }}>
            <h3 style={{ color: 'white', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: 0 }}>Mi Cuenta</h3>
            
            {/* Enlaces del menú hamburguesa*/}
            <a href="#" style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px' }}><i className="fa-solid fa-user"></i> Mi Perfil</a>
            <a href="#" style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px' }}><i className="fa-solid fa-heart"></i> Mis Favoritos</a>
            <a href="#" style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px' }}><i className="fa-solid fa-pen-to-square"></i> Mis Reseñas</a>
            <a href="#" style={{ color: '#ccc', textDecoration: 'none', fontSize: '16px' }}><i className="fa-solid fa-gear"></i> Ajustes</a>
            
            <hr style={{ borderColor: '#333', width: '100%' }} />
            
            <a href="#" style={{ color: '#e50914', textDecoration: 'none', fontSize: '16px', fontWeight: 'bold' }}><i className="fa-solid fa-door-open"></i> Iniciar Sesión / Registro</a>
          </div>
        )}

        {/* CONTENIDO DE LAS PÁGINAS */}
        {/* Si hacemos clic en cualquier parte de la pantalla, cerramos el menú */}
        <div style={{ padding: '20px' }} onClick={() => setMenuAbierto(false)}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/juegos" element={<Games />} />
            <Route path="/foro" element={<h2 style={{color: 'white'}}>Foro (Próximamente)</h2>} />
            <Route path="/kahoot" element={<h2 style={{color: 'white'}}>Kahoot (Próximamente)</h2>} />
            <Route path="/detalle/:tipo/:id" element={<Detalle />} />
            <Route path="/actor/:id" element={<Actor />} />
          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;