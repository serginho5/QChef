// Convite para instalar o app no celular (mesmo comportamento do Dieta Fácil):
// aparece só na versão web do celular, "Agora não" adia por 3 dias e deixa um lembrete no Início.
import { useEffect, useState } from 'react'
import { atualizar, useEstado } from '../lib/store.js'
import { Icone, Folha } from './ui.jsx'

let eventoInstalar = null
const ouv = new Set()
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e; ouv.forEach((f) => f()) })
window.addEventListener('appinstalled', () => { eventoInstalar = null; ouv.forEach((f) => f()) })

export const instalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const ehAndroid = () => /android/i.test(navigator.userAgent)

export function useInstalar() {
  const [, set] = useState(0)
  useEffect(() => { const f = () => set((x) => x + 1); ouv.add(f); return () => ouv.delete(f) }, [])
  return { podeInstalar: !instalado() && (!!eventoInstalar || ehIOS() || ehAndroid()), temConvite: !!eventoInstalar }
}

const CHAVE_ADIADO = 'qchef:popup-instalar'
const ADIAR_MS = 3 * 24 * 60 * 60 * 1000
const adiado = () => { try { return Date.now() - Number(localStorage.getItem(CHAVE_ADIADO) || 0) < ADIAR_MS } catch { return false } }
const adiar = () => { try { localStorage.setItem(CHAVE_ADIADO, String(Date.now())) } catch { /* ignore */ } }

function PassosInstalar() {
  return ehIOS() ? (
    <div className="passos-ajuda">
      <div><span className="n">1</span><span>Toque em <b>Compartilhar</b> na barra do Safari</span></div>
      <div><span className="n">2</span><span>Escolha <b>Adicionar à Tela de Início</b></span></div>
      <div><span className="n">3</span><span>Toque em <b>Adicionar</b> e abra pelo ícone do QChef</span></div>
    </div>
  ) : (
    <div className="passos-ajuda">
      <div><span className="n">1</span><span>Abra o QChef no <b>Chrome</b></span></div>
      <div><span className="n">2</span><span>Toque no menu <b>⋮</b> (três pontinhos)</span></div>
      <div><span className="n">3</span><span>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></span></div>
    </div>
  )
}

export function PopupInstalar() {
  const { podeInstalar, temConvite } = useInstalar()
  const [aberto, setAberto] = useState(false)
  const [passos, setPassos] = useState(false)
  useEffect(() => {
    if (!podeInstalar || adiado()) return
    // No Android o convite do Chrome chega alguns segundos depois: espera por ele para instalar com um toque
    const t = setTimeout(() => setAberto(true), temConvite || ehIOS() ? 1500 : 6000)
    return () => clearTimeout(t)
  }, [podeInstalar, temConvite])

  const fechar = () => { adiar(); setAberto(false); setPassos(false) }
  async function instalar() {
    if (eventoInstalar) { eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; ouv.forEach((f) => f()); setAberto(false) }
    else setPassos(true)
  }

  return (
    <Folha aberta={aberto} fechar={fechar} rotulo="Instalar o QChef">
      {!passos ? (
        <>
          <img src="icons/icon-192.png" alt="" style={{ width: 72, height: 72, borderRadius: 20, alignSelf: 'center', boxShadow: '0 12px 26px rgba(31,35,40,.25)' }} />
          <h2 className="titulo" style={{ fontSize: 22, textAlign: 'center' }}>Você está usando a versão web</h2>
          <p className="sub" style={{ textAlign: 'center' }}>Para ter a melhor experiência, instale o QChef direto no seu celular:</p>
          <div className="beneficios">
            <div className="ben"><span className="icb"><Icone nome="sino" /></span><div><b>Alarme do cronômetro</b><span>Avisa quando o tempo de preparo acaba</span></div></div>
            <div className="ben"><span className="icb"><Icone nome="raio" /></span><div><b>Abre na hora, em tela cheia</b><span>Direto da tela inicial, sem procurar link</span></div></div>
            <div className="ben"><span className="icb"><Icone nome="livro" /></span><div><b>Receitas salvas sem internet</b><span>Suas favoritas sempre à mão</span></div></div>
          </div>
          <button className="btn" onClick={instalar}><Icone nome="baixar" tam={20} />{eventoInstalar ? 'Instalar agora' : 'Ver como instalar'}</button>
          <button className="link" style={{ alignSelf: 'center', color: 'var(--suave)' }} onClick={fechar}>Agora não</button>
        </>
      ) : (
        <>
          <h2 className="titulo" style={{ fontSize: 22 }}>{ehIOS() ? 'Instale no seu iPhone' : 'Instale no seu Android'}</h2>
          <p className="sub">Leva 10 segundos e o QChef fica junto dos seus apps.</p>
          <PassosInstalar />
          <button className="btn escuro" onClick={fechar}>Entendi</button>
        </>
      )}
    </Folha>
  )
}

export function BannerInstalar() {
  const dispensado = useEstado((s) => s.instalarDispensado)
  const { podeInstalar } = useInstalar()
  const [passos, setPassos] = useState(false)
  if (!podeInstalar || dispensado) return null
  async function instalar() {
    if (eventoInstalar) { eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; ouv.forEach((f) => f()) }
    else setPassos(true)
  }
  return (
    <>
      <div className="banner-inst">
        <img src="icons/icon-192.png" alt="" />
        <div><b>Instale o QChef</b><span>Alarme do cronômetro e uso sem internet</span></div>
        <div className="acoes-b">
          <button className="btn peq" onClick={instalar}>Instalar</button>
          <button className="x" onClick={() => atualizar((s) => { s.instalarDispensado = true })}>Agora não</button>
        </div>
      </div>
      <Folha aberta={passos} fechar={() => setPassos(false)} rotulo="Como instalar">
        <h2 className="titulo" style={{ fontSize: 22 }}>Como instalar</h2>
        <PassosInstalar />
        <button className="btn escuro" onClick={() => setPassos(false)}>Entendi</button>
      </Folha>
    </>
  )
}
