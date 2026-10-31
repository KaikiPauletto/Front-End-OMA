const MOCK_USERS = [
  { email: 'usu@gmail.com', password: '123', accountType: 'customer' },
  { email: 'adm@gmail.com', password: '123', accountType: 'seller' },
];

export function authenticateMockUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  return MOCK_USERS.find(
    (user) => user.email === normalizedEmail && user.password === password,
  ) ?? null;
}
