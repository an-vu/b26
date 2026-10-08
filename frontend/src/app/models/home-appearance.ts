import type { BoardAppearance } from './board';
import { BERRY_APPEARANCE } from '../services/site-theme.service';

/** Home owns the same appearance fields as a board, independently of the main board. */
export type HomeAppearance = BoardAppearance;
export const DEFAULT_HOME_APPEARANCE: HomeAppearance = { ...BERRY_APPEARANCE };
