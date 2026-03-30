import type { ValidationError, Result, Meta, Location } from 'express-validator';

/**
 * Interface for validation error data structure
 */
export interface ValidationErrorData {
  summaryMessage: string;
  inlineMessage: string;
  fieldPath?: string; // Add field path from express-validator
}

/**
 * Custom error class that extends Error and carries ValidationErrorData
 * This satisfies linting rules while providing type safety
 */
export class TypedValidationError extends Error {
  public readonly errorData: ValidationErrorData;

  constructor(errorData: ValidationErrorData) {
    super(errorData.summaryMessage);
    this.name = 'TypedValidationError';
    this.errorData = errorData;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasProperty(obj: unknown, key: string): obj is Record<string, unknown> {
  return isRecord(obj) && key in obj;
}

// Constants for magic numbers
const EMPTY_OBJECT_LENGTH = 0;
const ZERO_VALUE = 0;

function shouldReturnEmptyString(value: unknown): boolean {
  return value === null || value === undefined || value === '' || value === ZERO_VALUE || value === false;
}

function safeString(value: unknown): string {
  // Handle null, undefined, empty string, zero, and false
  if (shouldReturnEmptyString(value)) {
    return '';
  }
  
  // Handle string type
  if (typeof value === 'string') {
    return value;
  }
  
  // Handle number and boolean types
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // Handle objects - avoid unsafe toString operations
  if (typeof value === 'object' && value !== null) {
    // Handle empty objects specifically
    if (Object.keys(value).length === EMPTY_OBJECT_LENGTH) {
      return '';
    }
    
    // For objects, use JSON.stringify as it's safer than toString
    try {
      return JSON.stringify(value);
    } catch {
      return '[object Object]';
    }
  }
  
  // Fallback to String conversion
  return String(value);
}

export function formatValidationError(error: ValidationError): ValidationErrorData {
  // Handle TypedValidationError instances
  if (error.msg instanceof TypedValidationError) {
    return error.msg.errorData;
  }

  // Handle the case where the error message is already our ValidationErrorData
  if (isRecord(error.msg) &&
    hasProperty(error.msg, 'summaryMessage') &&
    hasProperty(error.msg, 'inlineMessage')) {
    return {
      summaryMessage: safeString(error.msg.summaryMessage),
      inlineMessage: safeString(error.msg.inlineMessage)
    };
  }

  // Fallback: treat the message as both summary and inline
  const safeMessage = safeString(error.msg);
  const message = safeMessage === '' ? 'Invalid value' : safeMessage;
  return {
    summaryMessage: message,
    inlineMessage: message
  };
}

// Creates a validator that checks if any of the specified field pairs have changed
export function createChangeDetectionValidator(
  fieldMappings: Array<{ current: string; original: string }>,
  errorMessage: { summaryMessage: string | (() => string); inlineMessage: string | (() => string) }
): {
  in: Location[];
  custom: {
    options: (_value: string, meta: Meta) => boolean;
    errorMessage: () => TypedValidationError;
  };
} {
  return {
    in: ['body'] as Location[],
    custom: {
       //Schema to check if any of the specified field values have been unchanged.
      options: (_value: string, meta: Meta): boolean => {
        const { req } = meta;
        
        if (!isRecord(req.body)) {
          return true;
        }

        // Check if any field has changed using type-safe property access
        const hasChanges = fieldMappings.some(({ current, original }) => {
          const currentRaw = hasProperty(req.body, current) ? req.body[current] : '';
          const originalRaw = hasProperty(req.body, original) ? req.body[original] : '';
          
          // Normalize boolean/checkbox values for comparison
          const normalizeBooleanValue = (value: string): string => {
            const stringValue = safeString(value).trim().toLowerCase();
            // Treat empty string, "false", and "off" as falsy (unchecked)
            if (stringValue === '' || stringValue === 'false' || stringValue === 'off') {
              return 'false';
            }
            // Treat "on", "true", "1" as truthy (checked)
            if (stringValue === 'on' || stringValue === 'true' || stringValue === '1') {
              return 'true';
            }
            // For non-boolean fields, return the trimmed value as-is
            return stringValue;
          };
          
          const currentValue = normalizeBooleanValue(safeString(currentRaw));
          const originalValue = normalizeBooleanValue(safeString(originalRaw));
          const hasChanged = currentValue !== originalValue;
          
          return hasChanged;
        });
        
        return hasChanges;
      },
      // Custom error message for when no changes are made
      errorMessage: () => {
        // Resolve possibly lazy string value.
        const resolve = (val: string | (() => string)): string => typeof val === 'function' ? val() : val;
        const summaryMessage = resolve(errorMessage.summaryMessage);
        const inlineMessage = resolve(errorMessage.inlineMessage);

        return new TypedValidationError({ summaryMessage, inlineMessage });
      }
    }
  };
}

// Enhanced validation error handler that formats errors for GOV.UK components
export function formatValidationErrors(validationResult: Result): {
  inputErrors: Record<string, string>;
  errorSummaryList: Array<{ text: string; href: string }>;
} {
  const rawErrors = validationResult.array();
  
  // Format errors using the error formatter
  const formattedErrors = rawErrors.map((error: ValidationError) => {
    const fieldName = ('path' in error && typeof error.path === 'string') ? error.path : 'unknown';
    const errorData = formatValidationError(error);
    
    return {
      fieldName,
      ...errorData
    };
  });
  
  // Build input errors object for inline field errors
  const inputErrors = formattedErrors.reduce<Record<string, string>>((errors, errorItem) => {
    const { fieldName, inlineMessage } = errorItem;
    if (inlineMessage.trim() !== '') {
      errors[fieldName] = inlineMessage;
    }
    return errors;
  }, {});
  
  // Build error summary list for GOV.UK error summary component
  const errorSummaryList = formattedErrors.map(({ summaryMessage, fieldName }) => ({
    text: summaryMessage,
    href: `#${fieldName}`
  }));
  
  return {
    inputErrors,
    errorSummaryList
  };
}