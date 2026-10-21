// Estado do app guardado no aparelho (localStorage): perfil da cozinha, favoritas, receitas feitas.
import { useSyncExternalStore } from 'react'

const CHAVE = 'qchef:estado:v1'
const PADRAO = {
  splashVisto: false,
  perfil: {
    alergias: [],
    restricoes: [],
    aparelhos: ['fogao', 'forno', 'airfryer', 'microondas'],
    porcoes: 2,
    som: true,
    despensaBasica: true,
  },
  atalhosUso: {},          // ingrediente → vezes usado (atalhos que aprendem)
  receitaAtual: null,      // última receita gerada
  favoritas: [],           // receitas completas
  feitas: [],              // { id, receita, em, fotoId }
  instalarDispensado: false,
}

function carregar() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE))
    return s ? { ...PADRAO, ...s, perfil: { ...PADRAO.perfil, ...(s.perfil || {}) } } : structuredClone(PADRAO)
  } catch { return structuredClone(PADRAO) }
}

let estado = carregar()
const ouv = new Set()

export const getEstado = () => estado
export function atualizar(fn) {
  const novo = structuredClone(estado)
  fn(novo)
  estado = novo
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)) } catch { /* armazenamento cheio ou bloqueado */ }
  ouv.forEach((f) => f())
}
export function useEstado(sel = (s) => s) {
  return useSyncExternalStore((cb) => { ouv.add(cb); return () => ouv.delete(cb) }, () => sel(estado))
}

export const ehFavorita = (s, id) => s.favoritas.some((r) => r.id === id)
export function alternarFavorita(receita) {
  atualizar((s) => {
    const i = s.favoritas.findIndex((r) => r.id === receita.id)
    if (i >= 0) s.favoritas.splice(i, 1)
    else s.favoritas.unshift({ ...receita, favoritadaEm: Date.now() })
  })
}
export function registrarFeita(receita, fotoId = null) {
  atualizar((s) => {
    s.feitas.unshift({ id: receita.id + ':' + Date.now(), receita, em: Date.now(), fotoId })
  })
}
export function contarAtalhos(ingredientes) {
  atualizar((s) => { ingredientes.forEach((i) => { s.atalhosUso[i] = (s.atalhosUso[i] || 0) + 1 }) })
}

// Fotos dos pratos feitos ficam no IndexedDB (não cabem no localStorage)
const BANCO = 'qchef-fotos'
function abrir() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('fotos')
    r.onsuccess = () => ok(r.result)
    r.onerror = () => erro(r.error)
  })
}
export async function salvarFoto(id, blob) {
  const db = await abrir()
  await new Promise((ok, erro) => { const t = db.transaction('fotos', 'readwrite'); t.objectStore('fotos').put(blob, id); t.oncomplete = ok; t.onerror = () => erro(t.error) })
}
export async function lerFoto(id) {
  const db = await abrir()
  return new Promise((ok) => { const r = db.transaction('fotos').objectStore('fotos').get(id); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null) })
}
