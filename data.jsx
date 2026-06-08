// data.jsx — seed data, reducer, utility functions, Supabase client
// All exports via window globals (no ES modules)

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const _SB_URL = 'https://odknmdnaavgmcpqvsiut.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ka25tZG5hYXZnbWNwcXZzaXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTUxOTEsImV4cCI6MjA5NTI5MTE5MX0.nHXZJgt0SJdXwmiCqsjQ8MklgBPzznH6OVWFzkOP8To';
const _sb = window.supabase.createClient(_SB_URL, _SB_KEY);

// Mapeamento JS camelCase ↔ DB snake_case
const _C2S = {
  lojaId:'loja_id', vendedorId:'vendedor_id', criterioId:'criterio_id',
  streakAplicado:'streak_aplicado', limitesPorMes:'limites_por_mes',
  minPontos:'min_pontos', streakMultiplicador:'streak_multiplicador',
  streakSemanas:'streak_semanas',
  canceladoPor:'cancelado_por', canceladoEm:'cancelado_em',
  lancadoPor:'lancado_por', tipoLimite:'tipo_limite',
  criterioIds:'criterio_ids', dataInicio:'data_inicio', dataFim:'data_fim',
  mostrarVendedores:'mostrar_vendedores', mostrarLojas:'mostrar_lojas',
  mostrarCursos:'mostrar_cursos', criadoPor:'criado_por',
};
const _S2C = Object.fromEntries(Object.entries(_C2S).map(([k,v])=>[v,k]));

function _toRow(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k,v]) => [_C2S[k]||k, v]));
}
function _fromRow(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k,v]) => [_S2C[k]||k, v]));
}

async function loadFromSupabase() {
  const [vend, crit, lanc, loja, user, comp, niv, cfg, fatM, curs, camp] = await Promise.all([
    _sb.from('vendedores').select('*'),
    _sb.from('criterios').select('*'),
    _sb.from('lancamentos').select('*'),
    _sb.from('lojas').select('*'),
    _sb.from('usuarios').select('*'),
    _sb.from('comprovantes').select('id,vendedor_id,nome,tipo,data,status'),
    _sb.from('niveis').select('*').order('min_pontos'),
    _sb.from('app_config').select('*').eq('id',1).single(),
    _sb.from('faturamento_mensal').select('loja_id,mes,ano,faturamento,meta'),
    _sb.from('cursos').select('*').order('data', { ascending: false }),
    _sb.from('campanhas').select('*').order('data_inicio', { ascending: false }),
  ]);
  return {
    schemaVersion:     SCHEMA_VERSION,
    criterios:         (crit.data||[]).map(_fromRow),
    lancamentos:       (lanc.data||[]).map(_fromRow),
    lojas:             loja.data || [],
    usuarios:          (user.data||[]).map(_fromRow),
    comprovantes:      (comp.data||[]).map(_fromRow),
    faturamentoMensal: (fatM.data||[]).map(_fromRow),
    cursos: (curs.data||[]).map(c => ({
      id: c.id, titulo: c.titulo, link: c.link||'',
      descricao: c.descricao||'', data: c.data,
      vendedorIds: Array.isArray(c.vendedor_ids) ? c.vendedor_ids : [],
    })),
    campanhas: (camp.data||[]).map(c => ({
      id: c.id, nome: c.nome, descricao: c.descricao||'',
      dataInicio: c.data_inicio, dataFim: c.data_fim,
      criterioIds: Array.isArray(c.criterio_ids) ? c.criterio_ids : [],
      premiacoes: Array.isArray(c.premiacoes) ? c.premiacoes : [],
      mostrarVendedores: c.mostrar_vendedores ?? true,
      mostrarLojas: c.mostrar_lojas ?? false,
      mostrarCursos: c.mostrar_cursos ?? false,
      ativo: c.ativo ?? true, criadoPor: c.criado_por||'',
    })),
    vendedores: (vend.data||[]).map(v => ({
      ..._fromRow(v),
      achievements: Array.isArray(v.achievements) ? v.achievements : [],
    })),
    config: {
      niveis:              (niv.data||[]).map(_fromRow),
      streakMultiplicador: cfg.data?.streak_multiplicador ?? 1.5,
      streakSemanas:       cfg.data?.streak_semanas ?? 3,
    },
  };
}

async function syncAction(action) {
  const _chk = (res, label) => { if (res?.error) console.error(`[sync:${label}]`, res.error.message, res.error); };
  try {
    switch (action.type) {
      case 'ADD_LANCAMENTO':
        _chk(await _sb.from('lancamentos').insert(_toRow(action.payload)), 'ADD_LANCAMENTO'); break;
      case 'REMOVE_LANCAMENTO':
        _chk(await _sb.from('lancamentos').delete().eq('id', action.payload), 'REMOVE_LANCAMENTO'); break;
      case 'CANCEL_LANCAMENTO':
        _chk(await _sb.from('lancamentos').update(_toRow({
          cancelado: true, canceladoPor: action.payload.canceladoPor, canceladoEm: action.payload.canceladoEm,
        })).eq('id', action.payload.id), 'CANCEL_LANCAMENTO'); break;
      case 'ADD_VENDEDOR':
        _chk(await _sb.from('vendedores').insert(_toRow(action.payload)), 'ADD_VENDEDOR'); break;
      case 'UPDATE_VENDEDOR':
        _chk(await _sb.from('vendedores').update(_toRow(action.payload.changes)).eq('id', action.payload.id), 'UPDATE_VENDEDOR'); break;
      case 'REMOVE_VENDEDOR':
        _chk(await _sb.from('vendedores').delete().eq('id', action.payload), 'REMOVE_VENDEDOR'); break;
      case 'ADD_CRITERIO':
        _chk(await _sb.from('criterios').insert(_toRow(action.payload)), 'ADD_CRITERIO'); break;
      case 'UPDATE_CRITERIO': {
        const { id, field, value } = action.payload;
        _chk(await _sb.from('criterios').update(_toRow({[field]:value})).eq('id', id), 'UPDATE_CRITERIO'); break;
      }
      case 'REMOVE_CRITERIO':
        _chk(await _sb.from('criterios').delete().eq('id', action.payload), 'REMOVE_CRITERIO'); break;
      case 'ADD_NIVEL':
        _chk(await _sb.from('niveis').insert(_toRow(action.payload)), 'ADD_NIVEL'); break;
      case 'UPDATE_NIVEL': {
        const { id, field, value } = action.payload;
        _chk(await _sb.from('niveis').update(_toRow({[field]:value})).eq('id', id), 'UPDATE_NIVEL'); break;
      }
      case 'REMOVE_NIVEL':
        _chk(await _sb.from('niveis').delete().eq('id', action.payload), 'REMOVE_NIVEL'); break;
      case 'UPDATE_CONFIG': {
        const { field, value } = action.payload;
        _chk(await _sb.from('app_config').update(_toRow({[field]:value})).eq('id', 1), 'UPDATE_CONFIG'); break;
      }
      case 'ADD_USUARIO':
        _chk(await _sb.from('usuarios').insert(_toRow(action.payload)), 'ADD_USUARIO'); break;
      case 'UPDATE_USUARIO':
        _chk(await _sb.from('usuarios').update(_toRow(action.payload.changes)).eq('id', action.payload.id), 'UPDATE_USUARIO'); break;
      case 'REMOVE_USUARIO':
        _chk(await _sb.from('usuarios').delete().eq('id', action.payload), 'REMOVE_USUARIO'); break;
      case 'ADD_COMPROVANTE': {
        const payload = { ..._toRow(action.payload) };
        delete payload.id; // deixa o banco gerar pelo nextval
        const { data: compRes, error: compErr } = await _sb.from('comprovantes').insert(payload).select('id').single();
        if (compErr) { console.error('[ADD_COMPROVANTE]', compErr); break; }
        if (compRes && typeof action._dispatch === 'function') {
          // Troca o id temporário pelo id real do banco
          action._dispatch({ type:'UPDATE_COMPROVANTE', payload:{ id: action.payload.id, changes:{ id: compRes.id } } });
        }
        break;
      }
      case 'REMOVE_COMPROVANTE':
        _chk(await _sb.from('comprovantes').delete().eq('id', action.payload), 'REMOVE_COMPROVANTE'); break;
      case 'UPDATE_COMPROVANTE':
        _chk(await _sb.from('comprovantes').update(_toRow(action.payload.changes)).eq('id', action.payload.id), 'UPDATE_COMPROVANTE'); break;
      case 'ADD_LOJA':
        _chk(await _sb.from('lojas').insert(action.payload), 'ADD_LOJA'); break;
      case 'UPDATE_LOJA':
        _chk(await _sb.from('lojas').update(action.payload.changes).eq('id', action.payload.id), 'UPDATE_LOJA'); break;
      case 'REMOVE_LOJA':
        _chk(await _sb.from('lojas').delete().eq('id', action.payload), 'REMOVE_LOJA'); break;
      case 'UPSERT_FAT_MENSAL': {
        const { lojaId, mes, ano, faturamento, meta } = action.payload;
        _chk(await _sb.from('faturamento_mensal').upsert(
          { loja_id: lojaId, mes, ano, faturamento, meta },
          { onConflict: 'loja_id,mes,ano' }
        ), 'UPSERT_FAT_MENSAL'); break;
      }
      case 'ADD_CURSO': {
        const { data: cursosRes, error: cursosErr } = await _sb.from('cursos').insert({
          titulo: action.payload.titulo,
          link: action.payload.link,
          descricao: action.payload.descricao,
          vendedor_ids: action.payload.vendedorIds || [],
        }).select('*');
        if (cursosErr) { console.error('[ADD_CURSO]', cursosErr); break; }
        // Recarrega todos os cursos do banco para ter IDs reais
        const { data: allCursos } = await _sb.from('cursos').select('*').order('id', { ascending: false });
        if (allCursos && typeof action._dispatch === 'function') {
          action._dispatch({ type: 'SET_CURSOS', payload: allCursos.map(c => ({
            id: c.id, titulo: c.titulo, link: c.link||'',
            descricao: c.descricao||'', data: c.data,
            vendedorIds: Array.isArray(c.vendedor_ids) ? c.vendedor_ids : [],
          }))});
        }
        break;
      }
      case 'ADD_CAMPANHA': {
        const { data: campRes, error: campErr } = await _sb.from('campanhas').insert({
          nome: action.payload.nome, descricao: action.payload.descricao||'',
          data_inicio: action.payload.dataInicio, data_fim: action.payload.dataFim,
          criterio_ids: action.payload.criterioIds||[],
          premiacoes: action.payload.premiacoes||[],
          mostrar_vendedores: action.payload.mostrarVendedores??true,
          mostrar_lojas: action.payload.mostrarLojas??false,
          mostrar_cursos: action.payload.mostrarCursos??false,
          ativo: action.payload.ativo??true,
          criado_por: action.payload.criadoPor||'',
        }).select('id').single();
        if (campErr) { console.error('[ADD_CAMPANHA]', campErr); break; }
        if (campRes && typeof action._dispatch === 'function')
          action._dispatch({ type:'UPDATE_CAMPANHA', payload:{ id: action.payload.id, changes:{ id: campRes.id } } });
        break;
      }
      case 'UPDATE_CAMPANHA':
        _chk(await _sb.from('campanhas').update({
          nome: action.payload.changes.nome,
          descricao: action.payload.changes.descricao,
          data_inicio: action.payload.changes.dataInicio,
          data_fim: action.payload.changes.dataFim,
          criterio_ids: action.payload.changes.criterioIds,
          premiacoes: action.payload.changes.premiacoes,
          mostrar_vendedores: action.payload.changes.mostrarVendedores,
          mostrar_lojas: action.payload.changes.mostrarLojas,
          mostrar_cursos: action.payload.changes.mostrarCursos,
          ativo: action.payload.changes.ativo,
        }).eq('id', action.payload.id), 'UPDATE_CAMPANHA'); break;
      case 'REMOVE_CAMPANHA':
        _chk(await _sb.from('campanhas').delete().eq('id', action.payload), 'REMOVE_CAMPANHA'); break;
      case 'AWARD_ACHIEVEMENT':
        // Adiciona achievement ao vendedor (merge via jsonb)
        _chk(await _sb.from('vendedores').update({
          achievements: action.payload.achievements,
        }).eq('id', action.payload.vendedorId), 'AWARD_ACHIEVEMENT'); break;
      case 'REMOVE_CURSO':
        _chk(await _sb.from('cursos').delete().eq('id', action.payload), 'REMOVE_CURSO'); break;
      case 'UPDATE_CURSO':
        _chk(await _sb.from('cursos').update({
          titulo: action.payload.changes.titulo,
          link: action.payload.changes.link,
          descricao: action.payload.changes.descricao,
          vendedor_ids: action.payload.changes.vendedorIds || [],
        }).eq('id', action.payload.id), 'UPDATE_CURSO'); break;
      case 'RESET':
        await _sbReset(); break;
    }
  } catch(e) {
    console.error('[Supabase] syncAction error:', action.type, e);
  }
}

async function _sbReset() {
  await _sb.from('lancamentos').delete().gte('id', 0);
  await _sb.from('comprovantes').delete().gte('id', 0);
  await _sb.from('faturamento_mensal').delete().gte('mes', 1);
  await Promise.all([
    _sb.from('vendedores').delete().gte('id', 0),
    _sb.from('usuarios').delete().gte('id', 0),
    _sb.from('criterios').delete().gte('id', 0),
    _sb.from('niveis').delete().gte('id', 0),
    _sb.from('lojas').delete().gte('id', 0),
  ]);
  await Promise.all([
    _sb.from('lojas').insert([
      { id:1, nome:'Francisco Beltrão', faturamento:0, meta:0 },
      { id:2, nome:'Toledo', faturamento:0, meta:0 },
      { id:3, nome:'Dois Vizinhos', faturamento:0, meta:0 },
    ]),
    _sb.from('criterios').insert([
      { id:1, nome:'Sem atraso no mês', pontos:60, tipo:'positivo', limites_por_mes:1, modo:'simnao', oculto:false },
      { id:2, nome:'Treinamento concluído', pontos:90, tipo:'positivo', limites_por_mes:0, modo:'simnao', oculto:false },
      { id:3, nome:'Meta semanal atingida', pontos:100, tipo:'positivo', limites_por_mes:4, modo:'parcial', oculto:false },
      { id:4, nome:'Meta por segmento', pontos:130, tipo:'positivo', limites_por_mes:0, modo:'parcial', oculto:false },
      { id:5, nome:'Meta mensal atingida', pontos:250, tipo:'positivo', limites_por_mes:1, modo:'simnao', oculto:false },
      { id:6, nome:'Prospecção de cliente', pontos:180, tipo:'positivo', limites_por_mes:0, modo:'simnao', oculto:false },
      { id:7, nome:'Meta mensal 2 atingida', pontos:325, tipo:'positivo', limites_por_mes:1, modo:'simnao', oculto:false },
      { id:8, nome:'Meta mensal 3 atingida', pontos:375, tipo:'positivo', limites_por_mes:1, modo:'simnao', oculto:false },
      { id:9, nome:'Comprovante de curso aprovado', pontos:10, tipo:'positivo', limites_por_mes:0, modo:'simnao', oculto:true },
    ]),
    _sb.from('niveis').insert([
      { id:1, nome:'Iniciante', min_pontos:0, cor:'#74747a' },
      { id:2, nome:'Prata', min_pontos:500, cor:'#cfd1d4' },
      { id:3, nome:'Ouro', min_pontos:1500, cor:'#ffc41f' },
      { id:4, nome:'Diamante', min_pontos:3500, cor:'#7dd3fc' },
    ]),
    _sb.from('usuarios').insert([
      { id:1, username:'Gabriel', password:'1414', role:'gerencia', vendedor_id:null, loja_id:null },
    ]),
  ]);
  await _sb.from('app_config').upsert({ id:1, streak_multiplicador:1.5, streak_semanas:3 });
}

const SEED_USUARIOS = [
  { id:1, username:'Gabriel', password:'1414', role:'gerencia', vendedorId:null, lojaId:null },
];

const SEED_VENDEDORES = [];

const SEED_CRITERIOS = [
  { id: 1, nome: 'Sem atraso no mês',        pontos: 60,  tipo: 'positivo', limitesPorMes: 1, modo: 'simnao'  },
  { id: 2, nome: 'Treinamento concluído',     pontos: 90,  tipo: 'positivo', limitesPorMes: 0, modo: 'simnao'  },
  { id: 3, nome: 'Meta semanal atingida',     pontos: 100, tipo: 'positivo', limitesPorMes: 4, modo: 'parcial' },
  { id: 4, nome: 'Meta por segmento',         pontos: 130, tipo: 'positivo', limitesPorMes: 0, modo: 'parcial' },
  { id: 5, nome: 'Meta mensal atingida',      pontos: 250, tipo: 'positivo', limitesPorMes: 1, modo: 'simnao'  },
  { id: 6, nome: 'Prospecção de cliente',     pontos: 180, tipo: 'positivo', limitesPorMes: 0, modo: 'simnao'  },
  { id: 7, nome: 'Meta mensal 2 atingida',     pontos: 325, tipo: 'positivo', limitesPorMes: 1, modo: 'simnao'  },
  { id: 8, nome: 'Meta mensal 3 atingida',     pontos: 375, tipo: 'positivo', limitesPorMes: 1, modo: 'simnao'  },
  { id: 9, nome: 'Comprovante de curso aprovado', pontos: 10, tipo: 'positivo', limitesPorMes: 0, modo: 'simnao', oculto: true },
];

const SEED_LANCAMENTOS = [];

const SEED_LOJAS = [
  { id: 1, nome: 'Francisco Beltrão', faturamento: 0, meta: 0 },
  { id: 2, nome: 'Toledo',            faturamento: 0, meta: 0 },
  { id: 3, nome: 'Dois Vizinhos',     faturamento: 0, meta: 0 },
];

const SEED_CONFIG = {
  niveis: [
    { id:1, nome:'Iniciante', minPontos:0,    cor:'#74747a' },
    { id:2, nome:'Prata',     minPontos:500,  cor:'#cfd1d4' },
    { id:3, nome:'Ouro',      minPontos:1500, cor:'#ffc41f' },
    { id:4, nome:'Diamante',  minPontos:3500, cor:'#7dd3fc' },
  ],
  streakMultiplicador: 1.5,
  streakSemanas: 3,
};

const SCHEMA_VERSION = 2;

const SEED_STATE = {
  schemaVersion:     SCHEMA_VERSION,
  vendedores:        SEED_VENDEDORES,
  criterios:         SEED_CRITERIOS,
  lancamentos:       SEED_LANCAMENTOS,
  config:            SEED_CONFIG,
  usuarios:          SEED_USUARIOS,
  comprovantes:      [],
  lojas:             SEED_LOJAS,
  faturamentoMensal: [],
  cursos:            [],
  campanhas:         [],
};

// ── REDUCER ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'LOAD': {
      const p = action.payload;
      // dados antigos sem versão → reset automático para seed limpo
      if (!p.schemaVersion || p.schemaVersion < SCHEMA_VERSION) return { ...SEED_STATE };
      if (!p.usuarios)     p.usuarios     = SEED_USUARIOS;
      else p.usuarios = p.usuarios.map(u => ({ lojaId: null, ...u }));
      if (!p.comprovantes)      p.comprovantes      = [];
      if (!p.lojas)             p.lojas             = SEED_LOJAS;
      if (!p.faturamentoMensal) p.faturamentoMensal = [];
      if (!p.cursos)     p.cursos     = [];
      if (!p.campanhas)  p.campanhas  = [];
      else p.lojas = p.lojas.map(l => ({ faturamento:0, meta:0, ...l }));
      // garantir achievements nos vendedores
      if (p.vendedores) p.vendedores = p.vendedores.map(v => ({ achievements:[], ...v }));
      // garante que critérios do seed existam (injeta os que faltam por id)
      SEED_CRITERIOS.forEach(sc => {
        if (!p.criterios.some(c => c.id === sc.id)) p.criterios = [...p.criterios, sc];
      });
      // corrige nomes antigos se ainda existirem
      const renomes = {
        'Indicação de cliente':  'Prospecção de cliente',
        'Meta mensal 2 batida':  'Meta mensal 2 atingida',
        'Meta mensal 3 batida':  'Meta mensal 3 atingida',
      };
      p.criterios = p.criterios.map(c => renomes[c.nome] ? { ...c, nome: renomes[c.nome] } : c);
      return p;
    }
    case 'SET_STATE':        return { ...action.payload };
    case 'RESET':            return SEED_STATE;
    case 'ADD_LANCAMENTO':    return { ...state, lancamentos:[...state.lancamentos, action.payload] };
    case 'REMOVE_LANCAMENTO': return { ...state, lancamentos:state.lancamentos.filter(l=>l.id!==action.payload) };
    case 'CANCEL_LANCAMENTO': return { ...state, lancamentos:state.lancamentos.map(l=>
      l.id===action.payload.id ? {...l, cancelado:true, canceladoPor:action.payload.canceladoPor, canceladoEm:action.payload.canceladoEm} : l
    )};
    case 'ADD_VENDEDOR':    return { ...state, vendedores:[...state.vendedores, action.payload] };
    case 'UPDATE_VENDEDOR': return { ...state, vendedores:state.vendedores.map(v=>v.id===action.payload.id?{...v,...action.payload.changes}:v) };
    case 'REMOVE_VENDEDOR': return { ...state, vendedores:state.vendedores.filter(v=>v.id!==action.payload) };
    case 'ADD_CRITERIO':    return { ...state, criterios:[...state.criterios, action.payload] };
    case 'UPDATE_CRITERIO': return { ...state, criterios:state.criterios.map(c=>c.id===action.payload.id?{...c,[action.payload.field]:action.payload.value}:c) };
    case 'REMOVE_CRITERIO': return { ...state, criterios:state.criterios.filter(c=>c.id!==action.payload) };
    case 'ADD_NIVEL':       return { ...state, config:{...state.config, niveis:[...state.config.niveis, action.payload]} };
    case 'UPDATE_NIVEL':    return { ...state, config:{...state.config, niveis:state.config.niveis.map(n=>n.id===action.payload.id?{...n,[action.payload.field]:action.payload.value}:n)} };
    case 'REMOVE_NIVEL':    return { ...state, config:{...state.config, niveis:state.config.niveis.filter(n=>n.id!==action.payload)} };
    case 'UPDATE_CONFIG':      return { ...state, config:{...state.config,[action.payload.field]:action.payload.value} };
    case 'ADD_USUARIO':        return { ...state, usuarios:[...state.usuarios, action.payload] };
    case 'UPDATE_USUARIO':     return { ...state, usuarios:state.usuarios.map(u=>u.id===action.payload.id?{...u,...action.payload.changes}:u) };
    case 'REMOVE_USUARIO':     return { ...state, usuarios:state.usuarios.filter(u=>u.id!==action.payload) };
    case 'ADD_COMPROVANTE':    return { ...state, comprovantes:[...state.comprovantes, action.payload] };
    case 'REMOVE_COMPROVANTE': return { ...state, comprovantes:state.comprovantes.filter(c=>c.id!==action.payload) };
    case 'UPDATE_COMPROVANTE': return { ...state, comprovantes:state.comprovantes.map(c=>c.id===action.payload.id?{...c,...action.payload.changes}:c) };
    case 'ADD_CURSO':    return { ...state, cursos:[...(state.cursos||[]), action.payload] };
    case 'SET_CURSOS':   return { ...state, cursos: action.payload };
    case 'REMOVE_CURSO': return { ...state, cursos:(state.cursos||[]).filter(c=>c.id!==action.payload) };
    case 'UPDATE_CURSO': return { ...state, cursos:(state.cursos||[]).map(c=>c.id===action.payload.id?{...c,...action.payload.changes}:c) };
    case 'ADD_CAMPANHA':    return { ...state, campanhas:[...(state.campanhas||[]), action.payload] };
    case 'UPDATE_CAMPANHA': return { ...state, campanhas:(state.campanhas||[]).map(c=>c.id===action.payload.id?{...c,...action.payload.changes}:c) };
    case 'REMOVE_CAMPANHA': return { ...state, campanhas:(state.campanhas||[]).filter(c=>c.id!==action.payload) };
    case 'AWARD_ACHIEVEMENT': return { ...state, vendedores:state.vendedores.map(v=>
      v.id===action.payload.vendedorId ? {...v, achievements: action.payload.achievements} : v
    )};
    case 'ADD_LOJA':    return { ...state, lojas:[...(state.lojas||[]), action.payload] };
    case 'UPDATE_LOJA': return { ...state, lojas:(state.lojas||[]).map(l=>l.id===action.payload.id?{...l,...action.payload.changes}:l) };
    case 'REMOVE_LOJA': return { ...state, lojas:(state.lojas||[]).filter(l=>l.id!==action.payload) };
    case 'UPSERT_FAT_MENSAL': {
      const p = action.payload;
      const outros = (state.faturamentoMensal||[]).filter(
        f => !(f.lojaId===p.lojaId && f.mes===p.mes && f.ano===p.ano)
      );
      return { ...state, faturamentoMensal: [...outros, p] };
    }
    default:                   return state;
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const y1 = new Date(d.getFullYear(),0,1);
  return { year:d.getFullYear(), week:Math.ceil(((d-y1)/86400000+1)/7) };
}

function calcularStreak(vendedorId, lancamentos, criterios, streakSemanas) {
  const meta = criterios.find(c=>c.nome==='Meta semanal atingida');
  if (!meta) return { ativo:false, semanas:0 };
  const vistos = new Map();
  lancamentos
    .filter(l=>l.vendedorId===vendedorId && l.criterioId===meta.id && !l.cancelado)
    .forEach(l=>{ const {year,week}=getISOWeek(l.data); const k=`${year}-${String(week).padStart(2,'0')}`; if(!vistos.has(k))vistos.set(k,true); });
  const semanas = Array.from(vistos.keys()).sort().reverse();
  const now = getISOWeek(new Date());
  let count=0;
  for(let i=0;i<semanas.length;i++){
    const [yr,wk]=semanas[i].split('-').map(Number);
    let ey=now.year, ew=now.week-i;
    if(ew<=0){ ey--; ew+=getISOWeek(new Date(ey,11,28)).week; }
    if(yr===ey && wk===ew) count++; else break;
  }
  return { ativo:count>=streakSemanas, semanas:count };
}

function calcularNivel(pts, niveis) {
  return [...niveis].sort((a,b)=>b.minPontos-a.minPontos).find(n=>pts>=n.minPontos)||niveis[0];
}

function proximoNivel(pts, niveis) {
  return [...niveis].sort((a,b)=>a.minPontos-b.minPontos).find(n=>n.minPontos>pts)||null;
}

function pontosTotal(id, lancs) {
  return lancs.filter(l=>l.vendedorId===id && !l.cancelado).reduce((s,l)=>s+l.pontos,0);
}

function pontosMes(id, lancs, refDate) {
  const n = refDate ? new Date(refDate) : new Date();
  return lancs.filter(l=>{
    const d=new Date(l.data);
    return l.vendedorId===id && !l.cancelado && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  }).reduce((s,l)=>s+l.pontos,0);
}

function countNoMes(vid, cid, lancs, refDate) {
  const n = refDate ? new Date(refDate) : new Date();
  return lancs.filter(l=>{
    const d=new Date(l.data);
    return l.vendedorId===vid && l.criterioId===cid && !l.cancelado && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  }).length;
}

function pontosNoCriterioMes(vid, cid, lancs, refDate) {
  const n = refDate ? new Date(refDate) : new Date();
  return lancs.filter(l=>{
    const d=new Date(l.data);
    return l.vendedorId===vid && l.criterioId===cid && !l.cancelado && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  }).reduce((s,l)=>s+l.pontos,0);
}

function fmtData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
}

function fmtDataLonga(iso) {
  return new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
}

function fmtRel(iso) {
  const diff=Date.now()-new Date(iso).getTime();
  const m=Math.floor(diff/60000), h=Math.floor(diff/3600000), d=Math.floor(diff/86400000);
  if(m<1)return 'agora'; if(m<60)return `há ${m}min`; if(h<24)return `há ${h}h`;
  if(d===1)return 'ontem'; if(d<30)return `há ${d}d`; return fmtData(iso);
}

function initials(nome) {
  return nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
}

function nomeCurto(nome) {
  const p=nome.split(' ');
  return p.length<2 ? p[0] : `${p[0]} ${p[p.length-1][0]}.`;
}

function nomeFirst(nome) { return nome.split(' ')[0]; }

const LS_KEY = 'yes-mocelin-v3';

// ── EXPOSE GLOBALS ────────────────────────────────────────────────────────────
window.SEED_STATE          = SEED_STATE;
window.reducer             = reducer;
window._sb                 = _sb;
window.loadFromSupabase    = loadFromSupabase;
window.syncAction          = syncAction;
window.getISOWeek          = getISOWeek;
window.calcularStreak      = calcularStreak;
window.calcularNivel       = calcularNivel;
window.proximoNivel        = proximoNivel;
window.pontosTotal         = pontosTotal;
window.pontosMes           = pontosMes;
window.countNoMes          = countNoMes;
window.pontosNoCriterioMes = pontosNoCriterioMes;
window.fmtData             = fmtData;
window.fmtDataLonga        = fmtDataLonga;
window.fmtRel              = fmtRel;
window.initials            = initials;
window.nomeCurto           = nomeCurto;
window.nomeFirst           = nomeFirst;
window.LS_KEY              = LS_KEY;
window.SEED_USUARIOS       = SEED_USUARIOS;
window.SEED_LOJAS          = SEED_LOJAS;
