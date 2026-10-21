// Login sem senha: Google ou link no e-mail (Firebase Auth). O acesso nasce na compra da Kiwify:
// o webhook grava acessos/{email} no Firestore e o app confere o e-mail de quem entrou.
// Sem as chaves do Firebase no .env, o app roda em MODO DEMONSTRAÇÃO (login simulado, acesso liberado).
import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
} from 'firebase/auth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
export const MODO_DEMO = !cfg.apiKey
export const LINK_COMPRA = import.meta.env.VITE_LINK_COMPRA || 'https://pay.kiwify.com.br/'
export const LINK_PRO = import.meta.env.VITE_LINK_PRO || LINK_COMPRA
export const EMAIL_SUPORTE = import.meta.env.VITE_EMAIL_SUPORTE || 'contato@hubbioguia.com.br'
// Período de teste: VITE_ACESSO_LIVRE=1 libera qualquer conta logada, sem conferir a compra
const ACESSO_LIVRE = import.meta.env.VITE_ACESSO_LIVRE === '1'
export const WHATSAPP_SUPORTE = import.meta.env.VITE_WHATSAPP_SUPORTE || ''

let auth, db
if (!MODO_DEMO) {
  const app = initializeApp(cfg)
  auth = getAuth(app)
  db = getFirestore(app)
}

const DEMO_KEY = 'qchef:demo-user'
const CACHE_ACESSO = 'qchef:acesso'
const EMAIL_LINK = 'qchef:email-link'
const ler = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const gravar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }
const avisar = () => window.dispatchEvent(new Event('qchef:auth'))

export function observarUsuario(cb) {
  if (MODO_DEMO) {
    cb(ler(DEMO_KEY))
    const h = () => cb(ler(DEMO_KEY))
    window.addEventListener('qchef:auth', h)
    return () => window.removeEventListener('qchef:auth', h)
  }
  getRedirectResult(auth).catch(() => {})
  return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, nome: u.displayName, email: (u.email || '').toLowerCase(), foto: u.photoURL } : null))
}

export async function entrarComGoogle() {
  if (MODO_DEMO) { gravar(DEMO_KEY, { uid: 'demo', nome: 'Sergio', email: 'demonstracao@qchef.app', demo: true }); avisar(); return }
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const instalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  if (instalado) await signInWithRedirect(auth, provider)
  else await signInWithPopup(auth, provider)
}

// Envia o link de acesso (sem senha) para o e-mail da compra
export async function enviarLink(email) {
  email = email.trim().toLowerCase()
  gravar(EMAIL_LINK, email)
  if (MODO_DEMO) return
  await sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname + '#/entrar-link', handleCodeInApp: true })
}

// Ao abrir o app pelo link do e-mail, conclui o login
export async function concluirLinkSeHouver() {
  if (MODO_DEMO || !isSignInWithEmailLink(auth, location.href)) return false
  let email = ler(EMAIL_LINK)
  if (!email) email = window.prompt('Confirme o e-mail da compra para entrar:')
  if (!email) return false
  await signInWithEmailLink(auth, email, location.href)
  gravar(EMAIL_LINK, null)
  history.replaceState(null, '', location.pathname + '#/inicio')
  return true
}
export const emailDoLink = () => ler(EMAIL_LINK)

export async function sair() {
  gravar(CACHE_ACESSO, null)
  if (MODO_DEMO) { gravar(DEMO_KEY, null); avisar(); return }
  await signOut(auth)
}

export async function tokenAtual() {
  if (MODO_DEMO || !auth.currentUser) return null
  return auth.currentUser.getIdToken()
}

// Confere se o e-mail tem compra ativa. Guarda o resultado para funcionar sem internet.
// Retorna { estado: 'liberado' | 'negado' | 'offline', pro }
export async function verificarAcesso(usuario) {
  if (!usuario) return { estado: 'negado' }
  if (MODO_DEMO) return { estado: new URLSearchParams(location.search).get('acesso') === 'negado' ? 'negado' : 'liberado', pro: false }
  const cache = ler(CACHE_ACESSO)
  try {
    const snap = await getDoc(doc(db, 'acessos', usuario.email))
    const d = snap.exists() ? snap.data() : {}
    const ok = ACESSO_LIVRE || d.ativo === true
    gravar(CACHE_ACESSO, { email: usuario.email, ok, pro: d.pro === true, em: Date.now() })
    return { estado: ok ? 'liberado' : 'negado', pro: d.pro === true }
  } catch {
    if (ACESSO_LIVRE) return { estado: 'liberado', pro: false }
    if (cache?.email === usuario.email && cache.ok) return { estado: 'liberado', pro: cache.pro }
    return { estado: navigator.onLine ? 'negado' : 'offline' }
  }
}
