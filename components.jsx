// components.jsx — UI primitives
const { useState, useEffect, useRef } = React;

// ── COUNTUP ───────────────────────────────────────────────────────────────────
function CountUp({ target, duration = 900 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf, start=null;
    const step = ts => {
      if(!start) start=ts;
      const p = Math.min((ts-start)/duration, 1);
      const eased = 1 - Math.pow(1-p, 3);
      setVal(Math.round(eased * target));
      if(p<1) raf=requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return React.createElement(React.Fragment, null, target>999 ? val.toLocaleString('pt-BR') : val);
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
function Avatar({ nome, size=40, foto=null }) {
  if (foto) {
    return (
      <div className="avatar" style={{ width:size, height:size, padding:0, overflow:'hidden' }}>
        <img src={foto} alt={nome} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
      </div>
    );
  }
  return (
    <div className="avatar" style={{ width:size, height:size, fontSize:size*.34 }}>
      {initials(nome)}
    </div>
  );
}

// ── NIVEL BADGE ───────────────────────────────────────────────────────────────
function NivelBadge({ nivel }) {
  const cls = {
    'Iniciante': 'nivel-iniciante',
    'Prata':     'nivel-prata',
    'Ouro':      'nivel-ouro',
    'Diamante':  'nivel-diamante',
  }[nivel.nome] || 'nivel-iniciante';
  return <span className={`nivel-badge ${cls}`}>{nivel.nome}</span>;
}

// ── STREAK BADGE ──────────────────────────────────────────────────────────────
function StreakBadge({ semanas }) {
  return (
    <span className="streak-badge">
      <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" style={{flexShrink:0}}>
        <path d="M4 0C4 0 7.5 3.2 7.5 6.5C7.5 8.5 6.1 10.2 4 10.2C1.9 10.2 0.5 8.5 0.5 6.5C0.5 4.8 1.4 3.5 2.1 2.8C2.1 3.9 2.5 4.6 3.2 4.6C3.2 3.1 2.8 1.6 4 0Z"/>
      </svg>
      {semanas}W STREAK
    </span>
  );
}

// ── LEADER STAMP ──────────────────────────────────────────────────────────────
function LeaderStamp() {
  return <span className="leader-stamp">★ Líder do mês</span>;
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, leader=false, style={} }) {
  return (
    <div className="progress-track" style={style}>
      <div
        className={`progress-fill${leader?' leader':''}`}
        style={{ width:`${Math.min(pct,100)}%` }}
      />
    </div>
  );
}

// ── STAT STRIP ────────────────────────────────────────────────────────────────
function StatStrip({ cells }) {
  return (
    <div className="stat-strip">
      {cells.map((c,i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-label">{c.label}</span>
          <span className={`stat-value${c.accent?' accent':''}`}>
            {typeof c.value==='number' ? <CountUp target={c.value}/> : c.value}
          </span>
          {c.sub && <span className="stat-sub">{c.sub}</span>}
        </div>
      ))}
    </div>
  );
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
function SectionHeader({ eyebrowLeft, eyebrowAccent, title, byline, children }) {
  return (
    <div className="section-header">
      <div className="section-header-row">
        <div>
          <div className="section-eyebrow">
            {eyebrowLeft}
            {eyebrowAccent && <><span>·</span><span className="accent">{eyebrowAccent}</span></>}
          </div>
          <h1 className="section-title">{title}</h1>
          {byline && <p className="section-byline">{byline}</p>}
        </div>
        {children && <div style={{flexShrink:0}}>{children}</div>}
      </div>
      <hr className="section-rule" />
    </div>
  );
}

// ── PRIMARY BUTTON ────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading, success, disabled }) {
  const cls = ['btn-primary', loading?'loading':'', success?'success':''].filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={onClick} disabled={disabled||loading}>
      {loading && (
        <span className="spin">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity=".25"/>
            <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
      )}
      {success && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {children}
    </button>
  );
}

// ── FIELD INPUT ───────────────────────────────────────────────────────────────
function FieldInput({ label, value, onChange, type='text', placeholder, flash, error, style={}, ...rest }) {
  const cls = ['field-input', flash?'flash':'', error?'error':''].filter(Boolean).join(' ');
  return (
    <div className="field-group">
      {label && <label className="field-label">{label}</label>}
      <input
        className={cls}
        type={type}
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
        {...rest}
      />
    </div>
  );
}

// ── FIELD SELECT ──────────────────────────────────────────────────────────────
function FieldSelect({ label, value, onChange, children, placeholder='' }) {
  return (
    <div className="field-group">
      {label && <label className="field-label">{label}</label>}
      <div className="field-select-wrap">
        <select className="field-select" value={value} onChange={e=>onChange(e.target.value)}>
          {placeholder && <option value="">{placeholder}</option>}
          {children}
        </select>
      </div>
    </div>
  );
}

// ── FIELD TEXTAREA ────────────────────────────────────────────────────────────
function FieldTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="field-group">
      {label && <label className="field-label">{label}</label>}
      <textarea
        className="field-textarea"
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── TOAST CONTAINER ───────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type==='success' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {t.type==='error' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {t.type==='info' && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7v5M8 5.5v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
function EmptyState({ msg='Nenhum dado encontrado.' }) {
  return (
    <div className="empty-state">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity=".3">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 16h12M16 10v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".4"/>
      </svg>
      <p>{msg}</p>
    </div>
  );
}

// ── EXPOSE GLOBALS ────────────────────────────────────────────────────────────
window.CountUp        = CountUp;
window.Avatar         = Avatar;
window.NivelBadge     = NivelBadge;
window.StreakBadge    = StreakBadge;
window.LeaderStamp    = LeaderStamp;
window.ProgressBar    = ProgressBar;
window.StatStrip      = StatStrip;
window.SectionHeader  = SectionHeader;
window.PrimaryBtn     = PrimaryBtn;
window.FieldInput     = FieldInput;
window.FieldSelect    = FieldSelect;
window.FieldTextarea  = FieldTextarea;
window.ToastContainer = ToastContainer;
window.EmptyState     = EmptyState;
