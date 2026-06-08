// tabs.jsx — RankingTab, LancarTab, VendedorTab, FeedTab
const { useState, useMemo, useEffect, useRef } = React;

// ── RANKING TAB ───────────────────────────────────────────────────────────────
function RankingTab({ state, dispatch, currentUser, viewDate }) {
  const { vendedores, lancamentos, criterios, config } = state;
  const [modo, setModo] = useState('mes');
  const lojas = state.lojas || [];
  const refDate = viewDate ? new Date(viewDate + 'T12:00:00') : new Date();

  const ranking = useMemo(() => {
    return vendedores.filter(v=>v.ativo).map(v => ({
      ...v,
      pg: pontosTotal(v.id, lancamentos),
      pm: pontosMes(v.id, lancamentos, refDate),
      nivel: calcularNivel(pontosTotal(v.id, lancamentos), config.niveis),
      streak: calcularStreak(v.id, lancamentos, criterios, config.streakSemanas),
      nLanc: lancamentos.filter(l=>l.vendedorId===v.id&&!l.cancelado).length,
    })).sort((a,b) => modo==='geral' ? b.pg-a.pg : b.pm-a.pm);
  }, [vendedores, lancamentos, criterios, config, modo, viewDate]);


  const rankingLojas = useMemo(() => {
    return lojas.map(loja => {
      const vAtivos = vendedores.filter(v => v.ativo && Number(v.lojaId) === Number(loja.id));
      const n = vAtivos.length || 1;
      const pg = vAtivos.reduce((s,v) => s + pontosTotal(v.id, lancamentos), 0);
      const pm = vAtivos.reduce((s,v) => s + pontosMes(v.id, lancamentos, refDate), 0);
      return { ...loja, pg: Math.round(pg/n), pm: Math.round(pm/n), vAtivos: vAtivos.length };
    }).filter(l => l.vAtivos > 0).sort((a,b) => modo==='geral' ? b.pg-a.pg : b.pm-a.pm);
  }, [lojas, vendedores, lancamentos, modo, viewDate]);

  const cursosVendedor = useMemo(() => {
    const comps = state.comprovantes || [];
    return vendedores.filter(v => v.ativo).map(v => {
      const aprovados = comps.filter(c => c.status === 'aprovado' && Number(c.vendedorId) === v.id).length;
      const loja = lojas.find(l => Number(l.id) === Number(v.lojaId));
      return { ...v, totalCursos: aprovados, lojaNome: loja?.nome || '—' };
    }).filter(v => v.totalCursos > 0).sort((a,b) => b.totalCursos - a.totalCursos);
  }, [vendedores, lojas, state.comprovantes]);

  const maxPts = ranking[0] ? (modo==='geral' ? ranking[0].pg : ranking[0].pm) : 1;
  const totalPtsmes = lancamentos.reduce((s,l) => {
    const d=new Date(l.data);
    return !l.cancelado&&d.getMonth()===refDate.getMonth()&&d.getFullYear()===refDate.getFullYear() ? s+l.pontos : s;
  }, 0);
  const lancMes = lancamentos.filter(l=>{ const d=new Date(l.data); return !l.cancelado&&d.getMonth()===refDate.getMonth()&&d.getFullYear()===refDate.getFullYear(); }).length;

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

  const mesLabel = refDate.toLocaleDateString('pt-BR',{month:'long'}).toUpperCase();

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
                <Avatar nome={v.nome} size={40} foto={v.foto} achievements={v.achievements}/>
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

      {/* ── Ranking de lojas ── */}
      {rankingLojas.length > 0 && (
        <div style={{marginTop:32}}>
          <div className="section-eyebrow" style={{marginBottom:12}}>
            DESEMPENHO · <span className="accent">RANKING POR UNIDADE</span>
            <span style={{marginLeft:8,fontSize:10,color:'var(--ink-4)',fontFamily:'JetBrains Mono,monospace',fontWeight:400,letterSpacing:0}}>média por vendedor</span>
          </div>
          <div className="rk-table">
            <div className="rk-header">
              <div className="rk-cell">POS</div>
              <div className="rk-cell">UNIDADE</div>
              <div className="rk-cell rk-progress-col">PROGRESSO</div>
              <div className="rk-cell" style={{textAlign:'right'}}>MÉD. PTS</div>
            </div>
            {rankingLojas.map((loja, i) => {
              const pts    = modo==='geral' ? loja.pg : loja.pm;
              const maxL   = modo==='geral' ? (rankingLojas[0]?.pg||1) : (rankingLojas[0]?.pm||1);
              const pct    = maxL > 0 ? (pts / maxL) * 100 : 0;
              return (
                <div key={loja.id} className={`rk-row${i===0?' pos-1':''}`}>
                  <div className="rk-cell">
                    <span className={`rk-pos${i===0?' leader':''}`}>{String(i+1).padStart(2,'0')}</span>
                  </div>
                  <div className="rk-cell">
                    <div className="rk-name-main">{loja.nome}</div>
                    <div className="rk-name-sub">
                      <span className="rk-lancamentos">{loja.vAtivos} vendedor{loja.vAtivos!==1?'es':''}</span>
                    </div>
                  </div>
                  <div className="rk-cell rk-progress-col">
                    <ProgressBar pct={pct} leader={i===0}/>
                    <div className="rk-pct">{Math.round(pct)}% do líder</div>
                  </div>
                  <div className="rk-cell" style={{textAlign:'right'}}>
                    <div className="rk-pts-main">{pts.toLocaleString('pt-BR')}</div>
                    {modo==='mes' && <span className="rk-pts-sub">{loja.pg.toLocaleString('pt-BR')} geral</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ranking de cursos por vendedor ── */}
      <div style={{marginTop:32}}>
        <div className="section-eyebrow" style={{marginBottom:12}}>
          CAPACITAÇÃO · <span className="accent">CURSOS POR VENDEDOR</span>
        </div>
        {cursosVendedor.length === 0 ? (
          <EmptyState msg="Nenhum comprovante de curso aprovado ainda." />
        ) : (
          <div className="rk-table">
            <div className="rk-header">
              <div className="rk-cell">POS</div>
              <div className="rk-cell">VENDEDOR</div>
              <div className="rk-cell rk-progress-col">PROGRESSO</div>
              <div className="rk-cell" style={{textAlign:'right'}}>CURSOS</div>
            </div>
            {cursosVendedor.map((v, i) => {
              const maxC = cursosVendedor[0].totalCursos || 1;
              const pct  = (v.totalCursos / maxC) * 100;
              return (
                <div key={v.id} className={`rk-row${i===0?' pos-1':''}`}>
                  <div className="rk-cell">
                    <span className={`rk-pos${i===0?' leader':''}`}>{String(i+1).padStart(2,'0')}</span>
                  </div>
                  <div className="rk-cell">
                    <div className="rk-name-main">{v.nome}</div>
                    <div className="rk-name-sub">
                      <span className="rk-lancamentos">{v.lojaNome}</span>
                    </div>
                  </div>
                  <div className="rk-cell rk-progress-col">
                    <ProgressBar pct={pct} leader={i===0}/>
                  </div>
                  <div className="rk-cell" style={{textAlign:'right'}}>
                    <div className="rk-pts-main">{v.totalCursos}</div>
                    <span className="rk-pts-sub">aprovados</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
  const [mesLanc, setMesLanc] = useState(''); // '' = mês atual  (formato YYYY-MM)
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Comprovantes pendentes filtrados pela loja do gerente
  const vidsVisiveis = new Set(vendedoresVisiveis.map(v => v.id));
  const pendentesComps = (state.comprovantes || []).filter(c =>
    (!c.status || c.status === 'pendente') && vidsVisiveis.has(c.vendedorId)
  );
  const ptsCurso   = criterios.find(c => c.id === 9)?.pontos ?? 10;
  const META_CURSOS = 3;

  const [editandoCompId, setEditandoCompId] = useState(null);

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

  const _lancarPontosCurso = (vendedorId, totalAprovados) => {
    const newId = Math.max(0, ...lancamentos.map(l=>l.id)) + 1;
    dispatch({ type:'ADD_LANCAMENTO', payload:{
      id: newId, vendedorId, criterioId: 9,
      pontos: ptsCurso, obs: `Meta de ${META_CURSOS} cursos atingida (${totalAprovados} aprovados).`,
      data: new Date().toISOString(), streakAplicado: false,
      lancadoPor: currentUser?.username || null,
    }});
  };

  const aprovarComp = comp => {
    dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id:comp.id, changes:{ status:'aprovado' } } });
    const jaAprovados = (state.comprovantes || []).filter(c =>
      c.vendedorId === comp.vendedorId && c.status === 'aprovado'
    ).length; // quantidade ANTES desta aprovação
    const total = jaAprovados + 1;
    const v = vendedores.find(x => x.id === comp.vendedorId);
    if (total % META_CURSOS === 0) {
      _lancarPontosCurso(comp.vendedorId, total);
      addToast(`Meta de ${META_CURSOS} cursos atingida por ${nomeFirst(v?.nome||'?')}! +${ptsCurso} pts lançados.`, 'success');
    } else {
      const faltam = META_CURSOS - (total % META_CURSOS);
      addToast(`Comprovante aprovado (${total}/${META_CURSOS}). Faltam ${faltam} curso${faltam>1?'s':''} para os pontos.`, 'success');
    }
  };

  const rejeitarComp = comp => {
    dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id:comp.id, changes:{ status:'rejeitado' } } });
    const v = vendedores.find(x=>x.id===comp.vendedorId);
    addToast(`Comprovante de ${nomeFirst(v?.nome||'?')} rejeitado.`, 'info');
  };

  const editarStatus = (comp, novoStatus) => {
    const eraAprovado = comp.status === 'aprovado';
    const virarAprovado = novoStatus === 'aprovado';

    const vid = Number(comp.vendedorId);
    // calcula quantos aprovados haverá APÓS esta mudança
    const prevAprov = (state.comprovantes || []).filter(c =>
      Number(c.vendedorId) === vid && c.status === 'aprovado'
    ).length;
    const newAprov = prevAprov
      + (virarAprovado && !eraAprovado ? 1 : 0)
      + (!virarAprovado && eraAprovado ? -1 : 0);

    dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id:comp.id, changes:{ status:novoStatus } } });
    setEditandoCompId(null);

    const v = vendedores.find(x => x.id === vid);
    // reconciliação absoluta: lotes devidos vs lançamentos existentes
    const lotesDevidos = Math.floor(newAprov / META_CURSOS);
    const lancsC9 = lancamentos
      .filter(l => Number(l.vendedorId) === vid && Number(l.criterioId) === 9)
      .sort((a,b) => new Date(b.data) - new Date(a.data));
    const excessos = lancsC9.length - lotesDevidos;

    if (excessos > 0) {
      // remove lançamentos mais recentes que excedam o owed
      for (let i = 0; i < excessos; i++) {
        dispatch({ type:'REMOVE_LANCAMENTO', payload: Number(lancsC9[i].id) });
      }
      addToast(`Pontos revertidos para ${nomeFirst(v?.nome||'?')} (-${ptsCurso * excessos} pts).`, 'info');
    } else if (excessos < 0) {
      // faltam lançamentos — adiciona os que estão em débito
      const faltam = Math.abs(excessos);
      for (let i = 0; i < faltam; i++) _lancarPontosCurso(vid, (lancsC9.length + i + 1) * META_CURSOS);
      addToast(`Meta atingida! +${ptsCurso * faltam} pts para ${nomeFirst(v?.nome||'?')}.`, 'success');
    } else {
      addToast('Status do comprovante atualizado.', 'info');
    }
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
    const r = resps[c.id] || {};
    // verificar se foi selecionado
    const selecionado = c.modo === 'simnao'  ? r.simNao === 'sim'
                      : c.modo === 'parcial' ? Number(r.pts) > 0
                      : false;
    if (!selecionado) return false;
    // excluir se esgotado (limite mensal atingido)
    if (vid && c.limitesPorMes > 0) {
      const refMes = mesLanc ? mesLanc + '-15T12:00:00' : null;
      const usarPontos = c.modo === 'parcial' && c.tipoLimite === 'pontos';
      const usado = usarPontos
        ? pontosNoCriterioMes(Number(vid), c.id, lancamentos, refMes)
        : countNoMes(Number(vid), c.id, lancamentos, refMes);
      if (usado >= c.limitesPorMes) return false;
    }
    return true;
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
        // blindagem: respeitar limite mensal conforme tipoLimite e mês selecionado
        if (c.limitesPorMes > 0) {
          const refMes = mesLanc ? mesLanc + '-15T12:00:00' : null;
          if (c.tipoLimite === 'pontos' && c.modo === 'parcial') {
            const usado = pontosNoCriterioMes(Number(vid), c.id, lancamentos, refMes);
            const restante = c.limitesPorMes - usado;
            if (restante <= 0) return;
            pts = Math.min(pts, restante);
          } else {
            const usado = countNoMes(Number(vid), c.id, lancamentos, refMes);
            if (usado >= c.limitesPorMes) return;
          }
        }
        if (bonus) pts = Math.round(pts * config.streakMultiplicador);
        total += pts;
        maxId++;
        dispatch({ type: 'ADD_LANCAMENTO', payload: {
          id: maxId, vendedorId: Number(vid), criterioId: c.id,
          pontos: pts, obs: obs.trim(),
          data: mesLanc ? new Date(mesLanc + '-15T12:00:00').toISOString() : new Date().toISOString(),
          streakAplicado: bonus,
          lancadoPor: currentUser?.username || null,
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
            const jaAprov = (state.comprovantes||[]).filter(c=>c.vendedorId===comp.vendedorId&&c.status==='aprovado').length;
            const seriaON = (jaAprov + 1) % META_CURSOS === 0;
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
                    <Avatar nome={v?.nome||'?'} size={18} foto={v?.foto} achievements={v?.achievements||[]}/>
                    <span>{v?.nome||'?'}</span>
                    <span style={{color:'var(--ink-4)'}}>· {fmtData(comp.data)}</span>
                    <span style={{color:'var(--ink-4)',fontFamily:'JetBrains Mono,monospace',fontSize:10}}>
                      · {jaAprov}/{META_CURSOS} cursos
                    </span>
                  </div>
                </div>
                <div className="comp-pending-actions">
                  <button className="comp-view-btn" onClick={()=>verComp(comp)}>Ver</button>
                  <button className="btn-aprovar" onClick={()=>aprovarComp(comp)}>
                    {seriaON ? `✓ Aprovar +${ptsCurso}pts` : `✓ Aprovar (${jaAprov+1}/${META_CURSOS})`}
                  </button>
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
              <Avatar nome={vendedor.nome} size={34} foto={vendedor.foto} achievements={vendedor.achievements||[]}/>
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
                  const refMes = mesLanc ? mesLanc + '-15T12:00:00' : null;
                  const usarPontos = c.modo === 'parcial' && c.tipoLimite === 'pontos';
                  const usadoMes = c.limitesPorMes > 0
                    ? (usarPontos
                        ? pontosNoCriterioMes(Number(vid), c.id, lancamentos, refMes)
                        : countNoMes(Number(vid), c.id, lancamentos, refMes))
                    : 0;
                  const limRest = c.limitesPorMes > 0 ? c.limitesPorMes - usadoMes : null;
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
                              {esgotado
                                ? ' · limite atingido'
                                : ` · ${limRest} ${usarPontos ? 'pts restantes' : `vez${limRest!==1?'es':''} restante${limRest!==1?'s':''}`}`}
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
                              min="1"
                              max={usarPontos && limRest !== null ? limRest : undefined}
                              style={{width:70}}
                            />
                            <span style={{fontSize:11,color:'var(--ink-3)',fontFamily:'JetBrains Mono,monospace'}}>
                              pts{usarPontos && limRest !== null ? ` / ${limRest}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="field-group" style={{marginTop:12}}>
                <label className="field-label">Mês de referência</label>
                <input
                  type="month"
                  className="field-input"
                  value={mesLanc}
                  max={new Date().toISOString().slice(0,7)}
                  onChange={e => setMesLanc(e.target.value)}
                  style={{width:'100%'}}
                />
                {mesLanc && (
                  <div style={{marginTop:4,fontSize:11,color:'var(--accent)',fontFamily:'JetBrains Mono,monospace'}}>
                    Lançando em: {new Date(mesLanc+'-15T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
                    {' '}· <button className="btn-ghost" style={{fontSize:11,padding:'0 4px'}} onClick={()=>setMesLanc('')}>usar mês atual</button>
                  </div>
                )}
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
                    <Avatar nome={v?.nome||'?'} size={32} foto={v?.foto} achievements={v?.achievements||[]}/>
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

      {/* ── Comprovantes já analisados (com edição) ── */}
      {(() => {
        const analisados = (state.comprovantes||[]).filter(c =>
          (c.status==='aprovado'||c.status==='rejeitado') && vidsVisiveis.has(c.vendedorId)
        ).sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,20);
        if (!analisados.length) return null;
        return (
          <div className="comp-pendentes-block" style={{marginTop:24}}>
            <div className="section-eyebrow" style={{marginBottom:12}}>
              ANALISADOS · <span className="accent">ÚLTIMOS {analisados.length}</span>
            </div>
            {analisados.map(comp => {
              const v = vendedores.find(x=>x.id===comp.vendedorId);
              const st = comp.status;
              const editando = editandoCompId === comp.id;
              return (
                <div key={comp.id} className="comp-pending-row" style={{opacity:0.85}}>
                  <div className="comp-pending-icon" style={{color:st==='aprovado'?'#2d7d2d':'#cc1111'}}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      {st==='aprovado'
                        ? <path d="M4 10l5 5 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        : <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      }
                    </svg>
                  </div>
                  <div className="comp-pending-info">
                    <div className="comp-pending-nome">{comp.nome}</div>
                    <div className="comp-pending-meta">
                      <Avatar nome={v?.nome||'?'} size={18} foto={v?.foto} achievements={v?.achievements||[]}/>
                      <span>{v?.nome||'?'}</span>
                      <span style={{color:'var(--ink-4)'}}>· {fmtData(comp.data)}</span>
                      <span className={`comp-status-badge ${st}`} style={{marginLeft:4}}>
                        {st==='aprovado'?'Aprovado':'Rejeitado'}
                      </span>
                    </div>
                  </div>
                  <div className="comp-pending-actions">
                    <button className="comp-view-btn" onClick={()=>verComp(comp)}>Ver</button>
                    {editando ? (
                      <>
                        <button className="btn-aprovar" style={{fontSize:11}} onClick={()=>editarStatus(comp,'aprovado')}>Aprovado</button>
                        <button className="btn-danger" style={{padding:'5px 10px',fontSize:11}} onClick={()=>editarStatus(comp,'rejeitado')}>Rejeitado</button>
                        <button className="btn-ghost" style={{padding:'5px 10px',fontSize:11}} onClick={()=>setEditandoCompId(null)}>Cancelar</button>
                      </>
                    ) : (
                      <button className="btn-ghost" style={{padding:'5px 12px',fontSize:11}} onClick={()=>setEditandoCompId(comp.id)}>Editar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
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
      const tempId = Date.now();
      dispatch({
        type: 'ADD_COMPROVANTE',
        payload: {
          id: tempId,
          vendedorId,
          nome: file.name,
          tipo: file.type,
          dados: ev.target.result,
          data: new Date().toISOString(),
          status: 'pendente',
        },
        _dispatch: dispatch,
      });
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

  const META_CURSOS_V = 3;
  const aprovados = meus.filter(c => c.status === 'aprovado').length;
  const progresso = aprovados % META_CURSOS_V;
  const lotes = Math.floor(aprovados / META_CURSOS_V);

  return (
    <div className="comp-section">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
        <h3 style={{marginBottom:0}}>Comprovantes de cursos</h3>
        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--ink-3)'}}>
          {aprovados} aprovado{aprovados!==1?'s':''}{lotes>0?` · ${lotes} lote${lotes>1?'s':''} de pontos`:''}
        </span>
      </div>
      {/* Barra de progresso até próximos pontos */}
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--ink-4)',marginBottom:4,fontFamily:'JetBrains Mono,monospace'}}>
          <span>Próximos +10 pts</span>
          <span>{progresso}/{META_CURSOS_V} cursos</span>
        </div>
        <div style={{height:4,background:'var(--rule)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${(progresso/META_CURSOS_V)*100}%`,background:'var(--accent)',borderRadius:2,transition:'width .4s ease'}}/>
        </div>
      </div>

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
function VendedorTab({ state, dispatch, addToast, currentUser, viewDate }) {
  const { vendedores, lancamentos, criterios, config } = state;
  const isVendedor = currentUser?.role === 'vendedor';
  const refDate = viewDate ? new Date(viewDate + 'T12:00:00') : new Date();
  // Para o dropdown de seleção, gerente local só vê sua loja
  const vendedoresDropdown = (currentUser?.role === 'gerencia' && currentUser?.lojaId)
    ? vendedores.filter(v => v.lojaId === currentUser.lojaId)
    : vendedores;

  const [vid, setVid] = useState(() =>
    isVendedor && currentUser.vendedorId ? String(currentUser.vendedorId) : ''
  );
  const [page, setPage] = useState(1);
  const [chartKey, setChartKey] = useState(0);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const PAGE_SIZE = 8;
  const isGerencia = currentUser?.role === 'gerencia';

  const cancelarLanc = (l) => {
    dispatch({ type:'CANCEL_LANCAMENTO', payload:{
      id: l.id,
      canceladoPor: currentUser.username,
      canceladoEm:  new Date().toISOString(),
    }});
    setConfirmRemoveId(null);
    addToast('Lançamento removido. Histórico mantido.', 'info');
  };

  useEffect(() => {
    if (isVendedor && currentUser.vendedorId) setVid(String(currentUser.vendedorId));
  }, [currentUser]);

  useEffect(() => { setPage(1); setChartKey(k => k + 1); }, [vid]);

  const vendedor = vendedores.find(v => v.id === Number(vid));

  const ranking = useMemo(() => {
    return vendedores.filter(v=>v.ativo).map(v=>({
      ...v,
      pm: pontosMes(v.id, lancamentos, refDate),
      pg: pontosTotal(v.id, lancamentos),
    })).sort((a,b) => b.pm-a.pm);
  }, [vendedores, lancamentos]);

  const vData = useMemo(() => {
    if (!vendedor) return null;
    const pg = pontosTotal(vendedor.id, lancamentos);
    const pm = pontosMes(vendedor.id, lancamentos, refDate);
    const nivel = calcularNivel(pg, config.niveis);
    const proximo = proximoNivel(pg, config.niveis);
    const streak = calcularStreak(vendedor.id, lancamentos, criterios, config.streakSemanas);
    const pos = ranking.findIndex(v => v.id === vendedor.id) + 1;
    const lider = ranking[0]?.pm || 1;
    const nLanc = lancamentos.filter(l => l.vendedorId === vendedor.id && !l.cancelado).length;

    const months = Array.from({length:6}, (_,i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
      const pts = lancamentos.filter(l => {
        const ld = new Date(l.data);
        return l.vendedorId===vendedor.id && !l.cancelado && ld.getMonth()===d.getMonth() && ld.getFullYear()===d.getFullYear();
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
                  const confirming = confirmRemoveId === l.id;
                  return (
                    <div key={l.id} className={`launch-row${l.cancelado?' cancelado':''}`}>
                      <div className="launch-info">
                        <div className="launch-criterio">{c?.nome||'?'}</div>
                        {l.obs && <div className="launch-obs">"{l.obs}"</div>}
                        {l.streakAplicado && <span className="streak-tag">×{state.config.streakMultiplicador} streak</span>}
                        <div className="launch-meta-info">
                          {l.lancadoPor && <span>Lançado por {l.lancadoPor}</span>}
                          {l.cancelado && (
                            <span className="launch-cancelled-info"> · Removido por {l.canceladoPor} · {fmtData(l.canceladoEm)}</span>
                          )}
                        </div>
                      </div>
                      <div className="launch-right">
                        <span className={`launch-pts${c?.tipo==='negativo'?' negativo':''}`}>
                          {c?.tipo==='negativo'?'−':'+'}{l.pontos}
                        </span>
                        <span className="launch-date">{fmtData(l.data)}</span>
                        {isGerencia && !l.cancelado && (
                          confirming
                            ? <div style={{display:'flex',gap:4,marginTop:4}}>
                                <button className="btn-danger" style={{padding:'3px 8px',fontSize:10}} onClick={()=>cancelarLanc(l)}>Confirmar</button>
                                <button className="btn-ghost" style={{padding:'3px 8px',fontSize:10}} onClick={()=>setConfirmRemoveId(null)}>Cancelar</button>
                              </div>
                            : <button className="btn-ghost" style={{padding:'3px 8px',fontSize:10,marginTop:4,color:'var(--ink-3)'}} onClick={()=>setConfirmRemoveId(l.id)}>Remover</button>
                        )}
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
function FeedTab({ state, dispatch, addToast, currentUser }) {
  const { vendedores, lancamentos, criterios } = state;
  const [fVend, setFVend] = useState('');
  const [fCrit, setFCrit] = useState('');
  const [confirmRemoveFeed, setConfirmRemoveFeed] = useState(null);
  const isGerencia = currentUser?.role === 'gerencia';

  const cancelarLancFeed = (l) => {
    dispatch({ type:'CANCEL_LANCAMENTO', payload:{
      id: l.id,
      canceladoPor: currentUser.username,
      canceladoEm:  new Date().toISOString(),
    }});
    setConfirmRemoveFeed(null);
    addToast('Lançamento removido. Histórico mantido.', 'info');
  };

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
            const confirming = confirmRemoveFeed === l.id;
            return (
              <div key={l.id} className={`feed-item${l.cancelado?' cancelado':''}`}>
                <Avatar nome={v?.nome||'?'} size={36} foto={v?.foto} achievements={v?.achievements||[]}/>
                <div className="feed-item-info">
                  <div>
                    <span className="feed-item-name">{v?.nome||'?'}</span>
                    <span className="feed-item-crit">· {c?.nome}</span>
                    {l.streakAplicado && !l.cancelado && <StreakBadge semanas={state.config.streakSemanas}/>}
                    {l.cancelado && <span className="feed-cancelled-badge">removido</span>}
                  </div>
                  {l.obs && <span className="feed-item-obs">"{l.obs}"</span>}
                  <span className="feed-meta-info">
                    {l.lancadoPor && <span>por {l.lancadoPor}</span>}
                    {l.cancelado && (
                      <span className="feed-cancelled-by"> · removido por {l.canceladoPor} · {fmtData(l.canceladoEm)}</span>
                    )}
                  </span>
                </div>
                <div className="feed-item-right">
                  <div className={`feed-pts${c?.tipo==='negativo'?' negativo':''}`}>
                    {c?.tipo==='negativo'?'−':'+'}{l.pontos}
                  </div>
                  <span className="feed-rel">{fmtRel(l.data)}</span>
                  {isGerencia && !l.cancelado && (
                    confirming
                      ? <div style={{display:'flex',gap:4,marginTop:4,justifyContent:'flex-end'}}>
                          <button className="btn-danger" style={{padding:'3px 8px',fontSize:10}} onClick={()=>cancelarLancFeed(l)}>Confirmar</button>
                          <button className="btn-ghost" style={{padding:'3px 8px',fontSize:10}} onClick={()=>setConfirmRemoveFeed(null)}>×</button>
                        </div>
                      : <button className="btn-ghost" style={{padding:'3px 8px',fontSize:10,marginTop:4,color:'var(--ink-3)'}} onClick={()=>setConfirmRemoveFeed(l.id)}>Remover</button>
                  )}
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

// ── CURSOS TAB ────────────────────────────────────────────────────────────────
function CursosTab({ state, dispatch, addToast, currentUser }) {
  const isGerencia = currentUser?.role === 'gerencia';
  const vendedores = (state.vendedores || []).filter(v => v.ativo);
  const cursos     = state.cursos || [];

  const [titulo,      setTitulo]      = useState('');
  const [link,        setLink]        = useState('');
  const [descricao,   setDescricao]   = useState('');
  const [todosVend,   setTodosVend]   = useState(true);
  const [selVids,     setSelVids]     = useState([]);

  const toggleVend = id => setSelVids(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const handleAdd = () => {
    if (!titulo.trim()) { addToast('Informe o título do curso.', 'error'); return; }
    if (!link.trim())   { addToast('Informe o link do curso.', 'error'); return; }
    if (!todosVend && selVids.length === 0) { addToast('Selecione ao menos um vendedor.', 'error'); return; }
    dispatch({
      type:'ADD_CURSO',
      payload:{
        id: Date.now(),
        titulo: titulo.trim(), link: link.trim(),
        descricao: descricao.trim(),
        data: new Date().toISOString(),
        vendedorIds: todosVend ? [] : selVids.map(Number),
      },
      _dispatch: dispatch,
    });
    addToast('Curso adicionado!', 'success');
    setTitulo(''); setLink(''); setDescricao(''); setSelVids([]); setTodosVend(true);
  };

  const handleRemove = curso => {
    if (!window.confirm(`Remover "${curso.titulo}"?`)) return;
    dispatch({ type:'REMOVE_CURSO', payload: curso.id });
    addToast('Curso removido.', 'info');
  };

  const myVendedorId = Number(currentUser?.vendedorId);
  const meusCursos = isGerencia
    ? [...cursos].sort((a,b) => new Date(b.data)-new Date(a.data))
    : cursos.filter(c =>
        c.vendedorIds.length === 0 ||
        c.vendedorIds.map(Number).includes(myVendedorId)
      ).sort((a,b) => new Date(b.data)-new Date(a.data));

  return (
    <div>
      <SectionHeader
        eyebrowLeft="CAPACITAÇÃO"
        eyebrowAccent="CURSOS"
        title="Cursos e treinamentos"
        byline="Links de cursos disponibilizados pela gestão para a equipe."
      />

      {isGerencia && (
        <div className="form-block" style={{marginBottom:24}}>
          <div className="section-eyebrow" style={{marginBottom:12}}>
            ADICIONAR · <span className="accent">NOVO CURSO</span>
          </div>

          <div className="field-group">
            <label className="field-label">Título</label>
            <input className="field-input" value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ex: Técnicas de negociação"/>
          </div>
          <div className="field-group">
            <label className="field-label">Link do curso</label>
            <input className="field-input" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..." type="url"/>
          </div>
          <div className="field-group">
            <label className="field-label">Descrição (opcional)</label>
            <input className="field-input" value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Breve descrição do conteúdo..."/>
          </div>

          <div className="field-group">
            <label className="field-label">Destinatários</label>
            <div className="seg-control" style={{marginBottom:8}}>
              <button className={`seg-btn${todosVend?' active':''}`} onClick={()=>setTodosVend(true)}>Todos os vendedores</button>
              <button className={`seg-btn${!todosVend?' active':''}`} onClick={()=>setTodosVend(false)}>Específicos</button>
            </div>
            {!todosVend && (
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                {vendedores.map(v => (
                  <button key={v.id}
                    className={`seg-btn${selVids.includes(v.id)?' active':''}`}
                    onClick={()=>toggleVend(v.id)}
                    style={{fontSize:11}}
                  >{nomeFirst(v.nome)}</button>
                ))}
                {vendedores.length === 0 && <span style={{color:'var(--ink-4)',fontSize:12}}>Nenhum vendedor ativo.</span>}
              </div>
            )}
          </div>

          <PrimaryBtn onClick={handleAdd}>Adicionar curso</PrimaryBtn>
        </div>
      )}

      {meusCursos.length === 0 && <EmptyState msg="Nenhum curso disponível no momento."/>}

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {meusCursos.map(curso => {
          const dest = curso.vendedorIds.length === 0
            ? 'Todos os vendedores'
            : curso.vendedorIds.map(id => {
                const v = (state.vendedores||[]).find(x=>x.id===id);
                return v ? nomeFirst(v.nome) : '?';
              }).join(', ');
          return (
            <div key={curso.id} style={{
              background:'var(--card-bg)', border:'1px solid var(--rule)',
              borderRadius:6, padding:'14px 18px',
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:14,
            }}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontFamily:"'Anton',sans-serif",fontSize:15,textTransform:'uppercase',letterSpacing:'.02em',marginBottom:3}}>
                  {curso.titulo}
                </div>
                {curso.descricao && (
                  <div style={{fontFamily:"'Newsreader',serif",fontStyle:'italic',fontSize:12,color:'var(--ink-3)',marginBottom:5}}>
                    {curso.descricao}
                  </div>
                )}
                <div style={{display:'flex',gap:10,flexWrap:'wrap',fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--ink-4)'}}>
                  <span>{fmtData(curso.data)}</span>
                  {isGerencia && <span>· {dest}</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center'}}>
                <a href={curso.link} target="_blank" rel="noopener noreferrer"
                  className="btn-aprovar" style={{textDecoration:'none',fontSize:12,padding:'6px 14px'}}>
                  Acessar →
                </a>
                {isGerencia && (
                  <button className="btn-danger" style={{padding:'6px 10px'}} onClick={()=>handleRemove(curso)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CAMPANHAS TAB ─────────────────────────────────────────────────────────────
const ACHIEVEMENT_FRAMES = [
  { id:'gold',   label:'Ouro',   color:'#FFD700', glow:'rgba(255,215,0,0.7)' },
  { id:'silver', label:'Prata',  color:'#C0C0C0', glow:'rgba(192,192,192,0.7)' },
  { id:'bronze', label:'Bronze', color:'#CD7F32', glow:'rgba(205,127,50,0.7)' },
  { id:'fire',   label:'Fogo',   color:'#FF4500', glow:'rgba(255,69,0,0.7)' },
  { id:'ice',    label:'Gelo',   color:'#00BFFF', glow:'rgba(0,191,255,0.7)' },
  { id:'purple', label:'Roxo',   color:'#9B59B6', glow:'rgba(155,89,182,0.7)' },
];

function AchievementBadge({ ach, size = 'md' }) {
  const s = size === 'sm' ? 22 : 32;
  return (
    <div title={`${ach.nome}${ach.campanhaName ? ' · ' + ach.campanhaName : ''}`}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        width: s, height: s, borderRadius:'50%',
        background: `radial-gradient(circle, ${ach.cor}33, ${ach.cor}99)`,
        border: `2px solid ${ach.cor}`,
        boxShadow: `0 0 6px ${ach.cor}88`,
        fontSize: s * 0.55, cursor:'default', flexShrink:0,
      }}>
      {ach.icone}
    </div>
  );
}

function CampanhaRanking({ campanha, state }) {
  const { vendedores, lancamentos, lojas, comprovantes } = state;
  const start = new Date(campanha.dataInicio);
  const end   = new Date(campanha.dataFim + (campanha.dataFim && campanha.dataFim.length === 10 ? 'T23:59:59Z' : ''));

  // Mapa criterioId → pontos da campanha (usa pontos customizados da campanha)
  const campPontosMap = useMemo(() => {
    const map = {};
    (campanha.criteriosConfig || []).forEach(c => { if (c.criterioId) map[c.criterioId] = c.pontos; });
    return map;
  }, [campanha]);

  const criterioIds = useMemo(() =>
    (campanha.criteriosConfig || []).map(c => c.criterioId).filter(Boolean),
  [campanha]);

  // Filtro de loja da campanha ([] = todas)
  const campLojaIds = useMemo(() =>
    (campanha.lojaIds||[]).map(Number),
  [campanha]);

  const vendFiltrados = useMemo(() =>
    vendedores.filter(v => v.ativo && (campLojaIds.length === 0 || campLojaIds.includes(Number(v.lojaId)))),
  [vendedores, campLojaIds]);

  const vendRank = useMemo(() => {
    return vendFiltrados.map(v => {
      const pts = lancamentos.filter(l =>
        l.vendedorId === v.id && !l.cancelado &&
        criterioIds.includes(l.criterioId) &&
        new Date(l.data) >= start && new Date(l.data) <= end
      ).reduce((s, l) => s + (campPontosMap[l.criterioId] ?? l.pontos), 0);
      return { ...v, pts };
    }).filter(v => v.pts > 0).sort((a,b) => b.pts - a.pts);
  }, [vendFiltrados, lancamentos, campanha, criterioIds, campPontosMap]);

  const lojaRank = useMemo(() => {
    if (!campanha.mostrarLojas) return [];
    const lojasAlvo = campLojaIds.length > 0
      ? lojas.filter(l => campLojaIds.includes(Number(l.id)))
      : lojas;
    return lojasAlvo.map(loja => {
      const vs = vendedores.filter(v => v.ativo && Number(v.lojaId) === Number(loja.id));
      const total = vs.reduce((s,v) => {
        return s + lancamentos.filter(l =>
          l.vendedorId === v.id && !l.cancelado &&
          criterioIds.includes(l.criterioId) &&
          new Date(l.data) >= start && new Date(l.data) <= end
        ).reduce((ss, l) => ss + (campPontosMap[l.criterioId] ?? l.pontos), 0);
      }, 0);
      return { ...loja, pts: vs.length ? Math.round(total / vs.length) : 0, vAtivos: vs.length };
    }).filter(l => l.pts > 0).sort((a,b) => b.pts - a.pts);
  }, [lojas, vendedores, lancamentos, campanha, criterioIds, campPontosMap, campLojaIds]);

  const cursosRank = useMemo(() => {
    if (!campanha.mostrarCursos) return [];
    const comps = comprovantes || [];
    return vendFiltrados.map(v => {
      const aprovados = comps.filter(c =>
        c.status === 'aprovado' && Number(c.vendedorId) === v.id &&
        new Date(c.data) >= start && new Date(c.data) <= end
      ).length;
      return { ...v, aprovados };
    }).filter(v => v.aprovados > 0).sort((a,b) => b.aprovados - a.aprovados);
  }, [vendedores, comprovantes, campanha]);

  const status = new Date() < start ? 'futura' : new Date() > end ? 'encerrada' : 'ativa';
  const premio = (pos) => campanha.premiacoes?.find(p => p.posicao === pos);

  if (vendRank.length === 0 && lojaRank.length === 0 && cursosRank.length === 0)
    return <EmptyState msg="Nenhum ponto registrado nesta campanha ainda."/>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {campanha.mostrarVendedores && vendRank.length > 0 && (
        <div>
          <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Vendedores</div>
          <div className="rk-table">
            {vendRank.map((v,i) => {
              const pm = premio(i+1);
              const maxP = vendRank[0].pts || 1;
              return (
                <div key={v.id} className={`rk-row${i===0?' pos-1':''}`}>
                  <div className="rk-cell" style={{display:'flex',alignItems:'center',gap:6}}>
                    <span className={`rk-pos${i===0?' leader':''}`}>{String(i+1).padStart(2,'0')}</span>
                    {pm && <span title={pm.descricao} style={{fontSize:16}}>{pm.icone}</span>}
                  </div>
                  <div className="rk-cell">
                    <div className="rk-name-main">{v.nome}</div>
                    {pm && <div style={{fontSize:10,color:'var(--accent)',fontFamily:'JetBrains Mono,monospace'}}>{pm.descricao}</div>}
                  </div>
                  <div className="rk-cell rk-progress-col">
                    <ProgressBar pct={(v.pts/maxP)*100} leader={i===0}/>
                  </div>
                  <div className="rk-cell" style={{textAlign:'right'}}>
                    <div className="rk-pts-main">{v.pts}</div>
                    <span className="rk-pts-sub">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {lojaRank.length > 0 && (
        <div>
          <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Unidades (média)</div>
          <div className="rk-table">
            {lojaRank.map((l,i) => (
              <div key={l.id} className={`rk-row${i===0?' pos-1':''}`}>
                <div className="rk-cell"><span className={`rk-pos${i===0?' leader':''}`}>{String(i+1).padStart(2,'0')}</span></div>
                <div className="rk-cell"><div className="rk-name-main">{l.nome}</div></div>
                <div className="rk-cell rk-progress-col"><ProgressBar pct={(l.pts/(lojaRank[0].pts||1))*100} leader={i===0}/></div>
                <div className="rk-cell" style={{textAlign:'right'}}><div className="rk-pts-main">{l.pts}</div><span className="rk-pts-sub">pts/vend</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {cursosRank.length > 0 && (
        <div>
          <div style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',color:'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Cursos realizados</div>
          <div className="rk-table">
            {cursosRank.map((v,i) => (
              <div key={v.id} className={`rk-row${i===0?' pos-1':''}`}>
                <div className="rk-cell"><span className={`rk-pos${i===0?' leader':''}`}>{String(i+1).padStart(2,'0')}</span></div>
                <div className="rk-cell"><div className="rk-name-main">{v.nome}</div></div>
                <div className="rk-cell rk-progress-col"><ProgressBar pct={(v.aprovados/(cursosRank[0].aprovados||1))*100} leader={i===0}/></div>
                <div className="rk-cell" style={{textAlign:'right'}}><div className="rk-pts-main">{v.aprovados}</div><span className="rk-pts-sub">cursos</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CampanhasTab({ state, dispatch, addToast, currentUser }) {
  const { criterios, campanhas = [], vendedores, lojas = [] } = state;
  const isGerencia = currentUser?.role === 'gerencia';

  // Loja do usuário atual (vendedor)
  const myVendedor = vendedores.find(v => v.id === currentUser?.vendedorId);
  const myLojaId   = myVendedor ? Number(myVendedor.lojaId) : null;

  // Campanha visível: sem restrição de loja, ou loja do user está na lista
  const campanhasVisiveis = useMemo(() => {
    return campanhas.filter(c => {
      if (isGerencia) return true; // gerência vê tudo
      if (!c.lojaIds || c.lojaIds.length === 0) return true; // sem restrição
      return myLojaId && c.lojaIds.map(Number).includes(myLojaId);
    });
  }, [campanhas, isGerencia, myLojaId]);

  const EMPTY_FORM = {
    nome:'', descricao:'',
    dataInicio: new Date().toISOString().slice(0,10),
    dataFim: '',
    criteriosConfig: [],
    lojaIds: [], // [] = todas as lojas
    premiacoes: [
      { posicao:1, descricao:'Campeão', icone:'🏆', cor:'#FFD700' },
    ],
    mostrarVendedores: true, mostrarLojas: false, mostrarCursos: false,
  };
  const [novoCrit, setNovoCrit] = useState({ nome:'', pontos:'' });
  const [iconPickerIdx, setIconPickerIdx] = useState(null); // índice do premio com picker aberto
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [awardModal, setAwardModal] = useState(null); // { campanhaId, vencedores }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // critérios da campanha
  const toggleCriterio = (crit) => {
    const exists = form.criteriosConfig.find(c => c.criterioId === crit.id);
    if (exists) {
      setF('criteriosConfig', form.criteriosConfig.filter(c => c.criterioId !== crit.id));
    } else {
      setF('criteriosConfig', [...form.criteriosConfig, { criterioId: crit.id, nome: crit.nome, pontos: crit.pontos }]);
    }
  };

  const updateCritPontos = (criterioId, pontos) => setF('criteriosConfig',
    form.criteriosConfig.map(c => c.criterioId === criterioId ? {...c, pontos: Number(pontos)||0} : c)
  );

  const addCriterioCustom = () => {
    const nome = novoCrit.nome.trim();
    const pontos = Number(novoCrit.pontos) || 0;
    if (!nome) return;
    // Usa o mesmo padrão do config-tab para gerar ID
    const id = Math.max(0, ...(criterios.map(c => c.id))) + 1;
    const novoGlobal = { id, nome, pontos, tipo:'valor', modo:'parcial', limitesPorMes:0, tipoLimite:'×' };
    dispatch({ type:'ADD_CRITERIO', payload: novoGlobal });
    // Adiciona à campanha
    setF('criteriosConfig', [...form.criteriosConfig, { criterioId: id, nome, pontos }]);
    setNovoCrit({ nome:'', pontos:'' });
  };

  const setPremio = (idx, field, val) => setF('premiacoes',
    form.premiacoes.map((p,i) => i===idx ? {...p, [field]:val} : p)
  );

  const addPremio = () => setF('premiacoes', [
    ...form.premiacoes,
    { posicao: form.premiacoes.length+1, descricao:'', icone:'🎖️', cor:'#C0C0C0' }
  ]);

  const removePremio = idx => setF('premiacoes', form.premiacoes.filter((_,i) => i!==idx));

  const campStatus = c => {
    const now = new Date();
    if (now < new Date(c.dataInicio)) return 'futura';
    if (now > new Date(c.dataFim + (c.dataFim.length===10?'T23:59:59Z':''))) return 'encerrada';
    return 'ativa';
  };

  const salvar = () => {
    if (!form.nome.trim()) { addToast('Informe o nome da campanha.', 'error'); return; }
    if (!form.dataFim)     { addToast('Informe a data de término.', 'error'); return; }
    if (form.criteriosConfig.length === 0) { addToast('Adicione ao menos um critério.', 'error'); return; }

    const payload = {
      ...form,
      dataInicio: form.dataInicio + 'T00:00:00Z',
      dataFim:    form.dataFim    + 'T23:59:59Z',
      criadoPor: currentUser?.username || '',
    };

    if (editId) {
      dispatch({ type:'UPDATE_CAMPANHA', payload:{ id: editId, changes: payload } });
      addToast('Campanha atualizada.', 'success');
    } else {
      const tempId = Date.now();
      dispatch({ type:'ADD_CAMPANHA', payload:{ id: tempId, ...payload }, _dispatch: dispatch });
      addToast('Campanha criada!', 'success');
    }
    setForm(EMPTY_FORM); setEditId(null); setShowForm(false);
  };

  const editar = c => {
    setForm({
      nome: c.nome, descricao: c.descricao,
      dataInicio: c.dataInicio.slice(0,10),
      dataFim: c.dataFim.slice(0,10),
      criteriosConfig: c.criteriosConfig || [],
      premiacoes: c.premiacoes,
      lojaIds: c.lojaIds || [],
      mostrarVendedores: c.mostrarVendedores,
      mostrarLojas: c.mostrarLojas,
      mostrarCursos: c.mostrarCursos,
    });
    setEditId(c.id); setShowForm(true);
  };

  const excluir = c => {
    if (!window.confirm(`Excluir campanha "${c.nome}"?`)) return;
    dispatch({ type:'REMOVE_CAMPANHA', payload: c.id });
    addToast('Campanha removida.', 'info');
  };

  const premiarVencedores = (campanha) => {
    // calcula o ranking da campanha para identificar os vencedores
    const start = new Date(campanha.dataInicio);
    const end   = new Date(campanha.dataFim);
    const campCritIds = (campanha.criteriosConfig||[]).map(c => c.criterioId).filter(Boolean);
    const campPtsMap  = {};
    (campanha.criteriosConfig||[]).forEach(c => { if (c.criterioId) campPtsMap[c.criterioId] = c.pontos; });
    const rank  = vendedores.filter(v => v.ativo).map(v => {
      const pts = (state.lancamentos||[]).filter(l =>
        l.vendedorId === v.id && !l.cancelado &&
        campCritIds.includes(l.criterioId) &&
        new Date(l.data) >= start && new Date(l.data) <= end
      ).reduce((s, l) => s + (campPtsMap[l.criterioId] ?? l.pontos), 0);
      return { ...v, pts };
    }).filter(v => v.pts > 0).sort((a,b) => b.pts - a.pts);

    setAwardModal({ campanha, rank });
  };

  const confirmarPremiacao = () => {
    const { campanha, rank } = awardModal;
    campanha.premiacoes.forEach(pm => {
      const vencedor = rank[pm.posicao - 1];
      if (!vencedor) return;
      const novoAch = {
        nome: pm.descricao || `${pm.posicao}º lugar`,
        icone: pm.icone, cor: pm.cor,
        campanhaId: campanha.id, campanhaName: campanha.nome,
        data: new Date().toISOString(),
      };
      const novosAchs = [...(vencedor.achievements||[]), novoAch];
      dispatch({ type:'AWARD_ACHIEVEMENT', payload:{ vendedorId: vencedor.id, achievements: novosAchs } });
    });
    addToast('Premiações concedidas! Achievements adicionados aos vencedores.', 'success');
    setAwardModal(null);
  };

  const sorted = [...campanhasVisiveis].sort((a,b) => {
    const ord = { ativa:0, futura:1, encerrada:2 };
    return ord[campStatus(a)] - ord[campStatus(b)];
  });

  return (
    <div>
      <SectionHeader
        eyebrowLeft="COMPETIÇÃO"
        eyebrowAccent="CAMPANHAS"
        title="Tiro Curto"
        byline="Campanhas temporárias com rankings e premiações especiais."
      >
        {isGerencia && (
          <button className="btn-add" onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(p=>!p); }}>
            {showForm ? 'Cancelar' : '+ Nova campanha'}
          </button>
        )}
      </SectionHeader>

      {/* FORMULÁRIO */}
      {isGerencia && showForm && (
        <div className="form-block" style={{marginBottom:28}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <FieldInput label="Nome da campanha" value={form.nome} onChange={v=>setF('nome',v)} placeholder="Ex: Sprint de Junho"/>
            <FieldInput label="Descrição (opcional)" value={form.descricao} onChange={v=>setF('descricao',v)} placeholder="Objetivo da campanha..."/>
            <div className="field-group">
              <label className="field-label">Data início</label>
              <input type="date" className="field-input" value={form.dataInicio} onChange={e=>setF('dataInicio',e.target.value)}/>
            </div>
            <div className="field-group">
              <label className="field-label">Data fim</label>
              <input type="date" className="field-input" value={form.dataFim} min={form.dataInicio} onChange={e=>setF('dataFim',e.target.value)}/>
            </div>
          </div>

          <div className="field-group" style={{marginBottom:12}}>
            <label className="field-label">Critérios da campanha</label>

            {/* Critérios disponíveis para selecionar */}
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6,marginBottom:8}}>
              {criterios.filter(c => !c.oculto).map(c => {
                const sel = form.criteriosConfig.find(cc => cc.criterioId === c.id);
                return (
                  <button key={c.id}
                    className={`seg-btn${sel ? ' active' : ''}`}
                    style={{fontSize:11}}
                    onClick={() => toggleCriterio(c)}>
                    {c.nome} ({sel ? sel.pontos : c.pontos}pts)
                  </button>
                );
              })}
            </div>

            {/* Critérios selecionados com pontos editáveis */}
            {form.criteriosConfig.length > 0 && (
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:8}}>
                <div style={{fontSize:10,color:'var(--ink-4)',fontFamily:'JetBrains Mono,monospace',textTransform:'uppercase',letterSpacing:'.06em'}}>Pontos por critério nesta campanha</div>
                {form.criteriosConfig.map((cc) => (
                  <div key={cc.criterioId} style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{flex:1,fontSize:12,color:'var(--ink-2)'}}>{cc.nome}</div>
                    <input
                      type="number" min={1}
                      className="field-input"
                      style={{width:70,fontSize:12,textAlign:'right'}}
                      value={cc.pontos}
                      onChange={e => updateCritPontos(cc.criterioId, e.target.value)}
                    />
                    <span style={{fontSize:11,color:'var(--ink-4)',fontFamily:'JetBrains Mono,monospace'}}>pts</span>
                    <button className="btn-danger" style={{padding:'3px 7px',fontSize:12}}
                      onClick={() => setF('criteriosConfig', form.criteriosConfig.filter(c => c.criterioId !== cc.criterioId))}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Criar critério novo */}
            <div style={{display:'flex',gap:6,alignItems:'center',borderTop:'1px solid var(--rule)',paddingTop:8}}>
              <input className="field-input" placeholder="Nome do novo critério"
                style={{flex:1,fontSize:12}}
                value={novoCrit.nome}
                onChange={e => setNovoCrit(p => ({...p, nome:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && addCriterioCustom()}
              />
              <input type="number" className="field-input" placeholder="Pts"
                style={{width:60,fontSize:12}}
                value={novoCrit.pontos}
                min={1}
                onChange={e => setNovoCrit(p => ({...p, pontos:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && addCriterioCustom()}
              />
              <button className="btn-add" style={{padding:'6px 12px',fontSize:11,whiteSpace:'nowrap'}}
                onClick={addCriterioCustom}>
                + Critério
              </button>
            </div>
          </div>

          <div className="field-group" style={{marginBottom:12}}>
            <label className="field-label">Lojas participantes <span style={{color:'var(--ink-4)',fontWeight:400}}>(vazio = todas)</span></label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
              {lojas.map(l => {
                const sel = form.lojaIds.map(Number).includes(Number(l.id));
                return (
                  <button key={l.id}
                    className={`seg-btn${sel?' active':''}`}
                    style={{fontSize:11}}
                    onClick={() => setF('lojaIds', sel
                      ? form.lojaIds.filter(id => Number(id) !== Number(l.id))
                      : [...form.lojaIds, Number(l.id)])}>
                    {l.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field-group" style={{marginBottom:12}}>
            <label className="field-label">Rankings a exibir</label>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              {[['mostrarVendedores','Vendedores'],['mostrarLojas','Unidades'],['mostrarCursos','Cursos']].map(([k,l])=>(
                <button key={k} className={`seg-btn${form[k]?' active':''}`} onClick={()=>setF(k,!form[k])}>{l}</button>
              ))}
            </div>
          </div>

          <div className="field-group" style={{marginBottom:12}}>
            <label className="field-label" style={{display:'flex',justifyContent:'space-between'}}>
              Posições premiadas
              <button className="btn-ghost" style={{fontSize:11,padding:'2px 8px'}} onClick={addPremio}>+ Posição</button>
            </label>
            {/* Icon picker overlay */}
            {iconPickerIdx !== null && (
              <div style={{position:'relative',zIndex:50}}>
                <div style={{position:'fixed',inset:0}} onClick={()=>setIconPickerIdx(null)}/>
                <div style={{
                  position:'absolute',left:0,top:4,zIndex:51,
                  background:'var(--paper)',border:'1px solid var(--rule-strong)',
                  borderRadius:10,padding:12,boxShadow:'0 8px 24px rgba(0,0,0,.35)',
                  width:300,
                }}>
                  {[
                    {cat:'Troféus',  icons:['🏆','🥇','🥈','🥉','🎖️','🏅','👑','💎']},
                    {cat:'Energia',  icons:['🔥','⚡','💥','🌟','⭐','💫','☄️','✨']},
                    {cat:'Poder',    icons:['🦁','🐯','🦅','🐺','🦊','🦈','🐉','💪']},
                    {cat:'Esporte',  icons:['🎯','🏹','🚀','🎳','🏆','🤺','⚽','🏀']},
                    {cat:'Símbolos', icons:['🔱','⚜️','🌊','❄️','🌪️','💯','🎗️','🌠']},
                  ].map(({cat,icons}) => (
                    <div key={cat} style={{marginBottom:8}}>
                      <div style={{fontSize:9,color:'var(--ink-4)',fontFamily:'JetBrains Mono,monospace',textTransform:'uppercase',marginBottom:4}}>{cat}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {icons.map(ic => (
                          <button key={ic}
                            style={{
                              fontSize:20,padding:'4px 6px',borderRadius:6,border:'1px solid transparent',
                              background: form.premiacoes[iconPickerIdx]?.icone===ic ? 'var(--paper-2)' : 'none',
                              cursor:'pointer',
                              borderColor: form.premiacoes[iconPickerIdx]?.icone===ic ? 'var(--rule-strong)' : 'transparent',
                            }}
                            onClick={()=>{ setPremio(iconPickerIdx,'icone',ic); setIconPickerIdx(null); }}>
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:6}}>
              {form.premiacoes.map((pm,i) => (
                <div key={i} style={{display:'grid',gridTemplateColumns:'40px 1fr 48px 60px 40px',gap:8,alignItems:'center'}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,textAlign:'center',color:'var(--ink-3)'}}>{pm.posicao}º</div>
                  <input className="field-input" placeholder="Nome do prêmio (ex: Campeão)" value={pm.descricao} onChange={e=>setPremio(i,'descricao',e.target.value)} style={{fontSize:12}}/>
                  <button
                    style={{fontSize:22,height:36,borderRadius:6,border:'1px solid var(--rule-strong)',background:'var(--paper-2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                    onClick={()=>setIconPickerIdx(iconPickerIdx===i?null:i)}
                    title="Escolher ícone">
                    {pm.icone||'🏆'}
                  </button>
                  <input type="color" value={pm.cor} onChange={e=>setPremio(i,'cor',e.target.value)} style={{height:36,padding:2,borderRadius:4,border:'1px solid var(--rule-strong)',background:'none',cursor:'pointer',width:'100%'}}/>
                  <button className="btn-danger" style={{padding:'4px'}} onClick={()=>removePremio(i)}>×</button>
                </div>
              ))}
            </div>
          </div>

          <PrimaryBtn onClick={salvar}>{editId ? 'Salvar alterações' : 'Criar campanha'}</PrimaryBtn>
        </div>
      )}

      {/* MODAL PREMIAÇÃO */}
      {awardModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'var(--paper)',border:'2px solid var(--rule-strong)',borderRadius:12,padding:28,maxWidth:480,width:'100%'}}>
            <div style={{fontFamily:"'Anton',sans-serif",fontSize:20,textTransform:'uppercase',marginBottom:4}}>Premiar vencedores</div>
            <div style={{fontSize:12,color:'var(--ink-3)',marginBottom:16}}>{awardModal.campanha.nome}</div>
            {awardModal.campanha.premiacoes.map(pm => {
              const venc = awardModal.rank[pm.posicao-1];
              return (
                <div key={pm.posicao} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--rule)'}}>
                  <span style={{fontSize:24}}>{pm.icone}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600}}>{pm.descricao || `${pm.posicao}º lugar`}</div>
                    <div style={{fontSize:12,color:'var(--ink-3)'}}>{venc ? `${venc.nome} · ${venc.pts} pts` : 'Nenhum participante nesta posição'}</div>
                  </div>
                  {venc && <div style={{width:10,height:10,borderRadius:'50%',background:pm.cor,boxShadow:`0 0 8px ${pm.cor}`}}/>}
                </div>
              );
            })}
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <PrimaryBtn onClick={confirmarPremiacao}>Conceder achievements</PrimaryBtn>
              <button className="btn-ghost" onClick={()=>setAwardModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE CAMPANHAS */}
      {sorted.length === 0 && <EmptyState msg="Nenhuma campanha criada ainda."/>}
      {sorted.map(c => {
        const st = campStatus(c);
        const stLabel = {ativa:'● ATIVA', futura:'◎ EM BREVE', encerrada:'○ ENCERRADA'}[st];
        const stColor = {ativa:'var(--brand-green,#3b9e5c)', futura:'var(--accent)', encerrada:'var(--ink-4)'}[st];
        return (
          <div key={c.id} className="camp-card">
            <div className="camp-card-header">
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div className="camp-card-nome">{c.nome}</div>
                  <span style={{fontSize:10,fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:stColor}}>{stLabel}</span>
                </div>
                {c.descricao && <div className="camp-card-desc">{c.descricao}</div>}
                <div className="camp-card-meta">
                  <span>{new Date(c.dataInicio).toLocaleDateString('pt-BR')} → {new Date(c.dataFim).toLocaleDateString('pt-BR')}</span>
                  <span>· {(c.criteriosConfig||[]).length} critério{(c.criteriosConfig||[]).length!==1?'s':''}</span>
                  {c.lojaIds && c.lojaIds.length > 0 && (
                    <span style={{color:'var(--accent)'}}>· {c.lojaIds.length === 1
                      ? (lojas.find(l=>Number(l.id)===Number(c.lojaIds[0]))?.nome||'1 loja')
                      : `${c.lojaIds.length} lojas`}</span>
                  )}
                  {c.premiacoes.length > 0 && <span>· {c.premiacoes.map(p=>p.icone).join('')} {c.premiacoes.length} premiação{c.premiacoes.length!==1?'ões':''}</span>}
                </div>
              </div>
              {isGerencia && (
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  {st === 'encerrada' && c.premiacoes.length > 0 && (
                    <button className="btn-aprovar" style={{fontSize:11,padding:'5px 12px'}} onClick={()=>premiarVencedores(c)}>
                      🏆 Premiar
                    </button>
                  )}
                  <button className="btn-ghost" style={{padding:'5px 10px',fontSize:11}} onClick={()=>editar(c)}>Editar</button>
                  <button className="btn-danger" style={{padding:'5px 10px',fontSize:11}} onClick={()=>excluir(c)}>×</button>
                </div>
              )}
            </div>
            <div className="camp-card-body">
              <CampanhaRanking campanha={c} state={state}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── EXPOSE GLOBALS ────────────────────────────────────────────────────────────
window.RankingTab     = RankingTab;
window.LancarTab      = LancarTab;
window.VendedorTab    = VendedorTab;
window.FeedTab        = FeedTab;
window.PerfilTab      = PerfilTab;
window.CursosTab      = CursosTab;
window.CampanhasTab   = CampanhasTab;
