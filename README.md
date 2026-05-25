# YES! Mocelin — Boletim Comercial

Sistema de gamificação da equipe comercial. Estilo boletim impresso / almanaque esportivo.

## Como rodar

**Necessário:** servidor HTTP local (o Babel standalone não funciona via `file://`).

**Opção 1 — VS Code Live Server:**
Abra a pasta no VS Code → clique com botão direito em `index.html` → "Open with Live Server".

**Opção 2 — Python:**
```bash
cd C:\Users\compr\yes-mocelin-v3
python -m http.server 8080
# Abra http://localhost:8080
```

**Opção 3 — Node:**
```bash
npx serve C:\Users\compr\yes-mocelin-v3
```

## Logo

Salve o logo da Yes! Mocelin em:
- `assets/logo.png` — logo principal (aparece no masthead)
- `assets/logo-watermark.png` — versão sem fundo, alta resolução (marca d'água)

## Estrutura de arquivos

```
index.html       # shell HTML — carrega CDN + scripts em ordem
styles.css       # tokens CSS + todos os componentes visuais
data.jsx         # seed data, reducer, funções utilitárias
components.jsx   # primitivos: Avatar, NivelBadge, PrimaryBtn, etc.
tabs.jsx         # RankingTab, LancarTab, VendedorTab, FeedTab
config-tab.jsx   # ConfigTab com 4 subtabs
app.jsx          # App, Masthead, TweaksPanel, ReactDOM.mount
assets/          # logo.png + logo-watermark.png
```

## Funcionalidades

- **Ranking:** mês atual ou geral, stat strip, exportar CSV
- **Lançar:** sim/não ou parcial, streak automático, toast de confirmação
- **Vendedor:** hero com posição, gráfico 6 meses, histórico paginado
- **Feed:** linha do tempo com filtros por vendedor e critério
- **Ajustes:** editar vendedores, critérios, níveis e streak
- **Tweaks:** tema (paper/carbon/bright), cor de destaque, densidade
- **Persistência:** localStorage (`yes-mocelin-v3`)
