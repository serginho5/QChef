// Gera a receita com IA (Gemini ou Claude) e escolhe a foto do catálogo. Devolve o formato que o app já usa
// (app/src/lib/exemplo.js mostra o mesmo formato no modo demonstração).
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import CATALOGO from './catalogo.json' with { type: 'json' }

// Funciona no Node (Firebase Functions, teste local) e no Cloudflare Workers: lá as chaves chegam por configurar(env).
// QCHEF_IA escolhe a IA: "gemini" (cota gratuita do Google) ou "claude". Sem ela, usa a que tiver chave.
// A chave do Gemini é QCHEF_GEMINI_KEY (nome próprio para não confundir com outra GEMINI_API_KEY do computador)
let CHAVE_GEMINI, CHAVE_CLAUDE
export let IA, MODELO
export function configurar(env = {}) {
  CHAVE_GEMINI = env.QCHEF_GEMINI_KEY || env.GEMINI_API_KEY
  CHAVE_CLAUDE = env.ANTHROPIC_API_KEY
  IA = env.QCHEF_IA || (CHAVE_GEMINI ? 'gemini' : 'claude')
  MODELO = env.QCHEF_MODELO || (IA === 'gemini' ? 'gemini-3.8-flash' : 'claude-haiku-5-5')
  claude = gemini = undefined
}
const POR_ID = Object.fromEntries(CATALOGO.map((f) => [f.id, f]))

const AMBIENTES = ['frio', 'fogao', 'forno', 'airfryer', 'microondas']
const NOME_AMBIENTE = { frio: 'prato frio (sem fogo)', fogao: 'fogão', forno: 'forno', airfryer: 'airfryer', microondas: 'micro-ondas' }

const Receita = z.object({
  titulo: z.string(),
  descricao: z.string(),
  ambiente: z.enum(AMBIENTES),
  tempoMin: z.number().int(),
  porcoes: z.number().int(),
  dificuldade: z.enum(['Fácil', 'Médio', 'Difícil']),
  ingredientes: z.array(z.object({
    nome: z.string(),
    quantidade: z.string(),
    tenho: z.boolean(),
    despensa: z.boolean(),
  })),
  passos: z.array(z.object({
    texto: z.string(),
    timerSeg: z.number().int(),
    fogo: z.enum(['', 'baixo', 'medio', 'alto']),
    temperaturaC: z.number().int(),
    potenciaPct: z.number().int(),
    avisoMeio: z.string(),
  })),
  fotoId: z.string(),
  fotoTipo: z.enum(['prato', 'parecida', 'ambiente']),
  aviso: z.string(),
})

const LISTA_FOTOS = CATALOGO.map((f) => `${f.id} | ${f.nome} | ${NOME_AMBIENTE[f.ambiente]}`).join('\n')

const SISTEMA = `Você é o chef do QChef, um app brasileiro que transforma o que a pessoa tem em casa numa receita caseira, gostosa e que dá certo de primeira. Quem usa é gente comum cozinhando no dia a dia, muitas vezes iniciante.

Como pensar a receita:
- Primeiro descubra qual prato conhecido os ingredientes sugerem juntos. Cenoura + farinha de trigo + fermento é bolo de cenoura; ovo + tomate + cebola pode ser omelete ou shakshuka; arroz + frango é galinhada ou risoto. Prefira pratos reais da cozinha brasileira do dia a dia a combinações inventadas. O título é o nome do prato ("Bolo de cenoura fofinho"), nunca "ingrediente + jeito de preparo".
- Use os ingredientes informados como base. Não é obrigatório usar todos se algum não combina; nesse caso diga no aviso qual ficou de fora e por quê.
- Se a despensa básica estiver ativa, sal, óleo, azeite, alho, cebola, açúcar, pimenta-do-reino e água já contam como disponíveis (marque despensa: true).
- Se o prato óbvio precisar de algo que a pessoa não citou e não é despensa (ex.: ovos e açúcar no bolo quando a despensa está desligada), você pode incluir até 3 desses itens com tenho: false, mas só se forem comuns e fizerem a receita dar certo. Avise isso no campo aviso em uma frase. Se dá para fazer algo bom sem comprar nada, prefira isso.
- Ingredientes informados pela pessoa: tenho: true, despensa: false. Quantidades em medidas caseiras (xícara, colher de sopa, unidade, gramas quando fizer sentido), ajustadas ao número de porções.
- Alergias e restrições são obrigatórias: nenhum ingrediente proibido, nem como opcional. Se um ingrediente informado viola uma restrição, deixe-o de fora e avise.
- Se o que foi informado não é comida ou não dá para cozinhar nada seguro, monte a melhor receita simples possível com o que é comestível e explique no aviso.

Aparelho (campo ambiente):
- Use exatamente o aparelho pedido. Se for "tanto faz", escolha o que deixa o prato melhor entre os aparelhos que a pessoa tem (ou prato frio).
- Bolo pedido no fogão vira bolo de frigideira/panela; no micro-ondas, bolo de caneca; na airfryer, bolo em forminha. Adapte o prato ao aparelho em vez de trocar o aparelho.

Passos:
- Entre 3 e 8 passos curtos, um verbo de ação por passo, na ordem real de execução, linguagem simples.
- timerSeg: segundos que o passo leva no fogo/forno/aparelho ou de descanso/geladeira; 0 quando é só preparo à mão.
- fogo: "baixo", "medio" ou "alto" nos passos que vão ao fogão; "" nos demais.
- temperaturaC: temperatura nos passos de forno ou airfryer (ex.: 180); 0 nos demais.
- potenciaPct: potência nos passos de micro-ondas (ex.: 70 ou 100); 0 nos demais.
- avisoMeio: lembrete curto para tocar na metade do cronômetro quando faz sentido ("Vire os pedaços", "Chacoalhe o cesto", "Mexa"); "" quando não precisa.
- Tempos e temperaturas realistas: o prato tem que ficar cozido e seguro (frango e ovo bem cozidos).
- tempoMin: tempo total real, somando preparo e cozimento.

Filtros:
- "pressa": tempo total de até 15 minutos; se o prato não cabe nisso, escolha outro que caiba.
- "economico": evite itens para comprar e aproveite tudo que a pessoa tem.
- "criativo": pode fugir do óbvio com um toque diferente, mas continua sendo comida caseira que dá certo.

Foto (fotoId e fotoTipo) — escolha só no catálogo abaixo, pelo PRATO, não por ingrediente solto:
- fotoTipo "prato": a receita é o mesmo prato da foto (bolo de cenoura → bolo-cenoura).
- fotoTipo "parecida": o prato é outro, mas a foto representaria bem como ele fica servido (ex.: omelete de legumes → omelete-queijo-tomate). Não use quando só um ingrediente coincide.
- fotoTipo "ambiente" e fotoId "": quando nenhuma foto representa bem o prato. Na dúvida, prefira "ambiente": uma foto errada é pior que nenhuma.

Catálogo de fotos (id | prato | aparelho):
${LISTA_FOTOS}

Textos:
- Português do Brasil, tom caloroso e direto. descricao: 1 ou 2 frases dizendo por que vale a pena.
- aviso: "" quando não há nada importante a avisar.`

let claude, gemini
configurar(globalThis.process?.env)

async function perguntarClaude(texto) {
  const r = await (claude ??= new Anthropic({ apiKey: CHAVE_CLAUDE })).messages.parse({
    model: MODELO,
    max_tokens: 16000,
    output_config: { effort: 'low', format: zodOutputFormat(Receita) },
    system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: texto }],
  })
  return { dados: r.stop_reason === 'refusal' ? null : r.parsed_output, uso: r.usage }
}

// Velocidade: o Gemini 3 pensa em nível alto por padrão (receitas de 40 s a 2 min); em "low" sai em ~7 s
// com a mesma qualidade. Cada tentativa tem tempo máximo; se estourar, sobrecarregar (503) ou bater
// no limite (429), passa para o modelo reserva. Modelos "lite" aceitam pensar no mínimo.
const RESERVAS_GEMINI = ['gemini-3.7-flash', 'gemini-3.5-flash-lite']
const TEMPO_TENTATIVA = [22000, 15000, 15000]
async function perguntarGemini(texto) {
  gemini ??= new GoogleGenAI({ apiKey: CHAVE_GEMINI })
  let r, ultimoErro
  const modelos = [MODELO, ...RESERVAS_GEMINI.filter((m) => m !== MODELO)]
  for (const [n, model] of modelos.entries()) {
    try {
      r = await gemini.models.generateContent({
        model,
        contents: texto,
        config: {
          systemInstruction: SISTEMA,
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(Receita),
          thinkingConfig: { thinkingLevel: model.includes('lite') ? 'minimal' : 'low' },
          abortSignal: AbortSignal.timeout(TEMPO_TENTATIVA[n] ?? 15000),
        },
      })
      r.modelo = model
      break
    } catch (e) {
      const demorou = e.name === 'TimeoutError' || e.name === 'AbortError'
      if (!demorou && ![429, 500, 503].includes(e.status)) throw e
      console.warn(`gemini ${model}: ${demorou ? 'demorou demais' : e.status}, tentando o próximo`)
      ultimoErro = e
    }
  }
  if (!r) {
    const e = new Error('A IA está ocupada agora. Tente de novo em instantes.')
    e.codigo = 'ia-ocupada'; e.status = 503; e.causa = ultimoErro
    throw e
  }
  const u = r.usageMetadata || {}
  let dados = null
  try { dados = Receita.parse(JSON.parse(r.text)) } catch { /* resposta fora do formato: tratada como recusa */ }
  return { dados, uso: { modelo: r.modelo, input_tokens: u.promptTokenCount || 0, output_tokens: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) } }
}

// pedido: { ingredientes, ambiente, filtros, perfil, variacao, evitar }
export async function criarReceita(pedido) {
  const p = limpar(pedido)
  const linhas = [
    `Ingredientes que tenho: ${p.ingredientes.join(', ')}`,
    `Aparelho: ${p.ambiente === 'tantofaz' ? `tanto faz (tenho: ${p.aparelhos.map((a) => NOME_AMBIENTE[a]).join(', ')}, ou prato frio)` : NOME_AMBIENTE[p.ambiente]}`,
    `Porções: ${p.porcoes}`,
    `Despensa básica: ${p.despensaBasica ? 'ativa' : 'desligada'}`,
    `Filtros: ${p.filtros.length ? p.filtros.join(', ') : 'nenhum'}`,
    `Alergias: ${p.alergias.length ? p.alergias.join(', ') : 'nenhuma'}`,
    `Restrições: ${p.restricoes.length ? p.restricoes.join(', ') : 'nenhuma'}`,
  ]
  if (p.evitar.length) linhas.push(`Já sugeri estas e a pessoa pediu outra opção (faça um prato diferente): ${p.evitar.join('; ')}`)

  const { dados, uso } = await (IA === 'gemini' ? perguntarGemini : perguntarClaude)(linhas.join('\n'))
  if (!dados) {
    const e = new Error('A IA não conseguiu montar essa receita. Tente trocar algum ingrediente.')
    e.codigo = 'recusa'
    throw e
  }
  return { receita: montar(dados, p), uso }
}

function montar(r, p) {
  const ambiente = p.ambiente !== 'tantofaz' ? p.ambiente : r.ambiente
  const foto = r.fotoTipo !== 'ambiente' && POR_ID[r.fotoId] ? { id: r.fotoId, tipo: r.fotoTipo } : { id: null, tipo: 'ambiente' }
  return {
    id: 'r-' + crypto.randomUUID().slice(0, 8),
    titulo: r.titulo,
    descricao: r.descricao,
    ambiente,
    tempoMin: Math.max(1, r.tempoMin),
    porcoes: Math.max(1, r.porcoes),
    dificuldade: r.dificuldade,
    ingredientes: r.ingredientes,
    passos: r.passos.map((s) => ({
      ...s,
      timerSeg: Math.max(0, Math.min(s.timerSeg, 6 * 3600)),
      temperaturaC: Math.max(0, Math.min(s.temperaturaC, 300)),
      potenciaPct: Math.max(0, Math.min(s.potenciaPct, 100)),
    })),
    foto,
    aviso: r.aviso,
  }
}

// O pedido vem do aparelho: confere tipos e tamanhos antes de mandar para a IA
const lista = (v, max, tam = 40) => (Array.isArray(v) ? v : []).filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, tam)).filter(Boolean).slice(0, max)
function limpar(b = {}) {
  const perfil = b.perfil || {}
  const ingredientes = lista(b.ingredientes, 20)
  if (!ingredientes.length) {
    const e = new Error('Adicione pelo menos um ingrediente.'); e.codigo = 'pedido'; e.status = 400; throw e
  }
  const aparelhos = lista(perfil.aparelhos, 6).filter((a) => AMBIENTES.includes(a))
  return {
    ingredientes,
    ambiente: AMBIENTES.includes(b.ambiente) ? b.ambiente : 'tantofaz',
    filtros: lista(b.filtros, 3).filter((f) => ['pressa', 'economico', 'criativo'].includes(f)),
    alergias: lista(perfil.alergias, 10),
    restricoes: lista(perfil.restricoes, 10),
    aparelhos: aparelhos.length ? aparelhos : ['fogao'],
    porcoes: Math.min(Math.max(parseInt(perfil.porcoes) || 2, 1), 12),
    despensaBasica: perfil.despensaBasica !== false,
    evitar: lista(b.evitar, 5, 80),
  }
}
