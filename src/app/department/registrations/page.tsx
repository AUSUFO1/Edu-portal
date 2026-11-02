import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { ClassList, RegistrationsTable } from '@/components/admin/ReportViews';
import { PageHeader, Section } from '@/components/ui/primitives';
import { departmentContext } from '@/server/auth/department';
import { offeringRegistrations, registrationReport } from '@/server/services/report.service';

export const metadata: Metadata = { title: 'Registrations' };

export default async function DepartmentRegistrationsPage({ searchParams }: { searchParams: Promise<{ offering?: string }> }) {
  const { offering } = await searchParams;
  const ctx = await departmentContext();
  const offeringId = z.uuid().safeParse(offering).success ? offering! : null;
  const [rows, classList] = await Promise.all([registrationReport(ctx, ctx.departmentId), offeringId ? offeringRegistrations(ctx, offeringId) : null]);

  return (
    <>
      <PageHeader eyebrow="This semester" title="Course registrations" description="How many students registered for each course, and who they are." />
      <div className="space-y-6">
        {classList && (
          <div>
            <Link href="/department/registrations" className="no-print mb-3 inline-block text-sm font-bold text-green hover:underline">
              ← All courses
            </Link>
            <ClassList data={classList} />
          </div>
        )}
        <Section title="Registrations by course">
          <RegistrationsTable rows={rows} basePath="/department/registrations" />
        </Section>
      </div>
    </>
  );
}
