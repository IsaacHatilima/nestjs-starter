import { z } from 'zod';
import { ErrorCode } from '@/common/errors/error-codes';

export const FieldIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export function successEnvelopeSchema(data: z.ZodType): z.ZodType {
  return z.object({ success: z.literal(true), data, error: z.null() });
}

function errorEnvelope(error: z.ZodType): z.ZodType {
  return z.object({ success: z.literal(false), data: z.null(), error });
}

/** Validation alone promises field details; status 400 also has errors with no such payload. */
export function errorEnvelopeSchema(codes: [ErrorCode, ...ErrorCode[]]): z.ZodType {
  const ordinaryCodes = codes.filter((code) => code !== ErrorCode.VALIDATION_ERROR);
  const branches: z.ZodType[] = [];
  if (ordinaryCodes.length > 0) {
    branches.push(errorEnvelope(z.object({ code: z.enum(ordinaryCodes), message: z.string() })));
  }
  if (codes.includes(ErrorCode.VALIDATION_ERROR)) {
    branches.push(
      errorEnvelope(
        z.object({
          code: z.literal(ErrorCode.VALIDATION_ERROR),
          message: z.string(),
          details: z.array(FieldIssueSchema),
        }),
      ),
    );
  }
  return branches.length === 1 ? branches[0] : z.union(branches);
}
