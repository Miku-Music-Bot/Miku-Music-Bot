import sinon from 'sinon';
import { verifyProfilersStopped } from './stub_logger.test';

afterEach(() => {
  verifyProfilersStopped();
  sinon.restore();
});
