# Reproduction Guide

## Seeds & Modes
- Default seeds: 0,1,2,3,4
- Modes: `replicate32` (fast) and `showcase48` (heavier)

## Steps
1) Open each notebook in `notebooks/` in Google Colab.
2) Set the desired mode and seeds.
3) Run all cells. Figures/PNGs will be saved to `outputs/`.
4) For local reproduction, use `run_all.sh` after installing requirements.

## Expected Signatures
- Phase-5a: r(K,M) becomes negative as clusters form; visible curvature wells.
- Phase-5b: early hot regime with r ≈ 0; cooler runs/longer steps may produce clustering.

## Troubleshooting
- If Colab complains about missing deps: `pip install -r env/requirements.txt` in a code cell.
- If figures don't show: scroll to the bottom; also check `outputs/` for PNGs.
