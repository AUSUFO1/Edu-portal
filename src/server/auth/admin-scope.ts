import { z } from 'zod';

/** Reads an optional `?department=` filter for super admin pages; anything malformed means "all". */
export function departmentFilter(value: string | undefined): string | null {
  return z.uuid().safeParse(value).success ? value! : null;
}
