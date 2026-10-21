// Servidor do QChef na VPS (Docker + Traefik), no mesmo formato do webhook do Dieta Fácil:
// funciona no plano gratuito do Firebase (Spark) porque grava no Firestore com a conta de serviço.
//   POST /api/qchef/receita  cria a receita (exige login + acesso ativo; conta no limite do mês)
//   GET  /api/qchef/uso      quantas receitas a pessoa já criou no mês
//   POST /api/qchef/kiwify   webhook da Kiwify (Apps › Webhooks): libera ou bloqueia o acesso do e-mail da compra
// Variáveis (.env, fora do git): QCHEF_GEMINI_KEY, KIWIFY_TOKEN, KIWIFY_PRODUTO_PRO (opcional), QCHEF_IA (opcional).
// Credencial: service-account.json (fora do git).
import http from 'node:http'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { criarReceita, IA, MODELO } from './receita.js'

const PORTA = Number(process.env.PORT || 3000)
const BASE = '/api/qchef'
const KIWIFY_TOKEN = process.env.KIWIFY_TOKEN
const PRODUTO_PRO = process.env.KIWIFY_PRODUTO_PRO || ''
const LIMITE = { normal: 20, pro: 150 }

initializeApp({ credential: cert(JSON.parse(readFileSync(process.env.CREDENCIAL || './service-account.json', 'utf8'))) })
const db = getFirestore()

class Falha extends Error {
  constructor(status, codigo, mensagem) { super(mensagem); this.status = status; this.codigo = codigo }
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS })
  res.end(JSON.stringify(dados))
}

const mesAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
function proximoMes() {
  const [a, m] = mesAtual().split('-').map(Number)
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10)
}

async function usuario(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) throw new Falha(401, 'login', 'Entre na sua conta para criar receitas.')
  let u
  try { u = await getAuth().verifyIdToken(token) } catch { throw new Falha(401, 'login', 'Sua sessão expirou. Entre de novo.') }
  const email = (u.email || '').toLowerCase()
  const acesso = email ? (await db.doc(`acessos/${email}`).get()).data() || {} : {}
  if (acesso.ativo !== true) throw new Falha(403, 'sem-acesso', 'Não encontramos uma compra ativa para este e-mail.')
  return { uid: u.uid, email, pro: acesso.pro === true }
}

async function lerUso(u) {
  const d = (await db.doc(`usos/${u.uid}`).get()).data()
  const usadas = d?.mes === mesAtual() ? d.usadas : 0
  return { usadas, limite: u.pro ? LIMITE.pro : LIMITE.normal, pro: u.pro, renovaEm: proximoMes() }
}

async function somarUso(u, tokens) {
  const ref = db.doc(`usos/${u.uid}`)
  await db.runTransaction(async (t) => {
    const d = (await t.get(ref)).data()
    const mes = mesAtual()
    const usadas = (d?.mes === mes ? d.usadas : 0) + 1
    t.set(ref, { mes, usadas, email: u.email, atualizadoEm: FieldValue.serverTimestamp(), tokens: FieldValue.increment(tokens) }, { merge: true })
  })
}

// ---------- Kiwify (mesma regra do Dieta Fácil) ----------
const LIBERA = ['paid', 'approved', 'order_approved', 'compra_aprovada', 'subscription_renewed']
const BLOQUEIA = ['refunded', 'chargedback', 'chargeback', 'order_refunded', 'compra_reembolsada', 'subscription_canceled', 'canceled', 'subscription_late', 'assinatura_atrasada', 'assinatura_cancelada']

function assinaturaValida(raw, sig) {
  if (!sig || !KIWIFY_TOKEN) return false
  const calc = crypto.createHmac('sha1', KIWIFY_TOKEN).update(raw).digest('hex')
  try { return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(sig)) } catch { return false }
}

async function kiwify(b) {
  const email = String(b.Customer?.email || b.customer?.email || '').trim().toLowerCase()
  const status = String(b.order_status || '').toLowerCase()
  const evento = String(b.webhook_event_type || '').toLowerCase()
  if (!email) return 'ignorado: sem e-mail'

  let ativo = null
  if (LIBERA.includes(status) || LIBERA.includes(evento)) ativo = true
  if (BLOQUEIA.includes(status) || BLOQUEIA.includes(evento)) ativo = false
  if (ativo === null) return 'ignorado: ' + (evento || status)

  // Dois produtos ligados pelo e-mail:
  //   QChef (pagamento único) → "base": acesso para sempre, 20 receitas/mês
  //   QChef Pro (assinatura)  → "pro": 150 receitas/mês enquanto pagar
  // Cancelou ou atrasou o Pro: desliga só o Pro e o acesso volta a depender de ter comprado o QChef.
  const pro = !!PRODUTO_PRO && String(b.Product?.product_id || '') === PRODUTO_PRO
  const ref = db.collection('acessos').doc(email)
  const atual = (await ref.get()).data() || {}
  const comprouBase = atual.base === true || (atual.ativo === true && atual.pro !== true && atual.base === undefined)
  const campos = pro
    ? { pro: ativo, ativo: ativo || comprouBase, ...(comprouBase ? { base: true } : {}) }
    : { base: ativo, ativo: ativo || atual.pro === true }
  await ref.set({
    ...campos,
    nome: b.Customer?.full_name || b.Customer?.first_name || null,
    pedido: b.order_id || null,
    produto: b.Product?.product_name || null,
    ultimoEvento: evento || status,
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true })
  await ref.collection('historico').add({ evento: evento || status, pedido: b.order_id || null, pro, em: FieldValue.serverTimestamp() })
  return (ativo ? 'liberado' : 'bloqueado') + (pro ? ' (Pro)' : '')
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    const partes = []
    let tamanho = 0
    req.on('data', (c) => { tamanho += c.length; if (tamanho > 1e6) { req.destroy(); falha(new Falha(413, 'pedido', 'Pedido grande demais.')) } else partes.push(c) })
    req.on('end', () => ok(Buffer.concat(partes)))
    req.on('error', falha)
  })
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end() }
  const url = new URL(req.url, 'http://local')
  const rota = url.pathname.replace(BASE, '').replace(/\/$/, '')
  try {
    if (rota === '/kiwify' && req.method === 'POST') {
      const raw = await lerCorpo(req)
      if (!assinaturaValida(raw, url.searchParams.get('signature') || '')) return json(res, 401, { ok: false, motivo: 'assinatura inválida' })
      const resultado = await kiwify(JSON.parse(raw.toString('utf8') || '{}'))
      console.log(new Date().toISOString(), 'kiwify', resultado)
      return json(res, 200, { ok: true, resultado })
    }

    if (rota === '/uso' && req.method === 'GET') return json(res, 200, await lerUso(await usuario(req)))

    if (rota === '/receita' && req.method === 'POST') {
      const u = await usuario(req)
      const uso = await lerUso(u)
      if (uso.usadas >= uso.limite) throw new Falha(429, 'limite', 'Você usou todas as receitas deste mês.')
      const corpo = JSON.parse((await lerCorpo(req)).toString('utf8') || '{}')
      const inicio = Date.now()
      const { receita, uso: tokens } = await criarReceita(corpo)
      await somarUso(u, (tokens.input_tokens || 0) + (tokens.output_tokens || 0))
      console.log(new Date().toISOString(), 'receita', receita.titulo, '· foto', receita.foto.id || 'ambiente', '·', tokens.modelo || MODELO, '·', Date.now() - inicio, 'ms')
      return json(res, 200, { receita, uso: { ...uso, usadas: uso.usadas + 1 } })
    }

    json(res, 404, { codigo: 'rota', mensagem: 'Endereço não encontrado.' })
  } catch (e) {
    if (e instanceof Falha || e.codigo) return json(res, e.status || 422, { codigo: e.codigo, mensagem: e.message })
    console.error(new Date().toISOString(), e)
    json(res, 500, { codigo: 'erro', mensagem: 'Não deu para criar a receita agora. Tente de novo em instantes.' })
  }
}).listen(PORTA, () => console.log(`QChef API na porta ${PORTA} (${IA}, ${MODELO})`))
