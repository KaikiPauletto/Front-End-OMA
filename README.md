# OMA — artigos gaúchos

Aplicativo mobile em React Native com Expo, escrito em JavaScript. A autenticação, o cadastro, o logout e a consulta do catálogo usam o API Gateway; carrinho e checkout permanecem demonstrativos nesta etapa.

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
- `src/contexts/CartContext.js`: estado compartilhado da sacola.
- `src/data/products.js`: dados demonstrativos mantidos para fluxos locais que ainda não consomem a API.
- `src/data/categories.js`: taxonomia demonstrativa mantida para fluxos que ainda não consomem a API.
- `src/components/CartAddedBar.js`: confirmação visual após adicionar um produto à sacola.
- `src/components/ProductImage.js`: exibe fotos dos produtos com fallback quando a origem remota não responde.
- `src/services/apiClient.js`: cliente HTTP para a URL-base do API Gateway.
- `src/services/productService.js`: listagem pública paginada, busca, filtros, ordenação, detalhe por ID, consultas públicas de categorias/subcategorias e operações autenticadas de produtos, incluindo listagem e detalhe administrativos.
- `src/services/authService.js`: integração dos fluxos de cadastro, login e logout com a API de autenticação.
- `src/contexts/AuthContext.js`: usuário e token da sessão mantidos somente em memória.

## Integração com o backend

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` para a URL-base do API Gateway fornecida pela equipe do backend. No Expo Go, configure um host acessível pelo dispositivo; `localhost` pode apontar para o próprio dispositivo. Variáveis `EXPO_PUBLIC_` ficam disponíveis no aplicativo e não devem conter segredos.

Cadastro, login e logout seguem os contratos documentados em `API.md`. O cadastro cria uma conta de cliente e não autentica automaticamente; o JWT de login é mantido somente em memória e enviado como Bearer apenas em requisições autenticadas. A listagem pública, busca, filtros por categoria/subcategoria e faixa de preço, ordenação e consulta de detalhes usam os endpoints públicos documentados em `API.md`. Administradores podem criar produtos em `POST /ws/products`, editar em `PUT /ws/products/{id}`, ativar/desativar em `PATCH /ws/products/{id}/status` e consultar a aba Vendas por `GET /ws/products`, filtrando por `ACTIVE`, `INACTIVE` ou `ALL` (padrão `ACTIVE`). Os detalhes abertos pela aba Vendas usam `GET /ws/products/{id}`; ambas as consultas administrativas usam o JWT de administrador. Categorias e subcategorias são carregadas pela API. Os cards administrativos oferecem atalho para edição. A tela Vendas não exclui produtos nem exibe quantidades de estoque. No cadastro administrativo, o frontend cria o produto, registra o estoque e, para quantidade inicial positiva, registra uma entrada; quantidade zero cria apenas o registro de estoque, com saldo físico zerado. As etapas não são atômicas: em falhas parciais, a tela mantém o ID e a etapa pendente e não repete automaticamente operações POST de resultado incerto; a conferência deve ser manual. A imagem é opcional e deve ser informada como URL ou referência; upload de arquivo não está integrado.

Produtos `UNITÁRIO` permanecem limitados a uma unidade; produtos `QUANTITATIVO` respeitam o estoque e o limite máximo disponível no catálogo de demonstração. Essas verificações de interface não substituem a validação do backend.


## Fluxo de acesso

Ao iniciar sem sessão, o aplicativo abre a tela **Bem-vindo**, com opções de login e cadastro. O cadastro envia nome, e-mail e senha ao API Gateway e, após sucesso, direciona para o login. O login valida as credenciais no backend e mantém o usuário e o JWT em memória. Ao sair, o aplicativo tenta revogar o token no Gateway e encerra a sessão local; se não houver confirmação do servidor, informa essa condição sem afirmar que a revogação ocorreu.


## Padrão visual e navegação atualizados

- `src/theme/colors.js` reúne os tokens cromáticos alinhados ao Figma.
- `src/theme/typography.js` centraliza famílias e tamanhos tipográficos. Os nomes Inter e EB Garamond do Figma estão representados temporariamente pelas famílias nativas sem/serif; os arquivos de fonte ainda não foram adicionados.
- `src/components/AppButton.js` é o botão reutilizável para ações primárias e contornadas.
- `src/components/AppHeader.js` implementa o cabeçalho compartilhado; a marca textual provisória mantém o tratamento `oma.` usado na primeira versão do protótipo.
- `src/components/SectionTitle.js` padroniza títulos e ações de seção.
- `src/components/ProductCard.js` segue a proporção visual do card do Figma e continua respeitando o tipo e o estoque por meio do `CartContext`.
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
