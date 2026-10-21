// Receitas sem IA (modo demonstração e plano B): escolhe no livro de receitas (data/livro.js)
// o prato que mais aproveita os ingredientes da pessoa, respeitando aparelho, alergias e restrições.
import { LIVRO } from '../data/livro.js'

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/-/g, ' ').trim()
const singular = (s) => s.replace(/(oes|aes)$/, 'ao').replace(/s$/, '')

// Palavras que cada alergia/restrição proíbe (comparadas com as chaves dos ingredientes)
const PROIBIDOS = {
  Lactose: ['queijo', 'leite', 'creme', 'manteiga', 'requeijao', 'iogurte', 'condensado', 'mucarela'],
  'Glúten': ['farinha', 'trigo', 'pao', 'macarrao', 'massa', 'rosca', 'lasanha', 'pastel', 'wrap', 'quibe', 'granola', 'aveia'],
  Amendoim: ['amendoim'],
  Ovo: ['ovo'],
  'Frutos do mar': ['camarao', 'marisco', 'lula'],
  Soja: ['shoyu', 'soja'],
  Castanhas: ['castanha', 'nozes', 'amendoa'],
  Vegetariano: ['frango', 'carne', 'peixe', 'linguica', 'presunto', 'bacon', 'calabresa', 'asa', 'bife', 'tilapia', 'merluza', 'pescada'],
  Vegano: ['frango', 'carne', 'peixe', 'linguica', 'presunto', 'bacon', 'calabresa', 'asa', 'bife', 'ovo', 'queijo', 'leite', 'creme', 'manteiga', 'requeijao', 'iogurte', 'condensado', 'mel', 'maionese', 'tilapia', 'merluza', 'pescada'],
  'Low carb': ['arroz', 'macarrao', 'massa', 'farinha', 'pao', 'batata', 'acucar', 'cuscuz', 'tapioca', 'polvilho'],
  'Sem açúcar': ['acucar', 'condensado', 'chocolate', 'mel'],
  'Sem carne de porco': ['linguica', 'presunto', 'bacon', 'calabresa'],
}

// Expande o formato compacto do livro
function abrir([id, titulo, ambiente, tempoMin, dificuldade, descricao, ings, passos]) {
  return {
    id, titulo, ambiente, tempoMin, dificuldade, descricao,
    ingredientes: ings.map((s) => {
      const [nome, quantidade, chaves] = s.split('|')
      const opcional = chaves.endsWith('?')
      return { nome, quantidade, despensa: chaves === '*', opcional, chaves: chaves === '*' ? [] : chaves.replace(/\?$/, '').split('/').map(norm) }
    }),
    passos: passos.map((p) => {
      const [texto, timerSeg = 0, o = {}] = typeof p === 'string' ? [p] : p
      return { texto, timerSeg, fogo: o.f || '', temperaturaC: o.c || 0, potenciaPct: o.w || 0, avisoMeio: o.m || '' }
    }),
  }
}
const RECEITAS = LIVRO.map(abrir)

// "farinha de trigo" casa com a chave "farinha"; "leite" não casa com "leite condensado"
const casa = (chaves, item) => chaves.some((c) => item.includes(c) || singular(item) === singular(c))

function pontuar(r, tenho) {
  const principais = r.ingredientes.filter((i) => !i.despensa && !i.opcional)
  const usados = new Set()
  let acertos = 0
  for (const i of r.ingredientes) {
    if (i.despensa) continue
    const achou = tenho.filter((t) => casa(i.chaves, t))
    achou.forEach((t) => usados.add(t))
    if (achou.length) acertos += i.opcional ? 1 : 3
  }
  const faltam = principais.filter((i) => !tenho.some((t) => casa(i.chaves, t))).length
  const sobram = tenho.length - usados.size
  return { pontos: acertos - faltam * 1.5 - sobram * 1, acertos, faltam }
}

export function receitaExemplo({ ingredientes, ambiente, filtros = [], perfil = {}, variacao = 0, evitar = [] }) {
  const tenho = ingredientes.map((i) => singular(norm(i)))
  const proibido = [...(perfil.alergias || []), ...(perfil.restricoes || [])].flatMap((x) => PROIBIDOS[x] || [])
  const aparelhos = ['frio', ...(perfil.aparelhos || ['fogao', 'forno', 'airfryer', 'microondas'])]

  const candidatas = RECEITAS
    .filter((r) => !r.ingredientes.some((i) => !i.opcional && i.chaves.some((c) => proibido.some((p) => c.includes(p)))))
    .filter((r) => ambiente === 'tantofaz' ? aparelhos.includes(r.ambiente) : true)
    .filter((r) => !evitar.includes(r.titulo))
    .map((r) => {
      const s = pontuar(r, tenho)
      if (ambiente !== 'tantofaz' && r.ambiente !== ambiente) s.pontos -= 6
      if (filtros.includes('pressa') && r.tempoMin > 15) s.pontos -= 3
      if (filtros.includes('economico')) s.pontos -= s.faltam
      return { r, ...s }
    })
    .filter((c) => c.acertos > 0)
    .sort((a, b) => b.pontos - a.pontos)

  const escolha = candidatas[variacao % Math.max(candidatas.length, 1)]
  if (!escolha) return null
  const r = escolha.r
  const avisos = []
  if (ambiente !== 'tantofaz' && r.ambiente !== ambiente) avisos.push(`Com esses ingredientes, o melhor prato do nosso livro é feito ${{ fogao: 'no fogão', forno: 'no forno', airfryer: 'na airfryer', microondas: 'no micro-ondas', frio: 'sem fogo' }[r.ambiente]}.`)
  const comprar = r.ingredientes.filter((i) => !i.despensa && !i.opcional && !tenho.some((t) => casa(i.chaves, t)))
  if (comprar.length) avisos.push(`Para essa receita também vai precisar de: ${comprar.map((i) => i.nome.toLowerCase()).join(', ')}.`)

  return {
    id: 'ex-' + r.id + '-' + variacao,
    titulo: r.titulo,
    descricao: r.descricao,
    ambiente: r.ambiente,
    tempoMin: r.tempoMin,
    porcoes: 2,
    dificuldade: r.dificuldade,
    ingredientes: r.ingredientes.filter((i) => !i.chaves.some((c) => proibido.some((p) => c.includes(p)))).map((i) => {
      const tem = i.despensa || tenho.some((t) => casa(i.chaves, t))
      return { nome: i.nome, quantidade: !tem && i.opcional ? i.quantidade + ' (opcional)' : i.quantidade, tenho: tem, despensa: i.despensa }
    }),
    passos: r.passos,
    foto: { id: r.id, tipo: 'prato' },
    aviso: avisos.join(' '),
    exemplo: true,
  }
}
