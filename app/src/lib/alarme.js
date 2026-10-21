// Cronômetro do modo cozinhando: alarme sonoro, vibração, tela sempre acesa e notificação.
let ctx = null
let tocando = null

// O navegador só libera som depois de um toque do usuário: chamar isto ao entrar no modo cozinhando
export function prepararSom() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* sem áudio */ }
}

function bipe(freq, inicio, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'sine'; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, inicio)
  g.gain.exponentialRampToValueAtTime(0.5, inicio + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur)
  o.connect(g).connect(ctx.destination)
  o.start(inicio); o.stop(inicio + dur + 0.05)
}

// Toca um toque curto (aviso de meio de etapa ou 1 minuto antes)
export function avisoCurto(comSom = true) {
  if (comSom && ctx) { const t = ctx.currentTime; bipe(880, t, 0.18); bipe(1175, t + 0.22, 0.25) }
  navigator.vibrate?.([200, 100, 200])
}

// Alarme de tempo esgotado: repete até chamar pararAlarme()
export function tocarAlarme(comSom = true) {
  pararAlarme()
  const rodada = () => {
    if (comSom && ctx) { const t = ctx.currentTime; [0, 0.3, 0.6].forEach((d) => bipe(1046, t + d, 0.22)); bipe(1318, t + 0.95, 0.45) }
    navigator.vibrate?.([400, 150, 400, 150, 600])
  }
  rodada()
  tocando = setInterval(rodada, 2500)
}
export function pararAlarme() {
  if (tocando) clearInterval(tocando)
  tocando = null
  navigator.vibrate?.(0)
}

// Mantém a tela acesa enquanto a pessoa cozinha
let trava = null
export async function manterTelaAcesa(ligar) {
  try {
    if (ligar && 'wakeLock' in navigator) {
      trava = await navigator.wakeLock.request('screen')
      document.addEventListener('visibilitychange', reativar)
    } else {
      document.removeEventListener('visibilitychange', reativar)
      await trava?.release(); trava = null
    }
  } catch { /* navegador não suporta */ }
}
// O navegador solta a trava quando o app vai para segundo plano; ao voltar, pede de novo
async function reativar() {
  if (document.visibilityState !== 'visible' || (trava && !trava.released)) return
  try { trava = await navigator.wakeLock.request('screen') } catch { /* ignore */ }
}

// Notificação quando o app está em segundo plano
export async function pedirNotificacoes() {
  try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission() } catch { /* ignore */ }
}
export async function notificar(titulo, corpo) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
    const reg = await navigator.serviceWorker?.getRegistration()
    const op = { body: corpo, icon: 'icons/icon-192.png', badge: 'icons/favicon-48.png', vibrate: [400, 150, 400], tag: 'qchef-timer', renotify: true, requireInteraction: true }
    if (reg) reg.showNotification(titulo, op); else new Notification(titulo, op)
  } catch { /* ignore */ }
}
