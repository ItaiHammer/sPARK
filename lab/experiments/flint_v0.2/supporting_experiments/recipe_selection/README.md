# Flint v0.2 recipe selection

All variants below used the same 55,283 earlier observations and 3,696 validation targets. The fitted weights stayed fixed throughout Aug 31-Sep 20, 2026. Daytime scores use the same 2,340 targets from 07:00-21:30 Pacific.

| Change | Daytime MAE | Daytime RMSE |
| --- | ---: | ---: |
| Eight inputs, including days since instruction began | 9.93 | 15.71 |
| Seven inputs, 50 rows per leaf, L2 = 0 | 9.75 | 15.66 |
| Seven inputs, 20 rows per leaf, L2 = 0 | 9.16 | 15.31 |
| Seven inputs, 50 rows per leaf, L2 = 1 | 9.34 | **15.11** |
| Seven inputs, 20 rows per leaf, L2 = 1 | **9.05** | 15.29 |

The selected recipe uses the seven-input feature list and both parameter changes. Scores were inspected during selection. The [term snapshot](academic_terms.csv) also feeds the v0.3 replay. [Back to Flint v0.2](../../README.md).
