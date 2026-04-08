import { useContext } from 'react';
import { AjustesContext } from '../context/AjustesContext';
import { alerts } from '../utils/swal';
import '../index.css';

function Ajustes() {
  const { ajustes, setAjustes } = useContext(AjustesContext);

  const handleTextoChange = (e) => {
    setAjustes({ ...ajustes, tamanoTexto: e.target.value });
  };

  const toggleReducirAnimaciones = () => {
    setAjustes({ ...ajustes, reducirAnimaciones: !ajustes.reducirAnimaciones });
  };

  const resetearAjustes = () => {
    setAjustes({
      tamanoTexto: 'normal',
      reducirAnimaciones: false,
    });
    alerts.success('Ajustes restablecidos correctamente');
  };

  return (
    <div className="ajustes-container">
      <div className="ajustes-header">
        <h1>
          <i className="fa-solid fa-sliders"></i> Ajustes y Accesibilidad
        </h1>
        <p>Personaliza tu experiencia visual y de navegación en Mediaverse.</p>
      </div>

      <div className="ajustes-grid">
        {/* LECTURA Y TEXTO */}
        <div className="ajustes-card">
          <div className="card-header">
            <i className="fa-solid fa-text-height icon-accent"></i>
            <h2>Lectura y Texto</h2>
          </div>

          <div className="ajustes-opcion">
            <label htmlFor="texto-select">Escala de la Interfaz</label>
            <select id="texto-select" onChange={handleTextoChange} value={ajustes.tamanoTexto} className="ajustes-select">
              <option value="normal">Estándar</option>
              <option value="grande">Grande</option>
              <option value="muy-grande">Extra Grande</option>
            </select>
          </div>
        </div>

        {/* NAVEGACIÓN Y ANIMACIONES */}
        <div className="ajustes-card">
          <div className="card-header">
            <i className="fa-solid fa-bolt icon-accent"></i>
            <h2>Rendimiento y Movimiento</h2>
          </div>

          <div className="ajustes-opcion switch-opcion">
            <div className="opcion-info">
              <label>Reducir Animaciones</label>
              <span>Desactiva efectos y transiciones visuales.</span>
            </div>
            <button
              className={`toggle-btn ${ajustes.reducirAnimaciones ? 'active' : ''}`}
              onClick={toggleReducirAnimaciones}
              aria-pressed={ajustes.reducirAnimaciones}
            >
              <div className="toggle-circle"></div>
            </button>
          </div>
        </div>
      </div>

      <div className="ajustes-footer">
        <button className="btn-reset" onClick={resetearAjustes}>
          <i className="fa-solid fa-rotate-right"></i> Restaurar Valores
        </button>
      </div>

    </div>
  );
}

export default Ajustes;
