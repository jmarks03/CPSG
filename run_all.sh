#!/usr/bin/env bash
set -euo pipefail

echo "[CPSG] Running Phase-5 notebooks..."
jupyter nbconvert --to notebook --execute notebooks/CPSG_Phase5a_Simple.ipynb --output outputs/phase5a_reproduced.ipynb
jupyter nbconvert --to notebook --execute notebooks/CPSG_Phase5b_FullCPSG.ipynb --output outputs/phase5b_reproduced.ipynb
echo "[CPSG] Done. Check the outputs/ folder."
