---
title: "Machine Learning for Thermal-Soaring Optimisation: a Survey of Approaches, Architectures and Open Problems"
description: "A survey of deep learning and reinforcement learning for autonomous thermal soaring — LSTM/GRU/TCN/Transformer architectures, POMDP and PPO/TD3 formulations, Kalman + ML hybrid filtering, and a concrete five-stage plan for an on-board AI co-pilot for paragliders."
pubDate: 2026-02-23
updatedDate: 2026-05-26
tags: ["flybeeper", "machine-learning", "reinforcement-learning", "thermal-soaring", "paragliding", "lstm", "transformer", "tcn", "kalman-filter", "literature-review"]
draft: false
ctaTarget: "/matlab-to-python"
toc: true
---

## A review of existing approaches, architectures and research directions

## Abstract

This survey reviews the scientific literature on automated thermal soaring with machine learning and deep reinforcement learning. Three sub-problems are considered: predicting the motion of the thermal core (centring), classifying thermal degradation, and optimising the exit course. The major neural-network architectures (LSTM, GRU, 1D CNN / TCN, Transformer) are compared in the context of multi-dimensional flight time-series. GPS noise and standard filtering methods are discussed. The adequacy of historical log data for model training is assessed, and a development plan for an on-board pilot-advisory system is proposed.

## 1. Introduction

Soaring in unpowered aircraft — sailplanes, hang gliders, paragliders — is one of the most cognitively demanding forms of aviation. In real time the pilot decides whether to enter a thermal, how to centre the circle in the strongest lift, when the thermal is weakening, and which course to leave on. These decisions directly determine the average XC speed and flight safety.

Traditionally, pilots have relied on the variometer (vertical-speed instrument) and on personal experience. Several factors make this decision problem hard: turbulence inside thermals; their non-stationary nature (drift, deformation, decay); the effect of horizontal wind; and the limited information content of a one-dimensional vario signal. At the same time, modern GNSS receivers and barometers record detailed, high-resolution tracks, producing rich data sets ready for analysis.

Progress in deep learning, reinforcement learning (RL) and time-series modelling makes a new class of instruments feasible: AI co-pilots that predict an optimal trajectory in a thermal in real time. This survey systematises the relevant scientific results and lays the methodological groundwork for further work.

The topic's relevance is reinforced by several key projects: Project Frigatebird (Microsoft Research); the pioneering field-RL study by Reddy et al. (2018); the recent deep-RL work of Harel et al. (2024) on vulture-inspired soaring; and the broader body of literature on autonomous soaring in small UAVs.

## 2. Survey of existing approaches

### 2.1 Mathematical and rule-based models

The earliest autonomous-soaring algorithms were heuristic rules formulated by experienced pilots. The classic rules of Reichmann (1993) prescribe shifting the centre of the circle towards the strongest vario reading. Algorithmically this is realised as a centre-of-mass estimate of the thermal core (Allen, 2006), iteratively refined with least squares (Edwards et al., 2016).

A significant contribution is the ArduSoar algorithm (Tabor et al., 2018), integrated into the open-source ArduPilot, which uses an extended Kalman filter to estimate the centre and parameters of a Gaussian thermal model. Kahn (2019) proposed two separate extended Kalman filters — one for position, one for thermal parameters — reducing on-board RAM requirements.

The key limitation of rule-based methods is the rigidity of the embedded solution space. As Harel et al. (2024) note, such algorithms cannot explore new strategies and are therefore limited in problems with complex dynamics and high uncertainty.

### 2.2 Machine-learning approaches

The transition to ML for soaring was initiated by Wharington (1998), who proposed a neural-network thermal-centre estimator combined with reinforcement learning. The computational cost of the time prevented real-time deployment, but the idea seeded subsequent work.

A breakthrough was Reddy et al. (2018), published in *Nature*: the first demonstration of autonomous soaring by a glider with a 2-metre wingspan, trained with reinforcement learning entirely in field conditions. The navigation policy emerged solely from experience accumulated over a few days of flying. A key result was the identification of effective navigation cues: vertical air accelerations and roll torque.

Guilliard et al. (2018, Microsoft Research) formalised autonomous thermalling as a partially observable Markov decision process (POMDP) and built the POMDSoar controller. Flight tests showed statistically significant gains over ArduSoar, especially in turbulent low-altitude thermals, thanks to a more active exploration strategy.

The most comprehensive deep-RL study is Harel et al. (2024) in *Nature Communications*. The authors built a simulator for studying the soaring-learning process, inspired by vulture flight. They identified learning bottlenecks, proposed a new efficacy metric, and showed that neurons in the trained network organise into functional clusters that evolve during training.

Especially noteworthy is the work on thermal detection with Temporal Convolutional Networks (TCNs), presented at IEEE ICRA 2024. It is an end-to-end approach: raw sensor sequences are fed directly to a network that estimates the position, strength and radius of encountered thermals — no separate algorithms per thermal required.

## 3. Neural network architectures for flight-trajectory analysis

### 3.1 Recurrent networks: LSTM and GRU

Long short-term memory networks (LSTM, Hochreiter & Schmidhuber, 1997) and gated recurrent units (GRU, Cho et al., 2014) are classical tools for sequence analysis. For flight data they can model temporal dependencies in the vario, GNSS coordinates and heading, which makes them a natural choice for trajectory prediction.

Ma & Tian (2020) showed that a hybrid CNN-LSTM architecture is effective for 4D aircraft trajectory prediction. For trajectory prediction in transport systems, LSTM traditionally performs well over short horizons but degrades on long sequences due to vanishing gradients.

GRU has fewer parameters than LSTM, an advantage for power-limited on-board systems. Empirical comparisons usually show only minor differences between LSTM and GRU on medium-length sequences.

### 3.2 Convolutional networks: 1D CNN and TCN

One-dimensional convolutional neural networks (1D CNN) process time series in parallel, unlike RNNs, which gives them an edge in training and inference speed. Temporal Convolutional Networks (TCN, Bai et al., 2018) extend 1D CNNs with causal and dilated convolutions, expanding the temporal receptive field without growing depth.

In the thermal-detection work (IEEE ICRA 2024), the TCN architecture was chosen specifically for the end-to-end task of jointly detecting and parameterising multiple updrafts. The authors showed that TCN reliably detects thermals using only the aircraft's position and the local vertical wind speed. For our problem, TCN is particularly attractive because its causal architecture is compatible with real-time processing.

### 3.3 Transformers

The Transformer architecture (Vaswani et al., 2017), built on self-attention, captures long-range dependencies in time series without the limitations of RNNs. The noise-robust aircraft-trajectory prediction work in *Scientific Reports* (2025) demonstrated that the T+N+HP+AR model — a transformer with a noise module, hybrid positional encoding and autoregression — significantly outperforms LSTM and Transformer-XL on long sequences.

Giuliari et al. (2020) showed that a vanilla Transformer without elaborate interaction modules is competitive on trajectory forecasting. TrajectoFormer (2024), for autonomous-vehicle trajectory prediction, showed significantly faster training and higher accuracy than LSTM.

For the thermal-soaring problem, transformers have a key advantage: self-attention lets the model look at arbitrary points in the flight history within its window, which is critical for identifying lift maxima from previous circles.

### 3.4 Architecture comparison

| Criterion | LSTM / GRU | 1D CNN / TCN | Transformer | Recommendation |
| --- | --- | --- | --- | --- |
| Long-range dependencies | Moderate | TCN: good (dilated) | Excellent (self-attention) | Transformer for windows > 60 s |
| Inference speed | Medium | High | Medium (length-dependent) | TCN for real-time MCU |
| Parameter count | GRU: compact | Compact | Larger | GRU / TCN for edge devices |
| Noise robustness | Moderate | Moderate | Enhanced (with noise module) | Transformer + noise layer |
| Interpretability | Low | Medium | High (attention maps) | Transformer for analysis |

## 4. Noise and filtering

### 4.1 Sources of noise in flight data

GNSS coordinates in flight are subject to many error sources: multipath, ionospheric delays, signal losses during banking, coordinate quantisation. Typical consumer-grade GNSS accuracy is 3–5 metres horizontally, but in a dynamic flight with banks up to 45° the error can grow. Barometric altitude is significantly more accurate than GNSS altitude (about 0.1–0.5 m), but is affected by atmospheric pressure and dynamic pressure.

Discretisation adds further noise: at a 1 Hz logging rate a glider covers 25–40 m per sample, which creates significant localisation uncertainty for short-lived phenomena. Computing vertical speed as the time derivative of altitude amplifies high-frequency noise.

### 4.2 Classical filtering methods

The Kalman filter (Kalman, 1960) remains the standard tool for smoothing GNSS trajectories. It recursively estimates the state of a dynamic system (position + velocity) by combining a motion model with noisy measurements. For linear systems it is optimal in the mean-squared-error sense. In autopilot stacks (ArduPilot EKF) the extended Kalman filter (EKF) fuses GNSS, barometer, accelerometer and gyroscope for joint estimation of position, velocity and attitude.

For non-linear systems the standard variants are EKF (linearisation around the current estimate), UKF (sigma points for non-linear approximation), and CKF (cubature filter). Research shows that the standard Kalman filter handles Gaussian noise well but performs worse on the non-Gaussian noise of multipath (Liu et al., 2023).

### 4.3 ML-based filtering and trajectory reconstruction

Recent work uses neural networks to reconstruct "ground truth" trajectories from noisy data. A spatiotemporal GAN with multi-head attention (2023) was proposed for denoising vehicle trajectories. SINDy (Sparse Identification of Non-linear Dynamics) has been applied to identify thermal parameters from noisy data in real time.

For the problem at hand I recommend a two-level scheme. Level one: classical EKF for GNSS-barometer fusion (proven, minimal latency). Level two: a neural module trained on (noisy input, reconstructed trajectory) pairs derived from high-precision post-processed dual-frequency GNSS recordings. This combines the reliability of Kalman with the adaptivity of a neural network.

## 5. Reinforcement learning for soaring

### 5.1 Problem formulation

Thermal soaring is naturally a sequential-decision problem. The agent (glider or pilot) observes the state (vario, GNSS, heading, bank), takes an action (bank, heading change), and receives a reward (altitude gained, or energy retained). The objective is to maximise cumulative reward — equivalent to maximising average climb rate or XC speed.

Reddy et al. (2018) first applied classical RL (Q-learning) to learning a soaring policy in field conditions. The state space included vertical air accelerations and roll torque. The action space was discrete bank angles. The reward was altitude gain. The policy was trained over several days of flight and demonstrated efficient thermal use.

Guilliard et al. (2018) proposed a POMDP formulation in which the model uncertainty for the thermal (position, strength, radius) is explicitly accounted for in decision-making. The POMDSoar agent performs a Bayesian update of the parameter distribution from observations and plans actions with a finite horizon, balancing exploration and exploitation.

### 5.2 Deep reinforcement learning

Harel et al. (2024) applied PPO (Proximal Policy Optimization) with a neural policy to learning soaring in a simulator with horizontal wind. The policy was a neural network mapping state (position relative to thermal, velocity, vertical wind) to a continuous action (bank). The authors found characteristic bottlenecks in the learning process and that neurons in the trained network organise into functional clusters.

For energy-harvesting from thermals, TD3 (Twin Delayed Deep Deterministic Policy Gradient) was applied with a six-DOF glider model (*Aerospace*, 2023). The authors introduced a policy-symmetry method and a wind-shear correction module to improve generalisation.

### 5.3 Applicability of RL to the exit problem

Optimal thermal exit can be modelled as an RL environment as follows. **State**: current altitude, average climb rate over the last N circles, climb-rate trend, distance to next waypoint, altitude above terrain, forecast conditions along the route. **Action**: keep circling (with a bank choice) or leave (with a heading choice). **Reward**: XC speed (distance / time) — the standard efficiency metric in competition soaring. **Environment**: glide-slope model from current altitude given wind and the glider polar.

This formulation has direct analogues in "stay vs. go" decision problems (optimal stopping) in RL and is well-supported by the literature. A full "search–use–exit" strategy was studied by *Aerospace* (2023) under randomly placed thermals.

## 6. Feasibility

### 6.1 Adequacy of historical data

Historical flight tracks are a rich data set for supervised learning: thousands of thermal episodes can be extracted with labelled variables (core position, climb rate, exit moment). For classification (thermal degradation) and regression (predicting core drift), historical data is adequate at the level of 500–1,000 flight hours under varied weather conditions.

For RL — especially the exit policy — historical data has a key limitation: it reflects the sub-optimal strategies of specific pilots. To work around this, I recommend a hybrid pipeline: (1) pre-train on historical data via imitation learning (behavioural cloning); (2) fine-tune in a simulator with an atmospheric model calibrated to real data; (3) optional fine-tuning on real flights via incremental online updates.

### 6.2 On-board hardware requirements

Current microcontrollers (ESP32-S3, STM32H7, Raspberry Pi Zero 2W) and edge accelerators (Coral Edge TPU, NVIDIA Jetson Nano) can run inference of compact models (TCN, GRU with ~50K parameters) with sub-100 ms latency. Transformer models may need distillation or quantisation. Power can be supplied from the on-board battery (typical 0.5–3 W).

For a human pilot (as opposed to a UAV autopilot) the system is advisory: it makes recommendations, not control inputs. This reduces reliability requirements compared with an autopilot and allows more aggressive model optimisation.

### 6.3 Key risks

Main risks: (1) domain shift between training and real-world conditions (regional differences in thermal character, season, surface type); (2) limited GNSS accuracy in dynamic banked flight; (3) system latency — the lag between a change in conditions and the model's reaction; (4) certification and legal-liability questions for on-board aviation hardware.

## 7. Development plan

### Stage 1. Data collection and preparation (2–3 months)

Build a flight-track database in IGC/KML formats. Develop a preprocessing pipeline: parsing, EKF filtering, computing derived quantities (vario, turn rate), segmenting episodes into thermals. Annotate: automatically label core position by per-circle vario maximum, classify phases (entry, circling, degradation, exit). Target: 1000+ flight hours, 10,000+ thermal episodes.

### Stage 2. Baseline models (2–3 months)

Implement and compare supervised models for task 1 (core-drift prediction) and task 2 (degradation classification): LSTM baseline, TCN, Transformer with positional encoding. Metrics: MAE for drift, precision/recall for classification. Ablations across input-window length, feature set, sampling rate.

### Stage 3. RL module and simulator (3–4 months)

Build a thermal simulator based on Gedeon's model with parameters extracted from real data. Formulate the "optimal exit" RL task: environment, state and action spaces, reward function (XC speed). Train the agent (PPO/TD3). Optionally integrate the supervised models from stage 2 into the agent's observation loop.

### Stage 4. Integration and edge optimisation (2–3 months)

Combine modules into a single system: preprocessing → core prediction → thermal classification → heading recommendation. Optimise for the on-board device: quantisation (INT8), pruning, distillation. Develop a data-exchange protocol (BLE / Wi-Fi) with the pilot's display. Bench tests on recorded data (offline simulation).

### Stage 5. Flight tests and validation (3–6 months)

Run flight tests in "shadow mode" (system runs, but the pilot does not follow recommendations — post-hoc comparison). Gradually transition to active mode while measuring impact on average XC speed. Gather pilot-tester feedback. Fine-tune the model on new data (online fine-tuning). Prepare for production if results are positive.

## 8. Conclusions

This survey shows that an on-board AI advisory system for soaring is feasible and rests on a mature scientific foundation. Key findings:

First, the autonomous-soaring problem has been solved by RL both in simulation and in real flight (Reddy et al., 2018; Guilliard et al., 2018; Harel et al., 2024). The fundamental approach works.

Second, TCN and Transformer are the most promising architectures for flight-time-series analysis. TCN suits real-time inference on edge devices; Transformer suits high-accuracy prediction with interpretable attention maps.

Third, GNSS noise can be addressed by combining EKF (primary filtering) and ML methods (adaptive smoothing). Barometric vario combined with inertial sensors gives a high-quality input signal.

Fourth, historical tracks are sufficient for the supervised components; the RL components need a hybrid approach with a simulator and optional online fine-tuning.

The proposed five-stage plan allows iterative validation and minimises technical risk. If executed successfully, the system can meaningfully raise the effectiveness and safety of soaring flight, making the craft of elite pilots accessible to a much wider audience.

## 9. References

[1] Reddy, G., Celani, A., Sejnowski, T. J., & Vergassola, M. (2018). Glider soaring via reinforcement learning in the field. *Nature*, 562(7726), 236–239. <https://doi.org/10.1038/s41586-018-0533-0>

[2] Harel, R., Lavi, B., & Bhatt, S. (2024). Revealing principles of autonomous thermal soaring in windy conditions using vulture-inspired deep reinforcement-learning. *Nature Communications*, 15, 4992. <https://doi.org/10.1038/s41467-024-48670-x>

[3] Guilliard, I., Rogahn, R., Piavis, J., & Kolobov, A. (2018). Autonomous Thermalling as a Partially Observable Markov Decision Process. *Robotics: Science and Systems XIV*. arXiv:1805.09875

[4] Allen, M. J. (2006). Updraft model for development of autonomous soaring uninhabited air vehicles. *44th AIAA Aerospace Sciences Meeting*, AIAA-2006-1510.

[5] Andersson, K., Kaminer, I., Dobrokhodov, V., & Cichella, V. (2012). Thermal Centering Control for Autonomous Soaring: Stability Analysis and Flight Test Results. *Journal of Guidance, Control, and Dynamics*, 35(3), 963–975. <https://doi.org/10.2514/1.56292>

[6] El Tin, F., Borowczyk, A., Sharf, I., & Nahon, M. (2022). Turn Decisions for Autonomous Thermalling of Unmanned Aerial Gliders. *Journal of Intelligent & Robotic Systems*, 104, 5. <https://doi.org/10.1007/s10846-021-01547-3>

[7] Tabor, S., Guilliard, I., & Kolobov, A. (2018). ArduSoar: An open-source thermalling controller for resource-constrained autopilots. *IROS 2018*.

[8] Vaswani, A. et al. (2017). Attention Is All You Need. *NeurIPS 2017*. arXiv:1706.03762

[9] Hochreiter, S. & Schmidhuber, J. (1997). Long Short-Term Memory. *Neural Computation*, 9(8), 1735–1780. <https://doi.org/10.1162/neco.1997.9.8.1735>

[10] Cho, K. et al. (2014). Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation. arXiv:1406.1078

[11] Bai, S., Kolter, J. Z., & Koltun, V. (2018). An Empirical Evaluation of Generic Convolutional and Recurrent Networks for Sequence Modeling. arXiv:1803.01271

[12] Giuliari, F., Hasan, I., Cristani, M., & Galasso, F. (2020). Transformer Networks for Trajectory Forecasting. arXiv:2003.08111

[13] Ma, L. & Tian, S. (2020). A hybrid CNN-LSTM model for aircraft 4D trajectory prediction. *IEEE Access*, 8, 134668–134680. <https://doi.org/10.1109/ACCESS.2020.3010963>

[14] Noise-Robust Autoregressive Transformer for Aircraft Trajectory Prediction (2025). *Scientific Reports*, 15, 11490. <https://doi.org/10.1038/s41598-025-96512-7>

[15] End-to-End Thermal Updraft Detection and Estimation for Autonomous Soaring Using Temporal Convolutional Networks (2024). *IEEE ICRA 2024*. <https://doi.org/10.1109/ICUAS60882.2024.10611479>

[16] Kahn, A. D. (2019). Extended Kalman Filter Estimators for Thermal Localization. *AIAA SciTech*.

[17] Liu, Y. et al. (2023). Trajectory Smoothing Algorithm Based on Kalman Filter. *IEEE ICPICS 2023*. <https://doi.org/10.1109/ICPICS58376.2023.10148596>

[18] Kalman, R. E. (1960). A New Approach to Linear Filtering and Prediction Problems. *Journal of Basic Engineering*, 82(1), 35–45.

[19] Gedeon, J. (1973). Dynamic analysis of dolphin-style thermal cross-country flight. *Technical Soaring*, 3, 17–34.

[20] Wharington, J. & Herszberg, I. (1998). Control of a high endurance unmanned air vehicle. *Proc. 21st ICAS Congress*.

[21] Reichmann, H. (1993). *Cross-Country Soaring*. 7th edition.

[22] Edwards, D. J. (2016). Thermal Updraft Estimation Using Neural Networks and Least-Squares Regression. *AIAA*.

[23] Doncieux, S. et al. (2003). Evolutionary Optimization of Neural Network for Soaring Strategy. *Proc. GECCO*.

[24] Raffin, A. et al. (2021). Stable-Baselines3: Reliable RL Implementations. *JMLR*, 22, 12348–12355.

[25] Sutton, R. S. & Barto, A. G. (2018). *Reinforcement Learning: An Introduction*. 2nd ed., MIT Press.

[26] Schulman, J. et al. (2017). Proximal Policy Optimization Algorithms. arXiv:1707.06347

[27] Fujimoto, S. et al. (2018). Addressing Function Approximation Error in Actor-Critic Methods (TD3). *ICML 2018*. arXiv:1802.09477

[28] Chen, Y. et al. (2021). S2TNet: Spatio-Temporal Transformer Networks for Trajectory Prediction. *ACML 2021*.

[29] An Online Data-Driven Method for Accurate Detection of Thermal Updrafts Using SINDy (2024). *Aerospace*, 11(10), 858. <https://doi.org/10.3390/aerospace11100858>

[30] Energy-Harvesting Strategy Investigation for Glider Autonomous Soaring Using RL (2023). *Aerospace*, 10(10), 895. <https://doi.org/10.3390/aerospace10100895>

[31] Study on the Glider Soaring Strategy in Random Location Thermal Updraft via RL (2023). *Aerospace*, 10(10), 834. <https://doi.org/10.3390/aerospace10100834>

[32] Gavrinev, V. O. et al. (2024). Autonomous Thermal Soaring Methods: A Systematic Review. *Journal of Intelligent & Robotic Systems*.
