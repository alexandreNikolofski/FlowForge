import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

export async function initOtel() {
  try {
    await sdk.start();
    console.info('OpenTelemetry initialized');
  } catch (err) {
    console.warn('OpenTelemetry failed to start', err);
  }
}

export async function shutdownOtel() {
  try {
    await sdk.shutdown();
    console.info('OpenTelemetry shutdown complete');
  } catch (err) {
    console.warn('OpenTelemetry shutdown error', err);
  }
}
