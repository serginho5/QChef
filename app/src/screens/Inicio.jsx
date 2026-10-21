import { useEffect, useMemo, useState } from 'react'
import { Icone, toast } from '../components/ui.jsx'
import { BannerInstalar } from '../components/Instalar.jsx'
import { useEstado, contarAtalhos, getEstado } from '../lib/store.js'
import { navegar } from '../lib/rota.js'
import { salvarPedido, lerPedido } from '../lib/pedido.js'
import { consultarUso } from '../lib/api.js'
import { ATALHOS, AMBIENTES, FILTROS } from '../data/opcoes.js'

const capitalizar = (s) => s.trim().replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase())

export default function Inicio({ usuario }) {
  const perfil = useEstado((s) => s.perfil)
  const atalhosUso = useEstado((s) => s.atalhosUso)
  const anterior = lerPedido()
  const [ingredientes, setIngredientes] = useState(anterior?.ingredientes || [])
  const [texto, setTexto] = useState('')
  const [ambiente, setAmbiente] = useState(anterior?.ambiente || null)
  const [filtros, setFiltros] = useState(anterior?.filtros || [])
  const [uso, setUso] = useState(null)
  const [ouvindo, setOuvindo] = useState(false)

  useEffect(() => { consultarUso().then(setUso).catch(() => {}) }, [])

  // Atalhos que aprendem: os mais usados por esta pessoa vêm primeiro
  const atalhos = useMemo(() => {
    const extras = Object.keys(atalhosUso).filter((a) => !ATALHOS.includes(a))
    return [...ATALHOS, ...extras].sort((a, b) => (atalhosUso[b] || 0) - (atalhosUso[a] || 0)).slice(0, 12)
  }, [atalhosUso])

  // Só aparecem os ambientes que a pessoa tem em casa (prato frio e "tanto faz" sempre)
  const ambientes = AMBIENTES.filter((a) => a.id === 'frio' || a.id === 'tantofaz' || perfil.aparelhos.includes(a.id))

  function adicionar(lista) {
    const novos = lista.map(capitalizar).filter((i) => i && !ingredientes.some((x) => x.toLowerCase() === i.toLowerCase()))
    if (novos.length) setIngredientes([...ingredientes, ...novos])
  }
  function enviarTexto(e) {
    e?.preventDefault()
    if (!texto.trim()) return
    adicionar(texto.split(/,|;|\se\s/))
    setTexto('')
  }
  const alternar = (i) => ingredientes.some((x) => x.toLowerCase() === i.toLowerCase())
    ? setIngredientes(ingredientes.filter((x) => x.toLowerCase() !== i.toLowerCase()))
    : adicionar([i])
  const alternarFiltro = (f) => setFiltros(filtros.includes(f) ? filtros.filter((x) => x !== f) : [...filtros, f])

  // Ditado por voz (quando o navegador permite)
  function ouvir() {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!R) { toast('Seu navegador não permite ditar. Digite os ingredientes.'); return }
    const r = new R(); r.lang = 'pt-BR'; r.interimResults = false
    r.onresult = (e) => { adicionar(e.results[0][0].transcript.split(/,|\se\s/)); setOuvindo(false) }
    r.onerror = r.onend = () => setOuvindo(false)
    setOuvindo(true); r.start()
  }

  function criar() {
    if (texto.trim()) enviarTexto()
    const lista = texto.trim() ? [...ingredientes, ...texto.split(/,|;|\se\s/).map(capitalizar).filter(Boolean)] : ingredientes
    if (!lista.length) { toast('Adicione pelo menos um ingrediente'); return }
    if (!ambiente) { toast('Escolha onde vai preparar'); return }
    if (uso && uso.usadas >= uso.limite) { navegar('/limite'); return }
    contarAtalhos(lista)
    const p = getEstado().perfil
    salvarPedido({ ingredientes: lista, ambiente, filtros, variacao: 0, perfil: { alergias: p.alergias, restricoes: p.restricoes, aparelhos: p.aparelhos, porcoes: p.porcoes, despensaBasica: p.despensaBasica } })
    navegar('/gerando')
  }

  const primeiroNome = (usuario?.nome || '').split(' ')[0]
  return (
    <div className="tela">
      <div className="topo">
        <div className="saudacao">
          <div className="avatar">{usuario?.foto ? <img src={usuario.foto} alt="" referrerPolicy="no-referrer" /> : (primeiroNome || 'Q')[0]}</div>
          <div><h1>Oi{primeiroNome ? ', ' + primeiroNome : ''}!</h1><p>Vamos cozinhar com o que você tem?</p></div>
        </div>
        <div className="busca">
          <label className="pergunta" htmlFor="ingrediente">O que tem na sua geladeira hoje?</label>
          <form className="campo" onSubmit={enviarTexto}>
            <Icone nome="busca" />
            <input id="ingrediente" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={ouvindo ? 'Ouvindo…' : 'Digite ou fale os ingredientes'} autoComplete="off" enterKeyHint="done" />
            <button type="button" onClick={ouvir} aria-label="Ditar ingredientes"><Icone nome="mic" tam={20} /></button>
          </form>
          {ingredientes.length > 0 && (
            <div className="selecionados">
              {ingredientes.map((i) => (
                <button key={i} className="chip-sel" onClick={() => alternar(i)} aria-label={'Remover ' + i}>{i}<Icone nome="x" espessura={3} /></button>
              ))}
            </div>
          )}
        </div>
      </div>

      <BannerInstalar />

      <div className="pad">
        <div className="secao"><h2>Toque para adicionar</h2>{perfil.despensaBasica && <span className="mini">Sal, óleo e alho já contam</span>}</div>
        <div className="chips">
          {atalhos.map((a) => {
            const on = ingredientes.some((x) => x.toLowerCase() === a.toLowerCase())
            return <button key={a} className={'chip' + (on ? ' ativo' : '')} onClick={() => alternar(a)} aria-pressed={on}><Icone nome={on ? 'check' : 'mais'} espessura={on ? 3 : 2.6} />{a}</button>
          })}
        </div>

        <div className="secao"><h2>Onde vai preparar?</h2></div>
        <div className="ambientes" role="radiogroup" aria-label="Onde vai preparar">
          {ambientes.map((a) => (
            <button key={a.id} role="radio" aria-checked={ambiente === a.id} className={'amb' + (ambiente === a.id ? ' ativo' : '')} onClick={() => setAmbiente(a.id)}>
              <Icone nome={a.icone} espessura={1.8} />{a.nome}
            </button>
          ))}
        </div>

        <div className="secao"><h2>Do seu jeito</h2></div>
        <div className="filtros">
          {FILTROS.map((f) => (
            <button key={f.id} className={'filtro' + (filtros.includes(f.id) ? ' ativo' : '')} onClick={() => alternarFiltro(f.id)} aria-pressed={filtros.includes(f.id)}>
              <Icone nome={f.icone} />{f.nome}
            </button>
          ))}
        </div>

        <button className="btn" style={{ marginTop: 22 }} onClick={criar}><Icone nome="brilho" tam={20} />Criar minha receita</button>
        {uso && <div className="contador-uso"><Icone nome="brilho" tam={14} cor="var(--laranja)" /><span><b>{Math.max(0, uso.limite - uso.usadas)}</b> de {uso.limite} receitas novas neste mês</span></div>}
      </div>
    </div>
  )
}
