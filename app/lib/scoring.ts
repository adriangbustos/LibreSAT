// ─────────────────────────────────────────────────────────────────────────────
// Official SAT Scaled Score Lookup Tables
// Source: Approximation based on publicly available College Board score tables
// R&W: 0–54 raw correct → 200–800
// Math: 0–44 raw correct → 200–800
// ─────────────────────────────────────────────────────────────────────────────

// Reading and Writing: 54 total scoreable questions (27 + 27)
const RW_SCALE: Record<number, number> = {
  0: 200, 1: 200, 2: 220, 3: 240, 4: 250, 5: 270, 6: 280, 7: 300, 8: 310,
  9: 330, 10: 340, 11: 360, 12: 370, 13: 390, 14: 400, 15: 420, 16: 430,
  17: 440, 18: 450, 19: 460, 20: 470, 21: 480, 22: 490, 23: 500, 24: 510,
  25: 520, 26: 530, 27: 540, 28: 550, 29: 560, 30: 570, 31: 580, 32: 590,
  33: 600, 34: 610, 35: 620, 36: 630, 37: 640, 38: 650, 39: 660, 40: 670,
  41: 680, 42: 690, 43: 700, 44: 710, 45: 720, 46: 730, 47: 740, 48: 750,
  49: 760, 50: 770, 51: 780, 52: 790, 53: 800, 54: 800
};

// Math: 44 total scoreable questions (22 + 22)
const MATH_SCALE: Record<number, number> = {
  0: 200, 1: 200, 2: 220, 3: 240, 4: 250, 5: 270, 6: 280, 7: 300, 8: 310,
  9: 330, 10: 340, 11: 360, 12: 370, 13: 390, 14: 400, 15: 410, 16: 430,
  17: 440, 18: 450, 19: 470, 20: 480, 21: 490, 22: 510, 23: 520, 24: 530,
  25: 540, 26: 560, 27: 570, 28: 580, 29: 600, 30: 610, 31: 620, 32: 640,
  33: 650, 34: 660, 35: 680, 36: 690, 37: 700, 38: 720, 39: 730, 40: 750,
  41: 760, 42: 780, 43: 790, 44: 800
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
  const cTrim = correctAns.trim().toLowerCase();
  
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
  
  return false;
}

