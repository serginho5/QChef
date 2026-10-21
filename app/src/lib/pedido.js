// Pedido de receita em andamento (o que a pessoa escolheu no Início), guardado na sessão
const CHAVE = 'qchef:pedido'
export function salvarPedido(p) { try { sessionStorage.setItem(CHAVE, JSON.stringify(p)) } catch { /* ignore */ } }
export function lerPedido() { try { return JSON.parse(sessionStorage.getItem(CHAVE)) } catch { return null } }
