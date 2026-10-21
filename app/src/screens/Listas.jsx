// Receitas feitas (histórico) e favoritas.
import { useEffect, useMemo, useState } from 'react'
import { Icone } from '../components/ui.jsx'
import { useEstado, lerFoto } from '../lib/store.js'
import { navegar } from '../lib/rota.js'
import { urlFoto, fotoAmbiente, existeFoto } from '../lib/fotos.js'
import { nomeAmbiente, AMBIENTES } from '../data/opcoes.js'

const capa = (r) => r.foto?.id && existeFoto(r.foto.id) && r.foto.tipo !== 'ambiente' ? urlFoto(r.foto.id) : urlFoto(fotoAmbiente(r.ambiente, r.id) || 'amb-fogao-1')
const icAmb = (id) => AMBIENTES.find((a) => a.id === id)?.icone || 'talheres'
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const quando = (ms) => {
  const d = Math.floor((Date.now() - ms) / 86400000)
  return d === 0 ? 'hoje' : d === 1 ? 'ontem' : new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function FotoFeita({ feita }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let u
    if (feita.fotoId) lerFoto(feita.fotoId).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u) } })
    return () => u && URL.revokeObjectURL(u)
  }, [feita.fotoId])
  return <img src={url || capa(feita.receita)} alt="" />
}

export function Feitas() {
  const feitas = useEstado((s) => s.feitas)
  const favoritas = useEstado((s) => s.favoritas)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const lista = feitas.filter((f) => (filtro === 'todas' || f.receita.ambiente === filtro) && norm(f.receita.titulo).includes(norm(busca)))
  const ambientesUsados = [...new Set(feitas.map((f) => f.receita.ambiente))]
  const fotos = feitas.filter((f) => f.fotoId).length

  return (
    <div className="tela">
      <div className="pad" style={{ paddingTop: 'calc(22px + var(--seg-topo))' }}>
        <h1 className="titulo">Minhas receitas feitas</h1>
        <p className="sub" style={{ marginTop: 4 }}>Tudo o que você já cozinhou com o QChef.</p>
      </div>
      <div className="numeros" style={{ margin: '16px 20px 0' }}>
        <div><b>{feitas.length}</b><span>feitas</span></div>
        <div><b>{favoritas.length}</b><span>favoritas</span></div>
        <div><b>{fotos}</b><span>com foto</span></div>
      </div>
      <div className="pad">
        {feitas.length > 0 && (
          <>
            <div className="entrada" style={{ marginTop: 16, minHeight: 46 }}><Icone nome="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nas feitas" aria-label="Buscar nas feitas" /></div>
            <div className="colecoes">
              <button className={'col-c' + (filtro === 'todas' ? ' ativo' : '')} onClick={() => setFiltro('todas')}>Todas<b>{feitas.length}</b></button>
              {ambientesUsados.map((a) => <button key={a} className={'col-c' + (filtro === a ? ' ativo' : '')} onClick={() => setFiltro(a)}>{nomeAmbiente(a)}</button>)}
            </div>
          </>
        )}
        <div className="lista" style={{ marginTop: 14 }}>
          {lista.map((f) => (
            <button key={f.id} className="item" onClick={() => navegar('/receita?id=' + encodeURIComponent(f.receita.id))}>
              <FotoFeita feita={f} />
              <div><h3>{f.receita.titulo}</h3><p>{nomeAmbiente(f.receita.ambiente)} · {f.receita.tempoMin} min · {quando(f.em)}</p>
                {f.fotoId ? <span className="tag"><Icone nome="camera" />Com sua foto</span> : <span className="tag"><Icone nome="check" />Feita</span>}</div>
              <span className="fim"><Icone nome="seta" /></span>
            </button>
          ))}
        </div>
        {!feitas.length && <div className="vazio"><Icone nome="historico" espessura={1.6} /><h3>Nenhuma receita feita ainda</h3><p>Quando terminar de cozinhar, toque em "Fiz essa receita!" e ela aparece aqui, com a foto do seu prato.</p><button className="btn" style={{ marginTop: 18 }} onClick={() => navegar('/inicio')}>Criar uma receita</button></div>}
      </div>
    </div>
  )
}

export function Favoritas() {
  const favoritas = useEstado((s) => s.favoritas)
  const [busca, setBusca] = useState('')
  const [col, setCol] = useState('todas')
  const colecoes = useMemo(() => {
    const c = [{ id: 'todas', nome: 'Todas', f: () => true }, { id: 'rapidas', nome: 'Rápidas', f: (r) => r.tempoMin <= 15 }]
    AMBIENTES.filter((a) => favoritas.some((r) => r.ambiente === a.id)).forEach((a) => c.push({ id: a.id, nome: a.nome, f: (r) => r.ambiente === a.id }))
    return c.map((x) => ({ ...x, qtd: favoritas.filter(x.f).length })).filter((x) => x.id === 'todas' || x.qtd)
  }, [favoritas])
  const atual = colecoes.find((c) => c.id === col) || colecoes[0]
  const lista = favoritas.filter(atual.f).filter((r) => norm(r.titulo).includes(norm(busca)))

  return (
    <div className="tela">
      <div className="pad" style={{ paddingTop: 'calc(22px + var(--seg-topo))' }}>
        <h1 className="titulo">Favoritas</h1>
        <p className="sub" style={{ marginTop: 4 }}>Suas receitas salvas, sempre à mão, até sem internet.</p>
        {favoritas.length > 0 && (
          <>
            <div className="entrada" style={{ marginTop: 14, minHeight: 46 }}><Icone nome="busca" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nas favoritas" aria-label="Buscar nas favoritas" /></div>
            <div className="colecoes">{colecoes.map((c) => <button key={c.id} className={'col-c' + (atual.id === c.id ? ' ativo' : '')} onClick={() => setCol(c.id)}>{c.nome}<b>{c.qtd}</b></button>)}</div>
          </>
        )}
        <div className="grade-fav">
          {lista.map((r) => (
            <button key={r.id} className="fav" onClick={() => navegar('/receita?id=' + encodeURIComponent(r.id))}>
              <div className="ft"><img src={capa(r)} alt="" loading="lazy" /><span className="cor"><Icone nome="coracao" style={{ fill: 'currentColor' }} /></span></div>
              <div className="tx"><h3>{r.titulo}</h3><div className="meta"><Icone nome={icAmb(r.ambiente)} />{nomeAmbiente(r.ambiente)} · {r.tempoMin} min</div></div>
            </button>
          ))}
        </div>
        {!favoritas.length && <div className="vazio"><Icone nome="coracao" espessura={1.6} /><h3>Nenhuma favorita ainda</h3><p>Toque no coração de uma receita para guardar aqui. As favoritas funcionam mesmo sem internet.</p><button className="btn" style={{ marginTop: 18 }} onClick={() => navegar('/inicio')}>Criar uma receita</button></div>}
      </div>
    </div>
  )
}
