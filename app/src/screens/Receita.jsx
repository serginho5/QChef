import { useState } from 'react'
import { Icone, Voltar, toast, minutos } from '../components/ui.jsx'
import { useEstado, ehFavorita, alternarFavorita, getEstado } from '../lib/store.js'
import { navegar, voltar, useRota } from '../lib/rota.js'
import { lerPedido, salvarPedido } from '../lib/pedido.js'
import { urlFoto, fotoAmbiente, existeFoto } from '../lib/fotos.js'
import { nomeAmbiente, artigoAmbiente, AMBIENTES } from '../data/opcoes.js'

// Procura a receita: a recém-criada, uma favorita ou uma já feita (#/receita?id=...)
export function useReceita() {
  const { q } = useRota()
  const id = q.get('id')
  return useEstado((s) => {
    if (!id) return s.receitaAtual
    return s.favoritas.find((r) => r.id === id) || s.feitas.find((f) => f.receita.id === id)?.receita || (s.receitaAtual?.id === id ? s.receitaAtual : null)
  })
}

export function FotoReceita({ receita, acoes }) {
  const temPrato = receita.foto?.id && existeFoto(receita.foto.id) && receita.foto.tipo !== 'ambiente'
  if (temPrato) {
    return (
      <div className="hero">
        <div className="fundo" />
        <div className="acoes">{acoes}</div>
        <div className="foto">
          <img src={urlFoto(receita.foto.id)} alt={receita.titulo} />
          <span className="selo-foto">{receita.foto.tipo === 'parecida' ? 'Sugestão de apresentação' : 'Imagem ilustrativa'}</span>
        </div>
      </div>
    )
  }
  const amb = fotoAmbiente(receita.ambiente, receita.id)
  const icone = AMBIENTES.find((a) => a.id === receita.ambiente)?.icone || 'talheres'
  return (
    <div className="hero-amb">
      {amb && <img src={urlFoto(amb)} alt="" />}
      <div className="veu" />
      <div className="acoes">{acoes}</div>
      <div className="texto"><small><Icone nome={icone} />RECEITA EXCLUSIVA</small><b>Criada e desenvolvida para {artigoAmbiente[receita.ambiente] || 'você'}</b></div>
    </div>
  )
}

export default function Receita() {
  const receita = useReceita()
  const favorita = useEstado((s) => receita ? ehFavorita(s, receita.id) : false)
  const [aba, setAba] = useState('ingredientes')
  if (!receita) return <div className="tela sem-nav"><div className="vazio"><Icone nome="livro" /><h3>Receita não encontrada</h3><button className="btn" style={{ marginTop: 18 }} onClick={() => navegar('/inicio')}>Criar uma receita</button></div></div>

  const recemCriada = getEstado().receitaAtual?.id === receita.id
  function outra() {
    const p = lerPedido()
    if (!p) { navegar('/inicio'); return }
    // "evitar" leva os títulos já sugeridos para a IA trazer um prato diferente
    salvarPedido({ ...p, variacao: (p.variacao || 0) + 1, evitar: [...(p.evitar || []), receita.titulo].slice(-5) })
    navegar('/gerando')
  }
  const fav = () => { alternarFavorita(receita); toast(favorita ? 'Removida das favoritas' : 'Salva nas favoritas') }
  const acoes = (
    <>
      <Voltar onClick={() => voltar('/inicio')} />
      <button className="redondo" style={{ color: 'var(--laranja)' }} onClick={fav} aria-label={favorita ? 'Remover das favoritas' : 'Salvar nas favoritas'} aria-pressed={favorita}>
        <Icone nome="coracao" style={favorita ? { fill: 'currentColor' } : undefined} />
      </button>
    </>
  )

  return (
    <div className="tela sem-nav" style={{ paddingBottom: 120 }}>
      <FotoReceita receita={receita} acoes={acoes} />
      <div className="pad titulo-receita" style={{ marginTop: receita.foto?.tipo && receita.foto.tipo !== 'ambiente' ? -18 : 16 }}>
        <div className="selos">
          <span className="selo amb-selo"><Icone nome={AMBIENTES.find((a) => a.id === receita.ambiente)?.icone || 'talheres'} />{nomeAmbiente(receita.ambiente)}</span>
          <span className="selo"><Icone nome="relogio" />{receita.tempoMin} min</span>
          <span className="selo"><Icone nome="pessoas" />{receita.porcoes} {receita.porcoes > 1 ? 'porções' : 'porção'}</span>
          <span className="selo"><Icone nome="chama" />{receita.dificuldade}</span>
        </div>
        <h1>{receita.titulo}</h1>
        <p>{receita.descricao}</p>
        {receita.aviso && <div className="aviso-receita"><Icone nome="lampada" /><div>{receita.aviso}</div></div>}
        {receita.exemplo && <p className="mini" style={{ marginTop: 8 }}>Receita de exemplo (modo demonstração). No app publicado, a IA cria a receita.</p>}

        <div className="abas" role="tablist">
          <button role="tab" aria-selected={aba === 'ingredientes'} className={aba === 'ingredientes' ? 'ativo' : ''} onClick={() => setAba('ingredientes')}>Ingredientes</button>
          <button role="tab" aria-selected={aba === 'preparo'} className={aba === 'preparo' ? 'ativo' : ''} onClick={() => setAba('preparo')}>Modo de preparo</button>
        </div>

        {aba === 'ingredientes' ? (
          <div className="ingredientes">
            {receita.ingredientes.map((i, n) => (
              <div className="ing" key={n}>
                <span className={'marca' + (i.tenho && !i.despensa ? '' : ' vazia')}>{i.tenho && !i.despensa && <Icone nome="check" espessura={3} />}</span>
                {i.nome}
                <span className={'q' + (i.despensa || !i.tenho ? ' cinza' : '')}>{i.despensa ? 'despensa' : i.quantidade}{!i.tenho && !i.despensa ? ' · comprar' : ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="passos">
            {receita.passos.map((p, n) => (
              <div className="passo" key={n}>
                <span className="n">{n + 1}</span>
                <div><p>{p.texto}</p>{p.timerSeg > 0 && <span className="tempo"><Icone nome="relogio" />{minutos(p.timerSeg)} · cronômetro automático</span>}</div>
              </div>
            ))}
            <button className="btn sec" style={{ marginTop: 6 }} onClick={() => navegar('/fiz' + (recemCriada ? '' : '?id=' + encodeURIComponent(receita.id)))}><Icone nome="trofeu" tam={20} />Fiz essa receita!</button>
          </div>
        )}
      </div>

      <div className="rodape-acoes">
        {recemCriada && <button className="btn sec" onClick={outra} aria-label="Gerar outra receita com os mesmos ingredientes" title="Outra receita"><Icone nome="outra" tam={22} /></button>}
        <button className="btn" onClick={() => navegar('/cozinhar' + (recemCriada ? '' : '?id=' + encodeURIComponent(receita.id)))}><Icone nome="play" tam={18} />Começar a cozinhar</button>
      </div>
    </div>
  )
}
