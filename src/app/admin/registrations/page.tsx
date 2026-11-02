import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { DepartmentFilter } from '@/components/admin/DepartmentFilter';
import { ClassList, RegistrationsTable } from '@/components/admin/ReportViews';
import { PageHeader, Section } from '@/components/ui/primitives';
import { departmentFilter } from '@/server/auth/admin-scope';
import { serviceContext } from '@/server/auth/session';
import { offeringRegistrations, registrationReport } from '@/server/services/report.service';
import { listDepartments } from '@/server/services/structure.service';

export const metadata: Metadata = { title: 'Registrations' };

export default async function AdminRegistrationsPage({ searchParams }: { searchParams: Promise<{ offering?: string; department?: string }> }) {
  const params = await searchParams;
  const departmentId = departmentFilter(params.department);
  const offeringId = z.uuid().safeParse(params.offering).success ? params.offering! : null;
  const ctx = await serviceContext('super_admin');
  const [rows, departments, classList] = await Promise.all([
    registrationReport(ctx, departmentId),
    listDepartments(ctx.db),
    offeringId ? offeringRegistrations(ctx, offeringId) : null,
  ]);
  const query = departmentId ? `&department=${departmentId}` : '';

  return (
    <>
      <PageHeader eyebrow="This semester" title="Course registrations" description="Registrations across the university." actions={<DepartmentFilter departments={departments} value={departmentId} />} />
      <div className="space-y-6">
        {classList && (
          <div>
            <Link href={`/admin/registrations${departmentId ? `?department=${departmentId}` : ''}`} className="no-print mb-3 inline-block text-sm font-bold text-green hover:underline">
              ← All courses
            </Link>
            <ClassList data={classList} />
          </div>
        )}
        <Section title="Registrations by course">
          <RegistrationsTable rows={rows} basePath="/admin/registrations" showDepartment query={query} />
        </Section>
      </div>
    </>
  );
}
