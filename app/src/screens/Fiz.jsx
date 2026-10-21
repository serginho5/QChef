// "Fiz essa receita!": registra no histórico e guarda a foto do prato no aparelho.
// A publicação da foto no banco do app (com autorização e créditos) entra na versão 2.
import { useRef, useState } from 'react'
import { Icone } from '../components/ui.jsx'
import { useReceita } from './Receita.jsx'
import { navegar } from '../lib/rota.js'
import { registrarFeita, salvarFoto } from '../lib/store.js'

// Reduz a foto para 1200 px (cabe bem no aparelho e carrega rápido)
async function reduzir(arquivo) {
  const img = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1200 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala)
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85))
}

export default function Fiz() {
  const receita = useReceita()
  const entrada = useRef(null)
  const [foto, setFoto] = useState(null)
  const [salvando, setSalvando] = useState(false)
  if (!receita) { navegar('/inicio'); return null }

  async function escolher(e) {
    const arq = e.target.files?.[0]
    if (!arq) return
    const blob = await reduzir(arq).catch(() => arq)
    setFoto({ blob, url: URL.createObjectURL(blob) })
  }
  async function salvar() {
    setSalvando(true)
    let fotoId = null
    if (foto) { fotoId = 'feita-' + Date.now(); await salvarFoto(fotoId, foto.blob).catch(() => { fotoId = null }) }
    registrarFeita(receita, fotoId)
    navegar('/feitas')
  }

  return (
    <div className="tela sem-nav" style={{ paddingTop: 'calc(16px + var(--seg-topo))' }}>
      <div className="pad"><button className="redondo" onClick={() => history.back()} aria-label="Fechar"><Icone nome="x" /></button></div>
      <div className="parabens">
        <div className="medalha"><Icone nome="trofeu" espessura={1.8} /></div>
        <h1>Mandou bem!</h1>
        <p>{receita.titulo} vai para o seu histórico.</p>
      </div>
      <button className="upload" onClick={() => entrada.current?.click()}>
        {foto ? (
          <><img src={foto.url} alt="Foto do seu prato" /><span className="trocar"><Icone nome="camera" />Trocar foto</span></>
        ) : (
          <span className="vazio-up"><Icone nome="camera" espessura={1.8} />Tirar foto do prato<span className="mini" style={{ fontFamily: 'Nunito' }}>Opcional · fica só no seu celular</span></span>
        )}
      </button>
      <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={escolher} />
      <div className="pad" style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn sec" style={{ flex: 1 }} onClick={() => { registrarFeita(receita); navegar('/feitas') }}>Pular foto</button>
        <button className="btn" style={{ flex: 1.6 }} disabled={salvando || !foto} onClick={salvar}>Salvar no histórico</button>
      </div>
    </div>
  )
}
