/* ============================================================
   Login (Supabase Auth): link + código de 6 digitos no e-mail.
   So o dono entra: o cadastro de novas contas fica desligado no Supabase
   e o pedido usa shouldCreateUser:false. Uma vez por aparelho — a sessao
   fica guardada no aparelho e se renova sozinha.
   Este arquivo NAO mexe em dados (app_data): so cuida de quem esta logado.
   ============================================================ */

const LS_PENDENTE = 'ritmo-login-pendente'; // so o e-mail do pedido em andamento (nao e segredo)
const VALE_MS = 60 * 60 * 1000;
const ESPERA_REENVIO = 60; // o Supabase so deixa pedir de novo depois de ~60s

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function emailMascarado(email){
  const [u, d] = String(email || '').split('@');
  if(!d) return email || '';
  return u.slice(0, 1) + '••••@' + d;
}

// {sessao} = logado; {sessao:null} = precisa entrar; {falhou:true} = nao deu
// pra saber (rede). Nunca confundir "sem rede" com "deslogado".
export async function sessaoAtual(supabase){
  try{
    const { data, error } = await supabase.auth.getSession();
    if(error) return { falhou: true };
    return { sessao: data.session || null };
  }catch(e){
    return { falhou: true };
  }
}

export async function sair(supabase){
  try{ await supabase.auth.signOut(); }catch(e){}
  try{ localStorage.removeItem(LS_PENDENTE); }catch(e){}
}

function lerPendente(){
  try{
    const p = JSON.parse(localStorage.getItem(LS_PENDENTE) || 'null');
    if(p && p.email && p.ate > Date.now()) return p;
  }catch(e){}
  return null;
}
function guardarPendente(email){
  try{ localStorage.setItem(LS_PENDENTE, JSON.stringify({ email, ate: Date.now() + VALE_MS })); }catch(e){}
}
function limparPendente(){
  try{ localStorage.removeItem(LS_PENDENTE); }catch(e){}
}

function traduzErro(error){
  const msg = String(error?.message || '').toLowerCase();
  const st = error?.status;
  if(st === 0 || msg.includes('fetch') || msg.includes('network')) return 'Sem conexão. Confira a internet e tente de novo.';
  if(st === 429 || msg.includes('rate') || msg.includes('seconds')) return 'Calma: espere um minutinho antes de pedir outro código.';
  if(msg.includes('signups not allowed') || msg.includes('not allowed') || st === 422) return 'Este e-mail não tem acesso ao Ritmo.';
  return 'Não consegui enviar agora. Tente de novo em instantes.';
}

// aviso se o usuario chegou por um link ja usado/vencido (o Supabase poe isso na URL)
function erroNaUrl(){
  const h = (location.hash || '').replace(/^#/, '');
  if(!h) return '';
  const p = new URLSearchParams(h);
  const code = p.get('error_code') || '';
  if(code) return 'Esse link venceu ou já foi usado. Peça um novo abaixo.';
  return '';
}

/* Desenha a tela de login em #app. `aoEntrar` roda quando o codigo for aceito. */
export function mostrarLogin(supabase, { iconeHtml, aoEntrar }){
  const app = document.getElementById('app');
  const pendente = lerPendente();
  let passo = pendente ? 'codigo' : 'email';
  let email = pendente ? pendente.email : '';
  let aviso = erroNaUrl();
  let timer = null;
  let restante = 0;
  let ocupado = false;

  if(aviso){ // limpa a URL pra o aviso nao voltar a cada recarga
    try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
  }

  function esqueleto(){
    app.innerHTML = `
      <div class="lg" id="lg">
        <aside class="lg-marca">
          <span class="lg-icone">${iconeHtml}</span>
          <div class="lg-nome">
            <div class="lg-logo">ritmo.</div>
            <div class="lg-slogan">sua produção, no ritmo certo</div>
          </div>
          <div class="lg-rodape">Notas, vídeos e metas num lugar só.</div>
        </aside>
        <main class="lg-lado"><section class="lg-card" id="lg-card" aria-live="polite"></section></main>
      </div>`;
  }

  function desenhar(){
    const card = document.getElementById('lg-card');
    if(!card) return;
    if(timer){ clearInterval(timer); timer = null; }
    if(passo === 'email'){
      card.innerHTML = `
        <h1>Entrar no Ritmo</h1>
        <p class="lg-sub">Digite seu e-mail e a gente manda um link e um código. Sem senha.</p>
        <form id="lg-form" novalidate>
          <label for="lg-email">E-mail</label>
          <input id="lg-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="seu@email.com" value="${esc(email)}">
          <p class="lg-erro" id="lg-erro" role="alert" ${aviso ? '' : 'hidden'}>${esc(aviso)}</p>
          <button class="lg-btn" id="lg-enviar" type="submit">Enviar link de acesso</button>
        </form>
        <div class="lg-dica"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3.5 7l8.5 6 8.5-6"/></svg><span>Só uma vez em cada aparelho. Depois o Ritmo abre direto.</span></div>
        <p class="lg-nota">Acesso só do dono. Seus dados continuam guardados na nuvem.</p>`;
      document.getElementById('lg-form').addEventListener('submit', aoEnviar);
      const campo = document.getElementById('lg-email');
      if(!email) setTimeout(() => campo.focus(), 50);
    }else{
      card.innerHTML = `
        <h1>Olha seu e-mail</h1>
        <p class="lg-sub">Mandamos um código de <b>6 dígitos</b> para <b>${esc(email)}</b>. Digite aqui, sem sair do app. No Mac, pode clicar em <b>“Entrar no Ritmo”</b> no e-mail.</p>
        <form id="lg-form" novalidate>
          <label for="lg-codigo">Código do e-mail</label>
          <div class="lg-cod" id="lg-cod">
            ${'<span></span>'.repeat(6)}
            <input id="lg-codigo" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" aria-label="Código de 6 dígitos">
          </div>
          <p class="lg-erro" id="lg-erro" role="alert" ${aviso ? '' : 'hidden'}>${esc(aviso)}</p>
          <button class="lg-btn" id="lg-entrar" type="submit">Entrar</button>
        </form>
        <p class="lg-nota lg-nota-e">O código vale por <b>1 hora</b>. Não chegou? Veja a caixa de spam.</p>
        <div class="lg-links">
          <button type="button" class="lg-link" id="lg-reenviar" disabled></button>
          <button type="button" class="lg-link forte" id="lg-outro">Usar outro e-mail</button>
        </div>`;
      const entrada = document.getElementById('lg-codigo');
      const caixas = document.querySelectorAll('#lg-cod span');
      const pintar = () => {
        const v = entrada.value;
        caixas.forEach((c, i) => {
          c.textContent = v[i] || '';
          c.classList.toggle('on', i === Math.min(v.length, 5));
        });
        document.getElementById('lg-cod').classList.toggle('foco', document.activeElement === entrada);
      };
      entrada.addEventListener('input', () => {
        entrada.value = entrada.value.replace(/\D/g, '').slice(0, 6);
        pintar();
        if(entrada.value.length === 6) aoConferir();
      });
      entrada.addEventListener('focus', pintar);
      entrada.addEventListener('blur', pintar);
      document.getElementById('lg-form').addEventListener('submit', (ev) => { ev.preventDefault(); aoConferir(); });
      document.getElementById('lg-outro').addEventListener('click', () => {
        limparPendente(); passo = 'email'; aviso = ''; desenhar();
      });
      document.getElementById('lg-reenviar').addEventListener('click', reenviar);
      pintar();
      setTimeout(() => entrada.focus(), 50);
      contar();
    }
  }

  function mostrarErro(texto){
    aviso = texto;
    const e = document.getElementById('lg-erro');
    if(e){ e.textContent = texto; e.hidden = !texto; }
  }
  function travar(sim){
    ocupado = sim;
    const b = document.getElementById('lg-enviar') || document.getElementById('lg-entrar');
    if(b) b.disabled = sim;
  }

  function contar(){
    const b = document.getElementById('lg-reenviar');
    if(!b) return;
    const ver = () => {
      if(restante > 0){ b.disabled = true; b.textContent = `Reenviar em ${restante}s`; }
      else{ b.disabled = false; b.textContent = 'Reenviar código'; }
    };
    ver();
    if(restante > 0){
      timer = setInterval(() => { restante--; ver(); if(restante <= 0){ clearInterval(timer); timer = null; } }, 1000);
    }
  }

  async function pedir(){
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname }
    });
    return error;
  }

  async function aoEnviar(ev){
    ev.preventDefault();
    if(ocupado) return;
    const v = document.getElementById('lg-email').value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ mostrarErro('Digite um e-mail válido.'); return; }
    email = v;
    mostrarErro('');
    travar(true);
    const erro = await pedir();
    travar(false);
    if(erro){ mostrarErro(traduzErro(erro)); return; }
    guardarPendente(email);
    restante = ESPERA_REENVIO;
    passo = 'codigo'; aviso = '';
    desenhar();
  }

  async function reenviar(){
    if(ocupado || restante > 0) return;
    travar(true);
    const erro = await pedir();
    travar(false);
    if(erro){ mostrarErro(traduzErro(erro)); return; }
    guardarPendente(email);
    mostrarErro('');
    restante = ESPERA_REENVIO;
    contar();
  }

  async function aoConferir(){
    if(ocupado) return;
    const entrada = document.getElementById('lg-codigo');
    const token = entrada ? entrada.value.trim() : '';
    if(token.length !== 6){ mostrarErro('Digite os 6 números do e-mail.'); return; }
    mostrarErro('');
    travar(true);
    let erro = null;
    try{
      const r = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      erro = r.error;
    }catch(e){ erro = e; }
    if(erro){
      travar(false);
      const msg = String(erro.message || '').toLowerCase();
      const rede = erro.status === 0 || msg.includes('fetch') || msg.includes('network');
      mostrarErro(rede ? 'Sem conexão. Confira a internet e tente de novo.' : 'Código incorreto ou vencido. Confira o e-mail ou peça outro.');
      if(entrada){ entrada.value = ''; entrada.dispatchEvent(new Event('input')); entrada.focus(); }
      return;
    }
    limparPendente();
    aoEntrar();
  }

  esqueleto();
  if(passo === 'codigo') restante = 0; // voltou pro app depois de pedir: deixa reenviar
  desenhar();
}
