import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // En la nueva arquitectura, la protección de rutas se puede manejar 
  // mediante cookies si es necesario, o validando el token en el cliente/servidor.
  // Por ahora, permitimos el paso y dejamos que el Backend valide los tokens.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
