import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { formatValidationErrors } from '../helpers/ValidationErrorHelpers.js';
import { extractFormFields } from '../helpers/dataTransformers.js';
import { storeSessionData, getSessionData, storeOriginalFormData } from '../scripts/helpers/sessionHelpers.js';

// Extend Request interface for CSRF token support
interface RequestWithCSRF extends Request {
  csrfToken?: () => string;
}

// HTTP status codes
const HTTP_STATUS_BAD_REQUEST = 400;

// Default person data (in a real app, this would be from a database)
const DEFAULT_PERSON_DATA = {
  fullName: 'John Smith',
  address: '123 Example Street\nExample City\nEX1 2MP',
  contactPreference: 'email',
  priority: 'medium',
  dateOfBirth: { day: '27', month: '3', year: '1986' }
};

function safeStringValue(value: unknown, defaultValue: string): string {
  return (typeof value === 'string' && value !== '') ? value : defaultValue;
}

function safeDateOfBirth(value: unknown): { day: string; month: string; year: string } {
  if (typeof value === 'object' && value !== null &&
      'day' in value && 'month' in value && 'year' in value) {
    const dob = value as { day: unknown; month: unknown; year: unknown };
    return {
      day: typeof dob.day === 'string' ? dob.day : DEFAULT_PERSON_DATA.dateOfBirth.day,
      month: typeof dob.month === 'string' ? dob.month : DEFAULT_PERSON_DATA.dateOfBirth.month,
      year: typeof dob.year === 'string' ? dob.year : DEFAULT_PERSON_DATA.dateOfBirth.year
    };
  }
  return DEFAULT_PERSON_DATA.dateOfBirth;
}

function getCurrentPersonData(req: Request): typeof DEFAULT_PERSON_DATA {
  const sessionData = getSessionData(req, 'currentPerson');
  // eslint-disable-next-line eqeqeq -- need looser assertion against null
  if (sessionData != null) {
    return {
      fullName: safeStringValue(sessionData.fullName, DEFAULT_PERSON_DATA.fullName),
      address: safeStringValue(sessionData.address, DEFAULT_PERSON_DATA.address),
      contactPreference: safeStringValue(sessionData.contactPreference, DEFAULT_PERSON_DATA.contactPreference),
      priority: safeStringValue(sessionData.priority, DEFAULT_PERSON_DATA.priority),
      dateOfBirth: safeDateOfBirth(sessionData.dateOfBirth)
    };
  }
  return DEFAULT_PERSON_DATA;
}

export function getPerson(req: RequestWithCSRF, res: Response, next: NextFunction): void {
  try {
    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;
    const currentPersonData = getCurrentPersonData(req);

    // Store original form data for comparison (following MCC pattern)
    const originalFormData = {
      fullName: currentPersonData.fullName,
      address: currentPersonData.address,
      contactPreference: currentPersonData.contactPreference,
      priority: currentPersonData.priority,
      'dateOfBirth-day': currentPersonData.dateOfBirth.day,
      'dateOfBirth-month': currentPersonData.dateOfBirth.month,
      'dateOfBirth-year': currentPersonData.dateOfBirth.year
    };
    storeOriginalFormData(req, 'personOriginal', originalFormData);

    res.render('change-person.njk', {
      currentName: currentPersonData.fullName,
      currentAddress: currentPersonData.address,
      currentContactPreference: currentPersonData.contactPreference,
      currentPriority: currentPersonData.priority,
      currentDateOfBirth: currentPersonData.dateOfBirth,
      csrfToken,
      formData: {},
      error: null
    });
  } catch (error) {
    next(error);
  }
}

export function postPerson(req: RequestWithCSRF, res: Response, next: NextFunction): void {
  try {
    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : undefined;

    // Extract form fields for consistent handling
    const formFields = extractFormFields(req.body, [
      'fullName',
      'address',
      'contactPreference',
      'priority',
      'dateOfBirth-day',
      'dateOfBirth-month',
      'dateOfBirth-year'
    ]);

    // Check for validation errors
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      // Use the new formatValidationErrors helper
      const { inputErrors, errorSummaryList } = formatValidationErrors(validationErrors);
      const currentPersonData = getCurrentPersonData(req);

      // Re-render the form with errors and preserve user input
      res.status(HTTP_STATUS_BAD_REQUEST).render('change-person.njk', {
        currentName: currentPersonData.fullName,
        currentAddress: currentPersonData.address,
        currentContactPreference: currentPersonData.contactPreference,
        currentPriority: currentPersonData.priority,
        currentDateOfBirth: currentPersonData.dateOfBirth,
        csrfToken,
        formData: formFields,
        error: {
          inputErrors,
          errorSummaryList
        }
      });
      return;
    }

    // Success case - update the stored person data and show success
    const updatedPersonData = {
      fullName: String(formFields.fullName),
      address: String(formFields.address),
      contactPreference: String(formFields.contactPreference),
      'dateOfBirth-day': String(formFields['dateOfBirth-day']),
      'dateOfBirth-month': String(formFields['dateOfBirth-month']),
      'dateOfBirth-year': String(formFields['dateOfBirth-year'])
    };

    // Store the updated data in session
    storeSessionData(req, 'currentPerson', updatedPersonData);

    // Get the updated data for display
    const currentPersonData = getCurrentPersonData(req);

    // Render the form again with the updated data and success state
    res.render('change-person.njk', {
      currentName: currentPersonData.fullName,
      currentAddress: currentPersonData.address,
      currentContactPreference: currentPersonData.contactPreference,
      currentPriority: currentPersonData.priority,
      currentDateOfBirth: currentPersonData.dateOfBirth,
      csrfToken,
      formData: {
        fullName: '',
        address: '',
        contactPreference: '',
        priority: '',
        'dateOfBirth-day': '',
        'dateOfBirth-month': '',
        'dateOfBirth-year': ''
      }, // Clear the form
      error: null,
      successMessage: 'Person details updated successfully'
    });

  } catch (error) {
    next(error);
  }
}