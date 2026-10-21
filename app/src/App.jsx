import { useCallback, useEffect, useState } from 'react'
import { useRota, trocar } from './lib/rota.js'
import { useEstado, atualizar } from './lib/store.js'
import { observarUsuario, verificarAcesso, concluirLinkSeHouver } from './lib/auth.js'
import { Nav, Toasts } from './components/ui.jsx'
import { PopupInstalar } from './components/Instalar.jsx'
import { Splash, BoasVindas, Entrar, LinkEnviado, AcessoNegado } from './screens/Acesso.jsx'
import Inicio from './screens/Inicio.jsx'
import Gerando from './screens/Gerando.jsx'
import Receita from './screens/Receita.jsx'
import Cozinhando from './screens/Cozinhando.jsx'
import Fiz from './screens/Fiz.jsx'
import { Feitas, Favoritas } from './screens/Listas.jsx'
import Perfil, { MinhaCozinha, Limite } from './screens/Perfil.jsx'

function SemInternet({ tentar }) {
  return (
    <div className="tela sem-nav" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 28 }}>
      <h1 className="titulo" style={{ fontSize: 22 }}>Sem internet</h1>
      <p className="sub" style={{ marginTop: 8 }}>Precisamos de conexão no primeiro acesso para confirmar sua compra. Depois, favoritas e receitas feitas funcionam offline.</p>
      <button className="btn" style={{ marginTop: 20 }} onClick={tentar}>Tentar de novo</button>
    </div>
  )
}

export default function App() {
  const { partes } = useRota()
  const splashVisto = useEstado((s) => s.splashVisto)
  // A splash animada aparece ao abrir o app (sempre na primeira vez; depois, só na abertura fria)
  const [splash, setSplash] = useState(!sessionStorage.getItem('qchef:aberto'))
  const [usuario, setUsuario] = useState(undefined)
  const [acesso, setAcesso] = useState(null)
  const [verif, setVerif] = useState(0)

  useEffect(() => { concluirLinkSeHouver().catch(() => {}); return observarUsuario(setUsuario) }, [])
  useEffect(() => {
    if (!usuario) { setAcesso(null); return }
    setAcesso({ estado: 'verificando' })
    verificarAcesso(usuario).then(setAcesso)
  }, [usuario, verif])

  const fimSplash = useCallback(() => {
    setSplash(false); sessionStorage.setItem('qchef:aberto', '1')
    if (!splashVisto) atualizar((s) => { s.splashVisto = true })
  }, [splashVisto])

  const [a] = partes
  let tela = null, nav = null
  const carregando = usuario === undefined || acesso?.estado === 'verificando'

  if (carregando) tela = <div className="tela sem-nav" style={{ background: 'var(--grafite)' }} />
  else if (!usuario) {
    if (a === 'entrar') tela = <Entrar />
    else if (a === 'link-enviado') tela = <LinkEnviado />
    else tela = <BoasVindas />
  } else if (acesso?.estado === 'negado') tela = <AcessoNegado usuario={usuario} tentarDeNovo={() => setVerif(verif + 1)} />
  else if (acesso?.estado === 'offline') tela = <SemInternet tentar={() => setVerif(verif + 1)} />
  else {
    switch (a) {
      case 'gerando': tela = <Gerando />; break
      case 'receita': tela = <Receita />; break
      case 'cozinhar': tela = <Cozinhando />; break
      case 'fiz': tela = <Fiz />; break
      case 'feitas': tela = <Feitas />; nav = 'feitas'; break
      case 'favoritas': tela = <Favoritas />; nav = 'favoritas'; break
      case 'perfil': tela = <Perfil usuario={usuario} pro={acesso?.pro} />; nav = 'perfil'; break
      case 'cozinha': tela = <MinhaCozinha />; break
      case 'limite': tela = <Limite />; break
      default:
        if (a !== 'inicio') setTimeout(() => trocar('/inicio'))
        tela = <Inicio usuario={usuario} />; nav = 'inicio'
    }
  }

  return (
    <div className="app">
      <div className="rolagem">
        {tela}
        {nav && <Nav ativa={nav} />}
      </div>
      {usuario && acesso?.estado === 'liberado' && !splash && <PopupInstalar />}
      <Toasts />
      {splash && <Splash aoTerminar={fimSplash} />}
    </div>
  )
}
