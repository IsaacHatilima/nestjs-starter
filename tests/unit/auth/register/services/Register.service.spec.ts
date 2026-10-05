import { AppError } from '@/common/errors/app-error';
import { ErrorCode } from '@/common/errors/error-codes';
import { memoryMailer, securityServices } from '@tests/setup/security.fixture';
import { publicUser, USER_ID } from '@tests/setup/user.fixture';
import {
  RegisterRepository,
  type NewUser,
  type RegistrationEmail,
} from '@/auth/register/repositories/Register.repository';
import { mailMessageSchema } from '@/mail/mail-message.schema';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import type { PasswordBlocklist } from '@/security/password-blocklist.service';
import { RegisterService } from '@/auth/register/services/Register.service';
import { firstArg } from '@tests/setup/mock-calls';

const { env, hasher, tokens, cipher } = securityServices();

const REGISTRATION = {
  email: 'ada@example.com',
  password: 'correct horse battery',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

function build(verdict: { blocked: boolean; reason?: string } = { blocked: false }) {
  const blocklist = { check: jest.fn().mockResolvedValue(verdict) };
  const repository = {
    createUser: jest.fn().mockResolvedValue(publicUser({ emailVerified: false })),
  };
  const userRepository = { findByEmail: jest.fn().mockResolvedValue(null) };
  const { transport, mailer } = memoryMailer();
  const service = new RegisterService(
    repository as unknown as RegisterRepository,
    userRepository as unknown as UserRepository,
    hasher,
    tokens,
    mailer,
    blocklist as unknown as PasswordBlocklist,
    cipher,
    env,
  );
  return { repository, userRepository, transport, blocklist, service };
}

describe('RegisterService', () => {
  it('stores an argon2 hash, never the password', async () => {
    const { repository, service } = build();

    await service.handle(REGISTRATION);

    const stored = firstArg<{
      email: string;
      passwordHash: string;
    }>(repository.createUser);
    expect(stored.email).toBe('ada@example.com');
    expect(stored.passwordHash).not.toContain('correct horse');
    await expect(hasher.verify(stored.passwordHash, 'correct horse battery')).resolves.toBe(true);
  });

  it('passes the name through to the account being created', async () => {
    const { repository, service } = build();

    await service.handle(REGISTRATION);

    const stored = firstArg<{ firstName: string; lastName: string }>(repository.createUser);
    expect(stored.firstName).toBe('Ada');
    expect(stored.lastName).toBe('Lovelace');
  });

  it('queues an encrypted verification link whose token hashes to the stored token', async () => {
    const { repository, transport, service } = build();

    const user = await service.handle(REGISTRATION);

    expect(user.emailVerified).toBe(false);
    const [, stored] = repository.createUser.mock.calls[0] as [NewUser, RegistrationEmail];
    const message = mailMessageSchema.parse(JSON.parse(cipher.decrypt(stored.encryptedPayload)));
    const link = message.text.match(/token=([^\s]+)/)?.[1] ?? '';
    expect(message.to).toBe(REGISTRATION.email);
    expect(stored.encryptedPayload).not.toContain(REGISTRATION.email);
    expect(transport.sent).toHaveLength(0);
    expect(tokens.hashOpaqueToken(decodeURIComponent(link))).toBe(stored.tokenHash);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects an email that is already registered', async () => {
    const { repository, userRepository, service } = build();
    userRepository.findByEmail.mockResolvedValue({ id: USER_ID });

    await expect(service.handle(REGISTRATION)).rejects.toMatchObject<Partial<AppError>>({
      code: ErrorCode.EMAIL_ALREADY_REGISTERED,
    });
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('refuses a compromised password and never creates the account', async () => {
    const { repository, service } = build({ blocked: true, reason: 'breached' });

    await expect(service.handle(REGISTRATION)).rejects.toMatchObject<Partial<AppError>>({
      code: ErrorCode.PASSWORD_COMPROMISED,
    });
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('offers the address as context, so a password built from it is caught', async () => {
    const { blocklist, service } = build();

    await service.handle(REGISTRATION);

    expect(blocklist.check).toHaveBeenCalledWith('correct horse battery', ['ada@example.com']);
  });
});
