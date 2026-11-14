import { createContext, useContext, useMemo, useState } from 'react';
import { products as initialProducts } from '../data/products';

const ProductCatalogContext = createContext(null);

export function ProductCatalogProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);

  function updateProduct(productId, updates) {
    const productExists = products.some((product) => product.id === productId);
    if (!productExists) {
      return false;
    }

    setProducts((currentProducts) => currentProducts.map((product) => (
      product.id === productId ? { ...product, ...updates } : product
    )));
    return true;
  }

  const value = useMemo(
    () => ({ products, updateProduct }),
    [products],
  );

  return (
    <ProductCatalogContext.Provider value={value}>
      {children}
    </ProductCatalogContext.Provider>
  );
}

export function useProductCatalog() {
  const context = useContext(ProductCatalogContext);
  if (!context) {
    throw new Error('useProductCatalog deve ser usado dentro de ProductCatalogProvider.');
  }
  return context;
}
