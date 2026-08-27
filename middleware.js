export const config = {
  matcher: [
    /*
     * Intercepta todas as requisições, EXCETO as que começam com:
     * - api/auth (rota de login para validar senha)
     * - login.html (a própria página de login)
     * - css/style.css (estilos da página de login)
     * - assets/fotos/logo-capital.png (logo da página de login)
     * - assets/iconesite/icone.png (favicon)
     * - assets/telalogin (imagens de fundo do login)
     */
    '/((?!api/auth|login.html|css/style.css|assets/fotos/logo-capital.png|assets/iconesite/icone.png|assets/telalogin).*)',
  ],
};

export default function middleware(request) {
  // Verifica se o cookie auth_token existe e se o valor é o esperado
  const authCookie = request.headers.get('cookie');
  const isAutenticado = authCookie && authCookie.includes('auth_token=autenticado_com_sucesso');

  if (!isAutenticado) {
    // Se não estiver logado, redireciona para a página de login
    const url = new URL(request.url);
    url.pathname = '/login.html';
    
    // Adiciona parâmetro para saber de onde veio (opcional)
    url.searchParams.set('returnTo', request.url);
    
    return Response.redirect(url, 302);
  }

  // Se estiver logado, prossegue normalmente
  return;
}
