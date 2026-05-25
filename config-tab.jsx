// config-tab.jsx — ConfigTab with subtabs: Vendedores, Critérios, Níveis, Streak, Usuários
const { useState } = React;

// ── VENDEDORES SUBTAB ─────────────────────────────────────────────────────────
function VendedoresSubtab({ state, dispatch, addToast }) {
  const { vendedores, lancamentos } = state;
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');

  const adicionar = () => {
    const n = nome.trim();
    if(!n) { setErro('Informe o nome do vendedor.'); return; }
    if(vendedores.some(v=>v.nome.toLowerCase()===n.toLowerCase())) {
      setErro('Já existe um vendedor com esse nome.'); return;
    }
    const id = Math.max(0,...vendedores.map(v=>v.id))+1;
    dispatch({ type:'ADD_VENDEDOR', payload:{ id, nome:n, ativo:true } });
    addToast(`${n} adicionado com sucesso.`,'success');
    setNome(''); setErro('');
  };

  const remover = (v) => {
    if(!window.confirm(`Remover ${v.nome}?`)) return;
    dispatch({ type:'REMOVE_VENDEDOR', payload:v.id });
    addToast(`${v.nome} removido.`,'info');
  };

  return (
    <div>
      <div className="config-add-block">
        <h4>Adicionar vendedor</h4>
        <div className="input-row">
          <input
            className="field-input"
            type="text"
            value={nome}
            onChange={e=>{ setNome(e.target.value); setErro(''); }}
            placeholder="Nome completo..."
            onKeyDown={e=>e.key==='Enter'&&adicionar()}
          />
          <button className="btn-ghost" onClick={adicionar}>+ Adicionar</button>
        </div>
        {erro && <div className="error-box" style={{marginTop:8}}>{erro}</div>}
      </div>

      <div className="config-list">
        {vendedores.length===0 && <EmptyState msg="Nenhum vendedor cadastrado."/>}
        {vendedores.map(v=>{
          const nLanc = lancamentos.filter(l=>l.vendedorId===v.id).length;
          return (
            <div key={v.id} className="config-row">
              <Avatar nome={v.nome} size={36}/>
              <div className="config-row-info">
                <div className="config-row-name">{v.nome}</div>
                <div className="config-row-sub">{nLanc} lançamento{nLanc!==1?'s':''}</div>
              </div>
              <button
                className="btn-danger"
                onClick={()=>remover(v)}
                disabled={nLanc>0}
                title={nLanc>0?'Vendedor com lançamentos não pode ser removido':'Remover'}
              >
                Remover
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CRITÉRIOS SUBTAB ──────────────────────────────────────────────────────────
function CriteriosSubtab({ state, dispatch, addToast }) {
  const { criterios, lancamentos } = state;
  const [novoNome, setNovoNome]   = useState('');
  const [novoPts, setNovoPts]     = useState('');
  const [novoTipo, setNovoTipo]   = useState('positivo');
  const [novoModo, setNovoModo]   = useState('simnao');
  const [novoLim, setNovoLim]     = useState('0');
  const [erro, setErro]           = useState('');

  const update = (id, field, value) => {
    dispatch({ type:'UPDATE_CRITERIO', payload:{ id, field, value } });
  };

  const remover = (c) => {
    if(lancamentos.some(l=>l.criterioId===c.id)) {
      addToast('Critério com lançamentos não pode ser removido.','error'); return;
    }
    if(!window.confirm(`Remover "${c.nome}"?`)) return;
    dispatch({ type:'REMOVE_CRITERIO', payload:c.id });
    addToast(`Critério removido.`,'info');
  };

  const adicionar = () => {
    if(!novoNome.trim()) { setErro('Informe o nome do critério.'); return; }
    if(!novoPts || Number(novoPts)<=0) { setErro('Informe os pontos.'); return; }
    const id = Math.max(0,...criterios.map(c=>c.id))+1;
    dispatch({ type:'ADD_CRITERIO', payload:{
      id, nome:novoNome.trim(), pontos:Number(novoPts),
      tipo:novoTipo, limitesPorMes:Number(novoLim)||0, modo:novoModo,
    }});
    addToast(`Critério "${novoNome.trim()}" adicionado.`,'success');
    setNovoNome(''); setNovoPts(''); setNovoLim('0'); setErro('');
  };

  return (
    <div>
      <div className="criteria-table">
        <div className="criteria-header">
          <div>Critério</div>
          <div style={{textAlign:'center'}}>Pontos</div>
          <div style={{textAlign:'center'}}>Tipo</div>
          <div style={{textAlign:'center'}}>Modo</div>
          <div style={{textAlign:'center'}}>Lim/mês</div>
          <div></div>
        </div>
        {criterios.length===0 && <EmptyState msg="Nenhum critério cadastrado."/>}
        {criterios.map(c=>(
          <div key={c.id} className="criteria-row">
            <input
              className="inline-input"
              value={c.nome}
              onChange={e=>update(c.id,'nome',e.target.value)}
            />
            <input
              className="inline-input-num"
              type="number"
              value={c.pontos}
              onChange={e=>update(c.id,'pontos',Number(e.target.value))}
              min="1"
            />
            <div className="tipo-toggle">
              {['positivo','negativo'].map(t=>(
                <button
                  key={t}
                  className={`toggle-btn${c.tipo===t?t==='positivo'?' active-pos':' active-neg':''}`}
                  onClick={()=>update(c.id,'tipo',t)}
                  title={t}
                >
                  {t==='positivo'?'+':'−'}
                </button>
              ))}
            </div>
            <div className="modo-toggle">
              {[['simnao','S/N'],['parcial','PARC']].map(([m,l])=>(
                <button
                  key={m}
                  className={`toggle-btn${c.modo===m?' active-modo':''}`}
                  onClick={()=>update(c.id,'modo',m)}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              className="inline-input-num"
              type="number"
              value={c.limitesPorMes}
              onChange={e=>update(c.id,'limitesPorMes',Number(e.target.value))}
              min="0"
            />
            <button className="btn-danger" onClick={()=>remover(c)} title="Remover">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="config-add-block" style={{marginTop:20}}>
        <h4>Adicionar critério</h4>
        <div style={{display:'grid',gridTemplateColumns:'1fr 80px 100px 100px 80px',gap:10,alignItems:'end'}}>
          <FieldInput label="Nome" value={novoNome} onChange={v=>{setNovoNome(v);setErro('');}} placeholder="Nome do critério"/>
          <FieldInput label="Pontos" type="number" value={novoPts} onChange={setNovoPts} placeholder="0"/>
          <div className="field-group">
            <label className="field-label">Tipo</label>
            <div className="tipo-toggle">
              {['positivo','negativo'].map(t=>(
                <button
                  key={t}
                  className={`toggle-btn${novoTipo===t?t==='positivo'?' active-pos':' active-neg':''}`}
                  style={{padding:'9px 8px',fontSize:12}}
                  onClick={()=>setNovoTipo(t)}
                >
                  {t==='positivo'?'+':'−'}
                </button>
              ))}
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Modo</label>
            <div className="modo-toggle">
              {[['simnao','S/N'],['parcial','PARC']].map(([m,l])=>(
                <button
                  key={m}
                  className={`toggle-btn${novoModo===m?' active-modo':''}`}
                  style={{padding:'9px 8px',fontSize:11}}
                  onClick={()=>setNovoModo(m)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <FieldInput label="Lim/mês" type="number" value={novoLim} onChange={setNovoLim} placeholder="0"/>
        </div>
        {erro && <div className="error-box" style={{marginTop:10}}>{erro}</div>}
        <div style={{marginTop:12}}>
          <button className="btn-add" onClick={adicionar}>+ Adicionar critério</button>
        </div>
      </div>
    </div>
  );
}

// ── NÍVEIS SUBTAB ─────────────────────────────────────────────────────────────
function NiveisSubtab({ state, dispatch, addToast }) {
  const { config } = state;
  const { niveis } = config;

  const update = (id, field, value) => {
    dispatch({ type:'UPDATE_NIVEL', payload:{ id, field, value } });
  };

  const remover = (n) => {
    if(n.minPontos===0) { addToast('O nível inicial (Iniciante) não pode ser removido.','error'); return; }
    if(!window.confirm(`Remover nível "${n.nome}"?`)) return;
    dispatch({ type:'REMOVE_NIVEL', payload:n.id });
    addToast(`Nível removido.`,'info');
  };

  const adicionar = () => {
    const id = Math.max(0,...niveis.map(n=>n.id))+1;
    dispatch({ type:'ADD_NIVEL', payload:{ id, nome:'Novo nível', minPontos:9999, cor:'#888888' } });
  };

  return (
    <div>
      <div className="config-list">
        {[...niveis].sort((a,b)=>a.minPontos-b.minPontos).map(n=>(
          <div key={n.id} className="nivel-row">
            <div className="color-swatch" style={{background:n.cor}}>
              <input
                type="color"
                value={n.cor}
                onChange={e=>update(n.id,'cor',e.target.value)}
                title="Alterar cor"
              />
            </div>
            <input
              className="inline-input"
              style={{flex:1,maxWidth:180}}
              value={n.nome}
              onChange={e=>update(n.id,'nome',e.target.value)}
            />
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--ink-3)',whiteSpace:'nowrap'}}>
              a partir de
            </span>
            <input
              className="inline-input-num"
              type="number"
              value={n.minPontos}
              onChange={e=>update(n.id,'minPontos',Number(e.target.value))}
              style={{width:70}}
              disabled={n.minPontos===0}
            />
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--ink-3)'}}>pts</span>
            <button
              className="btn-danger"
              onClick={()=>remover(n)}
              disabled={n.minPontos===0}
              title={n.minPontos===0?'Nível inicial não pode ser removido':'Remover'}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div style={{marginTop:14}}>
        <button className="btn-add" onClick={adicionar}>+ Adicionar nível</button>
      </div>
    </div>
  );
}

// ── STREAK SUBTAB ─────────────────────────────────────────────────────────────
function StreakSubtab({ state, dispatch }) {
  const { config } = state;

  return (
    <div className="streak-config-block">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:0}}>
        <FieldInput
          label="Semanas consecutivas para ativar"
          type="number"
          value={String(config.streakSemanas)}
          onChange={v=>dispatch({type:'UPDATE_CONFIG',payload:{field:'streakSemanas',value:Math.max(2,Number(v))}})}
        />
        <FieldInput
          label="Multiplicador de pontos"
          type="number"
          value={String(config.streakMultiplicador)}
          onChange={v=>dispatch({type:'UPDATE_CONFIG',payload:{field:'streakMultiplicador',value:Math.max(1,Number(v))}})}
        />
      </div>
      <div className="streak-info-box">
        Quando um vendedor lança <em>"Meta semanal atingida"</em> por{' '}
        <strong>{config.streakSemanas} semanas seguidas</strong>, o próximo lançamento
        dessa meta recebe os pontos multiplicados por{' '}
        <strong>{config.streakMultiplicador}×</strong>.
      </div>
    </div>
  );
}

// ── USUÁRIOS SUBTAB ───────────────────────────────────────────────────────────
function UsuariosSubtab({ state, dispatch, addToast, currentUser }) {
  const { usuarios, vendedores, lojas = [] } = state;
  // Gerente com lojaId só gerencia sua própria loja; super-admin (lojaId null) vê tudo
  const isSuperAdmin = !currentUser?.lojaId;

  const [username, setUsername] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('vendedor');
  const [lojaId, setLojaId]     = useState('');
  const [erro, setErro]         = useState('');
  const [editSenha, setEditSenha] = useState({});

  // loja efetiva ao criar: local gerente usa a sua, super-admin usa o seletor
  const lojaEfetiva = isSuperAdmin ? Number(lojaId) || null : currentUser.lojaId;

  const adicionar = () => {
    const u = username.trim();
    const nome = nomeCompleto.trim();
    if (!u)        { setErro('Informe o nome de usuário.'); return; }
    if (!password) { setErro('Informe uma senha.'); return; }
    if (role === 'vendedor' && !nome) { setErro('Informe o nome completo do vendedor.'); return; }
    if (role === 'vendedor' && !lojaEfetiva) { setErro('Selecione a loja do vendedor.'); return; }
    if (role === 'gerencia' && isSuperAdmin && !lojaId) { setErro('Selecione a loja (ou crie como super-admin deixando vazio — não suportado aqui).'); return; }
    if (usuarios.some(x => x.username.toLowerCase() === u.toLowerCase())) {
      setErro('Já existe um usuário com esse nome.'); return;
    }

    let vendedorId = null;
    if (role === 'vendedor') {
      const vid = Math.max(0, ...vendedores.map(v => v.id)) + 1;
      dispatch({ type: 'ADD_VENDEDOR', payload: { id: vid, nome, ativo: true, lojaId: lojaEfetiva } });
      vendedorId = vid;
    }

    const id = Math.max(0, ...usuarios.map(x => x.id)) + 1;
    const novoLojaId = role === 'gerencia' ? (isSuperAdmin ? (Number(lojaId)||null) : currentUser.lojaId) : null;
    dispatch({ type: 'ADD_USUARIO', payload: { id, username: u, password, role, vendedorId, lojaId: novoLojaId } });
    addToast(`Usuário "${u}" criado.`, 'success');
    setUsername(''); setNomeCompleto(''); setPassword(''); setRole('vendedor'); setLojaId(''); setErro('');
  };

  const remover = u => {
    if (u.id === currentUser?.id) {
      addToast('Você não pode remover sua própria conta.', 'error'); return;
    }
    if (u.role === 'gerencia' && usuarios.filter(x => x.role === 'gerencia').length <= 1) {
      addToast('Não é possível remover o único gerente do sistema.', 'error'); return;
    }
    if (!window.confirm(`Remover usuário "${u.username}"?`)) return;
    dispatch({ type: 'REMOVE_USUARIO', payload: u.id });
    addToast('Usuário removido.', 'info');
  };

  const salvarSenha = u => {
    const nova = (editSenha[u.id] || '').trim();
    if (!nova) { addToast('Informe a nova senha.', 'error'); return; }
    dispatch({ type: 'UPDATE_USUARIO', payload: { id: u.id, changes: { password: nova } } });
    addToast('Senha atualizada.', 'success');
    setEditSenha(prev => { const n = {...prev}; delete n[u.id]; return n; });
  };

  return (
    <div>
      <div className="config-add-block">
        <h4>Adicionar usuário</h4>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FieldInput label="Usuário" value={username}
            onChange={v => { setUsername(v); setErro(''); }} placeholder="Nome de usuário..."/>
          <FieldInput label="Senha" type="password" value={password}
            onChange={v => { setPassword(v); setErro(''); }} placeholder="Senha..."/>
        </div>
        <div style={{marginTop:12}}>
          <div className="field-group">
            <label className="field-label">Perfil</label>
            <div className="seg-control">
              {[['gerencia','Gerência'],['vendedor','Vendedor']].map(([r,l])=>(
                <button key={r} className={`seg-btn${role===r?' active':''}`}
                  style={{padding:'8px 24px'}} onClick={()=>{ setRole(r); setErro(''); }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        {role === 'vendedor' && (
          <div style={{marginTop:12,display:'grid',gridTemplateColumns: isSuperAdmin ? '1fr 1fr' : '1fr',gap:12}}>
            <FieldInput label="Nome completo (aparece no ranking)" value={nomeCompleto}
              onChange={v => { setNomeCompleto(v); setErro(''); }} placeholder="Ex: João Silva..."/>
            {isSuperAdmin && (
              <div className="field-group">
                <label className="field-label">Loja</label>
                <div className="field-select-wrap">
                  <select className="field-select" value={lojaId} onChange={e => { setLojaId(e.target.value); setErro(''); }}>
                    <option value="">Selecione a loja...</option>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
        {role === 'gerencia' && isSuperAdmin && (
          <div style={{marginTop:12}}>
            <div className="field-group">
              <label className="field-label">Loja (deixe em branco para acesso total)</label>
              <div className="field-select-wrap">
                <select className="field-select" value={lojaId} onChange={e => { setLojaId(e.target.value); setErro(''); }}>
                  <option value="">Acesso total (todas as lojas)</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
        {erro && <div className="error-box" style={{marginTop:10}}>{erro}</div>}
        <div style={{marginTop:12}}>
          <button className="btn-add" onClick={adicionar}>+ Adicionar usuário</button>
        </div>
      </div>

      <div className="config-list" style={{marginTop:20}}>
        {/* Gerente local vê somente usuários da sua loja */}
        {(() => {
          const lista = isSuperAdmin ? usuarios : usuarios.filter(u => {
            if (u.id === currentUser?.id) return true;
            if (u.role === 'vendedor') return vendedores.find(v=>v.id===u.vendedorId)?.lojaId === currentUser.lojaId;
            return u.lojaId === currentUser.lojaId;
          });
          if (lista.length===0) return <EmptyState msg="Nenhum usuário cadastrado."/>;
          return lista.map(u => {
          const vinculado = vendedores.find(v => v.id === u.vendedorId);
          const lojaUser  = lojas.find(l => l.id === (vinculado?.lojaId ?? u.lojaId));
          const isSelf = u.id === currentUser?.id;
          return (
            <div key={u.id} className="config-row" style={{flexWrap:'wrap',gap:10}}>
              <div style={{
                width:36, height:36, background:'var(--ink)', color:'var(--paper)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'Saira Condensed,sans-serif', fontWeight:700, fontSize:13, flexShrink:0,
              }}>
                {u.username.slice(0,2).toUpperCase()}
              </div>
              <div className="config-row-info" style={{flex:1,minWidth:120}}>
                <div className="config-row-name" style={{display:'flex',alignItems:'center',gap:8}}>
                  {u.username}
                  {isSelf && (
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,
                      background:'var(--brand-yellow)',color:'var(--ink)',padding:'1px 6px'}}>
                      VOCÊ
                    </span>
                  )}
                  <span className={`role-badge ${u.role}`}>
                    {u.role==='gerencia'?'Gerência':'Vendedor'}
                  </span>
                </div>
                {vinculado && <div className="config-row-sub">{vinculado.nome}</div>}
                {lojaUser && <div className="config-row-sub" style={{color:'var(--ink-4)'}}>{lojaUser.nome}</div>}
              </div>

              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {editSenha[u.id] !== undefined ? (
                  <>
                    <input className="field-input" type="password" placeholder="Nova senha..."
                      value={editSenha[u.id]}
                      onChange={e => setEditSenha(prev => ({...prev,[u.id]:e.target.value}))}
                      style={{width:130,marginBottom:0}}
                      onKeyDown={e => e.key==='Enter' && salvarSenha(u)}
                    />
                    <button className="btn-ghost" style={{padding:'6px 10px'}} onClick={() => salvarSenha(u)}>Salvar</button>
                    <button className="btn-ghost" style={{padding:'6px 10px'}}
                      onClick={() => setEditSenha(prev => { const n={...prev}; delete n[u.id]; return n; })}>✕</button>
                  </>
                ) : (
                  <button className="btn-ghost" style={{padding:'6px 10px',fontSize:11}}
                    onClick={() => setEditSenha(prev => ({...prev,[u.id]:''}))}
                  >Senha</button>
                )}
              </div>

              <button className="btn-danger" onClick={() => remover(u)} disabled={isSelf}
                title={isSelf?'Não é possível remover sua própria conta':'Remover'}>
                Remover
              </button>
            </div>
          );
        });
        })()}
      </div>
    </div>
  );
}

// ── LOJAS SUBTAB ─────────────────────────────────────────────────────────────
function LojasSubtab({ state, dispatch, addToast, currentUser }) {
  const { lojas = [], faturamentoMensal = [] } = state;
  const lojasVisiveis = currentUser?.lojaId
    ? lojas.filter(l => l.id === currentUser.lojaId)
    : lojas;

  const hoje     = new Date();
  const [mesSel, setMesSel] = useState(hoje.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());
  const [local, setLocal]   = useState({});

  // Reseta campos locais ao trocar mês
  const trocarMes = (mes, ano) => { setMesSel(mes); setAnoSel(ano); setLocal({}); };

  // Gera opções: mês atual + 11 meses anteriores
  const opcoesMes = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    return { mes: d.getMonth() + 1, ano: d.getFullYear(),
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  });

  const nomeMesSel = opcoesMes.find(o => o.mes === mesSel && o.ano === anoSel)?.label || '';
  const ehMesAtual = mesSel === hoje.getMonth() + 1 && anoSel === hoje.getFullYear();

  const getFatMes = (lojaId, mes, ano) =>
    faturamentoMensal.find(f => f.lojaId === lojaId && f.mes === mes && f.ano === ano);

  const get = (id, field) => {
    if (local[id]?.[field] !== undefined) return local[id][field];
    return String(getFatMes(id, mesSel, anoSel)?.[field] || '');
  };
  const set = (id, field, val) =>
    setLocal(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [field]: val } }));

  const salvar = loja => {
    const faturamento = Number(get(loja.id, 'faturamento')) || 0;
    const meta        = Number(get(loja.id, 'meta')) || 0;
    dispatch({ type: 'UPSERT_FAT_MENSAL', payload: {
      lojaId: loja.id, mes: mesSel, ano: anoSel, faturamento, meta,
    }});
    addToast(`${loja.nome} — ${nomeMesSel} salvo.`, 'success');
    setLocal(prev => { const n = {...prev}; delete n[loja.id]; return n; });
  };

  const fmtBRL = val => val > 0 ? `R$ ${Number(val).toLocaleString('pt-BR')}` : '—';
  const nomeMesAno = (mes, ano) =>
    new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();

  return (
    <div>
      {/* Seletor de mês */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <div className="field-select-wrap" style={{minWidth:220}}>
          <select
            className="field-select"
            value={`${anoSel}-${mesSel}`}
            onChange={e => {
              const [a, m] = e.target.value.split('-').map(Number);
              trocarMes(m, a);
            }}
          >
            {opcoesMes.map(o => (
              <option key={`${o.ano}-${o.mes}`} value={`${o.ano}-${o.mes}`}>
                {o.label}{o.mes === hoje.getMonth()+1 && o.ano === hoje.getFullYear() ? ' (mês atual)' : ''}
              </option>
            ))}
          </select>
        </div>
        {!ehMesAtual && (
          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,
            color:'var(--brand-yellow)',letterSpacing:'.06em'}}>
            EDITANDO MÊS ANTERIOR
          </span>
        )}
      </div>

      {lojasVisiveis.map(loja => {
        const hist = faturamentoMensal
          .filter(f => f.lojaId === loja.id && !(f.mes === mesSel && f.ano === anoSel))
          .sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes)
          .slice(0, 6);
        return (
          <div key={loja.id} style={{marginBottom:28,paddingBottom:20,borderBottom:'1px solid var(--rule)'}}>
            <div className="config-row-name" style={{marginBottom:12,fontSize:16}}>{loja.nome}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
              <FieldInput
                label={`Faturamento líquido — ${nomeMesSel} (R$)`}
                type="number"
                value={get(loja.id, 'faturamento')}
                onChange={v => set(loja.id, 'faturamento', v)}
                placeholder="Ex: 850000"
              />
              <FieldInput
                label={`Meta — ${nomeMesSel} (R$)`}
                type="number"
                value={get(loja.id, 'meta')}
                onChange={v => set(loja.id, 'meta', v)}
                placeholder="Ex: 800000"
              />
              <button className="btn-ghost" style={{padding:'8px 18px'}} onClick={() => salvar(loja)}>
                Salvar
              </button>
            </div>

            {hist.length > 0 && (
              <div style={{marginTop:12}}>
                <div style={{fontFamily:'Saira Condensed,sans-serif',fontSize:10,fontWeight:700,
                  textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink-4)',marginBottom:6}}>
                  Outros meses
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {hist.map(f => (
                    <button
                      key={`${f.mes}-${f.ano}`}
                      onClick={() => trocarMes(f.mes, f.ano)}
                      style={{
                        fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'var(--ink-3)',
                        background:'var(--paper-2)',padding:'4px 10px',border:'1px solid var(--rule)',
                        cursor:'pointer',
                      }}
                    >
                      <span style={{color:'var(--ink-4)'}}>{nomeMesAno(f.mes, f.ano)}</span>
                      {' · '}{fmtBRL(f.faturamento)}
                      {f.meta > 0 && (
                        <span style={{color: f.faturamento >= f.meta ? '#2d7d2d' : 'var(--ink-4)'}}>
                          {` · ${((f.faturamento/f.meta)*100).toFixed(0)}%`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── COMPROVANTES ANÁLISE SUBTAB ───────────────────────────────────────────────
function ComprovantesAnaliseSubtab({ state, dispatch, addToast, currentUser }) {
  const { comprovantes = [], vendedores, lojas = [] } = state;
  const [aba, setAba] = useState('pendentes');

  // Filtra comprovantes pela loja do gerente
  const vidsLoja = new Set(
    currentUser?.lojaId
      ? vendedores.filter(v => v.lojaId === currentUser.lojaId).map(v => v.id)
      : vendedores.map(v => v.id)
  );
  const compsDaLoja = comprovantes.filter(c => vidsLoja.has(c.vendedorId));
  const pendentes  = compsDaLoja.filter(c => !c.status || c.status === 'pendente');
  const historico  = compsDaLoja.filter(c => c.status === 'aprovado' || c.status === 'rejeitado');
  const lista      = aba === 'pendentes' ? pendentes : historico;

  const getVendedor = id => vendedores.find(v => v.id === id);
  const getLoja     = id => lojas.find(l => l.id === id);

  const aprovar = comp => {
    dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id:comp.id, changes:{ status:'aprovado' } } });
    addToast('Comprovante aprovado.', 'success');
  };
  const rejeitar = comp => {
    dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id:comp.id, changes:{ status:'rejeitado' } } });
    addToast('Comprovante rejeitado.', 'info');
  };
  const ver = comp => {
    const win = window.open('','_blank');
    if (!win) return;
    if (comp.tipo?.startsWith('image/'))
      win.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#111;display:flex;justify-content:center;padding:20px"><img src="${comp.dados}" style="max-width:100%"/></body></html>`);
    else
      win.document.write(`<!DOCTYPE html><html><body style="margin:0"><iframe src="${comp.dados}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
    win.document.close();
  };

  return (
    <div>
      <div className="seg-control" style={{marginBottom:16}}>
        <button className={`seg-btn${aba==='pendentes'?' active':''}`} onClick={()=>setAba('pendentes')}>
          Pendentes{pendentes.length>0?` (${pendentes.length})`:''}
        </button>
        <button className={`seg-btn${aba==='historico'?' active':''}`} onClick={()=>setAba('historico')}>
          Histórico{historico.length>0?` (${historico.length})`:''}
        </button>
      </div>

      {lista.length===0 && <EmptyState msg={aba==='pendentes'?'Nenhum comprovante pendente de análise.':'Nenhum comprovante analisado ainda.'}/>}

      {lista.map(comp => {
        const v    = getVendedor(comp.vendedorId);
        const loja = v?.lojaId ? getLoja(v.lojaId) : null;
        const st   = comp.status || 'pendente';
        return (
          <div key={comp.id} className="comp-analise-row">
            <div className="comp-analise-info">
              <div className="comp-analise-nome">{comp.nome}</div>
              <div className="comp-analise-meta">
                {v?.nome||'?'}{loja ? ` · ${loja.nome}` : ''} · {fmtData(comp.data)}
              </div>
              <span className={`comp-status-badge ${st}`}>
                {st==='pendente'?'Pendente':st==='aprovado'?'Aprovado':'Rejeitado'}
              </span>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
              <button className="comp-view-btn" onClick={()=>ver(comp)}>Ver</button>
              {st==='pendente' && (
                <>
                  <button
                    className="btn-ghost"
                    style={{padding:'5px 12px',fontSize:11,color:'#3a8a3a',borderColor:'#3a8a3a'}}
                    onClick={()=>aprovar(comp)}
                  >Aprovar</button>
                  <button className="btn-danger" style={{padding:'5px 12px',fontSize:11}} onClick={()=>rejeitar(comp)}>Rejeitar</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CONFIG TAB ────────────────────────────────────────────────────────────────
function ConfigTab({ state, dispatch, addToast, currentUser }) {
  const [sub, setSub] = useState(0);
  const subs = ['Usuários','Critérios','Níveis','Streak','Lojas','Comprovantes'];

  return (
    <div>
      <SectionHeader
        eyebrowLeft="EXPEDIENTE"
        eyebrowAccent="OFICINA DO SISTEMA"
        title="Oficina do sistema"
        byline="Gerencie usuários, critérios, níveis e regras do streak."
      />

      <div className="config-subtabs">
        {subs.map((s,i)=>(
          <button key={i} className={`subtab-btn${sub===i?' active':''}`} onClick={()=>setSub(i)}>
            {s}
          </button>
        ))}
      </div>

      {sub===0 && <UsuariosSubtab           state={state} dispatch={dispatch} addToast={addToast} currentUser={currentUser}/>}
      {sub===1 && <CriteriosSubtab         state={state} dispatch={dispatch} addToast={addToast}/>}
      {sub===2 && <NiveisSubtab            state={state} dispatch={dispatch} addToast={addToast}/>}
      {sub===3 && <StreakSubtab            state={state} dispatch={dispatch}/>}
      {sub===4 && <LojasSubtab              state={state} dispatch={dispatch} addToast={addToast} currentUser={currentUser}/>}
      {sub===5 && <ComprovantesAnaliseSubtab state={state} dispatch={dispatch} addToast={addToast} currentUser={currentUser}/>}
    </div>
  );
}

// ── EXPOSE GLOBALS ────────────────────────────────────────────────────────────
window.ConfigTab = ConfigTab;
