// avatar.js — personagem em desenho (SVG) com poses calculadas por t.
// Uso: <svg id="av" viewBox="0 0 600 800"></svg>  →  $('av').innerHTML = avatarSVG('a1')
// e a cada quadro: pose('a1', { t, cab, cabY, olho: piscar(t), olhar, preoc, boca, verde, gota, espiral,
//                               bracoE: [ombro, cotovelo], bracoD: [ombro, cotovelo], garrafa, aponta, x, y })
// boca: 'neutra' | 'sorriso' | 'enjoo' | 'triste'. Para recortar só o rosto (foto): viewBox="40 60 520 693".
// Troque PELE, CABELO e BLUSA para variar a personagem.
const PELE = '#F2C6A0', PELE2 = '#E5AE86', CABELO = '#3B2A20', BLUSA = '#4E7D22'
function avatarSVG (p) {
  return `
  <g id="${p}-corpo">
    <path d="M168 232 Q170 98 300 92 Q430 98 432 232 L446 430 Q300 470 154 430 Z" fill="${CABELO}"/>
    <rect x="276" y="318" width="48" height="76" rx="20" fill="${PELE2}"/>
    <g id="${p}-tronco">
      <path d="M160 430 Q172 376 240 362 L300 396 L360 362 Q428 376 440 430 L462 820 L138 820 Z" fill="${BLUSA}"/>
      <path d="M258 364 L300 414 L342 364 Q300 380 258 364 Z" fill="${PELE2}"/>
    </g>
    <g id="${p}-cabeca">
      <ellipse cx="198" cy="244" rx="16" ry="24" fill="${PELE2}"/><ellipse cx="402" cy="244" rx="16" ry="24" fill="${PELE2}"/>
      <ellipse cx="300" cy="232" rx="102" ry="118" fill="${PELE}"/>
      <ellipse id="${p}-enjoo" cx="300" cy="240" rx="102" ry="110" fill="#9CCB6E" opacity="0"/>
      <path d="M196 226 Q198 112 300 110 Q402 112 404 226 Q384 168 316 158 Q296 196 236 196 Q214 206 196 226 Z" fill="${CABELO}"/>
      <g id="${p}-sobL"><path d="M244 196 Q262 186 282 194" stroke="${CABELO}" stroke-width="8" fill="none" stroke-linecap="round"/></g>
      <g id="${p}-sobR"><path d="M318 194 Q338 186 356 196" stroke="${CABELO}" stroke-width="8" fill="none" stroke-linecap="round"/></g>
      <g id="${p}-olhos">
        <g id="${p}-olhoL"><ellipse cx="264" cy="236" rx="12" ry="15" fill="#2A1E17"/><circle cx="268" cy="230" r="4" fill="#fff"/></g>
        <g id="${p}-olhoR"><ellipse cx="336" cy="236" rx="12" ry="15" fill="#2A1E17"/><circle cx="340" cy="230" r="4" fill="#fff"/></g>
      </g>
      <ellipse cx="242" cy="276" rx="20" ry="11" fill="#F08C8C" opacity=".45"/><ellipse cx="358" cy="276" rx="20" ry="11" fill="#F08C8C" opacity=".45"/>
      <path d="M298 250 Q290 270 304 272" stroke="#C98B66" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path id="${p}-b-neutra" d="M280 302 Q300 310 320 302" stroke="#8C3B3B" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path id="${p}-b-sorriso" d="M268 294 Q300 336 332 294 Q300 308 268 294 Z" fill="#8C3B3B" stroke="#8C3B3B" stroke-width="4" stroke-linejoin="round"/>
      <path id="${p}-b-enjoo" d="M272 306 Q281 296 290 306 Q299 316 308 306 Q317 296 328 306" stroke="#8C3B3B" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path id="${p}-b-triste" d="M280 310 Q300 296 320 310" stroke="#8C3B3B" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path id="${p}-gota" d="M404 150 Q420 176 412 188 Q402 198 394 186 Q390 174 404 150 Z" fill="#9FD3F0" opacity="0"/>
      <g id="${p}-espiral" opacity="0" fill="none" stroke="#7FA65A" stroke-width="5" stroke-linecap="round"><path d="M420 120 q14 -10 22 2 q8 14 -8 20 q-16 4 -18 -12"/><path d="M168 130 q-14 -10 -22 2 q-8 14 8 20 q16 4 18 -12"/></g>
    </g>
    <g id="${p}-bracoE">
      <rect x="174" y="412" width="48" height="178" rx="24" fill="${BLUSA}"/>
      <g id="${p}-anteE">
        <rect x="180" y="572" width="38" height="152" rx="19" fill="${PELE}"/>
        <circle cx="199" cy="728" r="26" fill="${PELE}"/>
        <g id="${p}-garrafa"><rect x="190" y="606" width="18" height="16" rx="4" fill="#4E7D22"/><path d="M192 622 H206 V640 Q224 652 224 676 V782 Q224 792 214 792 H184 Q174 792 174 782 V676 Q174 652 192 640 Z" fill="#E4F3FB" stroke="#2F5212" stroke-width="5" stroke-linejoin="round"/><path d="M177 712 H221 V782 Q221 789 214 789 H184 Q177 789 177 782 Z" fill="#9FD3F0"/><rect x="176" y="690" width="46" height="22" fill="#4E7D22"/></g>
      </g>
    </g>
    <g id="${p}-bracoD">
      <rect x="378" y="412" width="48" height="178" rx="24" fill="${BLUSA}"/>
      <g id="${p}-anteD">
        <rect x="383" y="572" width="38" height="152" rx="19" fill="${PELE}"/>
        <circle cx="402" cy="728" r="26" fill="${PELE}"/>
        <rect id="${p}-dedo" x="394" y="736" width="16" height="44" rx="8" fill="${PELE}" opacity="0"/>
      </g>
    </g>
  </g>`
}
// pose: valores que o renderAt calcula a cada quadro
function pose (p, o) {
  const a = (id, attr, v) => $(`${p}-${id}`).setAttribute(attr, v)
  const resp = Math.sin(o.t * 2.4) // respiração
  a('corpo', 'transform', `translate(${o.x || 0} ${(o.y || 0) + resp * 3})`)
  a('tronco', 'transform', `translate(300 820) scale(1 ${1 + resp * 0.008}) translate(-300 -820)`)
  a('cabeca', 'transform', `translate(0 ${o.cabY || 0}) rotate(${o.cab || 0} 300 340)`)
  const abre = o.olho ?? 1
  for (const [id, cx] of [['olhoL', 264], ['olhoR', 336]]) a(id, 'transform', `translate(${o.olhar || 0} 0) translate(${cx} 236) scale(1 ${abre}) translate(${-cx} -236)`)
  const pre = o.preoc || 0
  a('sobL', 'transform', `translate(0 ${-pre * 6}) rotate(${-pre * 14} 282 194)`)
  a('sobR', 'transform', `translate(0 ${-pre * 6}) rotate(${pre * 14} 318 194)`)
  const boca = o.boca || 'neutra'
  for (const b of ['neutra', 'sorriso', 'enjoo', 'triste']) a(`b-${b}`, 'opacity', b === boca ? 1 : 0)
  a('enjoo', 'opacity', (o.verde || 0) * 0.45)
  a('gota', 'opacity', o.gota || 0)
  a('espiral', 'opacity', o.espiral || 0)
  // braço esquerdo (lado esquerdo da tela) segura a garrafa
  const [oE, cE] = o.bracoE || [8, -150]
  a('bracoE', 'transform', `rotate(${oE} 198 420)`)
  a('anteE', 'transform', `rotate(${cE} 199 580)`)
  a('garrafa', 'transform', `rotate(${-(oE + cE)} 199 728) translate(0 ${o.garrafa === false ? 2000 : 0})`)
  const [oD, cD] = o.bracoD || [-6, 4]
  a('bracoD', 'transform', `rotate(${oD} 402 420)`)
  a('anteD', 'transform', `rotate(${cD} 402 580)`)
  a('dedo', 'opacity', o.aponta ? 1 : 0)
}
// piscar: a cada ~3,4 s (período fixo, então é sempre igual para o mesmo t); base < 1 = olhos pesados
const piscar = (t, base = 1, periodo = 3.4, fase = 1.1) => {
  const dist = Math.abs(((t - fase) % periodo + periodo) % periodo)
  const perto = Math.min(dist, periodo - dist)
  return perto < 0.09 ? base * (perto / 0.09) * 0.9 + 0.08 : base
}
