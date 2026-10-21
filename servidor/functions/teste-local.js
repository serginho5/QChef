// Testa a geração de receitas direto no computador, sem Firebase.
// Uso: coloque ANTHROPIC_API_KEY=... no arquivo .env.local desta pasta e rode `npm run teste`
import { criarReceita, IA, MODELO } from './receita.js'

const perfil = { alergias: [], restricoes: [], aparelhos: ['fogao', 'forno', 'airfryer', 'microondas'], porcoes: 2, despensaBasica: true }
const args = process.argv.slice(2)
const casos = args.length
  ? [{ ingredientes: args, ambiente: 'tantofaz', filtros: [] }]
  : [
      { ingredientes: ['Cenoura', 'Farinha de trigo', 'Fermento'], ambiente: 'tantofaz', filtros: [] },
      { ingredientes: ['Cenoura', 'Farinha de trigo', 'Fermento'], ambiente: 'fogao', filtros: [] },
      { ingredientes: ['Ovo', 'Tomate', 'Queijo'], ambiente: 'fogao', filtros: ['pressa'] },
      { ingredientes: ['Frango', 'Batata'], ambiente: 'airfryer', filtros: [] },
      { ingredientes: ['Banana', 'Aveia', 'Leite'], ambiente: 'microondas', filtros: [] },
      { ingredientes: ['Macarrão', 'Queijo', 'Leite'], ambiente: 'fogao', filtros: [], perfil: { ...perfil, alergias: ['Lactose'] } },
    ]

console.log('IA:', IA, MODELO)
for (const c of casos) {
  const t = Date.now()
  const { receita: r, uso } = await criarReceita({ perfil, ...c })
  console.log(`\n=== ${c.ingredientes.join(' + ')} · ${c.ambiente}${c.filtros.length ? ' · ' + c.filtros : ''}${c.perfil ? ' · alergia ' + c.perfil.alergias : ''}`)
  console.log(`${r.titulo}  [${r.ambiente}, ${r.tempoMin} min, ${r.dificuldade}]  foto: ${r.foto.id || '(ambiente)'} (${r.foto.tipo})`)
  console.log(r.descricao)
  if (r.aviso) console.log('aviso:', r.aviso)
  console.log('ingredientes:', r.ingredientes.map((i) => `${i.nome} ${i.quantidade}${i.despensa ? ' [desp]' : ''}${!i.tenho ? ' [comprar]' : ''}`).join('; '))
  r.passos.forEach((p, i) => console.log(` ${i + 1}. ${p.texto}${p.timerSeg ? ` (${Math.round(p.timerSeg / 60)} min)` : ''}${p.fogo ? ' fogo ' + p.fogo : ''}${p.temperaturaC ? ' ' + p.temperaturaC + '°C' : ''}${p.potenciaPct ? ' ' + p.potenciaPct + '%' : ''}${p.avisoMeio ? ' — meio: ' + p.avisoMeio : ''}`))
  console.log(`(${uso.modelo ? uso.modelo + ", " : ""}${((Date.now() - t) / 1000).toFixed(1)} s, entrada ${uso.input_tokens} + cache ${uso.cache_read_input_tokens || 0}, saída ${uso.output_tokens})`)
}
