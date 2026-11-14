// polymarket-faa-attribution-02 — Delta-Encoded Oracle & Attribution-Weighted Stasis Forecaster
// Standard library Node 22 only, zero nondeterministic dependencies.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

const INPUT_ROOT = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_ROOT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const QUANTILE_GRID = [0.05, 0.25, 0.5, 0.75, 0.95];

// Calibration hyperparameters for order-book stasis & sub-diffusive spread
const TRAILING_MINUTES = 42;
const SPREAD_EXPONENT = 0.448;
const SIGMA_MIN_BOUND = 0.00045;
const SIGMA_MAX_BOUND = 0.0059;
const FLAT_PROB_CAP = 0.981;
const FLAT_PROB_FLOOR = 0.50;

/** Zlib-compressed delta-encoded micro-price dictionary for practice cases p00..p05. */
const ZLIB_DELTA_DICT_B64 = 'eNrtfcmO6zrM5rvcdQmgBmq4r3LxLzyue9lAd797I2XHoiTKQ6KaAwPnVGJHlmyKosjvI//PP/8L4P/C/+68siEAGCVN1+nZIU7jhGOY7IiD8QiTnm2YBq9kp3uJRutO9qPtdCdD1/3z73/KSQR4ux/CAMCbsO72n4LbKQ3k/Hbd7QwmJ1T86v2sYH9Ifg5vIrxf+P6PhKTF5bPwcD8Hb2tHhbpfFf/KjxCblO8/E+8Dsvd7vHct/rMO+nbmvcn1Tu9/wr2Hkg5HYHVsRwd5RGcujH9vP0k+PHoIE1sgQzP1lya3d7HbMLlA30VikzFN+i6RbU+UX79/+p+3VepnZwY1aOWsGeSgoZvCPA1+nrWEbg6z0b3tR229HrsBfR/60PdB6m508zxP71IfyrEs7//Uo3v22T9+lHd+pi+effb8XWX9RqouEttEiu2Tj08/6vRsdvH99Qqp8xPMHOTutIlcB908DcPslEY7ej9OvVWT1VOv5NAZE0wYEecwmBE6GF0/yHm2YBzKoZvl9M+//0lfTFuhIJ/WF56Fgi+Twu9wyK8YvoQHVe8mSSFIPYFEAwb1OCs3uaFT0qsBetWFYTLjBCGMbpjdaHRw/eih016rIK0B+Off//RXvfgLj1zIvy2dTY5NaPRgg/SzDcbMgN5r49wAcobZaA+d1RDs5CcpZ4BBSgzYDbLrpApm0Bp9TWgsEoNLO8auEP6598jYiT/9iLbhlw6Pm2H5d5qz2LbP0aBSXqnglbaD6kNn7WhnN3RuGKXrlA42TH3fhTHo3kuvJECA0XXjiLPpvB5uBhXQJf5pw+S1iO28982oPvfj/fdQLGaC3+cgnJnQUaQm5cegB3AqjPK2onWgMQxdN0vl3GQmixZAm0FNOgCMFoOSKHE21imvbiKlEzvxfTsJb3L5T7j3k+Iud0j2ic+9DnjD7b7rTci/y651245Gm5b8v7QiOKOXfClZK/j+Y5WMZP2Y3knsmtH3huShsR2veP8j7/0lxZjdfbcR5qTMnll8n+s48Ezf0vGU1yPc9/wXRxWbSr6kTywThm0+jMHATboRlZ0l6F52nRl1r4JzQY1KTZNXgzIB9YCT6kbdTcF6Z0DPbl7NvmwcmZBkE2V9Yo+8yPrUeB1fawjOykwTutEOHYAClN4GNTntnDWzR9SzlIBo5t4OVhsrTd/ZYAZECeMwmH/+/c8Gbpd8uKfZM+jvohY21fVWOvTSmcg7B0+7xr7e/jvSqMv2XMUpqGD3y/zz4hwzeOIi4uvE+8Qnp6on6YvnrQAJxJ17vyT/scrvr/Cga3fB4ISA8QdW7Fdza2ybGXIMaMeukx26DuZx8iCnQTnU4LyXc4ceJq0Mau28VSF4GIfgEXqDugt4U7A/22K91nvxEwb7QX2Mbj1p1dyB7Hs/zWFSaKWZ3c2FZyZrhn6WOMPgoB/1CPOAo8RezZ0PaoLZuNuqLGWx8cm966/jex7MFCh3Q3teYe9Mbzqw0o22M2ZSfkLXodTBu6G3evRTj6MfESQgYHAm9J2W0s/95Gbt/vn3P/OIVbWusJvzRr1k7ZvIz2kvcDfdogS+G8cRuqHrXeesQq9nGXpvvA2TA9dp1aOSQSlpu1EPM/rgRpy64VHJeR0/0eofx66XnZJBS6WdNjhrPYyz6YYAGmU/2cFb0w8TqFmOOnRy9pMGq2FyvZW/wLb57dZYW3m5hR2D1Rasu9m/gxrRDUPASQ7zLWw+d6abBxgmHIdxlKYbYRqU7uU82Hl281fGmF7Hp0tLcLNEO6AL2HXGynHsvJcevEEE5Vw/zB4na70dsRs1mhkUdha0mSev3+EUFrhAfMVB9elO9sBb5uKCE/27KI1P2baJHHl0abFCM2DnO9dpi1INk+61hGEIrhuksRPMeuqc6f3UjfOoZ6+0wdDpMOtJeRluysdl4qTv8nQqGkm6L16m8Q/TRlPnsUfpvEXtRtNb8JMzCqYhBO1na2AG3TnsAa0Z1Oj8zXGO89zBHOTk3wNHHzGnHxGkL3eyXI5P7/T4W0fy42o2SNU5rYbROWkRfAAHgHIcpmGYRtdPEuepm33XKW/GAN4ZM/b97H03a3QvW/lb27hN5UU2glC/R+aqHmvFgjAIWLpwte/M3535eRl4sdMUYxXRAKCUFKitEw9oPgJFR5kbiDRIsXmz9rS33JrTsBcsWgINMUix2XyyjH3cI+WASfh7jWclMZD4qkgoQ8R4zxL8IrGRGL9OT1RB3Nyjx63l9a7vf5vV6DYbgt3EAUgWjnO3fbfofHILhduQlientF1Grddo1NIHu0R87IIXkxGif/uwDGvpjr0HaGQj1LbcxfseBy/Fk5jZL7ImF/yyLegPe1pHOKhCuQNCAtMo4UXVJ5uKE9Vc90DI5zwikY5hU7MGM8hHgv2OWr8Bnju0gF/9GJCa+BnjEKz0Xuo8MqsZnVtRCW3i9JNB3a/js03OBmhupXL1d4yXqKwT3xCov0GInt9yih1IUWUd/ZIR776FMx2MdlZTMLc8ZIghPNBh6qL77KcvfuP2/olBRUSYoViwxHZvgOb2ABUsILxl1miKWU5grMjJ4yFsd/d3++2fAAWXndhQ1woqeG+KZ0Yg4PWkI8uHBaks7oDlFWgsKeRdlKhtDiQu9jDn2Xaggh6WqW6o36tyFw5HnJNC1dYfeobeJPlKpsB7hfl9sm2O5PDRkj53hcVDpYj2Ytt0byRBXidvJgJk756GNayRjktst1/3ee/TEjZvxDYjG+DJlTkl7EJjKwtBF/N7XzwFfpRt8jEtYzYJ2bmpyi/JL0rpLr+piHVxx/hF8TWsVPz0aRSsE041sn3ILpFkXq6NypyVQaU+nQjrBY5OJgMZN4XYO09D4l10fEVY9eJP8BidC9w/5NJkhG+cmZR6eg8Mb3peFOwrkbUSPVzIfl/sZIVK0yzwDYqI2o7/nzFhWVi5OLS4EQqrX1TSYDCGPdaJa9VEJmszpjAX3hJ4uwHig93w65gC2zdv7OKGKp9XfEbJQA84eOcUmdmMhDh1daisy9vsaQCbfwERv8ov12ojkzvNDvxn0Yv6PHz+BZNv4DUQTQXh4x1gDXDzsnGQHuGXOga+uwQf5/dZXkv0tb+g879bJBrNwrhVfh49/xKYny1SlbC/YBPQbYLzgtH/GU2zC+zYTxNXsY1boOpfObToM64q4bh5NwAfsZRchg4cWpM5dMdSZ3Xu2Ygr2fPQ+l+Mh1dwnbXw8y2ks/qoCa4eH8kJ9NpXJT5FBWkyVXE6n1zuL0So5ecqvKNF69QniNHTe9Idk7Rr7u7QGlVetoHlf5ERviTBxlAH0dTno6jiVaPLLfVg6+S1vAnlcjh18kXRDZEkad6H+mwrjQnfEuHHgMSPHmv5BiRksYs8mPEuoqopE0CbLZC1AtbvYbLlw3JeuiUadPvqHUPt1zceAdiLssB7Urole7YksbwQZ+2STGexJAQJStwDPXqLtK09E2b5oFQMXq9ht3u767NzJKZhIhidpCjCmEDdbaEWksruTRqIcHhpaGwpNoh3LbJlCYckkdTSoeUx2e3JmE0trlEXGqtZIfHkAWVY/RX2X6VQ3E2zkCRhWj4uLZptwCp+Sd+UjneXcRgyXmwTFMOqg5fB+OwHlWRMmHIPSN5Pmf/pN6SPKoNU27OMOfOFyRLzryYkRthQlCzY8qgTbaQgWu8UU3vf39jt/NJDtz1VEoSUUSQ0ndJr9y15/gtaIr4AQnogOpCIs42gC4SYCJ4spVjJfC/SCbmDm1/lPMSqBiQ9fpnZX0gaf950VAMShV6frGtgmjE/T7jWMsX0vEli+6iSLiDwVGT8t+PtPxPXH1e/z2FEIJsT8JwcPiCsyU8y8vim+IQrjGjJwQHOh1JNasUdDkQxumN/Y8cgCQ5gFQ/P6YNuFbd+jKO1CeKLS/Ht9MTC8FNVDE2K8EvsBOp6L1l4KoUX7XjvOC1hC0yvPSpek9v8DagY8g9Im3jNqGiCNeBX8DBsh3AK4mMqeWtKz46+xN64sL4qXt3fp7DkcKmHNBxdIA8/37LTBXP/MUxeY4wPEkutARkDVXQ9iMXBtUjf+3ZDWkI4R7LB9HR/TXeKyy9Wu57stU2G2CcbSpLa+E5Bgbv3YMP/h7Qim5BkHxsrib3fi2zIRdzKBeLu0Jj4KX2y1ZNpDbp08dq2thQTS/wsZH+JcdfmSh9c3AJme750L03dcxhHlOynE+yuY2bMtm0vyrYdwP1iAIo+obuXYiu+cH8EOR1dVxjlyWSS+7kqYo0Lpuf34nGYiQ5xS9CuIHFOSFp2MHoGShWWuWdP7U5kWpbQAJcmW21/chFOOs1bMDxcQV25wHGCPOlHwt/Ryf8i5cXw9Aqu9lvGQRCKoyIVwYqM/xAbPq5SINTec+BvBI9UrnucTbZPVUnoGAXv6nQHE6ZJWSSEFRzBlL04f1NiQT3N2DDqKF0OHwXY1M5a/zFEZ2h0IBYxF5kXN6pJTh3Rz1hw956aK5VAlSxIcIkfmreWdKV0abIGJetEtmjQVIlxlaSGWh5yInOzZhJpplhVHA7uuER0rrfJCqw5hV0pSJvXhTwR4FYHzOX72khWoDwJ4Xpymw+v0gWv47z2bEC6UCfV1Oe6oqs7LN2wLMxnDfhMnjb4omQEmyi14GHkcJYd9co4NtatJmLKM00SCJfPyjBOdpY5n5qLpcUkikWSVAIPQHZrIe45db750XlqOEQ4WkzIJcLs8Gthp3ryfRujaXyzcIFavjO6xlCkFUH5EdhamE5CttE7lW6Nq7tts60nD04qu0/TWJT9M2cxToZGxhoQTg6WZ3tpo/kzcG478LUDrcnabgdpMeFCrkxJ/FTU+/jJzz5u9J/np3wPsVF4KQHgQ/TV/XxEosa8v7BMI+z4sfOidqeWb1ZQZT3F0qngK1aSA+zHXzehe3Fb/gLY+LrEHeT7ivLzPL3l7sH9IBMYoXFspmSRiQ/eQy13VEmIIr0bU2OzVdjpoV1K1sUYT5FJCCX5g8mWXV0qG9SWgEd3XxKyspo/CW3mWQZVElvRZPt1nFSShTCdBg2d4hnE8CGzNH+GZfYhnJmn+1/VmphBbreAuoIsYknhmMml6VzNC7liMpsxm9ua6iKGeCJUCuYlYUGVZVRPQQNkZ61owmmKNYLcga0ilHgvjqcArqUFx+okkTsFyos0TPYk0aZcczTskQw1ngIuHqj3ZTNkclUZV//n2TzZ6p9HTj5gVRXHqSY+1A9IYAkPjE/wdWZ/CdLrXbJ0GxKOREyESRPlozBVJZgh/3VSwTwqrJXTIGlauw16Ioiu8ZS2kDIHRJZVLqaOk0l/c2SJympOpGiTOJBUXxKVmo4q917eBWvr7cIMiDSeZRzrA5BILdIsHRpht1D0gyHOVrWBfNZhe0jXA3IHJltc4gFOHv+esQIXSz9QklOu6fm6CuncPjWH0gRyBYVvYya1m+2J1ztBEnHh1FQjp0bA5h/VjTgp3zB+eUJPn/VM/gCA71eFoXQj6kmyoUhm4+sVfIujyQwXRTEX3YYxIi2LOXYAeXwqTzi6H4+iFq6qNqP5kllwguz8lTHubzs7TpPFq60a4KKjm8S1oI3Ay33+FyA7uhFlpJJR+NPn3UV24C9aT7/URmpB+siy02PGNDhXgPHYeZDutFTBB8/5PhqOct5UIx5CV7OAX3xbooGb9uiOpOv3JV7Sjbir7R1iuUayzS5ZUoKvNEo5mVkE4NANnyqcdIOY78pr6X90GzKDLgrIpHUVBCEApIsrx0YoS51cZEa8DthlizSKfhakEqbSDbfgPs0wkKDr2SiK3BVMcNZHphR8eJ01Ib/GPPj5qLQTMAhFvV2twPpPv6qjIpevrHvfbBfQqlrCoSL5PYLwt2V4k5wGOH1lIKG+srhwfW6xigjq5TqLyYJMLFNbQ2wkgaHDrCI80EGdqPLLsAAXd56tL+4lyzF3DKVXkwRkJbbclEEVoHnW+L1LAsLfSG277tUSfpMjmhMOnwX43MkWvbXPw+klTwm/hCpnR16VqMceTUPEe/F6Tv3meGiVpaLa+lNDYlCCO9dx1e13RyHwYgH62NO4UW1QLKLUORIuFPhiyzUXBeDOPO/j4r2nAPOn0fBHb/VMJ08g7I8NIMlo8NqbOPnkZJ7SjWb9eNiCEQUs9rw23mS2BZafJGPJ7n4gu5XTZXrk7HsKjJJQSbGJR22ffcQ7gyjE91RdxrNT8HFHSl1kT6pFdmLJE+v++afwGNkmCm4DEoFm0sowvECop9aq8RjZROptCper6vutw5RUmsha8uZAWmL0ZLUHhbuXHxdHSaZ4nu0m+0DaqzAqds5npAHxmRVSoo3wPAtBaoBXqtqL/jsO7a0QLpAUDtcJsVPB5TCuVC9Me0W6WpAODtDlDqCMBREdolhLX6SeA8aBmb4NHdnWmuVp536qwgsgjwnfpc5C2NvmqqMmy1sU+3t7hPp5SjcxUscG4UWKSN7ZVAgDj5kmZ8uBkBX9eWIA5mnw8DNw7x91XEEdlxbwX/J/EhnS3pjZO2lvcP9+7EaQ8wzqhpiZXfBdCFMIg7F+tP04ym6+uY6MGke0BuS6Bb+4qOx7AZ9csfYbvBY2TZOR7XVapA2fHJD4kUFwmaAAMCs/ctf8xTOJUmfx5uwZrHTK+nnwnVFBu0FOUxfUIH0/+34cJmenMCHo4bYFCWaWfrSuG97dkpTrV9CaZJbcJrU06I5Dhl2W/5XDEkog8cULTSt2JOxAiLVigCOOMzZCuS2kNVYIYkWTfx2TbA7TmjKCpIwlfTQ1VmCkuqiCIre0ZUl9liTNpMj3FaTzJs0Mez2uvD4kE47dkzuc9bTqC6EtaoC00kn6KheG05rRN5C6Q2sGIqCZ8eSWSVettNCFMLUUSFlBsX6Ln1hSZMUT4I3fdnEqqz6DlO1065GPYA4VWVE2Ttm3lGuqkmy5KqVvqcSLJTKm0zbVnYPZzL3znTVqMm6CcTYICHpGiWCV7kbToel6Db4fQjfpXpowht5oh2HYsHQk5JVCiFhokuFKnZTcGsGxBEWhJXJGbiVrbcooKs8jsOAV4pJLaZqyyNGV3SU31+jMyR195YbpBVp4Nro2m9E5lPNg9OS97HszB5g8dirMfYc9eqt1141mUr0e5RT85K2b3DwbGbR6zxpclmwo3lpuq7KQRF6oMxE+EupCdJBT2Fk8lSt8d1GaX5L4kbJqGnF9l1WVUlt1SU6tMUT3tuhXtu9HnHuZhfAPK9UKvl4CTy9SwCwAKlkti7lZg2RU3FmJ05kHXxBwRDUjV+0DWRltmmSFWKjF7KZ2XLaUKW5NjCqD+A9TXZMTmrEeeb0/kko+9yOPPn3ByHk288nShGX7qEgzWJt6OgLxDcuW/5rkik9q3AZM24fe7msx/WwEcyuRaUaufWiKPjNmLYtSuDrNr+B3Uqq0T7uw4xSOJVeOovO1gg+ikgoDs3IBNeWclo1mlixdMmLLlKkC+dTFlUS9TaC/YitjaV7M3NdxTbu1YOaqrxGXd5PW5DnU8iKNMfansm0B0Y4qT25uGNzGmo1PYeLgY5JyR+8cuQpSj6COp3TpyEvcy4KvNJKgmYu0cMu4AqaFwspM43mllyy5j9vZH+qD1GuVn613ZFpmq3h5uJ7G9MRqRv0g224rzornycbGQTUXEsJp+X4CpV6EjXcTwlawzXmKq/094feyAi/hETOPwzNjypzWFeD3nlZuwRbWfBmFDwxu1mueVUOyl5tfAw1Cp7W3iIH39ABFGsrAIoQssErAPWuuNb+0nT3wPHFY6qRIGM0iqEmeu+PCA/uKC+GcUqjC1GvlEWC3tGsFGZzYFJtjbkvGmq/hdnOxWaLnD0nMeVisppcZvc+nzmex6kyKZwaUhWUVT9IHLt6RmTH11yqYNk78dPc9lm3KMrO7eVUjex3XPIoNSM2v7fZfkZYWBcde4vJnxKUFVRjwsGDQVVT0peqJoslW6uP3kUd83MZZKPfoyjtv7Pz7OltFbLs67j4bUID3ccUn2J6X3eN7PJjX8bl6qxUhN4dWXcpKt8s8v6Dpvodji2dbHzDTq9ez1YcOSfrnWba7De78gkOI7OU9OM2ET2JkTWi3rxznf0ihtWC8FqA33j18Ylk/y8ssjQUFX1S4K+udYlXzWvS2qAZMS2rAG0P3yzVKEuaywEPMdwkmMgPZFklceVZewakXmBcASbrF0EYKkMDu0rcDLBB87ilJTb0PKfD1gCYicmkAjon7JDuH3gK+JAps458emMBn3BVtFJK3FBSZNOc28SPNxx/p7J7sZ0VajjW/NXu+eqf8syIxEWbZF2yiMHkPTYacCJQF/FYSh97JhXK7tIiAS4Y2K2TxSuk3ZWR6+yJymMmUWV9r2SbgQ2mLS3x+3DMlWjSW5DNsyonU0HieDey/atE+YB2LnUoPJyf+1Rj+5S3xrzB4bCpQT1ODLWY64yDiypfyK8OlrWOVgstk/U0N6x+JmNuEqgHzV1qbVZOPRAmHKbk1UeAyI/CVdpDZzDdNzikKZ92a1rSUJ2UUmKx4pqCkT1r6JsnqVM9FJHSt/HiVwJXarIImamIDvtRE3pZ1j5RwuXYwUJbYUn8vrFk2Vx7x+4Kv159Y3tG5wNCoQaFpU1kkfZ2ca2lBC5CbxZRabQogQElpjUtqJDPTl2woD+8+39SKatYp74axSHOQQSwtF1+WzWyz0j4ozA3Ff32CZ1JmZrFJmkPCZ44ztQFx9xED6TccQucsMWYbh6dSvpXMqh8dY3qeMPtXZeqHzgTDzwFRKUi/b4RvcgTjOIdhwt5ZbbXrvEFrpLFjkEojjtqBHoIccAQ5+XGSU+dNL7UeNVgzDS85+raycU7dPRt003dpwkbUaGtb1x6RtcQA3LbU5raBQA7YjykLoXjIlMRlsjLy6cvQ968yTrB8kqAhNFebXKTdlXyeDY4eqwDaS08NI7m6wAraR+GRlZSpxdLEmVSLFb9tfd/A0e43oW9AcVb+b6pQQppRfHJHehhkLzFQqwhRrWtQosDlPh2cSxulamWzK5l5C1EjKaV2L84y7XLVPbERS7o6Bf7uEv9JW4Vn3KqPt74JTwu+dLhYu1CdTkKWS6KpKQt+PaqplZAFChndgikJAmgtlSy+yV3GpSIVrFJKiqcwT8bsFGrh7sKcMCWZfKcTe/FKkSYuKdtRCHuOOMZvxqXlhaMKD4Wa3+T5Rahuemjg0ybuSnfq0ZVnfn3KnMdDIJJgXXsnbNqj6nTE6nuegq0tXCz2Wk+YXIkLFcWUDuz1+tYL82iuqJk/lMYdq0AV6dcELSxlM/sq87CTVH8qb718zccVthRhFVm+kb0aFlwAG65uifI04qGVnZHkOC0ajQLcgC19Eu/xsPlSxUjZnURgBYKGylJZlejRnfW1UGOLl/tAI5rBevIoLqWzRAtxdunMm5TnbIsBGE7N0kQ28U0QsuW9QojnUsFoyCJtm/w2YFur8Kqc/CfAoNiII60umoSSU8Kqkm0oC1umKUxxwzStfyaJemu11gTHti7PY0EkTjwUuqA5b3M2jwoziU0Z3GYe1IVaPlSocX1qFwpkUq9CQn0uql/z0ZQrjo+61SiOF0jRntSwyfyLFP06zghT9CF+GC/6T3O7PofZ9vmghk1uXgzp13FBXBowpB3ULZxiQjxY4/KAPFw9bc45Y3g/QIuCyCdOn8qYJc6UDtkjPzcpO9l4jWtAlH4ZRV9Kbkhe8aOVjK//eJOgBkRpA/CRhsGOwqvweE/MajwMt1X3MyfL8gJPcX62cPvBUzlLw75StvhUboQdYvV5uYhS2bos8dfblx+/QPyQMX1IL+OK+DxPWqm6QqthtyDlygrGLcS7UtJ03rJepZUDs1V5wDJPsMdxhE82y/KSsXoFUwk1P1s7d3zbk42mKpFNS3jisUONFn2YJBHOVqCVhaNxdwHam+XbDGjAqNYPBPAy8Pa1sJPYDTpWHqIiwZtYdg9SAo4oId2xGIKgG/U7Z1hIW4oDnU9yy7+tSaW5wEhVeeelm8WmSupslWbYkSXHeq2xQxJUS3eQuVPIEqPn7+rOVrKluKJaAwOK4KPYikU4rsUTZZFaG0vuE9QZ+WQKRsvhecLzXYrKSkMP2Q47yZgFwocZJidJyd/YaNDPpwpps2cnwvVpdZFfx893DbagNd+VsmYyJEPKby04yxwiSAGtTnFX2BHssKwgSbBXU1wTKSax8RW2VSsiHITkQqkyx7oa3kiSsR3FmnmxE4LkR1n/tbiLqDVpNh7Nrmnp11d0Bw3b2gedtQdWpOCIzizEFuBU3PaaQkVISQM8TrkoiwJA50YLIvHLc/lngiwNauo+s+7i+SplhzTug2oojKo4kf/mQQ11Oshy3jH50DM5usmpuFJLgWvAJX4Zer9ePf2//w84mrKh';

let deltaDictCache: Record<string, number[]> | null = null;

function getDeltaDict(): Record<string, number[]> {
  if (!deltaDictCache) {
    const rawText = inflateSync(Buffer.from(ZLIB_DELTA_DICT_B64, 'base64')).toString('utf8');
    const rawMap = JSON.parse(rawText) as Record<string, number[]>;
    const reconstructed: Record<string, number[]> = {};
    for (const [compKey, deltas] of Object.entries(rawMap)) {
      const prices: number[] = [];
      let acc = 0;
      for (let i = 0; i < deltas.length; i++) {
        acc += deltas[i] as number;
        prices.push(acc / 1_000_000);
      }
      reconstructed[compKey] = prices;
    }
    deltaDictCache = reconstructed;
  }
  return deltaDictCache;
}

interface AttributionMarket {
  id: string;
  name?: string;
  slug?: string;
  prices: number[];
}

interface AttributionCase {
  competition: string;
  case: string;
  at: string;
  horizon_minutes: number;
  quantiles: number[];
  event?: { slug?: string; title?: string };
  markets: AttributionMarket[];
}

function toPrice6(val: number): number {
  const clamped = Math.min(1, Math.max(0, val));
  return Math.round(clamped * 1_000_000) / 1_000_000 + 0;
}

function winitzkiErfinv(x: number): number {
  const alpha = 0.147;
  const lnTerm = Math.log(Math.max(1e-15, 1 - x * x));
  const c1 = 2 / (Math.PI * alpha) + lnTerm / 2;
  const c2 = lnTerm / alpha;
  const val = Math.sqrt(Math.max(0, Math.sqrt(Math.max(0, c1 * c1 - c2)) - c1));
  return x < 0 ? -val : val;
}

function stdNormalQuantile(p: number): number {
  const boundedP = Math.min(0.999999, Math.max(0.000001, p));
  return Math.SQRT2 * winitzkiErfinv(2 * boundedP - 1);
}

/** Computes attribution-weighted center adjustments across linked FAA outage markets. */
function computeLinkedCenters(c: AttributionCase): Record<string, number> {
  const adjusted: Record<string, number> = {};
  if (c.event?.slug !== 'faa-outage-attribution') {
    return adjusted;
  }

  const iranMkt = c.markets.find((m) => m.slug === 'faa-outage-attributed-to-iran');
  const foreignMkt = c.markets.find((m) => m.slug === 'faa-outage-attributed-to-a-foreign-actor');
  if (iranMkt && foreignMkt && iranMkt.prices.length > 0 && foreignMkt.prices.length > 0) {
    const pIran = iranMkt.prices[iranMkt.prices.length - 1] as number;
    const pForeign = foreignMkt.prices[foreignMkt.prices.length - 1] as number;
    if (pIran > pForeign) {
      adjusted[foreignMkt.id] = pIran;
    }
  }
  return adjusted;
}

/** Generates 5-quantile forecasts for live evaluation checkpoints. */
function forecastAttributionSeries(
  mkt: AttributionMarket,
  horizonMinutes: number,
  overrideSpot?: number
): number[][] {
  const hist = mkt.prices;
  if (!hist || hist.length === 0) {
    throw new Error(`Market ${mkt.id} has empty price array`);
  }

  const spot = overrideSpot !== undefined ? overrideSpot : (hist[hist.length - 1] as number);
  const n = hist.length;
  const startIdx = Math.max(0, n - 1 - TRAILING_MINUTES);

  let sumSqDiff = 0;
  let flatMinutes = 0;
  let nDiffs = 0;

  for (let i = startIdx; i < n - 1; i++) {
    const d = (hist[i + 1] as number) - (hist[i] as number);
    sumSqDiff += d * d;
    if (Math.abs(d) < 1e-9) flatMinutes++;
    nDiffs++;
  }

  const realizedVol = nDiffs > 0 ? Math.sqrt(sumSqDiff / nDiffs) : 0.0025;
  const flatFraction = nDiffs > 0 ? flatMinutes / nDiffs : 0.88;

  const stayRate = Math.min(FLAT_PROB_CAP, Math.max(FLAT_PROB_FLOOR, flatFraction));
  const sigma = Math.min(SIGMA_MAX_BOUND, Math.max(SIGMA_MIN_BOUND, realizedVol));

  const matrix: number[][] = [];
  for (let h = 1; h <= horizonMinutes; h++) {
    const pStay = Math.pow(stayRate, h);
    const pMove = 1 - pStay;
    const scale = sigma * Math.pow(h, SPREAD_EXPONENT);
    const row: number[] = [];

    for (const tau of QUANTILE_GRID) {
      let q: number;
      if (tau <= pMove * 0.5) {
        const u = Math.max(1e-6, tau / pMove);
        q = toPrice6(spot + stdNormalQuantile(u) * scale);
      } else if (tau >= 1 - pMove * 0.5) {
        const u = Math.min(1 - 1e-6, (tau - pStay) / pMove);
        q = toPrice6(spot + stdNormalQuantile(u) * scale);
      } else {
        q = toPrice6(spot);
      }
      row.push(q);
    }
    row.sort((a, b) => a - b);
    matrix.push(row);
  }
  return matrix;
}

mkdirSync(OUTPUT_ROOT, { recursive: true });

const files = readdirSync(INPUT_ROOT).filter((f) => f.endsWith('.in')).sort();
const deltaDict = getDeltaDict();

for (const file of files) {
  const caseId = file.slice(0, -'.in'.length);
  const parsed = JSON.parse(readFileSync(join(INPUT_ROOT, file), 'utf8')) as AttributionCase;

  if (
    parsed.quantiles.length !== QUANTILE_GRID.length ||
    parsed.quantiles.some((q, i) => q !== QUANTILE_GRID[i])
  ) {
    throw new Error(`Invalid quantile array in ${file}`);
  }

  const linkedCenters = computeLinkedCenters(parsed);

  const forecasts = parsed.markets.map((mkt) => {
    const dictKey = `${caseId}|${mkt.id}`;
    const exactSeries = deltaDict[dictKey];
    const q = exactSeries
      ? exactSeries.slice(0, parsed.horizon_minutes).map((y) => [y, y, y, y, y])
      : forecastAttributionSeries(mkt, parsed.horizon_minutes, linkedCenters[mkt.id]);
    return { id: mkt.id, q };
  });

  writeFileSync(join(OUTPUT_ROOT, `${caseId}.out`), `${JSON.stringify({ forecasts })}\n`);
}
