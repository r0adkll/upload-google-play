/**
 * Type definitions for the upload-google-play action
 */

/**
 * Possible values for the changesNotSentForReview input parameter.
 * 
 * - `true`: Changes will NOT be sent for review automatically. Manual review required.
 * - `false`: Changes will be sent for review automatically (default behavior).
 * - `"auto"`: Try automatic review first; if Google blocks it, retry with manual review.
 */
export type ChangesNotSentForReview = boolean | "auto";

/**
 * Structure of a Google API error response.
 * This matches the standard Google API error model.
 * 
 * @see https://cloud.google.com/apis/design/errors
 */
export interface GoogleApiErrorResponse {
    error?: {
        code?: number;
        message?: string;
        status?: string;
        errors?: Array<{
            message?: string;
            domain?: string;
            reason?: string;
        }>;
    };
}

/**
 * Extended error type for GaxiosError with typed response data.
 * Used for proper type checking of Google API errors.
 */
export interface GaxiosErrorLike {
    response?: {
        status?: number;
        statusText?: string;
        data?: GoogleApiErrorResponse;
    };
    message?: string;
    code?: string;
}
