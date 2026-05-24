---
title: "Deep learning for N-1 security assessment in power systems"
description: "Neural networks can screen contingencies 300× faster than full AC power flow — at 98%+ accuracy. A survey of CNN, GNN, and DCNN approaches, the data problem, and where the field still struggles."
pubDate: 2026-05-24
tags: ["power-systems", "ml", "deep-learning", "n-1", "contingency-analysis"]
draft: false
toc: true
ctaTarget: "/matlab-to-python"
---

## TL;DR

N-1 security assessment is computationally expensive: a 118-bus system needs roughly 166 separate power-flow solves, and N-3 analysis on the same system blows up to about **790,000 topologies** — over 9 days of compute at 1 second per case. Modern deep learning approaches frame the question as a binary classifier on the pre-contingency state and deliver:

- **300× speedup** over full AC power flow
- **98%+ accuracy** on hazard classification
- **F1-score 99.5%** for GCNs with topological features

This article surveys what works (CNN, GNN, DCNN), where the wins come from (data representation), and where the field still struggles (interpretability, N-k generalization, RES variability).

The fast caveat: deep learning doesn't replace full power-flow solvers. It screens contingencies so that exhaustive analysis can focus on the dangerous ones.

## Why N-1 is computationally hard

The **N-1 criterion** is foundational to grid operations: the system must remain stable and operational after the loss of any single element. To verify it for an operating point you solve one AC power flow per candidate outage — branch by branch, transformer by transformer, generator by generator.

Three things push the cost up:

1. **Scale.** A system with `N` branches needs `N` solves to clear the N-1 set. Extend to N-k and the count is `(N choose k)`, which explodes fast.
2. **Newton–Raphson is iterative.** Each solve is not a one-shot computation; convergence depends on starting point, system stress, and operating mode.
3. **Renewables add uncertainty.** A deterministic operating point is no longer enough — you want to assess security across a distribution of generation scenarios.

The numbers from the literature make the wall concrete. The IEEE 118-bus test system contains about 166 candidate N-1 outages; sequential evaluation takes minutes. Move to N-3 on the same system and you're looking at **roughly 790,000 topologies** — and now you're running for days, not minutes.

## The reformulation: binary classification on the pre-contingency state

The deep-learning angle is conceptually simple: instead of running 166 (or 790,000) power flows online, train a neural network offline to predict the security label directly from the operating state.

The output is a single bit:

- **1** — the system is N-1 secure (no violations after any single contingency)
- **0** — at least one contingency produces a violation (voltage out of range, thermal limit exceeded, or another operational constraint broken)

Training data comes from a large offline campaign of full AC power-flow studies: each sample is `(pre-contingency state, contingency, post-contingency outcome)`. The network learns the mapping. At inference time you get the answer in milliseconds.

The trade is honest: you give up exhaustive post-contingency detail, you gain orders of magnitude in throughput.

## Architectures used

Four families show up in the literature, each suited to a different way of representing the grid:

| Architecture | Input shape                          | What it's good at                                    | Typical headline result        |
| ------------ | ------------------------------------ | ---------------------------------------------------- | ------------------------------ |
| **CNN**      | 2D "images" (P, Q, V matrices)       | Automatic spatial feature extraction                  | 98%+ accuracy, 255× speedup    |
| **GNN**      | Graph (buses=nodes, lines=edges)     | Native topology modeling; transfers to new topologies | F1-score 99.5%                 |
| **MLP**      | Flat parameter vector                | Baseline; cheap to train                              | Beaten by CNN/GNN at same size |
| **DCNN**     | Deeper CNN on 2D or structured input | Robust on high-RES systems                            | 300× speedup                   |

CNNs treat the grid as a three-channel image — active power, reactive power, voltage magnitude — with diagonal entries holding bus injections and off-diagonals holding line flows. GNNs encode the actual electrical topology: nodes carry bus features, edges carry line parameters (R, X, B), and adversarial / weighted losses correct for the fact that secure cases vastly outnumber insecure ones in any realistic training set.

## Data representation is where the work actually happens

The model architecture matters less than the input encoding. Three decisions dominate accuracy:

### Encoding the operating state

For CNNs, normalize P, Q, V to `[0, 1]` and arrange as a three-channel matrix indexed by buses. The convolution then picks up spatial patterns — neighbourhoods of loaded buses, voltage gradients, congestion fronts.

For GNNs, the node features are the bus state, the edge features are the line parameters, and you can additionally pass topological centrality measures (degree, betweenness, electrical distance) as extra node features. The papers I've seen consistently report that **adding topological features to GCNs improves generalization to unseen operating points**.

### Telling the network which contingency happened

The pre-contingency state alone isn't enough — the model needs to know *which* outage to assess. Two patterns:

- **MLP / CNN:** append a one-hot vector of length `L` (number of lines), with a 1 at the outaged element.
- **GNN:** mutate the graph itself — remove the edge, or zero out its features. This is the more natural encoding and a major reason GNNs transfer better to N-2 and N-3.

### Representing renewable variability

This is where Monte Carlo starts to lose to **GANs**. Pure MC sampling of wind/solar scenarios is easy but tends to under-sample the tails — exactly the operating conditions where N-1 security gets interesting.

A **D2GAN** (dual-discriminator GAN) trained on historical wind and solar data produces scenario sets that match real distributions better than MC, and a DCNN trained on D2GAN scenarios outperforms one trained on MC scenarios. The improvement is most visible on systems with high renewables share, where the relevant operating space is wide and irregular.

## Training: imbalanced data and the cost of false negatives

Two practical issues come up in every paper.

**Imbalance.** Most operating points are secure. In one reference IEEE 118-bus dataset, 19,668 of 21,379 generated cases are secure and only 1,711 are insecure — a roughly 11:1 ratio. Plain binary cross-entropy lets the network exploit this: predict "secure" for everything and get 92% accuracy with zero usefulness.

**False negatives are catastrophic.** Predicting "secure" when the truth is "insecure" — Type II error — is the failure mode you actually care about. Operators can tolerate some Type I errors (extra power-flow checks); they cannot tolerate Type II errors (missed contingencies that bring the grid down).

The fix is to weight the loss. A **weighted focal loss** that down-weights easy examples and over-weights insecure cases drives Type II error from **0.358% to 0.059% — a 6× reduction** — without changing the overall error rate. This kind of tuning is non-negotiable for any deployment that's going to inform real-time decisions.

## Performance, speedup, and generalization

The accuracy numbers across recent papers cluster tightly:

| Model     | System            | Metric             | Value          |
| --------- | ----------------- | ------------------ | -------------- |
| CNN       | NESTA 162-node    | Accuracy           | 98%+           |
| CNN       | NESTA 162-node    | Recall (insecure)  | 99.14%         |
| GCN       | IEEE 118-bus      | F1-score           | 99.50%         |
| GCN       | IEEE 118-bus      | G-mean             | 97.58%         |
| GNN + WFL | (various)         | Type II error      | 0.358% → 0.059% |

Speedups are the headline:

| Approach | Use case                         | Speedup vs full AC PF |
| -------- | -------------------------------- | --------------------- |
| CNN      | Static stability assessment      | 255×                  |
| DCNN     | N-1 analysis                     | 300×                  |
| GNN      | N-3 screening                    | 400×                  |
| GNN      | 100,000 N-3 scenarios (118-bus)  | **1.5 min vs 5 hr**   |

Generalization to unseen states is where GNNs pull ahead:

| Test setting                         | GCN accuracy | MLP accuracy |
| ------------------------------------ | ------------ | ------------ |
| New operating point                  | 94.42%       | 89.69%       |
| Double contingency (N-1-1)           | 95.46%       | 92.17%       |

Most striking, GNNs trained only on N-0 and N-1 topologies can screen N-2 and N-3 contingencies with usable accuracy — though the recall on critical cases is uneven, and the field doesn't yet treat this as solved.

## Where this is still hard

Three open problems push back against putting a deep model directly into the control room.

**Interpretability.** Operators don't accept a black-box "secure / insecure" verdict — they need to understand *why*. Attention mechanisms, saliency maps, and Layer-wise Relevance Propagation are being adapted from computer vision, and physics-informed neural networks (PINNs) embed conservation laws directly so the model's reasoning lives partly in domain-meaningful coordinates. None of this is mature yet for grid applications.

**N-k beyond what the model has seen.** Training on N-0 and N-1 and hoping the model extrapolates to N-2 and N-3 is fragile. Recall on critical N-2/N-3 cases is "uneven" in the careful phrasing of the papers — which means it sometimes works and sometimes doesn't, and you can't tell in advance which. Hierarchical models, reinforcement-learning agents for sequential contingencies, and PINNs are the directions being explored.

**Operational integration.** Reading the literature, you'd think this is shipped; talking to grid operators, you'd find very little in production. The remaining work is in EMS integration, regulatory acceptance, and continuous-learning pipelines that update the model as the network topology and generation mix change.

## What this means in practice

A few takeaways for engineering teams looking at this space:

1. **Use deep learning as a screen, not a replacement.** Run the network on every operating point to flag suspicious cases; run full AC power flow on the flagged set. This gives you most of the speedup without giving up rigor on the decisions that matter.

2. **The data problem dominates.** Architecture choice (CNN vs GNN vs DCNN) matters less than building a training set that covers the realistic operating envelope, including renewable variability. Budget more of the project for data generation than for model tuning.

3. **GNNs travel further than CNNs when topology changes.** If the grid you're modelling is likely to be reconfigured — substation switching, line maintenance, future expansion — GNNs are the safer architectural bet.

4. **Weighted / focal losses are mandatory.** Plain cross-entropy on imbalanced security data trains a model that's accurate and useless. The 6× Type II reduction from a weighted focal loss is a free lunch.

5. **Performance numbers are not deployment numbers.** A 98% accuracy on a held-out test set is the start of validation, not the end. The deployment-grade question is how the model behaves on operating points that fell outside the training envelope — which is where most real-world failures happen.

---

## References

The numbers and architectures above are drawn from the following surveys and original papers:

- Convolutional neural networks for static security assessment — [arxiv.org/html/2310.04213v3](https://arxiv.org/html/2310.04213v3)
- Graph neural networks for power-system contingency screening — [sciencedirect.com/science/article/abs/pii/S0378779622004096](https://www.sciencedirect.com/science/article/abs/pii/S0378779622004096)
- Physics-informed GNNs for N-k contingencies — [arxiv.org/pdf/2301.12988](https://arxiv.org/pdf/2301.12988)
- D2GAN scenario generation for DCNN training — [arxiv.org/pdf/2402.06226](https://arxiv.org/pdf/2402.06226)
- Deep CNNs for N-1 security — [arxiv.org/pdf/1904.09029](https://arxiv.org/pdf/1904.09029)

This article is an English adaptation of a Russian-language survey originally published on the author's personal engineering blog.
