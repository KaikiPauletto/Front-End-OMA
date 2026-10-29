# OMA — artigos gaúchos

Aplicativo mobile em React Native com Expo, escrito em JavaScript. Esta primeira base contém uma vitrine demonstrativa e a estrutura inicial de navegação; ainda não se comunica com o backend.

## Executar

```bash
npm install
npm start
```

Abra o projeto no Expo Go lendo o QR code do terminal. Os comandos `npm run android` e `npm run ios` também estão disponíveis.

## Estrutura

- `App.js`: inicialização do Expo e provedores globais.
- `src/navigation`: navegação por abas e telas empilhadas com React Navigation.
- `src/screens`: início/catálogo, detalhes, sacola, checkout, login, pedidos e perfil.
- `src/components`: componentes reutilizáveis de produto, quantidade e estados vazios.
- `src/contexts/CartContext.js`: estado compartilhado da sacola.
- `src/data/products.js`: catálogo local de demonstração; substituir pelos dados retornados pela API.
- `src/services/apiClient.js`: cliente HTTP genérico, aguardando os contratos reais da API.

## Integração futura

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` para a URL base fornecida pela equipe do backend. Variáveis `EXPO_PUBLIC_` ficam disponíveis no aplicativo e não devem conter segredos.

Endpoints, formatos de payload, autenticação e cálculo de frete ainda não foram definidos, portanto nenhum contrato de API foi presumido. A camada de serviços deve ser implementada quando esses contratos estiverem disponíveis. Preços e estoques do catálogo atual são apenas dados demonstrativos: o backend deverá revalidá-los. A interface não confirma pedidos nem pagamentos.

Produtos `UNITÁRIO` permanecem limitados a uma unidade; produtos `QUANTITATIVO` respeitam o estoque e o limite máximo disponível no catálogo de demonstração. Essas verificações de interface não substituem a validação do backend.
