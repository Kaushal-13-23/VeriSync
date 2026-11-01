/**
 * MSW Node Server Setup for Vitest Tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
