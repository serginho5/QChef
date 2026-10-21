// Servidor do QChef no Cloudflare Workers (grátis, sem cartão). Login continua no Firebase Auth;
// acessos e contagem do mês ficam no Cloudflare KV. A geração da receita é a mesma do Firebase Functions.
//   POST /receita  cria a receita (exige login + acesso ativo; conta no limite do mês)
//   GET  /uso      quantas receitas a pessoa já criou no mês
//   GET  /acesso   se o e-mail de quem entrou tem compra ativa (e se é Pro)
//   POST /kiwify   webhook da Kiwify: libera ou bloqueia o acesso do e-mail da compra
// KV: acesso:{email} → { ativo, pro, nome, pedido }   uso:{uid}:{AAAA-MM} → número
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { configurar, criarReceita } from '../../functions/receita.js'

const CHAVES_GOOGLE = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
const LIMITE = { normal: 20, pro: 150 }
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }

class Falha extends Error {
  constructor(status, codigo, mensagem) { super(mensagem); this.status = status; this.codigo = codigo }
}
const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

const mesAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
function proximoMes() {
  const [a, m] = mesAtual().split('-').map(Number)
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10)
}

// Confere o token do Firebase Auth (assinado pelo Google) sem precisar do Firebase Admin
async function quemEntrou(req, env) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer /, '')
  if (!token) throw new Falha(401, 'login', 'Entre na sua conta para criar receitas.')
  try {
    const { payload } = await jwtVerify(token, CHAVES_GOOGLE, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    })
    return { uid: payload.sub, email: String(payload.email || '').toLowerCase() }
  } catch {
    throw new Falha(401, 'login', 'Sua sessão expirou. Entre de novo.')
  }
}

async function lerAcesso(env, email) {
  return (email && (await env.QCHEF.get(`acesso:${email}`, 'json'))) || {}
}

async function usuario(req, env) {
  const u = await quemEntrou(req, env)
  const acesso = await lerAcesso(env, u.email)
  if (acesso.ativo !== true) throw new Falha(403, 'sem-acesso', 'Não encontramos uma compra ativa para este e-mail.')
  return { ...u, pro: acesso.pro === true }
}

async function lerUso(env, u) {
  const usadas = Number(await env.QCHEF.get(`uso:${u.uid}:${mesAtual()}`)) || 0
  return { usadas, limite: u.pro ? LIMITE.pro : LIMITE.normal, pro: u.pro, renovaEm: proximoMes() }
}

// Kiwify: order_status "paid" libera; reembolso, chargeback e assinatura cancelada bloqueiam
async function kiwify(req, env, url) {
  if (!env.KIWIFY_TOKEN || url.searchParams.get('token') !== env.KIWIFY_TOKEN) return json({ ok: false }, 401)
  const b = await req.json().catch(() => ({}))
  const email = (b.Customer?.email || '').trim().toLowerCase()
  const status = b.order_status || b.webhook_event_type || ''
  console.log('kiwify', JSON.stringify({ email, status, produto: b.Product?.product_id }))
  if (!email) return json({ ok: true, ignorado: 'sem e-mail' })
  const pro = !!env.KIWIFY_PRODUTO_PRO && b.Product?.product_id === env.KIWIFY_PRODUTO_PRO
  const atual = await lerAcesso(env, email)
  if (status === 'paid' || status === 'order_approved') {
    await env.QCHEF.put(`acesso:${email}`, JSON.stringify({ ...atual, ativo: true, ...(pro ? { pro: true } : {}), nome: b.Customer?.full_name || atual.nome || '', pedido: b.order_id || atual.pedido || '', em: new Date().toISOString() }))
  } else if (['refunded', 'chargedback', 'subscription_canceled', 'order_refunded'].includes(status)) {
    await env.QCHEF.put(`acesso:${email}`, JSON.stringify({ ...atual, ...(pro ? { pro: false } : { ativo: false }), em: new Date().toISOString() }))
  }
  return json({ ok: true })
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
    configurar(env)
    const url = new URL(req.url)
    const rota = url.pathname.replace(/\/$/, '')
    try {
      if (rota === '/kiwify' && req.method === 'POST') return await kiwify(req, env, url)

      if (rota === '/acesso' && req.method === 'GET') {
        const u = await quemEntrou(req, env)
        const a = await lerAcesso(env, u.email)
        return json({ ativo: a.ativo === true, pro: a.pro === true })
      }

      if (rota === '/uso' && req.method === 'GET') return json(await lerUso(env, await usuario(req, env)))

      if (rota === '/receita' && req.method === 'POST') {
        const u = await usuario(req, env)
        const uso = await lerUso(env, u)
        if (uso.usadas >= uso.limite) throw new Falha(429, 'limite', 'Você usou todas as receitas deste mês.')
        const inicio = Date.now()
        const { receita, uso: tokens } = await criarReceita(await req.json().catch(() => ({})))
        // guarda por 40 dias: depois disso a contagem do mês já não importa
        await env.QCHEF.put(`uso:${u.uid}:${mesAtual()}`, String(uso.usadas + 1), { expirationTtl: 40 * 86400 })
        console.log('receita', JSON.stringify({ uid: u.uid, ms: Date.now() - inicio, titulo: receita.titulo, foto: receita.foto.id, modelo: tokens.modelo }))
        return json({ receita, uso: { ...uso, usadas: uso.usadas + 1 } })
      }

      return json({ codigo: 'rota', mensagem: 'Endereço não encontrado.' }, 404)
    } catch (e) {
      if (e instanceof Falha || e.codigo) return json({ codigo: e.codigo, mensagem: e.message }, e.status || 422)
      console.error('erro', e?.stack || e)
      return json({ codigo: 'erro', mensagem: 'Não deu para criar a receita agora. Tente de novo em instantes.' }, 500)
    }
  },
}
