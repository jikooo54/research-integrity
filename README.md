# research-integrity

GenLayer intelligent contract project.

## Links
- **App**: https://jikooo54.github.io/research-integrity/
- **Contract**: `backend/research-integrity.py`

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: GenLayer Python Contract

## Reproducible validation

```bash
python -m pip install -r requirements.txt
genvm-lint check backend/research-integrity.py --json
python -m pytest tests -v
cd frontend
npm ci
npm run build
```

On Windows:

```powershell
.\scripts\validate_all.ps1
```

The tracked direct-mode tests cover retained post-canon reserves, successful and
failed challenges, retraction, transfer-backed settlement accounting, and
status/count invariants.
