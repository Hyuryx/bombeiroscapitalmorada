export const config = {
  matcher: [
    /*
     * Interceptar tudo EXCETO:
     * - api (rotas de API)
     * - arquivos estáticos internos do Next/Vercel
     * - recursos visuais necessários para o login (css, assets, favicon)
     * - a própria página de login.html
     */
    '/((?!api|_next/static|_next/image|favicon.ico|css|js|assets|login.html).*)',
  ],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const cookie = request.headers.get('cookie') || '';
  
  // Se não estiver logado, barrar o acesso à página real e redirecionar para login
  if (!cookie.includes('auth_token=autenticado_com_sucesso')) {
    const loginUrl = new URL('/login.html', request.url);
    loginUrl.searchParams.set('continue', url.pathname + url.search);
    return Response.redirect(loginUrl, 302);
  }
}
