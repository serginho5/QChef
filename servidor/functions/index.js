// Servidor do QChef (Firebase Functions). A chave da IA fica só aqui, nunca no app.
//   POST /receita  cria a receita (exige login + acesso ativo; conta no limite do mês)
//   GET  /uso      quantas receitas a pessoa já criou no mês
//   POST /kiwify   webhook da Kiwify: libera ou bloqueia o acesso do e-mail da compra
import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { criarReceita, MODELO } from './receita.js'

initializeApp()
const db = getFirestore()

const CHAVE_IA = defineSecret('ANTHROPIC_API_KEY')
const CHAVE_GEMINI = defineSecret('QCHEF_GEMINI_KEY')
const TOKEN_KIWIFY = defineSecret('KIWIFY_TOKEN')
const PRODUTO_PRO = defineString('KIWIFY_PRODUTO_PRO', { default: '' })
const LIMITE = { normal: 20, pro: 150 }

class Falha extends Error {
  constructor(status, codigo, mensagem) { super(mensagem); this.status = status; this.codigo = codigo }
}

const mesAtual = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
function proximoMes() {
  const [a, m] = mesAtual().split('-').map(Number)
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10)
}

async function usuario(req) {
  const token = (req.get('Authorization') || '').replace(/^Bearer /, '')
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

// Kiwify: order_status "paid" libera; reembolso, chargeback e assinatura cancelada bloqueiam
async function kiwify(req, res) {
  if (req.query.token !== TOKEN_KIWIFY.value()) { res.status(401).json({ ok: false }); return }
  const b = req.body || {}
  const email = (b.Customer?.email || '').trim().toLowerCase()
  const status = b.order_status || b.webhook_event_type || ''
  logger.info('kiwify', { email, status, produto: b.Product?.product_id })
  if (!email) { res.json({ ok: true, ignorado: 'sem e-mail' }); return }
  const pro = !!PRODUTO_PRO.value() && b.Product?.product_id === PRODUTO_PRO.value()
  const ref = db.doc(`acessos/${email}`)
  if (status === 'paid' || status === 'order_approved') {
    await ref.set({ ativo: true, ...(pro ? { pro: true } : {}), nome: b.Customer?.full_name || '', pedido: b.order_id || '', atualizadoEm: FieldValue.serverTimestamp() }, { merge: true })
  } else if (['refunded', 'chargedback', 'subscription_canceled', 'order_refunded'].includes(status)) {
    await ref.set(pro ? { pro: false } : { ativo: false }, { merge: true })
  }
  res.json({ ok: true })
}

export const api = onRequest(
  { region: 'southamerica-east1', cors: true, timeoutSeconds: 120, memory: '512MiB', secrets: [CHAVE_IA, CHAVE_GEMINI, TOKEN_KIWIFY] },
  async (req, res) => {
    const rota = req.path.replace(/^\/api\/qchef/, '').replace(/\/$/, '')
    try {
      if (rota === '/kiwify' && req.method === 'POST') return await kiwify(req, res)

      if (rota === '/uso' && req.method === 'GET') return res.json(await lerUso(await usuario(req)))

      if (rota === '/receita' && req.method === 'POST') {
        const u = await usuario(req)
        const uso = await lerUso(u)
        if (uso.usadas >= uso.limite) throw new Falha(429, 'limite', 'Você usou todas as receitas deste mês.')
        const inicio = Date.now()
        const { receita, uso: tokens } = await criarReceita(req.body)
        await somarUso(u, (tokens.input_tokens || 0) + (tokens.output_tokens || 0))
        logger.info('receita', { uid: u.uid, modelo: MODELO, ms: Date.now() - inicio, titulo: receita.titulo, foto: receita.foto.id, tokens })
        return res.json({ receita, uso: { ...uso, usadas: uso.usadas + 1 } })
      }

      res.status(404).json({ codigo: 'rota', mensagem: 'Endereço não encontrado.' })
    } catch (e) {
      if (e instanceof Falha || e.codigo) return res.status(e.status || 422).json({ codigo: e.codigo, mensagem: e.message })
      logger.error('erro', e)
      res.status(500).json({ codigo: 'erro', mensagem: 'Não deu para criar a receita agora. Tente de novo em instantes.' })
    }
  },
)
