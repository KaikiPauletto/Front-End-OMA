import { createContext, useContext, useMemo, useState } from 'react';

const SellerProductsContext = createContext(null);

const initialSellerProducts = [
  {
    id: 'seller-cuia-artesanal',
    name: 'Cuia artesanal de porongo',
    quantity: 3,
    category: 'cuias',
    description: 'Cuia artesanal com acabamento natural.',
    image: {
      uri: 'https://images.tcdn.com.br/img/img_prod/1149218/cuia_de_chimarro_getulinho_virola_de_alpaca_1_20260528164346_f831a6a80106.jpg',
    },
  },
  {
    id: 'seller-bomba-inox',
    name: 'Bomba de inox',
    quantity: 0,
    category: 'bombas',
    description: 'Bomba de inox vendida em um pedido de demonstração.',
    image: {
      uri: 'https://images.colombo.com.br/produtos/4241688/4241688_Bomba_De_Chimarrao_Aco_Inox_304_Desmontavel_Com_Escovinha_10365899_z.jpg',
    },
  },
];

export function SellerProductsProvider({ children }) {
  const [products, setProducts] = useState(initialSellerProducts);

  function addProduct(product) {
    setProducts((currentProducts) => [
      { ...product, id: `seller-product-${Date.now()}` },
      ...currentProducts,
    ]);
  }

  const value = useMemo(() => ({ products, addProduct }), [products]);

  return (
    <SellerProductsContext.Provider value={value}>
      {children}
    </SellerProductsContext.Provider>
  );
}

export function useSellerProducts() {
  const context = useContext(SellerProductsContext);
  if (!context) {
    throw new Error('useSellerProducts deve ser usado dentro de SellerProductsProvider.');
  }
  return context;
}
