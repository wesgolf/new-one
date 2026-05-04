export type GoalFormulaOperator = 'divide' | 'add' | 'subtract' | 'multiply';

export type GoalFormulaOperand =
  | {
      kind: 'metric';
      metricId: string;
    }
  | {
      kind: 'constant';
      value: number;
    };

export type GoalFormulaDefinition = {
  version: 1;
  type: 'binary';
  operator: GoalFormulaOperator;
  left: GoalFormulaOperand;
  right: GoalFormulaOperand;
  display_as?: 'number' | 'ratio' | 'percent';
  left_label?: string | null;
  right_label?: string | null;
};

export type GoalMetricSnapshot = {
  values: Record<string, number>;
  loadedSources: string[];
  errors: string[];
  fetchedAt: string | null;
};

export type GoalFormulaEvaluation = {
  current: number | null;
  formatted: string | null;
  explanation: string;
  missingMetricIds: string[];
};

function resolveOperandValue(
  operand: GoalFormulaOperand,
  snapshot: GoalMetricSnapshot,
): { value: number | null; missingMetricId?: string } {
  if (operand.kind === 'constant') {
    return { value: operand.value };
  }

  const value = snapshot.values[operand.metricId];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value };
  }

  return { value: null, missingMetricId: operand.metricId };
}

function formatValue(value: number, displayAs: GoalFormulaDefinition['display_as']) {
  if (displayAs === 'ratio') return `${value.toFixed(2)} : 1`;
  if (displayAs === 'percent') return `${value.toFixed(2)}%`;
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toFixed(2).replace(/\.00$/, '');
}

export function evaluateGoalFormula(
  formula: GoalFormulaDefinition | null | undefined,
  snapshot: GoalMetricSnapshot,
): GoalFormulaEvaluation {
  if (!formula || formula.type !== 'binary') {
    return {
      current: null,
      formatted: null,
      explanation: 'No formula configured.',
      missingMetricIds: [],
    };
  }

  const left = resolveOperandValue(formula.left, snapshot);
  const right = resolveOperandValue(formula.right, snapshot);
  const missingMetricIds = [left.missingMetricId, right.missingMetricId].filter(Boolean) as string[];

  if (left.value == null || right.value == null) {
    return {
      current: null,
      formatted: null,
      explanation: missingMetricIds.length > 0
        ? `Missing metric data for ${missingMetricIds.join(', ')}.`
        : 'Missing metric data.',
      missingMetricIds,
    };
  }

  let current: number | null = null;
  switch (formula.operator) {
    case 'divide':
      current = right.value === 0 ? null : left.value / right.value;
      break;
    case 'add':
      current = left.value + right.value;
      break;
    case 'subtract':
      current = left.value - right.value;
      break;
    case 'multiply':
      current = left.value * right.value;
      break;
  }

  if (current == null || !Number.isFinite(current)) {
    return {
      current: null,
      formatted: null,
      explanation: formula.operator === 'divide'
        ? 'Cannot divide by zero.'
        : 'Formula could not be evaluated.',
      missingMetricIds,
    };
  }

  const formatted = formatValue(current, formula.display_as);
  return {
    current,
    formatted,
    explanation: formatted,
    missingMetricIds,
  };
}

export function isGoalFormulaDefinition(value: unknown): value is GoalFormulaDefinition {
  if (!value || typeof value !== 'object') return false;
  const raw = value as Record<string, unknown>;
  return raw.version === 1 && raw.type === 'binary' && typeof raw.operator === 'string';
}
