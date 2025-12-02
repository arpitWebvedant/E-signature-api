import { apiKeyService, authService } from '@/app/api/services'
import { NextRequest, NextResponse } from 'next/server'


/**
 * Optional API authentication helper.
 * - If x-api-key or Authorization header is provided → verify it.
 * - If not provided → continue without verification.
 */
type VerifiedInfo = {
  userId: number
  apiKeyId: number
  organizationId: string | number | null
}

export async function withApiAuth(req: Request) {
  // Get API key from header
  const headerKey = req.headers.get('x-api-key')?.trim()
  const authHeader = headerKey
    ? `ApiKey ${headerKey}`
    : req.headers.get('authorization') || undefined

  let verified: VerifiedInfo | null = null

  // Only verify if key is provided
  if (authHeader) {
    verified = await apiKeyService.verifyFromHeader(authHeader)
    if (!verified) {
      return {
        error: NextResponse.json(
          { success: false, message: 'Invalid API key' },
          { status: 401 },
        ),
      }
    }
  }

  // Clone headers and attach verified info if present
  const headers = new Headers(req.headers)
  if (verified) {
    headers.set('x-api-user-id', String(verified.userId))
    headers.set('x-api-key-id', String(verified.apiKeyId))
    if (verified.organizationId) {
      headers.set('x-organization-id', String(verified.organizationId))
    }
  }

  // If GET and verified user present, ensure userId exists in query params
  let newUrl = req.url
  try {
    if (req.method === 'GET' && verified?.userId) {
      const url = new URL(req.url)
      if (!url.searchParams.get('userId')) {
        url.searchParams.set('userId', String(verified.userId))
      }
      newUrl = url.toString()
    }
  } catch {
    // ignore URL parse issues; fall back to original URL
  }

  // If JSON request (non-GET), inject userId/org into body when missing
  let bodyInit: BodyInit | undefined = undefined
  try {
    const contentType = req.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    if (req.method !== 'GET' && verified && isJson) {
      const original = await req.clone().json().catch(() => undefined)
      if (original && typeof original === 'object' && original !== null) {
        const patched = { ...original }
        if (patched.userId == null && verified.userId != null) {
          patched.userId = verified.userId
        }
        if (patched.organizationId == null && verified.organizationId != null) {
          patched.organizationId = verified.organizationId
        }
        bodyInit = JSON.stringify(patched)
        headers.set('content-type', 'application/json')
      }
    }
  } catch {
    // ignore JSON parse issues
  }

  // Create new Request with updated headers (and possibly updated URL/body)
  const init: RequestInit = {
    method: req.method,
    headers,
  }
  // Only attach body for non-GET/HEAD and when we actually have one.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = bodyInit !== undefined ? bodyInit : req.body
    if (body !== undefined && body !== null) {
      // @ts-expect-error - duplex is required by undici when streaming a body
      init.duplex = 'half'
      init.body = body as any
    }
  }
  const authedReq = new Request(newUrl, init)
  return { req: authedReq, verified }
}


export interface AuthenticatedRequest extends NextRequest {
  user: any;
  localUser: any;
  session: any;
  organization: any | null;
  organizationId: string | null;
  userRole: string | null;
  userRoles: string[];
  auth: {
    authenticatedUser: {
      _id: string;
      email: string;
      name: string;
      centralizedUser: any;
      user: any;
      organization: any;
      userRole: string | null;
      userRoles: string[];
    }
  };
}

// Service Singleton
const centralizedAuthService = authService;

type RouteHandler = (req: AuthenticatedRequest, context: any) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, context: any) => {
    try {
      const headersObj = Object.fromEntries(req.headers.entries());

      const session = await centralizedAuthService.getSession(headersObj);

      if (!session || !session.user) {
        return NextResponse.json({ message: 'Invalid or expired session' }, { status: 401 });
      }

      const localUser = await centralizedAuthService.findOrCreateLocalUser(session);

      let organization = null;
      let organizationId = null;
      let userRole = null;
      let userRoles: string[] = [];

      if (session.user.organizationUsers && session.user.organizationUsers.length > 0) {
        const primaryOrgUser = session.user.organizationUsers[0];

        organization = primaryOrgUser.organization;
        organizationId = primaryOrgUser.organizationId;

        for (const orgUser of session.user.organizationUsers) {
          if (orgUser.userRoles && orgUser.userRoles.length > 0) {
            userRoles.push(...orgUser.userRoles.map((ur: any) => ur.role));
          } else if (orgUser.role) {
            // @ts-ignore
            userRoles.push(orgUser.role);
          }
        }

        userRole = userRoles.length > 0 ? userRoles[0] : null;
      }

      const authReq = req as any;

      authReq.user = session.user;
      authReq.localUser = localUser;
      authReq.session = session.session;
      authReq.organization = organization;
      authReq.organizationId = organizationId;
      authReq.userRole = userRole;
      authReq.userRoles = userRoles;

      authReq.auth = {
        authenticatedUser: {
          _id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          centralizedUser: session.user,
          user: localUser,
          organization,
          userRole,
          userRoles
        }
      };

      return handler(authReq as AuthenticatedRequest, context);

    } catch (error: any) {
      console.error('EnhancedCentralizedAuthGuard: Authentication failed:', error.message);
      return NextResponse.json(
        { message: 'Authentication failed', error: error.message },
        { status: 401 }
      );
    }
  };
}
