import { notFound } from 'next/navigation';
import { z } from 'zod';
import { SheetReviewView } from '@/components/admin/SheetReviewView';
import { AppError } from '@/domain/errors';
import { departmentContext } from '@/server/auth/department';
import { reviewSheet } from '@/server/services/result.service';

export default async function DepartmentSheetPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params;
  if (!z.uuid().safeParse(sheetId).success) notFound();
  const ctx = await departmentContext();
  // A sheet from another department is reported as not found rather than revealing it exists.
  const data = await reviewSheet(ctx, sheetId).catch((error: unknown) => {
    if (error instanceof AppError && (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND')) notFound();
    throw error;
  });
  return <SheetReviewView data={data} backHref="/department/results" canDecide actorId={ctx.actor.id} />;
}
