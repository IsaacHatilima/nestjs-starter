import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { createControllerDocument, responseSchema, ResponseSchema } from '@tests/setup/openapi.fixture';

let app: INestApplication;
let document: OpenAPIObject;

beforeAll(async () => {
  ({ app, document } = await createControllerDocument());
});
afterAll(async () => app.close());

describe('OpenAPI response contracts', () => {
  it('documents a success envelope and shared errors for every auth/profile operation', () => {
    expect(Object.keys(document.paths)).toHaveLength(19);
    for (const [path, item] of Object.entries(document.paths)) {
      const method = item.get ? 'get' : item.patch ? 'patch' : 'post';
      const status = path === '/auth/register' ? '201' : '200';
      const schema = responseSchema(document, path, method, status);
      expect(schema.required).toEqual(['success', 'data', 'error']);
      expect(schema.properties?.success).toMatchObject({ type: 'boolean', enum: [true] });
      expect(schema.properties?.error).toMatchObject({ nullable: true, enum: [null] });
      expect(item[method]?.responses).not.toHaveProperty('204');
      expect(responseSchema(document, path, method, '429').properties?.error).toMatchObject({
        properties: { code: { enum: ['RATE_LIMITED'] } },
      });
      expect(responseSchema(document, path, method, '500').properties?.error).toMatchObject({
        properties: { code: { enum: ['INTERNAL_ERROR'] } },
      });
    }
  });

  it.each([
    'change-password',
    'disable-totp',
    'forgot-password',
    'logout',
    'resend-verification',
    'reset-password',
    'revoke-other-sessions',
    'revoke-session',
    'verify-email',
  ])('documents null data at 200 for %s', (flow) => {
    expect(responseSchema(document, `/auth/${flow}`, 'post').properties?.data).toMatchObject({
      nullable: true,
      enum: [null],
    });
  });

  it('documents both login branches without offering tokens on the challenge branch', () => {
    const data = responseSchema(document, '/auth/login', 'post').properties?.data as ResponseSchema;
    expect(data.oneOf).toHaveLength(2);
    const authenticated = data.oneOf?.[0] as ResponseSchema;
    const challenged = data.oneOf?.[1] as ResponseSchema;
    expect(authenticated.required).toEqual(['accessToken', 'refreshToken', 'status', 'user']);
    expect(authenticated.properties?.status).toMatchObject({ enum: ['authenticated'] });
    expect(challenged.properties?.status).toMatchObject({ enum: ['two_factor_required'] });
    expect(challenged.required).toEqual(['status', 'challengeToken']);
    expect(challenged.properties).not.toHaveProperty('accessToken');
    expect(challenged.properties).not.toHaveProperty('refreshToken');
  });

  it('requires validation details while retaining the bare BAD_REQUEST alternative', () => {
    const schema = responseSchema(document, '/auth/login', 'post', '400');
    expect(schema.anyOf).toHaveLength(2);
    const ordinary = schema.anyOf?.[0] as ResponseSchema;
    const validation = schema.anyOf?.[1] as ResponseSchema;
    expect(ordinary.properties?.error).toMatchObject({
      properties: { code: { enum: ['BAD_REQUEST'] } },
      required: ['code', 'message'],
    });
    expect(validation.properties?.error).toMatchObject({
      properties: { code: { enum: ['VALIDATION_ERROR'] }, details: { type: 'array' } },
      required: ['code', 'message', 'details'],
    });
  });

  it('documents a profile and account timestamps without exposing credentials', () => {
    const data = responseSchema(document, '/auth/register', 'post', '201').properties?.data as ResponseSchema;
    expect(data.properties?.profile).toMatchObject({ required: ['firstName', 'lastName', 'avatarUrl'] });
    expect(data.properties?.createdAt).toMatchObject({ format: 'date-time' });
    expect(data.properties).not.toHaveProperty('passwordHash');
    expect(data.properties).not.toHaveProperty('twoFactorSecret');
  });

  it('documents bearer session errors and the inherited bearer security scheme', () => {
    const schema = responseSchema(document, '/auth/me', 'get', '401');
    expect(schema.properties?.error).toMatchObject({
      properties: { code: { enum: ['INVALID_TOKEN', 'TOKEN_EXPIRED', 'SESSION_REVOKED'] } },
    });
    expect(document.paths['/auth/me'].get?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/auth/login'].post?.security).toBeUndefined();
  });

  it('still documents the Zod request DTOs alongside response schemas', () => {
    const login = document.paths['/auth/login'].post;
    expect(login?.requestBody).toMatchObject({
      content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginDto' } } },
    });
    expect(document.components?.schemas?.LoginDto).toMatchObject({ required: ['email', 'password'] });
  });
});
