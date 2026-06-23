// app.jsx — App shell, LoginScreen, Masthead, TweaksPanel, auth
const { useState, useEffect, useReducer, useRef, useMemo } = React;

// Remove fundo branco do PNG via canvas: pixels com os 3 canais > 230 viram transparentes.
// Abordagem pixel-a-pixel (sem BFS) é suficiente para logos que não têm branco no design.
function useLogo(src) {
  const [processed, setProcessed] = useState(null);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 230 && d[i+1] > 230 && d[i+2] > 230) d[i+3] = 0;
        }
        ctx.putImageData(id, 0, 0);
        setProcessed(canvas.toDataURL('image/png'));
      } catch(e) { setProcessed(src); }
    };
    img.onerror = () => setProcessed(src);
    img.src = src;
  }, [src]);
  return processed; // null até o canvas terminar; componentes usam fallback
}

// Remove fundo preto do PNG via canvas: pixels com os 3 canais < 30 viram transparentes.
function useLogoDark(src) {
  const [processed, setProcessed] = useState(null);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 30 && d[i+1] < 30 && d[i+2] < 30) d[i+3] = 0;
        }
        ctx.putImageData(id, 0, 0);
        setProcessed(canvas.toDataURL('image/png'));
      } catch(e) { setProcessed(src); }
    };
    img.onerror = () => setProcessed(src);
    img.src = src;
  }, [src]);
  return processed;
}

const ACCENT_SWATCHES = [
  { name:'Amarelo Yes', value:'#ffc41f' },
  { name:'Dourado',     value:'#c9921a' },
  { name:'Vermelho',    value:'#d8392f' },
  { name:'Navy',        value:'#2c4978' },
  { name:'Verde',       value:'#3b6e3a' },
];

const SS_KEY = 'ym-session'; // sessionStorage key

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, state, logoSrc }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro]         = useState('');
  const [showPw, setShowPw]     = useState(false);

  const handleLogin = () => {
    if (!username.trim()) { setErro('Informe o usuário.'); return; }
    if (!password)        { setErro('Informe a senha.');   return; }
    const usuarios = state.usuarios || [];
    const user = usuarios.find(u =>
      u.username.toLowerCase() === username.trim().toLowerCase() &&
      u.password === password
    );
    if (!user) { setErro('Usuário ou senha incorretos.'); return; }
    onLogin(user);
  };

  return (
    <div className="login-page">
      <div className="login-video-bg">
        <iframe
          src="https://www.youtube.com/embed/n7GdFFlYFug?autoplay=1&mute=1&loop=1&playlist=n7GdFFlYFug&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&fs=0&playsinline=1"
          allow="autoplay; encrypted-media"
          title="bg"
        />
      </div>
      <div className="login-video-overlay"/>
      <div className="login-masthead">
        <img
          src={logoSrc || 'assets/logo.png'} alt="YES! Mocelin"
          className="masthead-logo" style={{ height:64 }}
          onError={e=>{ e.target.style.display='none'; }}
        />
        <div className="masthead-tagline-wrap">
          <hr className="tagline-rule"/>
          <span className="masthead-tagline">boletim semanal da equipe comercial</span>
        </div>
      </div>

      <div className="login-card">
        <div className="section-eyebrow" style={{ marginBottom:4 }}>
          EXPEDIENTE · <span className="accent">IDENTIFICAÇÃO</span>
        </div>
        <h1 style={{ fontFamily:'Anton,sans-serif', fontSize:'clamp(26px,4vw,36px)', textTransform:'uppercase', lineHeight:1, marginBottom:6 }}>
          Acesso ao sistema
        </h1>
        <p style={{ fontFamily:'Newsreader,serif', fontStyle:'italic', fontSize:14, color:'var(--ink-3)', marginBottom:16 }}>
          Informe suas credenciais para continuar.
        </p>
        <hr style={{ border:'none', borderTop:'2px solid var(--ink)', marginBottom:20 }}/>

        <form onSubmit={e=>{ e.preventDefault(); handleLogin(); }} autoComplete="on">
          <div className="field-group">
            <label className="field-label">Usuário</label>
            <input
              className="field-input"
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={e=>{ setUsername(e.target.value); setErro(''); }}
              placeholder="Nome de usuário..."
              autoFocus
            />
          </div>

          <div className="field-group">
            <label className="field-label">Senha</label>
            <div style={{ position:'relative' }}>
              <input
                className="field-input"
                type={showPw?'text':'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={e=>{ setPassword(e.target.value); setErro(''); }}
                placeholder="Senha..."
                style={{ paddingRight:44 }}
              />
              <button
                type="button"
                onClick={()=>setShowPw(s=>!s)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--ink-4)', fontSize:12, fontFamily:'JetBrains Mono,monospace', letterSpacing:'.04em' }}
              >
                {showPw?'OCULTAR':'VER'}
              </button>
            </div>
          </div>

          {erro && <div className="error-box">{erro}</div>}
          <button type="submit" style={{display:'none'}} aria-hidden="true"/>
          <PrimaryBtn onClick={handleLogin}>Entrar</PrimaryBtn>
        </form>
      </div>

      <div className="login-footer">YES! MOCELIN · BOLETIM COMERCIAL</div>
    </div>
  );
}

// ── MASTHEAD ──────────────────────────────────────────────────────────────────
function Masthead({ tab, setTab, currentUser, onLogout, logoSrc }) {
  const ALL_TABS = [
    { num:'01', label:'RANKING',  idx:0 },
    { num:'02', label:'LANÇAR',   idx:1, roles:['gerencia'] },
    { num:'03', label:'VENDEDOR', idx:2 },
    { num:'04', label:'FEED',     idx:3 },
    { num:'05', label:'AJUSTES',  idx:4, roles:['gerencia'] },
    { num:'05', label:'PERFIL',   idx:5, roles:['vendedor'] },
    { num:'06', label:'CURSOS',    idx:6 },
    { num:'07', label:'CAMPANHAS', idx:7 },
  ];

  const visibleTabs = ALL_TABS.filter(t =>
    !t.roles || t.roles.includes(currentUser?.role)
  );

  const now    = new Date();
  const ed     = getISOWeek(now).week;
  const hojeStr = now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();

  return (
    <header className="masthead">
      <div className="masthead-top">
        <span className="masthead-date">{hojeStr} · BOLETIM COMERCIAL</span>
      </div>

      <div className="masthead-logo-row">
        <img
          src={logoSrc || 'assets/logo.png'} alt="YES! Mocelin"
          className="masthead-logo"
          onError={e=>{ e.target.style.display='none'; }}
        />
        <div className="masthead-tagline-wrap">
          <hr className="tagline-rule"/>
          <span className="masthead-tagline">boletim semanal da equipe comercial</span>
        </div>
      </div>

      <nav className="masthead-nav">
        {visibleTabs.map(t => (
          <button
            key={t.idx}
            className={`nav-tab${tab===t.idx?' active':''}`}
            onClick={()=>setTab(t.idx)}
          >
            <span className="nav-num">{t.num}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}

        {currentUser && (
          <div className="masthead-user">
            <span>{currentUser.username}</span>
            <span className={`role-badge ${currentUser.role}`}>
              {currentUser.role==='gerencia'?'Gerência':'Vendedor'}
            </span>
            <button className="btn-logout" onClick={onLogout}>Sair</button>
          </div>
        )}
      </nav>
    </header>
  );
}

// ── TWEAKS PANEL ──────────────────────────────────────────────────────────────
function TweaksPanel({ theme, setTheme, accent, setAccent, density, setDensity, dispatch }) {
  const [open, setOpen] = useState(false);

  const handleReset = () => {
    if (window.confirm('Restaurar dados padrão? Todos os lançamentos serão perdidos.')) {
      dispatch({ type:'RESET' }); setOpen(false);
    }
  };

  const setAccentVar = val => {
    document.documentElement.style.setProperty('--brand-yellow', val);
    document.documentElement.style.setProperty('--accent', val);
    setAccent(val);
  };

  return (
    <>
      <button className="tweaks-btn" onClick={()=>setOpen(o=>!o)} title="Ajustes visuais">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.37 13.37l1.41 1.41M3.22 14.78l1.41-1.41M13.37 4.63l1.41-1.41"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="tweaks-panel">
          <div className="tweaks-title">Ajustes</div>

          <div className="tweaks-section">
            <span className="tweaks-section-label">Tema</span>
            <div className="seg-control" style={{width:'100%'}}>
              {[['paper','Paper'],['carbon','Carbon'],['bright','Bright']].map(([t,l])=>(
                <button key={t} className={`seg-btn${theme===t?' active':''}`}
                  style={{flex:1,textAlign:'center'}} onClick={()=>setTheme(t)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="tweaks-section">
            <span className="tweaks-section-label">Tinta de destaque</span>
            <div className="swatch-row">
              {ACCENT_SWATCHES.map(s=>(
                <div key={s.value}
                  className={`accent-swatch${accent===s.value?' active':''}`}
                  style={{background:s.value}} title={s.name}
                  onClick={()=>setAccentVar(s.value)}/>
              ))}
            </div>
          </div>

          <div className="tweaks-section">
            <span className="tweaks-section-label">Densidade</span>
            <div className="seg-control" style={{width:'100%'}}>
              {[['','Regular'],['density-compact','Compact']].map(([d,l])=>(
                <button key={l} className={`seg-btn${density===d?' active':''}`}
                  style={{flex:1,textAlign:'center'}} onClick={()=>setDensity(d)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-danger" style={{width:'100%',marginTop:4}} onClick={handleReset}>
            Restaurar dados padrão
          </button>
        </div>
      )}
    </>
  );
}

// ── SECURITY CAMERA ───────────────────────────────────────────────────────────
function SecurityCamera() {
  const lensRef             = useRef(null);
  const [pupil, setPupil]   = useState({ x: 0, y: 0 });
  const [angle, setAngle]   = useState(0);
  const [blink, setBlink]   = useState(true);
  const [hover, setHover]   = useState(false);

  useEffect(() => {
    const onMove = e => {
      if (!lensRef.current) return;
      const r  = lensRef.current.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const k    = dist > 0 ? Math.min(5, dist / 40) : 0;
      setPupil({ x: dist > 0 ? (dx / dist) * k : 0, y: dist > 0 ? (dy / dist) * k : 0 });
      setAngle(Math.atan2(dy, dx) * (180 / Math.PI));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 900);
    return () => clearInterval(id);
  }, []);

  const tilt = `rotate(${(angle * 0.16).toFixed(2)}deg)`;

  return (
    <div style={{ position:'fixed', top:8, right:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, zIndex:9999, pointerEvents:'none' }}>

      {/* ── Câmera (montagem horizontal — parede direita) ── */}
      <div style={{ pointerEvents:'auto', display:'flex', flexDirection:'row', alignItems:'center', filter:'drop-shadow(-2px 3px 0 rgba(0,0,0,0.28))' }}>

        {/* Corpo rotacionável */}
        <div style={{ transform:tilt, transition:'transform 180ms cubic-bezier(0.25,0.46,0.45,0.94)', position:'relative' }}>

          {/* Hood */}
          <div style={{ position:'absolute', top:-5, left:2, right:2, height:6, background:'#111', borderRadius:'2px 2px 0 0', transform:'rotate(-1deg)' }}/>

          {/* Corpo */}
          <div style={{ width:44, height:26, background:'linear-gradient(to bottom,#2b2b2e,#19191c)', border:'1.2px solid #000', borderRadius:'5px 3px 3px 10px', display:'flex', alignItems:'center', paddingLeft:5, position:'relative' }}>

            {/* Lente */}
            <div ref={lensRef} style={{ width:20, height:20, borderRadius:'50%', background:'radial-gradient(circle at 30% 30%,#444,#0a0a0a)', border:'2px solid #000', boxShadow:'inset 0 0 3px rgba(0,0,0,0.9),inset 0 1px 5px rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', flexShrink:0 }}>
              <div className="cam-scan"/>
              {/* Pupila */}
              <div style={{ width:7, height:7, borderRadius:'50%', background:'radial-gradient(circle at 40% 35%,#1a3a5a,#050913)', boxShadow:'inset 0 0 3px rgba(80,130,200,0.4)', position:'absolute', transition:'transform 80ms linear', transform:`translate(${pupil.x.toFixed(2)}px,${pupil.y.toFixed(2)}px)` }}/>
              {/* Reflexo */}
              <div style={{ position:'absolute', top:3, left:3, width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,0.55)', filter:'blur(0.3px)', pointerEvents:'none' }}/>
            </div>

            {/* LED */}
            <div style={{ position:'absolute', top:4, right:6, width:3.2, height:3.2, borderRadius:'50%', background:'#d8392f', opacity:blink?1:0.3, boxShadow:blink?'0 0 4px 2px rgba(216,57,47,0.5)':'none', transition:'opacity 200ms,box-shadow 200ms' }}/>
          </div>
        </div>

        {/* Braço horizontal */}
        <div style={{ width:10, height:7, background:'linear-gradient(to bottom,#6e6e6e,#484848)', borderTop:'1px solid #888', borderBottom:'1px solid #2a2a2a' }}/>

        {/* Placa de parede — flush na borda direita */}
        <div style={{ width:7, height:30, background:'linear-gradient(to right,#5a5a5a,#6a6a6a)', borderLeft:'1px solid #333', borderTop:'1px solid #777', borderBottom:'1px solid #333', borderRadius:'1px 0 0 1px', position:'relative', flexShrink:0 }}>
          <div style={{ position:'absolute', top:5, left:'50%', transform:'translateX(-50%)', width:3, height:3, borderRadius:'50%', background:'#222', boxShadow:'inset 0 0 1px rgba(255,255,255,0.25)' }}/>
          <div style={{ position:'absolute', bottom:5, left:'50%', transform:'translateX(-50%)', width:3, height:3, borderRadius:'50%', background:'#222', boxShadow:'inset 0 0 1px rgba(255,255,255,0.25)' }}/>
        </div>
      </div>

      {/* ── Placa ── */}
      <div
        className="cam-sign"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ pointerEvents:'auto', width:132, background:'#ffc41f', border:'1.5px solid #000', boxShadow:'2px 3px 0 rgba(0,0,0,0.2)', borderRadius:2, padding:'4px 6px', position:'relative', transform:hover?'rotate(0deg) scale(1.05)':'rotate(-2deg)', transition:'transform 200ms ease', overflow:'hidden' }}
      >
        {/* Fitas adesivas */}
        <div style={{ position:'absolute', top:5, left:-5, width:14, height:5, background:'rgba(255,255,255,0.4)', transform:'rotate(-32deg)', borderRadius:1 }}/>
        <div style={{ position:'absolute', bottom:5, right:-5, width:14, height:5, background:'rgba(255,255,255,0.4)', transform:'rotate(-32deg)', borderRadius:1 }}/>

        {/* Cabeçalho */}
        <div style={{ display:'flex', alignItems:'center', gap:3, borderBottom:'1px dashed rgba(0,0,0,0.3)', paddingBottom:2, marginBottom:3 }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="4" r="3.2" stroke="#cc1111" strokeWidth="1"/>
            <circle cx="4" cy="4" r="1.5" fill="#cc1111"/>
          </svg>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:7.5, fontWeight:700, color:'#cc1111', letterSpacing:'.06em', textTransform:'uppercase' }}>ATENÇÃO</span>
        </div>

        {/* Corpo da placa */}
        <div style={{ textAlign:'center', lineHeight:1.15, marginBottom:3 }}>
          <div style={{ fontFamily:"'Anton',sans-serif", fontSize:15, color:'#111', textTransform:'uppercase', letterSpacing:'.02em' }}>SORRIA!</div>
          <div style={{ fontFamily:"'Newsreader',serif", fontStyle:'italic', fontSize:8.5, color:'#444' }}>você está</div>
          <div style={{ fontFamily:"'Anton',sans-serif", fontSize:15, color:'#cc1111', textTransform:'uppercase', letterSpacing:'.02em' }}>FILMADO</div>
        </div>

        {/* Rodapé */}
        <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px dashed rgba(0,0,0,0.3)', paddingTop:2 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:7, color:'#222', letterSpacing:'.05em' }}>24H · CFTV</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:7, color:blink?'#d8392f':'#999', letterSpacing:'.05em', transition:'color 300ms' }}>● REC</span>
        </div>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
function App() {
  const [state, baseDispatch] = useReducer(reducer, SEED_STATE);
  const [tab, setTab]     = useState(0);
  const [toasts, setToasts]   = useState([]);
  const [theme, setTheme]     = useState('carbon');
  const [accent, setAccent]   = useState('#ffc41f');
  const [viewDate, setViewDate] = useState(''); // '' = hoje (tempo real)
  const [density, setDensity] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoSrc     = useLogo('assets/logo.png');
  const logoDarkSrc = useLogoDark('assets/logo-dark.png');

  // Dispatch: atualiza estado local imediatamente e sincroniza com Supabase em background
  const dispatch = action => {
    baseDispatch(action);
    syncAction(action);
  };

  // Carrega dados do Supabase na inicialização
  useEffect(()=>{
    loadFromSupabase()
      .then(data => { baseDispatch({ type:'SET_STATE', payload:data }); })
      .catch(e => console.error('[App] Falha ao carregar Supabase:', e))
      .finally(() => setLoading(false));
    const session = sessionStorage.getItem(SS_KEY);
    if (session) {
      try { setCurrentUser(JSON.parse(session)); } catch(e) {}
    }
  }, []);

  // Apply theme + density
  useEffect(()=>{
    document.body.className = [`theme-${theme}`, density].filter(Boolean).join(' ');
  }, [theme, density]);

  // Guard: if vendedor's allowed tabs are limited, redirect if on a restricted tab
  useEffect(()=>{
    if (currentUser?.role === 'vendedor' && (tab===1||tab===4)) {
      setTab(0);
    }
  }, [currentUser, tab]);

  const handleLogin = user => {
    setCurrentUser(user);
    sessionStorage.setItem(SS_KEY, JSON.stringify(user));
    // Vendedor defaults to their own profile tab
    if (user.role === 'vendedor') setTab(2);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(SS_KEY);
    setTab(0);
  };

  const addToast = (msg, type='success') => {
    const id = Date.now() + Math.random();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3200);
  };

  // Hooks devem vir antes de qualquer return condicional
  const stateView = useMemo(() => {
    const base = viewDate ? {
      ...state,
      lancamentos:  state.lancamentos.filter(l  => l.data  <= viewDate + 'T23:59:59.999Z'),
      comprovantes: (state.comprovantes||[]).filter(c => c.data <= viewDate + 'T23:59:59.999Z'),
    } : state;
    // Ranking geral: exclui lançamentos de campanha (campanhaId definido)
    return {
      ...base,
      lancamentos: (base.lancamentos||[]).filter(l => !l.campanhaId),
      lancamentosCompletos: base.lancamentos || [], // inclui campanha (usado no FeedTab e CampanhasTab)
    };
  }, [state, viewDate]);

  const hoje = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="app-shell" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'Anton,sans-serif',fontSize:32,letterSpacing:'.06em',textTransform:'uppercase'}}>YES! MOCELIN</div>
          <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--ink-4)',marginTop:10,letterSpacing:'.08em'}}>CARREGANDO DADOS...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app-shell">
        <LoginScreen onLogin={handleLogin} state={state} logoSrc={logoDarkSrc}/>
        <ToastContainer toasts={toasts}/>
        <SecurityCamera/>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Masthead tab={tab} setTab={setTab} currentUser={currentUser} onLogout={handleLogout} logoSrc={theme==='carbon'&&logoDarkSrc?logoDarkSrc:logoSrc}/>

      {/* Banner modo histórico */}
      {viewDate && (
        <div className="history-mode-bar">
          <span>
            Visualizando: <strong>{new Date(viewDate+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</strong>
          </span>
          <button onClick={() => setViewDate('')} className="history-mode-close">× Voltar ao tempo real</button>
        </div>
      )}

      {/* Seletor de data histórica — apenas gerência */}
      {currentUser?.role === 'gerencia' && (
        <div className="history-date-bar">
          <span className="history-date-label">Voltar no tempo:</span>
          <input
            type="date"
            className="history-date-input"
            value={viewDate}
            max={hoje}
            onChange={e => setViewDate(e.target.value)}
          />
          {viewDate && <button className="btn-ghost" style={{fontSize:11}} onClick={() => setViewDate('')}>Hoje</button>}
        </div>
      )}

      <main className="main-col">
        {tab===0 && <RankingTab  state={stateView} dispatch={dispatch} currentUser={currentUser} viewDate={viewDate}/>}
        {tab===1 && <LancarTab   state={state}     dispatch={dispatch} addToast={addToast} currentUser={currentUser}/>}
        {tab===2 && (
          <VendedorTab
            state={stateView}
            dispatch={dispatch}
            addToast={addToast}
            currentUser={currentUser}
            viewDate={viewDate}
          />
        )}
        {tab===3 && <FeedTab state={{...stateView, lancamentos: stateView.lancamentosCompletos}} dispatch={dispatch} addToast={addToast} currentUser={currentUser}/>}
        {tab===5 && (
          <PerfilTab
            state={state}
            dispatch={dispatch}
            addToast={addToast}
            currentUser={currentUser}
          />
        )}
        {tab===4 && (
          <ConfigTab
            state={state}
            dispatch={dispatch}
            addToast={addToast}
            currentUser={currentUser}
          />
        )}
        {tab===6 && (
          <CursosTab
            state={state}
            dispatch={dispatch}
            addToast={addToast}
            currentUser={currentUser}
          />
        )}
        {tab===7 && (
          <CampanhasTab
            state={{...state, lancamentos: state.lancamentos}}
            dispatch={dispatch}
            addToast={addToast}
            currentUser={currentUser}
          />
        )}
      </main>

      <ToastContainer toasts={toasts}/>
      <TweaksPanel
        theme={theme}   setTheme={setTheme}
        accent={accent} setAccent={setAccent}
        density={density} setDensity={setDensity}
        dispatch={dispatch}
      />
      <SecurityCamera/>
    </div>
  );
}

// ── MOUNT ─────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(App)
);
