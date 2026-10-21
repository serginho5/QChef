import { useEffect, useState } from 'react'
import { ICONES } from './icones.js'
import { navegar } from '../lib/rota.js'

export function Icone({ nome, tam, espessura = 2, cor, style, className = '' }) {
  return (
    <span className={'ic ' + className} style={{ width: tam, height: tam, color: cor, ...style }} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${espessura}" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome] || ''}</svg>` }} />
  )
}

export function Nav({ ativa }) {
  const itens = [
    { id: 'inicio', nome: 'Início', icone: 'casa' },
    { id: 'favoritas', nome: 'Receitas', icone: 'livro' },
    { id: 'feitas', nome: 'Feitas', icone: 'historico' },
    { id: 'perfil', nome: 'Perfil', icone: 'usuario' },
  ]
  return (
    <nav className="nav" aria-label="Navegação principal">
      {itens.map((i) => (
        <button key={i.id} className={ativa === i.id ? 'ativo' : ''} onClick={() => navegar('/' + i.id)} aria-current={ativa === i.id ? 'page' : undefined}>
          <span className="pill"><Icone nome={i.icone} /></span>{i.nome}
        </button>
      ))}
    </nav>
  )
}

// Aviso flutuante: toast('Receita salva')
const ouvToast = new Set()
export const toast = (texto) => ouvToast.forEach((f) => f(texto))
export function Toasts() {
  const [texto, setTexto] = useState(null)
  useEffect(() => {
    let t
    const f = (x) => { setTexto(x); clearTimeout(t); t = setTimeout(() => setTexto(null), 2600) }
    ouvToast.add(f)
    return () => { ouvToast.delete(f); clearTimeout(t) }
  }, [])
  return texto ? <div className="toast" role="status">{texto}</div> : null
}

export function Folha({ aberta, fechar, rotulo, children }) {
  useEffect(() => {
    if (!aberta) return
    const esc = (e) => e.key === 'Escape' && fechar?.()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberta, fechar])
  if (!aberta) return null
  return (
    <div className="folha-fundo" onClick={(e) => e.target === e.currentTarget && fechar?.()}>
      <div className="folha" role="dialog" aria-modal="true" aria-label={rotulo}>
        <div className="alca" />
        {children}
      </div>
    </div>
  )
}

export const Voltar = ({ onClick, escuro }) => (
  <button className={'redondo' + (escuro ? ' escuro' : '')} onClick={onClick} aria-label="Voltar"><Icone nome="voltar" espessura={2.4} /></button>
)

export const formatarTempo = (seg) => {
  const m = Math.floor(seg / 60), s = Math.max(0, seg % 60)
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}
export const minutos = (seg) => seg >= 60 ? `${Math.round(seg / 60)} min` : `${seg} s`
