"""Run each app in an isolated Python process to avoid app package collisions."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
for name in ("user", "course", "quiz", "payment"):
    service = root / "services" / f"{name}-service"
    print(f"\n== {name}-service ==", flush=True)
    result = subprocess.run([sys.executable, "-m", "pytest", "-q"], cwd=service)
    if result.returncode:
        raise SystemExit(result.returncode)
