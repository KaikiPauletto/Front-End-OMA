# OMA --- Contexto do Projeto e Regras de Negócio

> **Objetivo deste arquivo:** fornecer à IA de desenvolvimento o
> contexto funcional do OMA e as regras de negócio que devem ser
> respeitadas ao implementar ou alterar o aplicativo React Native.
>
> **Fonte:** documento `Regras_de_Negocio_OMA.pdf`, fornecido pela
> equipe.
>
> **Stack definida pela equipe:** aplicativo mobile em React Native executado com Expo Go; navegação com React Navigation; compartilhamento de estado com Context API quando apropriado; backend em Java com Spring Boot.
>
> **Importante:** este documento organiza as regras de negócio do PDF e complementa-as com as decisões técnicas fornecidas pela equipe. Ele não define endpoints, contratos de API, bibliotecas adicionais ou detalhes que ainda não foram especificados.

## 1. Contexto geral

O OMA é um sistema de comércio eletrônico com catálogo de produtos,
carrinho, checkout, pedidos, pagamento via Stripe em ambiente de testes,
frete e funcionalidades administrativas. O catálogo contempla produtos
com variações e produtos unitários, como peças artesanais individuais.

O aplicativo React Native é a interface cliente do sistema. As regras
críticas devem ser validadas pelo backend; o aplicativo não deve ser
tratado como autoridade para autenticação, autorização, preço, estoque,
cálculo de desconto ou confirmação de pagamento.

## 2. Stack e diretrizes de arquitetura

### 2.1. Aplicativo mobile

- **React Native + Expo Go:** desenvolver o aplicativo em React Native e manter a solução compatível com a execução e os recursos disponíveis no Expo Go. Antes de adicionar uma biblioteca nativa, verificar se ela é compatível com Expo Go; não presumir que módulos que exigem código nativo personalizado funcionarão.
- **React Navigation:** utilizar React Navigation para navegação entre telas. Organizar as rotas e os navegadores de forma clara, conforme os fluxos do aplicativo e a estrutura já existente no projeto.
- **Componentização:** componentizar tudo o que for possível e fizer sentido. Reutilizar componentes para elementos visuais e comportamentos compartilhados, evitando duplicação. Manter componentes pequenos, com responsabilidades claras, sem fragmentar desnecessariamente elementos muito simples ou específicos.
- **Context API:** utilizar React Context para compartilhar informações entre componentes quando isso for necessário e adequado, por exemplo, estado global compartilhado por diferentes áreas do aplicativo. Não colocar automaticamente todo estado no Context: estados locais e temporários devem permanecer no componente quando não precisarem ser compartilhados.
- **Separação de responsabilidades:** separar, de maneira coerente com a estrutura existente, telas, componentes reutilizáveis, navegação, contextos, serviços de comunicação com a API e funções auxiliares. Não criar uma estrutura excessivamente complexa sem necessidade.
- **Integração com API:** o aplicativo deve consumir os serviços do backend Java/Spring Boot por meio de APIs definidas. Não acessar diretamente o banco de dados a partir do aplicativo. Os endpoints, formatos de payload e tratamento de erros devem seguir o contrato real do backend, sem serem inventados.
- **Configuração:** URLs e outras configurações específicas de ambiente não devem ficar espalhadas pelo código. Usar uma abordagem de configuração compatível com Expo e com o projeto existente; nunca incluir segredos do backend no aplicativo mobile.

### 2.2. Backend

- O backend será desenvolvido em **Java com Spring Boot**.
- As regras de negócio críticas devem ser aplicadas e validadas no backend, mesmo quando também houver validação na interface.
- A integração do aplicativo deve respeitar os contratos de API realmente definidos pelo backend. Não presumir endpoints, DTOs, autenticação ou arquitetura interna sem consultar a documentação ou o código disponível.
- Conforme a regra RN109, se a solução utilizar microsserviços, a comunicação entre eles deve ocorrer por APIs definidas, sem acesso direto ao banco de dados de outro serviço.

### 2.3. Orientações para a IA de desenvolvimento

Ao trabalhar neste projeto:

1.  Preserve as regras identificadas por `RNxx` e não implemente
    comportamentos que as contradigam.
2.  Considere o backend como autoridade para validações críticas,
    permissões, preço final, estoque, descontos e confirmação de
    pagamento.
3.  Não confie em valores críticos enviados pelo aplicativo sem
    validação do backend.
4.  Diferencie produtos `UNITÁRIO` de produtos `QUANTITATIVO` em
    catálogo, seleção de quantidade e carrinho.
5.  Preserve o histórico dos pedidos, incluindo endereço, informações
    dos produtos, variações e frete no momento da compra.
6.  Respeite autenticação, perfil do usuário e isolamento dos dados de
    cada cliente.
7.  Evite inventar regras ausentes deste documento. Quando um
    comportamento não estiver definido, sinalize a lacuna e solicite uma
    decisão da equipe.
8.  Se uma mudança afetar uma regra de negócio, indique quais regras
    `RNxx` são impactadas.
9.  Não presuma endpoints, payloads, nomes de telas, arquitetura de
    navegação ou bibliotecas que não estejam documentados no
    repositório.
10. As regras de cupons e descontos estão identificadas no PDF como
    **"2º Plano"**; não as trate automaticamente como parte do primeiro
    escopo de entrega sem confirmação da equipe.

## 3. Cadastro de usuários

-   **RN01 --- Cadastro de cliente:** permitir cadastro de clientes com
    os dados obrigatórios definidos no formulário.
-   **RN02 --- Unicidade de e-mail:** não permitir dois usuários com o
    mesmo e-mail.
-   **RN03 --- Validação dos dados:** o backend deve validar os dados
    antes de criar o usuário.
-   **RN05 --- Perfil padrão:** clientes cadastrados pelo fluxo público
    recebem automaticamente o perfil `CLIENTE`.
-   **RN06 --- Cadastro administrativo:** o perfil `ADMINISTRADOR` não
    pode ser atribuído pelo cadastro público.
-   **RN07 --- E-mail como identificador:** o e-mail identifica o
    cliente no login tradicional; provedores externos, como Google
    OAuth, podem usar seu próprio fluxo de identificação.

## 4. Login e autenticação

-   **RN09 --- Credenciais válidas:** o login tradicional só pode
    ocorrer com credenciais válidas.
-   **RN10 --- Google OAuth:** permitir autenticação com Google OAuth.
-   **RN11 --- Sessão:** após autenticar, manter uma sessão/token válido
    para identificar o usuário em requisições protegidas.
-   **RN12 --- Encerramento da sessão:** o cliente pode encerrar a
    sessão a qualquer momento.

## 5. Catálogo e produtos

-   **RN15 --- Produto ativo:** apresentar no catálogo apenas produtos
    ativos e disponíveis para venda.
-   **RN16 --- Identificação do produto:** cada produto deve ter, no
    mínimo, identificação, nome, descrição, preço,
    categoria/subcategoria e informações de estoque.
-   **RN17 --- Atributos:** um produto pode possuir atributos
    configuráveis, como marca, material, tamanho, cor, capacidade,
    modelo ou outros definidos pelo administrador.
-   **RN18 --- Variações:** diferenças comercialmente relevantes devem
    poder ser representadas por variações. Cada variação pode ter preço
    e estoque próprios, quando aplicável.

### 5.1. Produtos `UNITÁRIO`

-   **RN19 --- Produto unitário:** representa uma peça individual, com
    disponibilidade máxima de uma unidade por item cadastrado. Peças
    visualmente diferentes são itens distintos.
-   **RN20 --- Quantidade:** a quantidade de um produto unitário no
    carrinho deve ser sempre limitada a `1`.
-   **RN21 --- Indisponibilidade após venda:** após a venda, o produto
    unitário não volta automaticamente ao estoque, exceto por operação
    administrativa ou processo de devolução/cancelamento que restaure
    sua disponibilidade.

### 5.2. Produtos `QUANTITATIVO`

-   **RN22 --- Produto por quantidade:** permite várias unidades em
    estoque, como erva-mate, térmicas ou bombas.
-   **RN23 --- Alteração de quantidade:** o cliente pode alterar a
    quantidade no carrinho sem ultrapassar a disponibilidade.
-   **RN24 --- Limite de compra:** o administrador pode definir uma
    quantidade máxima por cliente para um produto, quando necessário.

## 6. Estoque e reservas

-   **RN25 --- Estoque não negativo:** a quantidade disponível nunca
    pode ser negativa.
-   **RN26 --- Consulta de estoque:** o estoque deve refletir a
    disponibilidade atual de cada produto/variação.
-   **RN27 --- Reserva no checkout:** ao iniciar o checkout, os produtos
    devem ser temporariamente reservados para o cliente.
-   **RN28 --- Limite da reserva:** não reservar mais unidades do que as
    disponíveis.
-   **RN29 --- Expiração da reserva:** manter a reserva por no máximo 24
    horas; após esse período, o produto volta a ficar disponível.
-   **RN30 --- Liberação automática:** ao vencer a reserva, devolver
    automaticamente sua quantidade ao estoque disponível.
-   **RN32 --- Baixa definitiva:** realizar a baixa definitiva do
    estoque somente após a confirmação do pagamento.
-   **RN33 --- Concorrência:** compras simultâneas não podem vender
    quantidade superior à disponível.
-   **RN34 --- Histórico de estoque:** registrar operações relevantes,
    incluindo entrada, reserva, liberação e baixa, para rastreabilidade.

## 7. Categorias e subcategorias

-   **RN35 --- Categoria obrigatória:** todo produto deve estar
    associado a uma categoria.
-   **RN36 --- Subcategoria opcional:** uma categoria pode ter
    subcategorias; a associação do produto a uma subcategoria é opcional
    quando aplicável.
-   **RN37 --- Hierarquia:** cada subcategoria deve pertencer a uma
    categoria.
-   **RN38 --- Nome único:** não podem existir duas categorias ativas
    com o mesmo nome.
-   **RN40 --- Preservação histórica:** desativar uma
    categoria/subcategoria não deve apagar produtos ou pedidos
    históricos associados.
-   **RN41 --- Categoria desativada:** produtos associados a uma
    categoria desativada não devem ser vendidos até que a situação seja
    regularizada.

## 8. Carrinho

-   **RN42 --- Carrinho por cliente:** cada cliente deve ter um carrinho
    associado à sua conta.
-   **RN43 --- Adição de produtos:** somente produtos ativos e
    disponíveis podem ser adicionados.
-   **RN44 --- Produto unitário:** produtos `UNITÁRIO` aparecem no
    carrinho com quantidade `1`.
-   **RN45 --- Produto quantitativo:** produtos `QUANTITATIVO` podem ter
    quantidade maior que `1`, respeitando a disponibilidade.
-   **RN46 --- Estoque insuficiente:** impedir inclusão ou aumento de
    quantidade quando não houver estoque suficiente.
-   **RN48 --- Total do carrinho:** calcular o total usando preços
    válidos multiplicados pelas quantidades, considerando descontos
    aplicáveis.
-   **RN49 --- Carrinho vazio:** não permitir iniciar o checkout com o
    carrinho vazio.

## 9. Pedidos

-   **RN50 --- Criação do pedido:** criar pedido a partir de um checkout
    válido.

-   **RN51 --- Cliente associado:** todo pedido deve estar associado a
    um cliente.

-   **RN52 --- Endereço do pedido:** armazenar no pedido o endereço
    informado durante o checkout.

-   **RN53 --- Histórico do endereço:** alterações futuras no endereço
    cadastrado do cliente não podem alterar o endereço guardado em
    pedidos anteriores.

-   **RN54 --- Snapshot dos produtos:** preservar no pedido os dados
    relevantes dos produtos no momento da compra, como nome, preço,
    quantidade e variação.

-   **RN55 --- Status do pedido:** o estado deve refletir corretamente a
    etapa do pedido. Fluxo principal:

    `AGUARDANDO_PAGAMENTO → PAGAMENTO_APROVADO → EM_PREPARACAO → ENVIADO → ENTREGUE`

    Estados alternativos: `PAGAMENTO_RECUSADO` e `CANCELADO`.

-   **RN57 --- Administração de pedidos:** administradores podem
    consultar e gerenciar pedidos.

-   **RN58 --- Integridade:** o status deve refletir o resultado real do
    pagamento, estoque e demais etapas necessárias.

## 10. Pagamento

-   **RN59 --- Pagamento obrigatório:** só confirmar o pedido após a
    conclusão bem-sucedida do pagamento.
-   **RN60 --- Stripe:** processar pagamentos com Stripe no ambiente de
    testes.
-   **RN61 --- Backend como autoridade:** não considerar apenas dados
    recebidos do frontend para decidir se o pagamento foi aprovado.
-   **RN62 --- Pagamento aprovado:** após confirmação do Stripe,
    atualizar o pagamento e confirmar o pedido.
-   **RN63 --- Pagamento recusado:** se o pagamento for recusado, não
    confirmar o pedido.
-   **RN64 --- Pagamento pendente:** enquanto não houver confirmação
    definitiva, manter o pedido em estado de pagamento pendente.
-   **RN65 --- Idempotência:** repetir a mesma confirmação de pagamento
    não pode criar pedidos, baixar estoque ou executar operações
    duplicadas.
-   **RN66 --- Falha na integração:** falha de comunicação com o Stripe
    não confirma automaticamente o pedido.

## 11. Frete e entrega

-   **RN67 --- Frete obrigatório:** pedidos para entrega precisam ter
    método e valor de frete calculados antes da confirmação da compra.
-   **RN68 --- Cálculo por região:** calcular o frete considerando a
    região de destino configurada pelo sistema.
-   **RN69 --- Embalagem padrão:** o cálculo simplificado usa dimensões
    padrão de embalagem definidas pelo sistema.
-   **RN70 --- CEP:** o endereço deve conter dados suficientes para
    identificar a região de entrega.
-   **RN71 --- Serviço externo opcional:** uma API de transportadora ou
    Correios pode substituir o cálculo interno sem mudar as regras do
    pedido.
-   **RN72 --- Frete histórico:** salvar no pedido o valor de frete
    usado na compra; ele não deve mudar posteriormente.

## 12. Cupons e descontos --- segundo plano

> O PDF identifica esta seção como **"2º Plano"**.

-   **RN73 --- Cupom ativo:** somente cupons ativos podem ser usados.
-   **RN74 --- Validade:** cada cupom deve ter data inicial e final.
-   **RN75 --- Código único:** cada cupom deve ter código único.
-   **RN76 --- Tipo de desconto:** percentual ou valor fixo.
-   **RN77 --- Valor mínimo:** um cupom pode exigir valor mínimo de
    compra.
-   **RN78 --- Limite de utilização:** pode haver limite total e/ou por
    cliente.
-   **RN79 --- Cupom inválido:** rejeitar cupons inexistentes,
    expirados, inativos ou que não atendam às condições configuradas.
-   **RN80 --- Aplicação do desconto:** o backend calcula o desconto e o
    aplica ao total do pedido.
-   **RN81 --- Não cumulatividade:** por padrão, não permitir mais de um
    cupom por pedido.
-   **RN82 --- Promoção de produto:** promoções diretamente configuradas
    em produtos seguem regras próprias e não alteram o preço original
    armazenado.

## 13. Funcionalidades administrativas

-   **RN83 --- Acesso administrativo:** somente usuários autorizados com
    perfil `ADMINISTRADOR` podem acessar funcionalidades
    administrativas.
-   **RN84 --- Catálogo:** administrador pode criar, editar, ativar e
    desativar produtos.
-   **RN85 --- Categorias:** administrador pode criar, editar e
    desativar categorias e subcategorias.
-   **RN86 --- Atributos:** administrador pode criar e alterar atributos
    de produtos.
-   **RN87 --- Variações:** administrador pode criar, editar, ativar e
    desativar variações.
-   **RN88 --- Preços:** administrador pode definir e alterar preços.
-   **RN89 --- Estoque:** administrador pode consultar e atualizar
    quantidades disponíveis.
-   **RN90 --- Pedidos:** administrador pode consultar e atualizar
    pedidos conforme as operações permitidas.
-   **RN91 --- Analytics:** somente administradores podem acessar o
    dashboard analítico.
-   **RN92 --- Configuração sem alteração de código:** informações de
    negócio configuráveis devem poder ser alteradas pelo administrador
    sem modificar o código-fonte.

## 14. Cancelamentos

-   **RN93 --- Antes do pagamento:** pedidos ainda não pagos podem ser
    cancelados.
-   **RN94 --- Pagamento recusado:** pedido com pagamento recusado não
    deve ser confirmado e pode ser encerrado/cancelado.
-   **RN95 --- Liberação de estoque:** cancelar pedido/checkout com
    estoque reservado deve liberar a reserva.
-   **RN96 --- Após o pagamento:** após pagamento aprovado, o
    cancelamento depende do estado do pedido e de ação administrativa.
-   **RN98 --- Preservação:** não excluir fisicamente pedidos
    cancelados.
-   **RN99 --- Motivo e data:** registrar o motivo do cancelamento e a
    data da operação.

## 15. Segurança

-   **RN100 --- Autenticação:** recursos protegidos exigem autenticação.
-   **RN101 --- Autorização por perfil:** o backend deve verificar
    permissões antes de executar operações administrativas.
-   **RN102 --- Senhas protegidas:** nunca armazenar senhas em texto
    puro.
-   **RN103 --- Validação no backend:** validar dados críticos no
    backend, independentemente das validações do aplicativo.
-   **RN104 --- Proteção de preços:** o cliente não pode alterar pelo
    frontend o preço usado na criação do pedido.
-   **RN105 --- Proteção do estoque:** o cliente não pode manipular
    quantidades reservadas ou disponíveis por requisições não
    autorizadas.
-   **RN106 --- Segurança do pagamento:** a aprovação depende de
    confirmação validada pelo backend/Stripe.
-   **RN107 --- Isolamento entre usuários:** um cliente não pode
    consultar, alterar ou cancelar pedidos de outro cliente.
-   **RN108 --- Idempotência:** operações críticas, especialmente
    pagamento e baixa de estoque, devem ser idempotentes.
-   **RN109 --- Comunicação entre serviços:** microserviços devem se
    comunicar por APIs definidas, sem acesso direto ao banco de dados de
    outro serviço, conforme a arquitetura estabelecida.
-   **RN110 --- Logs:** operações importantes e erros devem gerar logs
    para rastreamento e diagnóstico.

## 16. Requisitos práticos para o frontend React Native

As regras abaixo traduzem as regras de negócio em cuidados de interface.
Não substituem as validações do backend.

### Catálogo e detalhes

-   Exibir somente produtos ativos/disponíveis retornados pelo sistema.
-   Apresentar as informações relevantes do produto, suas
    opções/variações e disponibilidade quando esses dados forem
    fornecidos.
-   Diferenciar claramente produtos `UNITÁRIO` e `QUANTITATIVO`.
-   Para produto `UNITÁRIO`, não oferecer seletor que permita quantidade
    acima de `1`.
-   Para produto `QUANTITATIVO`, limitar a quantidade pela
    disponibilidade e pelo limite de compra configurado.

### Carrinho e checkout

-   Associar o carrinho à conta autenticada do cliente.
-   Revalidar disponibilidade e valores ao atualizar o carrinho e ao
    iniciar checkout.
-   Não permitir checkout com carrinho vazio.
-   Mostrar os valores e o frete retornados pelo sistema; não tratar
    cálculos locais como valores oficiais.
-   Informar ao cliente quando um item estiver indisponível, quando a
    quantidade for ajustada ou quando uma reserva expirar, conforme os
    estados comunicados pelo backend.
-   Não presumir que iniciar checkout significa pagamento aprovado.

### Pedidos e pagamento

-   Exibir status conforme retornado pelo backend.
-   Tratar estados pendentes, recusados, cancelados e confirmados sem
    inferir aprovação no aplicativo.
-   Evitar ações repetidas na interface que possam disparar operações
    críticas duplicadas; a proteção definitiva de idempotência é do
    backend.
-   Mostrar os dados históricos do pedido conforme registrados no
    momento da compra.

### Sessão, acesso e segurança

-   Proteger as telas que exigem autenticação e lidar com sessão/token
    expirado.
-   Exibir telas administrativas apenas a usuários com perfil
    autorizado, sem substituir a autorização no backend.
-   Não armazenar nem registrar senhas em texto puro.
-   Não permitir que alterações de estado ou valores locais substituam a
    resposta oficial do backend.

## 17. Fluxos funcionais resumidos

### 17.1. Cadastro e acesso

1.  Cliente preenche os dados obrigatórios.
2.  Backend valida os dados e a unicidade do e-mail.
3.  Conta pública é criada com perfil `CLIENTE`.
4.  Cliente entra com e-mail/senha ou Google OAuth.
5.  Sistema mantém token/sessão para recursos protegidos.
6.  Cliente pode encerrar a sessão.

### 17.2. Compra

1.  Cliente consulta produtos ativos e disponíveis.
2.  Adiciona itens ao carrinho respeitando tipo, estoque e limite de
    compra.
3.  Inicia checkout apenas se o carrinho não estiver vazio.
4.  Sistema valida e reserva temporariamente o estoque, por no máximo 24
    horas.
5.  Endereço, frete e informações dos produtos são registrados para o
    pedido.
6.  Pagamento é processado pelo Stripe em ambiente de testes.
7.  O backend confirma o pagamento antes de confirmar o pedido e efetuar
    a baixa definitiva do estoque.
8.  O pedido avança pelos estados definidos, mantendo seu histórico.

### 17.3. Cancelamento

1.  Antes do pagamento, pedidos podem ser cancelados.
2.  Pagamento recusado não pode gerar pedido confirmado.
3.  Cancelamento de checkout/pedido com reserva deve liberar o estoque
    reservado.
4.  Depois do pagamento aprovado, o cancelamento depende do estado do
    pedido e de ação administrativa.
5.  Registrar motivo e data, mantendo o pedido no histórico.

## 18. Pontos que exigem decisão da equipe

O PDF não especifica os seguintes detalhes. A IA deve perguntar ou
consultar o código existente antes de definir uma solução:

-   Campos exatos obrigatórios no formulário de cadastro.
-   Regras completas de senha, recuperação de senha e verificação de
    e-mail.
-   Provedores e detalhes de implementação do Google OAuth.
-   Endpoints, contratos HTTP, formato dos erros e nomes dos campos das
    APIs.
-   Bibliotecas de navegação, gerenciamento de estado, formulários,
    validação e armazenamento seguro no React Native.
-   Estrutura de telas e fluxo de navegação.
-   Forma exata de cálculo do frete por região e dimensões da embalagem
    padrão.
-   Política detalhada de transições de status e de cancelamento em cada
    etapa.
-   Detalhes de devolução e restauração de disponibilidade de produtos
    unitários.
-   Se cupons e descontos do "2º Plano" fazem parte da versão atual.
-   Regras detalhadas de analytics e indicadores do dashboard.
-   Regras de expiração/renovação do token e persistência segura da
    sessão.

## 19. Observações sobre a fonte

-   A numeração das regras no PDF possui lacunas; este arquivo preserva
    os identificadores existentes e não cria regras para os números
    ausentes.
-   O PDF marca o RN83 como repetido em relação ao RN14, mas o RN14 não
    está descrito no conteúdo extraído. A regra de acesso administrativo
    foi preservada conforme o texto disponível.
-   O PDF marca o RN95 como repetido em relação ao RN31, mas o RN31 não
    está descrito no conteúdo extraído. A regra de liberação da reserva
    foi preservada conforme o texto disponível.
-   Este arquivo não acrescenta regras de negócio além das que constam
    no PDF; a seção de requisitos práticos apenas orienta como o
    frontend deve respeitá-las.
