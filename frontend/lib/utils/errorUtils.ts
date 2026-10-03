/**
 * Utility functions for handling and formatting API errors
 */

export interface ErrorInfo {
    title: string;
    description: string;
}

/**
 * Extract meaningful error information from API errors
 */
export const getErrorInfo = (error: any, context: string = 'operation'): ErrorInfo => {
    let title = `Failed to ${context}`;
    let description = `An unexpected error occurred while ${context}.`;

    // Parse different types of errors
    if (error?.statusCode) {
        switch (error.statusCode) {
            case 400:
                title = "Invalid Request";
                description = `The ${context} request is invalid. Please check the details and try again.`;
                break;
            case 401:
                title = "Authentication Required";
                description = `Please log in to ${context}.`;
                break;
            case 403:
                title = "Permission Denied";
                description = `You don't have permission to ${context}.`;
                break;
            case 404:
                title = "Not Found";
                description = `The resource you're trying to ${context} could not be found.`;
                break;
            case 409:
                title = "Conflict Error";
                description = `Cannot ${context} due to a conflict. The resource may already be in the desired state.`;
                break;
            case 422:
                title = "Validation Error";
                description = `Cannot ${context} due to validation errors.`;
                break;
            case 429:
                title = "Too Many Requests";
                description = `You're making too many requests. Please wait a moment and try again.`;
                break;
            case 500:
                title = "Server Error";
                description = `A server error occurred while ${context}. Please try again later.`;
                break;
            case 503:
                title = "Service Unavailable";
                description = `The service is temporarily unavailable. Please try again later.`;
                break;
            default:
                // Extract server message if available
                if (error.message && error.message.includes(':')) {
                    const serverMessage = error.message.split(':').slice(1).join(':').trim();
                    description = serverMessage || description;
                } else if (error.message) {
                    description = error.message;
                }
        }
    } else if (error?.message) {
        // Handle other error types
        if (error.message.includes('Network Error')) {
            title = "Network Error";
            description = "Unable to connect to the server. Please check your internet connection and try again.";
        } else if (error.message.includes('timeout')) {
            title = "Request Timeout";
            description = "The request took too long to complete. Please try again.";
        } else {
            description = error.message;
        }
    }

    return { title, description };
};

/**
 * Get specific error info for destination toggle operations
 */
export const getDestinationToggleErrorInfo = (error: any, action: 'activate' | 'deactivate' | 'favorite' | 'unfavorite'): ErrorInfo => {
    const baseContext = action === 'favorite' || action === 'unfavorite'
        ? `update favorite status`
        : `${action} destination`;

    const errorInfo = getErrorInfo(error, baseContext);

    // Handle specific destination errors
    if (error?.statusCode === 400) {
        if (error.message?.includes('Invalid destination ID')) {
            errorInfo.title = "Invalid Destination";
            errorInfo.description = "The destination ID is not valid. Please refresh the page and try again.";
        } else if (error.message?.includes('Cannot activate a destination that is not approved')) {
            errorInfo.title = "Destination Not Approved";
            errorInfo.description = "This destination cannot be activated because it hasn't been approved yet. Please wait for admin approval.";
        }
    } else if (error?.statusCode === 404) {
        if (error.message?.includes('Destination not found in your list')) {
            errorInfo.title = "Destination Not in Your List";
            errorInfo.description = "This destination is not in your list. Please add it to your destinations first.";
        }
    }

    return errorInfo;
};

/**
 * Get user-friendly error message for common scenarios
 */
export const getCommonErrorMessage = (error: any): string => {
    if (error?.statusCode === 401) {
        return "Please log in to continue.";
    } else if (error?.statusCode === 403) {
        return "You don't have permission to perform this action.";
    } else if (error?.statusCode === 404) {
        return "The requested resource was not found.";
    } else if (error?.statusCode === 500) {
        return "A server error occurred. Please try again later.";
    } else if (error?.message?.includes('Network Error')) {
        return "Unable to connect to the server. Please check your internet connection.";
    } else if (error?.message?.includes('timeout')) {
        return "The request timed out. Please try again.";
    } else if (error?.message) {
        return error.message;
    } else {
        return "An unexpected error occurred.";
    }
};