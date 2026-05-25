// app.jsx — App shell, LoginScreen, Masthead, TweaksPanel, auth
const { useState, useEffect, useReducer } = React;

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

// ── APP ───────────────────────────────────────────────────────────────────────
function App() {
  const [state, baseDispatch] = useReducer(reducer, SEED_STATE);
  const [tab, setTab]     = useState(0);
  const [toasts, setToasts]   = useState([]);
  const [theme, setTheme]     = useState('paper');
  const [accent, setAccent]   = useState('#ffc41f');
  const [density, setDensity] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoSrc = useLogo('assets/logo.png');

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
        <LoginScreen onLogin={handleLogin} state={state} logoSrc={logoSrc}/>
        <ToastContainer toasts={toasts}/>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Masthead tab={tab} setTab={setTab} currentUser={currentUser} onLogout={handleLogout} logoSrc={logoSrc}/>

      <main className="main-col">
        {tab===0 && <RankingTab  state={state} dispatch={dispatch} currentUser={currentUser}/>}
        {tab===1 && <LancarTab   state={state} dispatch={dispatch} addToast={addToast} currentUser={currentUser}/>}
        {tab===2 && (
          <VendedorTab
            state={state}
            dispatch={dispatch}
            addToast={addToast}
            currentUser={currentUser}
          />
        )}
        {tab===3 && <FeedTab state={state}/>}
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
      </main>

      <ToastContainer toasts={toasts}/>
      <TweaksPanel
        theme={theme}   setTheme={setTheme}
        accent={accent} setAccent={setAccent}
        density={density} setDensity={setDensity}
        dispatch={dispatch}
      />
    </div>
  );
}

// ── MOUNT ─────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(App)
);
