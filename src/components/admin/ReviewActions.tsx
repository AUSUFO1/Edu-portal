'use client';

import { ActionForm, Field, SubmitButton, useFieldError } from '@/components/ui/form';
import { reviewResultsAction } from '@/server/actions/results';

export function ReviewActions({ sheetId, version, status }: { sheetId: string; version: number; status: 'submitted' | 'approved' }) {
  return (
    <ActionForm action={reviewResultsAction} className="space-y-3">
      <input type="hidden" name="sheetId" value={sheetId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <Field name="comment" label={status === 'submitted' ? 'Comment (required to return)' : 'Reason for reopening'}>
        <Comment />
      </Field>
      <div className="flex flex-wrap gap-2">
        {status === 'submitted' ? (
          <>
            <SubmitButton name="decision" value="approve">
              Approve
            </SubmitButton>
            <SubmitButton name="decision" value="reject" variant="danger">
              Return for correction
            </SubmitButton>
          </>
        ) : (
          <SubmitButton name="decision" value="reopen" variant="danger">
            Reopen results
          </SubmitButton>
        )}
      </div>
    </ActionForm>
  );
}

function Comment() {
  const error = useFieldError('comment');
  return <textarea id="comment" name="comment" rows={3} maxLength={1000} className="input" aria-invalid={error ? true : undefined} />;
}
