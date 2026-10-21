// Comunicação com o servidor de receitas (pasta servidor/). A chave da IA fica só no servidor.
// Sem VITE_API_URL, usa o livro de receitas no próprio aparelho, sem custo.
// (Modo demonstração + VITE_API_URL=http://localhost:3100 testa a IA pelo servidor local, servidor/functions/dev.js)
import { tokenAtual } from './auth.js'
import { receitaExemplo } from './exemplo.js'

const API = import.meta.env.VITE_API_URL
export const USA_EXEMPLO = !API

export class ErroReceita extends Error {
  constructor(codigo, mensagem, extra = {}) { super(mensagem); this.codigo = codigo; Object.assign(this, extra) }
}

async function chamar(caminho, corpo, tempoMax = 15000) {
  const token = await tokenAtual()
  let r
  try {
    r = await fetch(API + caminho, {
      method: corpo ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(tempoMax),
    })
  } catch (e) {
    if (e.name === 'TimeoutError') throw new ErroReceita('demorou', 'A receita está demorando mais que o normal. Tente de novo em instantes.')
    throw new ErroReceita('offline', 'Sem conexão. Para criar receitas novas é preciso internet; suas favoritas funcionam offline.')
  }
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) throw new ErroReceita(dados.codigo || 'erro', dados.mensagem || 'Não deu para criar a receita agora. Tente de novo em instantes.', dados)
  return dados
}

// pedido: { ingredientes, ambiente, filtros, perfil, variacao }
export async function gerarReceita(pedido) {
  if (USA_EXEMPLO) {
    await new Promise((ok) => setTimeout(ok, 2600))
    const receita = receitaExemplo(pedido)
    if (!receita) throw new ErroReceita('sem-receita', 'Não achamos uma receita com esses ingredientes no modo demonstração. Tente adicionar mais um ou trocar o aparelho.')
    return { receita, uso: usoExemplo(true) }
  }
  try {
    return await chamar('/receita', pedido, 55000)
  } catch (e) {
    // IA ocupada, lenta ou sem internet: em vez de deixar a pessoa sem nada, traz o prato
    // mais parecido do livro de receitas (fica no aparelho e não conta no limite do mês)
    if (!['ia-ocupada', 'demorou', 'offline', 'erro', 'recusa'].includes(e.codigo)) throw e
    const receita = receitaExemplo(pedido)
    if (!receita) throw e
    const motivo = e.codigo === 'offline' ? 'Sem internet agora' : 'A IA está ocupada agora'
    return { receita: { ...receita, exemplo: false, aviso: `${motivo}, então trouxemos a receita mais parecida do nosso livro. ${receita.aviso}`.trim() } }
  }
}

export async function consultarUso() {
  if (USA_EXEMPLO) return usoExemplo(false)
  return chamar('/uso')
}

// Uso do mês no modo demonstração (contado no aparelho)
function usoExemplo(somar) {
  const mes = new Date().toISOString().slice(0, 7)
  let u
  try { u = JSON.parse(localStorage.getItem('qchef:uso-demo')) } catch { u = null }
  if (!u || u.mes !== mes) u = { mes, usadas: 0 }
  if (somar) u.usadas++
  try { localStorage.setItem('qchef:uso-demo', JSON.stringify(u)) } catch { /* ignore */ }
  return { usadas: u.usadas, limite: 20, pro: false, renovaEm: proximoMes() }
}
export function proximoMes() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10)
}
