---
title: "Porting a real-time transient stability protection algorithm from MATLAB to production Python"
client: "Anonymous — power-systems R&D"
industry: "Power systems"
projectType: "MATLAB → Python migration"
duration: "~4 months part-time"
year: "2025"
tech: ["Python 3.10+", "NumPy", "SciPy", "Numba", "pandas", "pytest", "Docker", "PyInstaller"]
pubDate: 2026-05-24
problem: "A real-time grid stability protection algorithm running in MATLAB was blocking deployment to commodity Linux servers and integration with the team's Python stack."
result: "A production Python implementation with element-wise parity against the MATLAB reference, packaged as a Docker service and a standalone PyInstaller build. Supporting CLI and desktop tooling were added on top."
draft: false
---

## The problem

A power-systems R&D group was running a critical real-time transient
stability protection algorithm in MATLAB. It worked, but the runtime locked
the team into three structural problems:

- **Deployment friction.** Shipping the algorithm to operational
  environments required compiled MATLAB Runtime distributions, license
  management per machine, and platform-specific build steps. Linux
  container deployment was effectively impossible.
- **Hiring.** Engineers joining the group had Python from day one but had
  to ramp up on MATLAB before being productive on this codebase.
- **Integration.** The rest of the team's stack was Python: numerical
  pipelines, internal services, data tooling. The MATLAB module was the
  weakest link — every interface across that boundary became an
  inter-process call or a file-system handoff.

The brief was a port, not a rewrite: same outputs, same numerical
behaviour, on a modern stack.

## Approach

We treated the migration as a side-by-side parity problem rather than a
clean-room re-implementation.

**Mapping pass.** Read every MATLAB source file, identify the toolboxes
in use, and find the SciPy / NumPy / pandas equivalent for each call.
Where no clean equivalent existed — a handful of specialised numerical
routines — we implemented from the algorithm specification rather than
translating mechanically.

**Test harness first.** Before any port work, we built a comparison
pipeline: run the MATLAB original on a set of reference inputs, capture
the tabular outputs, run the in-progress Python port on the same inputs,
diff element-wise with per-operation tolerance. Tolerances were tuned per
class of operation — float64 arithmetic matches MATLAB to ~1e-12 on most
ops, but accumulating reductions, iterative non-linear solvers and sparse
factorisations need looser bounds (1e-8 down to 1e-6 in a few places).
That decision is the highest-leverage one of the whole project; we'll
come back to it.

**Module-by-module port.** Translate one computational block at a time,
validate against the MATLAB reference, only then move on. This kept
diffs small and reviewable, and meant any regression had an obvious
locus.

**Performance pass.** Once functional parity held, hot inner loops were
JIT-compiled with Numba. This bought back most of the perceived speed
gap against MATLAB without committing to Cython or a C extension.

**Packaging.** Two delivery targets. (a) A Docker image for service-style
deployment in the team's existing infrastructure. (b) A PyInstaller
single-file build for environments where Docker isn't an option. Both
share the same Python codebase; only the entry point differs.

## What we ran into

A few things took longer than the time-and-materials estimate suggested.

**MATLAB's backslash operator.** `A\b` is one character; internally it
dispatches across half a dozen different linear solvers depending on
matrix shape, sparsity and conditioning. The straightforward Python
translation — `numpy.linalg.solve` — is correct but slow on sparse
operating matrices that show up in this domain. The right call is
`scipy.sparse.linalg.spsolve` with explicit format conversion, and the
generic-translation first pass missed the sparse path on roughly half
the call sites. The parity tests caught the speed difference; the
performance pass fixed it.

**Default reductions.** `mean`, `sum`, `std` default to different axes in
MATLAB and NumPy. Mechanical translation looks correct line-by-line and
silently produces wrong-shape outputs that propagate downstream. Every
such case showed up as an output mismatch in the test harness, with the
exact module and line in the diff. Cheap to find once the harness exists;
silent disasters without it.

**Broadcasting permissiveness.** NumPy broadcasts more liberally than
MATLAB's `bsxfun` patterns. Translations that compiled and ran ended up
producing arrays of slightly different rank than the MATLAB original.
Again — harness catches them, would have been a pain to find by reading.

**Bit-parity is not always achievable.** For one of the non-linear
solvers, the MATLAB and Python implementations use different internal
ordering of floating-point operations and the outputs disagree at the
last few bits. After a day of investigation we agreed with the domain
expert on a *functional* tolerance — output deviation below operational
significance — rather than chasing bit-exact parity. That tolerance lives
in the test config and is documented inline. This is a decision you
can't make alone; it needs the engineer who owns the algorithm.

## The result

The Python port runs in the same environments as the rest of the
team's stack. Deployments are container builds, not MATLAB-Runtime
installs. The side-by-side parity test suite runs on every commit, so
any future change has a clear pass/fail signal against the original
MATLAB behaviour.

Supporting tooling was built around the ported core:

- A **unified command-line tool** for batch runs across a set of test
  cases and result comparison — used by engineers to investigate
  scenarios without touching the service layer.
- A **lightweight desktop tool** (Python backend behind a small
  in-process web frontend) for engineers to load inputs, run scenarios
  and inspect outputs without needing a MATLAB licence on their
  workstation.

Neither was part of the original ask. They became cheap to build once
the core ran in Python, and they extended the user base of the
algorithm well beyond who had originally been able to touch it.

## Lessons

A few generalisable lessons from this and three related ports in the
same stack:

1. **Build the parity harness before touching the port.** It is the
   single highest-leverage step in a migration like this. Without it,
   you ship bugs you cannot see; with it, every translation has an
   instant verdict and every regression has an exact line.

2. **Translate one module at a time.** Module-sized ports stay
   reviewable, isolate regressions, and let you keep shipping. Whole-codebase
   translations get stuck in five-thousand-line PRs that no one really
   reviews.

3. **Don't chase bit-parity when functional parity is the real
   specification.** A few numerical operations will never agree at the
   last bit between MATLAB and NumPy. Agree the tolerance with the
   domain expert, write it down, move on. The temptation to keep
   tuning is real and almost always a waste.

4. **Tooling around the port pays compounding dividends.** Once the
   core runs in Python, a CLI and a small UI become a weekend each.
   The original MATLAB never had this surface area; the team gets it
   for free.

5. **Numba is the cheapest performance lever you have.** The MATLAB
   reference is fast because it's a tuned BLAS pipeline with JIT under
   the hood. Plain NumPy is often slower on the same operations.
   Targeted Numba decorators on the inner loops close most of the gap
   for a fraction of the effort of moving anything to Cython.

## Other migrations in this stack

The same pattern was applied to three related algorithms in the same
domain. All four share the test harness, the packaging approach, and
the supporting CLI/UI tooling.

| Algorithm                                                       | Scope (Python) | Year       | Status      |
| --------------------------------------------------------------- | -------------- | ---------- | ----------- |
| **Real-time transient stability protection** *(this case study)* | ~70,000 LOC    | 2025       | Production  |
| Dynamic security margin assessment                              | ~20,000 LOC    | 2025–2026  | Production  |
| Automatic generation / load redistribution under contingencies  | ~85,000 LOC    | 2026       | Production  |
| Static voltage stability margins                                | ~50,000 LOC    | 2026       | Production  |

Roughly seven months of part-time work across the four, sharing a
common Python core and validation infrastructure. The marginal cost
of each algorithm after the first dropped sharply: the parity harness,
the supporting tooling and most of the packaging were already in place.

---

If you're staring at a MATLAB codebase trying to figure out what's
worth porting and what's worth rewriting — [let's talk](/matlab-to-python).
