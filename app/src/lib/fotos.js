// Banco de fotos: escolha da imagem da receita e foto de ambiente quando não há prato parecido.
import CATALOGO from '../data/fotos.json'

export const urlFoto = (id) => `fotos/${id}.webp`
const POR_ID = Object.fromEntries(CATALOGO.map((f) => [f.id, f]))
export const existeFoto = (id) => !!POR_ID[id]

// Foto de ambiente: sempre a mesma por receita (escolhida pelo id), entre as opções daquele aparelho
export function fotoAmbiente(ambiente, semente = '') {
  const lista = CATALOGO.filter((f) => f.tipo === 'ambiente' && f.ambiente === ambiente)
  if (!lista.length) return null
  let h = 0
  for (const c of semente) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return lista[h % lista.length].id
}

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Usado no modo demonstração: procura o prato do banco com mais etiquetas em comum
export function sugerirFoto(ingredientes, ambiente) {
  const ing = ingredientes.map(norm)
  let melhor = null, pontos = 0
  for (const f of CATALOGO) {
    if (f.tipo !== 'prato' || (ambiente !== 'tantofaz' && f.ambiente !== ambiente)) continue
    const p = f.etiquetas.filter((t) => ing.some((i) => i.includes(norm(t)) || norm(t).includes(i))).length
    if (p > pontos) { pontos = p; melhor = f }
  }
  // Um ingrediente só em comum não basta (cenoura ≠ bolo de cenoura): nesse caso fica a foto de ambiente
  if (melhor && pontos >= 2) return { id: melhor.id, tipo: 'parecida' }
  return null
}
