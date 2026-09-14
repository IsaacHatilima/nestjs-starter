import { Injectable } from '@nestjs/common';
import { notFound } from '@/common/errors/auth-errors';
import type { AuthPrincipal } from '@/security/auth-principal';
import { MeRepository } from '@/auth/me/repositories/Me.repository';
import type { User } from '@/auth/shared/types/User.types';

@Injectable()
export class MeService {
  constructor(private readonly repository: MeRepository) {}

  async handle(auth: AuthPrincipal): Promise<User> {
    const user = await this.repository.findById(auth.userId);
    if (!user) throw notFound('User');
    return user;
  }
}
