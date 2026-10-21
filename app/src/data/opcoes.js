// Listas fixas do app: atalhos de ingredientes, ambientes, filtros, alergias e restrições.
export const ATALHOS = ['Arroz', 'Ovo', 'Frango', 'Tomate', 'Queijo', 'Pão', 'Carne moída', 'Batata', 'Cebola', 'Macarrão', 'Leite', 'Banana']

export const AMBIENTES = [
  { id: 'frio', nome: 'Prato frio', icone: 'frio' },
  { id: 'fogao', nome: 'Fogão', icone: 'fogao' },
  { id: 'forno', nome: 'Forno', icone: 'forno' },
  { id: 'airfryer', nome: 'Airfryer', icone: 'airfryer' },
  { id: 'microondas', nome: 'Micro-ondas', icone: 'microondas' },
  { id: 'tantofaz', nome: 'Tanto faz', icone: 'tantofaz' },
]
export const nomeAmbiente = (id) => AMBIENTES.find((a) => a.id === id)?.nome || id
export const nomeAmbienteFrase = { frio: 'como prato frio', fogao: 'no fogão', forno: 'no forno', airfryer: 'na airfryer', microondas: 'no micro-ondas', tantofaz: '' }
export const artigoAmbiente = { frio: 'o prato frio', fogao: 'o fogão', forno: 'o forno', airfryer: 'a airfryer', microondas: 'o micro-ondas' }

export const FILTROS = [
  { id: 'pressa', nome: 'Estou com pressa', icone: 'raio' },
  { id: 'economico', nome: 'Econômico', icone: 'moeda' },
  { id: 'criativo', nome: 'Criativo', icone: 'brilho' },
]

export const ALERGIAS = ['Lactose', 'Glúten', 'Amendoim', 'Ovo', 'Frutos do mar', 'Soja', 'Castanhas']
export const RESTRICOES = ['Vegetariano', 'Vegano', 'Low carb', 'Sem açúcar', 'Sem carne de porco']
export const APARELHOS = [
  { id: 'fogao', nome: 'Fogão', icone: 'fogao' },
  { id: 'forno', nome: 'Forno', icone: 'forno' },
  { id: 'airfryer', nome: 'Airfryer', icone: 'airfryer' },
  { id: 'microondas', nome: 'Micro-ondas', icone: 'microondas' },
  { id: 'liquidificador', nome: 'Liquidificador', icone: 'liquidificador' },
  { id: 'pressao', nome: 'Panela de pressão', icone: 'pressao' },
]
