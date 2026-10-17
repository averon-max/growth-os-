import { describe, expect, it } from "vitest";
import {
  formatNumber, formatMoney, keywordScore, keywordVolume,
  keywordDifficulty, extractTrendPoints, trendMetric,
} from "./content-explorer-selectors";
import type { KeywordPlan } from "./content-explorer-selectors";

const row = (p: Partial<KeywordPlan>): KeywordPlan => ({keyword:"credit monitoring",...p});

describe("Content Explorer pure selectors",()=>{
  it("retains numeric and currency placeholders",()=>{
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(1250)).toBe("1,250");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(12.5)).toBe("$12.50");
  });
  it("retains order of primary and fallback keyword metrics",()=>{
    expect(keywordScore(row({score:0,totalScore:93,scoreBreakdown:{total:40}}))).toBe(0);
    expect(keywordScore(row({score:null,totalScore:null,scoreBreakdown:{total:40}}))).toBe(40);
    expect(keywordVolume(row({searchVolume:250,volume:500}))).toBe(250);
    expect(keywordDifficulty(row({keywordDifficulty:null,difficulty:23}))).toBe(23);
    expect(trendMetric(row({trend:{momentum:17}}),["momentum","fallback"])).toBe(17);
  });
  it("retains month labels and last-12 selection",()=>{
    const monthlySearches = Array.from({length:14},(_,i)=>({year:2025,month:i+1,searchVolume:i}));
    const points=extractTrendPoints(row({trend:{monthlySearches}}));
    expect(points).toHaveLength(12);
    expect(points[0]).toEqual({label:"2025-03",value:2});
    expect(points[11]).toEqual({label:"2025-14",value:13});
    expect(extractTrendPoints(row({trend:{points:[{volume:"invalid"},{volume:7}]}}))).toEqual([{label:"2",value:7}]);
  });
});
