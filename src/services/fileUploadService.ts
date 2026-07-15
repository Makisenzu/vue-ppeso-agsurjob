import type {
  SimulatedUploadOptions,
  UploadExecutionOptions,
  UploadExecutionResult,
  UploadExecutor,
} from '@/types/fileUpload'

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'))
      return
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
      reject(new DOMException('Upload cancelled', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort)
  })

async function simulateUpload({
  onProgress,
  signal,
  durationMs = 1800,
  intervalMs = 180,
}: SimulatedUploadOptions): Promise<void> {
  const steps = Math.max(Math.floor(durationMs / intervalMs), 1)

  for (let step = 1; step <= steps; step += 1) {
    await delay(intervalMs, signal)
    const nextProgress = Math.min(Math.floor((step / steps) * 90), 90)
    onProgress(nextProgress)
  }

  onProgress(100)
}

async function executeUpload(
  options: UploadExecutionOptions,
  executor?: UploadExecutor
): Promise<UploadExecutionResult | void> {
  if (executor) {
    const result = await executor(options)
    options.onProgress(100)
    return result
  }

  await simulateUpload({
    onProgress: options.onProgress,
    signal: options.signal,
  })

  return {}
}

export const fileUploadService = {
  simulateUpload,
  executeUpload,
}
