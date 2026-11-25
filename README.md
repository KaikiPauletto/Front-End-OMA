# OMA — artigos gaúchos

Aplicativo mobile em React Native com Expo, escrito em JavaScript. Autenticação, catálogo e carrinho do cliente usam o API Gateway; o checkout e os pedidos continuam demonstrativos nesta etapa.

## Executar

```bash
npm install
npm start
```

Abra o projeto no Expo Go lendo o QR code do terminal. Os comandos `npm run android` e `npm run ios` também estão disponíveis.

## Estrutura

- `App.js`: inicialização do Expo e provedores globais.
- `src/navigation`: navegação por abas e telas empilhadas com React Navigation.
- `src/screens`: boas-vindas, login, cadastro, início, categorias, subcategorias, catálogo de produtos, detalhes, página institucional da OMA, sacola, checkout, pedidos e perfil.
- `src/components`: componentes reutilizáveis de produto, quantidade e estados vazios.
- `src/contexts/CartContext.js`: estado compartilhado da sacola persistida da sessão atual de CLIENTE.
- `src/data/products.js`: dados demonstrativos mantidos para fluxos locais que ainda não consomem a API.
- `src/data/categories.js`: taxonomia demonstrativa mantida para fluxos que ainda não consomem a API.
- `src/components/CartAddedBar.js`: confirmação visual após adicionar um produto à sacola.
- `src/components/ProductImage.js`: exibe fotos dos produtos com fallback quando a origem remota não responde.
- `src/services/apiClient.js`: cliente HTTP para a URL-base do API Gateway.
- `src/services/cartService.js`: consulta e mutações autenticadas do carrinho remoto, com validação lossless dos IDs e saldos inteiros.
- `src/services/productService.js`: listagem pública paginada, busca, filtros, ordenação, detalhe por ID, consultas públicas/administrativas de categorias e subcategorias e operações autenticadas de catálogo.
- `src/services/authService.js`: integração dos fluxos de cadastro, login e logout com a API de autenticação.
- `src/contexts/AuthContext.js`: usuário e token da sessão mantidos somente em memória.

## Integração com o backend

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` para a URL-base do API Gateway fornecida pela equipe do backend. No Expo Go, configure um host acessível pelo dispositivo; `localhost` pode apontar para o próprio dispositivo. Variáveis `EXPO_PUBLIC_` ficam disponíveis no aplicativo e não devem conter segredos.

Cadastro, login e logout seguem os contratos documentados em `API.md`. O cadastro cria uma conta de cliente e não autentica automaticamente; o JWT de login é mantido somente em memória e enviado como Bearer apenas em requisições autenticadas. A listagem pública, busca, filtros por categoria/subcategoria e faixa de preço, ordenação e consulta de detalhes usam os endpoints públicos documentados em `API.md`. Administradores podem criar produtos em `POST /ws/products`, editar em `PUT /ws/products/{id}`, ativar/desativar em `PATCH /ws/products/{id}/status` e consultar a aba Vendas por `GET /ws/products`, filtrando por `ACTIVE`, `INACTIVE` ou `ALL` (padrão `ACTIVE`). Os detalhes abertos pela aba Vendas usam `GET /ws/products/{id}` e consultam o estoque real em `GET /ws/inventory/{productId}`; ambas as consultas administrativas usam o JWT de administrador. A lista da aba Vendas não exibe quantidades de estoque, que são apresentadas nos detalhes administrativos do produto. Categorias e subcategorias são carregadas pela API. Os cards administrativos oferecem atalho para edição. No cadastro administrativo, o frontend cria o produto, registra o estoque e, para quantidade inicial positiva, registra uma entrada; quantidade zero cria apenas o registro de estoque, com saldo físico zerado. As etapas não são atômicas: em falhas parciais, a tela mantém o ID e a etapa pendente e não repete automaticamente operações POST de resultado incerto; a conferência deve ser manual. O cadastro e a edição administrativa permitem anexar até oito imagens por produto; a primeira imagem enviada é principal, e os detalhes exibem a galeria retornada pela API.

Administradores acessam **Gerenciar categorias** em `Conta`. A listagem usa o JWT administrativo para incluir categorias e subcategorias ativas e inativas; consultas públicas e de clientes continuam exibindo apenas as ativas. A tela permite criar, editar, ativar e desativar categorias e subcategorias, além de mover uma subcategoria para outra categoria ativa. Desativar uma categoria ou subcategoria também oculta seus produtos do catálogo público, conforme o backend.

A aba administrativa `Estoque` lista somente registros de inventário existentes e permite filtrar por tipo de produto e indicador de estoque baixo. A aba `Movimentações` permite consultar as movimentações com filtros por produto, tipo e período; ambas são paginadas. Os detalhes administrativos de cada produto permitem registrar um estoque ainda ausente, fazer entradas, saídas manuais, ajustes de saldo e alterar o limite de estoque baixo, além de consultar o histórico daquele produto. As escritas são confirmadas pelo backend antes de atualizar os dados exibidos. Quando uma escrita tem resultado incerto, o aplicativo bloqueia novas operações e oferece uma consulta de saldo e histórico para reconciliação, sem repetir a requisição automaticamente. Valores inteiros de estoque e movimentação usam parsing lossless para preservar a faixa de `long` de 64 bits do backend.

### Carrinho e checkout

O carrinho de CLIENTE é carregado e atualizado pelos endpoints públicos `GET /ws/cart`, `POST /ws/cart/items`, `PATCH /ws/cart/items/{productId}` e `DELETE /ws/cart/items/{productId}`, usando o JWT do AuthContext. O POST substitui a quantidade desejada; ao adicionar novamente um produto `MULTI_UNIT`, o frontend calcula o total desejado antes de enviar o upsert. O carrinho não utiliza preços ou disponibilidade demonstrativos como fallback. IDs e saldos inteiros longos são preservados pelo parser lossless. Produtos locais/demonstrativos com variantes não são enviados ao carrinho persistente porque o contrato atual não contém `variantId`.

O checkout envia somente IDs, quantidades e endereço para `POST /ws/orders`, usando `Idempotency-Key` para permitir retentativas sem duplicar pedidos. O servidor valida os produtos, calcula o preço e o frete e reserva o estoque; somente após a criação confirmada do pedido o app limpa a sacola. O pagamento é iniciado por `POST /ws/payments/orders/{orderId}/checkout-session` e aberto na página hospedada do Stripe; dados de cartão e segredos não passam pelo app. O status é consultado em `GET /ws/payments/orders/{orderId}` e os pedidos persistidos são carregados por `GET /ws/orders`. O Stripe Checkout documentado está em modo de teste e aceita cartão. O `NavigationContainer` reconhece `oma://payment/success` e `oma://payment/cancel`; configure as URLs de sucesso/cancelamento do Payment API para esses endereços. A aprovação depende do webhook do Stripe, não do redirecionamento.

Se uma inclusão na sacola for recusada por conflito de estoque (`409`), o app consulta novamente a sacola automaticamente para reconciliar quantidades e liberar novas tentativas sem exigir atualização manual. A API pública atual do catálogo não inclui disponibilidade de estoque; ocultar produtos esgotados nas listagens requer que o backend exponha essa informação ou ofereça um filtro público de disponibilidade.

Produtos `SINGLE_UNIT` permanecem limitados a uma unidade e produtos `MULTI_UNIT` respeitam a disponibilidade retornada pelo backend. Os modelos locais em `src/data/products.js` continuam demonstrativos e não são fonte de preço ou estoque para o carrinho persistente.


## Fluxo de acesso

Ao iniciar sem sessão, o aplicativo abre a tela **Bem-vindo**, com opções de login e cadastro. O cadastro envia nome, e-mail e senha ao API Gateway; após a confirmação de sucesso, direciona diretamente para o login com o e-mail preenchido e uma mensagem de confirmação. O cadastro não autentica automaticamente. O login valida as credenciais no backend e mantém o usuário e o JWT em memória. Ao sair, o aplicativo tenta revogar o token no Gateway e encerra a sessão local; se não houver confirmação do servidor, informa essa condição sem afirmar que a revogação ocorreu.


## Padrão visual e navegação atualizados

- `src/theme/colors.js` reúne os tokens cromáticos alinhados ao Figma.
- `src/theme/typography.js` centraliza famílias e tamanhos tipográficos. Os nomes Inter e EB Garamond do Figma estão representados temporariamente pelas famílias nativas sem/serif; os arquivos de fonte ainda não foram adicionados.
- `src/components/AppButton.js` é o botão reutilizável para ações primárias e contornadas.
- `src/components/BrandLogo.js` centraliza as composições oficiais em SVG usadas nas telas Bem-vindo, Login, Cadastro e no cabeçalho da loja. O transformador Metro entrega o markup original ao `SvgXml`, preservando imagens Base64, máscaras e filtros.
- `src/components/AppHeader.js` implementa o cabeçalho compartilhado e apresenta a composição horizontal oficial da loja quando não há seta de voltar; os cabeçalhos de navegação mantêm seus títulos e controles atuais.
- `src/components/SectionTitle.js` padroniza títulos e ações de seção.
- `src/components/ProductCard.js` segue a proporção visual do card do Figma; os detalhes de produtos públicos usam o carrinho persistente e a disponibilidade validada pelo backend.
- `src/components/EditorialSection.js` encapsula a seção institucional “Nossas Raízes”.
- O botão “Conheça a OMA” abre `src/screens/AboutOMAScreen.js`, com a história do projeto e seus quatro criadores.
- A navegação inferior possui `Home`, `Carrinho` e `Conta`. A tela `Pedidos` está aninhada na área `Conta`.
- A Home e a tela `Produtos` listam produtos paginados retornados pela API.
- O menu de categorias e os filtros de `Produtos` usam categorias/subcategorias retornadas pela API; a tela também filtra por faixa de preço.
- A pesquisa da Home abre `Produtos` com o termo informado; a busca e a ordenação são aplicadas no backend.
- Em `Detalhes do Produto`, após adicionar com sucesso à sacola, aparece a barra `Seguir para o carrinho`.

### Imagens e dados demonstrativos

As fotografias de produto utilizadas nesta versão são imagens remotas publicadas por lojas e fornecedores de artigos para chimarrão. Elas são referências visuais para o protótipo e não representam cadastro, preço, estoque ou autorização comercial da OMA. Antes de uma publicação pública/comercial, substitua-as por fotos próprias ou por imagens para as quais o grupo tenha autorização de uso e, preferencialmente, hospede os arquivos em um serviço controlado pelo projeto. Algumas lojas podem bloquear carregamento externo (hotlink), e URLs remotas podem mudar.

As referências de catálogo usadas para nomes e organização foram consultadas em lojas especializadas, incluindo Banca 2 Rancho Nativo, que organiza o catálogo em categorias como Erva-mate, Cuias, Bombas, Garrafa Térmica, Mateiras, Porta erva-mate, Acessórios e Combos. A taxonomia específica da OMA continua sendo demonstrativa e deve ser confirmada pelo grupo/backend.

Imagens atuais (fontes consultadas):
- Cuia de madeira imbuia: [Banca 2 — Cuia de Madeira Imbuia Média](https://banca2.com.br/produtos/cuia-de-madeira-imbuia-media-para-chimarrao/).
- Cuia com virola de alpaca: [Gauchos Online — Cuia tradicional com virola de alpaca](https://www.gauchosonline.com.br/cuias-de-chimarrao/).
- Cuia Getulinho: [Cuia Sul — Cuia Getulinho com virola de alpaca](https://cuiasul.lojavirtualnuvem.com.br/produtos/cuia-getulinho-com-virola-de-alpaca-natural-1020-ubv4f/).
- Cuia Bago de Touro: [Casa do Gaúcho — Cuia Bago de Touro](https://www.casadogaucho.com/chimarrao-e-acessorios/cuias/cuia-bago-de-touro).
- Bomba em alpaca: [Gauchos Online — Bomba artesanal de alpaca](https://www.gauchosonline.com.br/bombas-de-chimarrao/alpaca/bomba-de-chimarrao-de-alpaca-artesanal).
- Mateira em couro: [TCHÁFINO — Mateira modelo Patroa](https://www.tchafino.com.br/mateirapatroacaramelo).
- Porta-erva com forro em couro: [Indumentária Gaúcha — Porta-erva](https://www.indumentariagaucha.com.br/chimarrao/acessorios/porta-erva-forro-em-couro).
- Erva-mate: [Gauchos Online — Erva-mate Galo Véio Tradicional 1kg](https://www.gauchosonline.com.br/erva-mate/chimarrao/erva-mate-galo-veio-tradicional-1kg).
- Garrafa térmica: [Banca 2 — Garrafa Termolar Lúmina 1L](https://banca2.com.br/produtos/garrafa-termica-lumina-1l-dourada-termolar-para-chimarrao/).
- Banner: [Chimarrão do Gaúcho.jpg](https://commons.wikimedia.org/wiki/File:Chimarr%C3%A3o_do_Ga%C3%BAcho.jpg), por Cesar Vieira, CC BY-SA 4.0.
- Seção editorial: [Mate gaucho.jpg](https://commons.wikimedia.org/wiki/File:Mate_gaucho.jpg), por Azeitona amk, CC BY-SA 4.0. Manter as atribuições e observar os termos da licença ao redistribuir.

A tab bar, o cabeçalho, a grade de produtos e a estrutura da Home foram adaptados aos frames de 390 px do Figma. A altura do banner é responsiva para telas mais estreitas. O comportamento e a geometria ainda devem ser validados em aparelhos com diferentes áreas seguras.
