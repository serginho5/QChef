// Modo cozinhando: um passo por tela, cronômetro com aviso no meio, 1 minuto antes e alarme ao zerar.
// Cada modalidade mostra o que importa: fogo (fogão), temperatura (forno/airfryer), potência (micro-ondas).
import { useEffect, useRef, useState } from 'react'
import { Icone, formatarTempo, minutos, toast } from '../components/ui.jsx'
import { useReceita } from './Receita.jsx'
import { navegar, voltar, useRota } from '../lib/rota.js'
import { useEstado, atualizar } from '../lib/store.js'
import { prepararSom, avisoCurto, tocarAlarme, pararAlarme, manterTelaAcesa, pedirNotificacoes, notificar } from '../lib/alarme.js'
import { nomeAmbiente, AMBIENTES } from '../data/opcoes.js'

const ACAO_FIM = {
  airfryer: 'Retire o cesto da airfryer agora',
  forno: 'Confira o forno agora',
  fogao: 'Confira a panela no fogão',
  microondas: 'Abra o micro-ondas',
  frio: 'Tempo concluído',
}
const FOGO = { baixo: 1, medio: 2, alto: 3 }
const NOME_FOGO = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }

function Aparelho({ ambiente, passo }) {
  if (ambiente === 'fogao' && passo.fogo) {
    return (
      <div className="aparelho"><span className="ic-box"><Icone nome="chama" espessura={1.8} /></span>
        <div><small>FOGO</small><b>{NOME_FOGO[passo.fogo]}</b></div>
        <div className="lado"><div className="chamas">{[1, 2, 3].map((n) => <Icone key={n} nome="chama" className={n <= FOGO[passo.fogo] ? 'on' : ''} />)}</div></div>
      </div>
    )
  }
  if ((ambiente === 'forno' || ambiente === 'airfryer') && passo.temperaturaC > 0) {
    return (
      <div className="aparelho"><span className="ic-box"><Icone nome={ambiente} espessura={1.8} /></span>
        <div><small>TEMPERATURA</small><b>{passo.temperaturaC} °C</b></div>
        {passo.timerSeg > 0 && <div className="lado"><small>TEMPO</small><b style={{ fontSize: 15 }}>{minutos(passo.timerSeg)}</b></div>}
      </div>
    )
  }
  if (ambiente === 'microondas' && passo.potenciaPct > 0) {
    return (
      <div className="aparelho"><span className="ic-box"><Icone nome="microondas" espessura={1.8} /></span>
        <div><small>POTÊNCIA</small><b>{passo.potenciaPct}%</b><div className="potencia"><span style={{ width: passo.potenciaPct + '%' }} /></div></div>
      </div>
    )
  }
  return null
}

export default function Cozinhando() {
  const receita = useReceita()
  const { q } = useRota()
  const som = useEstado((s) => s.perfil.som)
  const [i, setI] = useState(0)
  const [fim, setFim] = useState(null)        // horário em que o cronômetro zera (ms)
  const [pausado, setPausado] = useState(null) // segundos restantes quando pausado
  const [agora, setAgora] = useState(Date.now())
  const [alarme, setAlarme] = useState(false)
  const avisos = useRef({})

  useEffect(() => { manterTelaAcesa(true); return () => { manterTelaAcesa(false); pararAlarme() } }, [])
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 250); return () => clearInterval(t) }, [])

  const passo = receita?.passos[i]
  const total = passo?.timerSeg || 0
  const restante = pausado != null ? pausado : fim ? Math.max(0, Math.ceil((fim - agora) / 1000)) : total

  // Avisos: meio do tempo, 1 minuto antes e fim
  useEffect(() => {
    if (!fim || pausado != null || !passo) return
    const a = avisos.current
    if (passo.avisoMeio && !a.meio && restante <= Math.floor(total / 2) && restante > 0) {
      a.meio = true; avisoCurto(som); toast(passo.avisoMeio); notificar('QChef: ' + passo.avisoMeio, receita.titulo)
    }
    if (total >= 180 && !a.umMin && restante <= 60 && restante > 0) {
      a.umMin = true; avisoCurto(som); toast('Falta 1 minuto'); notificar('QChef: falta 1 minuto', passo.texto)
    }
    if (restante === 0 && !a.fim) {
      a.fim = true; setFim(null); setAlarme(true); tocarAlarme(som)
      notificar('Tempo esgotado!', ACAO_FIM[receita.ambiente] || passo.texto)
    }
  }, [restante, fim, pausado, passo, total, som, receita])

  if (!receita) return <div className="cozinha"><p>Receita não encontrada.</p><button className="btn" onClick={() => navegar('/inicio')}>Voltar</button></div>

  function irPara(n) {
    pararAlarme(); setAlarme(false); setFim(null); setPausado(null); avisos.current = {}
    if (n >= receita.passos.length) { navegar('/fiz' + (q.get('id') ? '?id=' + encodeURIComponent(q.get('id')) : '')); return }
    setI(Math.max(0, n))
  }
  function iniciar() {
    prepararSom(); pedirNotificacoes()
    setFim(Date.now() + (pausado != null ? pausado : total) * 1000); setPausado(null)
  }
  const pausar = () => { setPausado(restante); setFim(null) }
  const maisUmMinuto = () => { pararAlarme(); setAlarme(false); avisos.current.fim = false; setFim(Date.now() + 60000) }
  const alternarSom = () => atualizar((s) => { s.perfil.som = !s.perfil.som })

  const progresso = total ? (1 - restante / total) * 100 : 0
  const icone = AMBIENTES.find((a) => a.id === receita.ambiente)?.icone || 'talheres'
  const proximo = receita.passos[i + 1]

  return (
    <div className="cozinha">
      <div className="topo-c">
        <button className="redondo escuro" onClick={() => voltar('/receita')} aria-label="Sair do modo cozinhando"><Icone nome="x" /></button>
        <span className="modo"><Icone nome={icone} />{nomeAmbiente(receita.ambiente)}</span>
        <button className="redondo escuro" onClick={alternarSom} aria-label={som ? 'Desligar som do alarme' : 'Ligar som do alarme'} style={{ opacity: som ? 1 : 0.5 }}><Icone nome="som" /></button>
      </div>
      <div className="progresso" aria-label={`Passo ${i + 1} de ${receita.passos.length}`}>{receita.passos.map((_, n) => <span key={n} className={n <= i ? 'feito' : ''} />)}</div>
      <div className="etapa"><small>Passo {i + 1} de {receita.passos.length} · {receita.titulo}</small><h2>{passo.texto}</h2></div>
      <Aparelho ambiente={receita.ambiente} passo={passo} />

      {total > 0 && (
        <>
          <div className="timer" style={{ background: `conic-gradient(var(--laranja) 0 ${progresso}%, rgba(255,255,255,.1) ${progresso}% 100%)` }}>
            <div><b>{formatarTempo(restante)}</b><span>{fim ? 'de ' + formatarTempo(total) : pausado != null ? 'pausado' : 'pronto para começar'}</span></div>
          </div>
          <div className="timer-acoes">
            {fim ? <button className="btn vidro peq" onClick={pausar}><Icone nome="pausa" tam={16} />Pausar</button>
              : <button className="btn peq" onClick={iniciar}><Icone nome="play" tam={14} />{pausado != null ? 'Continuar' : 'Iniciar cronômetro'}</button>}
            {(fim || pausado != null) && <button className="btn vidro peq" onClick={() => { setFim(null); setPausado(null); avisos.current = {} }}>Zerar</button>}
          </div>
          {passo.avisoMeio && <div className="alerta-prox"><Icone nome="sino" /><span>Na metade do tempo o app toca para lembrar: <b>{passo.avisoMeio.toLowerCase()}</b></span></div>}
        </>
      )}

      {proximo && <div className="seguir"><small>A SEGUIR</small>{proximo.texto}</div>}
      <div className="nav-passos" style={{ marginTop: proximo ? 14 : 'auto' }}>
        <button className="btn vidro" onClick={() => irPara(i - 1)} disabled={i === 0}><Icone nome="voltar" tam={18} />Anterior</button>
        <button className="btn" onClick={() => irPara(i + 1)}>{proximo ? 'Próximo passo' : 'Concluir receita'}<Icone nome={proximo ? 'seta' : 'check'} tam={18} /></button>
      </div>

      {alarme && (
        <div className="alarme" role="alertdialog" aria-label="Tempo esgotado">
          <div className="ondas"><span /><span /><span /><div className="centro"><Icone nome="sino" espessura={1.8} /></div></div>
          <h1>Tempo esgotado!</h1>
          <p>{receita.titulo} · passo {i + 1} de {receita.passos.length}</p>
          <div className="acao-ap"><Icone nome={icone} />{ACAO_FIM[receita.ambiente] || 'Confira o preparo'}</div>
          <div className="botoes">
            <button className="btn vidro" onClick={maisUmMinuto}><Icone nome="mais" tam={18} />1 minuto</button>
            <button className="btn branco" onClick={() => { pararAlarme(); setAlarme(false) }}>Desligar e continuar</button>
          </div>
        </div>
      )}
    </div>
  )
}
