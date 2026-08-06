# Veritae review fixes

StudioNet contract: `0xD6032B5c9cBE29d40c51812898deF43C5Ac622f0`

## Reviewer issue addressed

- The equivalence principle now compares every claim's semantic tier, quantized
  credence, and the quantized attack strength. Every value that can change
  canonization, retraction, or settlement is therefore covered by consensus.
- Credence and attack strength are stored in deterministic 50-point buckets,
  so validators must agree exactly instead of relying on an unsafe loose range.
- Canonization returns only 70% of the author bond. The remaining 30% stays
  escrowed as a funded liability for successful post-canon challenges.
- A successful post-canon challenge pays from that reserve and retracts the
  study. A failed challenge restores the canonized state and settles the
  challenger stake.

## Verification

Direct-mode tests cover retained reserves, successful and failed post-canon
challenges, low-credence retraction, transfer-backed settlement accounting,
status transitions, and status/count invariants:

```bash
python -m pip install -r requirements.txt
genvm-lint check backend/research-integrity.py --json
python -m pytest tests -v
```

The contract also passes `genvm-lint`.
