import { Book02Icon, Building03Icon, DocumentValidationIcon, LeftToRightListBulletIcon, StudentCardIcon, TeacherIcon } from '@hugeicons/core-free-icons';
import Link from 'next/link';
import { Badge, PageHeader, Section, StatCard, Table } from '@/components/ui/primitives';
import { formatDateTime } from '@/lib/format';
import { serviceContext } from '@/server/auth/session';
import { facultySummary, overview, recentActivity } from '@/server/services/report.service';

export default async function AdminDashboard() {
  const ctx = await serviceContext('super_admin');
  const [stats, faculties, activity] = await Promise.all([overview(ctx, null), facultySummary(ctx), recentActivity(ctx, 8)]);

  return (
    <>
      <PageHeader eyebrow="Registry" title="University overview" description="Monitor academic activity across every faculty and department." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Departments" value={stats.departments} icon={Building03Icon} />
        <StatCard label="Students" value={stats.students} icon={StudentCardIcon} />
        <StatCard label="Lecturers" value={stats.lecturers} icon={TeacherIcon} />
        <StatCard label="Courses" value={stats.courses} icon={Book02Icon} />
        <StatCard label="Registrations" value={stats.registrations} hint="This semester" icon={LeftToRightListBulletIcon} />
        <StatCard label="Pending results" value={stats.pending} hint={`${stats.approved} approved`} icon={DocumentValidationIcon} tone={stats.pending ? 'attention' : 'default'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Section title="Departments" actions={<Link href="/admin/structure" className="btn btn-secondary btn-sm">Manage</Link>}>
          <Table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Faculty</th>
                <th className="text-right">Students</th>
                <th className="text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((f) => (
                <tr key={f.departmentId}>
                  <td className="font-semibold">{f.department}</td>
                  <td className="text-ink/65">{f.faculty}</td>
                  <td className="text-right">{f.students}</td>
                  <td className="text-right">{f.pending ? <Badge tone="gold">{f.pending}</Badge> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>

        <Section title="Recent activity" actions={<Link href="/admin/audit" className="btn btn-secondary btn-sm">Full log</Link>}>
          <ul className="space-y-3">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-navy">{a.action}</p>
                  <p className="text-xs text-ink/55">{a.actorName ?? 'System'}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-ink/50">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
