const MOCK_USERS = [
  { id: 'demo-customer', email: 'usu@gmail.com', role: 'CLIENTE' },
  { id: 'demo-administrator', email: 'adm@gmail.com', role: 'ADMINISTRADOR' },
];

export function authenticateMockUser(email, password) {
  if (!password) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = MOCK_USERS.find((account) => account.email === normalizedEmail);
  return user ? { ...user } : null;
}
