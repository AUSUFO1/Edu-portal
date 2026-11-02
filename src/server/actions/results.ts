'use server';

import { revalidatePath } from 'next/cache';
import { reviewSchema, saveScoresSchema } from '@/lib/validation';
import { serviceContext } from '../auth/session';
import { reviewResults, saveScores } from '../services/result.service';
import { formAction } from './safe-action';

/**
 * The score grid posts `ca:<registrationId>` and `exam:<registrationId>` pairs; rows left
 * completely blank are skipped (not yet scored), rows filled in on one side only are rejected.
 */
function parseScoreForm(form: FormData) {
  const scores = new Map<string, { registrationId: string; caScore: unknown; examScore: unknown }>();
  for (const [key, value] of form.entries()) {
    const [field, registrationId] = key.split(':');
    if ((field !== 'ca' && field !== 'exam') || !registrationId) continue;
    const row = scores.get(registrationId) ?? { registrationId, caScore: '', examScore: '' };
    row[field === 'ca' ? 'caScore' : 'examScore'] = String(value).trim();
    scores.set(registrationId, row);
  }
  const toNumber = (v: unknown) => (v === '' ? Number.NaN : Number(v));
  return {
    offeringId: form.get('offeringId'),
    expectedVersion: form.get('expectedVersion'),
    intent: form.get('intent'),
    scores: [...scores.values()]
      .filter((s) => s.caScore !== '' || s.examScore !== '')
      .map((s) => ({ registrationId: s.registrationId, caScore: toNumber(s.caScore), examScore: toNumber(s.examScore) })),
  };
}

export const saveScoresAction = formAction(
  saveScoresSchema,
  async ({ offeringId, expectedVersion, intent, scores }) => {
    const submit = intent === 'submit';
    await saveScores(await serviceContext('lecturer'), { offeringId, expectedVersion, submit, scores });
    revalidatePath('/lecturer', 'layout');
    return submit ? 'Results submitted for departmental approval.' : 'Draft saved.';
  },
  parseScoreForm,
);

export const reviewResultsAction = formAction(reviewSchema, async (input) => {
  await reviewResults(await serviceContext('department_admin'), input);
  revalidatePath('/department', 'layout');
  return {
    approve: 'Results approved. Students can now see them.',
    reject: 'Results returned to the lecturer with your feedback.',
    reopen: 'Results reopened. The lecturer can now correct them.',
  }[input.decision];
});
