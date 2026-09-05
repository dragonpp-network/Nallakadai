export interface PackOption {
  label: string;
  qty: number;
  price: number;
  savingsText?: string | null;
}

export function calculateDefaultPackPrice(qty: number, basePrice: number, unit: string = "Kg"): number {
  return Math.round(qty * basePrice * 100) / 100;
}

export function formatPackLabel(qty: number, unit: string = "Kg", originalStr?: string): string {
  const u = (unit || "Kg").toLowerCase();
  if (originalStr && originalStr.trim()) {
    const s = originalStr.trim();
    if (s.toLowerCase().includes("pack") || s.toLowerCase().includes("nos") || s.toLowerCase().includes("kg") || s.toLowerCase().includes("gm") || s.toLowerCase().includes("ml") || s.toLowerCase().includes("litre")) {
      return s;
    }
  }

  if (u === "kg" || u === "kilogram") {
    if (qty < 1) {
      const g = Math.round(qty * 1000);
      return `${g} gm`;
    }
    return `${qty} Kg`;
  }
  if (u === "litre" || u === "l") {
    if (qty < 1) {
      const ml = Math.round(qty * 1000);
      return `${ml} ml`;
    }
    return `${qty} Litre`;
  }
  if (u === "nos") {
    return `${qty} Nos`;
  }
  return `${qty} ${unit}`;
}

export function parseQuantityFromString(str: string, baseUnit: string = "Kg"): number {
  const s = str.trim().toLowerCase();
  const bu = (baseUnit || "Kg").toLowerCase();

  // Explicit Grams input (e.g. "100 gm", "250g", "500 grams")
  if (s.endsWith("gm") || s.endsWith("gram") || s.endsWith("grams") || s.endsWith("g") || s.includes("gm") || s.includes("gram")) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return 0;
    if (bu === "kg" || bu === "kilogram") {
      return num >= 10 ? num / 1000 : num;
    }
    return num;
  }

  // Explicit Millilitres input (e.g. "250 ml", "500ml")
  if (s.endsWith("ml") || s.includes("ml")) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return 0;
    if (bu === "litre" || bu === "l") {
      return num >= 10 ? num / 1000 : num;
    }
    return num;
  }

  // Explicit Kilograms input (e.g. "1 kg", "2.5kg")
  if (s.endsWith("kg") || s.includes("kg")) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  }

  // Explicit Litres input (e.g. "1 litre", "0.5l")
  if (s.endsWith("litre") || s.endsWith("l") || s.includes("litre")) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  }

  // Explicit Count / Nos input (e.g. "2 nos", "5 pcs")
  if (s.includes("nos") || s.includes("no") || s.includes("pc") || s.includes("pack")) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  }

  // Raw numerical input (e.g. "100", "250", "0.5", "1")
  const rawNum = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (isNaN(rawNum)) return 0;

  // Auto-detect: If baseUnit is Kg and input is a large number (e.g. 50, 100, 250, 500), treat as Grams
  if ((bu === "kg" || bu === "kilogram") && rawNum >= 50) {
    return rawNum / 1000;
  }
  // Auto-detect: If baseUnit is Litre and input is a large number (e.g. 100, 250, 500), treat as ml
  if ((bu === "litre" || bu === "l") && rawNum >= 50) {
    return rawNum / 1000;
  }

  return rawNum;
}

export function parsePackOptionsInput(
  rawInput: any,
  basePrice: number,
  unit: string = "Kg"
): PackOption[] {
  if (!rawInput) return [];

  // Array of objects
  if (Array.isArray(rawInput) && rawInput.length > 0 && typeof rawInput[0] === "object") {
    return rawInput.map((opt) => {
      const rawQty = Number(opt.qty || 1);
      const cleanQty = (unit.toLowerCase() === "kg" && rawQty >= 50) ? rawQty / 1000 : rawQty;
      const standardPrice = calculateDefaultPackPrice(cleanQty, basePrice, unit);
      const price = opt.price !== undefined && Number(opt.price) > 0 ? Number(opt.price) : standardPrice;
      const savings = standardPrice > price ? standardPrice - price : 0;
      const savingsText = savings > 0 ? `Save ₹${Math.round(savings * 100) / 100}` : (opt.savingsText || null);
      return {
        label: opt.label || formatPackLabel(cleanQty, unit),
        qty: cleanQty,
        price,
        savingsText,
      };
    });
  }

  // Array of numbers, e.g. [0.5, 1, 2] or [100, 250, 500]
  if (Array.isArray(rawInput) && rawInput.length > 0 && typeof rawInput[0] === "number") {
    return rawInput.map((rawQty) => {
      const cleanQty = (unit.toLowerCase() === "kg" && rawQty >= 50) ? rawQty / 1000 : rawQty;
      const price = calculateDefaultPackPrice(cleanQty, basePrice, unit);
      return {
        label: formatPackLabel(cleanQty, unit),
        qty: cleanQty,
        price,
      };
    });
  }

  // String format e.g. "2 nos:25 | 5 nos:55 | 10 nos:100" OR "100 gm, 250 gm, 500 gm, 1Kg"
  const str = String(rawInput).trim();
  if (!str) return [];

  const parts = str.includes("|") ? str.split("|") : str.split(",");
  const options: PackOption[] = [];

  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    if (trimmed.includes(":")) {
      const [qtyPart, pricePart] = trimmed.split(":");
      const cleanQty = parseQuantityFromString(qtyPart, unit);
      const customPrice = parseFloat(pricePart.trim());
      if (cleanQty > 0 && !isNaN(customPrice)) {
        const standardPrice = calculateDefaultPackPrice(cleanQty, basePrice, unit);
        const savings = standardPrice > customPrice ? standardPrice - customPrice : 0;
        const savingsText = savings > 0 ? `Save ₹${Math.round(savings * 100) / 100}` : undefined;
        options.push({
          label: formatPackLabel(cleanQty, unit, qtyPart),
          qty: cleanQty,
          price: customPrice,
          savingsText,
        });
        continue;
      }
    }

    const qty = parseQuantityFromString(trimmed, unit);
    if (qty > 0) {
      const price = calculateDefaultPackPrice(qty, basePrice, unit);
      options.push({
        label: formatPackLabel(qty, unit, trimmed),
        qty,
        price,
      });
    }
  }

  return options;
}
