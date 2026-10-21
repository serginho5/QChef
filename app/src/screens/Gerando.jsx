import { useEffect, useState } from 'react'
import { Icone } from '../components/ui.jsx'
import { trocar, navegar } from '../lib/rota.js'
import { lerPedido } from '../lib/pedido.js'
import { gerarReceita } from '../lib/api.js'
import { atualizar } from '../lib/store.js'
import { nomeAmbienteFrase } from '../data/opcoes.js'

const ETAPAS = ['Combinando os ingredientes', 'Ajustando tempo e temperatura', 'Escrevendo o passo a passo', 'Escolhendo a foto']
// A IA leva uns 8 s: as etapas andam nesse ritmo; se passar de 15 s, a tela avisa que está quase lá
const RITMO = 2200, DEMORA = 15000

export default function Gerando() {
  const pedido = lerPedido()
  const [etapa, setEtapa] = useState(0)
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)
  const [demorando, setDemorando] = useState(false)

  useEffect(() => {
    if (!pedido) { trocar('/inicio'); return }
    let vivo = true
    setErro(null); setEtapa(0); setDemorando(false)
    const relogio = setInterval(() => setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1)), RITMO)
    const aviso = setTimeout(() => vivo && setDemorando(true), DEMORA)
    gerarReceita(pedido).then(({ receita }) => {
      if (!vivo) return
      atualizar((s) => { s.receitaAtual = receita })
      setEtapa(ETAPAS.length)
      setTimeout(() => vivo && trocar('/receita'), 350)
    }).catch((e) => {
      if (!vivo) return
      if (e.codigo === 'limite') { trocar('/limite'); return }
      setErro(e.message || 'Não deu para criar a receita agora.')
    }).finally(() => { clearInterval(relogio); clearTimeout(aviso) })
    return () => { vivo = false; clearInterval(relogio); clearTimeout(aviso) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa])

  if (!pedido) return null
  const frase = [nomeAmbienteFrase[pedido.ambiente], pedido.filtros.includes('pressa') ? 'em até 15 minutos' : ''].filter(Boolean).join(', ')
  return (
    <div className="gerando">
      <div className="logo-caixa"><img src="logo/qchef-logo-horizontal-fundo-escuro.svg" alt="QChef by Hub Bioguia" /></div>
      {!erro ? (
        <>
          <h1>Criando uma receita só sua…</h1>
          <p>Com o que você tem{frase ? ', ' + frase : ''}.</p>
          <div className="chips-g">{pedido.ingredientes.map((i) => <span key={i}>{i}</span>)}</div>
          <div className="etapas-g" aria-live="polite">
            {ETAPAS.map((t, i) => (
              <div key={t} className={i > etapa ? 'fraco' : ''}>
                {i < etapa ? <span className="ok"><Icone nome="check" espessura={3} /></span> : i === etapa ? <span className="rodando" /> : <span className="espera" />}
                {t}
              </div>
            ))}
          </div>
          {demorando && <p className="mini" style={{ marginTop: 18, opacity: 0.85 }} aria-live="polite">Está levando um pouco mais que o normal… quase lá.</p>}
        </>
      ) : (
        <>
          <h1>Ops, a receita não saiu</h1>
          <p>{erro}</p>
          <div style={{ width: '100%', marginTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn branco" onClick={() => setTentativa(tentativa + 1)}>Tentar de novo</button>
            <button className="btn vidro" onClick={() => navegar('/inicio')}>Voltar ao início</button>
          </div>
        </>
      )}
    </div>
  )
}
