export const categories = [
  { id: 'todos', label: 'Todos', icon: 'grid-outline' },
  { id: 'cuia', label: 'Cuias', icon: 'cafe-outline' },
  { id: 'termica', label: 'Térmicas', icon: 'water-outline' },
  { id: 'bomba', label: 'Bombas', icon: 'leaf-outline' },
  { id: 'erva', label: 'Erva-mate', icon: 'nutrition-outline' },
  { id: 'artesanal', label: 'Artesanais', icon: 'sparkles-outline' },
];

export const products = [
  {
    id: 'cuia-imbuia',
    name: 'Cuia de imbuia',
    description: 'Cuia torneada em madeira de imbuia, com acabamento natural e feita para acompanhar muitos mates.',
    category: 'cuia',
    price: 89.9,
    type: 'QUANTITATIVO',
    stock: 12,
    maxPurchase: 4,
    emoji: '🧉',
    backdrop: '#E8D3B4',
    badge: 'Feito à mão',
    variants: [
      { id: 'natural', name: 'Natural', stock: 6, price: 89.9 },
      { id: 'escura', name: 'Escura', stock: 6, price: 94.9 },
    ],
  },
  {
    id: 'termica-couro',
    name: 'Térmica campeira',
    description: 'Garrafa térmica com revestimento em couro sintético e bico de precisão para servir o mate.',
    category: 'termica',
    price: 149.9,
    type: 'QUANTITATIVO',
    stock: 8,
    maxPurchase: 2,
    emoji: '♨️',
    backdrop: '#D9C6AB',
    badge: 'Mais vendido',
  },
  {
    id: 'bomba-alpaca',
    name: 'Bomba de alpaca',
    description: 'Bomba com detalhes trabalhados e filtro removível. Um clássico para o ritual do chimarrão.',
    category: 'bomba',
    price: 64.9,
    type: 'QUANTITATIVO',
    stock: 15,
    emoji: '🥄',
    backdrop: '#DCE3D7',
  },
  {
    id: 'cuia-artesanal',
    name: 'Cuia artesanal única',
    description: 'Peça individual com acabamento artesanal. Cada unidade tem seus próprios veios e detalhes.',
    category: 'artesanal',
    price: 119.9,
    type: 'UNITÁRIO',
    stock: 1,
    emoji: '🏺',
    backdrop: '#EBD8C7',
    badge: 'Peça única',
  },
  {
    id: 'erva-mate',
    name: 'Erva-mate nativa',
    description: 'Erva-mate de moagem tradicional, embalada para preservar o frescor e o sabor.',
    category: 'erva',
    price: 22.9,
    type: 'QUANTITATIVO',
    stock: 30,
    maxPurchase: 10,
    emoji: '🌿',
    backdrop: '#D9E5D2',
    badge: 'Da nossa terra',
  },
  {
    id: 'kit-mate',
    name: 'Kit mate de viagem',
    description: 'Um conjunto compacto para levar a tradição gaúcha com você por onde for.',
    category: 'termica',
    price: 179.9,
    type: 'QUANTITATIVO',
    stock: 5,
    maxPurchase: 2,
    emoji: '🎒',
    backdrop: '#E4D9C9',
  },
];

export function getAvailableProducts() {
  return products.filter((product) =>
    product.active !== false &&
    (product.variants?.length
      ? product.variants.some((variant) => variant.stock > 0)
      : product.stock > 0),
  );
}
