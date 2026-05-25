export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/faq' || pathname === '/versions') {
    const rewrittenUrl = new URL(context.request.url);
    rewrittenUrl.pathname = '/';
    return context.next(new Request(rewrittenUrl.toString(), context.request));
  }

  return context.next();
}
