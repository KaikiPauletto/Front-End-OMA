# OMA — artigos gaúchos

Aplicativo mobile em React Native com Expo, escrito em JavaScript. Esta primeira base contém uma vitrine demonstrativa e o fluxo inicial de boas-vindas, login e cadastro. A autenticação e o cadastro ainda não se comunicam com o backend.

## Executar

```bash
npm install
npm start
```

Abra o projeto no Expo Go lendo o QR code do terminal. Os comandos `npm run android` e `npm run ios` também estão disponíveis.

## Estrutura

- `App.js`: inicialização do Expo e provedores globais.
- `src/navigation`: navegação por abas e telas empilhadas com React Navigation.
- `src/screens`: boas-vindas, login, cadastro, início, categorias, subcategorias, catálogo de produtos, detalhes, sacola, checkout, pedidos e perfil.
- `src/components`: componentes reutilizáveis de produto, quantidade e estados vazios.
- `src/contexts/CartContext.js`: estado compartilhado da sacola.
- `src/data/products.js`: catálogo local de demonstração; substituir pelos dados retornados pela API.
- `src/data/categories.js`: categorias e subcategorias demonstrativas; substituir pela taxonomia administrada pelo backend quando o contrato estiver definido.
- `src/components/CartAddedBar.js`: confirmação visual após adicionar um produto à sacola.
- `src/components/ProductImage.js`: exibe fotos dos produtos com fallback quando a origem remota não responde.
- `src/services/apiClient.js`: cliente HTTP genérico, aguardando os contratos reais da API.
- `src/config/appConfig.js`: configurações do aplicativo, incluindo o modo de demonstração.
- `src/utils/enterDemoMode.js`: navegação temporária para a loja durante a demonstração.

## Integração futura

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_URL` para a URL base fornecida pela equipe do backend. Variáveis `EXPO_PUBLIC_` ficam disponíveis no aplicativo e não devem conter segredos.

Endpoints, formatos de payload, autenticação e cálculo de frete ainda não foram definidos, portanto nenhum contrato de API foi presumido. A camada de serviços deve ser implementada quando esses contratos estiverem disponíveis. Preços e estoques do catálogo atual são apenas dados demonstrativos: o backend deverá revalidá-los. A interface não confirma pedidos nem pagamentos.

Produtos `UNITÁRIO` permanecem limitados a uma unidade; produtos `QUANTITATIVO` respeitam o estoque e o limite máximo disponível no catálogo de demonstração. Essas verificações de interface não substituem a validação do backend.


## Fluxo de acesso em modo de demonstração

Ao iniciar, o aplicativo abre a tela **Bem-vindo**. Nela, é possível acessar o formulário de login ou de cadastro. Enquanto `DEMO_MODE` estiver como `true` em `src/config/appConfig.js`, os botões **Entrar** e **Criar conta** abrem a loja sem validar os campos e sem enviar ou armazenar dados.

Esse comportamento existe somente para testar as telas e a navegação. Ele **não realiza autenticação, não cria uma conta e não representa o fluxo definitivo**. O cadastro público deve criar clientes com perfil `CLIENTE` (RN05), e o login real deve exigir credenciais válidas (RN09), mantendo a sessão conforme RN11. Antes de integrar o backend, a equipe deverá implementar esses fluxos conforme os contratos reais da API. Para desativar o bypass demonstrativo, altere `DEMO_MODE` para `false` e implemente a autenticação/cadastro reais.


## Padrão visual e navegação atualizados

- `src/theme/colors.js` reúne os tokens cromáticos alinhados ao Figma.
- `src/theme/typography.js` centraliza famílias e tamanhos tipográficos. Os nomes Inter e EB Garamond do Figma estão representados temporariamente pelas famílias nativas sem/serif; os arquivos de fonte ainda não foram adicionados.
- `src/components/AppButton.js` é o botão reutilizável para ações primárias e contornadas.
- `src/components/AppHeader.js` implementa o cabeçalho compartilhado; a marca textual provisória mantém o tratamento `oma.` usado na primeira versão do protótipo.
- `src/components/SectionTitle.js` padroniza títulos e ações de seção.
- `src/components/ProductCard.js` segue a proporção visual do card do Figma e continua respeitando o tipo e o estoque por meio do `CartContext`.
- `src/components/EditorialSection.js` encapsula a seção institucional “Nossas Raízes”.
- A navegação inferior possui `Home`, `Carrinho` e `Conta`. A tela `Pedidos` está aninhada na área `Conta`.
- O menu no cabeçalho da Home abre `Categorias`; uma categoria abre `Subcategorias`; selecionar uma subcategoria abre `Produtos`.
- A pesquisa da Home abre `Produtos` com o termo informado. `Ver todos` em `Mais Vendidos` abre o catálogo ordenado pela classificação demonstrativa de vendas.
- A tela `Produtos` apresenta grade de duas colunas, busca, filtros de categoria/subcategoria e ordenação.
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
