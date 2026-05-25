// data.jsx — seed data, reducer, utility functions
// All exports via window globals (no ES modules)

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
  schemaVersion: SCHEMA_VERSION,
  vendedores:    SEED_VENDEDORES,
  criterios:     SEED_CRITERIOS,
  lancamentos:   SEED_LANCAMENTOS,
  config:        SEED_CONFIG,
  usuarios:      SEED_USUARIOS,
  comprovantes:  [],
  lojas:         SEED_LOJAS,
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
      if (!p.comprovantes) p.comprovantes = [];
      if (!p.lojas)        p.lojas        = SEED_LOJAS;
      else p.lojas = p.lojas.map(l => ({ faturamento:0, meta:0, ...l }));
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
    case 'RESET':           return SEED_STATE;
    case 'ADD_LANCAMENTO':  return { ...state, lancamentos:[...state.lancamentos, action.payload] };
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
    case 'ADD_LOJA':    return { ...state, lojas:[...(state.lojas||[]), action.payload] };
    case 'UPDATE_LOJA': return { ...state, lojas:(state.lojas||[]).map(l=>l.id===action.payload.id?{...l,...action.payload.changes}:l) };
    case 'REMOVE_LOJA': return { ...state, lojas:(state.lojas||[]).filter(l=>l.id!==action.payload) };
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
    .filter(l=>l.vendedorId===vendedorId && l.criterioId===meta.id)
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
  return lancs.filter(l=>l.vendedorId===id).reduce((s,l)=>s+l.pontos,0);
}

function pontosMes(id, lancs) {
  const n=new Date();
  return lancs.filter(l=>{
    const d=new Date(l.data);
    return l.vendedorId===id && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  }).reduce((s,l)=>s+l.pontos,0);
}

function countNoMes(vid, cid, lancs) {
  const n=new Date();
  return lancs.filter(l=>{
    const d=new Date(l.data);
    return l.vendedorId===vid && l.criterioId===cid && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
  }).length;
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
window.getISOWeek          = getISOWeek;
window.calcularStreak      = calcularStreak;
window.calcularNivel       = calcularNivel;
window.proximoNivel        = proximoNivel;
window.pontosTotal         = pontosTotal;
window.pontosMes           = pontosMes;
window.countNoMes          = countNoMes;
window.fmtData             = fmtData;
window.fmtDataLonga        = fmtDataLonga;
window.fmtRel              = fmtRel;
window.initials            = initials;
window.nomeCurto           = nomeCurto;
window.nomeFirst           = nomeFirst;
window.LS_KEY              = LS_KEY;
window.SEED_USUARIOS       = SEED_USUARIOS;
window.SEED_LOJAS          = SEED_LOJAS;
