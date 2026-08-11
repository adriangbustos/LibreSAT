// ─────────────────────────────────────────────────────────────────────────────
// Official SAT Scaled Score Lookup Tables
// Source: Approximation based on publicly available College Board score tables
// R&W: 0–54 raw correct → 200–800
// Math: 0–44 raw correct → 200–800
// ─────────────────────────────────────────────────────────────────────────────

// Reading and Writing: 54 total scoreable questions (27 + 27)
const RW_SCALE: Record<number, number> = {
  0: 200, 1: 200, 2: 200, 3: 200, 4: 200, 5: 210, 6: 220, 7: 230, 8: 240,
  9: 250, 10: 270, 11: 280, 12: 290, 13: 300, 14: 310, 15: 330, 16: 340,
  17: 350, 18: 360, 19: 370, 20: 380, 21: 400, 22: 410, 23: 420, 24: 430,
  25: 440, 26: 450, 27: 470, 28: 480, 29: 490, 30: 500, 31: 520, 32: 530,
  33: 540, 34: 560, 35: 570, 36: 580, 37: 600, 38: 610, 39: 620, 40: 640,
  41: 650, 42: 670, 43: 680, 44: 700, 45: 710, 46: 730, 47: 740, 48: 750,
  49: 760, 50: 770, 51: 780, 52: 790, 53: 800, 54: 800
};

// Math: 44 total scoreable questions (22 + 22)
const MATH_SCALE: Record<number, number> = {
  0: 200, 1: 200, 2: 200, 3: 210, 4: 230, 5: 250, 6: 270, 7: 280, 8: 300,
  9: 320, 10: 340, 11: 360, 12: 370, 13: 390, 14: 410, 15: 430, 16: 440,
  17: 460, 18: 480, 19: 500, 20: 510, 21: 530, 22: 550, 23: 560, 24: 580,
  25: 590, 26: 600, 27: 610, 28: 620, 29: 630, 30: 640, 31: 650, 32: 660,
  33: 670, 34: 670, 35: 680, 36: 690, 37: 710, 38: 720, 39: 740, 40: 750,
  41: 770, 42: 780, 43: 790, 44: 800
};

// Diagnostic (single-section) uses same table scaled proportionally
// For 27-question modules (R&W diagnostic = 54 total, same table)
// For 22-question modules (Math diagnostic = 44 total, same table)

export function scaleRWScore(rawCorrect: number): number {
  const clamped = Math.max(0, Math.min(54, Math.round(rawCorrect)));
  return RW_SCALE[clamped] ?? 200;
}

export function scaleMathScore(rawCorrect: number): number {
  const clamped = Math.max(0, Math.min(44, Math.round(rawCorrect)));
  return MATH_SCALE[clamped] ?? 200;
}

export function scaleSingleSectionRW(rawCorrect: number, totalQuestions: number): number {
  // For custom/partial tests, proportionally scale
  if (totalQuestions === 0) return 200;
  const scaled54 = Math.round((rawCorrect / totalQuestions) * 54);
  return scaleRWScore(scaled54);
}

export function scaleSingleSectionMath(rawCorrect: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 200;
  const scaled44 = Math.round((rawCorrect / totalQuestions) * 44);
  return scaleMathScore(scaled44);
}

export function calculateTotalScore(rwScaled: number, mathScaled: number): number {
  return Math.min(1600, Math.max(400, rwScaled + mathScaled));
}

export function getScorePercentile(score: number, maxScore: 800 | 1600 = 1600): number {
  // Rough percentile estimation
  const pct = ((score - (maxScore === 1600 ? 400 : 200)) / (maxScore - (maxScore === 1600 ? 400 : 200))) * 100;
  return Math.round(Math.max(1, Math.min(99, pct)));
}

// ─────────────────────────────────────────────────────────────────────────────
// IRT Scoring Implementation
// ─────────────────────────────────────────────────────────────────────────────

export interface IRTResponse {
  a: number; // Discrimination
  b: number; // Difficulty
  c: number; // Guessing
  isCorrect: boolean;
}

/**
 * Calculates the latent ability (theta) using Maximum Likelihood Estimation (MLE).
 * The function performs a grid search over [-3.0, 3.0].
 */
export function calculateThetaMLE(responses: IRTResponse[]): number {
  if (responses.length === 0) return 0;
  
  const minTheta = -3.0;
  const maxTheta = 3.0;
  const step = 0.05;
  
  let bestTheta = minTheta;
  let maxLL = -Infinity;
  
  for (let theta = minTheta; theta <= maxTheta; theta += step) {
    let LL = 0;
    for (const r of responses) {
      // 3PL probability formula
      const exp = Math.exp(-1.7 * r.a * (theta - r.b));
      const p = r.c + (1 - r.c) / (1 + exp);
      
      // Prevent log(0)
      const p_safe = Math.max(1e-10, Math.min(1 - 1e-10, p));
      
      if (r.isCorrect) {
        LL += Math.log(p_safe);
      } else {
        LL += Math.log(1 - p_safe);
      }
    }
    
    if (LL > maxLL) {
      maxLL = LL;
      bestTheta = theta;
    }
  }
  
  return bestTheta;
}

/**
 * Maps the latent ability (theta) to the 200-800 SAT scale.
 * Applies realistic top-end score caps based on raw incorrect answers to prevent 800 inflation.
 */
export function scaleThetaToSAT(theta: number, rawIncorrect: number): number {
  // Center at 500 with SD of 100
  let score = 100 * theta + 500;

  // Real-world College Board capping logic:
  // Missing active items strictly prevents a perfect 800 score.
  if (rawIncorrect > 0) {
    // Deduct a minimum score threshold per raw miss at the top end
    // (e.g., 1 miss caps at ~780-790, 4 misses cap at ~740-750)
    const maxScoreCap = 800 - (rawIncorrect * 15); 
    score = Math.min(score, maxScoreCap);
  }

  // Bound to 200 - 800
  score = Math.max(200, Math.min(800, score));
  // Round to nearest 10
  return Math.round(score / 10) * 10;
}

export function parseSATNumber(str: string): number | null {
  if (!str) return null;
  const s = str.trim().replace(/,/g, '');
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  } else {
    const val = parseFloat(s);
    if (!isNaN(val)) return val;
  }
  return null;
}

export function generateAcceptedStrings(val: number): string[] {
  const res = new Set<string>();
  
  const isNeg = val < 0;
  const maxLen = isNeg ? 6 : 5;
  const absVal = Math.abs(val);
  
  const str1 = val.toFixed(10);
  let str2: string | null = null;
  
  if (absVal > 0 && absVal < 1) {
    str2 = isNeg ? '-' + str1.substring(2) : str1.substring(1);
  }
  
  const processStr = (s: string) => {
    if (s.length <= maxLen) return;
    
    const truncated = s.substring(0, maxLen);
    res.add(truncated);
    
    const nextDigit = parseInt(s.charAt(maxLen));
    if (!isNaN(nextDigit) && nextDigit >= 5) {
      let carry = 1;
      let roundedArr = truncated.split('');
      for (let i = roundedArr.length - 1; i >= 0; i--) {
        if (roundedArr[i] >= '0' && roundedArr[i] <= '9') {
          let d = parseInt(roundedArr[i]) + carry;
          if (d > 9) {
            roundedArr[i] = '0';
            carry = 1;
          } else {
            roundedArr[i] = d.toString();
            carry = 0;
            break;
          }
        }
      }
      if (carry === 0) {
        res.add(roundedArr.join(''));
      } else {
        let str = '1' + roundedArr.join('');
        if (str.includes('.')) {
            str = str.substring(0, str.length - 1);
        }
        res.add(str);
      }
    }
  };
  
  processStr(str1);
  if (str2) processStr(str2);
  
  return Array.from(res);
}

export function checkAnswer(userAns: string, correctAns: string): boolean {
  if (!userAns || !correctAns) return false;
  
  const uTrim = userAns.trim().toLowerCase();
  
  // Split by comma or 'or' to support multiple acceptable answers
  const correctOptions = correctAns.split(/,(?:\s+or\s+)?|\s+or\s+/i).map(s => s.trim());
  
  for (const cOption of correctOptions) {
    if (!cOption) continue;
    const cTrim = cOption.toLowerCase();
    
    if (uTrim === cTrim) return true;
    
    const uNum = parseSATNumber(uTrim);
    const cNum = parseSATNumber(cTrim);
    
    if (uNum !== null && cNum !== null) {
      // Check if mathematically equivalent within a tiny margin of error (e.g., float precision)
      if (Math.abs(uNum - cNum) < 1e-6) {
        return true;
      }
      
      // Check if it's a valid College Board formatted string (truncated or rounded at max character length)
      const acceptedStrings = generateAcceptedStrings(cNum);
      if (acceptedStrings.includes(uTrim)) {
        return true;
      }
    }
  }
  
  return false;
}

