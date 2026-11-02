import { notFound } from 'next/navigation';
import { z } from 'zod';
import { SheetReviewView } from '@/components/admin/SheetReviewView';
import { AppError } from '@/domain/errors';
import { serviceContext } from '@/server/auth/session';
import { reviewSheet } from '@/server/services/result.service';

export default async function AdminSheetPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params;
  if (!z.uuid().safeParse(sheetId).success) notFound();
  const ctx = await serviceContext('super_admin');
  const data = await reviewSheet(ctx, sheetId).catch((error: unknown) => {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound();
    throw error;
  });
  return <SheetReviewView data={data} backHref="/admin/results" canDecide={false} actorId={ctx.actor.id} />;
}
