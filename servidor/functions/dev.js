// Servidor local para testar o app com IA de verdade, sem Firebase (sem login e sem limite).
// Uso: npm run dev  →  no app, .env.local com VITE_API_URL=http://localhost:3100
import { createServer } from 'node:http'
import { criarReceita, IA, MODELO } from './receita.js'

const PORTA = 3100
let usadas = 0

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'OPTIONS') return res.end()
  const uso = () => ({ usadas, limite: 20, pro: false, renovaEm: '2099-01-01' })
  try {
    if (req.url === '/uso') return res.end(JSON.stringify(uso()))
    if (req.url === '/receita' && req.method === 'POST') {
      let corpo = ''
      for await (const parte of req) corpo += parte
      const inicio = Date.now()
      const { receita, uso: tokens } = await criarReceita(JSON.parse(corpo || '{}'))
      usadas++
      console.log(`${receita.titulo} · foto ${receita.foto.id || 'ambiente'} · ${tokens.modelo || MODELO} · ${((Date.now() - inicio) / 1000).toFixed(1)} s`)
      return res.end(JSON.stringify({ receita, uso: uso() }))
    }
    res.statusCode = 404; res.end(JSON.stringify({ codigo: 'rota', mensagem: 'Endereço não encontrado.' }))
  } catch (e) {
    console.error(e.message)
    res.statusCode = e.status && e.status < 500 ? e.status : 500
    res.end(JSON.stringify({ codigo: e.codigo || 'erro', mensagem: e.codigo ? e.message : 'Não deu para criar a receita agora. Tente de novo em instantes.' }))
  }
}).listen(PORTA, () => console.log(`QChef dev: http://localhost:${PORTA} (${IA}, ${MODELO})`))
