let extensionContextValid = true
const invalidationListeners = new Set<() => void>()

export function isExtensionContextValid(): boolean {
  return extensionContextValid
}

export function onExtensionContextInvalidated(listener: () => void): void {
  invalidationListeners.add(listener)
}

export function safeChromeCall<T>(operation: () => T, fallback: T): T {
  if (!extensionContextValid) {
    return fallback
  }

  try {
    return operation()
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      markExtensionContextInvalidated()
    }

    return fallback
  }
}

export async function safeChromePromise<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!extensionContextValid) {
    return fallback
  }

  try {
    return await operation()
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      markExtensionContextInvalidated()
    }

    return fallback
  }
}

export function markExtensionContextInvalidated(): void {
  if (!extensionContextValid) {
    return
  }

  extensionContextValid = false
  for (const listener of invalidationListeners) {
    listener()
  }
}

export function resetExtensionContextForTests(): void {
  extensionContextValid = true
}

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('extension context invalidated')
  )
}
