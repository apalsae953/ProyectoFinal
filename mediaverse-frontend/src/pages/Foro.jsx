import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { alerts } from '../utils/swal';

/* ─── Helpers ─── */
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'hace unos segundos';
  const m = Math.floor(s / 60); if (m < 60) return 'hace ' + m + ' min';
  const h = Math.floor(m / 60); if (h < 24) return 'hace ' + h + 'h';
  const dd = Math.floor(h / 24); if (dd < 30) return 'hace ' + dd + 'd';
  return new Date(d).toLocaleDateString('es-ES');
};
const TC = { pelicula: '#e50914', serie: '#2196f3', videojuego: '#4caf50' };
const TI = { pelicula: 'fa-film', serie: 'fa-tv', videojuego: 'fa-gamepad' };
const TL = { pelicula: 'Película', serie: 'Serie', videojuego: 'Videojuego' };
const TU = { pelicula: 'movie', serie: 'tv', videojuego: 'game' };
const av = (u) => u?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u?.name || 'U') + '&background=e50914&color=fff&size=80';
const img = (m) => { if (!m?.poster_path) return null; return m.poster_path.startsWith('http') ? m.poster_path : 'https://image.tmdb.org/t/p/w92' + m.poster_path; };

/* ─── Category Pills ─── */
function CatPills({ cats }) {
  if (!cats || cats.length === 0) return <span style={pillStyle('#ff9800')}><i className="fa-solid fa-globe" style={{ fontSize: 9 }}></i> General</span>;
  return cats.map(c => <span key={c} style={pillStyle(TC[c])}><i className={'fa-solid ' + TI[c]} style={{ fontSize: 9 }}></i> {TL[c]}</span>);
}
const pillStyle = (color) => ({ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 4, marginBottom: 2 });

/* ─── Respuesta Recursiva ─── */
function Respuesta({ r, depth, hiloId, onReply, isLogged, currentUserId }) {
  const [showBox, setShowBox] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const maxD = 3;
  const send = async () => {
    if (!text.trim()) return; setSending(true);
    try { await api.post('/threads/' + hiloId + '/replies', { contenido: text, padre_id: r.id }); setText(''); setShowBox(false); onReply(); } catch (e) { console.error(e); }
    setSending(false);
  };
  const deleteReply = async () => {
    const c = await alerts.confirm('¿Eliminar tu comentario?', 'Las respuestas a este comentario también se eliminarán.', 'Eliminar');
    if (c.isConfirmed) { try { await api.delete('/replies/' + r.id); onReply(); } catch (e) { console.error(e); } }
  };
  return (
    <div style={{ marginLeft: depth > 0 ? Math.min(depth, maxD) * 24 : 0, borderLeft: depth > 0 ? '2px solid #333' : 'none', paddingLeft: depth > 0 ? 16 : 0, marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <img src={av(r.user)} alt="" style={{ width: 28, height: 28, borderRadius: '50%', marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#ddd' }}>{r.user?.name}</span>
            <span style={{ fontSize: 11, color: '#555' }}>{timeAgo(r.created_at)}</span>
          </div>
          <p style={{ margin: '4px 0 6px', color: '#ccc', fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word' }}>{r.contenido}</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {isLogged && depth < maxD && (
              <button onClick={() => setShowBox(!showBox)} style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                <i className="fa-solid fa-reply" style={{ marginRight: 4 }}></i> Responder
              </button>
            )}
            {currentUserId && r.user_id === currentUserId && (
              <button onClick={deleteReply} style={{ background: 'none', border: 'none', color: '#e50914', fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600, opacity: 0.7, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
                <i className="fa-solid fa-trash" style={{ marginRight: 4 }}></i> Eliminar
              </button>
            )}
          </div>
          {showBox && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Tu respuesta..." onKeyDown={e => e.key === 'Enter' && send()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: 13, outline: 'none' }} />
              <button onClick={send} disabled={sending} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                {sending ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Enviar'}
              </button>
            </div>
          )}
          {(r.respuestas_hijas || r.respuestasHijas || []).map(c => <Respuesta key={c.id} r={c} depth={depth + 1} hiloId={hiloId} onReply={onReply} isLogged={isLogged} currentUserId={currentUserId} />)}
        </div>
      </div>
    </div>
  );
}

/* ─── FORO ─── */
function Foro() {
  const [hilos, setHilos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('todos');
  const [sort, setSort] = useState('recientes');
  const [hiloActivo, setHiloActivo] = useState(null);
  const [loadingHilo, setLoadingHilo] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const searchTimeout = useRef(null);
  const navigate = useNavigate();
  const isLogged = !!localStorage.getItem('auth_token');
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user_info')); } catch { return null; } })();

  // Create form
  const [formTitulo, setFormTitulo] = useState('');
  const [formContenido, setFormContenido] = useState('');
  const [formCategorias, setFormCategorias] = useState([]); // checkboxes
  const [mediosVinculados, setMediosVinculados] = useState([]); // unlimited
  const [searchMedio, setSearchMedio] = useState('');
  const [searchTipoMedio, setSearchTipoMedio] = useState('todos');
  const [medioResults, setMedioResults] = useState([]);
  const [searchingMedio, setSearchingMedio] = useState(false);
  const [creando, setCreando] = useState(false);

  const fetchHilos = async () => {
    setLoading(true);
    try {
      const p = {}; if (search.trim()) p.search = search; if (categoria !== 'todos') p.categoria = categoria; p.sort = sort;
      const res = await api.get('/threads', { params: p });
      if (res.data.success) setHilos(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchHilos(); }, [categoria, sort]);
  useEffect(() => { if (searchTimeout.current) clearTimeout(searchTimeout.current); searchTimeout.current = setTimeout(() => fetchHilos(), 400); return () => clearTimeout(searchTimeout.current); }, [search]);

  // Abrir o refrescar un hilo. silent=true evita que salga el spinner de carga central
  const openHilo = async (id, silent = false) => { 
    if (!silent) {
        setLoadingHilo(true); 
        setHiloActivo(null); 
    }
    try { 
        const r = await api.get('/threads/' + id); 
        if (r.data.success) setHiloActivo(r.data.data); 
    } catch (e) { 
        console.error(e); 
    } finally {
        if (!silent) setLoadingHilo(false); 
    }
  };

  const refreshHilo = (silent = false) => { if (hiloActivo) openHilo(hiloActivo.id, silent); };

  // Efecto para Refresco Automático (Polling) cada 8 segundos si hay un hilo abierto
  useEffect(() => {
    let interval = null;
    if (hiloActivo && !showCrear) {
        interval = setInterval(() => {
            refreshHilo(true); // Refresco silencioso
        }, 8000); // 8 segundos es un buen equilibrio para no saturar el servidor
    }
    return () => { if (interval) clearInterval(interval); };
  }, [hiloActivo, showCrear]);

  const sendMainReply = async () => { 
    if (!replyText.trim() || !hiloActivo) return; 
    setSendingReply(true); 
    try { 
        await api.post('/threads/' + hiloActivo.id + '/replies', { contenido: replyText }); 
        setReplyText(''); 
        refreshHilo(true); // Actualizamos al momento de comentar
    } catch (e) { 
        console.error(e); 
    } 
    setSendingReply(false); 
  };
  
  const deleteHilo = async (id) => { 
    const c = await alerts.confirm('¿Eliminar este debate?', 'Se perderán todos los comentarios asociados.', 'Eliminar'); 
    if (c.isConfirmed) { 
        try { 
            await api.delete('/threads/' + id); 
            setHiloActivo(null); 
            fetchHilos(); 
        } catch (e) { console.error(e); } 
    } 
  };

  // Toggle categoría checkbox
  const toggleCat = (cat) => {
    setFormCategorias(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // Buscar medios
  const doSearch = async (q) => {
    if (!q.trim()) { setMedioResults([]); return; }
    setSearchingMedio(true);
    try {
      const tipos = searchTipoMedio === 'todos'
        ? [{ ep: '/movies/search', t: 'pelicula' }, { ep: '/tv/search', t: 'serie' }, { ep: '/games/search', t: 'videojuego' }]
        : [{ ep: searchTipoMedio === 'videojuego' ? '/games/search' : searchTipoMedio === 'serie' ? '/tv/search' : '/movies/search', t: searchTipoMedio }];
      const promises = tipos.map(t => api.get(t.ep, { params: { query: q } }).then(r => (r.data.data?.results || r.data.data || []).slice(0, 4).map(item => ({ ...item, _tipo: t.t }))).catch(() => []));
      const all = (await Promise.all(promises)).flat();
      // Filtrar los ya añadidos
      const idsExistentes = new Set(mediosVinculados.map(m => m._tipo + '-' + m.id));
      setMedioResults(all.filter(m => !idsExistentes.has(m._tipo + '-' + m.id)).slice(0, 8));
    } catch (e) { console.error(e); }
    setSearchingMedio(false);
  };

  useEffect(() => { const t = setTimeout(() => doSearch(searchMedio), 400); return () => clearTimeout(t); }, [searchMedio, searchTipoMedio]);

  const addMedio = (m) => { setMediosVinculados(prev => [...prev, m]); setMedioResults([]); setSearchMedio(''); };
  const removeMedio = (idx) => { setMediosVinculados(prev => prev.filter((_, i) => i !== idx)); };

  const crearHilo = async () => {
    if (!formTitulo.trim() || !formContenido.trim()) { alerts.error('Completa el título y contenido'); return; }
    setCreando(true);
    try {
      const body = { titulo: formTitulo, contenido: formContenido, categorias: formCategorias };
      if (mediosVinculados.length > 0) {
        body.medios = mediosVinculados.map(m => ({ api_id: m.id, tipo: m._tipo, titulo: m.title || m.name, poster_path: m._tipo === 'videojuego' ? (m.background_image || '') : (m.poster_path || '') }));
      }
      await api.post('/threads', body);
      setShowCrear(false); setFormTitulo(''); setFormContenido(''); setFormCategorias([]); setMediosVinculados([]); setSearchMedio(''); setMedioResults([]);
      fetchHilos();
      alerts.success('Debate creado');
    } catch (e) { console.error(e); }
    setCreando(false);
  };

  const resetCrear = () => { setShowCrear(false); setFormTitulo(''); setFormContenido(''); setFormCategorias([]); setMediosVinculados([]); setSearchMedio(''); setMedioResults([]); };

  /* ─── RENDER ─── */
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '30px 20px', color: 'white', minHeight: '80vh' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 15 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, letterSpacing: -2, display: 'flex', alignItems: 'center', gap: 15 }}>
            <i class="fa-solid fa-comments" style={{ color: '#e50914' }}></i> Foro
          </h1>
          <p style={{ margin: '5px 0 0', color: '#888', fontSize: '1.1rem' }}>Debates y opiniones de la comunidad MediaVerse</p>
        </div>
        {isLogged && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCrear(true)}
            style={{ padding: '14px 30px', borderRadius: 30, border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-plus"></i> Crear Debate
          </motion.button>
        )}
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 25, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#666' }}></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar debates..."
            style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid #333', backgroundColor: '#111', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#e50914'} onBlur={e => e.target.style.borderColor = '#333'} />
        </div>
        {['todos', 'pelicula', 'serie', 'videojuego', 'general'].map(c => (
          <button key={c} onClick={() => setCategoria(c)}
            style={{ padding: '10px 20px', borderRadius: 20, border: categoria === c ? '1px solid #e50914' : '1px solid #333', backgroundColor: categoria === c ? 'rgba(229,9,20,0.15)' : '#111', color: categoria === c ? '#e50914' : '#aaa', fontWeight: 700, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}>
            {c === 'todos' ? 'Todos' : c === 'general' ? 'General' : TL[c]}
          </button>
        ))}
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid #333', backgroundColor: '#111', color: '#aaa', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          <option value="recientes">Más recientes</option>
          <option value="populares">Más comentados</option>
          <option value="antiguos">Más antiguos</option>
        </select>
      </div>

      {/* DETALLE DE HILO */}
      <AnimatePresence>
        {(hiloActivo || loadingHilo) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ backgroundColor: '#141414', borderRadius: 20, border: '1px solid #2a2a2a', marginBottom: 30, overflow: 'hidden' }}>
            <div style={{ padding: '20px 25px', borderBottom: '1px solid #222' }}>
              <button onClick={() => setHiloActivo(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <i className="fa-solid fa-arrow-left"></i> Volver al Foro
              </button>
            </div>
            {loadingHilo ? (
              <div style={{ padding: 80, textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#e50914' }}></i></div>
            ) : hiloActivo && (
              <div style={{ padding: '25px 30px' }}>
                <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                  <img src={av(hiloActivo.user)} alt="" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #333' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{hiloActivo.user?.name}</span>
                      <span style={{ fontSize: 12, color: '#555' }}>{timeAgo(hiloActivo.created_at)}</span>
                    </div>
                    {/* Category pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      <CatPills cats={hiloActivo.categorias} />
                    </div>
                    <h2 style={{ margin: '8px 0 12px', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1.2 }}>{hiloActivo.titulo}</h2>
                    <p style={{ color: '#ccc', lineHeight: 1.75, fontSize: 15, margin: 0, whiteSpace: 'pre-wrap' }}>{hiloActivo.contenido}</p>
                    {/* Medios vinculados */}
                    {(hiloActivo.medios || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid #222' }}>
                        {hiloActivo.medios.map(m => (
                          <div key={m.id} onClick={() => navigate('/detalle/' + TU[m.tipo] + '/' + m.api_id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', backgroundColor: '#1a1a1a', borderRadius: 12, border: '1px solid #333', cursor: 'pointer', transition: 'border-color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = TC[m.tipo]} onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}>
                            {img(m) && <img src={img(m)} alt="" style={{ width: 30, height: 44, objectFit: 'cover', borderRadius: 4 }} />}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd' }}>{m.titulo}</div>
                              <div style={{ fontSize: 10, color: TC[m.tipo], fontWeight: 700 }}><i className={'fa-solid ' + TI[m.tipo]} style={{ marginRight: 3 }}></i>{TL[m.tipo]}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {currentUser && hiloActivo.user_id === currentUser.id && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20, paddingLeft: 59 }}>
                    <button onClick={() => deleteHilo(hiloActivo.id)} style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: '6px 14px', color: '#e50914', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      <i className="fa-solid fa-trash" style={{ marginRight: 5 }}></i> Eliminar
                    </button>
                  </div>
                )}
                {/* Reply box */}
                {isLogged && (
                  <div style={{ borderTop: '1px solid #222', paddingTop: 20, marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <img src={av(currentUser)} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                      <div style={{ flex: 1 }}>
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="¿Qué opinas? Escribe tu comentario..."
                          style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 70, boxSizing: 'border-box', lineHeight: 1.5 }}
                          onFocus={e => e.target.style.borderColor = '#e50914'} onBlur={e => e.target.style.borderColor = '#333'} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                          <button onClick={sendMainReply} disabled={sendingReply || !replyText.trim()}
                            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', backgroundColor: replyText.trim() ? '#e50914' : '#333', color: 'white', fontWeight: 700, cursor: replyText.trim() ? 'pointer' : 'not-allowed', fontSize: 14 }}>
                            {sendingReply ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }}></i>Comentar</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Comments */}
                <div style={{ borderTop: '1px solid #222', paddingTop: 20, marginTop: 20 }}>
                  <h4 style={{ margin: '0 0 15px', color: '#888', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 900 }}>
                    <i className="fa-solid fa-comments" style={{ marginRight: 8 }}></i>
                    {(hiloActivo.respuestas || []).length} Comentario{(hiloActivo.respuestas || []).length !== 1 ? 's' : ''}
                  </h4>
                  {(hiloActivo.respuestas || []).length === 0
                    ? <p style={{ color: '#555', fontStyle: 'italic', textAlign: 'center', padding: 30 }}>Nadie ha comentado todavía. ¡Sé el primero!</p>
                    : (hiloActivo.respuestas || []).map(r => <Respuesta key={r.id} r={r} depth={0} hiloId={hiloActivo.id} onReply={refreshHilo} isLogged={isLogged} currentUserId={currentUser?.id} />)}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTA DE HILOS */}
      {!hiloActivo && !loadingHilo && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ fontSize: 40, color: '#e50914', display: 'inline-block' }}>
                <i className="fa-solid fa-spinner"></i>
              </motion.div>
            </div>
          ) : hilos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#111', borderRadius: 20, border: '1px solid #222' }}>
              <i className="fa-solid fa-comments" style={{ fontSize: '4rem', color: '#333', marginBottom: 20, display: 'block' }}></i>
              <h3 style={{ fontSize: '1.5rem', marginBottom: 8 }}>{search ? 'Sin resultados' : 'No hay debates aún'}</h3>
              <p style={{ color: '#888' }}>{search ? 'Prueba con otros términos.' : '¡Crea el primer debate de la comunidad!'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {hilos.map((hilo, i) => (
                <motion.div key={hilo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  onClick={() => openHilo(hilo.id)}
                  style={{ display: 'flex', gap: 20, padding: '22px 25px', backgroundColor: '#141414', cursor: 'pointer', borderLeft: '3px solid transparent', transition: 'all 0.15s', borderBottom: '1px solid #1a1a1a' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a1a1a'; e.currentTarget.style.borderLeftColor = '#e50914'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#141414'; e.currentTarget.style.borderLeftColor = 'transparent'; }}>
                  {/* Contador de respuestas */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 60, gap: 4 }}>
                    <i className="fa-solid fa-comments" style={{ color: '#555', fontSize: 18 }}></i>
                    <span style={{ fontWeight: 900, fontSize: 18, color: '#ddd' }}>{hilo.respuestas_count || 0}</span>
                  </div>
                  {/* Posters */}
                  {(hilo.medios || []).filter(m => img(m)).length > 0 && (
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
                      {hilo.medios.filter(m => img(m)).slice(0, 3).map(m => (
                        <img key={m.id} src={img(m)} alt="" style={{ width: 45, height: 65, objectFit: 'cover', borderRadius: 6, border: '1px solid #333' }} />
                      ))}
                      {hilo.medios.filter(m => img(m)).length > 3 && <span style={{ fontSize: 11, color: '#666', marginLeft: 4 }}>+{hilo.medios.filter(m => img(m)).length - 3}</span>}
                    </div>
                  )}
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                      <CatPills cats={hilo.categorias} />
                      <span style={{ fontSize: 11, color: '#555' }}>
                        por <strong style={{ color: '#888' }}>{hilo.user?.name}</strong> · {timeAgo(hilo.created_at)}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hilo.titulo}</h3>
                    <p style={{ margin: 0, color: '#777', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hilo.contenido.substring(0, 160)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL CREAR DEBATE */}
      <AnimatePresence>
        {showCrear && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) resetCrear(); }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              style={{ backgroundColor: '#161616', width: '95%', maxWidth: 650, borderRadius: 20, border: '1px solid #333', overflow: 'hidden', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ padding: '25px 30px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem' }}><i className="fa-solid fa-pen" style={{ color: '#e50914', marginRight: 10 }}></i>Crear Debate</h2>
                <i className="fa-solid fa-xmark" style={{ fontSize: 20, cursor: 'pointer', color: '#555' }} onClick={resetCrear}></i>
              </div>
              <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* CATEGORÍAS — CHECKBOXES */}
                <div>
                  <label style={{ fontSize: 12, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'block' }}>
                    Categorías del debate <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#555' }}>(elige una o varias)</span>
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['pelicula', 'serie', 'videojuego'].map(cat => {
                      const active = formCategorias.includes(cat);
                      return (
                        <button key={cat} onClick={() => toggleCat(cat)}
                          style={{ flex: 1, padding: '12px 10px', borderRadius: 12, border: active ? '2px solid ' + TC[cat] : '2px solid #333', backgroundColor: active ? TC[cat] + '25' : '#111', color: active ? TC[cat] : '#666', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                          <i className={active ? 'fa-solid fa-square-check' : 'fa-regular fa-square'} style={{ fontSize: 16 }}></i>
                          <i className={'fa-solid ' + TI[cat]}></i>
                          {TL[cat]}
                        </button>
                      );
                    })}
                  </div>
                  {formCategorias.length === 0 && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#555' }}>Si no marcas ninguna, se publicará como debate "General".</p>}
                </div>

                {/* TÍTULO */}
                <div>
                  <label style={{ fontSize: 12, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>Título del debate</label>
                  <input value={formTitulo} onChange={e => setFormTitulo(e.target.value)} placeholder="Ej: ¿Qué os ha parecido el final de...?"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #333', backgroundColor: '#111', color: 'white', fontSize: 15, outline: 'none', fontWeight: 700, boxSizing: 'border-box' }} />
                </div>

                {/* CONTENIDO */}
                <div>
                  <label style={{ fontSize: 12, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'block' }}>Contenido</label>
                  <textarea value={formContenido} onChange={e => setFormContenido(e.target.value)} placeholder="Explica tu opinión, pregunta o debate..."
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #333', backgroundColor: '#111', color: 'white', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 100, lineHeight: 1.6, boxSizing: 'border-box' }} />
                </div>

                {/* MEDIOS VINCULADOS */}
                <div>
                  <label style={{ fontSize: 12, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'block' }}>
                    Contenido vinculado <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#555' }}>(opcional · añade los que quieras)</span>
                  </label>

                  {/* Lista de añadidos */}
                  {mediosVinculados.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {mediosVinculados.map((m, idx) => (
                        <div key={m._tipo + '-' + m.id + '-' + idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', backgroundColor: '#111', borderRadius: 10, border: '1px solid #333', fontSize: 13 }}>
                          <i className={'fa-solid ' + TI[m._tipo]} style={{ color: TC[m._tipo], fontSize: 12 }}></i>
                          <span style={{ color: '#ccc', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title || m.name}</span>
                          <button onClick={() => removeMedio(idx)} style={{ background: 'none', border: 'none', color: '#e50914', cursor: 'pointer', fontSize: 14, padding: 0, display: 'flex' }}>
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tipo tabs + search */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {[{ k: 'todos', l: 'Todos', i: 'fa-layer-group', c: '#ff9800' }, { k: 'pelicula', l: 'Pelis', i: 'fa-film', c: '#e50914' }, { k: 'serie', l: 'Series', i: 'fa-tv', c: '#2196f3' }, { k: 'videojuego', l: 'Juegos', i: 'fa-gamepad', c: '#4caf50' }].map(t => (
                      <button key={t.k} onClick={() => { setSearchTipoMedio(t.k); setMedioResults([]); }}
                        style={{ padding: '5px 11px', borderRadius: 8, border: searchTipoMedio === t.k ? '1px solid ' + t.c : '1px solid #333', backgroundColor: searchTipoMedio === t.k ? t.c + '22' : '#0a0a0a', color: searchTipoMedio === t.k ? t.c : '#555', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>
                        <i className={'fa-solid ' + t.i} style={{ marginRight: 3 }}></i>{t.l}
                      </button>
                    ))}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 12 }}></i>
                    <input value={searchMedio} onChange={e => setSearchMedio(e.target.value)} placeholder="Buscar película, serie o juego..."
                      style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid #333', backgroundColor: '#0a0a0a', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  {searchingMedio && <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 4 }}></i>Buscando...</p>}
                  {medioResults.length > 0 && (
                    <div style={{ marginTop: 6, borderRadius: 10, border: '1px solid #333', overflow: 'hidden', maxHeight: 170, overflowY: 'auto' }}>
                      {medioResults.map((m, idx) => (
                        <div key={m._tipo + '-' + m.id + '-' + idx} onClick={() => addMedio(m)}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #222', transition: 'background 0.15s', fontSize: 13, color: '#ccc', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a1a1a'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <i className={'fa-solid ' + TI[m._tipo]} style={{ color: TC[m._tipo], fontSize: 11 }}></i>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title || m.name}</span>
                          <span style={{ fontSize: 10, color: '#555' }}>{m.release_date ? m.release_date.substring(0, 4) : m.released ? m.released.substring(0, 4) : ''}</span>
                          <span style={{ fontSize: 10, color: TC[m._tipo], fontWeight: 700 }}>{TL[m._tipo]}</span>
                          <i className="fa-solid fa-plus" style={{ color: '#4caf50', fontSize: 11 }}></i>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PUBLICAR */}
                <button onClick={crearHilo} disabled={creando}
                  style={{ padding: '14px', borderRadius: 12, border: 'none', backgroundColor: '#e50914', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {creando ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-paper-plane"></i> Publicar Debate</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Foro;
