import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';

function Home() {
    const [peliculas, setPeliculas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState(localStorage.getItem('mediaverse_busqueda') || '');
    const [buscando, setBuscando] = useState(busqueda !== '');
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [modo, setModo] = useState(localStorage.getItem('mediaverse_modo') || 'movies');

    // Persistimos tanto el modo como la búsqueda
    useEffect(() => {
        localStorage.setItem('mediaverse_modo', modo);
        localStorage.setItem('mediaverse_busqueda', busqueda);
    }, [modo, busqueda]);
    const navigate = useNavigate();
    const [marcados, setMarcados] = useState([]);

    const toggleMarcado = (e, peli) => {
        e.stopPropagation(); // Evitamos que se abra la vista Detalle

        const yaMarcado = marcados.includes(peli.id);

        if (yaMarcado) {
            // Si ya estaba marcado, lo quitamos de la lista
            setMarcados(marcados.filter(id => id !== peli.id));
        } else {
            // Si no estaba marcado, lo añadimos y mostramos la alerta chula
            setMarcados([...marcados, peli.id]);

            Swal.fire({
                title: '¡Visto!',
                text: 'Has marcado "' + peli.title + '" como visto.',
                icon: 'success',
                confirmButtonColor: '#e50914',
                background: '#1e1e1e',
                color: 'white',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    const cargarPopulares = (page = 1, modoActual = modo) => {
        setCargando(true);
        const endpoint = modoActual === 'movies' ? '/movies/popular' : '/tv/popular';

        api.get(endpoint + '?page=' + page)
            .then((respuesta) => {
                setPeliculas(respuesta.data.data);
                setPaginaActual(respuesta.data.current_page);
                setTotalPaginas(respuesta.data.total_pages);
                setCargando(false);
                setBuscando(false);
            })
            .catch((error) => {
                console.error("Error:", error);
                setCargando(false);
            });
    };

    const buscarContenido = (termino, page = 1) => {
        setBuscando(true);
        setCargando(true);
        //El endpoint es la URL a la que le vamos a hacer la petición. Si el modo es 'movies', el endpoint será '/movies/search', y si el modo es 'tv', el endpoint será '/tv/search'. Esto nos permite usar la misma función para buscar tanto películas como series, simplemente cambiando el endpoint según el modo seleccionado.
        const endpoint = modo === 'movies' ? '/movies/search' : '/tv/search';

        api.get(endpoint + '?query=' + termino + '&page=' + page)
            .then((respuesta) => {
                setPeliculas(respuesta.data.data);
                setPaginaActual(respuesta.data.current_page);
                setTotalPaginas(respuesta.data.total_pages);
                setCargando(false);
            })
            .catch((error) => {
                console.error("Error en la búsqueda:", error);
                setCargando(false);
                setBuscando(false);
            });
    };

    // Busqueda a tiemop real
    useEffect(() => {
        // Creamos un temporizador
        const temporizador = setTimeout(() => {
            if (busqueda.trim() !== '') {
                buscarContenido(busqueda, 1); // Si hay texto, busca
            } else {
                cargarPopulares(1, modo); // Si está vacío, carga populares
            }
        }, 500); // 500 milisegundos de espera para que parezca que hay mucho por donde buscar

        // Si el usuario escribe otra tecla antes de 500ms, borramos el temporizador anterior
        return () => clearTimeout(temporizador);

        // Este efecto se dispara cada vez que cambia "busqueda" o "modo"
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busqueda, modo]);

    const cambiarPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            if (buscando) {
                buscarContenido(busqueda, nuevaPagina);
            } else {
                cargarPopulares(nuevaPagina, modo);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div style={{ textAlign: 'center', paddingBottom: '40px' }}>

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                    onClick={() => { setModo('movies'); setPaginaActual(1); }}
                    style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: modo === 'movies' ? '#e50914' : '#333', color: 'white', transition: 'all 0.3s' }}
                ><i className="fa-solid fa-clapperboard"></i> Películas</button>
                <button
                    onClick={() => { setModo('tv'); setPaginaActual(1); }}
                    style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: modo === 'tv' ? '#e50914' : '#333', color: 'white', transition: 'all 0.3s' }}
                ><i className="fa-solid fa-tv"></i> Series</button>
            </div>

            <h1 style={{ color: 'white', marginBottom: '20px' }}>
                {buscando ? 'Resultados para: "' + busqueda + '"' : (modo === 'movies' ? 'Películas Populares' : 'Series Populares')}
            </h1>

            {/* BARRA DE BÚSQUEDA EN TIEMPO REAL */}
            <div style={{ marginBottom: '30px', position: 'relative', width: '350px', margin: '0 auto' }}>
                <input
                    type="text"
                    placeholder={modo === 'movies' ? "Escribe para buscar películas..." : "Escribe para buscar series..."}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{ padding: '10px 45px 10px 20px', width: '100%', borderRadius: '25px', border: '2px solid #333', backgroundColor: '#1e1e1e', color: 'white', outline: 'none', fontSize: '16px' }}
                />
                {busqueda && (
                    <button 
                        onClick={() => setBusqueda('')}
                        style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px' }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </div>

            {/* RENDERIZADO DE TARJETAS */}
            {cargando ? (
                <div style={{ padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <motion.div
                        animate={{ 
                            rotate: [0, -10, 0],
                        }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        style={{ fontSize: '60px', color: '#e50914' }}
                    >
                        <i className="fa-solid fa-clapperboard"></i>
                    </motion.div>
                    <h2 style={{ color: 'white', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '1.2rem' }}>Preparando la función...</h2>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                        {peliculas.map((peli) => (
                            <div
                                key={peli.id}
                                style={{
                                    width: '200px',
                                    backgroundColor: '#1e1e1e',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onClick={() => navigate('/detalle/' + (modo === 'movies' ? 'movie' : 'tv') + '/' + peli.id)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {/* BOTÓN FLOTANTE "VISTO" MEJORADO */}
                                <button
                                    onClick={(e) => toggleMarcado(e, peli)}
                                    style={{
                                        position: 'absolute', top: '15px', right: '15px',
                                        backgroundColor: marcados.includes(peli.id) ? '#e50914' : 'rgba(0,0,0,0.6)',
                                        border: marcados.includes(peli.id) ? 'none' : '1px solid white',
                                        borderRadius: '50%', width: '35px', height: '35px', color: 'white',
                                        cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 10, transition: 'all 0.3s ease'
                                    }}
                                    title="Marcar como visto"
                                >
                                    {marcados.includes(peli.id) ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-eye"></i>}
                                </button>

                                {/* CONTENIDO DE LA TARJETA */}
                                <div>
                                    <img src={peli.poster_path ? 'https://image.tmdb.org/t/p/w500' + peli.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'} alt={peli.title} style={{ width: '100%', borderRadius: '4px' }} />
                                    <h3 style={{ fontSize: '15px', margin: '12px 0 5px 0', lineHeight: '1.2' }}>
                                        {peli.title} <span style={{ color: '#777', fontSize: '12px' }}>({peli.year})</span>
                                    </h3>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px', fontWeight: 'bold' }}>
                                    <span style={{ color: '#66cc33' }}>
                                        <i className="fa-solid fa-star"></i> {peli.vote_average ? peli.vote_average.toFixed(1) : 'N/A'}
                                    </span>
                                    <span style={{ color: '#4caf50' }}><i className="fa-solid fa-users"></i> {peli.puntuacion_usuarios ? peli.puntuacion_usuarios : '-'}</span>
                                </div>
                            </div>
                        ))} 
                    </div>

                    {totalPaginas > 1 && (
                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                            <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} style={{ padding: '10px 20px', backgroundColor: paginaActual === 1 ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}><i className="fa-solid fa-caret-left"></i> Anterior</button>
                            <span style={{ color: 'white', fontSize: '16px' }}>Página {paginaActual} de {totalPaginas}</span>
                            <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} style={{ padding: '10px 20px', backgroundColor: paginaActual === totalPaginas ? '#555' : '#e50914', color: 'white', border: 'none', borderRadius: '5px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Siguiente <i className="fa-solid fa-caret-right"></i></button>
                        </div>
                    )}

                    {!cargando && peliculas.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ padding: '100px 20px', textAlign: 'center' }}
                        >
                            <i className="fa-solid fa-film" style={{ fontSize: '4rem', color: '#333', marginBottom: '20px' }}></i>
                            <h1 style={{ fontSize: '3.5rem', color: 'white', fontWeight: 'bold', margin: 0 }}>FIN DE LA FUNCIÓN</h1>
                            <p style={{ color: '#888', fontSize: '1.2rem', marginTop: '10px', marginBottom: '30px' }}>No hemos encontrado esa escena en nuestro archivo.</p>
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: '#e50914' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setBusqueda('')}
                                style={{ padding: '12px 35px', borderRadius: '30px', border: '1px solid #e50914', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                REINTENTAR BÚSQUEDA
                            </motion.button>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}

export default Home;