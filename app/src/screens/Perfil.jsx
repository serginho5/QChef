// Perfil, Minha cozinha (alergias, restrições, aparelhos, porções) e limite do mês com o plano Pro.
import { useEffect, useState } from 'react'
import { Icone, Voltar, toast } from '../components/ui.jsx'
import { useInstalar, instalado } from '../components/Instalar.jsx'
import { useEstado, atualizar } from '../lib/store.js'
import { navegar, voltar } from '../lib/rota.js'
import { sair, LINK_PRO, EMAIL_SUPORTE } from '../lib/auth.js'
import { consultarUso } from '../lib/api.js'
import { ALERGIAS, RESTRICOES, APARELHOS } from '../data/opcoes.js'

const resumo = (lista, vazio) => lista.length ? lista.join(', ') : vazio

export default function Perfil({ usuario, pro }) {
  const s = useEstado()
  const [uso, setUso] = useState(null)
  const { podeInstalar } = useInstalar()
  useEffect(() => { consultarUso().then(setUso).catch(() => {}) }, [])
  const aparelhos = APARELHOS.filter((a) => s.perfil.aparelhos.includes(a.id)).map((a) => a.nome)
  const nome = usuario?.nome || usuario?.email?.split('@')[0] || 'Você'

  return (
    <div className="tela">
      <div className="topo perfil-topo">
        <div className="avatar-g">{usuario?.foto ? <img src={usuario.foto} alt="" referrerPolicy="no-referrer" /> : nome[0].toUpperCase()}</div>
        <h1>{nome}</h1><p>{usuario?.email}</p>
        <span className="plano"><Icone nome="brilho" />{pro ? 'QChef Pro' : 'Acesso QChef'}{uso ? ` · ${Math.max(0, uso.limite - uso.usadas)} receitas restantes` : ''}</span>
      </div>
      <div className="numeros"><div><b>{s.feitas.length}</b><span>feitas</span></div><div><b>{s.favoritas.length}</b><span>favoritas</span></div><div><b>{uso?.usadas ?? '–'}</b><span>criadas no mês</span></div></div>

      <div className="titulo-grupo">MINHA COZINHA</div>
      <div className="grupo">
        <button className="linha-p" onClick={() => navegar('/cozinha')}><span className="icb alerta"><Icone nome="alerta" /></span><div><b>Alergias</b><span>{resumo(s.perfil.alergias, 'Nenhuma marcada')}</span></div><span className="fim"><Icone nome="seta" /></span></button>
        <button className="linha-p" onClick={() => navegar('/cozinha')}><span className="icb"><Icone nome="folha" /></span><div><b>Restrições e dieta</b><span>{resumo(s.perfil.restricoes, 'Sem restrições')}</span></div><span className="fim"><Icone nome="seta" /></span></button>
        <button className="linha-p" onClick={() => navegar('/cozinha')}><span className="icb"><Icone nome="airfryer" /></span><div><b>Aparelhos que tenho</b><span>{resumo(aparelhos, 'Nenhum marcado')}</span></div><span className="fim"><Icone nome="seta" /></span></button>
        <button className="linha-p" onClick={() => navegar('/cozinha')}><span className="icb"><Icone nome="pessoas" /></span><div><b>Porções padrão</b><span>{s.perfil.porcoes} {s.perfil.porcoes > 1 ? 'pessoas' : 'pessoa'}</span></div><span className="fim"><Icone nome="seta" /></span></button>
      </div>

      <div className="titulo-grupo">PREFERÊNCIAS</div>
      <div className="grupo">
        <button className="linha-p" role="switch" aria-checked={s.perfil.som} onClick={() => atualizar((x) => { x.perfil.som = !x.perfil.som })}><span className="icb"><Icone nome="sino" /></span><div><b>Som do alarme</b><span>Toca quando o tempo de preparo acaba</span></div><span className={'chave' + (s.perfil.som ? ' on' : '')} /></button>
        <button className="linha-p" role="switch" aria-checked={s.perfil.despensaBasica} onClick={() => atualizar((x) => { x.perfil.despensaBasica = !x.perfil.despensaBasica })}><span className="icb"><Icone nome="livro" /></span><div><b>Despensa básica</b><span>Considerar que tenho sal, óleo, água, açúcar e alho</span></div><span className={'chave' + (s.perfil.despensaBasica ? ' on' : '')} /></button>
        {!instalado() && podeInstalar && <button className="linha-p" onClick={() => atualizar((x) => { x.instalarDispensado = false })}><span className="icb"><Icone nome="baixar" /></span><div><b>Instalar no celular</b><span>Recomendado para o alarme do cronômetro</span></div><span className="fim"><Icone nome="seta" /></span></button>}
        {!pro && <a className="linha-p" href={LINK_PRO} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><span className="icb"><Icone nome="brilho" /></span><div><b>Conhecer o QChef Pro</b><span>Até 150 receitas novas por mês</span></div><span className="fim"><Icone nome="seta" /></span></a>}
        <a className="linha-p" href={`mailto:${EMAIL_SUPORTE}?subject=Ajuda com o QChef`} style={{ textDecoration: 'none' }}><span className="icb"><Icone nome="ajuda" /></span><div><b>Ajuda e suporte</b><span>{EMAIL_SUPORTE}</span></div><span className="fim"><Icone nome="seta" /></span></a>
      </div>
      <div className="pad"><button className="link" style={{ display: 'block', margin: '18px auto 0', color: 'var(--suave)' }} onClick={async () => { await sair(); navegar('/') }}>Sair da conta</button></div>
      <p className="mini" style={{ textAlign: 'center', marginTop: 4 }}>QChef by Hub BioGuia · as receitas são sugestões geradas por IA; confira alergias e o ponto dos alimentos.</p>
    </div>
  )
}

function alternar(lista, item) { return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item] }

export function MinhaCozinha() {
  const perfil = useEstado((s) => s.perfil)
  const [p, setP] = useState(perfil)
  const salvar = () => { atualizar((s) => { s.perfil = { ...s.perfil, ...p } }); toast('Cozinha salva'); voltar('/perfil') }
  return (
    <div className="tela sem-nav" style={{ paddingBottom: 110 }}>
      <div className="cabecalho"><Voltar onClick={() => voltar('/perfil')} /><h1>Minha cozinha</h1></div>
      <div className="aviso-ia"><Icone nome="escudo" /><span>A IA nunca vai sugerir receitas com o que você marcar como alergia. O app confere de novo antes de mostrar.</span></div>
      <div className="bloco"><h2>Alergias e intolerâncias</h2>
        <div className="chips">{ALERGIAS.map((a) => { const on = p.alergias.includes(a); return <button key={a} className={'chip alergia' + (on ? ' ativo' : '')} aria-pressed={on} onClick={() => setP({ ...p, alergias: alternar(p.alergias, a) })}>{on && <Icone nome="check" espessura={3} />}{a}</button> })}</div>
      </div>
      <div className="bloco"><h2>Restrições e dieta</h2>
        <div className="chips">{RESTRICOES.map((a) => { const on = p.restricoes.includes(a); return <button key={a} className={'chip dieta' + (on ? ' ativo' : '')} aria-pressed={on} onClick={() => setP({ ...p, restricoes: alternar(p.restricoes, a) })}>{on && <Icone nome="check" espessura={3} />}{a}</button> })}</div>
      </div>
      <div className="bloco"><h2>Aparelhos que tenho</h2><p className="aj">Na hora de criar a receita, só aparecem os ambientes que você tem.</p>
        <div className="aparelhos">{APARELHOS.map((a) => { const on = p.aparelhos.includes(a.id); return <button key={a.id} className={'ap' + (on ? ' tem' : '')} aria-pressed={on} onClick={() => setP({ ...p, aparelhos: alternar(p.aparelhos, a.id) })}><Icone nome={a.icone} espessura={1.8} />{a.nome}<span className="mk">{on && <Icone nome="check" espessura={3} />}</span></button> })}</div>
      </div>
      <div className="bloco"><h2>Porções padrão</h2><p className="aj">Quantas pessoas costumam comer.</p>
        <div className="porcoes"><button className="redondo" onClick={() => setP({ ...p, porcoes: Math.max(1, p.porcoes - 1) })} aria-label="Menos"><span style={{ font: '800 22px var(--display)', lineHeight: 1 }}>−</span></button><b>{p.porcoes}</b><button className="redondo" onClick={() => setP({ ...p, porcoes: Math.min(10, p.porcoes + 1) })} aria-label="Mais"><Icone nome="mais" /></button></div>
      </div>
      <div className="rodape-acoes"><button className="btn" onClick={salvar}>Salvar minha cozinha</button></div>
    </div>
  )
}

export function Limite() {
  const [uso, setUso] = useState(null)
  useEffect(() => { consultarUso().then(setUso).catch(() => {}) }, [])
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const renova = uso?.renovaEm ? new Date(uso.renovaEm + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : 'no próximo mês'
  return (
    <div className="tela sem-nav">
      <div className="limite-topo">
        <div style={{ textAlign: 'left' }}><Voltar escuro onClick={() => voltar('/inicio')} /></div>
        <div className="contador-c"><div><b>{uso ? `${uso.usadas}/${uso.limite}` : '…'}</b><span>receitas no mês</span></div></div>
        <h1>Você usou todas as receitas de {mes}</h1>
        <p>Seu acesso libera {uso?.limite ?? 20} receitas novas por mês. Favoritas e receitas feitas continuam liberadas.</p>
      </div>
      <div className="plano-card"><span className="selo-pro">QCHEF PRO</span>
        <div className="preco"><b>R$ 19,90</b><span>/mês</span></div>
        <ul>
          <li><Icone nome="check" espessura={3} />Até 150 receitas novas por mês</li>
          <li><Icone nome="check" espessura={3} />Todos os modos: pressa, econômico e criativo</li>
          <li><Icone nome="check" espessura={3} />Cancele quando quiser</li>
        </ul>
      </div>
      <div className="pad" style={{ marginTop: 16 }}>
        <a className="btn" href={LINK_PRO} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Assinar o Pro</a>
        <p className="mini" style={{ textAlign: 'center', marginTop: 12 }}>Ou espere: suas receitas renovam em <b>{renova}</b>.</p>
        <button className="btn sec" style={{ marginTop: 14 }} onClick={() => navegar('/favoritas')}>Ver minhas favoritas</button>
      </div>
    </div>
  )
}
