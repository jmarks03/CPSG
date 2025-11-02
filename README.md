# CPS-G — Causal Probability Substrate Gravity
A discrete, information-thermodynamic model where **gravity, curvature, collapse, and structure formation** emerge from a single local free-energy scalar on a quantum causal graph.

This repository contains:
- Phase-1 through Phase-5 simulation notebooks
- Reproducible pipelines (Colab + local)
- Figures used in the manuscript
- Environment + version locks
- Instructions for replication and parameter sweeps

---

## 🔁 Reproduce the main results

### ✔ Quick Demo (no local install)
Open these Colab notebooks (replace with your Colab links after upload):
- **Phase-5a (simple CPS-G):** _add-link-here_
- **Phase-5b (full CPS-G):** _add-link-here_

### ✔ Full Local Reproduction
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r env/requirements.txt
bash run_all.sh
```
This executes the Phase-5 notebooks and saves outputs under `outputs/`.

> **Note:** The starter notebooks here are stubs. Replace them with your working `CPSG_Phase5a_Simple.ipynb` and `CPSG_Phase5b_FullCPSG.ipynb` from Colab.

---

## 📁 Structure
```
CPSG/
  notebooks/
    CPSG_Phase5a_Simple.ipynb      # replace with your working notebook
    CPSG_Phase5b_FullCPSG.ipynb     # replace with your working notebook
  env/
    requirements.txt
  outputs/                          # generated figures
  paper/
    main.tex
    refs.bib
    supplementary.tex
    figs/
  run_all.sh
  LICENSE
  CITATION.cff
  reproduction.md
  README.md
```

---

## ✅ Key Findings (to be summarized after you run Phase-5 again)
- Emergent **curvature wells** co-located with **mass clusters**
- Negative **correlation r(K, M)** in the structured phase
- Phase transition behavior across **T\*** and **α** sweeps
- Ablations confirm necessity of **collapse** and **rewiring**
- Fully **open, reproducible, falsifiable**

---

## 📄 License
MIT

## 📚 Citation
Please cite via the Zenodo DOI after the first GitHub release.
