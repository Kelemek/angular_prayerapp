import { ErrorHandler, Injectable, Provider } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { capturePostHogException } from '../lib/posthog';
import { maybeReloadForStaleChunk } from '../lib/stale-chunk-recovery';

@Injectable({ providedIn: 'root' })
class PostHogErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const extractedError = this.extractError(error) ?? 'Unknown error';
    capturePostHogException(extractedError);
    console.error(error);
    if (extractedError === 'Unknown error') {
      maybeReloadForStaleChunk(error);
    } else {
      maybeReloadForStaleChunk(extractedError, error);
    }
  }

  private extractError(errorCandidate: unknown): unknown {
    const error = tryToUnwrapZonejsError(errorCandidate);
    if (error instanceof HttpErrorResponse) {
      return extractHttpModuleError(error);
    }
    if (typeof error === 'string' || isErrorOrErrorLikeObject(error)) {
      return error;
    }
    return null;
  }
}

function tryToUnwrapZonejsError(error: unknown): unknown {
  return error && (error as { ngOriginalError?: Error }).ngOriginalError
    ? (error as { ngOriginalError: Error }).ngOriginalError
    : error;
}

function extractHttpModuleError(error: HttpErrorResponse): string | Error {
  if (isErrorOrErrorLikeObject(error.error)) {
    return error.error;
  }
  if (
    typeof ErrorEvent !== 'undefined' &&
    error.error instanceof ErrorEvent &&
    error.error.message
  ) {
    return error.error.message;
  }
  if (typeof error.error === 'string') {
    return `Server returned code ${error.status} with body "${error.error}"`;
  }
  return error.message;
}

function isErrorOrErrorLikeObject(value: unknown): value is Error {
  if (value instanceof Error) {
    return true;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return 'name' in value && 'message' in value && 'stack' in value;
}

export function providePostHogErrorHandler(): Provider {
  return {
    provide: ErrorHandler,
    useClass: PostHogErrorHandler,
  };
}
