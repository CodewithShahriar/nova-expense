import {
  UtensilsCrossed, Car, ShoppingBag, Clapperboard, Receipt, HeartPulse,
  Home, Plane, GraduationCap, Gift, Briefcase, TrendingUp, Banknote, Sparkles,
  ArrowLeftRight, Coffee, Fuel, Dumbbell, PawPrint, Baby, Wifi, Phone,
  type LucideIcon,
} from "lucide-react";
import type { CustomCategory } from "./storage";

export interface Category {
  name: string;
  icon: LucideIcon;
  color: string;
  type: "expense" | "income" | "both";
}

export const iconRegistry: Record<string, LucideIcon> = {
  UtensilsCrossed, Car, ShoppingBag, Clapperboard, Receipt, HeartPulse,
  Home, Plane, GraduationCap, Gift, Briefcase, TrendingUp, Banknote, Sparkles,
  ArrowLeftRight, Coffee, Fuel, Dumbbell, PawPrint, Baby, Wifi, Phone,
};

export const pickerIcons: string[] = [
  "UtensilsCrossed", "Coffee", "Car", "Fuel", "ShoppingBag", "Clapperboard",
  "Receipt", "HeartPulse", "Home", "Plane", "GraduationCap", "Gift",
  "Dumbbell", "PawPrint", "Baby", "Wifi", "Phone", "Briefcase",
  "TrendingUp", "Banknote", "Sparkles",
];

export const pickerColors: string[] = [
  "oklch(0.75 0.17 40)",
  "oklch(0.72 0.18 250)",
  "oklch(0.72 0.19 330)",
  "oklch(0.75 0.17 300)",
  "oklch(0.7 0.17 20)",
  "oklch(0.72 0.18 10)",
  "oklch(0.75 0.14 140)",
  "oklch(0.75 0.17 210)",
  "oklch(0.75 0.17 260)",
  "oklch(0.78 0.17 162)",
  "oklch(0.82 0.17 78)",
  "oklch(0.7 0.05 240)",
];

export const baseCategories: Category[] = [
  { name: "Food", icon: UtensilsCrossed, color: "oklch(0.75 0.17 40)", type: "expense" },
  { name: "Transport", icon: Car, color: "oklch(0.72 0.18 250)", type: "expense" },
  { name: "Shopping", icon: ShoppingBag, color: "oklch(0.72 0.19 330)", type: "expense" },
  { name: "Entertainment", icon: Clapperboard, color: "oklch(0.75 0.17 300)", type: "expense" },
  { name: "Bills", icon: Receipt, color: "oklch(0.7 0.17 20)", type: "expense" },
  { name: "Health", icon: HeartPulse, color: "oklch(0.72 0.18 10)", type: "expense" },
  { name: "Home", icon: Home, color: "oklch(0.75 0.14 140)", type: "expense" },
  { name: "Travel", icon: Plane, color: "oklch(0.75 0.17 210)", type: "expense" },
  { name: "Education", icon: GraduationCap, color: "oklch(0.75 0.17 260)", type: "expense" },
  { name: "Gifts", icon: Gift, color: "oklch(0.75 0.19 350)", type: "expense" },
  { name: "Other", icon: Sparkles, color: "oklch(0.7 0.05 240)", type: "both" },
  { name: "Salary", icon: Briefcase, color: "oklch(0.78 0.17 162)", type: "income" },
  { name: "Freelance", icon: TrendingUp, color: "oklch(0.78 0.15 180)", type: "income" },
  { name: "Investment", icon: Banknote, color: "oklch(0.78 0.17 140)", type: "income" },
  { name: "Transfer", icon: ArrowLeftRight, color: "oklch(0.72 0.04 240)", type: "both" },
];

export function allCategories(custom: CustomCategory[] = []): Category[] {
  const customMapped: Category[] = custom.map((c) => ({
    name: c.name,
    icon: iconRegistry[c.icon] || Sparkles,
    color: c.color,
    type: c.type,
  }));
  return [...baseCategories, ...customMapped];
}

export function getCategory(name: string, custom: CustomCategory[] = []): Category {
  return allCategories(custom).find((c) => c.name === name)
    || baseCategories.find((c) => c.name === "Other")!;
}

// Backwards-compat export used by a few files
export const categories = baseCategories;
