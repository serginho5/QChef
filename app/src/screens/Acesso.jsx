// Abertura e acesso: splash animada, boas-vindas, entrar (Google ou link no e-mail),
// link enviado e acesso não encontrado. Não há cadastro nem senha: o acesso nasce na compra.
import { useEffect, useState } from 'react'
import logoAnimado from '../assets/logo-partes.svg?raw'
import { Icone, Voltar } from '../components/ui.jsx'
import { navegar } from '../lib/rota.js'
import { entrarComGoogle, enviarLink, emailDoLink, sair, LINK_COMPRA, EMAIL_SUPORTE, WHATSAPP_SUPORTE, MODO_DEMO } from '../lib/auth.js'

export function Splash({ aoTerminar }) {
  const [saindo, setSaindo] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setSaindo(true), 2900)
    const t2 = setTimeout(aoTerminar, 3350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [aoTerminar])
  return (
    <div className={'splash' + (saindo ? ' saindo' : '')} aria-label="Abrindo o QChef">
      <div className="brilho" />
      <div dangerouslySetInnerHTML={{ __html: logoAnimado }} />
      <div className="carregando">Preparando sua cozinha…<div className="pontos"><span /><span /><span /></div></div>
    </div>
  )
}

const MOSAICO = [
  ['lasanha', 'salada-caprese', 'pao-de-queijo'],
  ['frango-empanado-airfryer', 'bolo-cenoura', 'cuscuz-ovo-queijo'],
  ['arroz-ovo-frito', 'pizza-caseira', 'omelete-queijo-tomate'],
]

export function BoasVindas() {
  return (
    <div className="bv">
      <div className="mosaico" aria-hidden="true">
        {MOSAICO.map((col, i) => <div key={i}>{col.map((f) => <img key={f} src={`fotos/${f}.webp`} alt="" />)}</div>)}
      </div>
      <div className="degrade-bv" />
      <div className="base">
        <img className="logo-bv" src="logo/qchef-logo-horizontal-branca.svg" alt="QChef by Hub Bioguia" />
        <h1>O que tem na geladeira vira <em>receita</em> em segundos.</h1>
        <p>Diga os ingredientes, escolha onde vai preparar e a IA monta o passo a passo pra você.</p>
        <button className="btn" style={{ marginTop: 22 }} onClick={() => navegar('/entrar')}>Entrar</button>
        <div className="entrar">Ainda não tem acesso? <a href={LINK_COMPRA} target="_blank" rel="noreferrer">Conhecer o QChef</a></div>
      </div>
    </div>
  )
}

const GOOGLE = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" /></svg>
)
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

export function Entrar() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function google() {
    setErro('')
    try { await entrarComGoogle() } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') setErro('Não deu para entrar com o Google. Tente de novo ou use o link no e-mail.')
    }
  }
  async function link(ev) {
    ev.preventDefault()
    if (!emailValido(email)) { setErro('Digite um e-mail válido, o mesmo usado na compra.'); return }
    setErro(''); setEnviando(true)
    try { await enviarLink(email); navegar('/link-enviado') } catch { setErro('Não deu para enviar o link agora. Confira o e-mail e tente de novo.') } finally { setEnviando(false) }
  }

  return (
    <div className="tela sem-nav">
      <div className="form">
        <img src="logo/qchef-logo-horizontal-colorida.svg" alt="QChef" style={{ width: 150, marginLeft: -4 }} />
        <h1 className="titulo" style={{ marginTop: 26 }}>Entre no QChef</h1>
        <p className="sub" style={{ marginTop: 6 }}>Use o mesmo e-mail da sua compra para liberar o acesso.</p>
        <button className="btn sec" style={{ marginTop: 22 }} onClick={google}>{GOOGLE}Entrar com Google</button>
        <div className="ou">não usa Gmail?</div>
        <form onSubmit={link}>
          <div className="campo-f"><label htmlFor="email">E-mail da compra</label>
            <div className="entrada"><Icone nome="email" /><input id="email" type="email" inputMode="email" autoComplete="email" placeholder="seuemail@hotmail.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <button className="btn escuro" style={{ marginTop: 12 }} disabled={enviando}>{enviando ? 'Enviando…' : 'Receber link de acesso'}</button>
        </form>
        {erro && <div className="erro-box" role="alert">{erro}</div>}
        <div className="dica"><Icone nome="lampada" /><div>Sem senha: enviamos um link que entra direto. <b>Use o e-mail que aparece no comprovante da compra.</b></div></div>
        {MODO_DEMO && <p className="mini" style={{ marginTop: 14, textAlign: 'center' }}>Modo demonstração: qualquer opção entra direto.</p>}
      </div>
    </div>
  )
}

export function LinkEnviado() {
  const email = emailDoLink() || 'seu e-mail'
  const [reenviado, setReenviado] = useState(false)
  return (
    <div className="tela sem-nav">
      <div className="form">
        <Voltar onClick={() => navegar('/entrar')} />
        <div className="icone-grande"><Icone nome="email" espessura={1.6} /></div>
        <h1 className="titulo" style={{ marginTop: 18 }}>Confira seu e-mail</h1>
        <p className="sub" style={{ marginTop: 6 }}>Enviamos um link de acesso para <b style={{ color: 'var(--grafite)' }}>{email}</b>. Toque nele neste celular para entrar.</p>
        <div className="passos-ajuda">
          <div><span className="n">1</span><span>Abra o e-mail com o assunto de acesso ao QChef</span></div>
          <div><span className="n">2</span><span>Toque no link para entrar</span></div>
          <div><span className="n">3</span><span>Pronto: você entra direto, sem senha</span></div>
        </div>
        <div className="ok-box"><Icone nome="relogio" espessura={2.2} /><div>Não chegou? Olhe o <b>spam</b> ou <b>promoções</b>. O link vale por 1 hora.</div></div>
        <button className="btn sec" style={{ marginTop: 18 }} disabled={reenviado} onClick={async () => { await enviarLink(email).catch(() => {}); setReenviado(true) }}>{reenviado ? 'Link reenviado' : 'Reenviar link'}</button>
        <div className="rodape-f">E-mail errado? <button onClick={() => navegar('/entrar')}>Trocar e-mail</button></div>
      </div>
    </div>
  )
}

export function AcessoNegado({ usuario, tentarDeNovo }) {
  const suporte = WHATSAPP_SUPORTE
    ? `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent('Oi! Comprei o QChef e não consigo entrar. Meu e-mail: ' + usuario.email)}`
    : `mailto:${EMAIL_SUPORTE}?subject=Acesso ao QChef`
  return (
    <div className="tela sem-nav">
      <div className="form">
        <div className="icone-grande erro" style={{ marginTop: 10 }}><Icone nome="alerta" espessura={1.6} /></div>
        <h1 className="titulo" style={{ marginTop: 18 }}>Não encontramos sua compra</h1>
        <p className="sub" style={{ marginTop: 6 }}>Você entrou com este e-mail, mas ele não tem acesso ao QChef:</p>
        <div className="email-box"><span className="av">{(usuario.nome || usuario.email)[0].toUpperCase()}</span><div><b>{usuario.email}</b><span>Conta usada agora</span></div></div>
        <div className="passos-ajuda">
          <div><span className="n">1</span><span>Veja no comprovante qual e-mail você usou na compra</span></div>
          <div><span className="n">2</span><span>Entre com esse e-mail (Google ou link de acesso)</span></div>
        </div>
        <button className="btn" style={{ marginTop: 18 }} onClick={async () => { await sair(); navegar('/entrar') }}>Entrar com outro e-mail</button>
        <a className="btn zap" style={{ marginTop: 10, textDecoration: 'none' }} href={suporte} target="_blank" rel="noreferrer"><Icone nome="ajuda" tam={20} />Falar com o suporte</a>
        <button className="link" style={{ display: 'block', margin: '8px auto 0' }} onClick={tentarDeNovo}>Acabei de comprar: verificar de novo</button>
        <div className="rodape-f">Ainda não comprou? <a href={LINK_COMPRA} target="_blank" rel="noreferrer">Garantir meu acesso</a></div>
      </div>
    </div>
  )
}
