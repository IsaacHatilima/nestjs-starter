import type { Request } from 'express';
import type { AuthPrincipal } from './auth-principal';

export type AuthenticatedRequest = Request & { auth?: AuthPrincipal };
