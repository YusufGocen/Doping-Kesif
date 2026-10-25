import { configure } from '@testing-library/react';

// Await observable UI state, never arbitrary sleeps. Cold lazy-module loading can exceed 1s on Windows.
configure({ asyncUtilTimeout: 5000 });
