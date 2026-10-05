import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assessWithdrawalEvidence, MIN_WITHDRAWAL_EVIDENCE_CHARS } from './withdrawalEvidence';

describe('assessWithdrawalEvidence', () => {
  it('treats a blank note as not enough evidence', () => {
    const result = assessWithdrawalEvidence('   ');
    assert.equal(result.sufficient, false);
    assert.match(result.warning, /pending approval/i);
  });

  it('treats a short sentence as not enough evidence', () => {
    const result = assessWithdrawalEvidence('The guest cancelled.');
    assert.equal(result.sufficient, false);
  });

  it('rejects a long string that is only one word', () => {
    const result = assessWithdrawalEvidence('a'.repeat(MIN_WITHDRAWAL_EVIDENCE_CHARS + 5));
    assert.equal(result.sufficient, false);
  });

  it('accepts a written explanation that says what happened', () => {
    const result = assessWithdrawalEvidence(
      'The lodge access road was closed by a landslide on this date and we had no rooms left after moving our own guests. We can offer the next night instead if the group can shift.',
    );
    assert.equal(result.sufficient, true);
    assert.match(result.warning, /already approved/i);
  });
});
