# Ritmo (antigo App MEI) — central do Joel

> **Sessão na nuvem:** este arquivo mora na raiz do repositório (a pasta do código).
> Na nuvem NÃO publique (`npm run deploy`) e não escreva na linha real `jnf-financeiro-v1`: só mexa no código, teste na cópia `jnf-financeiro-teste`, faça commit num ramo e deixe a publicação pro Joel/Mac.


Projeto do app **MEI**, que desde 2026-09-27 se chama **Ritmo** ("ritmo.", antes "Joel Neto Filmes — Controle Financeiro"). Qualquer conversa aberta aqui (no Mac ou pelo
celular, via Remote Control) deve ler este arquivo antes de agir. O código mora nesta mesma pasta:
`/Users/joelneto/Documents/CLAUDE/Ritmo - sua produção no ritmo certo` (até 2026-09-29 se chamava `CLAUDE/MEI`; a antiga pasta "App MEI", só de contexto, foi aposentada).

> Em 2026-09-27 o app de finanças pessoais (antigo "Finanças da Casa", agora **Oink**) ganhou projeto próprio:
> `/Users/joelneto/Documents/CLAUDE/Oink - suas contas sem susto` (com o código em `app/`). Nada do Oink fica aqui.
> Se algo aqui contradisser o código, **o código vence**: confira antes de afirmar e corrija este arquivo.

| | **MEI** |
|---|---|
| Pra que serve | Faturamento de edição de vídeo por cliente, notas, limite MEI |
| Pasta do código | `/Users/joelneto/Documents/CLAUDE/Ritmo - sua produção no ritmo certo` |
| Tecnologia | Vite + **JavaScript puro** (`src/main.js` ~2.000 linhas + CSS em `index.html`) |
| Link do app | https://joonetoo.github.io/mei-financeiro/ |
| Código no GitHub | github.com/joonetoo/mei-financeiro (público) |
| Linha dos dados | `jnf-financeiro-v1` (backups `jnf-financeiro-v1-backup-0` … `-6`) |
| Cópia pra testes | `jnf-financeiro-teste` (servidor `mei-teste`, porta 5192) |
| **Beta "Ritmo"** | https://joonetoo.github.io/mei-beta/ — ramo **`beta`** do mesmo repositório, publica com `npm run deploy-beta` (repo `joonetoo/mei-beta`), linha **`mei-beta`** (cópia; o build beta não contém `jnf-financeiro-v1`). Depois de mexer no beta, **voltar pro ramo `main`** (`npm run deploy` no ramo beta publicaria o beta no link real!). |
| Visual atual | **Ritmo** (2026-09-27): creme um tico mais escuro, barra oliva, Liquid Glass no Mac, One UI no celular, ícone oliva "notinha + check" (desde 2026-09-29, animado só no carregamento) — fontes: **Manrope** no app e **Urbanist 800** só no "ritmo." e na saudação (`--fonte-logo`, desde 2026-09-29) |

---

## 1. Quem é o Joel e como trabalhar com ele

- **Editor de vídeo, não é programador.** Explicar tudo em português do dia a dia, com metáforas,
  sem terminar a resposta em jargão. Ele já disse: *"me explica o que isso significa pq eu nao entendo nada"*.
- **Vocabulário dele:** "tirar a foto" = fazer o commit (e o push pro GitHub). "Publicar" = deploy
  (é o que faz o celular mudar). Deixe claro que são passos diferentes: a mudança fica só no Mac → a
  "foto" guarda uma cópia → o deploy coloca no ar.
- **Mostrar antes de mexer.** Pra qualquer mudança visual ou função nova: primeiro um mockup
  (artifact de Design com telas de celular 390×844 e Mac 1440×900, usando a paleta e os dados reais do
  app), espera o "pode fazer" e só então edita código. Palavras dele: *"me mostra como vai ficar antes de mexer ok"*.
  Oferecer opções com escopo (só correções / + layout / tudo) funciona bem.
- **Tolerância zero a perda de dados.** *"Na planilha de excel eu não perdia e aqui não posso de jeito
  nenhum perder nem uma vírgula."* Antes de mexer em qualquer parte que salva dados, carregar a skill
  `zero-data-loss`. Sempre dizer explicitamente que os dados não foram tocados.
- **Nunca mudar funções sem pedir.** Em redesign ele repete: *"não quero perder nenhuma função, é mais a
  parte estética"*.
- Ele reporta bugs com prints circulados e palavras próprias ("ficou vazado o número do Antonio").
  Traduzir pra causa real, medir no app rodando, explicar a causa em palavras simples.
- Quando diz "ok"/"blz"/"perfeito", está satisfeito — não precisa de resumo depois.
- **Aparelhos:** Chrome no MacBook + Chrome no Android. **Não usa mais Safari** (desde 2026-09-13).
  macOS 27, terminal zsh.
- **Sempre desligar** servidores de teste/tarefas em segundo plano ao terminar (ele pediu "pra sempre").
- Se bater limite de uso no meio de um trabalho: esperar e continuar.


---

## 2. Arquitetura (a mesma do Oink)

- **Dados:** um projeto Supabase gratuito — `https://oikbmfdlhvqesbgnmeky.supabase.co` — com **uma
  tabela só, `app_data`** (`id` texto + `data` jsonb + `updated_at`). Cada app é **uma linha** com o
  estado inteiro em JSON. Acesso pela chave `anon` (pública, está no código) com RLS permissivo.
  Escolhido pra os dados **não dependerem da assinatura do Claude** — foi uma preocupação explícita dele.
- **Código:** hospedado no GitHub Pages. Mexer no código **nunca** toca nos dados — são dois lugares
  separados. Frase pra tranquilizar o Joel sempre que publicar.
- **Por que não Artifact do Claude pra hospedar:** as páginas de artifact bloqueiam em silêncio
  qualquer conexão com Supabase (o app caiu nos dados de exemplo sem mostrar erro). Nunca hospedar
  app com backend externo como Artifact. E o antigo `window.storage` de artifact já apagou dados dele
  ao republicar — é a origem de toda essa arquitetura.
- **Plano grátis do Supabase:** pausa após 7 dias sem uso (ele usa todo dia, mas se reclamar que "não
  carrega", verificar isso). Não tem restauração com linha do tempo → por isso os backups diários e o
  botão manual de exportar.
- **Aviso do Supabase (e-mail de 2026-09-24):** a partir de **2026-10-30**, tabela NOVA no `public` precisa
  de `GRANT` explícito. `app_data` não é afetada. Preferir sempre novas **linhas** em `app_data` em vez
  de novas tabelas. Se criar tabela: `grant select, insert, update, delete on public.<tabela> to anon, authenticated, service_role;` + políticas RLS.

### Proteções contra perda de dados (já implementadas nos dois — não remover)
1. Carregar distingue "linha vazia" de "falhou a conexão"; tenta 3x e, se falhar, mostra tela
   "Não foi possível carregar" **sem nunca salvar por cima**. (Isso nasceu de um incidente real em
   2026-09-14: uma falha de rede fez o Finanças voltar aos dados-semente e apagar setembro. Recuperado
   de um "Exportar dados" que o Joel guardou em `Backups Finanças/`, hoje em `Oink - suas contas sem susto/backups/`.)
2. Salvamento em fila (`flushSave` com trava) — um salvamento antigo nunca passa por cima de um novo.
3. Salva na hora ao minimizar/fechar a aba (`visibilitychange`/`pagehide`).
4. Backup diário rotativo (7 dias, por dia da semana), só depois de um carregamento confirmado.
5. "Desfazer" de 10 segundos em toda exclusão (itens, meses, clientes).
6. Erro ao salvar aparece na tela e tenta de novo a cada 5s (MEI desde 2026-09-24, Finanças desde 2026-09-25 — aviso vermelho no topo). MEI: importar backup pede confirmação.
7. Datas em horário local (não UTC) — antes, depois das 21h o vídeo caía no dia seguinte.
8. **Dois aparelhos (desde 2026-09-26):** só grava se houve edição (abrir/esconder não grava); ao voltar
   pra tela, clicar na janela e a cada 30s busca a versão mais nova (só se não houver edição pendente);
   grava com `setIfUnchanged` (update condicionado ao `updated_at` que o aparelho conhece). Se outro
   aparelho gravou antes → **conflito**: a versão local vai pra linha `<chave>-conflito-AAAA-MM-DD-HHMMSS`,
   o app carrega a versão da nuvem e mostra um aviso ("Este aparelho estava com uma versão antiga…").
   **Se o Joel disser que "sumiu algo depois do aviso"**: procurar linhas `-conflito-` e comparar com a
   linha principal — o que foi feito no aparelho antigo está lá; reaplicar só o que falta.
   Testado provando o bug antes (vídeo do "celular" sumia) e a correção depois, nos dois apps.
9. **Blindagem de 2026-09-27 (MEI, commit e82844b):**
   - **Caixa de saída:** cada edição fica no localStorage (`jnf-outbox:<chave>:<aba>`) até a nuvem confirmar e é reenviada/juntada ao reabrir.
   - **Juntar em vez de copiar** (`src/sync.js`, mescla de 3 vias por `id`): só quando o MESMO campo mudou nos dois lados é que fica o daqui, e o de lá vai pra `-conflito-`.
   - Usa a hora devolvida pelo servidor e reconhece a própria gravação quando a resposta se perdeu.
   - **Cofre** `app_historico`: grava o que mudou + uma foto diária, com `chave` = linha do MEI.
   - O backup diário também roda com o app aberto.
   - Chaves do localStorage levam o nome da linha (o beta divide o mesmo endereço).
   - Linha ausente com backups existentes = tela de erro, nunca dados-semente.
   - Sem base conhecida = guarda a cópia e fica com a nuvem.
   - Testes de unidade: `node` em um script com a linha real copiada (25 casos). Testes no navegador com um script fazendo o papel do "celular" via REST.

**Se o Joel disser que os dados sumiram/zeraram:** não entrar em pânico nem assumir perda. Checar a
linha real via REST do Supabase, as linhas `-backup-N`, e perguntar dos arquivos exportados
(`Ritmo - backups/` em `/Users/joelneto/Documents/CLAUDE/`, fora do repositório de propósito, porque o GitHub é público). Mês "vazio" às vezes é só um mês ainda não preenchido.


---

## 3. App MEI — detalhes

**Origem:** artifact no claude.ai (chat: https://claude.ai/share/8fcb9514-ed65-4d69-a45f-ee1a7b6c951a),
migrado pra cá em 2026-09-12. O código original foi mantido em JS puro, só trocando o armazenamento.

**Negócio do Joel:** edita vídeos pra clientes fixos **FÁBIO ORTIZ, WAD AUDIOVISUAL, WIDE MEDIA**, mais
abas de clientes esporádicos. É MEI: limite anual de faturamento **R$ 81.000** (editável).
Função principal (nunca perder): *"marcar os vídeos editados, poder ver sempre os valores que já fiz,
em cada cliente e tudo junto lá em cima"*.

**Telas (desde 2026-09-24):**
- **Painel** (abre primeiro, só leitura). Layout base aprovado "EXATAMENTE do jeitinho": mockup
  https://claude.ai/artifact/D2PmVTe8u1fW2829K92Ff8 — é a especificação. Ordem atual:
  - 1ª linha (pedido do Joel 2026-09-25): **faturado no ano → limite MEI (verde) → meta do mês**.
    O cartão "Faturado" (Opção C, mockup https://claude.ai/artifact/CQVbfcqNoCoU42cbit8az7, commit d9d1e80)
    compara com o ano anterior INTEIRO (barras + "já é X%… faltam R$ Y pra empatar") e mostra média/mês
    (total ÷ meses até o atual). Notas de 2025 quase todas sem data → não dá pra comparar "até o mesmo mês".
  - **"A cobrar"** (período aberto de cada cliente, previsão de fechamento, aviso de atraso).
  - Hoje, esta semana (seg→dom, ele trabalha fim de semana às vezes), gráfico dia a dia, por cliente.
  - **Semana a semana** (2026-09-25, commit 9886143, mockup https://claude.ai/artifact/9uz6CzNdJWUaSneYYgAdjA):
    total de cada semana do mês (seg→dom, cortada na virada do mês, pela data do vídeo), setas ‹ › pra
    trocar de mês (volta até o mês mais antigo com aba de cliente, não passa do mês atual; mês escolhido é
    só tela, `ui.semanasYm`, não é salvo), linha dourada da média sem texto (legenda em "média por semana").
  - Ordem desde 2026-09-29: ... Hoje + Esta semana → **Semana a semana** → dia a dia do mês + por cliente → notas por mês + últimos vídeos. "A cobrar" com mais de 3 clientes vira fila que desliza de lado (`.cob-row.rola`).
  - Notas por mês (com linha de limite/12) e últimos vídeos.
- **Lançamentos** — barra lateral de clientes + painéis: vídeos por mês, "Notas emitidas", Configurações. Desde 2026-09-29 a aba do cliente é em cartões (opção B, mockup https://claude.ai/artifact/Wzamz5hkZxDc7AmcCQE7UU): cabeçalho com ano grande, 3 cartões de número, meses em minigráfico (`.months.lc-bars`), cartão da lista. Aparelhos do Joel: MacBook Pro 14" M1 Pro (testar em 1512×982) e Galaxy A56 (384×832).
  Alternância por pílula (`ui.screen` = `'painel' | 'lanc'`).

**Meta mensal:** `state.metas = {"AAAA-MM": valor}`; mês sem meta herda a anterior; 0 = sem meta.
É o valor que ele precisa pra pagar as contas do mês (R$ 6.000 no início; setembro/2026 = R$ 7.500).
Desde 2026-10-01 conta pela **aba do mês** em que o vídeo foi lançado (pedido do Joel: enquanto WAD/Wide não fecham setembro, o que ele lança nas abas de setembro conta em setembro, mesmo com data de outubro). O cartão tem setas ‹ › (`ui.metaYm`, só tela) e o "Por cliente" acompanha o mês escolhido; mês passado mostra "Ainda recebendo"/"Mês encerrado" e o mês atual avisa "Setembro ainda recebendo: … ›". Editar a meta vale pro mês mostrado. Gráficos de dia/semana seguem pela data do vídeo.

**Períodos de cobrança por cliente (desde 2026-09-25):** mockup https://claude.ai/artifact/A6vsTT8nfzLKY9NPbzrUeD
- Fábio: dia 01 ao último dia do mês. Wide: dia 05 ao dia 04. WAD: ~08 ao 08, mas varia (07/08/09).
- "Fechar" um cliente = emitir e enviar a nota **na hora**; só depois ele começa a lançar no mês seguinte.
  Então cada aba de mês do cliente **é** o período de cobrança dele.
- Botão **"Fechar período"** (desde 2026-09-29, mockup https://claude.ai/artifact/XbDxpcfLnKUa2jcShttvi5) abre uma janela
  (card de vidro no Mac, tela cheia no celular) com **CNPJ do cliente + valor da nota** pra copiar e o link do
  Emissor Nacional (nfse.gov.br — o Joel emite lá, com o gov.br dele; o app NUNCA guarda senha/certificado).
  "Já emiti a nota" lança a nota (desfazer 10s) e oferece salvar o relatório PDF. `client.cnpj` (campo novo,
  cadastrado em Configurações → "CNPJ dos clientes"). Não guardamos o número da nota (o Joel não usa).
  A nota entra no ano da data de hoje.
  Reabrir e fechar de novo **atualiza** a mesma nota, nunca duplica.
- Dados: `state.fechamentos[cliente][AAAA-MM] = {data, notaId, valor}` ou `{aberto:true, notaId}`;
  `client.diaFechamento` (0 = último dia; N = dia N do mês seguinte; padrão fabio 0, wide 4, wad 8 —
  é só estimativa, editável em Configurações).
- Nome na nota: fica o **nome completo** do cadastro (ex.: "WAD AUDIOVISUAL") — decisão do Joel em 2026-09-25. Notas antigas digitadas à mão têm nome curto; não "padronizar". A lista de notas só aparece no app, não no PDF do cliente.

**Outras funções:** relatório PDF por mês/cliente (jsPDF, na mesma paleta do app, baixa direto);
botão de olho que troca valores por **bolinhas** (••••, como app de banco — ele não quis desfoque);
backup/restauração por arquivo; **sem internet (nível 1, 2026-09-28, commit 9340ade)**: `public/sw.js` guarda só o esqueleto (página, código, ícones, fontes — nunca dados do Supabase); a página busca sempre a versão nova primeiro. Sem rede aparece o esqueleto + cartão de vidro "Ops, sem internet no momento" (folha de baixo no celular; opção B do quadro, página "Sem internet"), que recarrega sozinho quando a rede volta; nada é gravado nessa tela. Testar service worker num Chrome headless (puppeteer-core) — o navegador embutido do app não aceita service worker; etiquetas "NOVO" somem sozinhas após `NOVO_ATE = 2026-10-31`.

**Topo (2026-09-29):** marca grande + slogan à esquerda, saudação "Bom dia/Boa tarde/Boa noite, <apelido>" + data à direita (mockup https://claude.ai/artifact/4KAZYfPs2xQzqRT6xdYvEj). Nome/CNPJ saíram do topo. `business.apelido` (Configurações "Como te chamar"; vazio = 1º nome do nome fantasia).

**Modo escuro (2026-09-29):** opção A "Oliva noturno" (mockup https://claude.ai/artifact/EdgPMts5ujWy41pEAPsPR4). Configurações → Aparência: Claro / Escuro / Automático (segue o aparelho), guardado no localStorage `ritmo-tema` (só tela). Classe `html.escuro`, bloco "MODO ESCURO" no fim do `<style>`; script no `<head>` aplica antes de desenhar. Também em 2026-09-29: calendário próprio (botão `.cell-date`, `calendarioHtml`), botão de virar a lista (`ritmo-ordem:<chave>`, só tela) e cartões de vídeo em 2 linhas no celular.

**Visual Ritmo (2026-09-27, substitui o de baixo):** tokens no fim do `<style>` do `index.html` (bloco "RITMO"): fundo `#E8E1D0`, cartões `#FBF8F1`, barra lateral oliva `rgba(46,57,37,.9)`, bolinhas dos clientes em degradê cheio, vidro (`backdrop-filter`) só em telas ≥821px, One UI (barra de baixo, cantos 26) em ≤760px.

**Visual anterior (2026-09-20, "Opção A — Extrato claro"):** ele achou o escuro azul-neon
"gamer, infantil" e quis "ar de app sério de finanças". Fundo creme `#F2EEE3`, cartões brancos, barra
lateral escura `#211D18` com pílula ativa creme `#EDE7DA`, acentos sálvia `#5F7248` / dourado `#8A6416`
/ lavanda `#4A4C81`, botões retangulares arredondados (não cápsula). Fontes Fraunces + Public Sans.
Cores dos chips: chip-0 dourado, chip-1 lavanda, chip-2 sálvia.
Obs.: diferente do Finanças, aqui o claro foi escolha dele — não "corrigir" pra escuro.

**Pegadinha de teste:** o `render()` recria a tela inteira a cada ação, então referências de elementos
do navegador ficam velhas depois de qualquer clique — buscar de novo a cada passo.

**Ícone:** o original (`icone MEI.jpg`) não existe mais no Mac; o ícone atual é o SVG `RITMO_ICONE` em `src/main.js`.


---

## 4. Como fazer uma mudança (passo a passo)

1. Entender o pedido; se for visual ou função nova → **mockup primeiro** e esperar aprovação.
2. Editar o código em `/Users/joelneto/Documents/CLAUDE/Ritmo - sua produção no ritmo certo`.
3. **Testar sem tocar nos dados reais:**
   - MEI: iniciar o servidor `mei-teste` (em `.claude/launch.json`) — usa a cópia `jnf-financeiro-teste`.
     Depois conferir que o build de produção tem **0** ocorrências de `jnf-financeiro-teste`.
   - Nunca testar exclusões em dados reais (no app de finanças isso já apagou uma "Farmácia" de verdade).
   - As cópias envelhecem: antes de um teste importante, recopiar a linha real por cima da cópia
     (ler a linha real via REST e fazer upsert com o id da cópia). Nunca o contrário.
   - Testar no tamanho de celular e de Mac.
4. Mostrar o resultado (print) e explicar em português simples.
5. **Tirar a foto:** `git add -A && git commit -m "..." && git push origin main` na pasta do app.
6. **Publicar:** `npm run deploy` na pasta do app. Às vezes a trava de segurança bloqueia publicar —
   aí entregar ao Joel o comando pronto pra colar no Terminal, por exemplo:
   ```bash
   cd "/Users/joelneto/Documents/CLAUDE/Ritmo - sua produção no ritmo certo" && export PATH="$HOME/.local/bin:$PATH" && npm run deploy
   ```
   O GitHub Pages demora ~1 min pra atualizar.
7. Conferir no link real que carregou com os dados dele. Dizer que os dados não foram tocados.
8. Desligar servidores de teste.

**Ambiente:** Node via nvm (`~/.nvm`, v24.21.0) — se `npm` não for encontrado, rodar
`export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"`. O `gh` (GitHub, conta `joonetoo`) está em
`~/.local/bin`. Repositórios precisam ser **públicos** (GitHub Pages grátis não serve repositório
privado — ele tentou tornar privado em 2026-09-13 e voltamos pra público; nenhum dado financeiro vai pro GitHub).


---

## 5. Lições que custaram caro (não repetir)

- **Publicar o que foi feito na nuvem (ramo `main-drgofb` ou outro):** entregar ao Joel um comando só, já na pasta nova:
  ```bash
  cd "/Users/joelneto/Documents/CLAUDE/Ritmo - sua produção no ritmo certo" && git add CLAUDE.md .claude/launch.json && git commit -m "Anotacoes do Mac" ; git checkout main && git pull origin main && git fetch origin && git merge -X ours origin/<ramo> -m "Junta as mudancas" && git push origin main && export PATH="$HOME/.local/bin:$PATH" && npm run deploy
  ```
  (2026-09-29) Travou duas vezes: `index.lock` esquecido depois da mudança de pasta (conferir `pgrep -x git` e só então `rm -f .git/index.lock`)
  e `CLAUDE.md` alterado nos dois lados (Mac e nuvem) — guardar primeiro o do Mac num commit e juntar com `-X ours`
  (em conflito fica o do Mac; o código não conflita). Depois conferir no site que a versão nova subiu.

- Hospedar app com Supabase como Artifact do Claude → falha silenciosa. Usar GitHub Pages.
- Tratar "falha de rede" igual a "banco vazio" → apagou dados reais. Ver §3.
- Testar exclusão em dado real → apagou um lançamento de verdade.
- Ícone PWA no Android é cortado em círculo: arte a ~66% do tamanho, centralizada, fundo da própria arte.
  Pra achar o centro da arte, usar máscara por saturação (medição ingênua de cor descentralizou 2x).
  Gerar os 4 tamanhos a partir do mestre de 512px.
- Safari: ignorava configuração de download e o jsPDF abria janela extra → motivo da troca pro Chrome.
- Mockup e app real ficaram diferentes uma vez (cantos, animações) → depois de aplicar, comparar lado a
  lado com o mockup aprovado antes de dizer que está pronto.
- Tela de teste do navegador embutido às vezes mostra largura errada no modo celular; conferir `innerWidth`.
  Captura em branco é comum: tirar de novo.
- Ao comparar a linha real antes/depois de testar, comparar o CONTEÚDO (`data`), não só `updated_at`:
  o app aberto no celular/Mac do Joel salva o mesmo conteúdo quando vai pro segundo plano.


---

## 6. Ideias e pendências

- [ ] Lembrar o Joel de vez em quando de usar "Exportar dados" / backup manual nos dois apps.
- [x] **(MEI e Finanças) Dois aparelhos se atropelando** — corrigido e publicado em 2026-09-26 (MEI cc958db,
      Finanças e3e599b). Ver §3, item 8. Junto no MEI: "Restaurar backup" ganhou Desfazer; aviso quando a nota
      de um período fechado é apagada; olhar meses/anos vazios não cria mais abas vazias (as antigas ficaram).
      Linhas `*-teste-conflito-*` no banco são dos testes, descartáveis.

- [ ] **Identidade "Ritmo" + app beta (desde 2026-09-27).** Nome **ritmo.**, ícone "clipes subindo + agulha"
      (fundo creme ou verde da claquete — em escolha), paleta "opção 1" (fundo #E8E1D0, cartões #FBF8F1),
      barra lateral **oliva**, Liquid Glass no Mac, One UI no celular. Quadro:
      https://claude.ai/artifact/HEgsUbmUk8Z3prWw82hCmM (páginas Telas / Marca / Ritmo). Plano completo:
      `~/.claude/plans/artifact-view-context-artifact-837b7560-bubbly-penguin.md`.
      ✅ **VIRADA FEITA em 2026-09-27** (main = 5b68817, mesmo link, linha real intocada). Nav de cima: Painel ·
      Lançamentos · Notas emitidas · Configurações (no celular, barra de baixo); barra lateral só clientes; olho só ícone.
      Ícones em `public/` (maskable 192/512 com arte a ~66%, mac 512/1024, apple-touch, favicon) gerados por headless
      Chrome a partir do SVG. Beta (`mei-beta`, ramo `beta`) segue no ar como área de teste; apagar só quando o Joel pedir.
      Ordem original: 1) mockups (fontes/ícone) → escolha do Joel; 2) ✅ blindagem do salvamento NO APP ATUAL (publicada 2026-09-27, e82844b) (caixa de
      saída local, mescla item a item, cofre `app_historico`, parseBRL "1.500", foco); 3) beta em
      `joonetoo/mei-beta` (ramo `beta`, linha `mei-beta`, cópia dos dados) — ✅ no ar em 2026-09-27
      (ícone A creme, fonte Fraunces + Public Sans, sem timecode); 4) virada no mesmo link: juntar `beta` no
      `main`, `npm run deploy`, conferir a linha real antes/depois; beta aposentado só quando o Joel pedir.

- [x] **Aba Orçamentos + calculadora "Quanto cobrar?" (2026-09-29, mockup https://claude.ai/artifact/RA5LryQDxU3TWvUWSSrNZw — feita no ramo `main-drgofb`; publicar pelo Mac).** Código: bloco "ORÇAMENTOS" em `src/main.js` (`renderOrcamentos`, `orcCalcular`, `orcGerarPDF`, `orcAcao`, `orcCampo`) e no `index.html`. `ui.tab='ORCAMENTOS'`, `ui.orcId`. Calculadora: hora real = média do valor por vídeo dos fixos ÷ 1h15 (~R$ 43); freela soma adicional (20/30/50%) e desconto de volume até 8% (fixo novo: sem adicional, até 12%); piso R$ 40/vídeo. "Usar preço justo" põe o preço cheio no item e o desconto de volume separado (%). Pagamento: Pix (desconto extra opcional), cartão em até Nx com taxa da maquininha, 50/50. "Aprovado" cria aba de cliente (tipo fixo, valor por vídeo = total ÷ qtd) sem vídeos — desfazer só apaga a aba se ela seguir sem vídeos. Barra de baixo do celular com 5 botões usa nomes curtos (Notas, Config.). Calculadora parte do valor da hora (meta do mês ÷ horas/mês), soma dificuldade, prazo, extras e desconto de volume; 3 faixas (mínimo/justo/com folga) + o que ele cobra hoje. Orçamento com itens (qtd × valor), total automático ou manual, texto pronto, prazo, validade, PDF com a identidade (sem Pix), histórico com status e "aprovado → vira aba esporádica". Dados novos só acrescentando (`state.orcamentos`).

- [x] **App "Apuração 2026" saiu daqui (2026-10-04).** Ficou um dia em `public/eleicoes/` e virou projeto próprio:
      repositório `joonetoo/eleicoes-2026`, link https://joonetoo.github.io/eleicoes-2026/, pasta no Mac `CLAUDE/Eleições 2026`.
      Nada dele mora mais no Ritmo (a trava no `public/sw.js` também foi desfeita).

- [x] **Login (2026-10-06, publicado, commit b706285).** Supabase Auth por e-mail: botão do e-mail OU código de 6 números (`src/login.js`, porteiro em `boot()` do `main.js`, `LOGIN_OBRIGATORIO`). Sessão guardada no aparelho com chave `ritmo-auth` (o Oink usa `oink-entrada`). "Sair deste aparelho" em Configurações → Acesso. E-mail do dono: joel.netomga@gmail.com. Painel do Supabase já configurado: SMTP próprio pelo Gmail (sem isso o plano grátis não deixa editar o modelo do e-mail), modelo "Magic link or OTP" + "Confirm sign up" com código, OTP de **6** dígitos, 4 Redirect URLs, cadastro novo ainda LIGADO. **PASSO 0 do SQL já rodado** (pontes para o papel `authenticated`). **Banco AINDA ABERTO** (chave pública lê tudo): o SQL final é o do Oink (`Oink - suas contas sem susto/supabase-login-regras.sql`, cobre os dois apps) — só rodar quando o Oink estiver publicado com login e o Joel tiver entrado em tudo; nessa hora desligar "Allow new users to sign up". Meu rascunho `Ritmo - backups/regras-login-supabase.sql` (PASSO 0 + final) e o passo a passo ficam como reserva. Pegadinha: o navegador pode servir a página velha por uns minutos após publicar (recarregar forçado).

_Quando o Joel trouxer uma ideia nova, anotar aqui antes de começar, e marcar quando publicar._


---

## 7. Onde mais tem informação

- Memória do Claude (mais detalhada, com código): `~/.claude/projects/-Users-joelneto-Documents-CLAUDE-PASTA-CODE/memory/`
  (depois da reorganização de 2026-09-28 a memória de uma conversa aberta na pasta nova fica em `~/.claude/projects/` numa pasta com o nome do caminho novo; se não achar lá, procurar na antiga)
  — especialmente `financas_casa_architecture.md` e `mei_financeiro_architecture.md`.
- Skill de segurança de dados: `~/.claude/skills/zero-data-loss/SKILL.md`.
- Conversas antigas fixadas no app: "App Finanças" e "App MEI".
- Arquivos do Joel: `Ritmo - backups/` em `/Users/joelneto/Documents/CLAUDE/`. As planilhas antigas (Fábio Ortiz, WAD, Wide Media, Notas emitidas) ficam no Google Drive; o PDF "MEUS DADOS DO MEI CASO PRECISE" está em `Documents/MEI, DOCUMENTOS E NOTAS/Documentos /`.
- Projeto do Oink (app de finanças pessoais): `/Users/joelneto/Documents/CLAUDE/Oink - suas contas sem susto`.

