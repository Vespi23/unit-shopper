"use client";

import React, { useState, useEffect } from "react";

interface WidgetProps {
  unitAName: string;
  unitBName: string;
  ratio: number;
}

export default function CalculatorWidget({ unitAName, unitBName, ratio }: WidgetProps) {
  const [priceA, setPriceA] = useState<string>("6.99");
  const [sizeA, setSizeA] = useState<string>("16");

  const [priceB, setPriceB] = useState<string>("15.50");
  const [sizeB, setSizeB] = useState<string>("2");

  const [valueAInB, setValueAInB] = useState<number>(0);
  const [valueB, setValueB] = useState<number>(0);
  const [differencePercent, setDifferencePercent] = useState<number>(0);
  const [bestDeal, setBestDeal] = useState<"A" | "B" | "Equal">("Equal");

  useEffect(() => {
    const pA = parseFloat(priceA) || 0;
    const sA = parseFloat(sizeA) || 0;
    const pB = parseFloat(priceB) || 0;
    const sB = parseFloat(sizeB) || 0;

    if (sA > 0 && sB > 0) {
      // Calculate Option A unit rate normalized to Option B's scale
      const rateA = pA / sA;
      const normalizedA = rateA * ratio;

      // Option B raw unit cost
      const rateB = pB / sB;

      setValueAInB(normalizedA);
      setValueB(rateB);

      if (Math.abs(normalizedA - rateB) < 0.001) {
        setBestDeal("Equal");
        setDifferencePercent(0);
      } else if (normalizedA < rateB) {
        setBestDeal("A");
        setDifferencePercent(((rateB - normalizedA) / rateB) * 100);
      } else {
        setBestDeal("B");
        setDifferencePercent(((normalizedA - rateB) / normalizedA) * 100);
      }
    }
  }, [priceA, sizeA, priceB, sizeB, ratio]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option A */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-semibold text-blue-600 dark:text-blue-300">
              1
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">Option A (Standard Pack)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceA}
                onChange={(e) => setPriceA(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Size ({unitAName.split(" ")[0]})</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={sizeA}
                onChange={(e) => setSizeA(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Option B */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
              2
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">Option B (Bulk Pack)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceB}
                onChange={(e) => setPriceB(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Size ({unitBName.split(" ")[0]})</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={sizeB}
                onChange={(e) => setSizeB(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Standardized Pricing Block */}
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Unit Cost Valuation (Normalized to {unitBName})</h4>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400 block">Option A Unit Cost</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">${valueAInB.toFixed(3)}</span>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400 block">Option B Unit Cost</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">${valueB.toFixed(3)}</span>
          </div>
        </div>

        {bestDeal === "Equal" ? (
          <div className="text-slate-700 dark:text-slate-300 font-bold text-sm">
            Both options offer the same cost value.
          </div>
        ) : (
          <div className={`p-2.5 rounded-lg text-sm font-bold border ${
            bestDeal === "A" 
              ? "bg-blue-50 border-blue-100 text-blue-950 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-300"
              : "bg-emerald-50 border-emerald-100 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300"
          }`}>
            Option {bestDeal} saves you {differencePercent.toFixed(1)}% per unit!
          </div>
        )}
      </div>
    </div>
  );
}