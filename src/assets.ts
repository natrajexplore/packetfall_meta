/**
 * Packetfall builds every mesh procedurally at runtime (see src/game/board.ts),
 * so the shared asset catalog is intentionally empty. Keeping it empty keeps
 * the cold start fast: there is nothing to download before the first frame.
 */
import { defineAssets } from '@iwsdk/core';

export default defineAssets({});
