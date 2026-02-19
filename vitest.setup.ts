import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('server-only', () => {
    return {};
});

process.env.RAINFOREST_API_KEY = 'test-key';
