// tabs.jsx — RankingTab, LancarTab, VendedorTab, FeedTab
const { useState, useMemo, useEffect, useRef } = React;

// ── RANKING TAB ───────────────────────────────────────────────────────────────
function RankingTab({ state, dispatch, currentUser }) {
  const { vendedores, lancamentos, criterios, config } = state;
  const [modo, setModo] = useState('mes');
  const lojas = state.lojas || [];

  const ranking = useMemo(() => {
    return vendedores.filter(v=>v.ativo).map(v => ({
      ...v,
      pg: pontosTotal(v.id, lancamentos),
      pm: pontosMes(v.id, lancamentos),
      nivel: calcularNivel(pontosTotal(v.id, lancamentos), config.niveis),
      streak: calcularStreak(v.id, lancamentos, criterios, config.streakSemanas),
      nLanc: lancamentos.filter(l=>l.vendedorId===v.id).length,
    })).sort((a,b) => modo==='geral' ? b.pg-a.pg : b.pm-a.pm);
  }, [vendedores, lancamentos, criterios, config, modo]);

  const lojasRanking = useMemo(() => {
    if (!lojas.length) return [];

    const fatMensal = state.faturamentoMensal || [];
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Calcula dados base de cada loja
    const base = lojas.map(loja => {
      const ativos = vendedores.filter(v => v.ativo && v.lojaId === loja.id);
      const totalMesPts = ativos.reduce((s,v) => s + pontosMes(v.id, lancamentos), 0);
      const avgPts = ativos.length > 0 ? totalMesPts / ativos.length : 0;
      const fatData = fatMensal.find(f => f.lojaId === loja.id && f.mes === mesAtual && f.ano === anoAtual);
      const fat    = fatData?.faturamento || 0;
      const meta   = fatData?.meta || 0;
      const pctMeta = meta > 0 ? (fat / meta) * 100 : 0;
      const liderV = ativos.length > 0
        ? ativos.reduce((best,v) => pontosMes(v.id,lancamentos) > pontosMes(best.id,lancamentos) ? v : best, ativos[0])
        : null;
      return { ...loja, ativos: ativos.length, avgPts, fat, meta, pctMeta, lider: liderV ? nomeCurto(liderV.nome) : '—' };
    });

    const maxFat    = Math.max(...base.map(l => l.fat), 1);
    const maxAvgPts = Math.max(...base.map(l => l.avgPts), 1);
    const anyFin    = base.some(l => l.fat > 0 || l.meta > 0);

    return base.map(l => {
      // Componente financeiro: ICP = 0,60×%Meta + 0,40×FatNorm
      const fatNorm = (l.fat / maxFat) * 100;
      const icpFin  = (0.60 * l.pctMeta) + (0.40 * fatNorm);
      // Componente gamificação: pontuação média normalizada 0-100
      const ptsNorm = (l.avgPts / maxAvgPts) * 100;
      // Score final: 60% financeiro + 40% gamificação (ou só gamificação se sem dados financeiros)
      const score = anyFin ? (0.60 * icpFin) + (0.40 * ptsNorm) : ptsNorm;
      return { ...l, fatNorm, icpFin, ptsNorm, score };
    }).sort((a,b) =>
      Math.abs(b.score - a.score) > 0.05
        ? b.score - a.score
        : b.pctMeta - a.pctMeta  // empate: maior % de atingimento de meta
    );
  }, [lojas, vendedores, lancamentos, state.faturamentoMensal]);

  const maxPts = ranking[0] ? (modo==='geral' ? ranking[0].pg : ranking[0].pm) : 1;
  const totalPtsmes = lancamentos.reduce((s,l) => {
    const d=new Date(l.data), n=new Date();
    return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear() ? s+l.pontos : s;
  }, 0);
  const lancMes = lancamentos.filter(l=>{ const d=new Date(l.data),n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).length;

  const exportarPDF = () => {
    const mesLabel = new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).toUpperCase();
    const dataHoje = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
    const logoSrc  = `${window.location.origin}/assets/logo.png`;

    const linhas = ranking.map((v,i) => {
      const pts = modo==='geral' ? v.pg : v.pm;
      const lojaNome = (state.lojas||[]).find(l=>l.id===v.lojaId)?.nome || '—';
      return `<tr class="${i===0?'leader':''}">
        <td class="pos">${String(i+1).padStart(2,'0')}</td>
        <td class="nome">${v.nome}</td>
        <td class="nivel">${lojaNome}</td>
        <td class="nivel">${v.nivel.nome}</td>
        <td class="pts">${pts.toLocaleString('pt-BR')}</td>
        <td class="centro">${v.nLanc}</td>
        <td class="centro">${v.streak.ativo?`${v.streak.semanas}W`:'—'}</td>
      </tr>`;
    }).join('');

    const lojasLinhas = lojasRanking.map((loja,i) => `
      <tr class="${i===0?'leader':''}">
        <td class="pos">${String(i+1).padStart(2,'0')}</td>
        <td class="nome">${loja.nome}</td>
        <td class="pts">${loja.score.toFixed(1)}</td>
        <td class="centro">${loja.pctMeta>0?loja.pctMeta.toFixed(1)+'%':'—'}</td>
        <td class="centro">${loja.ativos}</td>
        <td class="centro">${loja.avgPts>0?Math.round(loja.avgPts)+' pts':'—'}</td>
      </tr>`).join('');

    const lojasSection = lojasRanking.length > 0 ? `
      <div class="secao-titulo">Ranking de Lojas — Índice Composto Ponderado</div>
      <table>
        <thead><tr>
          <th>Pos</th><th>Loja</th><th class="r">Índice</th><th class="r">% Meta</th>
          <th class="r">Vendedores</th><th class="r">Média pts/v</th>
        </tr></thead>
        <tbody>${lojasLinhas}</tbody>
      </table>` : '';

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ranking YES! Mocelin</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Saira+Condensed:wght@400;600;700&family=DM+Sans:wght@400;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page{margin:24mm 22mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1612;font-size:11px;padding:0 4px}
.cabecalho{display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:12px;border-bottom:3px double #1a1612;margin-bottom:18px}
.cab-logo{height:56px;object-fit:contain}
.cab-titulo{text-align:right}
.cab-titulo h1{font-family:'Anton',sans-serif;font-size:34px;text-transform:uppercase;line-height:1;letter-spacing:-1px}
.cab-titulo p{font-family:'Saira Condensed',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#74747a;margin-top:2px}
.cab-titulo small{font-family:'JetBrains Mono',monospace;font-size:9px;color:#b0ada7}
.stats{display:grid;grid-template-columns:repeat(4,1fr);border:2px solid #1a1612;margin-bottom:18px}
.stat{padding:10px 14px;border-right:1px solid #1a1612}
.stat:last-child{border-right:none}
.stat-lbl{font-family:'Saira Condensed',sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#74747a;display:block;margin-bottom:2px}
.stat-val{font-family:'Anton',sans-serif;font-size:26px;line-height:1}
.stat-val.destaque{color:#ffc41f}
.stat-nome{font-family:'Anton',sans-serif;font-size:18px;line-height:1}
.secao-titulo{font-family:'Anton',sans-serif;font-size:16px;text-transform:uppercase;letter-spacing:.04em;margin:28px 0 4px;padding-top:20px;border-top:2px solid #1a1612}
table{width:100%;border-collapse:collapse;margin-top:8px;margin-bottom:6px}
thead tr{border-top:2px solid #1a1612;border-bottom:2px solid #1a1612}
th{font-family:'Saira Condensed',sans-serif;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#74747a;padding:6px 8px;text-align:left}
th.r,td.pts,td.centro{text-align:right}
td{padding:7px 8px;border-bottom:1px solid #e5e3de;font-size:11px}
td.pos{font-family:'JetBrains Mono',monospace;font-size:10px;color:#74747a;width:32px}
td.nome{font-weight:600;font-size:12px}
td.nivel{font-family:'Saira Condensed',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#74747a}
td.pts{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;color:#1a1612}
td.centro{font-family:'JetBrains Mono',monospace;font-size:10px;color:#74747a}
tr.leader td{background:#fffbe8}
tr.leader td.pos{color:#c9921a;font-weight:700}
tr.leader td.pts{color:#c9921a}
.rodape{margin-top:20px;padding-top:10px;border-top:1px solid #e5e3de;display:flex;justify-content:space-between}
.rodape span{font-family:'JetBrains Mono',monospace;font-size:9px;color:#b0ada7}
</style></head><body>
<div class="cabecalho">
  <img class="cab-logo" src="${logoSrc}" onerror="this.style.display='none'"/>
  <div class="cab-titulo">
    <h1>Ranking ${modo==='geral'?'Geral':mesLabel}</h1>
    <p>Boletim Comercial · YES! Mocelin</p>
    <small>${dataHoje}</small>
  </div>
</div>
<div class="stats">
  <div class="stat"><span class="stat-lbl">Vendedores ativos</span><span class="stat-val">${vendedores.filter(v=>v.ativo).length}</span></div>
  <div class="stat"><span class="stat-lbl">Lançamentos no mês</span><span class="stat-val">${lancMes}</span></div>
  <div class="stat"><span class="stat-lbl">Pontos no mês</span><span class="stat-val destaque">${totalPtsmes.toLocaleString('pt-BR')}</span></div>
  <div class="stat"><span class="stat-lbl">Líder do mês</span><span class="stat-nome">${ranking[0]?nomeCurto(ranking[0].nome):'—'}</span></div>
</div>
<div class="secao-titulo">Ranking de Vendedores</div>
<table>
<thead><tr>
  <th>Pos</th><th>Vendedor</th><th>Loja</th><th>Nível</th><th class="r">Pontos</th><th class="r">Lanç.</th><th class="r">Streak</th>
</tr></thead>
<tbody>${linhas}</tbody>
</table>
${lojasSection}
<div class="rodape">
  <span>YES! MOCELIN · BOLETIM COMERCIAL · CONFIDENCIAL</span>
  <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),600)</script>
</body></html>`;

    const win = window.open('','_blank');
    if (!win) { return; }
    win.document.write(html);
    win.document.close();
  };

  const mesLabel = new Date().toLocaleDateString('pt-BR',{month:'long'}).toUpperCase();

  return (
    <div>
      <SectionHeader
        eyebrowLeft="CLASSIFICAÇÃO"
        eyebrowAccent={mesLabel}
        title="Quem está na frente"
        byline="Pontuação acumulada por critérios da equipe comercial."
      >
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div className="seg-control">
            {[['mes','Mês atual'],['geral','Geral']].map(([k,l])=>(
              <button key={k} className={`seg-btn${modo===k?' active':''}`} onClick={()=>setModo(k)}>{l}</button>
            ))}
          </div>
          {currentUser?.role === 'gerencia' && (
            <button className="btn-ghost" onClick={exportarPDF}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{marginRight:5,verticalAlign:'middle'}}>
                <path d="M6.5 1v8M3 6l3.5 3 3.5-3M1 11h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Exportar PDF
            </button>
          )}
        </div>
      </SectionHeader>

      <StatStrip cells={[
        { label:'Vendedores ativos',      value:vendedores.filter(v=>v.ativo).length },
        { label:'Lançamentos no mês',     value:lancMes },
        { label:'Pontos no mês',          value:totalPtsmes, accent:true },
        { label:'Líder do mês',           value:ranking[0]?nomeCurto(ranking[0].nome):'—', sub:ranking[0]?`${ranking[0].pm} pts`:''},
      ]}/>

      <div className="rk-table">
        <div className="rk-header">
          <div className="rk-cell">POS</div>
          <div className="rk-cell"></div>
          <div className="rk-cell">VENDEDOR</div>
          <div className="rk-cell rk-progress-col">PROGRESSO</div>
          <div className="rk-cell" style={{textAlign:'right'}}>PONTOS</div>
        </div>

        {ranking.length===0 && <EmptyState msg="Nenhum vendedor ativo." />}

        {ranking.map((v,i) => {
          const pts = modo==='geral' ? v.pg : v.pm;
          const pct = maxPts>0 ? (pts/maxPts)*100 : 0;
          return (
            <div key={v.id} className={`rk-row${i===0?' pos-1':''}`}>
              <div className="rk-cell">
                <span className={`rk-pos${i===0?' leader':''}`}>
                  {String(i+1).padStart(2,'0')}
                </span>
              </div>
              <div className="rk-cell">
                <Avatar nome={v.nome} size={40} foto={v.foto}/>
              </div>
              <div className="rk-cell">
                <div className="rk-name-main">{v.nome}</div>
                <div className="rk-name-sub">
                  <NivelBadge nivel={v.nivel}/>
                  {v.streak.ativo && <StreakBadge semanas={v.streak.semanas}/>}
                  <span className="rk-lancamentos">{v.nLanc} lanç.</span>
                </div>
              </div>
              <div className="rk-cell rk-progress-col">
                <ProgressBar pct={pct} leader={i===0}/>
                <div className="rk-pct">{Math.round(pct)}% do líder</div>
              </div>
              <div className="rk-cell" style={{textAlign:'right'}}>
                <div className="rk-pts-main">{pts.toLocaleString('pt-BR')}</div>
                {modo==='mes' && <span className="rk-pts-sub">{v.pg.toLocaleString('pt-BR')} totais</span>}
              </div>
            </div>
          );
        })}
      </div>

      {lojasRanking.length > 0 && currentUser?.role === 'gerencia' && (
        <div className="lojas-ranking-wrap">
          <div className="section-eyebrow" style={{marginBottom:8}}>
            INTER-LOJAS · <span className="accent">RANKING MENSAL</span>
          </div>
          <div className="lojas-grid">
            {lojasRanking.map((loja, i) => (
              <div key={loja.id} className={`loja-card${i===0?' destaque':''}`}>

                {/* cabeçalho: posição + % meta */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div className="loja-card-pos">{String(i+1).padStart(2,'0')}</div>
                  {loja.pctMeta > 0 && (
                    <span style={{
                      fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700,
                      color: loja.pctMeta >= 100 ? '#2d7d2d' : 'var(--ink-4)',
                    }}>
                      {loja.pctMeta.toFixed(1)}% meta
                    </span>
                  )}
                </div>

                <div className="loja-card-nome">{loja.nome}</div>

                {/* score principal */}
                <div className="loja-card-media">{loja.score.toFixed(1)}</div>
                <div className="loja-card-pts-label">índice composto</div>

                {/* subscores */}
                <div className="loja-card-subscores">
                  {(loja.fat > 0 || loja.meta > 0) && (
                    <span>ICP fin. {loja.icpFin.toFixed(1)}</span>
                  )}
                  <span>Pts {loja.ptsNorm.toFixed(1)}</span>
                </div>

                {/* rodapé */}
                <div className="loja-card-sub">
                  {loja.ativos} vendedor{loja.ativos!==1?'es':''}
                  {loja.lider !== '—' && ` · ${loja.lider}`}
                  {loja.avgPts > 0 && ` · ${Math.round(loja.avgPts)} pts/v`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── LANÇAR TAB ────────────────────────────────────────────────────────────────
function LancarTab({ state, dispatch, addToast, currentUser }) {
  const { vendedores, criterios, lancamentos, config } = state;
  // Gerente com lojaId vê somente sua loja; super-admin (lojaId null) vê todos
  const vendedoresVisiveis = currentUser?.lojaId
    ? vendedores.filter(v => v.lojaId === currentUser.lojaId)
    : vendedores;
  const [vid, setVid]     = useState('');
  const [resps, setResps] = useState({}); // { [cid]: { simNao: null|'sim'|'nao', pts: '' } }
  const [obs, setObs]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Comprovantes pendentes filtrados pela loja do gerente
  const vidsVisiveis = new Set(vendedoresVisiveis.map(v => v.id));
  const pendentesComps = (state.comprovantes || []).filter(c =>
    (!c.status || c.status === 'pendente') && vidsVisiveis.has(c.vendedorId)
  );
  const ptsCurso = criterios.find(c => c.id === 9)?.pontos ?? 10;

  const verComp = comp => {
    const win = window.open('','_blank');
    if (!win) return;
    const renderContent = dados => {
      win.document.open();
      if (comp.tipo?.startsWith('image/'))
        win.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#111;display:flex;justify-content:center;padding:20px"><img src="${dados}" style="max-width:100%"/></body></html>`);
      else
        win.document.write(`<!DOCTYPE html><html><body style="margin:0"><iframe src="${dados}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
      win.document.close();
    };
    if (comp.dados) {
      renderContent(comp.dados);
    } else {
      win.document.write('<p style="font-family:sans-serif;padding:30px;color:#666">Carregando arquivo...</p>');
      _sb.from('comprovantes').select('dados').eq('id', comp.id).single()
        .then(({ data }) => data?.dados ? renderContent(data.dados) : null);
    }
  };

  const aprovarComp = comp => {
    dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id:comp.id, changes:{ status:'aprovado' } } });
    const newId = Math.max(0, ...lancamentos.map(l=>l.id)) + 1;
    dispatch({ type:'ADD_LANCAMENTO', payload:{
      id: newId, vendedorId: comp.vendedorId, criterioId: 9,
      pontos: ptsCurso, obs: `Comprovante: ${comp.nome}`,
      data: new Date().toISOString(), streakAplicado: false,
    }});
    const v = vendedores.find(x=>x.id===comp.vendedorId);
    addToast(`Comprovante aprovado! +${ptsCurso} pts para ${nomeFirst(v?.nome||'?')}.`, 'success');
  };

  const rejeitarComp = comp => {
    dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id:comp.id, changes:{ status:'rejeitado' } } });
    const v = vendedores.find(x=>x.id===comp.vendedorId);
    addToast(`Comprovante de ${nomeFirst(v?.nome||'?')} rejeitado.`, 'info');
  };

  const vendedor = vendedores.find(v => v.id === Number(vid));
  const streak   = vid ? calcularStreak(Number(vid), lancamentos, criterios, config.streakSemanas) : { ativo:false, semanas:0 };

  const trocarVendedor = v => { setVid(v); setResps({}); setObs(''); };

  const setSimNao = (cid, val) => {
    const c = criterios.find(x => x.id === cid);
    setResps(prev => ({
      ...prev,
      [cid]: { ...prev[cid], simNao: prev[cid]?.simNao === val ? null : val,
                pts: val === 'sim' ? String(c.pontos) : '0' }
    }));
  };

  const setPts = (cid, val) => {
    setResps(prev => ({ ...prev, [cid]: { ...prev[cid], pts: val } }));
  };

  const prontos = criterios.filter(c => !c.oculto).filter(c => {
    const r = resps[c.id];
    if (!r) return false;
    if (c.modo === 'simnao')  return r.simNao === 'sim';
    if (c.modo === 'parcial') return Number(r.pts) > 0;
    return false;
  });

  const handleLancar = () => {
    if (!vid)           { addToast('Selecione um vendedor.', 'error'); return; }
    if (!prontos.length){ addToast('Marque ao menos um critério como SIM ou informe pontos.', 'error'); return; }

    setLoading(true);
    setTimeout(() => {
      let maxId = Math.max(0, ...lancamentos.map(l => l.id));
      let total = 0;
      prontos.forEach(c => {
        const r = resps[c.id];
        const isMetaSemanal = c.nome === 'Meta semanal atingida';
        const bonus = streak.ativo && isMetaSemanal;
        let pts = c.modo === 'simnao' ? c.pontos : Number(r.pts);
        if (bonus) pts = Math.round(pts * config.streakMultiplicador);
        total += pts;
        maxId++;
        dispatch({ type: 'ADD_LANCAMENTO', payload: {
          id: maxId, vendedorId: Number(vid), criterioId: c.id,
          pontos: pts, obs: obs.trim(),
          data: new Date().toISOString(), streakAplicado: bonus,
        }});
      });
      setLoading(false); setSuccess(true);
      addToast(`+${total} pts lançados para ${nomeFirst(vendedor.nome)} (${prontos.length} critério${prontos.length>1?'s':''}).`, 'success');
      setTimeout(() => { setSuccess(false); setVid(''); setResps({}); setObs(''); }, 1600);
    }, 500);
  };

  const recentLancs = [...lancamentos].sort((a,b) => new Date(b.data)-new Date(a.data)).slice(0,5);

  return (
    <div>
      <SectionHeader
        eyebrowLeft="DESPACHO"
        eyebrowAccent="LANÇAMENTO"
        title="Registrar pontos"
        byline="Selecione o vendedor e marque todos os critérios de uma vez."
      />

      {pendentesComps.length > 0 && (
        <div className="comp-pendentes-block">
          <div className="section-eyebrow" style={{marginBottom:12}}>
            AGUARDANDO ANÁLISE · <span className="accent">{pendentesComps.length} COMPROVANTE{pendentesComps.length>1?'S':''}</span>
          </div>
          {pendentesComps.map(comp => {
            const v = vendedores.find(x=>x.id===comp.vendedorId);
            return (
              <div key={comp.id} className="comp-pending-row">
                <div className="comp-pending-icon">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M5 2h7l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="comp-pending-info">
                  <div className="comp-pending-nome">{comp.nome}</div>
                  <div className="comp-pending-meta">
                    <Avatar nome={v?.nome||'?'} size={18} foto={v?.foto}/>
                    <span>{v?.nome||'?'}</span>
                    <span style={{color:'var(--ink-4)'}}>· {fmtData(comp.data)}</span>
                  </div>
                </div>
                <div className="comp-pending-actions">
                  <button className="comp-view-btn" onClick={()=>verComp(comp)}>Ver</button>
                  <button
                    className="btn-aprovar"
                    onClick={()=>aprovarComp(comp)}
                  >✓ Aprovar +{ptsCurso}pts</button>
                  <button className="btn-danger" style={{padding:'5px 12px',fontSize:11}} onClick={()=>rejeitarComp(comp)}>Rejeitar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="lancar-grid">
        <div className="form-block">
          <FieldSelect label="Vendedor" value={vid} onChange={trocarVendedor} placeholder="Selecione um vendedor...">
            {vendedoresVisiveis.filter(v => v.ativo).map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </FieldSelect>

          {vendedor && (
            <div className="vendor-preview">
              <Avatar nome={vendedor.nome} size={34} foto={vendedor.foto}/>
              <div>
                <div style={{fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:14}}>{vendedor.nome}</div>
                {streak.ativo && <StreakBadge semanas={streak.semanas}/>}
              </div>
            </div>
          )}

          {vendedor && (
            <>
              <div className="lanc-lista">
                {criterios.filter(c => !c.oculto).map(c => {
                  const r = resps[c.id] || {};
                  const limRest = c.limitesPorMes > 0
                    ? c.limitesPorMes - countNoMes(Number(vid), c.id, lancamentos)
                    : null;
                  const esgotado = limRest !== null && limRest <= 0;
                  const isMetaSemanal = c.nome === 'Meta semanal atingida';
                  const bonus = streak.ativo && isMetaSemanal;
                  const marcadoSim = c.modo === 'simnao' && r.simNao === 'sim';
                  const marcadoNao = c.modo === 'simnao' && r.simNao === 'nao';
                  const temPts     = c.modo === 'parcial' && Number(r.pts) > 0;

                  return (
                    <div
                      key={c.id}
                      className={`lanc-item${marcadoSim||temPts?' sim':marcadoNao?' nao':esgotado?' esgotado':''}`}
                    >
                      <div className="lanc-info">
                        <div className="lanc-nome">{c.nome}</div>
                        <div className="lanc-sub">
                          <span className="lanc-pts-base">
                            {bonus && (marcadoSim||temPts)
                              ? `${Math.round(c.pontos * config.streakMultiplicador)} pts (×${config.streakMultiplicador} streak)`
                              : `${c.pontos} pts`}
                          </span>
                          {limRest !== null && (
                            <span style={{color: esgotado?'var(--brand-red)':'var(--ink-4)'}}>
                              {esgotado ? ' · limite atingido' : ` · ${limRest} restante(s)`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="lanc-controle" onClick={e => e.stopPropagation()}>
                        {c.modo === 'simnao' && !esgotado && (
                          <div className="smini-group">
                            <button
                              className={`smini-btn${r.simNao==='sim'?' active-sim':''}`}
                              onClick={() => setSimNao(c.id, 'sim')}
                            >SIM</button>
                            <button
                              className={`smini-btn${r.simNao==='nao'?' active-nao':''}`}
                              onClick={() => setSimNao(c.id, 'nao')}
                            >NÃO</button>
                          </div>
                        )}
                        {c.modo === 'parcial' && !esgotado && (
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <input
                              className="inline-input-num"
                              type="number"
                              value={r.pts ?? String(c.pontos)}
                              onChange={e => setPts(c.id, e.target.value)}
                              min="0"
                              style={{width:70}}
                            />
                            <span style={{fontSize:11,color:'var(--ink-3)',fontFamily:'JetBrains Mono,monospace'}}>pts</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <FieldTextarea
                label="Observação geral (opcional)"
                value={obs}
                onChange={setObs}
                placeholder="Comentário para todos os lançamentos..."
              />

              <PrimaryBtn onClick={handleLancar} loading={loading} success={success} disabled={prontos.length===0}>
                {success ? 'Lançado!' : prontos.length > 0
                  ? `Lançar ${prontos.length} critério${prontos.length>1?'s':''}`
                  : 'Marque os critérios acima'}
              </PrimaryBtn>
            </>
          )}
        </div>

        <div className="history-side">
          <h3>Histórico recente</h3>
          {recentLancs.length === 0
            ? <EmptyState msg="Nenhum lançamento ainda."/>
            : recentLancs.map(l => {
                const v = vendedores.find(x => x.id === l.vendedorId);
                const c = criterios.find(x => x.id === l.criterioId);
                return (
                  <div key={l.id} className="history-item">
                    <Avatar nome={v?.nome||'?'} size={32} foto={v?.foto}/>
                    <div className="history-info">
                      <div className="history-name">{v ? nomeCurto(v.nome) : '?'}</div>
                      <div className="history-crit">{c?.nome}</div>
                    </div>
                    <div>
                      <div className="history-pts">+{l.pontos}</div>
                      <span className="history-date">{fmtRel(l.data)}</span>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

// ── COMPROVANTES SECTION ──────────────────────────────────────────────────────
function ComprovantesSection({ vendedorId, state, dispatch, addToast }) {
  const { comprovantes } = state;
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const meus = (comprovantes || []).filter(c => c.vendedorId === vendedorId);

  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('Arquivo muito grande (máximo 2 MB).', 'error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const id = Date.now() + Math.random();
      dispatch({ type: 'ADD_COMPROVANTE', payload: {
        id,
        vendedorId,
        nome: file.name,
        tipo: file.type,
        dados: ev.target.result,
        data: new Date().toISOString(),
        status: 'pendente',
      }});
      addToast(`Comprovante "${file.name}" anexado.`, 'success');
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    };
    reader.onerror = () => {
      addToast('Erro ao ler o arquivo.', 'error');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const remover = comp => {
    if (comp.status === 'aprovado') { addToast('Comprovantes aprovados não podem ser removidos.','error'); return; }
    if (!window.confirm(`Remover "${comp.nome}"?`)) return;
    dispatch({ type: 'REMOVE_COMPROVANTE', payload: comp.id });
    addToast('Comprovante removido.', 'info');
  };

  const verComp = comp => {
    const win = window.open('', '_blank');
    if (!win) return;
    const renderContent = dados => {
      win.document.open();
      if (comp.tipo?.startsWith('image/'))
        win.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#111;display:flex;justify-content:center;align-items:flex-start;padding:20px"><img src="${dados}" style="max-width:100%;border:none"/></body></html>`);
      else
        win.document.write(`<!DOCTYPE html><html><body style="margin:0"><iframe src="${dados}" style="width:100%;height:100vh;border:none"></iframe></body></html>`);
      win.document.close();
    };
    if (comp.dados) {
      renderContent(comp.dados);
    } else {
      win.document.write('<p style="font-family:sans-serif;padding:30px;color:#666">Carregando arquivo...</p>');
      _sb.from('comprovantes').select('dados').eq('id', comp.id).single()
        .then(({ data }) => data?.dados ? renderContent(data.dados) : null);
    }
  };

  const iconeArquivo = tipo => {
    if (tipo?.startsWith('image/')) return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="16" height="16" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 13l4-4 4 4 3-3 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 2h7l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  };

  return (
    <div className="comp-section">
      <h3>Comprovantes de cursos</h3>

      <div
        className="comp-upload-area"
        onClick={() => !uploading && inputRef.current?.click()}
        style={{ cursor: uploading ? 'wait' : 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 3v12M6 8l5-5 5 5M3 17h16M3 20h16"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{marginTop:6,fontSize:13,color:'var(--ink-3)'}}>
          {uploading ? 'Carregando…' : 'Clique para anexar comprovante'}
        </span>
        <span style={{fontSize:11,color:'var(--ink-4)',marginTop:2}}>PDF, imagem (JPG, PNG) · máx. 2 MB</span>
      </div>

      {meus.length === 0 && <EmptyState msg="Nenhum comprovante anexado." />}

      {meus.map(comp => {
        const st = comp.status || 'pendente';
        return (
          <div key={comp.id} className="comp-item">
            <div className="comp-icon">{iconeArquivo(comp.tipo)}</div>
            <div className="comp-info">
              <div className="comp-name">{comp.nome}</div>
              <div className="comp-meta" style={{display:'flex',alignItems:'center',gap:8}}>
                {fmtData(comp.data)}
                <span className={`comp-status-badge ${st}`}>
                  {st==='pendente'?'Aguardando análise':st==='aprovado'?'Aprovado':'Rejeitado'}
                </span>
              </div>
            </div>
            <button className="comp-view-btn" onClick={() => verComp(comp)}>Ver</button>
            <button className="btn-danger" onClick={() => remover(comp)} title="Remover"
              disabled={st==='aprovado'} style={{opacity:st==='aprovado'?0.3:1}}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── VENDEDOR TAB ──────────────────────────────────────────────────────────────
function VendedorTab({ state, dispatch, addToast, currentUser }) {
  const { vendedores, lancamentos, criterios, config } = state;
  const isVendedor = currentUser?.role === 'vendedor';
  // Para o dropdown de seleção, gerente local só vê sua loja
  const vendedoresDropdown = (currentUser?.role === 'gerencia' && currentUser?.lojaId)
    ? vendedores.filter(v => v.lojaId === currentUser.lojaId)
    : vendedores;

  const [vid, setVid] = useState(() =>
    isVendedor && currentUser.vendedorId ? String(currentUser.vendedorId) : ''
  );
  const [page, setPage] = useState(1);
  const [chartKey, setChartKey] = useState(0);
  const PAGE_SIZE = 8;

  useEffect(() => {
    if (isVendedor && currentUser.vendedorId) setVid(String(currentUser.vendedorId));
  }, [currentUser]);

  useEffect(() => { setPage(1); setChartKey(k => k + 1); }, [vid]);

  const vendedor = vendedores.find(v => v.id === Number(vid));

  const ranking = useMemo(() => {
    return vendedores.filter(v=>v.ativo).map(v=>({
      ...v,
      pm: pontosMes(v.id, lancamentos),
      pg: pontosTotal(v.id, lancamentos),
    })).sort((a,b) => b.pm-a.pm);
  }, [vendedores, lancamentos]);

  const vData = useMemo(() => {
    if (!vendedor) return null;
    const pg = pontosTotal(vendedor.id, lancamentos);
    const pm = pontosMes(vendedor.id, lancamentos);
    const nivel = calcularNivel(pg, config.niveis);
    const proximo = proximoNivel(pg, config.niveis);
    const streak = calcularStreak(vendedor.id, lancamentos, criterios, config.streakSemanas);
    const pos = ranking.findIndex(v => v.id === vendedor.id) + 1;
    const lider = ranking[0]?.pm || 1;
    const nLanc = lancamentos.filter(l => l.vendedorId === vendedor.id).length;

    const months = Array.from({length:6}, (_,i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      const pts = lancamentos.filter(l => {
        const ld = new Date(l.data);
        return l.vendedorId===vendedor.id && ld.getMonth()===d.getMonth() && ld.getFullYear()===d.getFullYear();
      }).reduce((s,l) => s+l.pontos, 0);
      return {
        label: d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase(),
        pts,
        current: i===0,
      };
    }).reverse();

    const allLancs = [...lancamentos]
      .filter(l => l.vendedorId === vendedor.id)
      .sort((a,b) => new Date(b.data)-new Date(a.data));

    return { pg, pm, nivel, proximo, streak, pos, lider, nLanc, months, allLancs };
  }, [vendedor, lancamentos, criterios, config, ranking]);

  const allLancs  = vData?.allLancs || [];
  const pages     = Math.max(1, Math.ceil(allLancs.length / PAGE_SIZE));
  const pageLancs = allLancs.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const maxBar    = vData ? Math.max(...vData.months.map(m => m.pts), 1) : 1;
  const maxBarH   = 130;

  return (
    <div>
      <SectionHeader
        eyebrowLeft="CRÔNICA"
        eyebrowAccent="EXPEDIENTE"
        title="Ficha do vendedor"
        byline="Histórico individual, evolução e posição no ranking."
      >
        {!isVendedor && (
          <div className="field-select-wrap" style={{minWidth:220}}>
            <select
              className="field-select"
              value={vid}
              onChange={e => setVid(e.target.value)}
            >
              <option value="">Selecione um vendedor...</option>
              {vendedoresDropdown.filter(v => v.ativo).map(v => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>
        )}
      </SectionHeader>

      {isVendedor && !currentUser.vendedorId && (
        <div className="access-denied" style={{paddingTop:40}}>
          <h2 style={{fontSize:28}}>Sem vínculo</h2>
          <p>Sua conta não está vinculada a um vendedor.<br/>Peça ao gerente para configurar em Ajustes → Usuários.</p>
        </div>
      )}

      {!vendedor && (!isVendedor || currentUser.vendedorId) && (
        <EmptyState msg="Selecione um vendedor para ver a ficha." />
      )}

      {vendedor && vData && (
        <>
          {/* HERO */}
          <div className="vendor-hero">
            <div className="vendor-hero-left">
              <Avatar nome={vendedor.nome} size={72} foto={vendedor.foto}/>
              <div className="vendor-hero-info">
                <div className="vendor-hero-pos">
                  {vData.pos===1
                    ? <LeaderStamp/>
                    : `Posição #${vData.pos} de ${ranking.length}`
                  }
                </div>
                <div className="vendor-hero-name">{vendedor.nome}</div>
                <div className="vendor-hero-badges">
                  <NivelBadge nivel={vData.nivel}/>
                  {vData.streak.ativo && <StreakBadge semanas={vData.streak.semanas}/>}
                  <span className="vendor-hero-launches">{vData.nLanc} lançamentos</span>
                </div>
              </div>
            </div>
            <div className="vendor-stats-strip">
              <div className="vendor-stat-cell">
                <span className="vendor-stat-label">Totais</span>
                <span className="vendor-stat-val accent">
                  <CountUp target={vData.pg}/>
                </span>
              </div>
              <div className="vendor-stat-cell">
                <span className="vendor-stat-label">No mês</span>
                <span className="vendor-stat-val">
                  <CountUp target={vData.pm}/>
                </span>
              </div>
              <div className="vendor-stat-cell">
                <span className="vendor-stat-label">% do líder</span>
                <span className="vendor-stat-val">
                  {Math.round((vData.pm/(vData.lider||1))*100)}%
                </span>
              </div>
            </div>
          </div>

          {/* LEVEL PROGRESS */}
          {vData.proximo && (
            <div className="level-progress-wrap">
              <div className="level-progress-header">
                <span className="level-progress-label">Próximo nível: {vData.proximo.nome}</span>
                <span className="level-progress-pts">{vData.pg.toLocaleString('pt-BR')} / {vData.proximo.minPontos.toLocaleString('pt-BR')} pts</span>
              </div>
              <ProgressBar pct={(vData.pg/vData.proximo.minPontos)*100}/>
              <div className="level-progress-sub">
                Faltam {(vData.proximo.minPontos-vData.pg).toLocaleString('pt-BR')} pts
              </div>
            </div>
          )}

          {/* CHART */}
          <div className="chart-section">
            <h3>Evolução — Últimos 6 Meses</h3>
            <div className="chart-cols" key={chartKey}>
              {vData.months.map((m,i) => (
                <div key={m.label} className={`chart-col${m.current?' current':''}`}>
                  <div className="chart-val">{m.pts>0 ? m.pts.toLocaleString('pt-BR') : ''}</div>
                  <div className="chart-bar-wrap">
                    {m.pts>0 && (
                      <div
                        className={`chart-bar${m.current?' current':' past'}`}
                        style={{
                          height:`${Math.max(m.pts/maxBar*maxBarH,4)}px`,
                          animationDelay:`${i*60}ms`
                        }}
                      />
                    )}
                  </div>
                  <div className="chart-lbl">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* LAUNCH HISTORY */}
          <div className="launches-section">
            <h3>Caderno de lançamentos</h3>
            {allLancs.length===0
              ? <EmptyState msg="Nenhum lançamento registrado."/>
              : pageLancs.map(l => {
                  const c = criterios.find(x => x.id===l.criterioId);
                  return (
                    <div key={l.id} className="launch-row">
                      <div className="launch-info">
                        <div className="launch-criterio">{c?.nome||'?'}</div>
                        {l.obs && <div className="launch-obs">"{l.obs}"</div>}
                        {l.streakAplicado && <span className="streak-tag">×{state.config.streakMultiplicador} streak</span>}
                      </div>
                      <div className="launch-right">
                        <span className={`launch-pts${c?.tipo==='negativo'?' negativo':''}`}>
                          {c?.tipo==='negativo'?'−':'+'}{l.pontos}
                        </span>
                        <span className="launch-date">{fmtData(l.data)}</span>
                      </div>
                    </div>
                  );
                })
            }
            {pages>1 && (
              <div className="pagination">
                <button className="btn-ghost" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>←</button>
                <span>{page} / {pages}</span>
                <button className="btn-ghost" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page>=pages}>→</button>
              </div>
            )}
          </div>

          {/* COMPROVANTES */}
          <ComprovantesSection
            vendedorId={vendedor.id}
            state={state}
            dispatch={dispatch}
            addToast={addToast}
          />
        </>
      )}
    </div>
  );
}

// ── FEED TAB ──────────────────────────────────────────────────────────────────
function FeedTab({ state }) {
  const { vendedores, lancamentos, criterios } = state;
  const [fVend, setFVend] = useState('');
  const [fCrit, setFCrit] = useState('');

  const filtered = useMemo(() => {
    return [...lancamentos]
      .filter(l => fVend ? l.vendedorId===Number(fVend) : true)
      .filter(l => fCrit ? l.criterioId===Number(fCrit) : true)
      .sort((a,b) => new Date(b.data)-new Date(a.data));
  }, [lancamentos, fVend, fCrit]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc,l) => {
      const d = l.data.slice(0,10);
      if(!acc[d]) acc[d]=[];
      acc[d].push(l);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div>
      <SectionHeader
        eyebrowLeft="CRÔNICA"
        eyebrowAccent="ATIVIDADE RECENTE"
        title="Diário da equipe"
        byline="Todos os lançamentos da equipe comercial, em ordem cronológica."
      />

      <div className="feed-filters">
        <div className="field-select-wrap" style={{minWidth:200}}>
          <select className="field-select" value={fVend} onChange={e=>setFVend(e.target.value)}>
            <option value="">Todos os vendedores</option>
            {vendedores.map(v=><option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
        <div className="field-select-wrap" style={{minWidth:200}}>
          <select className="field-select" value={fCrit} onChange={e=>setFCrit(e.target.value)}>
            <option value="">Todos os critérios</option>
            {criterios.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        {(fVend||fCrit) && (
          <button className="btn-ghost" onClick={()=>{ setFVend(''); setFCrit(''); }}>Limpar filtros</button>
        )}
      </div>

      {Object.keys(grouped).length===0 && <EmptyState msg="Nenhum lançamento encontrado." />}

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="feed-day">
          <div className="feed-day-header">
            <span className="feed-day-label">{fmtDataLonga(date)}</span>
            <hr className="feed-day-rule"/>
          </div>
          {items.map(l => {
            const v = vendedores.find(x=>x.id===l.vendedorId);
            const c = criterios.find(x=>x.id===l.criterioId);
            return (
              <div key={l.id} className="feed-item">
                <Avatar nome={v?.nome||'?'} size={36} foto={v?.foto}/>
                <div className="feed-item-info">
                  <div>
                    <span className="feed-item-name">{v?.nome||'?'}</span>
                    <span className="feed-item-crit">· {c?.nome}</span>
                    {l.streakAplicado && <StreakBadge semanas={state.config.streakSemanas}/>}
                  </div>
                  {l.obs && <span className="feed-item-obs">"{l.obs}"</span>}
                </div>
                <div className="feed-item-right">
                  <div className={`feed-pts${c?.tipo==='negativo'?' negativo':''}`}>
                    {c?.tipo==='negativo'?'−':'+'}{l.pontos}
                  </div>
                  <span className="feed-rel">{fmtRel(l.data)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── PERFIL TAB ────────────────────────────────────────────────────────────────
function PerfilTab({ state, dispatch, addToast, currentUser }) {
  const { vendedores, usuarios } = state;
  const vendedor = vendedores.find(v => v.id === currentUser.vendedorId);
  const usuario  = usuarios.find(u => u.id === currentUser.id);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova,  setSenhaNova]  = useState('');
  const [senhaConf,  setSenhaConf]  = useState('');
  const [erroSenha,  setErroSenha]  = useState('');
  const [uploading,  setUploading]  = useState(false);
  const fotoRef = useRef(null);

  const handleFoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('Foto muito grande (máximo 2 MB).', 'error');
      if (fotoRef.current) fotoRef.current.value = '';
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      dispatch({ type: 'UPDATE_VENDEDOR', payload: { id: vendedor.id, changes: { foto: ev.target.result } }});
      addToast('Foto atualizada!', 'success');
      setUploading(false);
      if (fotoRef.current) fotoRef.current.value = '';
    };
    reader.onerror = () => { addToast('Erro ao ler a foto.', 'error'); setUploading(false); };
    reader.readAsDataURL(file);
  };

  const removerFoto = () => {
    if (!window.confirm('Remover foto de perfil?')) return;
    dispatch({ type: 'UPDATE_VENDEDOR', payload: { id: vendedor.id, changes: { foto: null } }});
    addToast('Foto removida.', 'info');
  };

  const trocarSenha = () => {
    if (!senhaAtual)                     { setErroSenha('Informe a senha atual.'); return; }
    if (senhaAtual !== usuario?.password){ setErroSenha('Senha atual incorreta.'); return; }
    if (!senhaNova)                      { setErroSenha('Informe a nova senha.'); return; }
    if (senhaNova !== senhaConf)         { setErroSenha('As senhas não coincidem.'); return; }
    dispatch({ type: 'UPDATE_USUARIO', payload: { id: currentUser.id, changes: { password: senhaNova } }});
    addToast('Senha alterada com sucesso!', 'success');
    setSenhaAtual(''); setSenhaNova(''); setSenhaConf(''); setErroSenha('');
  };

  if (!vendedor) {
    return (
      <div>
        <SectionHeader eyebrowLeft="MEU" eyebrowAccent="PERFIL" title="Meu perfil"/>
        <div className="access-denied">
          <p>Sua conta não está vinculada a um vendedor.<br/>Peça ao gerente para configurar em Ajustes → Usuários.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrowLeft="MEU"
        eyebrowAccent="PERFIL"
        title="Meu perfil"
        byline="Atualize sua foto e senha de acesso."
      />

      <div className="perfil-grid">
        {/* FOTO */}
        <div className="perfil-foto-block">
          <div className="perfil-avatar-wrap">
            <Avatar nome={vendedor.nome} size={110} foto={vendedor.foto}/>
          </div>
          <div className="perfil-nome">{vendedor.nome}</div>
          <div className="perfil-user">@{currentUser.username}</div>
          <input
            ref={fotoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display:'none' }}
            onChange={handleFoto}
          />
          <div className="perfil-foto-btns">
            <button className="btn-ghost" onClick={() => fotoRef.current?.click()} disabled={uploading}>
              {uploading ? 'Carregando…' : vendedor.foto ? 'Trocar foto' : '+ Adicionar foto'}
            </button>
            {vendedor.foto && (
              <button className="btn-danger" style={{padding:'7px 12px'}} onClick={removerFoto}>Remover</button>
            )}
          </div>
          <div style={{fontSize:10,color:'var(--ink-4)',fontFamily:'JetBrains Mono,monospace',marginTop:6,textAlign:'center'}}>
            JPG, PNG ou WEBP · máx. 2 MB
          </div>
        </div>

        {/* SENHA */}
        <div className="perfil-senha-block">
          <h3>Alterar senha</h3>
          <FieldInput
            label="Senha atual"
            type="password"
            value={senhaAtual}
            onChange={v => { setSenhaAtual(v); setErroSenha(''); }}
            placeholder="Senha atual..."
          />
          <FieldInput
            label="Nova senha"
            type="password"
            value={senhaNova}
            onChange={v => { setSenhaNova(v); setErroSenha(''); }}
            placeholder="Nova senha..."
          />
          <FieldInput
            label="Confirmar nova senha"
            type="password"
            value={senhaConf}
            onChange={v => { setSenhaConf(v); setErroSenha(''); }}
            placeholder="Confirmar..."
          />
          {erroSenha && <div className="error-box">{erroSenha}</div>}
          <PrimaryBtn onClick={trocarSenha}>Salvar senha</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ── EXPOSE GLOBALS ────────────────────────────────────────────────────────────
window.RankingTab  = RankingTab;
window.LancarTab   = LancarTab;
window.VendedorTab = VendedorTab;
window.FeedTab     = FeedTab;
window.PerfilTab   = PerfilTab;
