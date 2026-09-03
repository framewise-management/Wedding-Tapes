import { z } from 'zod';

// Matches the previous @Transform(({value}) => value === 'true') + @IsOptional + @IsBoolean:
// absent query param -> undefined (no filter applied); present -> true only if
// literally "true", any other value (including "false") -> false.
export const booleanQueryParam = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));
