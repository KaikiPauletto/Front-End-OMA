// Taxonomia demonstrativa do catálogo OMA.
// As categorias/subcategorias reais devem ser carregadas do backend quando a API estiver definida.
export const categories = [
  {
    id: 'cuias',
    name: 'Cuias',
    singular: 'Cuia',
    icon: 'cafe-outline',
    description: 'Modelos artesanais para acompanhar o teu mate.',
    subcategories: [
      { id: 'cuia-porongo', name: 'Cuias de porongo' },
      { id: 'cuia-virola-alpaca', name: 'Cuias com virola lateral em alpaca' },
      { id: 'cuia-getulinho', name: 'Cuia Getulinho' },
      { id: 'cuia-bago', name: 'Cuia Bago / Bago de Touro' },
      { id: 'cuia-madeira', name: 'Cuias de madeira' },
      { id: 'cuia-argentina-uruguaia', name: 'Cuias argentinas e uruguaias' },
      { id: 'cuia-ceramica', name: 'Cuias de cerâmica' },
      { id: 'cuia-personalizada', name: 'Cuias personalizadas' },
      { id: 'cuia-terere', name: 'Cuias para tereré' },
    ],
  },
  {
    id: 'bombas',
    name: 'Bombas',
    singular: 'Bomba',
    icon: 'hardware-chip-outline',
    description: 'Bombas e filtros para diferentes estilos de mate.',
    subcategories: [
      { id: 'bomba-aco-comum', name: 'Bombas de aço comum' },
      { id: 'bomba-inox', name: 'Bombas de aço inoxidável' },
      { id: 'bomba-prata', name: 'Bombas de prata' },
      { id: 'bomba-alpaca', name: 'Bombas de alpaca' },
    ],
  },
  {
    id: 'mateiras',
    name: 'Mateiras',
    singular: 'Mateira',
    icon: 'briefcase-outline',
    description: 'Praticidade para levar o teu kit de chimarrão.',
    subcategories: [
      { id: 'mateira-lona', name: 'Mateiras de lona' },
      { id: 'mateira-couro', name: 'Mateiras em couro' },
      { id: 'mateira-veicular', name: 'Suportes e mateiras veiculares' },
    ],
  },
  {
    id: 'termicas',
    name: 'Térmicas',
    singular: 'Térmica',
    icon: 'thermometer-outline',
    description: 'Garrafas térmicas para conservar a temperatura da água.',
    subcategories: [
      { id: 'termica-1l', name: 'Garrafas térmicas 1 litro' },
      { id: 'termica-pressao', name: 'Térmicas de pressão' },
      { id: 'termica-couro', name: 'Térmicas com revestimento' },
    ],
  },
  {
    id: 'erva-mate',
    name: 'Erva-mate',
    singular: 'Erva-mate',
    icon: 'leaf-outline',
    description: 'Opções tradicionais, puras e com diferentes moagens.',
    subcategories: [
      { id: 'erva-tradicional', name: 'Erva-mate tradicional' },
      { id: 'erva-moida-grossa', name: 'Moída grossa' },
      { id: 'erva-pura-folha', name: 'Pura folha' },
      { id: 'erva-organica', name: 'Orgânica' },
      { id: 'erva-saborizada', name: 'Saborizadas' },
    ],
  },
  {
    id: 'acessorios',
    name: 'Acessórios',
    singular: 'Acessório',
    icon: 'construct-outline',
    description: 'Peças para organizar, preparar e cuidar do teu mate.',
    subcategories: [
      { id: 'porta-erva', name: 'Porta erva-mate' },
      { id: 'suportes', name: 'Suportes para cuia' },
      { id: 'cevadors', name: 'Cevadores e acessórios de preparo' },
      { id: 'limpeza', name: 'Escovas e itens de limpeza' },
    ],
  },
  {
    id: 'combos',
    name: 'Combos',
    singular: 'Combo',
    icon: 'gift-outline',
    description: 'Conjuntos para presentear ou montar teu kit.',
    subcategories: [
      { id: 'kit-chimarrao', name: 'Kits de chimarrão' },
      { id: 'kit-presente', name: 'Kits para presente' },
    ],
  },
];

export function getCategoryById(categoryId) {
  return categories.find((category) => category.id === categoryId) ?? null;
}

export function getCategoryLabel(categoryId) {
  return getCategoryById(categoryId)?.name ?? 'Produtos';
}

export function getSubcategoryById(categoryId, subcategoryId) {
  return getCategoryById(categoryId)?.subcategories.find(
    (subcategory) => subcategory.id === subcategoryId,
  ) ?? null;
}
