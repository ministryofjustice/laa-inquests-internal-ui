/**
 * Data Transformation Helpers
 *
 * Utility functions for safely transforming and validating data from JSON fixtures
 */

import type { FieldConfig } from '#types/form-controller-types.js';

export function safeNestedField(obj: unknown, path: string): unknown {
  if (!isRecord(obj)) return undefined;
  
  const segments = path.split('.');
  
  return segments.reduce<unknown>((current, segment) => {
    if (!isRecord(current) || !hasProperty(current, segment)) {
      return undefined;
    }
    const { [segment]: value } = current;
    return value;
  }, obj);
}

export function safeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

export function safeOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

export function booleanToString(value: unknown): string {
  if (typeof value === 'boolean') {
    return value.toString();
  }
  // Handle string boolean values as fallback
  if (value === 'true' || value === 'false') {
    return safeString(value);
  }
  return '';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function safeStringFromRecord(obj: unknown, key: string): string | null {
  if (!isRecord(obj) || !(key in obj)) {
    return null;
  }

  const { [key]: value } = obj;
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function hasProperty(obj: unknown, key: string): obj is Record<string, unknown> {
  return isRecord(obj) && key in obj;
}

export function capitaliseFirst(str: string): string {
  const FIRST_CHAR_INDEX = 0;
  const REST_CHARS_START = 1;

  if (str === '' || str.length === FIRST_CHAR_INDEX) {
    return '';
  }
  return str.charAt(FIRST_CHAR_INDEX).toUpperCase() + str.slice(REST_CHARS_START);
}

export function safeBodyString(body: unknown, key: string): unknown {
  return hasProperty(body, key) ? body[key] : '';
}

export function extractFormFields(body: unknown, keys: string[]): Record<string, unknown> {
  return keys.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = safeBodyString(body, key);
    return acc;
  }, {});
}

function isTypeValid(value: unknown, expectedType: 'string' | 'boolean' | 'number' | 'array'): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number';
    case 'array':
      return Array.isArray(value);
  }
}

export function safeApiField(data: unknown, fieldName: string, expectedType?: 'string' | 'boolean' | 'number' | 'array'): unknown {
  const value: unknown = safeNestedField(data, fieldName);

  // If expectedType is specified, check the type
  if (expectedType !== undefined && !isTypeValid(value, expectedType)) {
    return expectedType === 'array' ? [] : '';
  }
  return value;
}

function getFieldValue(data: unknown, config: FieldConfig): unknown {
  const { field, path, type } = config;
  const fieldPath = path ?? field;
  return safeApiField(data, fieldPath, type);
}

function getOriginalValue(data: unknown, config: FieldConfig): unknown {
  const { field, path } = config;
  const fieldPath = path ?? field;
  return safeNestedField(data, fieldPath);
}

export function extractCurrentFields(
  data: unknown,
  fieldConfigs: FieldConfig[]
): Record<string, unknown> {
  return fieldConfigs.reduce<Record<string, unknown>>((formData, config) => {
    const { field, currentName, keepOriginal = false, includeExisting = false } = config;
    
    // Extract field value
    const fieldValue = getFieldValue(data, config);

    // Set current field value
    const currentKey = currentName ?? `current${capitaliseFirst(field)}`;
    formData[currentKey] = fieldValue;

    // Create existing field if requested (for forms that need change detection)
    if (includeExisting) {
      const existingKey = `existing${capitaliseFirst(field)}`;
      formData[existingKey] = fieldValue;
    }

    // Keep original value if requested (for complex types like boolean)
    if (keepOriginal) {
      const originalValue: unknown = getOriginalValue(data, config);
      if (originalValue !== undefined) {
        formData[field] = originalValue;
      }
    }

    return formData;
  }, {});
}

export function normaliseSelectedCheckbox(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  if (typeof value === 'string' && value.trim() !== '') return [value];
  return [];
}

export const isYes = (value: unknown): boolean => {
  const selection = safeString(value).trim().toLowerCase();
  if (selection === 'yes' || selection === 'true') return true;
  if (selection === 'no' || selection === 'false') return false;
  // fall back: treat non-empty as truthy
  return Boolean(selection);
};