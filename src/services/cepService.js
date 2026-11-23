export async function lookupBrazilianPostalCode(postalCode) {
  const digits = String(postalCode ?? '').replace(/\D/g, '');
  if (digits.length !== 8) {
    throw new Error('Informe um CEP válido com 8 números.');
  }

  let response;
  try {
    response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  } catch {
    throw new Error('Não foi possível consultar o ViaCEP. Verifique sua conexão e tente novamente.');
  }

  if (!response.ok) {
    throw new Error('O ViaCEP está indisponível no momento. Tente novamente.');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('O ViaCEP retornou uma resposta inválida.');
  }

  if (
    !result ||
    typeof result !== 'object' ||
    result.erro === true ||
    typeof result.localidade !== 'string' ||
    !result.localidade.trim() ||
    typeof result.uf !== 'string' ||
    !/^[A-Z]{2}$/.test(result.uf)
  ) {
    throw new Error('CEP não encontrado. Confira o número e tente novamente.');
  }

  return {
    city: result.localidade.trim(),
    state: result.uf,
  };
}
