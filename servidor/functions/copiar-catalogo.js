// Copia o catálogo de fotos do app para o servidor (roda antes do deploy e do teste local).
// Só os pratos entram: a IA escolhe a foto pelo prato; foto de ambiente o app resolve sozinho.
import { readFileSync, writeFileSync } from 'node:fs'

const origem = new URL('../../app/src/data/fotos.json', import.meta.url)
const fotos = JSON.parse(readFileSync(origem, 'utf8'))
const pratos = fotos.filter((f) => f.tipo === 'prato').map(({ id, nome, ambiente, etiquetas }) => ({ id, nome, ambiente, etiquetas }))
writeFileSync(new URL('./catalogo.json', import.meta.url), JSON.stringify(pratos, null, 1))
console.log(`catalogo.json: ${pratos.length} pratos`)
